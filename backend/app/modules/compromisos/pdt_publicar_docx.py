"""Publica un .docx en la carpeta PSHC de Drive, convertido a Google Doc (idempotente)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

from app.modules.compromisos.pdt_generador_google_doc_pshc import (
    FOLDER_DEFAULT,
    _credentials,
    _drive_request,
    _drive_token,
)

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


async def publicar_docx(ruta: Path, nombre: str, folder_id: str = FOLDER_DEFAULT) -> dict[str, Any]:
    token = await _drive_token(_credentials())
    boundary = "===polis_docx_boundary==="
    async with httpx.AsyncClient(timeout=300) as client:
        q = f"name = '{nombre}' and '{folder_id}' in parents and trashed = false"
        found = await _drive_request(
            client,
            "GET",
            "https://www.googleapis.com/drive/v3/files",
            token,
            params={
                "q": q,
                "fields": "files(id)",
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            },
        )
        existing = next(iter(found.get("files", [])), None)
        meta = {"name": nombre, "mimeType": "application/vnd.google-apps.document"}
        if existing:
            url = f"https://www.googleapis.com/upload/drive/v3/files/{existing['id']}"
            method = "PATCH"
        else:
            meta["parents"] = [folder_id]
            url = "https://www.googleapis.com/upload/drive/v3/files"
            method = "POST"
        body = (
            (
                f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
                f"{json.dumps(meta)}\r\n--{boundary}\r\nContent-Type: {DOCX_MIME}\r\n\r\n"
            ).encode()
            + ruta.read_bytes()
            + f"\r\n--{boundary}--\r\n".encode()
        )
        r = await client.request(
            method,
            url,
            params={
                "uploadType": "multipart",
                "supportsAllDrives": "true",
                "fields": "id,name,mimeType,webViewLink",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": f"multipart/related; boundary={boundary}",
            },
            content=body,
        )
        r.raise_for_status()
        return r.json()
