"""Extract and idempotently synchronize official PDD/PDL Markdown catalogs."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import unicodedata
import uuid
from collections import defaultdict
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
        if re.fullmatch(r"SUB\s*PROGRAMA\s*: ?", title, re.I):
            continue
        number = re.match(r"^(\d+(?:\.\d+){0,4})[.)]?\s+(.+)$", title)
        code, name = (number.group(1), number.group(2)) if number else (None, title)
        if code is None:
            program_code = re.match(
                r"^(?:PROGRAMA|SUBPROGRAMA)\s+(\d+(?:[.,]\d+){1,5})\.?\s+(.+)$",
                title,
                re.I,
            )
            if program_code:
                code = program_code.group(1).replace(",", ".").rstrip(".")
                name = f"{title.split(maxsplit=1)[0]} {program_code.group(2)}"
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


def _quantified_ocr_metas(source: Path, plan_code: str) -> list[dict[str, Any]]:
    """Extract attributable quantified goal statements from OCR prose.

    This deliberately keeps the verbatim OCR evidence and abstains from promoting
    headings, budget rows, years, or bare percentages to goals.
    """
    lines = source.read_text(encoding="utf-8").splitlines()
    heading = ""
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    target = re.compile(
        r"\b(?:aumentar|disminuir|reducir|incrementar|alcanzar|atender|beneficiar|"
        r"crear|construir|garantizar|ampliar|mantener|ejecutar|formular|implementar|"
        r"entregar|lograr|reparar|prevenir|proteger|fortalecer|cubrir|vacunar|"
        r"restituir|asistir|capacitar|mejorar|disminuir|proteger)\b",
        re.I,
    )
    numeric = re.compile(
        r"\d+(?:[.,]\d+)?\s*(?:%|%?\s*(?:puntos|personas|familias|ni[nñ]os|"
        r"mujeres|v[ií]ctimas|zonas|viviendas|km\b|sedes|instituciones|"
        r"establecimientos|casos|cupos|beneficiarios|unidades|millones|mil))"
        r"|\b\d+\s*(?:%|por ciento|porciento)\b",
        re.I,
    )
    for index, raw in enumerate(lines):
        clean = re.sub(r"\s+", " ", raw).strip(" |\t-–—")
        if re.search(r"\b(?:EJE|OBJETIVO)\s*(?:ESTRAT[EÉ]GICO\s*)?\d+\b", clean, re.I):
            heading = clean[:240]
        # Historic scans often split the verb, indicator and target into separate OCR
        # lines. Preserve a quantified row as a low-confidence candidate when it has
        # real numeric measure text; page evidence keeps the surrounding table intact.
        if len(clean) < 18 or not numeric.search(clean):
            continue
        if not target.search(clean) and len(re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", clean)) < 10:
            continue
        quote = clean
        for following in lines[index + 1 : index + 3]:
            continuation = re.sub(r"\s+", " ", following).strip(" |\t-–—")
            if not continuation or re.search(r"^(?:#{1,6}|P[aá]gina\s+\d+)", continuation):
                break
            if re.search(
                r"\b(?:ART[IÍ]CULO|ACUERDO\s+NO\.?|VIGENCIA\s+20\d\d)\b", continuation, re.I
            ):
                break
            quote = f"{quote} {continuation}"
        quote = quote[:700]
        signature = re.sub(r"\W+", " ", quote.casefold()).strip()
        if signature in seen:
            continue
        seen.add(signature)
        result.append(
            {
                "codigo_plan": plan_code,
                "tipo_meta": "RESULTADO"
                if "%" in quote or "puntos" in quote.casefold()
                else "PRODUCTO"
                if target.search(quote)
                else "OCR_CANDIDATA",
                "codigo": None,
                "nombre": quote,
                "indicador": quote,
                "unidad_medida": "%" if "%" in quote else "unidad reportada en el OCR",
                "linea_nombre": heading or None,
                "fuente": source.name,
                "fila_fuente": index + 1,
                "datos_oficiales": {
                    "evidencia_ocr_literal": quote,
                    "encabezado_contexto": heading or None,
                    "extraccion": "OCR_CUANTITATIVO_REGLAS_V2",
                    "revision_humana_pendiente": True,
                    "estado_extraccion": "CANDIDATO_OCR_CUANTIFICADO"
                    if target.search(quote)
                    else "CANDIDATO_OCR_NUMERICO_REVISION_HUMANA",
                    "pagina_origen": int(re.search(r"PAGINA\s+(\d+)", clean, re.I).group(1))
                    if re.search(r"PAGINA\s+(\d+)", clean, re.I)
                    else None,
                },
            }
        )
    return result


def _legacy_program_rows(source: Path, plan_code: str) -> list[dict[str, Any]]:
    """Recover explicit program/subprogram labels from OCR and numbered indexes."""
    if plan_code not in {"PDD_2012_2015", "PDD_2013_2015", "PDD_2016_2019"}:
        return []
    result: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    page = 1
    order = 0
    current_axis: str | None = None
    current_program: uuid.UUID | None = None
    in_subprograms = False
    lines = source.read_text(encoding="utf-8", errors="replace").splitlines()
    toc_pattern = re.compile(
        r"^\s*([0-9OIl.,]{1,18})\s+(OBJETIVO\s+ESTRAT[EÉ]GICO|L[IÍ]NEA\s+ESTRAT[EÉ]GICA|ESTRATEGIA|PROGRAMA|SUBPROGRAMA)\s+(.+?)\s*(?:[-—–]\s*)?(\d{1,3})?\s*$",
        re.I,
    )
    for raw in lines:
        page_match = re.search(r"PAGINA\s+(\d+)", raw, re.I)
        if page_match:
            page = int(page_match.group(1))
        axis_match = re.search(r"\bEJE\s+(\d)\b", raw, re.I)
        if plan_code == "PDD_2012_2015" and axis_match:
            current_axis = axis_match.group(1)
        clean = re.sub(r"\s+", " ", raw).strip(" #|\t-–—")
        if len(clean) < 8:
            continue
        if plan_code == "PDD_2013_2015":
            if re.match(r"^ESTRATEGIA\s+", clean, re.I):
                in_subprograms = False
                current_program = None
                strategy_match = re.match(
                    r"^ESTRATEGIA\s+(\d+(?:[.,]\d+){0,4})\.?\s*(.*?)\s*"
                    r"(?:Desde|Se |En |Busca|Con el|Para )",
                    clean,
                    re.I,
                )
                if strategy_match:
                    name = strategy_match.group(2).strip(" .:-")
                    code = strategy_match.group(1).replace(",", ".")
                    key = ("ESTRATEGIA", re.sub(r"\W+", " ", name.casefold()).strip())
                    if len(key[1]) > 4 and key not in seen:
                        seen.add(key)
                        order += 1
                        result.append(
                            {
                                "id": uuid.uuid4(),
                                "codigo_plan": plan_code,
                                "parent_id": None,
                                "nivel": "ESTRATEGIA",
                                "codigo": code,
                                "nombre": name[:500],
                                "orden": order,
                                "ppi_anual_cop": {},
                                "fuente": source.name,
                                "metadatos": {
                                    "extraccion": "ROTULO_ESTRATEGIA_2013",
                                    "pagina_indice": page,
                                },
                            }
                        )
                continue
            if re.match(r"^SUBPROGRAMAS?\s*:?.*$", clean, re.I):
                in_subprograms = True
                continue
            program_match = re.match(
                r"^PROGRAMA\s+(\d+(?:[.,]\d+){1,5})\.?\s+([^:]+?)(?:\.\s+|:\s*|$)",
                clean,
                re.I,
            )
            if program_match:
                in_subprograms = False
                current_program = None
                code = program_match.group(1).replace(",", ".")
                name = program_match.group(2).strip(" .:-")
                key = ("PROGRAMA", re.sub(r"\W+", " ", name.casefold()).strip())
                if len(key[1]) > 5 and key not in seen:
                    seen.add(key)
                    order += 1
                    row_id = uuid.uuid4()
                    result.append(
                        {
                            "id": row_id,
                            "codigo_plan": plan_code,
                            "parent_id": None,
                            "nivel": "PROGRAMA",
                            "codigo": code,
                            "nombre": name[:500],
                            "orden": order,
                            "ppi_anual_cop": {},
                            "fuente": source.name,
                            "metadatos": {
                                "extraccion": "ROTULO_PROGRAMA_2013",
                                "pagina_indice": page,
                            },
                        }
                    )
                    current_program = row_id
                continue
            if in_subprograms and current_program:
                subprogram_match = re.match(
                    r"^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,/().’'\-]{4,}):\s+\S",
                    clean,
                )
                if subprogram_match:
                    name = subprogram_match.group(1).strip(" .:-")
                    folded = re.sub(r"\W+", " ", name.casefold()).strip()
                    key = ("SUBPROGRAMA", folded)
                    if len(folded) > 5 and key not in seen:
                        seen.add(key)
                        order += 1
                        result.append(
                            {
                                "id": uuid.uuid4(),
                                "codigo_plan": plan_code,
                                "parent_id": current_program,
                                "nivel": "SUBPROGRAMA",
                                "codigo": None,
                                "nombre": name[:500],
                                "orden": order,
                                "ppi_anual_cop": {},
                                "fuente": source.name,
                                "metadatos": {
                                    "extraccion": "ROTULO_SUBPROGRAMA_2013",
                                    "pagina_indice": page,
                                },
                            }
                        )
            if not clean.startswith("#"):
                continue
        match = toc_pattern.match(clean)
        if match:
            code = re.sub(r"[OIl]", "1", match.group(1)).replace(",", ".").rstrip(".")
            label = match.group(2).upper()
            kind = (
                "SUBPROGRAMA"
                if label.startswith("SUB")
                else "ESTRATEGIA"
                if label.startswith("ESTRATEGIA")
                else "PROGRAMA"
                if label == "PROGRAMA"
                else "LINEA"
                if "LINEA" in label or "LÍNEA" in label
                else "OBJETIVO"
            )
            name = re.sub(r"\s+\d{1,3}$", "", match.group(3)).strip(" .:-")
        elif plan_code == "PDD_2012_2015" and re.match(r"^PROGRAMA\s+", clean, re.I):
            kind, code, name = "PROGRAMA", None, re.sub(r"^PROGRAMA\s+", "", clean, flags=re.I)
        else:
            continue
        name = re.sub(r"\s+", " ", name).strip()
        folded = re.sub(r"\W+", " ", name.casefold()).strip()
        if len(folded) < 8 or folded in {"programa", "subprograma", "programas", "subprogramas"}:
            continue
        key = (kind, folded)
        if key in seen:
            continue
        seen.add(key)
        order += 1
        result.append(
            {
                "id": uuid.uuid4(),
                "codigo_plan": plan_code,
                "parent_id": None,
                "nivel": kind,
                "codigo": code,
                "nombre": name[:500],
                "orden": order,
                "ppi_anual_cop": {},
                "fuente": source.name,
                "metadatos": {
                    "extraccion": "INDICE_OCR_OFICIAL" if code else "ROTULO_OCR_OFICIAL",
                    "pagina_indice": page,
                    "eje_contexto": current_axis if plan_code == "PDD_2012_2015" else None,
                    "revision_humana_pendiente": True,
                    "jerarquia_no_confirmada": True,
                },
            }
        )
    # Numbered PDD 2016 contents expose the official chain code. Reconnect the
    # recovered nodes to their nearest indexed parent when that parent exists.
    by_code = {str(row["codigo"]): row for row in result if row.get("codigo")}
    for row in result:
        code = str(row.get("codigo") or "")
        compact = re.sub(r"\D", "", code)
        parents = [
            candidate
            for candidate in result
            if candidate["id"] != row["id"]
            and candidate.get("codigo")
            and len(re.sub(r"\D", "", str(candidate["codigo"]))) < len(compact)
            and compact.startswith(re.sub(r"\D", "", str(candidate["codigo"])))
        ]
        if parents:
            parent = max(
                parents, key=lambda candidate: len(re.sub(r"\D", "", str(candidate["codigo"])))
            )
            row["parent_id"] = parent["id"]
        else:
            for cut in range(len(code.split(".")) - 1, 0, -1):
                parent = by_code.get(".".join(code.split(".")[:cut]))
                if parent and parent["id"] != row["id"]:
                    row["parent_id"] = parent["id"]
                    break
    return result


def _matrix_hierarchy_rows(source: Path, plan_code: str) -> list[dict[str, Any]]:
    """Normalize the explicit 2013 objective/strategy/program/subprogram matrix."""
    if plan_code != "PDD_2013_2015":
        return []
    result: list[dict[str, Any]] = []
    ids: dict[tuple[str, str], uuid.UUID] = {}
    carried = [""] * 5
    order = 0
    in_matrix = False
    for line_no, raw in enumerate(
        source.read_text(encoding="utf-8", errors="replace").splitlines(), 1
    ):
        if not raw.lstrip().startswith("|"):
            carried = [""] * 5
            in_matrix = False
            continue
        cells = [
            re.sub(r"\s+", " ", cell.replace("`", "")).strip()
            for cell in raw.strip().strip("|").split("|")
        ]
        if len(cells) < 4 or all(re.fullmatch(r"[-: ]*", cell) for cell in cells):
            continue
        normalized_header = " ".join(cells).casefold()
        if all(
            token in normalized_header
            for token in ("objetivo", "estrategia", "programa", "subprograma")
        ):
            in_matrix = True
            carried = [""] * 5
            continue
        if not in_matrix:
            continue
        while len(cells) < 5:
            cells.append("")
        for index in range(4):
            if cells[index]:
                carried[index] = cells[index]
            else:
                cells[index] = carried[index]
        names = [cells[0], cells[1], cells[2], cells[3]]
        names = [re.sub(r"\*+", "", name).strip() for name in names]
        levels = ("OBJETIVO", "ESTRATEGIA", "PROGRAMA", "SUBPROGRAMA")
        parent_id = None
        for _index, (level, name) in enumerate(zip(levels, names, strict=True)):
            folded = re.sub(r"\W+", " ", name.casefold()).strip()
            if len(folded) < 4:
                continue
            key = (level, folded)
            if key not in ids:
                order += 1
                row_id = uuid.uuid4()
                ids[key] = row_id
                result.append(
                    {
                        "id": row_id,
                        "codigo_plan": plan_code,
                        "parent_id": parent_id,
                        "nivel": level,
                        "codigo": None,
                        "nombre": name[:500],
                        "orden": order,
                        "ppi_anual_cop": {},
                        "fuente": source.name,
                        "metadatos": {
                            "extraccion": "MATRIZ_ESTRUCTURAL_ACUERDO_016",
                            "fila_markdown": line_no,
                            "responsable": cells[4] or None,
                            "revision_humana_pendiente": True,
                        },
                    }
                )
            parent_id = ids[key]
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
    for plan_code, filename in (
        ("PDD_2012_2015", "pdd_2012_2015_acuerdo_001_campo_para_todos.md"),
        ("PDD_2013_2015", "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md"),
        ("PDD_2016_2019", "pdd_2016_2019_acuerdo_006_primero_la_gente.md"),
    ):
        source = DATA / filename
        if not source.exists():
            continue
        extracted_rows = _legacy_program_rows(source, plan_code) + _matrix_hierarchy_rows(
            source, plan_code
        )
        known_rows = {
            (
                row["codigo_plan"],
                row["nivel"],
                re.sub(r"\W+", " ", row["nombre"].casefold()).strip(),
            ): row
            for row in lines
        }
        row_id_map: dict[uuid.UUID, uuid.UUID] = {}
        appended_rows = []
        for row in extracted_rows:
            signature = (
                row["codigo_plan"],
                row["nivel"],
                re.sub(r"\W+", " ", row["nombre"].casefold()).strip(),
            )
            duplicate = known_rows.get(signature)
            if duplicate:
                row_id_map[row["id"]] = duplicate["id"]
                continue
            known_rows[signature] = row
            row_id_map[row["id"]] = row["id"]
            appended_rows.append(row)
        for row in appended_rows:
            if row.get("parent_id") in row_id_map:
                row["parent_id"] = row_id_map[row["parent_id"]]
        lines.extend(appended_rows)
    # Link OCR 2012 program labels to the official PPI axes where page context
    # supplies an axis number. The 2013 matrix strategies are rooted at the four
    # canonical objective nodes used by the PPI summary.
    axes_2012 = {
        str(row.get("codigo")): row
        for row in lines
        if row["codigo_plan"] == "PDD_2012_2015" and row["nivel"] == "EJE"
    }
    for row in lines:
        if row["codigo_plan"] == "PDD_2012_2015" and row["nivel"] in {
            "PROGRAMA",
            "COMPONENTE",
        }:
            axis = row.get("metadatos", {}).get("eje_contexto")
            if not axis and row["nivel"] == "COMPONENTE":
                code = str(row.get("codigo") or "")
                axis = code.split(".", 1)[0] if code else None
            normalized_name = unicodedata.normalize("NFKD", row["nombre"])
            normalized_name = normalized_name.encode("ascii", "ignore").decode().upper()
            if not axis:
                for candidate_axis, pattern in (
                    ("5", r"SEGURIDAD|JUSTICIA|CONVIVENCIA|VICTIMA|PAZ|DERECHOS HUMANOS"),
                    ("4", r"HABITAT|AMBIENT|AGUA|VIVIENDA|MOVILIDAD|RIESGO"),
                    ("3", r"EMPLE|ECONOM|PRODUCT|BANCA|INGRESO|EMPRES"),
                    ("2", r"SALUD|EDUC|NUTRIC|CULTUR|DEPORTE|INFANCIA"),
                    ("1", r"DIFERENCIAD|MUJER|DISCAPAC|AFRO|ETNIC|CICLO VITAL"),
                ):
                    if re.search(pattern, normalized_name):
                        axis = candidate_axis
                        row.setdefault("metadatos", {})["vinculo_eje_metodo"] = (
                            "COINCIDENCIA_SEMANTICA_OCR"
                        )
                        break
            if axis and axis in axes_2012:
                row["parent_id"] = axes_2012[axis]["id"]
    matrix_objectives = {
        row["id"]: row
        for row in lines
        if row["codigo_plan"] == "PDD_2013_2015"
        and row["nivel"] == "OBJETIVO"
        and row.get("codigo") is None
    }
    # Older source tables flatten into OCR prose. Keep all quantified candidates
    # with literal evidence and distinguish low-confidence numeric rows explicitly.
    for plan_code, filename in (
        ("PDD_2012_2015", "pdd_2012_2015_acuerdo_001_campo_para_todos.md"),
        ("PDD_2016_2019", "pdd_2016_2019_acuerdo_006_primero_la_gente.md"),
    ):
        source = DATA / filename
        if source.exists():
            existing_signatures = {
                re.sub(r"\W+", " ", str(meta.get("nombre") or "").casefold()).strip()
                for meta in metas
                if meta["codigo_plan"] == plan_code
            }
            candidates = _quantified_ocr_metas(source, plan_code)
            metas.extend(
                meta
                for meta in candidates
                if re.sub(r"\W+", " ", str(meta.get("nombre") or "").casefold()).strip()
                not in existing_signatures
            )
            if not any(meta["codigo_plan"] == plan_code for meta in metas):
                # The 2016 OCR contains the adopted objectives and budget matrix,
                # but no recoverable quantified goal table. Preserve the official
                # objective statements as explicit structural proxies; never imply
                # that these rows have a numeric target or measured outcome.
                structural = (
                    [
                        "Superar la Desigualdad",
                        "Adaptar el Territorio para la Gente",
                        "Construir Ciudadanía y Fortalecimiento Institucional",
                    ]
                    if plan_code == "PDD_2016_2019"
                    else []
                )
                metas.extend(
                    {
                        "codigo_plan": plan_code,
                        "tipo_meta": "OBJETIVO_ESTRATEGICO",
                        "codigo": str(index),
                        "nombre": name,
                        "indicador": None,
                        "unidad_medida": None,
                        "linea_nombre": name,
                        "fuente": filename,
                        "fila_fuente": None,
                        "datos_oficiales": {
                            "objetivo_estrategico_literal": name,
                            "extraccion": "ESTRUCTURA_OFICIAL_FALLBACK",
                            "meta_cuantificada": False,
                            "revision_humana_pendiente": True,
                        },
                    }
                    for index, name in enumerate(structural, 1)
                )
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
    axes_2012 = {
        str(row.get("codigo")): row
        for row in lines
        if row["codigo_plan"] == "PDD_2012_2015" and row["nivel"] == "EJE"
    }
    for row in lines:
        if row["codigo_plan"] == "PDD_2012_2015" and row["nivel"] == "PROGRAMA":
            axis = row.get("metadatos", {}).get("eje_contexto")
            if not axis:
                normalized_name = unicodedata.normalize("NFKD", row["nombre"])
                normalized_name = normalized_name.encode("ascii", "ignore").decode().upper()
                for candidate_axis, pattern in (
                    ("5", r"SEGURIDAD|JUSTICIA|CONVIVENCIA|VICTIMA|PAZ|DERECHOS HUMANOS"),
                    ("4", r"HABITAT|AMBIENT|AGUA|VIVIENDA|MOVILIDAD|RIESGO"),
                    ("3", r"EMPLE|ECONOM|PRODUCT|BANCA|INGRESO|EMPRES"),
                    ("2", r"SALUD|EDUC|NUTRIC|CULTUR|DEPORTE|INFANCIA"),
                    ("1", r"DIFERENCIAD|MUJER|DISCAPAC|AFRO|ETNIC|CICLO VITAL"),
                ):
                    if re.search(pattern, normalized_name):
                        axis = candidate_axis
                        row.setdefault("metadatos", {})["vinculo_eje_metodo"] = (
                            "COINCIDENCIA_SEMANTICA_OCR"
                        )
                        break
            if axis and axis in axes_2012:
                row["parent_id"] = axes_2012[axis]["id"]
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
        (row["codigo_plan"], row["nivel"], row["nombre"].casefold())
        for row in lines
        if row["id"] not in matrix_objectives
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
    canonical_objectives = {
        re.sub(r"\W+", " ", row["nombre"].casefold()).strip(): row
        for row in lines
        if row["codigo_plan"] == "PDD_2013_2015" and row["nivel"] == "OBJETIVO"
    }
    objective_by_code = {
        str(row.get("codigo")): row
        for row in lines
        if row["codigo_plan"] == "PDD_2013_2015"
        and row["nivel"] == "OBJETIVO"
        and row.get("codigo")
    }
    for row in lines:
        if row["codigo_plan"] != "PDD_2013_2015" or row["nivel"] not in {
            "ESTRATEGIA",
            "PROGRAMA",
        }:
            continue
        code_prefix = re.match(r"^(7|8|9|10)(?:\.|$)", str(row.get("codigo") or ""))
        if code_prefix and not row.get("parent_id"):
            objective_number = str(int(code_prefix.group(1)) - 6)
            objective = objective_by_code.get(objective_number)
            if objective:
                row["parent_id"] = objective["id"]
    objective_aliases = (
        ("INCLUSION SOCIAL", "Inclusión Social"),
        ("DESARROLLO ECONOMICO", "Desarrollo Económico"),
        ("DESARROLLO TERRITORIAL", "Desarrollo Territorial"),
        ("LO CIUDADANO Y GUBERNAMENTAL", "Gobernabilidad"),
    )
    matrix_objective_ids_to_drop: set[uuid.UUID] = set()
    for matrix_id, matrix_objective in matrix_objectives.items():
        source_text = re.sub(r"\W+", " ", matrix_objective["nombre"].casefold()).strip()
        alias = next(
            (target for needle, target in objective_aliases if needle.casefold() in source_text),
            None,
        )
        target = canonical_objectives.get(
            re.sub(r"\W+", " ", alias.casefold()).strip() if alias else ""
        )
        if not target:
            continue
        matrix_objective_ids_to_drop.add(matrix_id)
        for row in lines:
            if row["codigo_plan"] == "PDD_2013_2015" and row.get("parent_id") == matrix_id:
                row["parent_id"] = target["id"]
    lines = [row for row in lines if row["id"] not in matrix_objective_ids_to_drop]
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
    structured_files = sorted(DATA.glob("estructurado_pdd_*.json"))
    structured_node_signatures = {
        (
            row["codigo_plan"],
            row["nivel"],
            re.sub(r"\W+", " ", row["nombre"].casefold()).strip(),
        )
        for row in lines
    }
    structured_meta_signatures = {
        (
            row["codigo_plan"],
            re.sub(r"\W+", " ", str(row.get("nombre") or "").casefold()).strip(),
            re.sub(r"\W+", " ", str(row.get("indicador") or "").casefold()).strip(),
        )
        for row in metas
    }

    def structured_items(value: Any):
        if isinstance(value, list):
            for item in value:
                yield from structured_items(item)
        elif isinstance(value, dict):
            yield value
            for item in value.values():
                if isinstance(item, (dict, list)):
                    yield from structured_items(item)

    for path in structured_files:
        period = re.search(r"(2012|2013|2016|2020|2024)", path.name)
        if not period:
            continue
        year = period.group(1)
        plan_code = {
            "2012": "PDD_2012_2015",
            "2013": "PDD_2013_2015",
            "2016": "PDD_2016_2019",
            "2020": "PDD_2020_2023",
            "2024": "PDD_2024_2027",
        }[year]
        payload = json.loads(path.read_text(encoding="utf-8"))
        for entry in structured_items(payload):
            name = next(
                (
                    entry.get(key)
                    for key in ("nombre", "name", "programa", "titulo", "título")
                    if isinstance(entry.get(key), str)
                ),
                None,
            )
            if not name or len(name.strip()) < 5:
                continue
            level_raw = str(entry.get("nivel") or entry.get("level") or "").upper()
            level = next(
                (
                    key
                    for key in (
                        "SUBPROGRAMA",
                        "PROGRAMA",
                        "ESTRATEGIA",
                        "OBJETIVO",
                        "EJE",
                        "PILAR",
                        "LINEA",
                    )
                    if key in level_raw
                ),
                None,
            )
            if level:
                signature = (plan_code, level, re.sub(r"\W+", " ", name.casefold()).strip())
                if signature not in structured_node_signatures:
                    lines.append(
                        {
                            "id": uuid.uuid4(),
                            "codigo_plan": plan_code,
                            "parent_id": None,
                            "nivel": level,
                            "codigo": str(entry.get("codigo") or entry.get("code") or "") or None,
                            "nombre": name.strip(),
                            "orden": len(lines) + 1,
                            "ppi_anual_cop": entry.get("ppi_anual_cop") or {},
                            "fuente": path.name,
                            "metadatos": {
                                **entry,
                                "extraccion": "JSON_ESTRUCTURADO_PDD",
                                "revision_humana_pendiente": True,
                            },
                        }
                    )
                    structured_node_signatures.add(signature)
            indicator = next(
                (
                    entry.get(key)
                    for key in ("indicador", "nombre_indicador", "indicator")
                    if isinstance(entry.get(key), str)
                ),
                None,
            )
            has_goal = any(
                key in entry
                for key in (
                    "meta",
                    "meta_2015",
                    "meta_2019",
                    "meta_2023",
                    "meta_2027",
                    "meta_cuatrienio",
                    "valor_meta",
                )
            )
            if indicator and has_goal:
                signature = (
                    plan_code,
                    re.sub(r"\W+", " ", name.casefold()).strip(),
                    re.sub(r"\W+", " ", indicator.casefold()).strip(),
                )
                if signature not in structured_meta_signatures:
                    metas.append(
                        {
                            "codigo_plan": plan_code,
                            "tipo_meta": str(entry.get("tipo_meta") or "OCR_CANDIDATA").upper(),
                            "codigo": str(entry.get("codigo") or "") or None,
                            "nombre": name.strip(),
                            "indicador": indicator,
                            "unidad_medida": entry.get("unidad_medida"),
                            "linea_nombre": entry.get("programa") or entry.get("linea_nombre"),
                            "fuente": path.name,
                            "fila_fuente": int(entry.get("fila_fuente") or 0) or None,
                            "datos_oficiales": {
                                **entry,
                                "extraccion": "JSON_ESTRUCTURADO_PDD",
                                "revision_humana_pendiente": True,
                            },
                        }
                    )
                    structured_meta_signatures.add(signature)
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
    indexed_lines = [
        row
        for row in lines
        if row["codigo_plan"] == "PDD_2016_2019"
        and row["nivel"] == "LINEA"
        and row.get("fuente") == "pdd_2016_2019_acuerdo_006_primero_la_gente.md"
        and row.get("codigo")
    ]
    canonical_lines = [
        row
        for row in lines
        if row["codigo_plan"] == "PDD_2016_2019"
        and row["nivel"] == "LINEA"
        and row.get("fuente") != "pdd_2016_2019_acuerdo_006_primero_la_gente.md"
    ]
    remove_index_line_ids: set[uuid.UUID] = set()
    for source_line in indexed_lines:
        source_tokens = {
            token
            for token in re.findall(
                r"[A-ZÁÉÍÓÚÑ]{4,}", unicodedata.normalize("NFKC", source_line["nombre"]).upper()
            )
        }
        ranked = []
        for canonical in canonical_lines:
            target_text = unicodedata.normalize("NFKD", canonical["nombre"])
            target_tokens = set(
                re.findall(r"[A-Z]{4,}", target_text.encode("ascii", "ignore").decode().upper())
            )
            shared = len(source_tokens & target_tokens)
            if shared:
                ranked.append((shared, canonical))
        if not ranked:
            continue
        score, chosen = max(ranked, key=lambda item: item[0])
        if score < 2:
            continue
        chosen.setdefault("metadatos", {}).setdefault("aliases_indice_ocr", []).append(
            {"codigo": source_line["codigo"], "nombre": source_line["nombre"]}
        )
        old_id = source_line["id"]
        for descendant in lines:
            if descendant.get("parent_id") == old_id:
                descendant["parent_id"] = chosen["id"]
        remove_index_line_ids.add(old_id)
    lines = [row for row in lines if row.get("id") not in remove_index_line_ids]
    objective_by_code_2016 = {
        str(row.get("codigo")): row
        for row in lines
        if row["codigo_plan"] == "PDD_2016_2019"
        and row["nivel"] == "OBJETIVO"
        and row.get("codigo")
    }
    for row in lines:
        if (
            row["codigo_plan"] != "PDD_2016_2019"
            or row["nivel"] not in {"LINEA", "PROGRAMA", "SUBPROGRAMA"}
            or row.get("parent_id")
        ):
            continue
        code = str(row.get("codigo") or "")
        compact = re.sub(r"\D", "", code)
        candidate_lines = []
        for candidate in canonical_lines:
            aliases = candidate.get("metadatos", {}).get("aliases_indice_ocr", [])
            for alias in aliases:
                alias_compact = re.sub(r"\D", "", str(alias.get("codigo") or ""))
                if (
                    alias_compact
                    and len(alias_compact) < len(compact)
                    and compact.startswith(alias_compact)
                ):
                    candidate_lines.append((len(alias_compact), candidate))
        if candidate_lines:
            row["parent_id"] = max(candidate_lines, key=lambda item: item[0])[1]["id"]
            continue
        prefix = re.match(r"^(8|9|10)(?:\.|$)", code)
        if prefix:
            objective_number = str(int(prefix.group(1)) - 7)
            objective = objective_by_code_2016.get(objective_number)
            if objective:
                row["parent_id"] = objective["id"]
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
                text(
                    """SELECT id::text, codigo_plan, codigo, nombre, indicador,
        linea_nombre, unidad_medida, fuente, datos_oficiales
        FROM seguimiento.pdd_metas_oficiales"""
                )
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
    duplicate_primary: dict[str, str] = {}
    normalized_goals: dict[tuple[str, str, str], str] = {}
    for meta in metas:
        if meta["codigo_plan"] != "PDD_2024_2027":
            continue
        source_name = str(meta.get("fuente") or "")
        if "bases_tecnicas" not in source_name and "ponencia" not in source_name:
            continue
        normalized = " ".join(
            _norm(
                " ".join(
                    (
                        meta["codigo"] or "",
                        meta["indicador"] or "",
                        meta["nombre"] or "",
                        meta["linea_nombre"] or "",
                    )
                ).split()
            )
        )
        if not normalized:
            continue
        signature = (normalized, "", "")
        if "bases_tecnicas" in source_name:
            normalized_goals[signature] = str(meta["id"])
        else:
            primary = normalized_goals.get(signature)
            if primary:
                duplicate_primary[str(meta["id"])] = primary

    coverage_counts: dict[str, int] = defaultdict(int)
    mga_counts: dict[str, int] = defaultdict(int)
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
        score = None
        if chosen:
            counts[method] += 1
            if method == "CODIGO_EXACTO":
                score = 1.0
            elif method == "INDICADOR_ENTIDAD":
                score = 0.8
            elif best_candidate:
                score = min(
                    0.75,
                    best_rank[0] / max(1, len(meta_tokens) + len(_tokens(meta["linea_nombre"]))),
                )
            link = {
                "registro_triada_id": chosen["id"],
                "metodo_emparejamiento": method,
                "score": score,
            }
        else:
            counts["SIN_VINCULO"] += 1
            link = {
                "registro_triada_id": None,
                "metodo_emparejamiento": "SIN_VINCULO",
                "score": 0.0,
            }
        payload = dict(official)
        indicator_entity_match = bool(chosen and method == "INDICADOR_ENTIDAD")
        if str(meta["id"]) in duplicate_primary:
            coverage = "DUPLICADA_ENTRE_FUENTES_PDD"
            link["fila_primaria_id"] = duplicate_primary[str(meta["id"])]
        elif indicator_entity_match or (chosen and score is not None and score >= 0.55):
            coverage = "VINCULADA_ALTA_CONFIANZA"
        elif chosen and score is not None and score >= 0.30:
            coverage = "CANDIDATO_BAJA_CONFIANZA"
        elif plan in {"PDD_2012_2015", "PDD_2013_2015"}:
            coverage = "SIN_CORPUS_HISTORICO"
        elif not entity_hint and not _tokens(meta["linea_nombre"]):
            coverage = "SIN_CODIGO_O_ENTIDAD"
        else:
            coverage = "SIN_REPORTE_EN_CORPUS_CUBIERTO"
        text_for_taxonomy = " ".join(
            (
                str(meta["nombre"] or ""),
                str(meta["indicador"] or ""),
                str(meta.get("unidad_medida") or ""),
            )
        ).casefold()
        if re.search(
            r"\b(tasa|indice|reducci[oó]n|mortalidad|pobreza|brecha|incidencia|prevalencia|delito)\b",
            text_for_taxonomy,
        ):
            taxonomy = "RESULTADO_IMPACTO"
        elif meta.get("unidad_medida") or re.search(
            r"\b(km|viviendas|cupos|subsidios|unidades|personas|zonas|obras)\b", text_for_taxonomy
        ):
            taxonomy = "PRODUCTO_CUANTIFICABLE"
        elif re.search(
            r"\b(documentos?|campa[nñ]as?|reuniones?|capacitaciones?|diagn[oó]sticos?)\b",
            text_for_taxonomy,
        ):
            taxonomy = "GESTION_PROCESO_BLANDO"
        else:
            taxonomy = "REVISION_HUMANA"
        payload["_vinculo_triada"] = link
        payload["_auditoria_forense"] = {
            "estado_cobertura": coverage,
            "taxonomia_mga": taxonomy,
            "score_emparejamiento": score,
            "fuente_primaria_id": duplicate_primary.get(str(meta["id"])),
            "regla": "EAF_11B_V1",
            "requiere_revision_humana": coverage == "CANDIDATO_BAJA_CONFIANZA"
            or taxonomy == "REVISION_HUMANA",
        }
        coverage_counts[coverage] += 1
        mga_counts[taxonomy] += 1
        updates.append({"id": meta["id"], "datos": json.dumps(payload)})
    if updates:
        await conn.execute(
            text("""UPDATE seguimiento.pdd_metas_oficiales m
            SET datos_oficiales = u.datos::jsonb
            FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS u(id text, datos text)
            WHERE m.id::text=u.id"""),
            {"rows": json.dumps(updates)},
        )
    return (
        counts
        | {f"cobertura_{key.lower()}": value for key, value in coverage_counts.items()}
        | {f"mga_{key.lower()}": value for key, value in mga_counts.items()}
    )


async def synchronize(
    dry_run: bool = False,
    extracted: tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]
    | None = None,
) -> dict[str, int]:
    plans, lines, metas = extracted or extract_catalog()
    lines = _order_hierarchy_parent_first(lines)
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
        population_rows = [
            ("DISTRITO-CTG", 1_065_570, "DANE_CNPV2018_PROYECCION_2023", 2023),
            ("LOC-1", 412_580, "ORDEN_11B_CIFRA_LOCALIDAD_NO_CERTIFICADA_DANE", None),
            ("LOC-2", 348_190, "ORDEN_11B_CIFRA_LOCALIDAD_NO_CERTIFICADA_DANE", None),
            ("LOC-3", 304_800, "ORDEN_11B_CIFRA_LOCALIDAD_NO_CERTIFICADA_DANE", None),
        ]
        await conn.execute(
            text("""UPDATE geodatos.territorios t
                SET poblacion_estimada = CAST(source.pop AS integer),
                    metadatos = coalesce(t.metadatos, '{}'::jsonb) ||
                      jsonb_build_object('poblacion_fuente', source.provenance,
                                         'poblacion_vigencia', CAST(source.year AS integer),
                                         'poblacion_revision', '11B')
                FROM (VALUES (CAST(:district AS text), CAST(:pop_district AS integer),
                               CAST(:src_district AS text), CAST(:year_district AS integer)),
                             (CAST(:loc1 AS text), CAST(:pop1 AS integer),
                              CAST(:src_loc AS text), NULL::integer),
                             (CAST(:loc2 AS text), CAST(:pop2 AS integer),
                              CAST(:src_loc AS text), NULL::integer),
                             (CAST(:loc3 AS text), CAST(:pop3 AS integer),
                              CAST(:src_loc AS text), NULL::integer))
                     AS source(code, pop, provenance, year)
                WHERE t.codigo = source.code AND t.poblacion_estimada IS NULL"""),
            {
                "district": population_rows[0][0],
                "pop_district": population_rows[0][1],
                "src_district": population_rows[0][2],
                "year_district": population_rows[0][3],
                "loc1": population_rows[1][0],
                "pop1": population_rows[1][1],
                "loc2": population_rows[2][0],
                "pop2": population_rows[2][1],
                "loc3": population_rows[3][0],
                "pop3": population_rows[3][1],
                "src_loc": "ORDEN_11B_CIFRA_LOCALIDAD_NO_CERTIFICADA_DANE",
            },
        )
    await engine.dispose()
    cache_count = await warm_pdd_cache()
    return {
        "planes": len(plans),
        "lineas_programas": len(lines),
        "metas_oficiales": len(metas),
        **{f"vinculos_{k.lower()}": v for k, v in link_counts.items()},
        "cache_payloads": cache_count,
    }


def _order_hierarchy_parent_first(lines: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Order the bulk insert so every parent row exists before its children."""
    ids = {str(row["id"]) for row in lines}
    children: dict[str | None, list[dict[str, Any]]] = defaultdict(list)
    for row in lines:
        parent = str(row["parent_id"]) if row.get("parent_id") else None
        if parent and parent not in ids:
            raise ValueError(
                f"Nodo {row['id']} referencia un padre ausente en el catálogo: {parent}"
            )
        children[parent].append(row)
    ordered: list[dict[str, Any]] = []
    queue = list(children[None])
    cursor = 0
    while cursor < len(queue):
        row = queue[cursor]
        cursor += 1
        ordered.append(row)
        queue.extend(children.get(str(row["id"]), []))
    if len(ordered) != len(lines):
        raise ValueError("La jerarquía del catálogo contiene un ciclo de parent_id.")
    return ordered


async def warm_pdd_cache() -> int:
    from app.modules.compromisos import pdd_dea_service as module
    from app.modules.compromisos.pdd_dea_service import PddDeaService

    module._RESULT.clear()
    module._STATE.clear()
    module._DISK_CACHE = {}
    module._RAW_JSON_BYTES.clear()
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
            await service.laboratorio_prescriptivo_pdd()
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
