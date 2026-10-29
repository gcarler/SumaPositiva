"""Idempotently fetch and index PDF plan-action evidence from the Drive catalog."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import httpx
import jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402

CATALOG = ROOT / "data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json"
PDF_CACHE = ROOT / "data/planes_accion/drive_sector_seguridad/archivos_pdf"
ANYDOC_MD_CACHE = ROOT / "data/planes_accion/drive_sector_seguridad/anydoc_md"
SERVICE_ACCOUNT = ROOT / "backend/.secrets/gdrive-service-account.json"
VERBOS_COMUNES = (
    "adecuar",
    "adoptar",
    "apoyar",
    "atender",
    "brindar",
    "capacitar",
    "construir",
    "crear",
    "desarrollar",
    "diseñar",
    "ejecutar",
    "expedir",
    "fortalecer",
    "gestionar",
    "identificar",
    "implementar",
    "instalar",
    "intervenir",
    "mantener",
    "mejorar",
    "organizar",
    "promover",
    "proteger",
    "realizar",
    "reducir",
    "rehabilitar",
    "restaurar",
    "suministrar",
    "verificar",
)
VERBOS_DEBILES = {"apoyar", "desarrollar", "fortalecer", "promover"}
ENTITY_ALIASES = {
    "DATT": "Departamento Administrativo de Tránsito y Transporte",
    "DISTRISEGURIDAD": "Distriseguridad",
    "SECRETARIA DEL INTERIOR": "Secretaría del Interior y Convivencia Ciudadana",
    "SECRETARÍA DEL INTERIOR": "Secretaría del Interior y Convivencia Ciudadana",
    "ESCUELA DE GOBIERNO": "Escuela de Gobierno y Liderazgo",
    "EGL": "Escuela de Gobierno y Liderazgo",
    "IPCC": "Instituto de Patrimonio y Cultura de Cartagena",
    "PARTICIPACION": "Secretaría de Participación y Desarrollo Social",
    "PARTICIPACIÓN": "Secretaría de Participación y Desarrollo Social",
    "IDER": "Instituto Distrital de Deporte y Recreación",
    "IDACCC": "Instituto de Acción Comunal y Capital Social de Cartagena",
    "CORVIVIENDA": "Corvivienda",
    "DADIS": "Departamento Administrativo Distrital de Salud",
    "SECRETARIA DE EDUCACION": "Secretaría de Educación",
    "SECRETARÍA DE EDUCACIÓN": "Secretaría de Educación",
    "SECRETARIA DE INFRAESTRUCTURA": "Secretaría de Infraestructura",
    "SECRETARÍA DE INFRAESTRUCTURA": "Secretaría de Infraestructura",
    "EPA": "Establecimiento Público Ambiental",
    "G.E.P.M.": "Gerencia de Espacio Público y Movilidad",
    "GEPM": "Gerencia de Espacio Público y Movilidad",
    "PES-PR": "Plan de Emergencia Social Pedro Romero",
    "PES PR": "Plan de Emergencia Social Pedro Romero",
    "PES": "Plan de Emergencia Social Pedro Romero",
    "ESCUELA TALLER": "Escuela Taller Cartagena de Indias",
    "RIESGOS": "Oficina Asesora para la Gestión del Riesgo de Desastres",
    "VALORIZACION": "Departamento Administrativo de Valorización Distrital",
    "VALORIZACIÓN": "Departamento Administrativo de Valorización Distrital",
    "PLANEACION": "Secretaría de Planeación",
    "PLANEACIÓN": "Secretaría de Planeación",
    "TRANSCARIBE": "Transcaribe",
    "HACIENDA": "Secretaría de Hacienda",
    "TURISMO": "Secretaría de Turismo",
    "UMATA": "Unidad Municipal de Asistencia Técnica Agropecuaria",
    "SECRETARIA GENERAL": "Secretaría General",
    "SECRETARÍA GENERAL": "Secretaría General",
    "CORPOTURISMO": "Secretaría de Turismo",
}


def _token(credentials: dict[str, Any]) -> str:
    from time import time

    issued = int(time())
    assertion = jwt.encode(
        {
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/drive",
            "aud": credentials["token_uri"],
            "iat": issued,
            "exp": issued + 3600,
        },
        credentials["private_key"],
        algorithm="RS256",
    )
    response = httpx.post(
        credentials["token_uri"],
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def _canonical_pdfs() -> list[dict[str, Any]]:
    entries = json.loads(CATALOG.read_text(encoding="utf-8"))
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        if entry.get("estado_descarga") == "formato_no_excel" and entry.get("sha256"):
            grouped[entry["sha256"]].append(entry)
    canonical = []
    for digest, aliases in sorted(grouped.items()):
        aliases.sort(key=lambda row: (not bool(row.get("vigencia_drive")), row["name"], row["id"]))
        row = dict(aliases[0])
        row["sha256"] = digest
        row["catalog_aliases"] = aliases
        row["all_drive_ids"] = sorted(
            {file_id for alias in aliases for file_id in alias.get("drive_file_ids", [alias["id"]])}
        )
        row["all_dimensions"] = sorted(
            {dimension for alias in aliases for dimension in alias.get("dimensiones_seguridad_humana", [])}
        )
        canonical.append(row)
    return canonical


async def _download_pdfs(rows: list[dict[str, Any]]) -> dict[str, Path]:
    if not SERVICE_ACCOUNT.is_file():
        raise FileNotFoundError(f"No existe la cuenta de servicio: {SERVICE_ACCOUNT}")
    credentials = json.loads(SERVICE_ACCOUNT.read_text(encoding="utf-8"))
    token = await asyncio.to_thread(_token, credentials)
    headers = {"Authorization": f"Bearer {token}"}
    PDF_CACHE.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(6)
    paths: dict[str, Path] = {}

    async def fetch(client: httpx.AsyncClient, row: dict[str, Any]) -> None:
        target = PDF_CACHE / f"{row['sha256']}.pdf"
        if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == row["sha256"]:
            paths[row["sha256"]] = target
            return
        file_ids = row.get("all_drive_ids") or [row["id"]]
        last_error: Exception | None = None
        async with semaphore:
            for file_id in file_ids:
                try:
                    response = await client.get(
                        f"https://www.googleapis.com/drive/v3/files/{file_id}",
                        params={"alt": "media", "supportsAllDrives": "true"},
                        headers=headers,
                        timeout=90,
                    )
                    response.raise_for_status()
                    payload = response.content
                    if not payload.startswith(b"%PDF-"):
                        raise ValueError(f"El archivo Drive {file_id} no tiene firma PDF")
                    actual_hash = hashlib.sha256(payload).hexdigest()
                    if actual_hash != row["sha256"]:
                        raise ValueError(f"SHA-256 no coincide para {row['name']}: {actual_hash}")
                    temporary = target.with_suffix(".pdf.part")
                    temporary.write_bytes(payload)
                    temporary.replace(target)
                    paths[row["sha256"]] = target
                    return
                except Exception as error:
                    last_error = error
        raise RuntimeError(f"No fue posible descargar {row['name']}: {last_error}")

    async with httpx.AsyncClient(follow_redirects=True) as client:
        await asyncio.gather(*(fetch(client, row) for row in rows))
    return paths


def _extract_text(path: Path) -> str:
    ANYDOC_MD_CACHE.mkdir(parents=True, exist_ok=True)
    md_path = ANYDOC_MD_CACHE / f"{path.stem}.md"
    if md_path.is_file() and md_path.stat().st_size > 0:
        return md_path.read_text(encoding="utf-8", errors="replace")
    anydoc_bin = Path("/usr/local/bin/anydoc")
    if anydoc_bin.is_file():
        res = subprocess.run(
            [str(anydoc_bin), str(path), "-o", str(md_path)],
            check=False,
            capture_output=True,
            timeout=180,
        )
        if res.returncode == 0 and md_path.is_file() and md_path.stat().st_size > 0:
            return md_path.read_text(encoding="utf-8", errors="replace")
    result = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        check=True,
        capture_output=True,
        timeout=180,
    )
    txt = result.stdout.decode("utf-8", errors="replace")
    md_path.write_text(txt, encoding="utf-8")
    return txt


def _entity(name: str) -> str | None:
    normalized = re.sub(r"\s+", " ", name.upper()).replace("Ã", "A")
    for alias, entity in sorted(ENTITY_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", normalized):
            return entity
    return None


def _document_type(row: dict[str, Any], pdf_text: str) -> str:
    # Classify by the document's named subject; body mentions of a PDD are not
    # sufficient evidence because action-plan reports cite the governing PDD.
    del pdf_text
    title = row["name"].casefold()
    return "PLAN_DESARROLLO" if re.search(r"plan\s+de\s+desarrollo|\bpdd\b", title) else "PLAN_ACCION"


def _entity_from_evidence(name: str, pdf_text: str) -> str | None:
    return _entity(name) or _entity(pdf_text[:5000])


def _year(row: dict[str, Any]) -> int:
    if row.get("vigencia_drive"):
        return int(row["vigencia_drive"])
    match = re.search(r"20(?:1[2-9]|2[0-7])", row["name"])
    return int(match.group(0)) if match else 2025


def _period(year: int) -> str:
    if year < 2020:
        return "ANTES_2020"
    return "2020_2023" if year <= 2023 else "2024_2027"


def _candidate_lines(text_value: str) -> list[tuple[int, str]]:
    lines: list[tuple[int, str]] = []
    seen: set[str] = set()
    for number, raw in enumerate(text_value.splitlines(), start=1):
        line = re.sub(r"\s+", " ", raw).strip(" |\t")
        if len(line) < 28 or not re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3}", line):
            continue
        if re.fullmatch(r"(?:página\s*)?\d+(?:\s*(?:de|/|\|)\s*\d+)?", line, re.I):
            continue
        folded = line.casefold()
        if folded in seen:
            continue
        seen.add(folded)
        has_signal = bool(
            re.search(
                r"\b(meta|indicador|actividad|producto|avance|cumplimiento|ejecutad|programad|\d{2,})\b|%",
                line,
                re.I,
            )
        ) or any(re.search(rf"\b{verb}\w*\b", folded) for verb in VERBOS_COMUNES)
        if has_signal:
            lines.append((number, line[:5000]))
    return lines[:5000]


def _verb(line: str) -> str | None:
    for token in re.findall(r"\b[a-záéíóúñ]{4,18}\b", line.lower()):
        if token in VERBOS_COMUNES or token.endswith(("ar", "er", "ir")):
            if token not in {"para", "sobre", "entre", "durante", "hacer", "poder", "deber"}:
                return token[:50]
    return None


def _percent(line: str) -> float | None:
    values = re.findall(r"(?<!\d)(\d{1,3}(?:[,.]\d{1,3})?)\s*%", line)
    if not values:
        return None
    value = float(values[-1].replace(",", "."))
    return min(100.0, max(0.0, value)) if value <= 100 else None


def _meta_value(line: str) -> float | None:
    if not re.search(r"\b(meta|programad[ao]|ejecutad[ao]|cantidad|número)\b", line, re.I):
        return None
    matches = re.findall(r"(?<!\w)(\d{1,7}(?:[.,]\d{1,3})?)(?!\w)", line)
    if not matches:
        return None
    try:
        return float(matches[-1].replace(",", "."))
    except ValueError:
        return None


async def ingest() -> dict[str, Any]:
    entries = json.loads(CATALOG.read_text(encoding="utf-8"))
    pdf_entries = [entry for entry in entries if entry.get("estado_descarga") == "formato_no_excel"]
    if len(pdf_entries) != 78:
        raise ValueError("El catálogo ya no contiene las 78 entradas PDF esperadas")
    rows = _canonical_pdfs()
    paths = await _download_pdfs(rows)
    extracted: list[dict[str, Any]] = []
    for row in rows:
        pdf_text = await asyncio.to_thread(_extract_text, paths[row["sha256"]])
        entity = _entity_from_evidence(row["name"], pdf_text)
        year = _year(row)
        motor = _document_type(row, pdf_text)
        dimensions = row["all_dimensions"]
        records = []
        for line_no, line in _candidate_lines(pdf_text):
            verb = _verb(line)
            percent = _percent(line)
            records.append(
                {
                    "line_no": line_no,
                    "line": line,
                    "verb": verb,
                    "percent": percent,
                    "meta": _meta_value(line),
                    "strong": bool(verb and verb not in VERBOS_DEBILES),
                }
            )
        extracted.append(
            {
                "row": row,
                "text": pdf_text,
                "entity": entity,
                "motor": motor,
                "year": year,
                "dimensions": dimensions,
                "records": records,
            }
        )

    seed = hashlib.sha256("".join(sorted(row["sha256"] for row in rows)).encode()).hexdigest()[:12]
    lot_code = f"PDFPA-DRIVE-{seed}"
    engine = create_async_engine(Settings().async_database_url)
    inserted_files = inserted_records = skipped_files = 0
    try:
        async with engine.begin() as connection:
            lot_id = await connection.scalar(
                text("""
                    INSERT INTO seguimiento.lotes_ingesta_planes
                        (codigo_lote, origen, total_archivos, resumen_motores)
                    VALUES (:code, 'GOOGLE_DRIVE_PDF', 0, '{}'::jsonb)
                    ON CONFLICT (codigo_lote) DO UPDATE SET codigo_lote = EXCLUDED.codigo_lote
                    RETURNING id
                """),
                {"code": lot_code},
            )
            record_counts: dict[str, int] = defaultdict(int)
            for item in extracted:
                row = item["row"]
                digest = row["sha256"]
                record_counts[item["motor"]] += len(item["records"])
                existing = await connection.execute(
                    text("""
                        SELECT id FROM seguimiento.archivos_plan_ingeridos
                        WHERE hash_sha256=:hash AND formato_extension='.pdf' LIMIT 1
                    """),
                    {"hash": digest},
                )
                existing_id = existing.scalar_one_or_none()
                if existing_id:
                    item = next(value for value in extracted if value["row"]["sha256"] == digest)
                    await connection.execute(
                        text("""
                            UPDATE seguimiento.archivos_plan_ingeridos SET
                              perfil_detectado=:profile, vigencia=:year, corte_periodo=:cut,
                              dimensiones_seguridad_humana=CAST(:dimensions AS jsonb),
                              periodo_gobierno=:period, entidad_normalizada=:entity,
                              metadatos=metadatos || CAST(:metadata AS jsonb)
                            WHERE id=:id
                        """),
                        {
                            "profile": f"PDF_{item['motor']}_OFICIAL",
                            "year": item["year"],
                            "cut": ("CORTE_30_JUN_2025" if item["year"] == 2025 else f"ANUAL_{item['year']}"),
                            "dimensions": json.dumps(item["dimensions"], ensure_ascii=False),
                            "period": _period(item["year"]),
                            "entity": item["entity"],
                            "metadata": json.dumps({"tipo_documento": item["motor"], "reclasificado": True}),
                            "id": existing_id,
                        },
                    )
                    await connection.execute(
                        text("""
                            UPDATE seguimiento.registros_triada_normalizados SET
                              motor_destino=:motor, entidad_normalizada=:entity,
                              vigencia=:year, periodo_gobierno=:period,
                              dimensiones_seguridad_humana=CAST(:dimensions AS jsonb)
                            WHERE archivo_id=:id
                        """),
                        {
                            "motor": item["motor"],
                            "entity": item["entity"],
                            "year": item["year"],
                            "period": _period(item["year"]),
                            "dimensions": json.dumps(item["dimensions"], ensure_ascii=False),
                            "id": existing_id,
                        },
                    )
                    skipped_files += 1
                    continue
                year = item["year"]
                entity = item["entity"]
                dimensions = item["dimensions"]
                record_rows = item["records"]
                cut = "ANUAL_2018" if year == 2018 else "CORTE_30_JUN_2025" if year == 2025 else f"ANUAL_{year}"
                file_id = await connection.scalar(
                    text("""
                        INSERT INTO seguimiento.archivos_plan_ingeridos (
                            lote_id,nombre_archivo,formato_extension,hash_sha256,perfil_detectado,
                            confianza_deteccion,vigencia,corte_periodo,dimensiones_seguridad_humana,
                            periodo_gobierno,entidad_normalizada,hojas_analizadas,mapeo_columnas,
                            filas_extraidas,metadatos
                        ) VALUES (
                            :lot,:name,'.pdf',:hash,:profile,0.95,:year,:cut,
                            CAST(:dimensions AS jsonb),:period,:entity,CAST(:pages AS jsonb),
                            CAST(:mapping AS jsonb),:count,CAST(:metadata AS jsonb)
                        ) RETURNING id
                    """),
                    {
                        "lot": lot_id,
                        "name": row["name"][:300],
                        "profile": f"PDF_{item['motor']}_OFICIAL",
                        "hash": digest,
                        "year": year,
                        "cut": cut,
                        "dimensions": json.dumps(dimensions, ensure_ascii=False),
                        "period": _period(year),
                        "entity": entity,
                        "pages": json.dumps([{"pagina": index + 1} for index in range(item["text"].count("\f") + 1)]),
                        "mapping": json.dumps(
                            {"extraccion": "pdftotext -layout", "entidad_resuelta": entity},
                            ensure_ascii=False,
                        ),
                        "count": len(record_rows),
                        "metadata": json.dumps(
                            {
                                "drive_ids": row["all_drive_ids"],
                                "rutas_drive": [alias.get("path") for alias in row["catalog_aliases"]],
                                "catalog_entries": len(row["catalog_aliases"]),
                                "periodo_gobierno": _period(year),
                                "dimensiones_seguridad_humana": dimensions,
                                "tipo_documento": item["motor"],
                                "calidad_extraccion": "TEXTO_PDF; no OCR aplicado",
                            },
                            ensure_ascii=False,
                        ),
                    },
                )
                for record in record_rows:
                    await connection.execute(
                        text("""
                            INSERT INTO seguimiento.registros_triada_normalizados (
                                archivo_id,lote_id,motor_destino,vigencia,corte_periodo,
                                dimensiones_seguridad_humana,periodo_gobierno,entidad_normalizada,
                                indicador,descripcion_actividad,verbo_fuerte_dnp,verbo_detectado,
                                meta_programada_anual,meta_ejecutada_anual,avance_fisico_pct,
                                hoja_origen,fila_origen_num,datos_origen
                            ) VALUES (
                                :file,:lot,:motor,:year,:cut,CAST(:dimensions AS jsonb),
                                :period,:entity,:indicator,:description,:strong,:verb,:meta,:executed,
                                :percent,'PDF_TEXT',:line,CAST(:origin AS jsonb)
                            )
                        """),
                        {
                            "file": file_id,
                            "motor": item["motor"],
                            "lot": lot_id,
                            "year": year,
                            "cut": cut,
                            "dimensions": json.dumps(dimensions, ensure_ascii=False),
                            "period": _period(year),
                            "entity": entity,
                            "indicator": record["line"]
                            if re.search(r"indicador|producto", record["line"], re.I)
                            else None,
                            "description": record["line"],
                            "strong": record["strong"],
                            "verb": record["verb"],
                            "meta": record["meta"],
                            "executed": record["meta"] if record["percent"] is not None else None,
                            "percent": record["percent"],
                            "line": record["line_no"],
                            "origin": json.dumps(
                                {
                                    "archivo_pdf_sha256": digest,
                                    "drive_ids": row["all_drive_ids"],
                                    "fila_pdf": record["line_no"],
                                    "contenido_textual": record["line"],
                                    "porcentaje_detectado": record["percent"],
                                    "extraccion": "pdftotext -layout",
                                },
                                ensure_ascii=False,
                            ),
                        },
                    )
                inserted_files += 1
                inserted_records += len(record_rows)
            await connection.execute(
                text("""
                    UPDATE seguimiento.lotes_ingesta_planes SET
                        total_archivos=:total, archivos_exitosos=:success,
                        archivos_con_error=0,total_registros_normalizados=:records,
                        resumen_motores=CAST(:summary AS jsonb)
                    WHERE id=:lot
                """),
                {
                    "total": len(rows),
                    "success": inserted_files + skipped_files,
                    "records": sum(record_counts.values()),
                    "lot": lot_id,
                    "summary": json.dumps(
                        {
                            "PLAN_ACCION": record_counts["PLAN_ACCION"],
                            "PLAN_DESARROLLO": record_counts["PLAN_DESARROLLO"],
                            "PDF_catalog_entries": 78,
                            "PDF_unique_sha256": len(rows),
                            "PDF_skipped_existing": skipped_files,
                        }
                    ),
                },
            )
    finally:
        await engine.dispose()
    return {
        "catalog_entries": 78,
        "unique_sha256": len(rows),
        "files_inserted": inserted_files,
        "files_already_present": skipped_files,
        "records_inserted": inserted_records,
        "unresolved_entities": [item["row"]["name"] for item in extracted if not item["entity"]],
        "empty_text_pdfs": [item["row"]["name"] for item in extracted if not item["text"].strip()],
        "cache_dir": str(PDF_CACHE),
        "lote": lot_code,
    }


def main() -> None:
    print(json.dumps(asyncio.run(ingest()), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
