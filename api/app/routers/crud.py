"""Kleine generische CRUD-Helfer - haelt die Router kurz."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session


def get_or_404(db: Session, model, obj_id: int):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} {obj_id} nicht gefunden")
    return obj


def apply_patch(obj, data: dict) -> None:
    for key, value in data.items():
        setattr(obj, key, value)
