"""Download the shared Drive inventory and ingest Excel workbooks into bd_csh.

Usage:
  PYTHONPATH=backend /root/polis/venv/bin/python \\
    backend/scripts/sincronizar_drive_planes_accion.py
Use --solo-descarga to refresh catalog and local cache without database writes.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import re
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.core.config import Settings
from app.core.database import Database
from app.core.transactions import transaction
from app.modules.compromisos.ingesta_masiva_excel import detectar_extension_archivo
from app.modules.compromisos.ingesta_masiva_service import IngestaMasivaService
from app.modules.compromisos.models import ArchivoPlanIngerido, RegistroTriadaNormalizado
from app.modules.compromisos.taxonomia_seguridad import enriquecer_entrada_catalogo

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json"
ARCHIVOS = CATALOG.parent / "archivos"
RESUMEN = CATALOG.parent / "resumen_sincronizacion.json"
MAX_DOWNLOAD = 100 * 1024 * 1024
MAX_WORKERS = 8
MAGIC_XLSX = b"PK\x03\x04"
MAGIC_XLS = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
LOG = logging.getLogger("polis.drive_sync")


def _ext_magic(data: bytes) -> str | None:
    extension = detectar_extension_archivo("", data)
    return extension if extension in {".xlsx", ".xls"} else None


def _nombre_archivo(entry: dict[str, Any]) -> str:
    base = Path(entry.get("name", "libro")).name
    base = re.sub(r"\s+Microsoft(?:\s+Excel)?$", "", base, flags=re.I).strip()
    return base or f"drive-{entry['id']}"


def _fetch(entry: dict[str, Any]) -> tuple[dict[str, Any], bytes | None, str | None]:
    url = f"https://drive.google.com/uc?export=download&id={entry['id']}"
    error = None
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "POLIS-Triada/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read(MAX_DOWNLOAD + 1)
                if len(payload) > MAX_DOWNLOAD:
                    raise ValueError(f"supera el limite {MAX_DOWNLOAD} bytes")
            return entry, payload, None
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            error = str(exc)
            if attempt < 4:
                time.sleep(min(2**attempt, 16))
    return entry, None, error


async def descargar(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ARCHIVOS.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(MAX_WORKERS)
    out: list[dict[str, Any]] = []

    async def one(entry: dict[str, Any]) -> None:
        cached_path = ROOT / entry.get("archivo_local", "")
        if (
            entry.get("estado_descarga") == "descargado"
            and entry.get("sha256")
            and cached_path.is_file()
            and hashlib.sha256(cached_path.read_bytes()).hexdigest() == entry["sha256"]
        ):
            out.append(entry)
            return
        if (
            entry.get("sha256")
            and entry.get("estado_descarga") in {"formato_no_excel", "omitido_no_excel"}
            and "excel" not in str(entry.get("raw_label", "")).lower()
        ):
            out.append(entry)
            return
        async with sem:
            _, data, error = await asyncio.to_thread(_fetch, entry)
        if data is None:
            out.append({**entry, "estado_descarga": "error", "error_descarga": error})
            return
        extension = _ext_magic(data)
        if extension is None:
            es_excel_catalogo = "excel" in str(entry.get("raw_label", "")).lower()
            out.append(
                {
                    **entry,
                    "estado_descarga": "error_formato_excel"
                    if es_excel_catalogo
                    else "formato_no_excel",
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "bytes": len(data),
                }
            )
            return
        nombre_limpio = _nombre_archivo(entry)
        sufijo = Path(nombre_limpio).suffix.lower()
        if sufijo not in {".xls", ".xlsx"}:
            nombre_limpio += extension
        elif sufijo != extension:
            nombre_limpio = Path(nombre_limpio).stem + extension
        sha = hashlib.sha256(data).hexdigest()
        destino = ARCHIVOS / f"{entry['id']}{extension}"
        if not destino.exists() or hashlib.sha256(destino.read_bytes()).hexdigest() != sha:
            destino.write_bytes(data)
        out.append(
            {
                **entry,
                "nombre_archivo_fuente": nombre_limpio,
                "extension_detectada": extension,
                "sha256": sha,
                "bytes": len(data),
                "archivo_local": str(destino.relative_to(ROOT)),
                "estado_descarga": "descargado",
            }
        )

    await asyncio.gather(*(one(entry) for entry in entries))
    return out


def agrupar_por_sha256(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse byte-identical Drive copies while preserving every Drive tag/path."""
    grouped: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if entry.get("estado_descarga") != "descargado" or not entry.get("sha256"):
            continue
        primary = grouped.setdefault(entry["sha256"], dict(entry))
        primary["dimensiones_seguridad_humana"] = list(
            dict.fromkeys(
                [
                    *primary.get("dimensiones_seguridad_humana", []),
                    *entry.get("dimensiones_seguridad_humana", []),
                ]
            )
        )
        primary["rutas_drive"] = list(
            dict.fromkeys([*primary.get("rutas_drive", []), *entry.get("rutas_drive", [])])
        )
        primary["drive_file_ids"] = list(
            dict.fromkeys([*primary.get("drive_file_ids", []), *entry.get("drive_file_ids", [])])
        )
        primary["drive_duplicate_count"] = len(primary["drive_file_ids"])
    return list(grouped.values())


