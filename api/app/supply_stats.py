"""Kaufrhythmus aus der Kaufhistorie berechnen - von routers/supplies.py und
routers/summary.py gemeinsam genutzt, damit beide dieselben Zahlen sehen.

Die Haltbarkeit einer Packung wird gemessen statt geschätzt: Zeitspanne zwischen
dem ältesten und dem jüngsten Kauf eines Fensters, geteilt durch die Menge, die in
dieser Zeit tatsächlich verbraucht wurde (alles außer dem jüngsten Kauf - der
liegt ja noch ganz oder teilweise im Bestand). Erst unter zwei Käufen greift die
von Hand eingetragene grobe Schätzung auf dem Artikel selbst.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Purchase, Supply

# So viele der juengsten Kaeufe fliessen in die Rhythmus-Schaetzung ein. Begrenzt
# das "Gedaechtnis" der Schaetzung, damit sich geaenderte Gewohnheiten (groessere
# Packung, zweite Katze, ...) nach und nach durchsetzen statt von einer langen
# Historie ausgebremst zu werden.
RATE_WINDOW = 8


def purchase_stats(purchases: list[Purchase]) -> tuple[int, float | None, float | None]:
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


def enrich_one(db: Session, supply: Supply) -> Supply:
    """Haengt die aus der Kaufhistorie berechneten Werte transient an - vor jeder
    Rueckgabe als SupplyOut aufrufen, sonst fehlen rhythm_source & co."""
    purchases = db.scalars(select(Purchase).where(Purchase.supply_id == supply.id)).all()
    count, avg_packs, derived = purchase_stats(purchases)
    supply.purchase_count = count
    supply.avg_purchase_packs = avg_packs
    supply.derived_days_per_pack = derived
    return supply


def enrich_many(db: Session, supplies: list[Supply]) -> list[Supply]:
    if not supplies:
        return supplies
    ids = [s.id for s in supplies]
    rows = db.scalars(select(Purchase).where(Purchase.supply_id.in_(ids))).all()
    grouped: dict[int, list[Purchase]] = defaultdict(list)
    for row in rows:
        grouped[row.supply_id].append(row)
    for supply in supplies:
        count, avg_packs, derived = purchase_stats(grouped.get(supply.id, []))
        supply.purchase_count = count
        supply.avg_purchase_packs = avg_packs
        supply.derived_days_per_pack = derived
    return supplies
