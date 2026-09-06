"""Snapshots: anlegen, herunterladen, hochladen, zurueckspielen, loeschen."""
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import backup
from ..schemas import BackupInfo, BackupNote, RestoreResult

router = APIRouter(prefix="/backups", tags=["backup"])


@router.get("", response_model=list[BackupInfo])
def list_backups():
    return backup.list_backups()


@router.post("", response_model=BackupInfo, status_code=201)
def create_backup(payload: BackupNote | None = None):
    try:
        return backup.create("manual", payload.note if payload else None)
    except FileNotFoundError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/{name}/download")
def download(name: str):
    try:
        path = backup._safe(name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if not path.exists():
        raise HTTPException(status_code=404, detail="Snapshot nicht gefunden")
    return FileResponse(path, media_type="application/x-sqlite3", filename=name)


@router.post("/upload", response_model=BackupInfo, status_code=201)
async def upload(file: UploadFile):
    try:
        return backup.store_upload(await file.read())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/{name}/restore", response_model=RestoreResult)
def restore(name: str):
    try:
        return backup.restore(name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Snapshot nicht gefunden") from error


@router.delete("/{name}", status_code=204)
def delete(name: str):
    try:
        backup.delete(name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
