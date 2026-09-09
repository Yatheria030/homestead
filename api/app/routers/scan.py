"""Barcode-Scanner: gescannte EANs verbuchen, unbekannte in den Scan-Eingang.

Der Weg eines Codes:

    EAN → bekannt?  → Kauf verbuchen, fertig
        → unbekannt → Produktdatenbank fragen → KI-Vorschlag
                      → sicher genug: zuordnen, merken, verbuchen
                      → sonst: Scan-Eingang, dort entscheidet ein Mensch

Einmal zugeordnet landet die EAN in der Barcode-Tabelle - ab dann ist jeder
weitere Scan desselben Artikels ein direkter Treffer, ohne Netz und ohne KI.

Die Station selbst (ESP32, Dongle am Host, Handy-Kamera) spricht nur mit
POST /scan-events und schickt gepufferte Codes im Bund.
"""
from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import ai, products, settings
from ..db import get_db
from ..models import Barcode, Purchase, ScanEvent, Supply, SupplyList
from ..schemas import (
    BarcodeOut,
    RestockIn,
    ScanAssignIn,
    ScanBatch,
    ScanBatchOut,
    ScanConfigOut,
    ScanCreateIn,
    ScanEventOut,
    ScanResult,
    ScanSettingsIn,
    SupplyIn,
    SupplyOut,
)
from ..supply_stats import enrich_one as _enrich_one
from .supplies import create_supply, restock

router = APIRouter(tags=["scan"])

# Kaeufe aus dem Scanner tragen diese Notiz - daran erkennt der naechste Scan
# desselben Tages, dass er dazugehoert.
SCAN_NOTE = "Scan"


