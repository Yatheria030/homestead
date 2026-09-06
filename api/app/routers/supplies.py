"""Vorrat: Bestand, Reichweite, Nachbestellung und Abos."""
from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Purchase, Supply, SupplyList
from ..schemas import (
    PurchaseOut,
    RestockIn,
    ShoppingGroup,
    ShoppingItem,
    StockIn,
    SupplyIn,
    SupplyListIn,
    SupplyListOut,
    SupplyOut,
    SupplyPatch,
    money,
)
from .crud import apply_patch, get_or_404

router = APIRouter(tags=["vorrat"])


# --- Listen -------------------------------------------------------------

@router.get("/supply-lists", response_model=list[SupplyListOut])
def list_lists(db: Session = Depends(get_db)):
    return db.scalars(select(SupplyList).order_by(SupplyList.sort_order, SupplyList.name)).all()


@router.post("/supply-lists", response_model=SupplyListOut, status_code=201)
def create_list(payload: SupplyListIn, db: Session = Depends(get_db)):
    obj = SupplyList(**payload.model_dump())
    db.add(obj)
    db.commit()
    return obj


@router.patch("/supply-lists/{list_id}", response_model=SupplyListOut)
def update_list(list_id: int, payload: SupplyListIn, db: Session = Depends(get_db)):
    obj = get_or_404(db, SupplyList, list_id)
    apply_patch(obj, payload.model_dump(exclude_unset=True))
    db.commit()
    return obj


@router.delete("/supply-lists/{list_id}", status_code=204)
def delete_list(list_id: int, db: Session = Depends(get_db)):
    obj = get_or_404(db, SupplyList, list_id)
    for supply in db.scalars(select(Supply).where(Supply.list_id == list_id)):
        supply.list_id = None
    db.delete(obj)
    db.commit()


# --- Artikel ------------------------------------------------------------

def _query(db: Session, include_inactive: bool = True):
    stmt = (
        select(Supply).options(selectinload(Supply.supply_list)).order_by(Supply.sort_order, Supply.id)
    )
    if not include_inactive:
        stmt = stmt.where(Supply.active.is_(True))
    return db.scalars(stmt).all()


@router.get("/supplies", response_model=list[SupplyOut])
def list_supplies(include_inactive: bool = True, db: Session = Depends(get_db)):
    return _query(db, include_inactive)


@router.post("/supplies", response_model=SupplyOut, status_code=201)
def create_supply(payload: SupplyIn, db: Session = Depends(get_db)):
    if not payload.sort_order:
        highest = db.scalar(select(Supply.sort_order).order_by(Supply.sort_order.desc()))
        payload.sort_order = (highest or 0) + 10
    if payload.stock_packs and payload.stock_as_of is None:
        payload.stock_as_of = date.today()
    obj = Supply(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/supplies/{supply_id}", response_model=SupplyOut)
def update_supply(supply_id: int, payload: SupplyPatch, db: Session = Depends(get_db)):
    obj = get_or_404(db, Supply, supply_id)
    data = payload.model_dump(exclude_unset=True)
    # Bestand von Hand gesetzt: Stichtag mitziehen, sonst rechnet die App falsch weiter
    if "stock_packs" in data and "stock_as_of" not in data:
        data["stock_as_of"] = date.today()
    apply_patch(obj, data)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/supplies/{supply_id}", status_code=204)
def delete_supply(supply_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Supply, supply_id))
    db.commit()


@router.post("/supplies/{supply_id}/restock", response_model=SupplyOut)
def restock(supply_id: int, payload: RestockIn | None = None, db: Session = Depends(get_db)):
    """Kauf verbuchen: Packungen kommen auf den heutigen Bestand obendrauf."""
    obj = get_or_404(db, Supply, supply_id)
    data = payload or RestockIn()
    when = data.purchased_on or date.today()

    current = SupplyOut.model_validate(obj).raw_stock
    obj.stock_packs = round(current + data.packs, 2)
    obj.stock_as_of = date.today()
    obj.last_purchased = when
    if data.price is not None:
        obj.price = data.price
    if obj.is_subscription and obj.subscription_interval_days:
        obj.next_delivery = when + timedelta(days=obj.subscription_interval_days)

    db.add(
        Purchase(
            supply_id=obj.id,
            purchased_on=when,
            packs=data.packs,
            price=data.price if data.price is not None else obj.price,
            note=data.note,
        )
    )
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/supplies/{supply_id}/stock", response_model=SupplyOut)
def set_stock(supply_id: int, payload: StockIn, db: Session = Depends(get_db)):
    """Nachgezaehlt: Bestand auf den tatsaechlichen Wert setzen."""
    obj = get_or_404(db, Supply, supply_id)
    obj.stock_packs = payload.stock_packs
    obj.stock_as_of = payload.as_of or date.today()
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/supplies/{supply_id}/purchases", response_model=list[PurchaseOut])
def list_purchases(supply_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Supply, supply_id)
    return db.scalars(
        select(Purchase)
        .where(Purchase.supply_id == supply_id)
        .order_by(Purchase.purchased_on.desc(), Purchase.id.desc())
    ).all()


# --- Einkaufsliste ------------------------------------------------------

@router.get("/shopping-list", response_model=list[ShoppingGroup])
def shopping_list(db: Session = Depends(get_db)):
    """Alles, was bestellt werden sollte - nach Anbieter gebuendelt."""
    rows = [SupplyOut.model_validate(s) for s in _query(db, include_inactive=False)]
    needed = [row for row in rows if row.status in {"empty", "order"} and row.suggested_packs]

    grouped: dict[str, list[ShoppingItem]] = defaultdict(list)
    for row in needed:
        packs = row.suggested_packs
        grouped[row.vendor or "Ohne Anbieter"].append(
            ShoppingItem(
                supply_id=row.id,
                name=row.name,
                vendor=row.vendor,
                list_name=row.supply_list.name if row.supply_list else None,
                color=row.supply_list.color if row.supply_list else "slate",
                status=row.status,
                days_left=row.days_left,
                packs=packs,
                pack_label=row.pack_size,
                price=row.price,
                total=money(row.price * packs) if row.price is not None else None,
                is_subscription=row.is_subscription,
                url=row.url,
            )
        )

    groups = [
        ShoppingGroup(
            vendor=vendor,
            items=sorted(items, key=lambda item: item.days_left or 0),
            total=money(sum(item.total or 0 for item in items)),
        )
        for vendor, items in grouped.items()
    ]
    return sorted(groups, key=lambda group: -group.total)
