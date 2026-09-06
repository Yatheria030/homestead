"""Stammdaten: Kategorien und Pockets."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Category, Expense, Pocket
from ..schemas import CategoryIn, CategoryOut, PocketIn, PocketOut
from .crud import apply_patch, get_or_404

router = APIRouter(tags=["stammdaten"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.sort_order, Category.name)).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryIn, db: Session = Depends(get_db)):
    obj = Category(**payload.model_dump())
    db.add(obj)
    db.commit()
    return obj


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryIn, db: Session = Depends(get_db)):
    obj = get_or_404(db, Category, category_id)
    apply_patch(obj, payload.model_dump(exclude_unset=True))
    db.commit()
    return obj


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    obj = get_or_404(db, Category, category_id)
    # Ausgaben behalten wir, sie verlieren nur ihre Kategorie
    for expense in db.scalars(select(Expense).where(Expense.category_id == category_id)):
        expense.category_id = None
    db.delete(obj)
    db.commit()


@router.get("/pockets", response_model=list[PocketOut])
def list_pockets(db: Session = Depends(get_db)):
    return db.scalars(select(Pocket).order_by(Pocket.sort_order, Pocket.name)).all()


@router.post("/pockets", response_model=PocketOut, status_code=201)
def create_pocket(payload: PocketIn, db: Session = Depends(get_db)):
    obj = Pocket(**payload.model_dump())
    db.add(obj)
    db.commit()
    return obj


@router.patch("/pockets/{pocket_id}", response_model=PocketOut)
def update_pocket(pocket_id: int, payload: PocketIn, db: Session = Depends(get_db)):
    obj = get_or_404(db, Pocket, pocket_id)
    apply_patch(obj, payload.model_dump(exclude_unset=True))
    db.commit()
    return obj


@router.delete("/pockets/{pocket_id}", status_code=204)
def delete_pocket(pocket_id: int, db: Session = Depends(get_db)):
    obj = get_or_404(db, Pocket, pocket_id)
    for expense in db.scalars(select(Expense).where(Expense.pocket_id == pocket_id)):
        expense.pocket_id = None
    db.delete(obj)
    db.commit()
