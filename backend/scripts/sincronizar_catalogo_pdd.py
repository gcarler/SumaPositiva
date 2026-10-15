"""Extract and idempotently synchronize official PDD/PDL Markdown catalogs."""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import delete, insert
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402
from app.modules.compromisos.models import PddLineaPrograma, PddMetaOficial, PlanDesarrolloDistrital  # noqa: E402

DATA = ROOT / "data" / "planes_desarrollo"

PLANS: list[dict[str, Any]] = [
    {
        "codigo_plan": "PDD_2012_2015",
        "periodo": "2012–2015",
        "nombre_oficial": "En Cartagena Hay Campo para Todos",
        "norma_adopcion": "Acuerdo Distrital 001/012 de 2012",
        "tipo_plan": "PDD",
        "ppi_anual_cop": {},
        "fuentes": ["pdd_2012_2015_campo_para_todos_cdim.md"],
        "metadatos": {"ppi_estado": "NO_EXTRAIDO"},
    },
    {
        "codigo_plan": "PDD_2013_2015",
        "periodo": "2013–2015",
        "nombre_oficial": "Ahora Sí Cartagena",
        "norma_adopcion": "Acuerdo Distrital 016 de 2013",
        "tipo_plan": "PDD",
        "ppi_total_corriente_cop": 1_874_167_605_000,
        "ppi_anual_cop": {"2014": 919_970_330_000, "2015": 954_197_275_000},
        "fuentes": ["pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md"],
        "metadatos": {
            "unidad_fuente": "miles de COP; convertido a COP",
            "nota": (
                "El plan maestro reporta importes anuales redondeados; el total oficial prevalece."
            ),
        },
    },
    {
        "codigo_plan": "PDD_2016_2019",
        "periodo": "2016–2019",
        "nombre_oficial": "Primero la Gente para una Cartagena Sostenible y Competitiva",
        "norma_adopcion": "Acuerdo Distrital 006 de 2016",
        "tipo_plan": "PDD",
        "ppi_anual_cop": {},
        "fuentes": ["pdd_2016_2019_acuerdo_006_primero_la_gente.pdf"],
        "metadatos": {"ppi_estado": "PDF_ESCANEADO_SIN_OCR"},
    },
    {
        "codigo_plan": "PDD_2020_2023",
        "periodo": "2020–2023",
        "nombre_oficial": "Salvemos Juntos a Cartagena",
        "norma_adopcion": "Acuerdo Distrital 016 de 2020",
        "tipo_plan": "PDD",
        "ppi_total_corriente_cop": 6_022_982_660_000,
        "ppi_anual_cop": {
            "2020": 1_437_205_700_000,
            "2021": 1_473_130_500_000,
            "2022": 1_528_216_600_000,
            "2023": 1_584_429_700_000,
        },
        "fuentes": ["pdd_2020_2023_salvemos_juntos_cartagena.md"],
        "metadatos": {"base_precios": "COP constantes diciembre 2019"},
    },
    {
        "codigo_plan": "PDD_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Cartagena, Ciudad de Derechos",
        "norma_adopcion": "Acuerdo Distrital 139 de 2024",
        "tipo_plan": "PDD",
        "ppi_total_corriente_cop": 12_800_853_474_855,
        "ppi_anual_cop": {
            "2024": 3_270_509_322_394,
            "2025": 2_953_975_540_173,
            "2026": 3_194_140_433_906,
            "2027": 3_382_228_178_382,
        },
        "fuentes": [
            "pdd_2024_2027_bases_tecnicas.md",
            "pdd_2024_2027_ponencia_2do_debate_pa013.md",
        ],
        "metadatos": {"lineas_estrategicas": 6, "impulsores_avance": 42, "programas": 172},
    },
    {
        "codigo_plan": "PDL_1_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Localidad Histórica y del Caribe Norte",
        "norma_adopcion": "Acuerdo Local 004 de 2024",
        "tipo_plan": "PDL",
        "localidad": "Localidad 1",
        "ppi_total_corriente_cop": 97_691_041_529,
        "ppi_anual_cop": {
            "2024": 22_390_236_924,
            "2025": 23_851_707_764,
            "2026": 25_125_173_348,
            "2027": 26_323_923_493,
        },
        "fuentes": ["pdl_2024_2027_localidad_1_historica.md"],
        "metadatos": {},
    },
    {
        "codigo_plan": "PDL_2_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Localidad de la Virgen y Turística",
        "norma_adopcion": "Acuerdo Local 004 de 2024",
        "tipo_plan": "PDL",
        "localidad": "Localidad 2",
        "ppi_total_corriente_cop": 161_289_996_409.01,
        "ppi_anual_cop": {
            "2024": 36_958_466_088.34,
            "2025": 39_325_286_256.64,
            "2026": 41_355_128_312.56,
            "2027": 43_651_115_751.48,
        },
        "fuentes": ["pdl_2024_2027_localidad_2_virgen_turistica.md"],
        "metadatos": {},
    },
    {
        "codigo_plan": "PDL_3_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Localidad Industrial y de la Bahía",
        "norma_adopcion": "Acuerdo Local 004 de 2024",
        "tipo_plan": "PDL",
        "localidad": "Localidad 3",
        "ppi_total_corriente_cop": 46_000_000_000,
        "ppi_anual_cop": {
            "2024": 7_000_000_000,
            "2025": 10_000_000_000,
            "2026": 13_000_000_000,
            "2027": 16_000_000_000,
        },
        "fuentes": ["pdl_2024_2027_localidad_3_industrial_bahia.md"],
        "metadatos": {"ppi_inversion_directa_cop": 39_000_000_000},
    },
]

