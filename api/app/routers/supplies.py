"""Vorrat: Bestand, Reichweite, Nachbestellung und Abos.

Der Kaufrhythmus wird nicht geschätzt, sondern aus der Kaufhistorie gemessen:
Zeitspanne zwischen dem ersten und letzten Kauf eines Fensters, geteilt durch die
Menge, die in dieser Zeit tatsächlich verbraucht wurde (alles bis auf den jüngsten
Kauf - der liegt ja noch ganz oder teilweise im Bestand). Erst wenn weniger als
zwei Käufe vorliegen, greift die von Hand eingetragene grobe Schätzung.
"""
from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Purchase, Supply, SupplyList
from ..schemas import (
    PurchaseIn,
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

# So viele der juengsten Kaeufe fliessen in die Rhythmus-Schaetzung ein. Begrenzt
# das "Gedaechtnis" der Schaetzung, damit sich geaenderte Gewohnheiten (groessere
# Packung, zweite Katze, ...) nach und nach durchsetzen statt von einer langen
# Historie ausgebremst zu werden.
RATE_WINDOW = 8


def _purchase_stats(purchases: list[Purchase]) -> tuple[int, float | None, float | None]:
    """(Gesamtzahl Käufe, Ø Menge je Kauf, gemessene Tage je Packung)."""
    if not purchases:
        return 0, None, None

    ordered = sorted(purchases, key=lambda p: p.purchased_on)
    total_count = len(ordered)
    window = ordered[-(RATE_WINDOW + 1) :]
    avg_packs = sum(p.packs for p in window) / len(window)

    if len(window) < 2:
        return total_count, avg_packs, None

    span_days = (window[-1].purchased_on - window[0].purchased_on).days
    # Alles ausser dem juengsten Kauf wurde in der Zwischenzeit nachweislich
    # verbraucht - der juengste Kauf liegt ja noch (teilweise) im Bestand.
    packs_consumed = sum(p.packs for p in window[:-1])
    if span_days <= 0 or packs_consumed <= 0:
        return total_count, avg_packs, None

    return total_count, avg_packs, span_days / packs_consumed


def _enrich_one(db: Session, supply: Supply) -> Supply:
    """Haengt die aus der Kaufhistorie berechneten Werte transient an - vor jeder
    Rueckgabe als SupplyOut aufrufen, sonst fehlen rhythm_source & co."""
    purchases = db.scalars(select(Purchase).where(Purchase.supply_id == supply.id)).all()
    count, avg_packs, derived = _purchase_stats(purchases)
    supply.purchase_count = count
    supply.avg_purchase_packs = avg_packs
    supply.derived_days_per_pack = derived
    return supply


def _enrich_many(db: Session, supplies: list[Supply]) -> list[Supply]:
    if not supplies:
        return supplies
    ids = [s.id for s in supplies]
    rows = db.scalars(select(Purchase).where(Purchase.supply_id.in_(ids))).all()
    grouped: dict[int, list[Purchase]] = defaultdict(list)
    for row in rows:
        grouped[row.supply_id].append(row)
    for supply in supplies:
        count, avg_packs, derived = _purchase_stats(grouped.get(supply.id, []))
        supply.purchase_count = count
        supply.avg_purchase_packs = avg_packs
        supply.derived_days_per_pack = derived
    return supplies


def _sync_last_purchased(db: Session, supply_id: int) -> None:
    """last_purchased ist immer das juengste Datum aus der Kaufhistorie - deckt
    auch rueckwirkend nachgetragene oder geloeschte Kaeufe korrekt ab."""
    supply = db.get(Supply, supply_id)
    if supply is None:
        return
    supply.last_purchased = db.scalar(
        select(func.max(Purchase.purchased_on)).where(Purchase.supply_id == supply_id)
    )


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
    return _enrich_many(db, db.scalars(stmt).all())


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
    return _enrich_one(db, obj)


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
    return _enrich_one(db, obj)


@router.delete("/supplies/{supply_id}", status_code=204)
def delete_supply(supply_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Supply, supply_id))
    db.commit()