async def ingerir_bd(entries: list[dict[str, Any]]) -> dict[str, Any]:
    settings = Settings()
    database = Database(settings)
    resumen: Counter[str] = Counter()
    errores: list[dict[str, str]] = []
    try:
        async with database.sessions() as session:
            existentes = set((await session.scalars(select(ArchivoPlanIngerido.hash_sha256))).all())
            service = IngestaMasivaService(session)
            for index, entry in enumerate(entries, 1):
                if entry.get("estado_descarga") != "descargado":
                    resumen[entry.get("estado_descarga", "sin_descarga")] += 1
                    continue
                if entry["sha256"] in existentes:
                    archive = await session.scalar(
                        select(ArchivoPlanIngerido)
                        .where(ArchivoPlanIngerido.hash_sha256 == entry["sha256"])
                        .order_by(ArchivoPlanIngerido.creado_en.asc())
                        .limit(1)
                    )
                    if archive:
                        metadata = dict(archive.metadatos or {})
                        metadata["drive_file_ids"] = list(
                            dict.fromkeys(
                                [
                                    *metadata.get("drive_file_ids", []),
                                    *entry.get("drive_file_ids", []),
                                ]
                            )
                        )
                        metadata["rutas_drive"] = list(
                            dict.fromkeys(
                                [*metadata.get("rutas_drive", []), *entry.get("rutas_drive", [])]
                            )
                        )
                        dimensions = list(entry.get("dimensiones_seguridad_humana", []))
                        archive.dimensiones_seguridad_humana = dimensions
                        archive.periodo_gobierno = archive.periodo_gobierno or entry.get(
                            "periodo_gobierno"
                        )
                        archive.vigencia = archive.vigencia or entry.get("vigencia_drive")
                        metadata.update(
                            {
                                "origen_drive": "GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                                "dimensiones_seguridad_humana": dimensions,
                                "periodo_gobierno": archive.periodo_gobierno,
                                "vigencia_drive": archive.vigencia,
                                "drive_file_ids": metadata["drive_file_ids"],
                                "rutas_drive": metadata["rutas_drive"],
                            }
                        )
                        archive.metadatos = metadata
                        rows = list(
                            (
                                await session.scalars(
                                    select(RegistroTriadaNormalizado).where(
                                        RegistroTriadaNormalizado.archivo_id == archive.id
                                    )
                                )
                            ).all()
                        )
                        for row in rows:
                            row.dimensiones_seguridad_humana = dimensions
                            row.periodo_gobierno = archive.periodo_gobierno
                            row.vigencia = row.vigencia or archive.vigencia
                            origin = dict(row.datos_origen or {})
                            origin["_dimensiones_seguridad"] = {
                                key: metadata[key]
                                for key in (
                                    "origen_drive",
                                    "dimensiones_seguridad_humana",
                                    "periodo_gobierno",
                                    "vigencia_drive",
                                    "drive_file_ids",
                                    "rutas_drive",
                                )
                            }
                            row.datos_origen = origin
                        async with transaction(session):
                            pass
                    resumen["ya_persistido"] += 1
                    continue
                path = ROOT / entry["archivo_local"]
                raw = path.read_bytes()
                nombre = entry["nombre_archivo_fuente"]
                metadata = {
                    "origen_drive": "GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                    "drive_file_ids": entry.get("drive_file_ids", []),
                    "rutas_drive": entry.get("rutas_drive", []),
                    "dimensiones_seguridad_humana": entry.get("dimensiones_seguridad_humana", []),
                    "periodo_gobierno": entry.get("periodo_gobierno"),
                    "sha256": entry["sha256"],
                    "drive_id": entry["id"],
                }
                try:
                    result = await service.ingerir(
                        [(nombre, raw)],
                        origen="GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                        vigencia=entry.get("vigencia_drive"),
                        metadatos_por_archivo={nombre: metadata},
                    )
                    if result["archivos_procesados"]:
                        resumen["persistidos"] += result["archivos_persistidos"]
                        resumen["registros_normalizados"] += result["resumen"]["registros"]
                        resumen["hojas"] += result["resumen"]["hojas"]
                        resumen["lotes"] += 1
                    if result["archivos_con_error"]:
                        errores.extend(
                            {"id": entry["id"], **error} for error in result["archivos_con_error"]
                        )
                    if result["archivos_procesados"]:
                        existentes.add(entry["sha256"])
                except Exception as exc:  # keep ingesting unrelated source files
                    errores.append({"id": entry["id"], "nombre": nombre, "error": str(exc)[:500]})
                    resumen["error_ingesta"] += 1
                if index % 25 == 0:
                    LOG.info("ingesta %s/%s; resumen=%s", index, len(entries), dict(resumen))
    finally:
        await database.engine.dispose()
    return {"conteos": dict(resumen), "errores_ingesta": errores}