FILE_PLAN = {
    "pdd_2012_2015_campo_para_todos_cdim.md": "PDD_2012_2015",
    "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md": "PDD_2013_2015",
    "pdd_2020_2023_salvemos_juntos_cartagena.md": "PDD_2020_2023",
    "pdd_2024_2027_bases_tecnicas.md": "PDD_2024_2027",
    "pdd_2024_2027_ponencia_2do_debate_pa013.md": "PDD_2024_2027",
    "pdl_2024_2027_localidad_1_historica.md": "PDL_1_2024_2027",
    "pdl_2024_2027_localidad_2_virgen_turistica.md": "PDL_2_2024_2027",
    "pdl_2024_2027_localidad_3_industrial_bahia.md": "PDL_3_2024_2027",
}


def _heading_rows(source: Path, plan_code: str) -> list[dict[str, Any]]:
    result = []
    parent_by_level: dict[int, tuple[uuid.UUID, str]] = {}
    order = 0
    for raw in source.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", raw.strip())
        if not match:
            continue
        title = re.sub(r"[*`]+", "", match.group(2)).strip()
        if len(title) < 4 or title.startswith(("Tabla de contenido", "Contenido")):
            continue
        number = re.match(r"^(\d+(?:\.\d+){0,4})[.)]?\s+(.+)$", title)
        code, name = (number.group(1), number.group(2)) if number else (None, title)
        level = len(match.group(1))
        upper = name.upper()
        is_program = bool(re.search(r"(?<![A-Z])PROGRAMA\s*:", upper)) or bool(
            re.match(r"^PROGRAMA\s+", upper)
        )
        is_driver = "COMPONENTE IMPULSOR DE AVANCE" in upper
        is_line = bool(re.search(r"\bL[IÍ]NEA ESTRAT[EÉ]GICA\b", upper))
        is_numbered_driver = bool(
            code
            and code.count(".") == 1
            and code.split(".", 1)[0] in {"4", "5", "6", "7", "8", "9"}
        )
        if plan_code == "PDD_2024_2027":
            relevant = is_program or is_driver or is_line or is_numbered_driver
            if not relevant:
                continue
        elif plan_code == "PDD_2020_2023":
            if not (
                is_program or is_line or "PILAR CARTAGENA" in upper or "EJE TRANSVERSAL" in upper
            ):
                continue
        elif plan_code.startswith("PDL_"):
            if not (is_program or is_line or "COMPONENTE" in upper):
                continue
        elif (
            plan_code == "PDD_2013_2015" and not is_program and "OBJETIVO ESTRATÉGICO" not in upper
        ):
            continue
        elif plan_code == "PDD_2012_2015" and not (is_program or is_line or "OBJETIVO" in upper):
            continue
        if is_program:
            kind = "PROGRAMA"
        elif is_driver or (plan_code == "PDD_2024_2027" and is_numbered_driver):
            kind = "IMPULSOR"
        elif "META" in upper or "INDICADOR" in upper:
            continue
        elif is_line:
            kind = "LINEA"
        elif plan_code == "PDD_2020_2023" and any(x in upper for x in ("PILAR", "EJE TRANSVERSAL")):
            kind = "PILAR"
        elif plan_code == "PDD_2013_2015" and "OBJETIVO" in upper:
            kind = "OBJETIVO"
        elif code and code.count(".") == 0:
            kind = "LINEA"
        elif plan_code == "PDD_2016_2019":
            kind = "LINEA"
        else:
            kind = "COMPONENTE"
        parent = next(
            (parent_by_level[k] for k in sorted(parent_by_level, reverse=True) if k < level), None
        )
        row_id = uuid.uuid4()
        order += 1
        result.append(
            {
                "id": row_id,
                "codigo_plan": plan_code,
                "parent_id": parent[0] if parent else None,
                "nivel": kind,
                "codigo": code,
                "nombre": name,
                "orden": order,
                "fuente": source.name,
                "metadatos": {
                    "nivel_markdown": level,
                    "encabezado_original": title,
                    "parent_heading": parent[1] if parent else None,
                },
            }
        )
        parent_by_level[level] = (row_id, title)
        for previous in [k for k in parent_by_level if k > level]:
            del parent_by_level[previous]
    return result


