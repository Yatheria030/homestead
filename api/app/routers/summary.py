"""Auswertung: Pocket-Verteilung und Kennzahlen fuers Dashboard."""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Expense, Supply
from ..schemas import (
    CategorySummary,
    ExpenseOut,
    PocketSummary,
    Summary,
    SupplyOut,
    money,
)
from ..supply_stats import enrich_many

router = APIRouter(tags=["auswertung"])


@router.get("/summary", response_model=Summary)
def get_summary(db: Session = Depends(get_db)):
    expenses = db.scalars(
        select(Expense)
        .options(selectinload(Expense.category), selectinload(Expense.pocket))
        .where(Expense.active.is_(True))
        .order_by(Expense.sort_order, Expense.id)
    ).all()
    rows = [ExpenseOut.model_validate(e) for e in expenses]

    by_pocket: dict[int | None, list[ExpenseOut]] = defaultdict(list)
    for row in rows:
        by_pocket[row.pocket_id].append(row)

    pockets: list[PocketSummary] = []
    total_transferred = 0.0
    excluded = 0.0

    for pocket_id, items in by_pocket.items():
        amount = money(sum(i.raw_monthly_share for i in items))
        first_pocket = items[0].pocket
        counts = first_pocket.counts_to_total if first_pocket else True
        pockets.append(
            PocketSummary(
                pocket_id=pocket_id,
                name=first_pocket.name if first_pocket else "Ohne Pocket",
                color=first_pocket.color if first_pocket else "amber",
                counts_to_total=counts,
                amount=amount,
                items=[i.name for i in items],
            )
        )
        raw = sum(i.raw_monthly_share for i in items)
        if counts:
            total_transferred += raw
        else:
            excluded += raw

    order = {p.pocket_id: (p.pocket_id is None, p.name) for p in pockets}
    pocket_sort = {
        e.pocket_id: (e.pocket.sort_order if e.pocket else 999) for e in rows
    }
    pockets.sort(key=lambda p: (pocket_sort.get(p.pocket_id, 999), order[p.pocket_id]))

    by_category: dict[tuple[str, str], float] = defaultdict(float)
    for row in rows:
        key = (row.category.name if row.category else "Ohne Kategorie",
               row.category.color if row.category else "slate")
        by_category[key] += row.raw_monthly_share
    categories = [
        CategorySummary(name=name, color=color, amount=money(amount))
        for (name, color), amount in sorted(by_category.items(), key=lambda kv: -kv[1])
    ]

    live_supplies = db.scalars(
        select(Supply).where(Supply.active.is_(True), Supply.deleted_at.is_(None))
    ).all()
    supplies = [SupplyOut.model_validate(s) for s in enrich_many(db, live_supplies)]
    sub_expenses = [r for r in rows if r.is_subscription]
    sub_supplies = [s for s in supplies if s.is_subscription]
    subscription_monthly = money(
        sum(r.raw_monthly_total for r in sub_expenses)
        + sum(s.subscription_monthly or s.monthly_cost or 0 for s in sub_supplies)
    )

    return Summary(
        total_transferred=money(total_transferred),
        total_household=money(sum(r.raw_monthly_total for r in rows)),
        excluded=money(excluded),
        pockets=pockets,
        categories=categories,
        expense_count=len(rows),
        subscription_count=len(sub_expenses) + len(sub_supplies),
        subscription_monthly=subscription_monthly,
        supplies_total=len(supplies),
        supplies_order=sum(1 for s in supplies if s.status in {"empty", "order"}),
        supplies_empty=sum(1 for s in supplies if s.status == "empty"),
        supplies_soon=sum(1 for s in supplies if s.status == "soon"),
        supplies_monthly=money(sum(s.monthly_cost or 0 for s in supplies)),
        subscription_savings_yearly=money(sum(s.yearly_savings or 0 for s in supplies)),
    )