def check_token(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Ohne gesetztes Scan-Token bleibt der Endpoint offen wie der Rest der App.
    Sobald eines gesetzt ist, muss die Station es mitschicken - das ist die
    einzige Stelle, an der ein Geraet von aussen schreibt."""
    token = settings.value(db, "scan_token")
    if not token:
        return
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Scan-Token fehlt oder stimmt nicht")


# --- Verbuchen ----------------------------------------------------------

def _book(db: Session, supply: Supply, packs: float) -> None:
    """Kauf verbuchen wie der 'Gekauft'-Knopf - aber mehrere Scans desselben
    Artikels am selben Tag werden zu einem Kauf zusammengezaehlt. Drei Packungen
    aus einem Einkauf als drei Kaeufe zu fuehren wuerde den gemessenen Rhythmus
    verfaelschen: der Abstand zwischen ihnen ist null Tage."""
    today = date.today()
    same_day = db.scalar(
        select(Purchase)
        .where(
            Purchase.supply_id == supply.id,
            Purchase.purchased_on == today,
            Purchase.note == SCAN_NOTE,
        )
        .order_by(Purchase.id.desc())
    )
    if same_day is None:
        restock(supply.id, RestockIn(packs=packs, note=SCAN_NOTE), db)
        return

    same_day.packs = round(same_day.packs + packs, 2)
    _enrich_one(db, supply)
    supply.stock_packs = round(SupplyOut.model_validate(supply).raw_stock + packs, 2)
    supply.stock_as_of = today
    db.commit()


def _live(db: Session, supply_id: int) -> Supply | None:
    supply = db.get(Supply, supply_id)
    return supply if supply is not None and supply.deleted_at is None else None


def _remember(db: Session, ean: str, supply: Supply, packs: float, source: str, label: str | None) -> None:
    db.merge(
        Barcode(
            ean=ean,
            supply_id=supply.id,
            packs=packs,
            label=label or supply.name,
            source=source,
        )
    )


def _label(event: ScanEvent) -> str | None:
    """Anzeigename fuer die Barcode-Verwaltung: was die Recherche ergeben hat."""
    source = event.suggestion or event.product or {}
    return " ".join(filter(None, [source.get("brand"), source.get("name")])) or None


# --- Recherche ----------------------------------------------------------

def _research(db: Session, event: ScanEvent) -> None:
    """Produktdatenbank und KI befragen und das Ergebnis an den Eingang haengen.
    Beide Schritte sind optional; faellt einer aus, bleibt der Eingang trotzdem
    stehen - nur eben ohne Vorbelegung."""
    if not products.enabled(db):
        event.note = "Produktsuche ist in den Einstellungen abgeschaltet."
        return

    product = products.lookup(event.ean)
    if product is None:
        event.note = (
            "Kein Treffer in den Produktdatenbanken. Die EAN allein sagt nichts "
            "über das Produkt - bitte von Hand zuordnen."
        )
        return
    event.product = product

    if not ai.enabled(db):
        event.note = "Produkt gefunden. Zuordnung ohne KI-Schritt - bitte prüfen."
        return

    supplies = db.scalars(
        select(Supply)
        .options(selectinload(Supply.supply_list))
        .where(Supply.deleted_at.is_(None), Supply.active.is_(True))
        .order_by(Supply.name)
    ).all()
    lists = db.scalars(select(SupplyList).order_by(SupplyList.name)).all()

    try:
        event.suggestion = ai.resolve(db, event.ean, product, supplies, lists).model_dump()
    except Exception as error:  # ein API-Ausfall darf keinen Scan verschlucken
        event.note = f"KI-Schritt fehlgeschlagen: {error}"


def _handle(db: Session, ean: str, packs: float, device: str | None) -> ScanResult:
    ean = ean.strip()
    if not ean:
        return ScanResult(ean=ean, status="error", message="Leerer Code")

    # 1. Bekannte EAN: direkt verbuchen, kein Netz noetig
    known = db.get(Barcode, ean)
    if known is not None:
        supply = _live(db, known.supply_id)
        if supply is not None:
            booked = round(packs * known.packs, 2)
            _book(db, supply, booked)
            return ScanResult(
                ean=ean,
                status="booked",
                supply_id=supply.id,
                supply_name=supply.name,
                packs=booked,
            )
        # Artikel liegt im Papierkorb - die Zuordnung ist damit hinfaellig
        db.delete(known)
        db.commit()

    # 2. Schon im Eingang: dazuzaehlen statt eine zweite Zeile aufmachen
    pending = db.scalar(
        select(ScanEvent)
        .where(ScanEvent.ean == ean, ScanEvent.status == "pending")
        .order_by(ScanEvent.id.desc())
    )
    if pending is not None:
        pending.packs = round(pending.packs + packs, 2)
        db.commit()
        return ScanResult(
            ean=ean, status="pending", packs=pending.packs, scan_event_id=pending.id
        )

    # 3. Neuer unbekannter Code: recherchieren
    event = ScanEvent(ean=ean, device=device, packs=packs, scanned_at=datetime.utcnow())
    db.add(event)
    db.flush()
    _research(db, event)

    # 4. Sicher genug? Dann ungefragt zuordnen, merken und verbuchen.
    suggestion = event.suggestion or {}
    match_id = int(suggestion.get("match_supply_id") or 0)
    confidence = float(suggestion.get("confidence") or 0)
    if match_id and confidence >= ai.auto_assign(db):
        supply = _live(db, match_id)
        if supply is not None:
            label = " ".join(
                filter(None, [suggestion.get("brand"), suggestion.get("name")])
            )
            _remember(db, ean, supply, 1, "ai", label or None)
            event.status = "resolved"
            event.resolved_supply_id = supply.id
            event.resolved_at = datetime.utcnow()
            db.commit()
            _book(db, supply, packs)
            return ScanResult(
                ean=ean,
                status="booked",
                supply_id=supply.id,
                supply_name=supply.name,
                packs=packs,
                message=suggestion.get("reason"),
            )

    db.commit()
    return ScanResult(
        ean=ean,
        status="pending",
        packs=event.packs,
        scan_event_id=event.id,
        message=event.note,
    )


@router.post("/scan-events", response_model=ScanBatchOut)
def scan_events(
    payload: ScanBatch,
    db: Session = Depends(get_db),
    _: None = Depends(check_token),
):
    """Was die Station gesammelt hat. Antwortet je Code, damit sie ihr Signal
    setzen kann - und damit sie erst nach einer 200 ihren Puffer leert."""
    return ScanBatchOut(
        results=[_handle(db, item.ean, item.packs, payload.device) for item in payload.events]
    )


# --- Scan-Eingang -------------------------------------------------------

@router.get("/scan-inbox", response_model=list[ScanEventOut])
def scan_inbox(db: Session = Depends(get_db)):
    return db.scalars(
        select(ScanEvent)
        .where(ScanEvent.status == "pending")
        .order_by(ScanEvent.scanned_at.desc(), ScanEvent.id.desc())
    ).all()


def _close(event: ScanEvent, supply: Supply) -> None:
    event.status = "resolved"
    event.resolved_supply_id = supply.id
    event.resolved_at = datetime.utcnow()


def _pending(db: Session, event_id: int) -> ScanEvent:
    event = db.get(ScanEvent, event_id)
    if event is None or event.status != "pending":
        raise HTTPException(status_code=404, detail="Kein offener Eingang mit dieser Id")
    return event


@router.post("/scan-inbox/{event_id}/assign", response_model=SupplyOut)
def assign(event_id: int, payload: ScanAssignIn, db: Session = Depends(get_db)):
    """Eingang einem bestehenden Artikel zuordnen: Kauf verbuchen und die EAN
    merken, damit der naechste Scan ohne Umweg durchgeht."""
    event = _pending(db, event_id)
    supply = _live(db, payload.supply_id)
    if supply is None:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    packs = payload.packs if payload.packs is not None else event.packs
    if payload.remember:
        _remember(db, event.ean, supply, 1, "manual", _label(event))
    _close(event, supply)
    db.commit()

    _book(db, supply, packs)
    db.refresh(supply)
    return _enrich_one(db, supply)


@router.post("/scan-inbox/{event_id}/create", response_model=SupplyOut, status_code=201)
def create_from_scan(event_id: int, payload: ScanCreateIn, db: Session = Depends(get_db)):
    """Eingang als neuen Artikel anlegen - danach wie assign: merken und buchen."""
    event = _pending(db, event_id)
    packs = payload.packs if payload.packs is not None else event.packs

    data = payload.model_dump(exclude={"packs", "remember"})
    supply = create_supply(SupplyIn(**data), db)

    if payload.remember:
        _remember(db, event.ean, supply, 1, "manual", _label(event))
    _close(event, supply)
    db.commit()

    _book(db, supply, packs)
    db.refresh(supply)
    return _enrich_one(db, supply)


@router.delete("/scan-inbox/{event_id}", status_code=204)
def dismiss(event_id: int, db: Session = Depends(get_db)):
    """Verwerfen - der Code war ein Versehen oder gehoert nicht in den Vorrat."""
    event = _pending(db, event_id)
    event.status = "dismissed"
    db.commit()


# --- Zugeordnete Codes --------------------------------------------------

@router.get("/barcodes", response_model=list[BarcodeOut])
def list_barcodes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Barcode).options(selectinload(Barcode.supply)).order_by(Barcode.created_at.desc())
    ).all()
    return [
        BarcodeOut(
            ean=row.ean,
            supply_id=row.supply_id,
            supply_name=row.supply.name if row.supply else None,
            packs=row.packs,
            label=row.label,
            source=row.source,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.delete("/barcodes/{ean}", status_code=204)
def delete_barcode(ean: str, db: Session = Depends(get_db)):
    row = db.get(Barcode, ean)
    if row is None:
        raise HTTPException(status_code=404, detail="Barcode nicht zugeordnet")
    db.delete(row)
    db.commit()


def _config(db: Session) -> ScanConfigOut:
    """Der Zustand, wie ihn die Oberflaeche sehen darf. Die Geheimnisse selbst
    gehen nie mit - nur ob eines hinterlegt ist und dessen letzte Zeichen."""
    return ScanConfigOut(
        lookup_enabled=products.enabled(db),
        ai_enabled=ai.enabled(db),
        ai_model=ai.model(db),
        auto_assign=ai.auto_assign(db),
        token_required=bool(settings.value(db, "scan_token")),
        api_key_set=bool(settings.value(db, "anthropic_api_key")),
        api_key_hint=settings.hint(db, "anthropic_api_key"),
        scan_token_hint=settings.hint(db, "scan_token"),
        sources={name: settings.source(db, name) for name in settings.FIELDS},
        locked=[name for name in settings.FIELDS if settings.locked(name)],
    )


@router.get("/scan-config", response_model=ScanConfigOut)
def scan_config(db: Session = Depends(get_db)):
    """Womit die Scan-Seite erklaeren kann, warum ein Eingang vorbelegt ist -
    und die Einstellungen zeigen, woher jeder Wert gerade kommt."""
    return _config(db)


@router.patch("/scan-config", response_model=ScanConfigOut)
def update_scan_config(payload: ScanSettingsIn, db: Session = Depends(get_db)):
    """Einstellungen speichern. Felder, die per Umgebungsvariable vorgegeben
    sind, werden stillschweigend uebergangen - sonst liesse sich hier ein Wert
    eintragen, der nie greift."""
    for name, raw in payload.model_dump(exclude_unset=True).items():
        if raw is None or settings.locked(name):
            continue
        settings.put(db, name, str(raw))
    db.commit()
    return _config(db)