def _table_rows(source: Path, plan_code: str) -> list[dict[str, Any]]:
    result = []
    headers: list[str] = []
    for line_no, raw in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.lstrip().startswith("|"):
            headers = []
            continue
        cells = [cell.strip().replace("`", "") for cell in raw.strip().strip("|").split("|")]
        if not cells or all(re.fullmatch(r"[-: ]+", cell or "-") for cell in cells):
            continue
        if not headers:
            headers = cells
            continue
        if len(cells) < 2:
            continue
        header_text = " ".join(headers).casefold()
        if not any(
            token in header_text
            for token in ("meta", "indicador", "línea base", "linea base", "resultado", "producto")
        ):
            continue
        data = {
            headers[i] if i < len(headers) else f"columna_{i + 1}": cell
            for i, cell in enumerate(cells)
        }
        nonempty = [value for value in cells if value and value not in {"-", "—"}]
        if len(nonempty) < 2:
            continue
        joined = header_text
        kind = (
            "BIENESTAR"
            if any(token in joined for token in ("bienestar", "resultado"))
            else "PRODUCTO"
        )
        unit = next((v for k, v in data.items() if "unidad" in k.casefold() and v), None)
        line_name = next(
            (
                v
                for k, v in data.items()
                if any(token in k.casefold() for token in ("línea", "linea", "pilar", "programa"))
                and v
            ),
            None,
        )
        result.append(
            {
                "codigo_plan": plan_code,
                "tipo_meta": kind,
                "codigo": next(
                    (
                        v
                        for k, v in data.items()
                        if "código" in k.casefold() or "codigo" in k.casefold()
                    ),
                    None,
                ),
                "nombre": next(
                    (
                        v
                        for k, v in data.items()
                        if any(t in k.casefold() for t in ("meta", "producto", "indicador")) and v
                    ),
                    nonempty[0],
                ),
                "indicador": next(
                    (v for k, v in data.items() if "indicador" in k.casefold() and v), None
                ),
                "unidad_medida": unit[:120] if unit else None,
                "linea_nombre": line_name,
                "fuente": source.name,
                "fila_fuente": line_no,
                "datos_oficiales": data,
            }
        )
    return result


