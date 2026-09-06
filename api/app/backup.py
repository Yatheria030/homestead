"""Snapshots der Datenbank.

Benutzt die Online-Backup-API von SQLite: der Snapshot ist auch dann konsistent,
wenn gerade geschrieben wird - ein simples Dateikopieren waere das nicht.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path

from .db import DATABASE_URL, engine

BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/data/backups"))
KEEP_AUTOMATIC = int(os.getenv("BACKUP_KEEP", "14"))
INTERVAL_HOURS = float(os.getenv("BACKUP_INTERVAL_HOURS", "24"))

SQLITE_HEADER = b"SQLite format 3\x00"
NAME_PATTERN = re.compile(r"^[a-z]+-\d{8}-\d{6}\.db$")

KIND_LABEL = {
    "auto": "automatisch",
    "manual": "manuell",
    "pre": "vor Wiederherstellung",
    "import": "hochgeladen",
}


def db_file() -> Path | None:
    """Pfad der SQLite-Datei - None, wenn eine andere Datenbank konfiguriert ist."""
    if not DATABASE_URL.startswith("sqlite"):
        return None
    return Path(DATABASE_URL.split("sqlite:///", 1)[1])


def _index_path() -> Path:
    return BACKUP_DIR / "index.json"


def _read_index() -> dict[str, dict]:
    try:
        return json.loads(_index_path().read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def _write_index(index: dict[str, dict]) -> None:
    _index_path().write_text(json.dumps(index, indent=2, ensure_ascii=False))


def _safe(name: str) -> Path:
    """Nur eigene Snapshot-Dateinamen zulassen - kein Ausbrechen aus dem Ordner."""
    if not NAME_PATTERN.match(name):
        raise ValueError(f"Ungültiger Snapshot-Name: {name}")
    return BACKUP_DIR / name


def create(kind: str = "manual", note: str | None = None) -> dict:
    """Legt einen Snapshot an und gibt dessen Metadaten zurueck."""
    source = db_file()
    if source is None or not source.exists():
        raise FileNotFoundError("Keine SQLite-Datenbank gefunden")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{kind}-{datetime.now():%Y%m%d-%H%M%S}.db"
    target = BACKUP_DIR / name

    with closing(sqlite3.connect(source)) as src, closing(sqlite3.connect(target)) as dst:
        src.backup(dst)

    if note:
        index = _read_index()
        index[name] = {"note": note}
        _write_index(index)

    return describe(target)


def describe(path: Path) -> dict:
    kind = path.name.split("-", 1)[0]
    stat = path.stat()
    return {
        "name": path.name,
        "kind": kind,
        "kind_label": KIND_LABEL.get(kind, kind),
        "size": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
        "note": _read_index().get(path.name, {}).get("note"),
    }


def list_backups() -> list[dict]:
    if not BACKUP_DIR.is_dir():
        return []
    items = [describe(path) for path in BACKUP_DIR.glob("*.db")]
    return sorted(items, key=lambda item: item["created_at"], reverse=True)


def delete(name: str) -> None:
    path = _safe(name)
    path.unlink(missing_ok=True)
    index = _read_index()
    if index.pop(name, None) is not None:
        _write_index(index)


def restore(name: str) -> dict:
    """Spielt einen Snapshot zurueck - vorher wird der aktuelle Stand gesichert."""
    snapshot = _safe(name)
    if not snapshot.exists():
        raise FileNotFoundError(name)

    target = db_file()
    if target is None:
        raise RuntimeError("Wiederherstellung nur für SQLite möglich")

    safety = create("pre", note=f"Stand vor dem Zurückspielen von {name}")

    # Offene Verbindungen schliessen, damit in die Datei geschrieben werden kann
    engine.dispose()
    with closing(sqlite3.connect(snapshot)) as src, closing(sqlite3.connect(target)) as dst:
        src.backup(dst)

    return {"restored": name, "safety_snapshot": safety["name"]}


def store_upload(data: bytes) -> dict:
    """Hochgeladene Datei als Snapshot ablegen - nur echte SQLite-Dateien."""
    if not data.startswith(SQLITE_HEADER):
        raise ValueError("Das ist keine SQLite-Datenbank")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    name = f"import-{datetime.now():%Y%m%d-%H%M%S}.db"
    (BACKUP_DIR / name).write_bytes(data)
    return describe(BACKUP_DIR / name)


def prune(keep: int = KEEP_AUTOMATIC) -> list[str]:
    """Alte automatische Snapshots aufraeumen. Manuelle bleiben immer erhalten."""
    automatic = [item for item in list_backups() if item["kind"] == "auto"]
    removed = []
    for item in automatic[keep:]:
        delete(item["name"])
        removed.append(item["name"])
    return removed


def _hours_since_last_auto() -> float:
    automatic = [item for item in list_backups() if item["kind"] == "auto"]
    if not automatic:
        return float("inf")
    last = datetime.fromisoformat(automatic[0]["created_at"])
    return (datetime.now() - last).total_seconds() / 3600


async def scheduler() -> None:
    """Legt im Hintergrund regelmaessig einen Snapshot an."""
    if INTERVAL_HOURS <= 0:
        return
    while True:
        try:
            if _hours_since_last_auto() >= INTERVAL_HOURS:
                item = create("auto")
                prune()
                print(f"Automatischer Snapshot: {item['name']}")
        except Exception as error:  # der Scheduler darf die App nie mitreissen
            print(f"Snapshot fehlgeschlagen: {error}")
        await asyncio.sleep(min(INTERVAL_HOURS, 1) * 3600)
