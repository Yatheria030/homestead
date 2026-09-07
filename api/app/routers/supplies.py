"""Vorrat: Bestand, Reichweite, Nachbestellung und Abos.

Der Kaufrhythmus wird nicht geschätzt, sondern aus der Kaufhistorie gemessen:
Zeitspanne zwischen dem ersten und letzten Kauf eines Fensters, geteilt durch die
Menge, die in dieser Zeit tatsächlich verbraucht wurde (alles bis auf den jüngsten
Kauf - der liegt ja noch ganz oder teilweise im Bestand). Erst wenn weniger als
zwei Käufe vorliegen, greift die von Hand eingetragene grobe Schätzung.
"""
import asyncio
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..db import SessionLocal, get_db
from ..models import Purchase, Supply, SupplyList
from ..schemas import (
    TRASH_RETENTION_DAYS,
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
from ..supply_stats import enrich_many as _enrich_many
from ..supply_stats import enrich_one as _enrich_one
from .crud import apply_patch, get_or_404

router = APIRouter(tags=["vorrat"])


def _sync_last_purchased(db: Session, supply_id: int) -> None:
    """last_purchased ist immer das juengste Datum aus der Kaufhistorie - deckt
    auch rueckwirkend nachgetragene oder geloeschte Kaeufe korrekt ab."""
    supply = db.get(Supply, supply_id)
    if supply is None:
        return
    supply.last_purchased = db.scalar(
        select(func.max(Purchase.purchased_on)).where(Purchase.supply_id == supply_id)
    )


def _get_live(db: Session, supply_id: int) -> Supply:
    """Wie get_or_404, verweigert aber Artikel, die im Papierkorb liegen."""
    obj = get_or_404(db, Supply, supply_id)
    if obj.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Artikel liegt im Papierkorb")
    return obj


async def purge_old_trash_loop() -> None:
    """Raeumt im Hintergrund den Papierkorb auf - alle 6 Stunden geprueft, damit
    ein Neustart der App nicht sofort alles endgueltig entfernt, was gerade erst
    die Frist erreicht hat."""
    while True:
        try:
            with SessionLocal() as db:
                cutoff = datetime.utcnow() - timedelta(days=TRASH_RETENTION_DAYS)
                due = db.scalars(select(Supply).where(Supply.deleted_at < cutoff)).all()
                for item in due:
                    db.delete(item)
                if due:
                    db.commit()
                    print(f"Papierkorb aufgeräumt: {len(due)} Artikel endgültig entfernt")
        except Exception as error:  # der Scheduler darf die App nie mitreissen
            print(f"Papierkorb-Aufräumen fehlgeschlagen: {error}")
        await asyncio.sleep(6 * 3600)


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
    """Immer ohne Papierkorb-Artikel - dafuer gibt es list_trash()."""
    stmt = (
        select(Supply)
        .options(selectinload(Supply.supply_list))
        .where(Supply.deleted_at.is_(None))
        .order_by(Supply.sort_order, Supply.id)
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
    obj = _get_live(db, supply_id)
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
    """In den Papierkorb verschieben, nicht sofort endgültig löschen - inklusive
    der Kaufhistorie, die sonst mitgerissen würde. Nach 30 Tagen räumt die App
    von selbst auf, siehe purge_old_trash_loop()."""
    obj = get_or_404(db, Supply, supply_id)
    if obj.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Artikel liegt bereits im Papierkorb")
    obj.deleted_at = datetime.utcnow()
    db.commit()


@router.get("/supplies/trash", response_model=list[SupplyOut])
def list_trash(db: Session = Depends(get_db)):
    stmt = (
        select(Supply)
        .options(selectinload(Supply.supply_list))
        .where(Supply.deleted_at.is_not(None))
        .order_by(Supply.deleted_at.desc())
    )
    return _enrich_many(db, db.scalars(stmt).all())


@router.post("/supplies/{supply_id}/restore", response_model=SupplyOut)
def restore_supply(supply_id: int, db: Session = Depends(get_db)):
    obj = get_or_404(db, Supply, supply_id)
    if obj.deleted_at is None:
        raise HTTPException(status_code=400, detail="Artikel liegt nicht im Papierkorb")
    obj.deleted_at = None
    db.commit()
    db.refresh(obj)
    return _enrich_one(db, obj)


@router.delete("/supplies/{supply_id}/purge", status_code=204)
def purge_supply(supply_id: int, db: Session = Depends(get_db)):
    """Endgültig löschen, sofort - nicht rückgängig zu machen."""
    db.delete(get_or_404(db, Supply, supply_id))
    db.commit()


@router.post("/supplies/{supply_id}/restock", response_model=SupplyOut)
def restock(supply_id: int, payload: RestockIn | None = None, db: Session = Depends(get_db)):
    """'Gekauft'-Knopf: Packungen kommen auf den Bestand obendrauf UND in die
    Kaufhistorie - das ist der Unterschied zu einem reinen Historieneintrag."""
    obj = _get_live(db, supply_id)
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
    _get_live(db, supply_id)
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
                pack_label=row.pack_label,
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