def extract_catalog() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    from app.modules.compromisos.pdd_dea_service import _money_factor

    plans = []
    for original in PLANS:
        plan = original.copy()
        annual = plan.get("ppi_anual_cop", {})
        if "ppi_total_corriente_cop" not in plan and annual:
            plan["ppi_total_corriente_cop"] = sum(annual.values())
        plan["ppi_total_constante_2025_cop"] = (
            sum(amount * _money_factor(int(year)) for year, amount in annual.items())
            if annual
            else None
        )
        if plan["codigo_plan"] == "PDD_2020_2023":
            plan["ppi_total_constante_2025_cop"] = 6_022_982_660_000 * _money_factor(2019)
        plans.append(plan)
    lines, metas = [], []
    for filename, plan_code in FILE_PLAN.items():
        path = DATA / filename
        if path.exists():
            if "ponencia" not in filename:
                lines.extend(_heading_rows(path, plan_code))
            metas.extend(_table_rows(path, plan_code))
    bases = DATA / "pdd_2024_2027_bases_tecnicas.md"
    if bases.exists():
        # Retain source occurrences: the official PPI includes repeated codes for separately
        # funded components/programs, and their individual annual allocations must be traceable.
        rows_by_level: dict[str, list[dict[str, Any]]] = {"IMPULSOR": [], "PROGRAMA": []}
        pattern = re.compile(
            r"^\|\s*(\d+(?:\.\d+)+)\.?\s*(IMPULSOR DE AVANCE|PROGRAMA):?\s*([^|]+)"
            r"\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|",
            re.I,
        )
        for line_number, raw in enumerate(bases.read_text(encoding="utf-8").splitlines(), 1):
            match = pattern.match(raw.strip())
            if not match:
                continue
            code, label, name = match.group(1), match.group(2).upper(), match.group(3).strip()
            values = []
            for cell in match.groups()[3:]:
                raw_amount = cell.strip().replace("$", "").replace(" ", "")
                values.append(
                    float(raw_amount.replace(".", "").replace(",", "."))
                    if raw_amount not in {"-", "—", ""}
                    else 0.0
                )
            rows_by_level["PROGRAMA" if label == "PROGRAMA" else "IMPULSOR"].append(
                {
                    "id": uuid.uuid4(),
                    "codigo_plan": "PDD_2024_2027",
                    "parent_id": None,
                    "nivel": "PROGRAMA" if label == "PROGRAMA" else "IMPULSOR",
                    "codigo": code,
                    "nombre": name,
                    "orden": line_number,
                    "ppi_anual_cop": dict(
                        zip(("2024", "2025", "2026", "2027"), values, strict=True)
                    ),
                    "fuente": bases.name,
                    "metadatos": {"extraccion": "tabla_PPI_oficial", "fila_markdown": line_number},
                }
            )
        driver_id_by_code: dict[str, uuid.UUID] = {}
        for driver in rows_by_level["IMPULSOR"]:
            driver_id_by_code.setdefault(driver["codigo"], driver["id"])
        for program in rows_by_level["PROGRAMA"]:
            driver_code = ".".join(program["codigo"].split(".")[:2])
            program["parent_id"] = driver_id_by_code.get(driver_code)
        lines = [
            line
            for line in lines
            if not (
                line["codigo_plan"] == "PDD_2024_2027"
                and line["nivel"] in {"LINEA", "IMPULSOR", "PROGRAMA"}
            )
        ]
        lines.extend(rows_by_level["IMPULSOR"])
        lines.extend(rows_by_level["PROGRAMA"])
    legacy_lines = {
        "PDD_2016_2019": [
            "Por una Cartagena con Equidad en Salud",
            "Cartagena Sin Miedos",
            "Cartagena Ciudad para Invertir",
            "Finanzas Sanas y Robustas",
            "Educación para la Gente del Siglo XXI",
            "Cartagena Territorio de Paz",
            "Desarrollo Urbano para la Competitividad",
        ]
    }
    legacy_hierarchy = {
        "PDD_2013_2015": (
            "OBJETIVO",
            (
                "Inclusión Social",
                "Desarrollo Económico",
                "Desarrollo Territorial",
                "Gobernabilidad",
            ),
        ),
        "PDD_2020_2023": (
            "PILAR",
            (
                "Cartagena Resiliente",
                "Cartagena Incluyente",
                "Cartagena Contingente",
                "Cartagena Transparente",
            ),
        ),
    }
    lines = [
        row
        for row in lines
        if not (row["codigo_plan"] == "PDD_2020_2023" and row["nivel"] == "PILAR")
    ]
    present_hierarchy = {
        (row["codigo_plan"], row["nivel"], row["nombre"].casefold()) for row in lines
    }
    for plan_code, (level, names) in legacy_hierarchy.items():
        for order, name in enumerate(names, 1):
            if (plan_code, level, name.casefold()) not in present_hierarchy:
                lines.append(
                    {
                        "id": uuid.uuid4(),
                        "codigo_plan": plan_code,
                        "parent_id": None,
                        "nivel": level,
                        "codigo": str(order),
                        "nombre": name,
                        "orden": order,
                        "fuente": "estructura oficial citada por el plan maestro",
                        "metadatos": {"estado": "NORMALIZACION_ESTRUCTURAL"},
                    }
                )
    from app.modules.compromisos.pdd_dea_service import PddDeaService

    for index, entry in enumerate(PddDeaService._ppi_2024_lines(), 1):
        lines.append(
            {
                "codigo_plan": "PDD_2024_2027",
                "parent_id": None,
                "nivel": "LINEA",
                "codigo": str(index),
                "nombre": entry["linea"],
                "orden": index,
                "ppi_anual_cop": entry["vigencias_cop"],
                "fuente": "pdd_2024_2027_bases_tecnicas.md",
                "metadatos": {"ppi_total_cuatrienio_cop": entry["total_cuatrienio_cop"]},
            }
        )
    present = {(row["codigo_plan"], row["nombre"].casefold()) for row in lines}
    for plan_code, names in legacy_lines.items():
        for order, name in enumerate(names, 1):
            if (plan_code, name.casefold()) not in present:
                lines.append(
                    {
                        "id": uuid.uuid4(),
                        "codigo_plan": plan_code,
                        "parent_id": None,
                        "nivel": "LINEA",
                        "codigo": str(order),
                        "nombre": name,
                        "orden": order,
                        "fuente": "bd_csh/catálogo documentado",
                        "metadatos": {"estado": "EXTRACCION_DOCUMENTAL_SECUNDARIA"},
                    }
                )
    for plan in plans:
        plan.setdefault("ppi_total_corriente_cop", None)
        plan.setdefault("ppi_total_constante_2025_cop", None)
        plan.setdefault("localidad", None)
        plan.setdefault("norma_adopcion", None)
        plan.setdefault("ppi_anual_cop", {})
        plan.setdefault("fuentes", [])
        plan.setdefault("metadatos", {})
    for row in lines:
        row.setdefault("id", uuid.uuid4())
        row.setdefault("parent_id", None)
        row.setdefault("codigo", None)
        row.setdefault("orden", 0)
        row.setdefault("ppi_anual_cop", {})
        row.setdefault("fuente", None)
        row.setdefault("metadatos", {})
    valid_line_ids = {row["id"] for row in lines}
    for row in lines:
        if row.get("parent_id") not in valid_line_ids:
            row["parent_id"] = None
    line_ids = {
        (row["codigo_plan"], re.sub(r"\s+", " ", row["nombre"]).casefold()): row["id"]
        for row in lines
        if row.get("nivel") in {"LINEA", "PILAR", "OBJETIVO", "IMPULSOR", "COMPONENTE"}
    }
    for meta in metas:
        name = re.sub(r"\s+", " ", str(meta.get("linea_nombre") or "")).casefold()
        meta["linea_id"] = line_ids.get((meta["codigo_plan"], name))
    return plans, lines, metas


async def synchronize(dry_run: bool = False) -> dict[str, int]:
    plans, lines, metas = extract_catalog()
    if dry_run:
        return {"planes": len(plans), "lineas_programas": len(lines), "metas_oficiales": len(metas)}
    engine = create_async_engine(Settings().async_database_url)
    async with engine.begin() as conn:
        await conn.execute(delete(PddMetaOficial))
        await conn.execute(delete(PddLineaPrograma))
        await conn.execute(delete(PlanDesarrolloDistrital))
        await conn.execute(insert(PlanDesarrolloDistrital), plans)
        if lines:
            await conn.execute(insert(PddLineaPrograma), lines)
        if metas:
            await conn.execute(insert(PddMetaOficial), metas)
    await engine.dispose()
    return {"planes": len(plans), "lineas_programas": len(lines), "metas_oficiales": len(metas)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Extraer y contar sin escribir en la BD"
    )
    args = parser.parse_args()
    print(asyncio.run(synchronize(args.dry_run)))


if __name__ == "__main__":
    main()
