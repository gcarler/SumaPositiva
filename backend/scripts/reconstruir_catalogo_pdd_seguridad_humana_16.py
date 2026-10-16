"""Repair the PDD/PDL hierarchy and apply auditable SH classifications.

The job is intentionally idempotent and transactional. It preserves the source
goal occurrences (including the 2024 duplicate provenance) and never reads PA or
workshop data.
"""

# SQL, official source labels, and dense reconciliation formulas are kept legible
# as source literals; line width is intentionally not enforced in this ETL script.
# ruff: noqa: E501

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402
from app.modules.compromisos.pdd_dea_service import _money_factor  # noqa: E402

DATA = ROOT / "data" / "planes_desarrollo"
DIMENSIONS = (
    "Seguridad Personal",
    "Seguridad Comunitaria",
    "Seguridad Económica",
    "Seguridad Alimentaria",
    "Seguridad en la Salud",
    "Seguridad Ambiental",
    "Seguridad Política",
)
PLAN_PERIODS = {
    "PDD_2012_2015": (2012, 2015),
    "PDD_2013_2015": (2013, 2015),
    "PDD_2016_2019": (2016, 2019),
    "PDD_2020_2023": (2020, 2023),
    "PDD_2024_2027": (2024, 2027),
    "PDL_1_2024_2027": (2024, 2027),
    "PDL_2_2024_2027": (2024, 2027),
    "PDL_3_2024_2027": (2024, 2027),
}
PPI_2012 = {
    "EJE 1": {
        "2012": 25_243_330_000,
        "2013": 41_023_555_000,
        "2014": 52_239_485_000,
        "2015": 78_155_342_000,
    },
    "EJE 2": {
        "2012": 519_320_179_000,
        "2013": 499_986_467_000,
        "2014": 514_945_047_000,
        "2015": 534_281_082_000,
    },
    "EJE 3": {
        "2012": 43_230_907_000,
        "2013": 46_138_449_000,
        "2014": 48_033_167_000,
        "2015": 42_592_591_000,
    },
    "EJE 4": {
        "2012": 97_109_185_000,
        "2013": 85_464_284_000,
        "2014": 119_510_851_000,
        "2015": 132_101_349_000,
    },
    "EJE 5": {
        "2012": 34_006_782_000,
        "2013": 39_606_553_000,
        "2014": 53_143_596_000,
        "2015": 43_656_066_000,
    },
}
PPI_2016 = {
    "EDUCACION PARA LA GENTE DEL SIGLO XXI": {
        "2016": 355_000_000_000,
        "2017": 368_000_000_000,
        "2018": 382_000_000_000,
        "2019": 408_000_000_000,
    },
    "POR UNA CARTAGENA CON EQUIDAD EN SALUD": {
        "2016": 320_000_000_000,
        "2017": 330_000_000_000,
        "2018": 345_000_000_000,
        "2019": 365_000_000_000,
    },
    "CARTAGENA CIUDAD PARA INVERTIR": {
        "2016": 14_739_000_000,
        "2017": 35_406_000_000,
        "2018": 16_360_000_000,
        "2019": 17_395_000_000,
    },
    "PRIMERO LA GENTE": {
        "2016": 62_206_000_000,
        "2017": 40_753_000_000,
        "2018": 57_999_000_000,
        "2019": 65_304_000_000,
    },
    "GESTION DEL RIESGO Y MEDIO AMBIENTE": {
        "2016": 9_089_000_000,
        "2017": 9_413_000_000,
        "2018": 35_860_000_000,
        "2019": 47_546_000_000,
    },
    "DESARROLLO URBANO": {
        "2016": 144_585_000_000,
        "2017": 177_907_000_000,
        "2018": 203_194_000_000,
        "2019": 225_037_000_000,
    },
    "CARTAGENA SIN MIEDOS": {
        "2016": 15_918_000_000,
        "2017": 17_187_000_000,
        "2018": 18_057_000_000,
        "2019": 18_995_000_000,
    },
    "CARTAGENA TERRITORIO DE PAZ": {
        "2016": 1_420_000_000,
        "2017": 1_454_000_000,
        "2018": 1_504_000_000,
        "2019": 1_556_000_000,
    },
    "GESTION PUBLICA LOCAL TRANSPARENTE": {
        "2016": 2_512_000_000,
        "2017": 2_587_000_000,
        "2018": 2_665_000_000,
        "2019": 2_745_000_000,
    },
    "PARTICIPACION Y FORTALECIMIENTO": {
        "2016": 45_645_000_000,
        "2017": 45_424_000_000,
        "2018": 47_538_000_000,
        "2019": 50_032_000_000,
    },
    "FINANZAS SANAS Y ROBUSTAS": {
        "2016": 4_180_000_000,
        "2017": 4_305_000_000,
        "2018": 4_435_000_000,
        "2019": 4_568_000_000,
    },
}
VISION_METAS_2012 = (
    {
        "nombre": "Reducir en seis puntos la pobreza por ingresos y pasar de 34,2 % a 28 %; priorizar nutrición y educación inicial de niñas y niños de 0 a 6 años en pobreza.",
        "indicador": "Pobreza por ingresos; porcentaje de personas que subsisten con dos dólares diarios o menos.",
        "linea_base": "34,2 % (DANE, 2010)",
        "meta_cuatrienio": "28 % al 2015; reducción de seis puntos porcentuales.",
        "eje": "1",
    },
    {
        "nombre": "Mejorar las capacidades de desarrollo en seis zonas identificadas como las de mayor pobreza del Distrito, mediante acción coordinada distrital y nacional.",
        "indicador": "Capacidades de desarrollo en seis zonas de mayor pobreza.",
        "linea_base": "Seis zonas identificadas en 2012.",
        "meta_cuatrienio": "Mejora de capacidades al 2015.",
        "eje": "1",
    },
    {
        "nombre": "Aumentar la tasa de ocupación laboral de 54 % a 57 %, equivalente aproximadamente a 35.000 puestos de trabajo.",
        "indicador": "Tasa de ocupación laboral.",
        "linea_base": "54 % (DANE, 2011)",
        "meta_cuatrienio": "57 % al 2015 (aprox. 35.000 puestos de trabajo).",
        "eje": "3",
    },
    {
        "nombre": "Mejorar las condiciones físico-químicas del recurso hídrico de la Ciénaga de la Virgen y los cuerpos de agua internos para hacerlos aptos para contacto humano.",
        "indicador": "Condiciones físico-químicas y aptitud de contacto humano de los cuerpos de agua.",
        "linea_base": "Condición reportada por EPA Cartagena; el acuerdo no consigna valor numérico en la visión.",
        "meta_cuatrienio": "Cuerpos de agua aptos para contacto humano al 2015.",
        "eje": "4",
    },
    {
        "nombre": "Reducir la población damnificada en zonas históricamente inundables mediante el avance del plan de drenajes pluviales.",
        "indicador": "Población damnificada en zonas de inundación histórica.",
        "linea_base": "El acuerdo no consigna valor numérico en la visión.",
        "meta_cuatrienio": "Menos población damnificada al 2015.",
        "eje": "4",
    },
    {
        "nombre": "Reducir la tasa de homicidio de 22,5 a 19,5 por cada 100.000 habitantes y elevar la percepción de seguridad de 41 % a 60 %.",
        "indicador": "Tasa de homicidio por 100.000 habitantes y percepción ciudadana de seguridad.",
        "linea_base": "22,5 homicidios por 100.000 (COSED, 2011); 41 % de percepción (Cartagena Cómo Vamos, 2011).",
        "meta_cuatrienio": "19,5 homicidios por 100.000 y 60 % de percepción al 2015.",
        "eje": "5",
    },
    {
        "nombre": "Mejorar la posición de Cartagena en el Índice de Gobierno Abierto desde el puesto 358 hasta ubicarse entre los primeros 100 entes territoriales.",
        "indicador": "Posición en el Índice de Gobierno Abierto de la Procuraduría General de la Nación.",
        "linea_base": "Puesto 358 (Procuraduría General de la Nación, 2010–2011).",
        "meta_cuatrienio": "Entre los primeros 100 entes territoriales al 2015.",
        "eje": "5",
    },
)


