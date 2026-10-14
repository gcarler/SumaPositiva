"""Sanitize persisted Triada entities and merge exact semantic clones in bd_csh."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from pathlib import Path

from sqlalchemy import delete, select

from app.core.config import Settings
from app.core.database import Database
from app.core.transactions import transaction
from app.modules.compromisos.ingesta_masiva_excel import (
    HojaLeida,
    IngestorBinarioTriada,
    _normalizar,
    huella_tabular_sha256,
    normalizar_entidad,
)
from app.modules.compromisos.models import (
    ArchivoPlanIngerido,
    LoteIngestaPlan,
    RegistroTriadaNormalizado,
)


def _entidad_en_datos_origen(data: dict) -> tuple[str | None, str | None]:
    first_raw = None
    for header, value in data.items():
        header_norm = _normalizar(header)
        if any(
            token in header_norm.split()
            for token in ("entidad", "dependencia", "responsable", "organismo", "secretaria")
        ):
            raw = str(value).strip() if value is not None else None
            recognized = normalizar_entidad(raw)
            if recognized:
                return recognized, raw
            first_raw = first_raw or raw
    return None, first_raw


async def sanear() -> dict[str, int]:
    database = Database(Settings())
    if database.engine.url.database != "bd_csh":
        await database.engine.dispose()
        raise RuntimeError("El saneamiento forense solo se ejecuta contra bd_csh.")
    stats = {
        "entidades_archivo_corregidas": 0,
        "entidades_fila_corregidas": 0,
        "clones_fusionados": 0,
        "alertas_corte_identico": 0,
    }
    root = Path(__file__).resolve().parents[2]
    catalog_path = root / "data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json"
    local_by_hash: dict[str, Path] = {}
    if catalog_path.is_file():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        for entry in catalog:
            if entry.get("sha256") and entry.get("archivo_local"):
                local_by_hash.setdefault(entry["sha256"], root / entry["archivo_local"])
    parser = IngestorBinarioTriada()
    entity_by_hash: dict[str, str | None] = {}
    async with database.sessions() as session:
        async with transaction(session):
            archives = list(
                (
                    await session.scalars(
                        select(ArchivoPlanIngerido).order_by(ArchivoPlanIngerido.creado_en)
                    )
                ).all()
            )
            fingerprints: dict[
                tuple[str | None, int | None, str, str], list[ArchivoPlanIngerido]
            ] = defaultdict(list)
            clones_por_entidad_huella: dict[tuple[str | None, str], list[ArchivoPlanIngerido]] = (
                defaultdict(list)
            )
            deleted_archive_ids = set()
            for archive in archives:
                rows = list(
                    (
                        await session.scalars(
                            select(RegistroTriadaNormalizado)
                            .where(RegistroTriadaNormalizado.archivo_id == archive.id)
                            .order_by(
                                RegistroTriadaNormalizado.hoja_origen,
                                RegistroTriadaNormalizado.fila_origen_num,
                                RegistroTriadaNormalizado.motor_destino,
                            )
                        )
                    ).all()
                )
                entity_from_name = normalizar_entidad(None, archive.nombre_archivo)
                if entity_from_name is None and archive.hash_sha256 not in entity_by_hash:
                    local_file = local_by_hash.get(archive.hash_sha256)
                    if local_file and local_file.is_file():
                        try:
                            parsed = parser.leer_lote(
                                str(local_file),
                                local_file.read_bytes(),
                                archive.vigencia,
                                archive.corte_periodo,
                            )
                            entity_by_hash[archive.hash_sha256] = next(
                                (book.entidad for book in parsed if book.entidad), None
                            )
                        except Exception:
                            entity_by_hash[archive.hash_sha256] = None
                    else:
                        entity_by_hash[archive.hash_sha256] = None
                entity_from_name = entity_from_name or entity_by_hash.get(archive.hash_sha256)
                sheet_rows: dict[str, list[dict]] = defaultdict(list)
                for row in rows:
                    data = dict(row.datos_origen or {})
                    recognized, raw_entity = _entidad_en_datos_origen(data)
                    row_entity_before = row.entidad_normalizada
                    canonical = (
                        recognized or entity_from_name or normalizar_entidad(row_entity_before)
                    )
                    if raw_entity and normalizar_entidad(raw_entity) is None:
                        data.setdefault("_responsable_celda", raw_entity)
                    elif row_entity_before and normalizar_entidad(row_entity_before) is None:
                        data.setdefault("_responsable_celda", row_entity_before)
                    row.entidad_normalizada = canonical
                    if row_entity_before != canonical:
                        stats["entidades_fila_corregidas"] += 1
                    row.datos_origen = data
                    sheet_rows[row.hoja_origen or ""].append(
                        {
                            "motor_destino": row.motor_destino,
                            "entidad_normalizada": canonical,
                            "linea_estrategica": row.linea_estrategica,
                            "codigo_meta_pdd": row.codigo_meta_pdd,
                            "codigo_bpim": row.codigo_bpim,
                            "indicador": row.indicador,
                            "descripcion_actividad": row.descripcion_actividad,
                            "meta_programada_anual": float(row.meta_programada_anual)
                            if row.meta_programada_anual is not None
                            else None,
                            "meta_ejecutada_anual": float(row.meta_ejecutada_anual)
                            if row.meta_ejecutada_anual is not None
                            else None,
                            "avance_t1": float(row.avance_t1)
                            if row.avance_t1 is not None
                            else None,
                            "avance_t2": float(row.avance_t2)
                            if row.avance_t2 is not None
                            else None,
                            "avance_t3": float(row.avance_t3)
                            if row.avance_t3 is not None
                            else None,
                            "avance_t4": float(row.avance_t4)
                            if row.avance_t4 is not None
                            else None,
                            "avance_fisico_pct": float(row.avance_fisico_pct)
                            if row.avance_fisico_pct is not None
                            else None,
                            "avance_estrategico_pct": float(row.avance_estrategico_pct)
                            if row.avance_estrategico_pct is not None
                            else None,
                            "apropiacion_definitiva_cop": float(row.apropiacion_definitiva_cop)
                            if row.apropiacion_definitiva_cop is not None
                            else None,
                            "apropiacion_inicial_cop": None,
                            "cdp_cop": float(row.cdp_cop) if row.cdp_cop is not None else None,
                            "compromisos_rp_cop": float(row.compromisos_rp_cop)
                            if row.compromisos_rp_cop is not None
                            else None,
                            "obligaciones_cop": float(row.obligaciones_cop)
                            if row.obligaciones_cop is not None
                            else None,
                            "pagos_tesoreria_cop": float(row.pagos_tesoreria_cop)
                            if row.pagos_tesoreria_cop is not None
                            else None,
                            "fila_origen_num": row.fila_origen_num,
                        }
                    )
                archive_entity_before = archive.entidad_normalizada
                canonical_archive = entity_from_name or normalizar_entidad(archive_entity_before)
                if not canonical_archive:
                    canonical_archive = next(
                        (r.entidad_normalizada for r in rows if r.entidad_normalizada), None
                    )
                archive.entidad_normalizada = canonical_archive
                if archive_entity_before != canonical_archive:
                    stats["entidades_archivo_corregidas"] += 1
                if rows:
                    synthetic_sheets = [
                        HojaLeida(name, 0, {}, sheet_rows[name], []) for name in sorted(sheet_rows)
                    ]
                    fingerprint = huella_tabular_sha256(synthetic_sheets)
                    metadata = dict(archive.metadatos or {})
                    metadata["huella_tabular_sha256"] = fingerprint
                    archive.metadatos = metadata
                    fingerprints[
                        (canonical_archive, archive.vigencia, archive.corte_periodo, fingerprint)
                    ].append(archive)
                    clones_por_entidad_huella[(canonical_archive, fingerprint)].append(archive)
            for key, group in fingerprints.items():
                if len(group) < 2 or not key[0] or key[1] is None:
                    continue
                group.sort(
                    key=lambda item: (item.filas_extraidas == 0, item.creado_en, str(item.id))
                )
                canonical = group[0]
                canonical_meta = dict(canonical.metadatos or {})
                for duplicate in group[1:]:
                    rows = list(
                        (
                            await session.scalars(
                                select(RegistroTriadaNormalizado).where(
                                    RegistroTriadaNormalizado.archivo_id == duplicate.id
                                )
                            )
                        ).all()
                    )
                    dims = list(
                        dict.fromkeys(
                            [
                                *(canonical.dimensiones_seguridad_humana or []),
                                *(duplicate.dimensiones_seguridad_humana or []),
                            ]
                        )
                    )
                    canonical.dimensiones_seguridad_humana = dims
                    canonical_meta["dimensiones_seguridad_humana"] = dims
                    for row in await session.scalars(
                        select(RegistroTriadaNormalizado).where(
                            RegistroTriadaNormalizado.archivo_id == canonical.id
                        )
                    ):
                        row.dimensiones_seguridad_humana = dims
                        source_data = dict(row.datos_origen or {})
                        source_tags = dict(source_data.get("_dimensiones_seguridad") or {})
                        source_tags["dimensiones_seguridad_humana"] = dims
                        for field in ("rutas_drive", "drive_file_ids"):
                            source_tags[field] = list(
                                dict.fromkeys(
                                    [
                                        *(source_tags.get(field) or []),
                                        *((duplicate.metadatos or {}).get(field) or []),
                                    ]
                                )
                            )
                        source_data["_dimensiones_seguridad"] = source_tags
                        row.datos_origen = source_data
                    source_meta = dict(duplicate.metadatos or {})
                    for field in ("rutas_drive", "drive_file_ids"):
                        canonical_meta[field] = list(
                            dict.fromkeys(
                                [
                                    *(canonical_meta.get(field) or []),
                                    *(source_meta.get(field) or []),
                                ]
                            )
                        )
                    clones = canonical_meta.setdefault("clones_tabulares_fusionados", [])
                    clones.append(
                        {
                            "hash_sha256": duplicate.hash_sha256,
                            "nombre_archivo": duplicate.nombre_archivo,
                            "archivo_id": str(duplicate.id),
                        }
                    )
                    lot = await session.get(LoteIngestaPlan, duplicate.lote_id)
                    if lot:
                        lot.total_archivos = max(0, lot.total_archivos - 1)
                        lot.archivos_exitosos = max(0, lot.archivos_exitosos - 1)
                        lot.total_hojas_procesadas = max(
                            0,
                            lot.total_hojas_procesadas - len(duplicate.hojas_analizadas or []),
                        )
                        lot.total_registros_normalizados = max(
                            0, lot.total_registros_normalizados - len(rows)
                        )
                        motor_counts = dict(lot.resumen_motores or {})
                        for row in rows:
                            motor_counts[row.motor_destino] = max(
                                0, motor_counts.get(row.motor_destino, 0) - 1
                            )
                        lot.resumen_motores = motor_counts
                    if rows:
                        await session.execute(
                            delete(RegistroTriadaNormalizado).where(
                                RegistroTriadaNormalizado.archivo_id == duplicate.id
                            )
                        )
                    await session.delete(duplicate)
                    deleted_archive_ids.add(duplicate.id)
                    stats["clones_fusionados"] += 1
                canonical.metadatos = canonical_meta
            for (entity, _fingerprint), clone_group in clones_por_entidad_huella.items():
                survivors = [item for item in clone_group if item.id not in deleted_archive_ids]
                identities = {(item.vigencia, item.corte_periodo) for item in survivors}
                if not entity or len(identities) < 2:
                    continue
                survivors.sort(key=lambda item: (item.creado_en, str(item.id)))
                source = survivors[0]
                for alert_archive in survivors[1:]:
                    metadata = dict(alert_archive.metadatos or {})
                    if metadata.get("alerta_calidad") != "CONTENIDO_IDENTICO_OTRO_CORTE":
                        stats["alertas_corte_identico"] += 1
                    metadata["alerta_calidad"] = "CONTENIDO_IDENTICO_OTRO_CORTE"
                    metadata["corte_clonado_de"] = {
                        "vigencia": source.vigencia,
                        "corte_periodo": source.corte_periodo,
                        "archivo_id": str(source.id),
                    }
                    alert_archive.metadatos = metadata
            await session.flush()
    await database.engine.dispose()
    return stats


if __name__ == "__main__":
    print(asyncio.run(sanear()))
