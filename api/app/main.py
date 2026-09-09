import asyncio
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .db import Base, SessionLocal, engine
from . import backup
from .migrate import migrate
from .routers import backups, expenses, master, scan, summary, supplies
from .routers.supplies import purge_old_trash_loop
from .seed import seed

app = FastAPI(title="Homestead", version="0.8.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

# Nur fuer die lokale Entwicklung (Vite auf :5173); im Container laeuft alles same-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = FastAPI(title="Homestead API")
api.include_router(master.router)
api.include_router(expenses.router)
api.include_router(supplies.router)
api.include_router(scan.router)
api.include_router(summary.router)
api.include_router(backups.router)


@api.get("/health")
def health():
    return {"status": "ok"}


app.mount("/api", api)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(engine)
    changed = migrate(engine)
    if changed:
        print(f"Schema ergänzt: {', '.join(changed)}")
    if os.getenv("SEED_ON_START", "true").lower() in {"1", "true", "yes"}:
        with SessionLocal() as db:
            if seed(db):
                print("Startdaten angelegt.")
    # Automatische Snapshots und Papierkorb-Aufräumen im Hintergrund
    asyncio.create_task(backup.scheduler())
    asyncio.create_task(purge_old_trash_loop())


# Gebautes Frontend ausliefern (im Container unter /srv/static)
STATIC_DIR = Path(os.getenv("STATIC_DIR", "/srv/static"))
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        """Alle uebrigen Pfade an die Single-Page-App geben."""
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