async def sincronizar_metadatos_bd(entries: list[dict[str, Any]]) -> dict[str, int]:
    """Idempotently merge Drive classification into existing files and normalized rows."""
    database = Database(Settings())
    archivos_actualizados = 0
    registros_actualizados = 0
    try:
        async with database.sessions() as session:
            for entry in entries:
                archive = await session.scalar(
                    select(ArchivoPlanIngerido)
                    .where(ArchivoPlanIngerido.hash_sha256 == entry["sha256"])
                    .order_by(ArchivoPlanIngerido.creado_en.asc())
                    .limit(1)
                )
                if archive is None:
                    continue
                metadata = dict(archive.metadatos or {})
                dimensions = list(entry.get("dimensiones_seguridad_humana", []))
                metadata.update(
                    {
                        "origen_drive": "GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                        "dimensiones_seguridad_humana": dimensions,
                        "periodo_gobierno": archive.periodo_gobierno
                        or entry.get("periodo_gobierno"),
                        "vigencia_drive": archive.vigencia or entry.get("vigencia_drive"),
                        "drive_file_ids": list(
                            dict.fromkeys(
                                [
                                    *metadata.get("drive_file_ids", []),
                                    *entry.get("drive_file_ids", []),
                                ]
                            )
                        ),
                        "rutas_drive": list(
                            dict.fromkeys(
                                [*metadata.get("rutas_drive", []), *entry.get("rutas_drive", [])]
                            )
                        ),
                    }
                )
                archive.dimensiones_seguridad_humana = dimensions
                archive.periodo_gobierno = metadata["periodo_gobierno"]
                archive.vigencia = metadata["vigencia_drive"]
                archive.metadatos = metadata
                rows = list(
                    (
                        await session.scalars(
                            select(RegistroTriadaNormalizado).where(
                                RegistroTriadaNormalizado.archivo_id == archive.id
                            )
                        )
                    ).all()
                )
                drive_tags = {
                    key: metadata[key]
                    for key in (
                        "origen_drive",
                        "dimensiones_seguridad_humana",
                        "periodo_gobierno",
                        "drive_file_ids",
                        "rutas_drive",
                    )
                }
                for row in rows:
                    row.dimensiones_seguridad_humana = dimensions
                    row.periodo_gobierno = archive.periodo_gobierno
                    row.vigencia = row.vigencia or archive.vigencia
                    origin = dict(row.datos_origen or {})
                    source_tags = dict(origin.get("_dimensiones_seguridad") or {})
                    source_tags.update(drive_tags)
                    origin["_dimensiones_seguridad"] = source_tags
                    row.datos_origen = origin
                async with transaction(session):
                    pass
                archivos_actualizados += 1
                registros_actualizados += len(rows)
    finally:
        await database.engine.dispose()
    return {
        "archivos_actualizados": archivos_actualizados,
        "registros_actualizados": registros_actualizados,
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--solo-descarga", action="store_true")
    parser.add_argument("--solo-metadatos", action="store_true")
    parser.add_argument("--reintentar-fallos-bd", action="store_true")
    parser.add_argument("--catalogo", type=Path, default=CATALOG)
    args = parser.parse_args()
    catalog = json.loads(args.catalogo.read_text(encoding="utf-8"))
    if not isinstance(catalog, list) or len(catalog) != 1383:
        raise SystemExit(f"Se esperaba catálogo de 1.383 entradas; hay {len(catalog)}")
    enriched = [enriquecer_entrada_catalogo(item) for item in catalog]
    books = [item for item in enriched if not item.get("is_folder")]
    LOG.info(
        "Descargando %s archivos del catálogo con hasta %s trabajadores", len(books), MAX_WORKERS
    )
    result = await descargar(books)
    grouped = agrupar_por_sha256(result)
    by_id = {item["id"]: item for item in result}
    full_catalog = []
    for item in enriched:
        current = by_id.get(item["id"])
        if current:
            full_catalog.append(current)
        else:
            full_catalog.append(
                {
                    **item,
                    "estado_descarga": "omitido_no_excel",
                    "sha256": None,
                    "bytes": None,
                }
            )
    args.catalogo.write_text(
        json.dumps(full_catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    summary: dict[str, Any] = {
        "catalogo_entradas": len(full_catalog),
        "archivos_intentados": len(books),
        "descargas": dict(Counter(item["estado_descarga"] for item in result)),
        "magic_bytes": dict(
            Counter(
                item.get("extension_detectada")
                for item in result
                if item.get("extension_detectada")
            )
        ),
        "archivos_locales": len(list(ARCHIVOS.glob("*"))),
        "bytes_locales": sum(p.stat().st_size for p in ARCHIVOS.glob("*") if p.is_file()),
    }
    if not args.solo_descarga:
        if args.solo_metadatos:
            prior = json.loads(RESUMEN.read_text(encoding="utf-8")) if RESUMEN.exists() else {}
            prior.update(
                {
                    "catalogo_entradas": summary["catalogo_entradas"],
                    "archivos_intentados": summary["archivos_intentados"],
                    "descargas": summary["descargas"],
                    "magic_bytes": summary["magic_bytes"],
                    "archivos_locales": summary["archivos_locales"],
                    "bytes_locales": summary["bytes_locales"],
                    "sincronizacion_metadatos_bd": await sincronizar_metadatos_bd(grouped),
                }
            )
            RESUMEN.write_text(
                json.dumps(prior, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print(json.dumps(prior["sincronizacion_metadatos_bd"], ensure_ascii=False, indent=2))
            return
        elif args.reintentar_fallos_bd:
            prior = json.loads(RESUMEN.read_text(encoding="utf-8")) if RESUMEN.exists() else {}
            old_errors = [
                *prior.get("ingesta_bd", {}).get("errores_ingesta", []),
                *prior.get("reintento_bd", {}).get("errores_ingesta", []),
            ]
            failed_ids = {
                error.get("id")
                for error in old_errors
                if "value too long" in error.get("error", "")
                or "validation error" in error.get("error", "").lower()
                or "numeric field overflow" in error.get("error", "").lower()
                or "int' and 'nonetype'" in error.get("error", "").lower()
            }
            retry = [item for item in grouped if set(item.get("drive_file_ids", [])) & failed_ids]
            summary["reintento_bd"] = await ingerir_bd(retry)
            prior.update(summary)
            RESUMEN.write_text(
                json.dumps(prior, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            return
        else:
            summary["libros_unicos_por_sha256"] = len(grouped)
            summary["copias_binarias_duplicadas"] = len(
                [item for item in result if item.get("estado_descarga") == "descargado"]
            ) - len(grouped)
            summary["ingesta_bd"] = await ingerir_bd(grouped)
    RESUMEN.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(main())
