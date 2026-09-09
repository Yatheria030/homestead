"""Laufzeit-Einstellungen: Umgebung schlaegt Datenbank schlaegt Standard.

Alles, was der Scanner braucht, laesst sich sowohl per `.env` als auch in den
Einstellungen setzen. Die Rangfolge ist bewusst so herum: wer eine Variable in
der Umgebung setzt, hat sich entschieden - das soll nicht still aus dem Browser
heraus ueberschrieben werden. Die Oberflaeche zeigt deshalb an, woher ein Wert
gerade kommt, und sperrt das Feld, wenn die Umgebung gewinnt.

Der API-Key ist der einzige Wert, der nie wieder herausgegeben wird: gespeichert
wird er, zurueck kommt nur "gesetzt: ja/nein" plus die letzten vier Zeichen.
"""
from __future__ import annotations

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Setting

# Name -> (Umgebungsvariable, Standardwert)
FIELDS: dict[str, tuple[str, str]] = {
    "anthropic_api_key": ("ANTHROPIC_API_KEY", ""),
    "scan_token": ("SCAN_TOKEN", ""),
    "product_lookup": ("PRODUCT_LOOKUP", "true"),
    "ai_resolver": ("AI_RESOLVER", "true"),
    "ai_model": ("AI_MODEL", "claude-opus-5"),
    "ai_auto_assign": ("AI_AUTO_ASSIGN", "0.85"),
}

# Werte, die nie an den Browser zurueckgehen
SECRETS = {"anthropic_api_key", "scan_token"}

TRUE = {"1", "true", "yes", "on"}


def _stored(db: Session, name: str) -> str | None:
    row = db.scalar(select(Setting).where(Setting.key == name))
    return row.value if row is not None and row.value != "" else None


def value(db: Session, name: str) -> str:
    env_name, default = FIELDS[name]
    from_env = os.getenv(env_name)
    if from_env:
        return from_env
    return _stored(db, name) or default


def source(db: Session, name: str) -> str:
    """Woher der Wert gerade kommt - env | gespeichert | standard."""
    env_name, _ = FIELDS[name]
    if os.getenv(env_name):
        return "env"
    return "gespeichert" if _stored(db, name) else "standard"


def locked(name: str) -> bool:
    """Von der Umgebung vorgegeben, also in der Oberflaeche nicht aenderbar."""
    return bool(os.getenv(FIELDS[name][0]))


def flag(db: Session, name: str) -> bool:
    return value(db, name).lower() in TRUE


def number(db: Session, name: str, fallback: float) -> float:
    try:
        return float(value(db, name))
    except ValueError:
        return fallback


def hint(db: Session, name: str) -> str | None:
    """Maskierter Rest eines Geheimnisses, damit man erkennt, welches hinterlegt
    ist - ohne es preiszugeben."""
    raw = value(db, name)
    if not raw:
        return None
    return f"…{raw[-4:]}" if len(raw) > 8 else "…"


def put(db: Session, name: str, raw: str) -> None:
    """Speichern. Ein leerer Wert loescht den Eintrag, faellt also auf den
    Standard zurueck - so laesst sich ein Key auch wieder entfernen."""
    if name not in FIELDS:
        raise KeyError(name)
    row = db.scalar(select(Setting).where(Setting.key == name))
    cleaned = raw.strip()
    if not cleaned:
        if row is not None:
            db.delete(row)
        return
    if row is None:
        db.add(Setting(key=name, value=cleaned))
    else:
        row.value = cleaned
