"""Kostenpositionen - das Gegenstueck zum Excel-Blatt 'Eingabe'."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Expense
from ..schemas import ExpenseIn, ExpenseOut, ExpensePatch
from .crud import apply_patch, get_or_404

router = APIRouter(prefix="/expenses", tags=["ausgaben"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(include_inactive: bool = True, db: Session = Depends(get_db)):
    stmt = (
        select(Expense)
        .options(selectinload(Expense.category), selectinload(Expense.pocket))
        .order_by(Expense.sort_order, Expense.id)
    )
    if not include_inactive:
        stmt = stmt.where(Expense.active.is_(True))
    return db.scalars(stmt).all()


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(payload: ExpenseIn, db: Session = Depends(get_db)):
    if not payload.sort_order:
        highest = db.scalar(select(Expense.sort_order).order_by(Expense.sort_order.desc()))
        payload.sort_order = (highest or 0) + 10
    obj = Expense(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpensePatch, db: Session = Depends(get_db)):
    obj = get_or_404(db, Expense, expense_id)
    apply_patch(obj, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Expense, expense_id))
    db.commit()