def _fold(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", normalized).strip().upper()


def _dimension(text_value: str) -> tuple[str, dict[str, float]]:
    value = _fold(text_value)
    rules = (
        (
            "Seguridad Personal",
            r"\b(SEGURIDAD CIUDADANA|VIOLENCIA|DELITO|HOMICIDIO|POLICIA|JUSTICIA|RIESGO|EMERGENCIA|INUNDACION|INUNDABLES?|VICTIMAS)\b",
        ),
        (
            "Seguridad Comunitaria",
            r"\b(CONVIVENCIA|PAZ|COMUNITAR|CULTURA CIUDADANA|PARTICIPACION)\b",
        ),
        ("Seguridad Alimentaria", r"\b(ALIMENT|NUTRIC|AGRICULT|PESCA|HAMBRE)\b"),
        (
            "Seguridad en la Salud",
            r"\b(SALUD|HOSPITAL|MORTALIDAD|DADIS|SALUD MENTAL|ASEGURAMIENTO)\b",
        ),
        (
            "Seguridad Ambiental",
            r"\b(AMBIENT|AGUA|SANEAMIENTO|CAMBIO CLIMATICO|HABITAT|DESASTRE|INUNDACION|INUNDABLES?)\b",
        ),
        (
            "Seguridad Económica",
            r"\b(POBREZA|EMPLEO|OCUPACION LABORAL|INGRESO|PRODUCTIV|EMPREND|INCLUSION ECONOMICA)\b",
        ),
        (
            "Seguridad Política",
            r"\b(DERECHOS HUMANOS|GOBERN|TRANSPAREN|ETNIC|AFRO|INDIGENA|CONTROL SOCIAL)\b",
        ),
    )
    matches = [dimension for dimension, pattern in rules if re.search(pattern, value)]
    if not matches:
        matches = ["Seguridad Política"]
    share = 1.0 / len(matches)
    weights = {dimension: (share if dimension in matches else 0.0) for dimension in DIMENSIONS}
    # Assign floating remainder to the primary dimension so the stored vector sums exactly.
    weights[matches[0]] = 1.0 - sum(weights[d] for d in DIMENSIONS if d != matches[0])
    return matches[0], weights


def _classify(
    name: str, level: str, metadata: dict[str, Any]
) -> tuple[str, str | None, dict[str, float]]:
    value = _fold(f"{name} {metadata.get('descripcion', '')}")
    umbrella_level = level in {"EJE", "OBJETIVO", "PILAR", "LINEA", "LINEA_ESTRATEGICA"}
    mixed_security_label = umbrella_level and (
        "SEGURIDAD HUMANA" in value or "BUEN GOBIERNO" in value or "PARA LA GOBERNABILIDAD" in value
    )
    if mixed_security_label:
        return "C_CONTEXTUAL_HABILITANTE", None, {}
    if re.search(
        r"\b(ADMINISTRACION GENERAL|SERVICIO DE LA DEUDA|RECAUDO|CATASTRO|FUNCIONAMIENTO|FINANZAS SANAS|FORTALECIMIENTO INSTITUCIONAL)\b",
        value,
    ):
        return "N_NO_ASOCIADO_FUNCIONAMIENTO", None, {}
    if re.search(
        r"\b(SEGURIDAD|CONVIVENCIA|JUSTICIA|DERECHOS HUMANOS|PAZ|VICTIMAS|GESTION DEL RIESGO|EMERGENCIA|INUNDACION|INUNDABLES?|HOMICIDIO|PREVENCION DE VIOLENCIA)\b",
        value,
    ):
        code = "A_NUCLEO_FRONTAL"
    elif re.search(
        r"\b(ALIMENT|NUTRIC|SALUD|POBREZA|EMPLEO|OCUPACION LABORAL|VIVIENDA|AGUA|SANEAMIENTO|NINEZ|INFANCIA|JOVEN|MUJER|ETNIC|DISCAPAC|PROTECCION SOCIAL)\b",
        value,
    ):
        code = "B_DETERMINANTE_DIRECTO"
    elif level in {
        "EJE",
        "OBJETIVO",
        "PILAR",
        "LINEA",
        "LINEA_ESTRATEGICA",
        "IMPULSOR",
    } and not re.search(r"\b(SEGURIDAD|PAZ|RIESGO|DERECHOS HUMANOS)\b", value):
        code = "C_CONTEXTUAL_HABILITANTE"
    else:
        code = "C_CONTEXTUAL_HABILITANTE"
    if code.startswith(("C_", "N_")):
        return code, None, {}
    dimension, weights = _dimension(value)
    return code, dimension, weights


def _amounts_2020() -> list[tuple[str, str, str, dict[str, int]]]:
    source = (DATA / "pdd_2020_2023_salvemos_juntos_cartagena.md").read_text(encoding="utf-8")
    start = source.find("|EJE/LINEA")
    end = source.find("|TOTAL PLAN|", start)
    if start < 0 or end < 0:
        return []
    section = source[start : end + len("|TOTAL PLAN|")]
    values: list[tuple[str, str, str, dict[str, int]]] = []
    row_pattern = re.compile(
        r"^\|\s*(\d+(?:\.\d+){1,4})\s+(PILAR|L[IÍ]NEA\s+ESTRAT[EÉ]GICA|PROGRAMA)\b([^|]*)\|([^\n]+)$",
        re.I,
    )
    for raw in section.splitlines():
        match = row_pattern.match(raw)
        if not match:
            continue
        cells = [cell.strip() for cell in match.group(4).split("|")]
        if len(cells) < 5:
            continue
        annual = {}
        for year, cell in zip((2020, 2021, 2022, 2023), cells[:4], strict=True):
            try:
                amount_millions = (
                    float(cell.replace(".", "").replace(",", ".")) if cell not in {"-", ""} else 0.0
                )
            except ValueError:
                annual = {}
                break
            annual[str(year)] = round(amount_millions * 1_000_000)
        if annual:
            values.append(
                (
                    match.group(1),
                    _fold(match.group(2)).replace(" ", "_"),
                    match.group(3).strip().strip(': “”"'),
                    annual,
                )
            )
    return values


def _source_2016() -> dict[str, dict[str, int]]:
    source = (DATA / "pdd_2016_2019_acuerdo_006_primero_la_gente.md").read_text(encoding="utf-8")
    rows = {}
    for raw in source.splitlines()[:25]:
        cells = [part.strip() for part in raw.strip().strip("|").split("|")]
        if len(cells) != 6 or not re.match(r"\d+(?:\.\d+)*\.?\s+", cells[0]):
            continue
        name = _fold(cells[0])
        annual = {}
        for year, cell in zip((2016, 2017, 2018, 2019), cells[1:5], strict=True):
            digits = re.sub(r"\D", "", cell)
            annual[str(year)] = int(digits) if digits else 0
        rows[name] = annual
    return rows


async def rebuild(dry_run: bool = False) -> dict[str, Any]:
    engine = create_async_engine(Settings().async_database_url)
    result: dict[str, Any] = {"dry_run": dry_run}
    try:
        async with engine.begin() as conn:
            node_rows = (
                (
                    await conn.execute(
                        text(
                            """SELECT id::text id,codigo_plan,parent_id::text parent_id,nivel,codigo,nombre,orden,ppi_anual_cop,fuente,metadatos FROM seguimiento.pdd_lineas_y_programas ORDER BY codigo_plan,orden"""
                        )
                    )
                )
                .mappings()
                .all()
            )
            meta_rows = (
                (
                    await conn.execute(
                        text(
                            """SELECT id::text id,codigo_plan,linea_id::text linea_id,tipo_meta,codigo,nombre,indicador,unidad_medida,linea_nombre,fuente,fila_fuente,datos_oficiales FROM seguimiento.pdd_metas_oficiales ORDER BY codigo_plan,fuente,fila_fuente"""
                        )
                    )
                )
                .mappings()
                .all()
            )
            plans = (
                (
                    await conn.execute(
                        text(
                            "SELECT codigo_plan,ppi_total_corriente_cop,ppi_anual_cop,metadatos FROM seguimiento.planes_desarrollo_distrital"
                        )
                    )
                )
                .mappings()
                .all()
            )
            by_plan: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for row in node_rows:
                by_plan[row["codigo_plan"]].append(dict(row))
            updates_nodes: list[dict[str, Any]] = []
            deletions: list[str] = []
            # Remove the known OCR page headers, then retain the eight official PDD 2016 lines.
            for row in by_plan["PDD_2016_2019"]:
                if re.search(r"PAGINA\s+\d+\s*\(OCR OFICIAL", _fold(row["nombre"])):
                    deletions.append(row["id"])
            canonical_2016 = [
                (
                    "EDUCACION PARA LA GENTE DEL SIGLO XXI",
                    "1. Educación para la Gente del Siglo XXI",
                ),
                (
                    "POR UNA CARTAGENA CON EQUIDAD EN SALUD",
                    "2. Por una Cartagena con Equidad en Salud",
                ),
                ("CARTAGENA CIUDAD PARA INVERTIR", "3. Cartagena Ciudad para Invertir"),
                ("PRIMERO LA GENTE", "4. Primero la Gente (Inclusión, Cultura y Deporte)"),
                ("GESTION DEL RIESGO Y MEDIO AMBIENTE", "5. Gestión del Riesgo y Medio Ambiente"),
                ("DESARROLLO URBANO", "6. Desarrollo Urbano, Movilidad y Vivienda"),
                ("CARTAGENA SIN MIEDOS", "7. Cartagena Sin Miedos y Territorio de Paz"),
                (
                    "GESTION PUBLICA LOCAL TRANSPARENTE",
                    "8. Gestión Pública Transparente y Finanzas Sanas",
                ),
            ]
            p2016 = by_plan["PDD_2016_2019"]
            objective_by_code = {
                str(i): r for i, r in enumerate([r for r in p2016 if r["nivel"] == "OBJETIVO"], 1)
            }
            line_by_name: dict[str, dict[str, Any]] = {}
            for index, (_needle, canonical) in enumerate(canonical_2016, 1):
                found = next(
                    (
                        r
                        for r in p2016
                        if r["nivel"] == "LINEA"
                        and _fold(r["nombre"]).startswith(_fold(canonical.split(". ", 1)[-1]))
                    ),
                    None,
                )
                if found is None:
                    found = next(
                        (
                            r
                            for r in p2016
                            if r["nivel"] == "LINEA" and _needle in _fold(r["nombre"])
                        ),
                        None,
                    )
                if found:
                    line_by_name[canonical] = found
                    continue
                import uuid

                row = {
                    "id": str(uuid.uuid4()),
                    "codigo_plan": "PDD_2016_2019",
                    "parent_id": None,
                    "nivel": "LINEA",
                    "codigo": str(index),
                    "nombre": canonical,
                    "orden": index,
                    "ppi_anual_cop": {},
                    "fuente": "pdd_2016_2019_acuerdo_006_primero_la_gente.md",
                    "metadatos": {
                        "reconstruccion": "R16_CANONICA",
                        "ppi_fuente": "tabla 209 del acuerdo",
                    },
                }
                p2016.append(row)
                line_by_name[canonical] = row
            keep_2016 = {row["id"] for row in line_by_name.values()}
            deletions.extend(
                row["id"]
                for row in p2016
                if row["nivel"] == "LINEA"
                and row["id"] not in keep_2016
                and row["id"] not in deletions
            )
            annual_2016 = _source_2016()
            for code, objective in objective_by_code.items():
                data = next(
                    (
                        value
                        for key, value in annual_2016.items()
                        if key.startswith(f"{code}. OBJETIVO ESTRATEGICO")
                    ),
                    None,
                )
                if data:
                    objective["ppi_anual_cop"] = data
                    metadata = dict(objective.get("metadatos") or {})
                    metadata.update(
                        {
                            "ppi_fuente": "Tabla 209 oficial Acuerdo 006/2016",
                            "ppi_total_cop": sum(data.values()),
                            "base_precios": "COP corrientes",
                            "ppi_es_subtotal": True,
                        }
                    )
                    objective["metadatos"] = metadata
                    updates_nodes.append(objective)
            for index, (_needle, canonical) in enumerate(canonical_2016[:8], 1):
                row = line_by_name[canonical]
                if index == 7:
                    data = {
                        year: sum(
                            amount.get(year, 0)
                            for key, amount in annual_2016.items()
                            if any(
                                needle in key
                                for needle in (
                                    "CARTAGENA SIN MIEDOS",
                                    "CARTAGENA TERRITORIO DE PAZ",
                                )
                            )
                        )
                        for year in ("2016", "2017", "2018", "2019")
                    }
                elif index == 8:
                    data = {
                        year: sum(
                            amount.get(year, 0)
                            for key, amount in annual_2016.items()
                            if any(
                                needle in key
                                for needle in (
                                    "GESTION PUBLICA LOCAL TRANSPARENTE",
                                    "PARTICIPACION Y FORTALECIMIENTO",
                                    "FINANZAS SANAS Y ROBUSTAS",
                                )
                            )
                        )
                        for year in ("2016", "2017", "2018", "2019")
                    }
                else:
                    data = next((value for key, value in annual_2016.items() if _needle in key), {})
                if data:
                    row["ppi_anual_cop"] = data
                    metadata = dict(row.get("metadatos") or {})
                    metadata.update(
                        {
                            "ppi_fuente": "Tabla 209 oficial Acuerdo 006/2016",
                            "ppi_total_cop": sum(data.values()),
                            "base_precios": "COP corrientes",
                        }
                    )
                    row["metadatos"] = metadata
                parent = objective_by_code.get("1" if index <= 4 else "2" if index <= 6 else "3")
                row["parent_id"] = parent["id"] if parent else None
                updates_nodes.append(row)
            # 2012 exact official annual PPI by axis from the primary Agreement 001 markdown.
            for row in by_plan["PDD_2012_2015"]:
                folded = _fold(row["nombre"])
                for key, annual in PPI_2012.items():
                    if key in folded:
                        row["ppi_anual_cop"] = annual
                        meta = dict(row["metadatos"] or {})
                        meta.update(
                            {
                                "ppi_total_cop": sum(annual.values()),
                                "ppi_fuente": "tabla oficial por eje, Acuerdo 001/2012",
                                "base_precios": "COP corrientes",
                            }
                        )
                        row["metadatos"] = meta
                        updates_nodes.append(row)
            # The 2013 PPI summary specifies only 2014 and 2015; no amount is assigned to 2013.
            source_2013 = (DATA / "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md").read_text(
                encoding="utf-8"
            )
            for raw in source_2013.splitlines():
                cells = [cell.strip() for cell in raw.strip().strip("|").split("|")]
                if len(cells) < 4 or not re.match(r"OBJETIVO\s+[1-4]\.\s+", cells[0], re.I):
                    continue
                objective_number = re.search(r"OBJETIVO\s+([1-4])", cells[0], re.I)
                if not objective_number:
                    continue
                row = next(
                    (
                        node
                        for node in by_plan["PDD_2013_2015"]
                        if node["nivel"] == "OBJETIVO"
                        and node.get("codigo") == objective_number.group(1)
                    ),
                    None,
                )
                if not row:
                    continue
                annual = {}
                for year, amount in zip(("2014", "2015"), cells[1:3], strict=True):
                    digits = re.sub(r"\D", "", amount)
                    annual[year] = int(digits) * 1000 if digits else 0
                row["ppi_anual_cop"] = annual
                metadata = dict(row.get("metadatos") or {})
                metadata.update(
                    {
                        "ppi_fuente": "PPI oficial Acuerdo 016/2013",
                        "unidad_fuente": "miles de COP",
                        "base_precios": "COP corrientes",
                        "ppi_total_cop": sum(annual.values()),
                    }
                )
                row["metadatos"] = metadata
                updates_nodes.append(row)

            # Preserve plan-wide 2012 objective statements without inventing an axis
            # relationship; the OCR text does not identify a defensible parent.
            for row in by_plan["PDD_2012_2015"]:
                if row["nivel"] == "COMPONENTE":
                    row["parent_id"] = None
                    metadata = dict(row.get("metadatos") or {})
                    metadata["nota_jerarquia"] = (
                        "Enunciado general del plan en OCR; no se asigna a un eje sin evidencia."
                    )
                    row["metadatos"] = metadata
                    updates_nodes.append(row)
            for row in by_plan["PDD_2013_2015"]:
                if row["nivel"] != "PROGRAMA":
                    continue
                title = _fold(row["nombre"])
                objective_code = (
                    "4"
                    if re.search(r"PARTICIPACION|GOBERN", title)
                    else "2"
                    if re.search(r"EMPLEO|ECONOM|PRODUCTIV|TURISMO", title)
                    else "1"
                )
                parent = next(
                    (
                        node
                        for node in by_plan["PDD_2013_2015"]
                        if node["nivel"] == "OBJETIVO" and node.get("codigo") == objective_code
                    ),
                    None,
                )
                row["parent_id"] = parent["id"] if parent else None
                code = re.search(r"(?:PROGRAMA\s+)?(\d+(?:\.\d+){1,3})", title)
                if code:
                    row["codigo"] = code.group(1)
                if title in {"SUB PROGRAMA", "SUB PROGRAMA:"}:
                    deletions.append(row["id"])
                    continue
                updates_nodes.append(row)

            # Establish code-prefix parentage for the adopted 2020 and 2024 trees and the three PDLs.
            for plan_code in (
                "PDD_2020_2023",
                "PDD_2024_2027",
                "PDL_1_2024_2027",
                "PDL_2_2024_2027",
                "PDL_3_2024_2027",
            ):
                rows = by_plan[plan_code]
                codes = {str(row.get("codigo")): row for row in rows if row.get("codigo")}
                for row in rows:
                    code = str(row.get("codigo") or "")
                    if not code or row["nivel"] in {"PILAR", "OBJETIVO", "EJE"}:
                        continue
                    parent_code = ".".join(code.split(".")[:-1])
                    parent = codes.get(parent_code)
                    if parent and parent["id"] != row["id"]:
                        row["parent_id"] = parent["id"]
                        updates_nodes.append(row)
                for row in rows:
                    if row["nivel"] not in {"PROGRAMA", "IMPULSOR"} or row.get("parent_id"):
                        continue
                    possible_levels = (
                        {"LINEA", "IMPULSOR"} if row["nivel"] == "PROGRAMA" else {"LINEA"}
                    )
                    code = str(row.get("codigo") or "")
                    ancestors = [
                        candidate
                        for candidate in rows
                        if candidate["nivel"] in possible_levels
                        and candidate["id"] != row["id"]
                        and code
                        and str(candidate.get("codigo") or "")
                        and code.startswith(f"{candidate['codigo']}.")
                    ]
                    if ancestors:
                        row["parent_id"] = max(
                            ancestors, key=lambda candidate: len(str(candidate.get("codigo") or ""))
                        )["id"]
                    else:
                        source_tokens = set(re.findall(r"[A-Z]{4,}", _fold(row["nombre"])))
                        candidates = []
                        for candidate in rows:
                            if (
                                candidate["nivel"] not in possible_levels
                                or candidate["id"] == row["id"]
                            ):
                                continue
                            overlap = len(
                                source_tokens
                                & set(re.findall(r"[A-Z]{4,}", _fold(candidate["nombre"])))
                            )
                            if overlap:
                                candidates.append((overlap, candidate))
                        if candidates:
                            row["parent_id"] = max(candidates, key=lambda item: item[0])[1]["id"]
                    updates_nodes.append(row)
            # PDL Markdown heading order is the reliable hierarchy source: each driver
            # and program inherits the preceding strategic line/driver until the next.
            for plan_code in ("PDL_1_2024_2027", "PDL_2_2024_2027", "PDL_3_2024_2027"):
                rows = by_plan[plan_code]
                for row in rows:
                    if row["nivel"] == "COMPONENTE" and re.search(
                        r"(PLAN PLURIANUAL|COMPONENTE ESTRATEGICO)", _fold(row["nombre"])
                    ):
                        if row["id"] not in deletions:
                            deletions.append(row["id"])
                current_line = None
                current_driver = None
                for row in sorted(rows, key=lambda item: item["orden"]):
                    if row["id"] in deletions:
                        continue
                    if row["nivel"] == "LINEA":
                        current_line = row
                        current_driver = None
                    elif row["nivel"] == "IMPULSOR":
                        if current_line:
                            row["parent_id"] = current_line["id"]
                        current_driver = row
                        updates_nodes.append(row)
                    elif row["nivel"] == "PROGRAMA":
                        parent = current_driver or current_line
                        if parent:
                            row["parent_id"] = parent["id"]
                        updates_nodes.append(row)
            annual_2020 = _amounts_2020()
            matched_2020: dict[str, dict[str, Any]] = {}
            for row in by_plan["PDD_2020_2023"]:
                row["ppi_anual_cop"] = {}
                metadata = dict(row.get("metadatos") or {})
                for key in (
                    "ppi_fuente",
                    "unidad_fuente",
                    "base_precios",
                    "ppi_total_cop",
                    "ppi_total_constante_2025_cop",
                ):
                    metadata.pop(key, None)
                row["metadatos"] = metadata
            for code, source_kind, source_name, annual in annual_2020:
                source_tokens = set(re.findall(r"[A-Z]{4,}", _fold(source_name)))
                expected_level = {
                    "PILAR": "PILAR",
                    "LINEA_ESTRATEGICA": "LINEA",
                    "PROGRAMA": "PROGRAMA",
                }.get(source_kind, "PROGRAMA")
                choices = []
                for row in by_plan["PDD_2020_2023"]:
                    if row["nivel"] != expected_level:
                        continue
                    row_tokens = set(re.findall(r"[A-Z]{4,}", _fold(row["nombre"])))
                    score = len(source_tokens & row_tokens)
                    if score:
                        choices.append((score, row))
                row = max(choices, key=lambda item: item[0])[1] if choices else None
                if row:
                    matched_2020[code] = row
                    prior_annual = row.get("ppi_anual_cop") or {}
                    row["ppi_anual_cop"] = {
                        year: float(prior_annual.get(year, 0) or 0) + float(amount or 0)
                        for year, amount in annual.items()
                    }
                    metadata = dict(row["metadatos"] or {})
                    metadata.update(
                        {
                            "ppi_fuente": "Plan plurianual, Acuerdo 024/2020",
                            "unidad_fuente": "millones COP convertidos a COP",
                            "ppi_total_cop": sum(row["ppi_anual_cop"].values()),
                            "base_precios": "COP constantes diciembre 2019",
                        }
                    )
                    row["metadatos"] = metadata
                    updates_nodes.append(row)
            # Repair hierarchy using source code-prefix relationships, tolerating different
            # numbering between adopted narrative headings and the PPI annex.
            for row in by_plan["PDD_2020_2023"]:
                code = str(row.get("codigo") or "")
                if row["nivel"] == "PROGRAMA":
                    ancestors = [
                        candidate
                        for candidate in by_plan["PDD_2020_2023"]
                        if candidate["nivel"] == "LINEA"
                        and code.startswith(f"{candidate.get('codigo') or ''}.")
                    ]
                    if ancestors:
                        row["parent_id"] = max(
                            ancestors, key=lambda candidate: len(str(candidate.get("codigo") or ""))
                        )["id"]
                elif row["nivel"] == "LINEA":
                    name = _fold(row["nombre"])
                    if re.search(r"(AMBIENT|NATURAL|RIESGO|MOVILIDAD|TERRITOR|RESILIENT)", name):
                        pillar_name = "Cartagena Resiliente"
                    elif re.search(r"(SALUD|EDUC|INCLUSION|VIVIENDA|POBREZA|CULTURA)", name):
                        pillar_name = "Cartagena Incluyente"
                    elif re.search(r"(CONTING|COVID|EMPLEO|REACTIV)", name):
                        pillar_name = "Cartagena Contingente"
                    else:
                        pillar_name = "Cartagena Transparente"
                    pillar = next(
                        (
                            candidate
                            for candidate in by_plan["PDD_2020_2023"]
                            if candidate["nivel"] == "PILAR"
                            and _fold(candidate["nombre"]) == _fold(pillar_name)
                        ),
                        None,
                    )
                    row["parent_id"] = pillar["id"] if pillar else None
                elif row["nivel"] == "PROGRAMA" and not row.get("parent_id"):
                    program_tokens = set(re.findall(r"[A-Z]{4,}", _fold(row["nombre"])))
                    choices = []
                    for candidate in by_plan["PDD_2020_2023"]:
                        if candidate["nivel"] != "LINEA":
                            continue
                        overlap = len(
                            program_tokens
                            & set(re.findall(r"[A-Z]{4,}", _fold(candidate["nombre"])))
                        )
                        if overlap:
                            choices.append((overlap, candidate))
                    if choices:
                        row["parent_id"] = max(choices, key=lambda item: item[0])[1]["id"]
                updates_nodes.append(row)
            current_line = None
            for row in sorted(by_plan["PDD_2020_2023"], key=lambda item: item["orden"]):
                if row["nivel"] == "LINEA":
                    current_line = row
                elif row["nivel"] == "PROGRAMA" and not row.get("parent_id") and current_line:
                    row["parent_id"] = current_line["id"]
                    updates_nodes.append(row)
            # For all plans, money is classified at the deepest node carrying an official PPI.
            for _plan_code, rows in by_plan.items():
                for row in rows:
                    metadata = dict(row.get("metadatos") or {})
                    grade, primary_dimension, weights = _classify(
                        row["nombre"], row["nivel"], metadata
                    )
                    metadata.update(
                        {
                            "grado_frontalidad_sh": grade,
                            "dimension_sh_primaria": primary_dimension,
                            "pesos_7d": weights,
                            "regla_clasificacion": "POLIS_SH_A_B_C_N_V1",
                            "unidad_agregacion_ppi": "NO_SUMAR_NODO_CON_DESCENDIENTES",
                        }
                    )
                    annual = row.get("ppi_anual_cop") or {}
                    if annual:
                        metadata["ppi_total_cop"] = sum(float(v or 0) for v in annual.values())
                        base_2019 = metadata.get("base_precios") == "COP constantes diciembre 2019"
                        metadata["ppi_total_constante_2025_cop"] = sum(
                            float(v or 0)
                            * (_money_factor(2019) if base_2019 else _money_factor(int(year)))
                            for year, v in annual.items()
                        )
                    row["metadatos"] = metadata
                    updates_nodes.append(row)
            # Link all goal rows to the best same-plan node; preserve explicit duplicate provenance.
            updates_metas = []
            node_lookup = {plan: rows for plan, rows in by_plan.items()}
            vision_rows_2012 = sorted(
                (row for row in meta_rows if row["codigo_plan"] == "PDD_2012_2015"),
                key=lambda row: row["fila_fuente"],
            )
            vision_goals_by_id = {
                row["id"]: (index, goal)
                for index, (row, goal) in enumerate(
                    zip(vision_rows_2012, VISION_METAS_2012, strict=True), start=1
                )
            }
            for meta in meta_rows:
                data = dict(meta.get("datos_oficiales") or {})
                meta_name = meta.get("nombre") or ""
                meta_indicator = meta.get("indicador") or ""
                meta_type = meta["tipo_meta"]
                meta_source = meta["fuente"]
                source_row_number = meta["fila_fuente"]
                official_goal = None
                if meta["codigo_plan"] == "PDD_2012_2015":
                    vision_order, official_goal = vision_goals_by_id[meta["id"]]
                    meta_name = official_goal["nombre"]
                    meta_indicator = official_goal["indicador"]
                    meta_type = "RESULTADO"
                    data.update(
                        {
                            "linea_base": official_goal["linea_base"],
                            "meta_cuatrienio": official_goal["meta_cuatrienio"],
                            "fuente_meta": "Acuerdo 001 de 2012, visión del plan, páginas impresas 1–2",
                            "correccion_ocr": "Sustituye fila OCR contaminada por compromiso verificable de la visión oficial.",
                        }
                    )
                    meta_source = (
                        "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf (visión oficial, pp. 1–2)"
                    )
                    source_row_number = vision_order
                    data["fila_fuente_reconstruida"] = (
                        f"Compromiso de visión {vision_order}; páginas impresas 1–2"
                    )
                duplicate = False
                if meta["codigo_plan"] == "PDD_2024_2027":
                    audit = data.get("_auditoria_forense", {})
                    canonical_flag = audit.get("es_meta_unica_canonica")
                    duplicate = canonical_flag is False or canonical_flag == "false"
                    if duplicate and audit.get("meta_canonica_id"):
                        data["procedencia_duplicada_de"] = audit["meta_canonica_id"]
                candidates = [
                    node
                    for node in node_lookup.get(meta["codigo_plan"], [])
                    if node["id"] not in deletions
                ]
                text_goal = _fold(
                    " ".join(
                        (
                            meta.get("linea_nombre") or "",
                            meta_name,
                            meta_indicator,
                        )
                    )
                )
                numbered = re.search(r"\b(\d+(?:\.\d+){0,3})\b", text_goal)
                chosen = None
                if official_goal:
                    chosen = next(
                        (
                            node
                            for node in candidates
                            if node["nivel"] == "EJE"
                            and str(node.get("codigo")) == official_goal["eje"]
                        ),
                        None,
                    )
                if numbered:
                    prefix = numbered.group(1)
                    if not chosen:
                        chosen = next(
                            (node for node in candidates if str(node.get("codigo") or "") == prefix),
                            None,
                        )
                if not chosen:
                    scored = []
                    tokens = {
                        word
                        for word in re.findall(r"[A-Z]{4,}", text_goal)
                        if word not in {"META", "INDICADOR", "RESULTADO", "PRODUCTO", "CARTAGENA"}
                    }
                    for node in candidates:
                        node_text = _fold(node["nombre"])
                        node_tokens = set(re.findall(r"[A-Z]{4,}", node_text))
                        overlap = len(tokens & node_tokens)
                        if (
                            _fold(meta.get("linea_nombre"))
                            and _fold(meta.get("linea_nombre")) in node_text
                        ):
                            overlap += 8
                        if overlap:
                            scored.append((overlap, node["id"]))
                    if scored:
                        best = max(scored)[0]
                        node_id = sorted(node_id for score, node_id in scored if score == best)[0]
                        chosen = next(node for node in candidates if node["id"] == node_id)
                if not chosen:
                    # A same-plan root is a valid and transparent fallback for unattributable OCR rows.
                    chosen = next(
                        (node for node in candidates if not node.get("parent_id")),
                        candidates[0] if candidates else None,
                    )
                if chosen:
                    grade, dimension, weights = _classify(
                        " ".join((meta_name, meta_indicator)),
                        meta_type,
                        data,
                    )
                    data.update(
                        {
                            "grado_frontalidad_sh": grade,
                            "dimension_sh_primaria": dimension,
                            "pesos_7d": weights,
                            "clasificacion_regla": "POLIS_SH_A_B_C_N_V1",
                            "vinculo_linea_metodo": "CODIGO_O_COINCIDENCIA_SEMANTICA_MISMO_PLAN",
                            "ocurrencia_canonica": not duplicate,
                        }
                    )
                    updates_metas.append(
                        {
                            "id": meta["id"],
                            "linea_id": chosen["id"],
                            "linea_nombre": chosen["nombre"],
                            "nombre": meta_name,
                            "indicador": meta_indicator,
                            "tipo_meta": meta_type,
                            "fuente": meta_source,
                            "fila_fuente": source_row_number,
                            "datos": json.dumps(data, ensure_ascii=False),
                        }
                    )
            if not dry_run:
                pdl_costs = (
                    (
                        "PDL_1_2024_2027",
                        {
                            "ppi_funcionamiento_cop": 6_868_680_000,
                            "ppi_inversion_cop": 90_822_361_529,
                        },
                    ),
                    (
                        "PDL_2_2024_2027",
                        {
                            "ppi_funcionamiento_cop": 7_041_451_395.56,
                            "ppi_inversion_cop": 154_248_545_013.45,
                        },
                    ),
                    (
                        "PDL_3_2024_2027",
                        {
                            "ppi_funcionamiento_cop": 7_000_000_000,
                            "ppi_inversion_cop": 39_000_000_000,
                        },
                    ),
                )
                for plan_code, details in pdl_costs:
                    await conn.execute(
                        text("""UPDATE seguimiento.planes_desarrollo_distrital
                        SET metadatos=coalesce(metadatos,'{}'::jsonb) || CAST(:data AS jsonb)
                        WHERE codigo_plan=:code"""),
                        {"code": plan_code, "data": json.dumps(details)},
                    )
                if deletions:
                    await conn.execute(
                        text(
                            "DELETE FROM seguimiento.pdd_lineas_y_programas WHERE id = ANY(CAST(:ids AS uuid[]))"
                        ),
                        {"ids": deletions},
                    )
                # Use JSON recordset updates to avoid mutating the source rows in place.
                unique_nodes = {row["id"]: row for row in updates_nodes}
                for row in unique_nodes.values():
                    await conn.execute(
                        text(
                            """UPDATE seguimiento.pdd_lineas_y_programas SET parent_id=CAST(:parent AS uuid), ppi_anual_cop=CAST(:annual AS jsonb), metadatos=CAST(:metadata AS jsonb) WHERE id=CAST(:id AS uuid)"""
                        ),
                        {
                            "id": row["id"],
                            "parent": row.get("parent_id"),
                            "annual": json.dumps(row.get("ppi_anual_cop") or {}),
                            "metadata": json.dumps(row.get("metadatos") or {}, ensure_ascii=False),
                        },
                    )
                # Insert any new canonical 2016 lines.
                known_ids = {r["id"] for r in node_rows} | set(deletions)
                for row in by_plan["PDD_2016_2019"]:
                    if row["id"] not in known_ids:
                        await conn.execute(
                            text(
                                """INSERT INTO seguimiento.pdd_lineas_y_programas (id,codigo_plan,parent_id,nivel,codigo,nombre,orden,ppi_anual_cop,fuente,metadatos) VALUES (CAST(:id AS uuid),:plan,CAST(:parent AS uuid),:nivel,:codigo,:nombre,:orden,CAST(:annual AS jsonb),:source,CAST(:metadata AS jsonb))"""
                            ),
                            {
                                "id": row["id"],
                                "plan": row["codigo_plan"],
                                "parent": row.get("parent_id"),
                                "nivel": row["nivel"],
                                "codigo": row.get("codigo"),
                                "nombre": row["nombre"],
                                "orden": row["orden"],
                                "annual": json.dumps(row.get("ppi_anual_cop") or {}),
                                "source": row.get("fuente"),
                                "metadata": json.dumps(
                                    row.get("metadatos") or {}, ensure_ascii=False
                                ),
                            },
                        )
                for row in updates_metas:
                    await conn.execute(
                        text(
                            """UPDATE seguimiento.pdd_metas_oficiales SET linea_id=CAST(:linea AS uuid), linea_nombre=:linea_nombre, nombre=:nombre, indicador=:indicador, tipo_meta=:tipo_meta, fuente=:fuente, fila_fuente=:fila_fuente, datos_oficiales=CAST(:datos AS jsonb) WHERE id=CAST(:id AS uuid)"""
                        ),
                        {
                            "id": row["id"],
                            "linea": row["linea_id"],
                            "linea_nombre": row["linea_nombre"],
                            "nombre": row["nombre"],
                            "indicador": row["indicador"],
                            "tipo_meta": row["tipo_meta"],
                            "fuente": row["fuente"],
                            "fila_fuente": row["fila_fuente"],
                            "datos": row["datos"],
                        },
                    )
                # Update plan facts and explicit 2013 timing note; never assert a 2013 appropriation.
                await conn.execute(
                    text(
                        """UPDATE seguimiento.planes_desarrollo_distrital
                        SET metadatos=coalesce(metadatos,'{}'::jsonb) || CAST(:data AS jsonb)
                        WHERE codigo_plan LIKE 'PDD_%'"""
                    ),
                    {
                        "data": json.dumps(
                            {
                                "reconstruccion": "MOTOR_EXTRACCION_HOMOLOGACION_PDD_SH_16",
                                "base_constante": "COP 2025 con IPC DANE disponible en backend",
                                "pdd_only": True,
                            }
                        )
                    },
                )
                await conn.execute(
                    text(
                        """UPDATE seguimiento.planes_desarrollo_distrital
                        SET metadatos=metadatos || CAST(:data AS jsonb)
                        WHERE codigo_plan='PDD_2013_2015'"""
                    ),
                    {
                        "data": json.dumps(
                            {
                                "nota_vigencia": "Plan atípico adoptado al final de 2013; el PPI documenta 2014-2015. No se imputa PPI para 2013.",
                                "norma_adopcion": "Acuerdo Distrital 016 de 2013",
                            }
                        )
                    },
                )
                for plan_row in plans:
                    code = plan_row["codigo_plan"]
                    annual = plan_row["ppi_anual_cop"] or {}
                    if code not in PLAN_PERIODS or not annual:
                        continue
                    if code == "PDD_2020_2023":
                        constant = sum(
                            float(value or 0) for value in annual.values()
                        ) * _money_factor(2019)
                    else:
                        constant = sum(
                            float(value or 0) * _money_factor(int(year))
                            for year, value in annual.items()
                        )
                    await conn.execute(
                        text(
                            "UPDATE seguimiento.planes_desarrollo_distrital SET ppi_total_constante_2025_cop=:value WHERE codigo_plan=:code"
                        ),
                        {"value": constant, "code": code},
                    )
            page_count = (
                await conn.execute(
                    text(
                        "SELECT count(*) FROM seguimiento.pdd_lineas_y_programas WHERE nombre ~* '^Página [0-9]+ \\(OCR Oficial'"
                    )
                )
            ).scalar_one()
            unlinked = (
                await conn.execute(
                    text(
                        "SELECT count(*) FROM seguimiento.pdd_metas_oficiales WHERE linea_id IS NULL"
                    )
                )
            ).scalar_one()
            plan_stats = (
                (
                    await conn.execute(
                        text(
                            """SELECT p.codigo_plan,p.ppi_total_corriente_cop,
                            (SELECT count(*) FROM seguimiento.pdd_lineas_y_programas n WHERE n.codigo_plan=p.codigo_plan) nodos,
                            (SELECT count(*) FROM seguimiento.pdd_lineas_y_programas n WHERE n.codigo_plan=p.codigo_plan AND n.parent_id IS NULL) roots,
                            (SELECT count(*) FROM seguimiento.pdd_metas_oficiales m WHERE m.codigo_plan=p.codigo_plan) metas,
                            (SELECT count(*) FROM seguimiento.pdd_metas_oficiales m WHERE m.codigo_plan=p.codigo_plan AND m.linea_id IS NOT NULL) linked
                            FROM seguimiento.planes_desarrollo_distrital p ORDER BY p.codigo_plan"""
                        )
                    )
                )
                .mappings()
                .all()
            )
            result.update(
                {
                    "eliminadas_pagina_ocr": len(deletions),
                    "nodos_clasificados": len({r["id"] for r in updates_nodes}),
                    "metas_enlazadas": len(updates_metas),
                    "metas": len(meta_rows),
                    "metas_sin_vinculo": unlinked,
                    "paginas_falsas_restantes": page_count,
                    "planes": [dict(row) for row in plan_stats],
                }
            )
    finally:
        await engine.dispose()
    return result


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(await rebuild(args.dry_run), ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
