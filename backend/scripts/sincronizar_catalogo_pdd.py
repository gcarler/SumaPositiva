"""Extract and idempotently synchronize official PDD/PDL Markdown catalogs."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import unicodedata
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import delete, insert, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402
from app.modules.compromisos.models import (  # noqa: E402
    PddLineaPrograma,
    PddMetaOficial,
    PlanDesarrolloDistrital,
)

DATA = ROOT / "data" / "planes_desarrollo"

PLANS: list[dict[str, Any]] = [
    {
        "codigo_plan": "PDD_2012_2015",
        "periodo": "2012–2015",
        "nombre_oficial": "En Cartagena Hay Campo para Todos",
        "norma_adopcion": "Acuerdo Distrital 001/012 de 2012",
        "tipo_plan": "PDD",
        "ppi_total_corriente_cop": 3_049_788_268_000,
        "ppi_anual_cop": {
            "2012": 718_910_382_000,
            "2013": 712_219_309_000,
            "2014": 787_872_147_000,
            "2015": 830_786_430_000,
        },
        "fuentes": ["pdd_2012_2015_acuerdo_001_campo_para_todos.md"],
        "metadatos": {"ppi_estado": "OFICIAL_EXTRAIDO", "base_precios": "COP corrientes"},
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
        "ppi_total_corriente_cop": 4_331_941_000_000,
        "ppi_anual_cop": {
            "2016": 976_114_000_000,
            "2017": 1_033_268_000_000,
            "2018": 1_115_477_000_000,
            "2019": 1_207_081_000_000,
        },
        "fuentes": ["pdd_2016_2019_acuerdo_006_primero_la_gente.md"],
        "metadatos": {"ppi_estado": "OFICIAL_EXTRAIDO", "base_precios": "COP corrientes"},
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
    "pdd_2012_2015_acuerdo_001_campo_para_todos.md": "PDD_2012_2015",
    "pdd_2016_2019_acuerdo_006_primero_la_gente.md": "PDD_2016_2019",
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
    # PPI and official strategic structure transcribed from the OCR source pages.
    extracted_structures = {
        "PDD_2012_2015": (
            "EJE",
            [
                (
                    "Eje 1. Transversal: Atención a Grupos de Población Diferenciada "
                    "y por Ciclo Vital",
                    196_661_713_000,
                ),
                ("Eje 2. Desarrollo Humano", 2_068_532_775_000),
                ("Eje 3. Desarrollo Económico Incluyente", 179_995_114_000),
                ("Eje 4. Hábitat, Infraestructura y Sustentabilidad", 434_185_669_000),
                ("Eje 5. Seguridad Ciudadana y Buen Gobierno", 170_412_997_000),
            ],
            {
                "2012": 718_910_382_000,
                "2013": 712_219_309_000,
                "2014": 787_872_147_000,
                "2015": 830_786_430_000,
            },
        ),
        "PDD_2016_2019": (
            "OBJETIVO",
            [
                ("1. Superar la Desigualdad", 3_183_163_000_000),
                ("2. Adaptar el Territorio para la Gente", 852_631_000_000),
                ("3. Construir Ciudadanía y Fortalecimiento Institucional", 296_147_000_000),
            ],
            {
                "2016": 976_114_000_000,
                "2017": 1_033_268_000_000,
                "2018": 1_115_477_000_000,
                "2019": 1_207_081_000_000,
            },
        ),
    }
    for plan_code, (level, entries, _annual) in extracted_structures.items():
        existing = {(r["codigo_plan"], r["nombre"].casefold()) for r in lines}
        for order, (name, total) in enumerate(entries, 1):
            if (plan_code, name.casefold()) in existing:
                continue
            lines.append(
                {
                    "id": uuid.uuid4(),
                    "codigo_plan": plan_code,
                    "parent_id": None,
                    "nivel": level,
                    "codigo": str(order),
                    "nombre": name,
                    "orden": order,
                    "ppi_anual_cop": {},
                    "fuente": next(p["fuentes"][0] for p in PLANS if p["codigo_plan"] == plan_code),
                    "metadatos": {"ppi_total_cop": total, "extraccion": "OCR_ACUERDO_OFICIAL"},
                }
            )
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
            "1. Educación para la Gente del Siglo XXI",
            "2. Por una Cartagena con Equidad en Salud",
            "3. Cartagena Ciudad para Invertir",
            "4. Primero la Gente (Inclusión, Cultura y Deporte)",
            "5. Gestión del Riesgo y Medio Ambiente",
            "6. Desarrollo Urbano, Movilidad y Vivienda",
            "7. Cartagena Sin Miedos y Territorio de Paz",
            "8. Gestión Pública Transparente y Finanzas Sanas",
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
        plan["metadatos"] = {**plan["metadatos"], "ppi_estado": "OFICIAL_EXTRAIDO"}
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


def _norm(value: Any) -> str:
    value = (
        unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()
    )
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


_STOPWORDS = {
    "para",
    "como",
    "entre",
    "desde",
    "hasta",
    "sobre",
    "meta",
    "metas",
    "indicador",
    "indicadores",
    "porcentaje",
    "numero",
    "total",
    "anual",
    "municipio",
    "distrito",
    "cartagena",
    "de",
    "la",
    "el",
    "los",
    "las",
    "del",
    "y",
    "en",
    "con",
    "una",
    "un",
}


def _tokens(value: Any) -> set[str]:
    return {word for word in _norm(value).split() if len(word) >= 4 and word not in _STOPWORDS}


_PERIOD = {
    "PDD_2012_2015": (2012, 2015),
    "PDD_2013_2015": (2013, 2015),
    "PDD_2016_2019": (2016, 2019),
    "PDD_2020_2023": (2020, 2023),
    "PDD_2024_2027": (2024, 2027),
    "PDL_1_2024_2027": (2024, 2027),
    "PDL_2_2024_2027": (2024, 2027),
    "PDL_3_2024_2027": (2024, 2027),
}


async def _link_official_metas(conn: Any) -> dict[str, int]:
    """Persist deterministic exact-code, entity/indicator, or semantic-line links."""
    metas = (
        (
            await conn.execute(
                text("""SELECT id::text, codigo_plan, codigo, nombre, indicador,
        linea_nombre, datos_oficiales FROM seguimiento.pdd_metas_oficiales""")
            )
        )
        .mappings()
        .all()
    )
    records = (
        (
            await conn.execute(
                text("""SELECT id::text, vigencia, entidad_normalizada, codigo_meta_pdd,
        codigo_bpim, indicador, descripcion_actividad, linea_estrategica
        FROM seguimiento.registros_triada_normalizados
        WHERE motor_destino='PLAN_DESARROLLO' AND vigencia BETWEEN 2012 AND 2027
        ORDER BY vigencia, id""")
            )
        )
        .mappings()
        .all()
    )
    by_code: dict[tuple[str, str], list[Any]] = {}
    by_year_tokens: dict[int, dict[str, list[Any]]] = {}
    by_year_entities: dict[int, dict[str, list[Any]]] = {}
    prepared: dict[str, tuple[set[str], set[str], str]] = {}
    for record in records:
        year = record["vigencia"]
        if year is None:
            continue
        record_tokens = _tokens(
            f"{record['indicador'] or ''} {record['descripcion_actividad'] or ''}"
        )
        line_tokens = _tokens(record["linea_estrategica"])
        record_entity = _norm(record["entidad_normalizada"])
        prepared[record["id"]] = (record_tokens, line_tokens, record_entity)
        by_year_tokens.setdefault(year, {})
        by_year_entities.setdefault(year, {}).setdefault(record_entity, []).append(record)
        for token in record_tokens | line_tokens:
            by_year_tokens[year].setdefault(token, []).append(record)
        for raw_code in (record["codigo_meta_pdd"], record["codigo_bpim"]):
            code = _norm(raw_code)
            if code:
                by_code.setdefault((str(year), code), []).append(record)
    counts = {"CODIGO_EXACTO": 0, "INDICADOR_ENTIDAD": 0, "SEMANTICO_PROGRAMA": 0, "SIN_VINCULO": 0}
    updates = []
    for meta in metas:
        plan = meta["codigo_plan"]
        start, end = _PERIOD[plan]
        years = range(start, end + 1)
        code = _norm(meta["codigo"])
        exact = (
            [row for year in years for row in by_code.get((str(year), code), ())] if code else []
        )
        chosen = exact[0] if exact else None
        method = "CODIGO_EXACTO" if chosen else None
        meta_tokens = _tokens(f"{meta['indicador'] or ''} {meta['nombre'] or ''}")
        official = meta["datos_oficiales"] or {}
        entity_hint = _norm(
            " ".join(
                str(value)
                for key, value in official.items()
                if any(
                    token in _norm(key)
                    for token in ("entidad", "dependencia", "secretaria", "responsab")
                )
                and isinstance(value, str)
            )
        )
        if chosen is None:
            best_rank: tuple[int, int, str] = (0, 0, "")
            best_candidate = None
            line_tokens = _tokens(meta["linea_nombre"])
            candidates: dict[str, Any] = {}
            for token in meta_tokens | line_tokens:
                for year in years:
                    for record in by_year_tokens.get(year, {}).get(token, ()):
                        candidates[record["id"]] = record
            if entity_hint:
                for year in years:
                    for entity, entity_records in by_year_entities.get(year, {}).items():
                        if entity and (
                            entity == entity_hint or entity in entity_hint or entity_hint in entity
                        ):
                            for record in entity_records:
                                candidates[record["id"]] = record
            for record in candidates.values():
                record_tokens, record_line_tokens, record_entity = prepared[record["id"]]
                entity_match = bool(
                    entity_hint
                    and (
                        record_entity == entity_hint
                        or record_entity in entity_hint
                        or entity_hint in record_entity
                    )
                )
                shared = len(meta_tokens & record_tokens)
                line_shared = len(line_tokens & record_line_tokens)
                score = (3 if entity_match else 0) + shared + (line_shared if shared == 0 else 0)
                if entity_match and shared >= 2:
                    candidate_method = "INDICADOR_ENTIDAD" if entity_match else "SEMANTICO_PROGRAMA"
                elif shared >= 2:
                    candidate_method = "SEMANTICO_PROGRAMA"
                elif line_shared >= 2:
                    candidate_method = "SEMANTICO_PROGRAMA"
                else:
                    continue
                rank = (score, shared, record["id"])
                if rank > best_rank:
                    best_rank, best_candidate = rank, (record, candidate_method)
            if best_candidate:
                chosen, method = best_candidate
        if chosen:
            counts[method] += 1
            link = {"registro_triada_id": chosen["id"], "metodo_emparejamiento": method}
        else:
            counts["SIN_VINCULO"] += 1
            link = {"registro_triada_id": None, "metodo_emparejamiento": "SIN_VINCULO"}
        payload = dict(official)
        payload["_vinculo_triada"] = link
        updates.append({"id": meta["id"], "datos": json.dumps(payload)})
    if updates:
        await conn.execute(
            text("""UPDATE seguimiento.pdd_metas_oficiales m
            SET datos_oficiales = u.datos::jsonb
            FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS u(id text, datos text)
            WHERE m.id::text=u.id"""),
            {"rows": json.dumps(updates)},
        )
    return counts


async def synchronize(dry_run: bool = False) -> dict[str, int]:
    plans, lines, metas = extract_catalog()
    if dry_run:
        return {"planes": len(plans), "lineas_programas": len(lines), "metas_oficiales": len(metas)}
    engine = create_async_engine(Settings().async_database_url)
    link_counts: dict[str, int] = {}
    async with engine.begin() as conn:
        await conn.execute(delete(PddMetaOficial))
        await conn.execute(delete(PddLineaPrograma))
        await conn.execute(delete(PlanDesarrolloDistrital))
        await conn.execute(insert(PlanDesarrolloDistrital), plans)
        if lines:
            await conn.execute(insert(PddLineaPrograma), lines)
        if metas:
            await conn.execute(insert(PddMetaOficial), metas)
        link_counts = await _link_official_metas(conn)
    await engine.dispose()
    cache_count = await warm_pdd_cache()
    return {
        "planes": len(plans),
        "lineas_programas": len(lines),
        "metas_oficiales": len(metas),
        **{f"vinculos_{k.lower()}": v for k, v in link_counts.items()},
        "cache_payloads": cache_count,
    }


async def warm_pdd_cache() -> int:
    from app.modules.compromisos import pdd_dea_service as module
    from app.modules.compromisos.pdd_dea_service import PddDeaService

    module._RESULT.clear()
    module._STATE.clear()
    module._DISK_CACHE = {}
    engine = create_async_engine(Settings().async_database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with factory() as session:
            service = PddDeaService(session)
            await service.catalogo_y_conciliacion_ppi()
            await service.cumplimiento_metas()
            await service.frontera_dea_pdd()
            await service.econometria_comparada_pdd()
            await service.explorador_programas_y_seguridad_humana()
            await service.resumen_ejecutivo()
        return len(module._DISK_CACHE or {})
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Extraer y contar sin escribir en la BD"
    )
    args = parser.parse_args()
    print(asyncio.run(synchronize(args.dry_run)))


if __name__ == "__main__":
    main()