@router.post("/supplies/{supply_id}/restock", response_model=SupplyOut)
def restock(supply_id: int, payload: RestockIn | None = None, db: Session = Depends(get_db)):
    """'Gekauft'-Knopf: Packungen kommen auf den Bestand obendrauf UND in die
    Kaufhistorie - das ist der Unterschied zu einem reinen Historieneintrag."""
    obj = get_or_404(db, Supply, supply_id)
    data = payload or RestockIn()
    when = data.purchased_on or date.today()
    if when > date.today():
        raise HTTPException(status_code=400, detail="Kaufdatum darf nicht in der Zukunft liegen")

    # Bestand mit dem VOR diesem Kauf bekannten Rhythmus auf heute hochrechnen,
    # bevor der neue Kauf selbst mit in die Rechnung einfliesst
    _enrich_one(db, obj)
    current = SupplyOut.model_validate(obj).raw_stock
    obj.stock_packs = round(current + data.packs, 2)
    obj.stock_as_of = date.today()
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
    db.flush()
    _sync_last_purchased(db, supply_id)
    db.commit()
    db.refresh(obj)
    return _enrich_one(db, obj)


@router.post("/supplies/{supply_id}/stock", response_model=SupplyOut)
def set_stock(supply_id: int, payload: StockIn, db: Session = Depends(get_db)):
    """Nachgezaehlt: Bestand auf den tatsaechlichen Wert setzen - rein informativ,
    beruehrt die Kaufhistorie nicht."""
    obj = get_or_404(db, Supply, supply_id)
    as_of = payload.as_of or date.today()
    if as_of > date.today():
        raise HTTPException(status_code=400, detail="Stichtag darf nicht in der Zukunft liegen")
    obj.stock_packs = payload.stock_packs
    obj.stock_as_of = as_of
    db.commit()
    db.refresh(obj)
    return _enrich_one(db, obj)


@router.get("/supplies/{supply_id}/purchases", response_model=list[PurchaseOut])
def list_purchases(supply_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Supply, supply_id)
    return db.scalars(
        select(Purchase)
        .where(Purchase.supply_id == supply_id)
        .order_by(Purchase.purchased_on.desc(), Purchase.id.desc())
    ).all()


@router.post("/supplies/{supply_id}/purchases", response_model=PurchaseOut, status_code=201)
def add_purchase(supply_id: int, payload: PurchaseIn, db: Session = Depends(get_db)):
    """Kauf nachtragen, auch aus der Vergangenheit - verbessert die
    Rhythmus-Schätzung, lässt den aktuellen Bestand aber unangetastet. Für einen
    Kauf gerade eben ist der 'Gekauft'-Knopf (restock) der richtige Weg: der
    bucht zusätzlich auf den Bestand."""
    get_or_404(db, Supply, supply_id)
    if payload.purchased_on > date.today():
        raise HTTPException(status_code=400, detail="Kaufdatum darf nicht in der Zukunft liegen")

    purchase = Purchase(
        supply_id=supply_id,
        purchased_on=payload.purchased_on,
        packs=payload.packs,
        price=payload.price,
        note=payload.note,
    )
    db.add(purchase)
    db.flush()
    _sync_last_purchased(db, supply_id)
    db.commit()
    db.refresh(purchase)
    return purchase


@router.delete("/supplies/{supply_id}/purchases/{purchase_id}", status_code=204)
def delete_purchase(supply_id: int, purchase_id: int, db: Session = Depends(get_db)):
    """Entfernt nur den Historieneintrag - ein damit verbuchter Bestand wird nicht
    rückwirkend korrigiert; dafür 'Bestand setzen' im Artikel nutzen."""
    purchase = db.get(Purchase, purchase_id)
    if purchase is None or purchase.supply_id != supply_id:
        raise HTTPException(status_code=404, detail="Kauf nicht gefunden")
    db.delete(purchase)
    db.flush()
    _sync_last_purchased(db, supply_id)
    db.commit()


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
