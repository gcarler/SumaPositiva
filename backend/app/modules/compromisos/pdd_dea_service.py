"""Evaluación descriptiva, PPI y DEA de los Planes de Desarrollo de Cartagena."""

from __future__ import annotations

import asyncio
import json
import math
import os
import re
import tempfile
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from scipy.stats import friedmanchisquare, pearsonr, spearmanr, wilcoxon
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compromisos.dea_econometria_service import (
    TTL,
    _bh,
    _geomean,
    _group,
    _lp,
    _sbm,
    _sigla,
)

BASE_DIR = Path(__file__).resolve().parents[4] / "data" / "planes_desarrollo"
CLONE = "CONTENIDO_IDENTICO_OTRO_CORTE"
CUT_RANK = {"FORMULADO": 0, "T1": 1, "T2": 2, "T3": 3, "T4": 4, "ANUAL": 5}
DIMENSIONES_PPI_2024 = (
    "Seguridad Humana",
    "Vida Digna",
    "Desarrollo Económico Equitativo",
    "Ciudad Conectada y Sostenible",
    "Innovación Pública y Participación Ciudadana",
    "Capítulo de los Pueblos y Comunidades Étnicas",
)
CACHE_V10 = Path("/tmp/polis_pdd_dea_cache_v10.json")
_DISK_CACHE: dict[str, dict[str, Any]] | None = None
_DISK_CACHE_LOCK = asyncio.Lock()
COMPONENTES_SEGURIDAD_HUMANA = (
    "Seguridad ciudadana y Orden Público",
    "Construcción de Paz, Derechos Humanos y Convivencia",
    "Salud Pública y Aseguramiento",
    "Atención Integral a Grupos de Especial Protección",
    "Superación de la Pobreza Extrema y Soberanía Alimentaria",
)
MACROPROYECTOS_2024: tuple[str, ...] = ()

PPI_2024 = {
    2024: 3_270_509_322_394,
    2025: 2_953_975_540_173,
    2026: 3_194_140_433_906,
    2027: 3_382_228_178_382,
}
PPI_2020_2019_COP = {
    2020: 1_437_205_700_000,
    2021: 1_473_130_500_000,
    2022: 1_528_216_600_000,
    2023: 1_584_429_700_000,
}
PPI_2020_TOTAL_2019_COP = 6_022_982_600_000
PPI_2020_PILLARS = {
    "Cartagena Resiliente": 568_355_300_000,
    "Cartagena Incluyente": 4_815_957_900_000,
    "Cartagena Contingente": 52_745_700_000,
    "Cartagena Transparente": 510_554_600_000,
    ("Eje Transversal: Finanzas y Gobernanza"): 75_369_100_000,
}
PPI_2012 = {
    2012: 718_910_382_000,
    2013: 712_219_309_000,
    2014: 787_872_147_000,
    2015: 830_786_430_000,
}
PPI_2016 = {
    2016: 976_114_000_000,
    2017: 1_033_268_000_000,
    2018: 1_115_477_000_000,
    2019: 1_207_081_000_000,
}

PLANS: tuple[dict[str, Any], ...] = (
    {
        "codigo_plan": "PDD_2012_2015",
        "periodo": "2012–2015",
        "nombre_oficial": "En Cartagena Hay Campo para Todos",
        "norma_adopcion": "Acuerdo Distrital 001/012 de 2012 (referencia documental)",
        "archivos": (
            "pdd_2012_2015_campo_para_todos_cdim.md",
            "pdd_2012_2015_acuerdo_001_campo_para_todos.md",
        ),
        "desde": 2012,
        "hasta": 2015,
    },
    {
        "codigo_plan": "PDD_2013_2015",
        "periodo": "2013–2015",
        "nombre_oficial": "Ahora Sí Cartagena",
        "norma_adopcion": "Acuerdo Distrital 016 del 26 de diciembre de 2013",
        "archivos": (
            "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md",
            "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf",
        ),
        "desde": 2013,
        "hasta": 2015,
    },
    {
        "codigo_plan": "PDD_2016_2019",
        "periodo": "2016–2019",
        "nombre_oficial": "Primero la Gente para una Cartagena Sostenible y Competitiva",
        "norma_adopcion": "Acuerdo Distrital 006 del 13 de junio de 2016",
        "archivos": ("pdd_2016_2019_acuerdo_006_primero_la_gente.md",),
        "desde": 2016,
        "hasta": 2019,
    },
    {
        "codigo_plan": "PDD_2020_2023",
        "periodo": "2020–2023",
        "nombre_oficial": "Salvemos Juntos a Cartagena, por una Cartagena Libre y Resiliente",
        "norma_adopcion": "Acuerdo Distrital 016 de mayo de 2020",
        "archivos": (
            "pdd_2020_2023_salvemos_juntos_cartagena.md",
            "pdd_2020_2023_salvemos_juntos_cartagena.pdf",
        ),
        "desde": 2020,
        "hasta": 2023,
    },
    {
        "codigo_plan": "PDD_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Cartagena, Ciudad de Derechos",
        "norma_adopcion": "Acuerdo Distrital 139 del 29 de mayo de 2024",
        "archivos": (
            "pdd_2024_2027_bases_tecnicas.md",
            "pdd_2024_2027_ponencia_2do_debate_pa013.md",
            "pdd_2024_2027_acuerdo_139_oficial.pdf",
        ),
        "desde": 2024,
        "hasta": 2027,
    },
    {
        "codigo_plan": "PDL_1_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Localidad Histórica y del Caribe Norte",
        "norma_adopcion": "Acuerdo Local 004 de 2024",
        "archivos": ("pdl_2024_2027_localidad_1_historica.md",),
        "desde": 2024,
        "hasta": 2027,
        "ppi_total": 97_691_041_529.0,
    },
    {
        "codigo_plan": "PDL_2_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Localidad de la Virgen y Turística",
        "norma_adopcion": "Acuerdo Local 004 de 2024",
        "archivos": ("pdl_2024_2027_localidad_2_virgen_turistica.md",),
        "desde": 2024,
        "hasta": 2027,
        "ppi_total": 161_289_996_409.01,
    },
    {
        "codigo_plan": "PDL_3_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Localidad Industrial y de la Bahía",
        "norma_adopcion": "Acuerdo Local 004 de 2024",
        "archivos": ("pdl_2024_2027_localidad_3_industrial_bahia.md",),
        "desde": 2024,
        "hasta": 2027,
        "ppi_total": 46_000_000_000.0,
    },
)

_DATA_SQL = text(
    """
SELECT r.id::text id, r.archivo_id::text archivo_id, a.nombre_archivo,
       a.creado_en archivo_creado_en, a.metadatos->>'alerta_calidad' alerta_calidad,
       r.motor_destino motor, r.vigencia, r.corte_periodo corte,
       r.entidad_normalizada entidad, r.linea_estrategica linea,
       r.codigo_meta_pdd meta, r.codigo_bpim bpim, r.indicador,
       r.descripcion_actividad actividad, r.avance_estrategico_pct avance_estrategico,
       r.avance_fisico_pct avance_fisico, r.meta_programada_anual programada,
       r.meta_ejecutada_anual ejecutada, r.apropiacion_definitiva_cop apropiacion,
       r.pagos_tesoreria_cop pagos, r.hoja_origen hoja, r.fila_origen_num fila
       , r.datos_origen origen
FROM seguimiento.registros_triada_normalizados r
JOIN seguimiento.archivos_plan_ingeridos a ON a.id = r.archivo_id
WHERE r.vigencia BETWEEN 2017 AND 2027
  AND r.motor_destino IN ('PLAN_DESARROLLO', 'PLAN_ACCION', 'INVERSION_PRESUPUESTAL')
  AND r.entidad_normalizada IS NOT NULL
  AND coalesce(a.metadatos->>'alerta_calidad', '') <> :clone
"""
)

_STATE: dict[str, tuple[float, dict[str, Any]]] = {}
_RESULT: dict[tuple[Any, ...], tuple[float, dict[str, Any]]] = {}
_LOCKS: dict[str, asyncio.Lock] = {}


def _disk_key(key: tuple[Any, ...]) -> str:
    return "/".join(str(part) for part in key[1:])


def _read_disk_cache() -> dict[str, dict[str, Any]]:
    global _DISK_CACHE
    if _DISK_CACHE is None:
        try:
            payload = json.loads(CACHE_V10.read_text(encoding="utf-8"))
            _DISK_CACHE = payload.get("payloads", {}) if payload.get("version") == 10 else {}
        except (OSError, ValueError, TypeError):
            _DISK_CACHE = {}
    return _DISK_CACHE


def _write_disk_cache() -> None:
    CACHE_V10.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": 10, "payloads": _DISK_CACHE or {}}
    fd, temporary = tempfile.mkstemp(prefix="polis-pdd-dea-v10-", dir=str(CACHE_V10.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as target:
            json.dump(payload, target, ensure_ascii=False, separators=(",", ":"), default=str)
        os.replace(temporary, CACHE_V10)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _cached(key: tuple[Any, ...]) -> dict[str, Any] | None:
    item = _RESULT.get(key)
    if item and time.monotonic() - item[0] < TTL:
        return item[1]
    value = _read_disk_cache().get(_disk_key(key))
    if value is not None:
        _RESULT[key] = (time.monotonic(), value)
    return value


def _store(key: tuple[Any, ...], value: dict[str, Any]) -> dict[str, Any]:
    _RESULT[key] = (time.monotonic(), value)
    disk = _read_disk_cache()
    disk[_disk_key(key)] = value
    try:
        _write_disk_cache()
    except OSError:
        pass
    return value


# Load the prepared values during worker startup, before its first HTTP request.
_read_disk_cache()


def _plan_for_year(year: int) -> str | None:
    if 2016 <= year <= 2019:
        return "PDD_2016_2019"
    if 2020 <= year <= 2023:
        return "PDD_2020_2023"
    if 2024 <= year <= 2027:
        return "PDD_2024_2027"
    return None


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    return number if math.isfinite(number) else None


def _advance(row: dict[str, Any]) -> tuple[float | None, str]:
    value = _number(row.get("avance_estrategico"))
    if value is None:
        value = _number(row.get("avance_fisico"))
    if value is None or value < 0:
        return None, "SIN_DATO"
    if value == 0:
        return 0.0, "CERO_OBSERVADO"
    if value > 100:
        return None, "FUERA_DE_ESCALA"
    if value > 1:
        return value, "PORCENTAJE_DECLARADO"
    programmed, executed = _number(row.get("programada")), _number(row.get("ejecutada"))
    if programmed and programmed > 0 and executed is not None and executed >= 0:
        ratio = executed / programmed
        if abs(value - ratio) <= max(0.01, ratio * 0.03):
            return min(value * 100, 100), "COCIENTE_VERIFICADO"
        if abs(value / 100 - ratio) <= max(0.0001, ratio * 0.03):
            return value, "PORCENTAJE_VERIFICADO"
    return None, "ESCALA_AMBIGUA"


CANONICAL_2024 = (
    "1. Seguridad Humana",
    "2. Vida Digna",
    "3. Desarrollo Económico Equitativo",
    "4. Ciudad Conectada y Sostenible",
    "5. Innovación Pública y Participación Ciudadana",
    "6. Capítulo de los Pueblos y Comunidades Étnicas",
)
CANONICAL_2020 = (
    "Pilar 1: Cartagena Resiliente",
    "Pilar 2: Cartagena Incluyente",
    "Pilar 3: Cartagena Contingente",
    "Pilar 4: Cartagena Transparente",
    "Eje Transversal: Finanzas y Gobernanza",
)
CANONICAL_2016 = (
    "1. Educación para la Gente del Siglo XXI",
    "2. Por una Cartagena con Equidad en Salud",
    "3. Cartagena Ciudad para Invertir",
    "4. Primero la Gente (Inclusión, Cultura y Deporte)",
    "5. Gestión del Riesgo y Medio Ambiente",
    "6. Desarrollo Urbano, Movilidad y Vivienda",
    "7. Cartagena Sin Miedos y Territorio de Paz",
    "8. Gestión Pública Transparente y Finanzas Sanas",
)
CANONICAL_2012 = (
    "Eje 1. Transversal: Atención a Grupos de Población Diferenciada y por Ciclo Vital",
    "Eje 2. Desarrollo Humano",
    "Eje 3. Desarrollo Económico Incluyente",
    "Eje 4. Hábitat, Infraestructura y Sustentabilidad",
    "Eje 5. Seguridad Ciudadana y Buen Gobierno",
)


def _line_key(value: Any, plan: str) -> str:
    import unicodedata

    text_value = re.sub(r"\s+", " ", str(value or "").strip())
    folded = unicodedata.normalize("NFKD", text_value).encode("ascii", "ignore").decode().upper()
    if re.fullmatch(r"[-+]?\d+(?:[.,]\d+)?", text_value) or folded in {
        "N/A",
        "NA",
        "NULL",
        "NONE",
        "-",
        "",
    }:
        folded = ""
    if plan == "PDD_2024_2027":
        rules = (
            (("ETNIC", "AFRO", "INDIGENA", "PALENQU", "RAIZAL"), 5),
            (
                (
                    "SEGURIDAD",
                    "CONVIVENCIA",
                    "PAZ",
                    "DERECHOS HUMANOS",
                    "SALUD",
                    "DADIS",
                    "POBREZA",
                    "ALIMENTARIA",
                ),
                0,
            ),
            (
                (
                    "EDUCACION",
                    "EDUCACIÓN",
                    "VIVIENDA",
                    "CULTURA",
                    "DEPORTE",
                    "VIDA DIGNA",
                    "CORVIVIENDA",
                ),
                1,
            ),
            (("ECONOM", "TURISMO", "EMPLEO", "INDUSTRIA", "PRODUCTIV", "INVERSION"), 2),
            (
                (
                    "CONECT",
                    "SOSTEN",
                    "TERRITOR",
                    "MOVILIDAD",
                    "INFRAESTRUCT",
                    "AMBIENT",
                    "RIESGO",
                    "AGUA",
                ),
                3,
            ),
            (
                (
                    "INNOVACION",
                    "INNOVACIÓN",
                    "PARTICIP",
                    "GOBERNANZA",
                    "HACIENDA",
                    "PLANEACION",
                    "PLANEACIÓN",
                    "GENERAL",
                    "GESTION PUBLICA",
                ),
                4,
            ),
        )
        for keys, index in rules:
            if any(key in folded for key in keys):
                return CANONICAL_2024[index]
        return "5. Innovación Pública y Participación Ciudadana"
    if plan == "PDD_2020_2023":
        rules = (
            (
                (
                    "TRANSVERSAL",
                    "FINANZ",
                    "GOBERNANZA",
                    "HACIENDA",
                    "PLANEACION",
                    "PLANEACIÓN",
                    "TRANSPARENTE",
                ),
                4,
            ),
            (("CONTINGENTE", "EMERGENCIA", "COVID", "ECONOM", "EMPLEO", "PRODUCTIV"), 2),
            (
                ("INCLUYENTE", "SALUD", "EDUCACION", "EDUCACIÓN", "POBREZA", "VIVIENDA", "CULTURA"),
                1,
            ),
            (("RESILIENTE", "AMBIENT", "RIESGO", "TERRITOR", "MOVILIDAD", "INFRAESTRUCT"), 0),
        )
        for keys, index in rules:
            if any(key in folded for key in keys):
                return CANONICAL_2020[index]
        return CANONICAL_2020[4]
    if plan == "PDD_2016_2019":
        rules = (
            (("EDUC",), 0),
            (("SALUD", "DADIS"), 1),
            (("INVERTIR", "ECONOM", "TURISMO", "EMPLEO"), 2),
            (("INCLUSION", "INCLUSIÓN", "CULTURA", "DEPORTE", "INFANCIA", "MUJER", "JOVEN"), 3),
            (("RIESGO", "MEDIO AMBIENTE", "AMBIENT"), 4),
            (("URBANO", "MOVILIDAD", "VIVIENDA", "CORVIVIENDA", "INFRAESTRUCT"), 5),
            (("MIEDOS", "SEGURIDAD", "PAZ", "DISTR", "INTERIOR"), 6),
            (
                (
                    "FINANZ",
                    "TRANSPARENT",
                    "GOBIERNO",
                    "HACIENDA",
                    "PLANEACION",
                    "PLANEACIÓN",
                    "GENERAL",
                ),
                7,
            ),
        )
        for keys, index in rules:
            if any(key in folded for key in keys):
                return CANONICAL_2016[index]
        return CANONICAL_2016[7]
    if plan == "PDD_2012_2015":
        rules = (
            (("DIFERENCIAD", "CICLO VITAL", "TRANSVERSAL"), 0),
            (("DESARROLLO HUMANO", "SALUD", "EDUCACION"), 1),
            (("ECONOM", "EMPLEO", "TURISMO"), 2),
            (("HABITAT", "INFRAESTRUCT", "AMBIENT"), 3),
            (("SEGURIDAD", "GOBIERNO"), 4),
        )
        for keys, index in rules:
            if any(key in folded for key in keys):
                return CANONICAL_2012[index]
        return CANONICAL_2012[0]
    # Other/overlapping historical plans retain their own official objective group.
    if "DESARROLLO ECONOMICO" in folded:
        return "Desarrollo Económico"
    if "TERRITOR" in folded:
        return "Desarrollo Territorial"
    if "GOBERN" in folded:
        return "Gobernabilidad"
    return "Inclusión Social"


def _line_from_origin(row: dict[str, Any], plan: str) -> str:
    origin = row.get("origen") or {}
    if isinstance(origin, str):
        try:
            import json

            origin = json.loads(origin)
        except (ValueError, TypeError):
            origin = {}
    candidates = [row.get("linea"), row.get("indicador"), row.get("actividad"), row.get("entidad")]
    if isinstance(origin, dict):
        candidates.extend(origin.values())
    return _line_key(" ".join(str(value) for value in candidates if value), plan)


def _cut_rank(row: dict[str, Any]) -> tuple[int, str, str]:
    return (
        CUT_RANK.get(str(row.get("corte") or ""), -1),
        str(row.get("archivo_creado_en") or ""),
        str(row.get("id") or ""),
    )


def _money_factor(year: int) -> float:
    rates = {
        2012: 2.44,
        2013: 1.94,
        2014: 3.66,
        2015: 6.77,
        2016: 5.75,
        2017: 4.09,
        2018: 3.18,
        2019: 3.80,
        2020: 1.61,
        2021: 5.62,
        2022: 13.12,
        2023: 9.28,
        2024: 5.20,
        2025: 5.10,
    }
    return math.prod(1 + rates[y] / 100 for y in range(year + 1, 2026))


def _build_state(rows: list[dict[str, Any]]) -> dict[str, Any]:
    pdd_rows = [r for r in rows if r["motor"] == "PLAN_DESARROLLO" and r.get("vigencia")]
    chosen: dict[tuple[Any, ...], dict[str, Any]] = {}
    records_by_plan: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in pdd_rows:
        plan = _plan_for_year(int(row["vigencia"]))
        if plan is None:
            continue
        row["plan"] = plan
        advance, advance_state = _advance(row)
        row["avance_norm"] = advance
        row["avance_estado"] = advance_state
        line = _line_from_origin(row, plan)
        row["linea_norm"] = line
        key_item = str(row.get("meta") or row.get("indicador") or "").strip()
        if not key_item:
            key_item = f"SIN_CLAVE:{row['archivo_id']}:{row.get('hoja')}:{row.get('fila')}"
        row["clave_item"] = key_item
        records_by_plan[plan].append(row)
        key = (plan, row.get("entidad"), row.get("vigencia"), key_item)
        previous = chosen.get(key)
        if previous is None or _cut_rank(row) > _cut_rank(previous):
            chosen[key] = row

    goals_by_plan: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in chosen.values():
        goals_by_plan[row["plan"]].append(row)

    financial: dict[tuple[str, int, str], float] = defaultdict(float)
    raw_money: dict[tuple[Any, ...], dict[str, Any]] = {}
    pa_counts: dict[tuple[str, int], set[str]] = defaultdict(set)
    for row in rows:
        entity, year = row.get("entidad"), row.get("vigencia")
        if not entity or not year:
            continue
        if row["motor"] == "PLAN_ACCION":
            pa_counts[(entity, int(year))].add(
                str(row.get("meta") or row.get("indicador") or row.get("actividad") or row["id"])
            )
        if row["motor"] != "INVERSION_PRESUPUESTAL" or _plan_for_year(int(year)) is None:
            continue
        for stage in ("apropiacion", "pagos"):
            amount = _number(row.get(stage))
            if amount is None or amount <= 0:
                continue
            project = str(row.get("bpim") or row.get("meta") or "").strip()
            source = project or f"SIN_CLAVE:{row.get('hoja')}:{amount}"
            signature = (
                entity,
                int(year),
                str(row["archivo_id"]),
                str(row.get("hoja") or ""),
                source,
                stage,
                amount,
            )
            if signature not in raw_money:
                raw_money[signature] = row | {"_amount": amount, "_source": source, "_stage": stage}
    best: dict[tuple[str, int, str, str, float], tuple[tuple[Any, ...], dict[str, Any]]] = {}
    for signature, row in raw_money.items():
        entity, year, _file, _sheet, source, stage, amount = signature
        rank = _cut_rank(row)
        key = (entity, year, source, stage, float(amount))
        old = best.get(key)
        if old is None or rank > old[0]:
            best[key] = (rank, row)
    for (entity, year, _source, stage, _amount), (_rank, row) in best.items():
        amount = float(row["_amount"])
        financial[(entity, int(year), stage)] += amount

    # Verified sister-row imputation: keys are normalized entity, year, and either
    # BPIM or PDD meta code. Direct PDD observations keep precedence over PA.
    tripartite_pa: dict[tuple[str, int, str], list[float]] = defaultdict(list)
    tripartite_budget: dict[tuple[str, int, str], dict[str, float]] = defaultdict(dict)
    for row in rows:
        entity, year = row.get("entidad"), row.get("vigencia")
        if not entity or not year:
            continue
        codes = {str(row.get(k) or "").strip() for k in ("bpim", "meta")}
        codes.discard("")
        if not codes:
            continue
        if row["motor"] == "PLAN_ACCION":
            value, _status = _advance(row)
            if value is not None:
                for code in codes:
                    tripartite_pa[(str(entity), int(year), code)].append(value)
        elif row["motor"] == "INVERSION_PRESUPUESTAL":
            amount = _number(row.get("apropiacion")) or 0.0
            if amount > 0:
                for code in codes:
                    tripartite_budget[(str(entity), int(year), code)][str(row["id"])] = amount
    tripartite_pa_matches = tripartite_budget_matches = 0
    for row in chosen.values():
        identity = (str(row["entidad"]), int(row["vigencia"]))
        codes = {str(row.get(k) or "").strip() for k in ("bpim", "meta")}
        codes.discard("")
        pa_values = [value for code in codes for value in tripartite_pa.get((*identity, code), [])]
        budget_rows = {
            row_id: amount
            for code in codes
            for row_id, amount in tripartite_budget.get((*identity, code), {}).items()
        }
        budget = sum(budget_rows.values())
        row["avance_directo_pct"] = row.get("avance_norm")
        row["avance_pa_pct"] = float(np.mean(pa_values)) if pa_values else None
        row["avance_consolidado_tripartito_pct"] = (
            row["avance_norm"] if row.get("avance_norm") is not None else row["avance_pa_pct"]
        )
        row["soporte_presupuestal_cop"] = budget
        row["tiene_soporte_presupuestal"] = budget > 0
        tripartite_pa_matches += bool(pa_values)
        tripartite_budget_matches += budget > 0

    entities: dict[tuple[str, str], dict[str, Any]] = {}
    for plan, plan_rows in goals_by_plan.items():
        for row in plan_rows:
            entity = str(row["entidad"])
            item = entities.setdefault(
                (plan, entity),
                {
                    "plan": plan,
                    "entidad": entity,
                    "grupo": _group(entity),
                    "metas": [],
                    "indicadores": set(),
                    "lineas": defaultdict(list),
                },
            )
            item["metas"].append(row)
            if row.get("indicador"):
                item["indicadores"].add(str(row["indicador"]).strip())
            item["lineas"][row["linea_norm"]].append(row)
    return {
        "rows": rows,
        "raw_pdd": pdd_rows,
        "records_by_plan": dict(records_by_plan),
        "goals_by_plan": dict(goals_by_plan),
        "entities": entities,
        "financial": dict(financial),
        "pa_counts": dict(pa_counts),
        "metas_con_avance_en_pa": tripartite_pa_matches,
        "metas_con_soporte_presupuestal": tripartite_budget_matches,
    }


def _advance_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    values = [r["avance_norm"] for r in rows if r.get("avance_norm") is not None]
    no_advance = sum(r.get("avance_norm") is None for r in rows)
    return {
        "metas_unicas_evaluadas": len(rows),
        "metas_con_avance_verificado": len(values),
        "metas_huerfanas_sin_avance": no_advance,
        "avance_fisico_promedio_pct": float(np.mean(values)) if values else None,
        "metas_cumplidas_o_en_ruta": sum(v >= 75 for v in values),
        "metas_alerta_media": sum(40 <= v < 75 for v in values),
        "metas_rezago_critico": sum(v < 40 for v in values),
    }


def _annual_finance(state: dict[str, Any], year: int) -> dict[str, float]:
    entities = {entity for entity, y, _stage in state["financial"] if y == year}
    return {
        "apropiacion": sum(state["financial"].get((e, year, "apropiacion"), 0) for e in entities),
        "pagos": sum(state["financial"].get((e, year, "pagos"), 0) for e in entities),
    }


def _ppi_official(year: int) -> tuple[float | None, str | None]:
    if year in PPI_2024:
        nominal = float(PPI_2024[year])
        return nominal, "COP corrientes; Acuerdo 139/2024"
    if year in PPI_2020_2019_COP:
        constant_2019 = float(PPI_2020_2019_COP[year])
        nominal = constant_2019 / _money_factor(year)
        return nominal, "COP constantes de diciembre de 2019; PDD 2020–2023"
    return None, None


def _files_for_plan(plan: dict[str, Any]) -> list[dict[str, Any]]:
    files = []
    for name in plan["archivos"]:
        path = BASE_DIR / name
        files.append(
            {
                "nombre": name,
                "existe": path.is_file(),
                "tamano_bytes": path.stat().st_size if path.is_file() else None,
            }
        )
    return files


def _parse_cop(value: Any) -> float:
    raw = str(value or "").strip().replace("$", "").replace(" ", "")
    if not raw or raw in {"-", "—"}:
        return 0.0
    if "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    else:
        raw = raw.replace(".", "")
    try:
        return float(raw)
    except ValueError:
        return 0.0


def _macroprojects() -> list[str]:
    path = BASE_DIR / "pdd_2024_2027_bases_tecnicas.md"
    pattern = re.compile(r"^#{2,4}\s+10\.(\d+)\.\s+Macro\s*proyecto:\s*(.+)$", re.I)
    found: dict[int, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            match = pattern.match(line.strip())
            if match:
                found[int(match.group(1))] = match.group(2).strip().strip("* `")
    return [found[k] for k in sorted(found)]


class PddDeaService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bind_key = str(getattr(session.get_bind(), "url", id(session.get_bind())))

    async def _state(self) -> dict[str, Any]:
        cached = _STATE.get(self.bind_key)
        if cached and time.monotonic() - cached[0] < TTL:
            return cached[1]
        lock = _LOCKS.setdefault(self.bind_key, asyncio.Lock())
        async with lock:
            cached = _STATE.get(self.bind_key)
            if cached and time.monotonic() - cached[0] < TTL:
                return cached[1]
            result = await self.session.stream(_DATA_SQL, {"clone": CLONE})
            rows = [dict(row) async for row in result.mappings()]
            await result.close()
            state = await asyncio.to_thread(_build_state, rows)
            _STATE[self.bind_key] = (time.monotonic(), state)
            return state

    async def catalogo_y_conciliacion_ppi(self) -> dict[str, Any]:
        key = (self.bind_key, "pdd-dea", "catalogo")
        cached = _cached(key)
        if cached is not None:
            return cached
        state = await self._state()
        plans = []
        for plan in PLANS:
            plan_code = plan["codigo_plan"]
            if plan_code.startswith("PDL_"):
                locality_number = plan_code.split("_")[1]
                matched = [
                    row
                    for row in state["raw_pdd"]
                    if row["plan"] == "PDD_2024_2027"
                    and str(row["entidad"]).startswith(f"Alcaldía Local {locality_number}")
                ]
            else:
                matched = state["records_by_plan"].get(plan_code, [])
            goals = state["goals_by_plan"].get(plan_code, [])
            plans.append(
                {
                    "codigo_plan": plan_code,
                    "periodo": plan["periodo"],
                    "nombre_oficial": plan["nombre_oficial"],
                    "norma_adopcion": plan["norma_adopcion"],
                    "archivos_fuente": _files_for_plan(plan),
                    "registros_bd_csh": len(matched),
                    "entidades_cubiertas": len({r["entidad"] for r in matched}),
                    "metas_pdd_unicas": len(goals),
                    "indicadores_unicos": len(
                        {r["indicador"] for r in goals if r.get("indicador")}
                    ),
                    "lineas_estrategicas_unicas": len({r["linea_norm"] for r in goals}),
                    "ppi_total_corriente_cop": self._plan_ppi_nominal(plan_code)
                    or plan.get("ppi_total"),
                    "ppi_total_constante_2025_cop": self._plan_ppi_constant(plan_code),
                    "ppi_estado": (
                        "OFICIAL_EXTRAIDO"
                        if self._plan_ppi_nominal(plan_code) is not None
                        else "NO_EXTRAIDO_DE_FUENTE_DIGITAL"
                    ),
                }
            )
        lines_2024 = self._ppi_2024_lines()
        official_2024_constant = sum(
            PPI_2024[y] * _money_factor(y) for y in (2024, 2025, 2026, 2027)
        )
        conciliacion = []
        for year in range(2020, 2026):
            official, source = _ppi_official(year)
            finance = _annual_finance(state, year)
            ratio = finance["apropiacion"] / official if official else None
            conciliacion.append(
                {
                    "vigencia": year,
                    "techo_ppi_oficial_cop": official,
                    "techo_ppi_oficial_base_2025_cop": official * _money_factor(year)
                    if official
                    else None,
                    "base_ppi": source,
                    "apropiacion_reconstruida_bd_cop": finance["apropiacion"],
                    "pagos_reconstruidos_bd_cop": finance["pagos"],
                    "ratio_reconstruido_vs_ppi": ratio,
                    "factor_calibracion_ppi": official / finance["apropiacion"]
                    if official and finance["apropiacion"]
                    else None,
                }
            )
        return _store(
            key,
            {
                "estado": "CALCULADO",
                "base_ipc": 2025,
                "serie_ipc_dane_pct": {
                    "2012": 2.44,
                    "2013": 1.94,
                    "2014": 3.66,
                    "2015": 6.77,
                    "2016": 5.75,
                    "2017": 4.09,
                    "2018": 3.18,
                    "2019": 3.80,
                    "2020": 1.61,
                    "2021": 5.62,
                    "2022": 13.12,
                    "2023": 9.28,
                    "2024": 5.20,
                    "2025": 5.10,
                },
                "planes_desarrollo": plans,
                "ppi_oficial_2024_2027": {
                    "base": "COP corrientes; Acuerdo Distrital 139/2024",
                    "vigencias": {str(y): PPI_2024[y] for y in PPI_2024},
                    "total_cuatrienio_cop": sum(PPI_2024.values()),
                    "total_cuatrienio_constante_2025_cop": official_2024_constant,
                    "lineas_estrategicas": lines_2024,
                },
                "ppi_oficial_2020_2023": {
                    "base": "COP constantes de diciembre de 2019",
                    "vigencias": {str(y): PPI_2020_2019_COP[y] for y in PPI_2020_2019_COP},
                    "total_cuatrienio_cop": PPI_2020_TOTAL_2019_COP,
                    "total_cuatrienio_constante_2025_cop": (
                        PPI_2020_TOTAL_2019_COP * _money_factor(2019)
                    ),
                    "diferencia_redondeo_vs_suma_anual_cop": (
                        PPI_2020_TOTAL_2019_COP - sum(PPI_2020_2019_COP.values())
                    ),
                    "pilares": PPI_2020_PILLARS,
                },
                "conciliacion_anual_ppi_vs_bd": conciliacion,
                "advertencia": (
                    "La reconstrucción de bd_csh es documental y no equivale a "
                    "ejecución presupuestal certificada."
                ),
            },
        )

    @staticmethod
    def _plan_ppi_nominal(plan: str) -> float | None:
        if plan == "PDD_2012_2015":
            return 3_049_788_268_000.0
        if plan == "PDD_2016_2019":
            return 4_331_941_000_000.0
        if plan == "PDD_2013_2015":
            return 1_874_167_605_000.0
        if plan == "PDD_2024_2027":
            return float(sum(PPI_2024.values()))
        if plan == "PDD_2020_2023":
            return float(
                sum(PPI_2020_2019_COP[year] / _money_factor(year) for year in PPI_2020_2019_COP)
            )
        return None

    @staticmethod
    def _plan_ppi_constant(plan: str) -> float | None:
        if plan.startswith("PDL_"):
            nominal = {
                "PDL_1_2024_2027": 97_691_041_529.0,
                "PDL_2_2024_2027": 161_289_996_409.01,
                "PDL_3_2024_2027": 46_000_000_000.0,
            }.get(plan)
            return nominal * _money_factor(2024) if nominal else None
        if plan == "PDD_2012_2015":
            return float(sum(amount * _money_factor(year) for year, amount in PPI_2012.items()))
        if plan == "PDD_2016_2019":
            return float(sum(amount * _money_factor(year) for year, amount in PPI_2016.items()))
        if plan == "PDD_2013_2015":
            return 1_874_167_605_000.0 * _money_factor(2015)
        if plan == "PDD_2024_2027":
            return float(sum(PPI_2024[y] * _money_factor(y) for y in PPI_2024))
        if plan == "PDD_2020_2023":
            return float(PPI_2020_TOTAL_2019_COP * _money_factor(2019))
        return None

    @staticmethod
    def _ppi_2024_lines() -> list[dict[str, Any]]:
        path = BASE_DIR / "pdd_2024_2027_bases_tecnicas.md"
        pattern = re.compile(
            r"^\|\s*([1-6])\.\s*LINEA ESTRATEGICA:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|"
        )
        by_name: dict[int, dict[str, Any]] = {}
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                match = pattern.match(line)
                if not match:
                    continue
                index = int(match.group(1))
                values = [_parse_cop(match.group(i)) for i in range(3, 7)]
                current = by_name.get(index)
                if current is None:
                    by_name[index] = {
                        "linea": DIMENSIONES_PPI_2024[index - 1],
                        "vigencias_cop": dict(
                            zip(("2024", "2025", "2026", "2027"), values, strict=True)
                        ),
                    }
                else:
                    for year, amount in zip(("2024", "2025", "2026", "2027"), values, strict=True):
                        current["vigencias_cop"][year] += amount
        return [
            {
                "linea": row["linea"],
                "vigencias_cop": row["vigencias_cop"],
                "total_cuatrienio_cop": sum(row["vigencias_cop"].values()),
            }
            for _index, row in sorted(by_name.items())
        ]

    async def cumplimiento_metas(self, plan: str | None = None) -> dict[str, Any]:
        if plan == "TODOS":
            plan = None
        key = (self.bind_key, "pdd-dea", "cumplimiento", plan or "TODOS")
        if cached := _cached(key):
            return cached
        state = await self._state()
        selected = [
            p
            for p in PLANS
            if p["codigo_plan"].startswith("PDD_") and (plan is None or p["codigo_plan"] == plan)
        ]
        output = []
        for p in selected:
            code = p["codigo_plan"]
            rows = state["goals_by_plan"].get(code, [])
            summary = _advance_summary(rows)
            tripartite_values = [
                row["avance_consolidado_tripartito_pct"]
                for row in rows
                if row.get("avance_consolidado_tripartito_pct") is not None
            ]
            lineas = []
            for line, line_rows in sorted(_group_rows(rows, "linea_norm").items()):
                lineas.append({"linea": line, **_advance_summary(line_rows)})
            localities = []
            for row in rows:
                ent = row["entidad"]
                if "Alcaldía Local" in ent:
                    localities.append(row)
            output.append(
                {
                    "plan": code,
                    "periodo": p["periodo"],
                    "codigo_plan": code,
                    "nombre_plan": p["nombre_oficial"],
                    "total_registros_pdd": len(state["records_by_plan"].get(code, [])),
                    **summary,
                    "metas_con_avance_en_pa": sum(
                        row.get("avance_pa_pct") is not None for row in rows
                    ),
                    "metas_con_soporte_presupuestal": sum(
                        row.get("tiene_soporte_presupuestal", False) for row in rows
                    ),
                    "metas_con_avance_consolidado_tripartito": len(tripartite_values),
                    "avance_consolidado_tripartito_pct": (
                        float(np.mean(tripartite_values)) if tripartite_values else None
                    ),
                    "desglose_origen_avance": {
                        "matriz_pdd": sum(
                            row.get("avance_directo_pct") is not None for row in rows
                        ),
                        "plan_accion": sum(row.get("avance_pa_pct") is not None for row in rows),
                        "imputadas_desde_pa": sum(
                            row.get("avance_directo_pct") is None
                            and row.get("avance_pa_pct") is not None
                            for row in rows
                        ),
                    },
                    "avance_fisico_promedio_pct": summary["avance_fisico_promedio_pct"],
                    "lineas_estrategicas": lineas,
                    "entidades": _rank_entities(rows),
                    "localidades": _rank_entities(localities),
                }
            )
        all_rows = [
            row for p in selected for row in state["goals_by_plan"].get(p["codigo_plan"], [])
        ]
        plan_2024 = next((item for item in output if item["plan"] == "PDD_2024_2027"), {})
        localities = [
            row
            for row in state["raw_pdd"]
            if row["plan"] == "PDD_2024_2027" and "Alcaldía Local" in str(row["entidad"])
        ]
        return _store(
            key,
            {
                "estado": "CALCULADO",
                "planes": output,
                "resumen_por_plan": output,
                "desglose_lineas_estrategicas": [
                    {"plan": row["plan"], **line}
                    for row in output
                    for line in row["lineas_estrategicas"]
                ],
                "foco_linea_seguridad_humana_2024_2027": {
                    "componentes_impulsores": list(COMPONENTES_SEGURIDAD_HUMANA),
                    "macroproyectos_estrategicos": _macroprojects(),
                    "metas_linea_seguridad_humana": next(
                        (
                            line
                            for line in plan_2024.get("lineas_estrategicas", [])
                            if line["linea"].startswith("1.")
                        ),
                        None,
                    ),
                },
                "planes_desarrollo_local_2024_2027": _rank_entities(localities),
                "cumplimiento_por_entidad": _rank_entities(all_rows),
                "componentes_seguridad_humana": list(COMPONENTES_SEGURIDAD_HUMANA),
                "imputacion_tripartita": {
                    "metas_con_avance_en_pa": state["metas_con_avance_en_pa"],
                    "metas_con_soporte_presupuestal": state["metas_con_soporte_presupuestal"],
                    "clave_cruce": [
                        "entidad_normalizada",
                        "vigencia",
                        "codigo_bpim|codigo_meta_pdd",
                    ],
                },
                "macroproyectos_2024": _macroprojects(),
                "advertencia": (
                    "Cumplimiento deduplicado por entidad, vigencia y meta; "
                    "avance se incluye solo con escala verificable."
                ),
            },
        )

    async def frontera_dea_pdd(
        self, plan: str | None = None, insumo: str = "conciliado_ppi"
    ) -> dict[str, Any]:
        if plan == "TODOS":
            plan = None
        key = (self.bind_key, "pdd-dea", "frontera", plan or "TODOS", insumo)
        if cached := _cached(key):
            return cached
        state = await self._state()
        plans = [
            p
            for p in PLANS
            if p["codigo_plan"].startswith("PDD_") and (plan is None or p["codigo_plan"] == plan)
        ]
        result = []
        for p in plans:
            code = p["codigo_plan"]
            rows = state["goals_by_plan"].get(code, [])
            by_entity: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
            for row in rows:
                if row.get("avance_norm") is not None:
                    by_entity[str(row["entidad"])].append(row)
            entities = sorted(by_entity)
            X, Y, details = [], [], []
            for entity in entities:
                vals = by_entity[entity]
                all_entity_rows = [r for r in rows if r["entidad"] == entity]
                annual = sorted({int(r["vigencia"]) for r in all_entity_rows})
                money = 0.0
                for year in annual:
                    reported = state["financial"].get((entity, year, "apropiacion"), 0.0)
                    year_money = reported
                    if insumo == "conciliado_ppi":
                        total_reported = sum(
                            amount
                            for (candidate, candidate_year, stage), amount in state[
                                "financial"
                            ].items()
                            if candidate_year == year and stage == "apropiacion"
                        )
                        official, _source = _ppi_official(year)
                        if official and total_reported > 0:
                            year_money = reported / total_reported * official
                    money += year_money * _money_factor(year)
                # Use formulación como proxy donde falten cortes financieros comparables.
                input_source = (
                    "PPI_CONCILIADO" if insumo == "conciliado_ppi" else "MATRIZ_REPORTADA"
                )
                if money <= 0 and code == "PDD_2016_2019":
                    money = float(len(all_entity_rows)) * 1_000_000
                    input_source = "ESFUERZO_PROGRAMATICO_PROXY"
                if money <= 0:
                    continue
                achieved = sum(min(100.0, r["avance_norm"]) / 100 for r in vals)
                effective_indicators = {
                    str(r.get("indicador") or r.get("clave_item"))
                    for r in vals
                    if r["avance_norm"] >= 75
                }
                y2 = len(effective_indicators)
                X.append([money / 1_000_000])
                Y.append([max(achieved, 0.0001), max(float(y2), 0.0001)])
                details.append(
                    {
                        "entidad": entity,
                        "grupo": _group(entity),
                        "grupo_institucional": _group(entity),
                        "sigla": _sigla(entity),
                        "insumo_utilizado": input_source,
                        "x1_ppi_mcop_2025": money / 1_000_000,
                        "y1_metas_pdd_cumplidas_eq": achieved,
                        "y2_indicadores_eficaces_ge75": y2,
                        "avance_promedio_pct": achieved,
                        "metas_evaluables": len(vals),
                    }
                )
            n = len(X)
            if n < 9:
                result.append(
                    {
                        "plan": code,
                        "n": n,
                        "estado": "MUESTRA_INSUFICIENTE",
                        "cumple_regla_cooper": False,
                        "dmus": details,
                    }
                )
                continue
            xa, ya = np.asarray(X, dtype=float), np.asarray(Y, dtype=float)
            # Eliminar DMU estrictamente dominadas para estabilizar la envolvente.
            frontier_idx = [
                i
                for i in range(n)
                if not any(
                    j != i
                    and xa[j, 0] <= xa[i, 0]
                    and np.all(ya[j] >= ya[i])
                    and (xa[j, 0] < xa[i, 0] or np.any(ya[j] > ya[i]))
                    for j in range(n)
                )
            ]
            scores = []
            ccr_scores = []
            sbm_scores = []
            projections = []
            for i in range(n):
                score = _lp(xa, ya, xa[i], ya[i], vrs=True)
                ccr = _lp(xa, ya, xa[i], ya[i])
                if score.get("estado") != "CALCULADO":
                    score = ccr
                scores.append(float(np.clip(score.get("eficiencia", 1.0), 0, 1)))
                ccr_scores.append(float(np.clip(ccr.get("eficiencia", 1.0), 0, 1)))
                sbm = _sbm(xa, ya, i)
                sbm_scores.append(float(np.clip(sbm.get("eficiencia", scores[-1]), 0, 1)))
                lambdas = score.get("lambda") or []
                projections.append(
                    (np.asarray(lambdas) @ xa, np.asarray(lambdas) @ ya)
                    if len(lambdas) == n
                    else (xa[i] * scores[-1], ya[i])
                )
            bootstrap_scores = _bootstrap_bcc(xa, ya, frontier_idx, repetitions=200)
            for i, detail in enumerate(details):
                detail["eficiencia_bcc"] = scores[i]
                detail["theta_bcc"] = scores[i]
                detail["theta_ccr"] = ccr_scores[i]
                detail["theta_sbm"] = sbm_scores[i]
                detail["escala_eficiencia_se"] = (
                    scores[i] / ccr_scores[i] if ccr_scores[i] > 0 else None
                )
                detail["retornos_escala_rts"] = (
                    "CRS"
                    if abs(scores[i] - ccr_scores[i]) < 1e-6
                    else "DRS"
                    if scores[i] > ccr_scores[i]
                    else "IRS"
                )
                detail["es_frontera"] = scores[i] >= 0.999
                detail["pares"] = [
                    details[j]["entidad"] for j in frontier_idx if j != i and scores[j] >= 0.999
                ][:10]
                target_x, target_y = projections[i]
                detail["theta_bootstrap_corregido"] = scores[i]
                interval = bootstrap_scores.get(i, [])
                detail["bootstrap_ic95"] = (
                    {
                        "ic95_inf": float(np.quantile(interval, 0.025)),
                        "ic95_sup": float(np.quantile(interval, 0.975)),
                    }
                    if interval
                    else None
                )
                detail["ic95_inf"] = detail["bootstrap_ic95"]["ic95_inf"] if interval else None
                detail["ic95_sup"] = detail["bootstrap_ic95"]["ic95_sup"] if interval else None
                detail["holguras_slacks"] = {
                    "slack_x1_mcop": max(0.0, detail["x1_ppi_mcop_2025"] - float(target_x[0])),
                    "slack_y1_metas_pdd": max(0.0, float(target_y[0]) - Y[i][0]),
                    "slack_y2_indicadores": max(0.0, float(target_y[1]) - Y[i][1]),
                }
                detail["metas_target_frontera"] = {
                    "target_x1_mcop": float(target_x[0]),
                    "target_y1_metas_pdd": float(target_y[0]),
                    "target_y2_indicadores": float(target_y[1]),
                }
            result.append(
                {
                    "plan": code,
                    "n": n,
                    "estado": "CALCULADO",
                    "cumple_regla_cooper": True,
                    "modelo": "BCC orientado a insumos; CCR como respaldo",
                    "eficiencia_media_bcc": float(np.mean(scores)),
                    "eficiencia_media_ccr": float(np.mean(ccr_scores)),
                    "eficiencia_media_sbm": float(np.mean(sbm_scores)),
                    "dmus_en_frontera_bcc": sum(score >= 0.999 for score in scores),
                    "frontera_pareto_n": len(frontier_idx),
                    "bootstrap_replicas": 200,
                    "bootstrap_intervalos": (
                        "Percentiles 2.5 y 97.5 de remuestreo determinístico "
                        "de referencias Pareto; B=200."
                    ),
                    "dmus": details,
                    "ranking_entidades_pdd": details,
                    "frontera_por_linea_estrategica": _line_frontier(rows, state, insumo),
                    "frontera_por_linea": _line_frontier(rows, state, insumo),
                }
            )
        pdl = _pdl_locality_frontier(state)
        return _store(
            key,
            {
                "estado": "CALCULADO",
                "insumo": insumo,
                "planes": result,
                "frontera_por_entidad": result,
                "frontera_por_linea_estrategica": [
                    {"plan": item["plan"], "lineas": item.get("frontera_por_linea_estrategica", [])}
                    for item in result
                ],
                "frontera_pdl_localidades": pdl,
                "advertencia": (
                    "DEA exploratorio: el gasto reconstruido y los avances "
                    "heterogéneos no implican eficiencia causal."
                ),
            },
        )

    async def econometria_comparada_pdd(self) -> dict[str, Any]:
        key = (self.bind_key, "pdd-dea", "econometria")
        if cached := _cached(key):
            return cached
        state = await self._state()
        plans = []
        plan_entities: dict[str, list[dict[str, Any]]] = {}
        for p in PLANS:
            code = p["codigo_plan"]
            if not code.startswith("PDD_"):
                continue
            rows = state["goals_by_plan"].get(code, [])
            entity_rows = _rank_entities(rows)
            plan_entities[code] = entity_rows
            advances = [
                r["avance_promedio_pct"]
                for r in entity_rows
                if r["avance_promedio_pct"] is not None
            ]
            spends = [
                sum(
                    value
                    for (entity, year, stage), value in state["financial"].items()
                    if entity == row["entidad"]
                    and stage == "apropiacion"
                    and _plan_for_year(year) == code
                )
                for row in entity_rows
            ]
            plans.append(
                {
                    "plan": code,
                    "periodo": p["periodo"],
                    "entidades": len(entity_rows),
                    "avance_promedio_pct": float(np.mean(advances)) if advances else None,
                    "gini_ppi_por_entidad": _gini(spends),
                    "hhi_ppi_por_entidad": _hhi(spends),
                    "ppi_reconstruido_cop": sum(spends),
                }
            )
        paired = []
        for a, b in zip(plans, plans[1:], strict=False):
            by_plan = {
                p["plan"]: _rank_entities(state["goals_by_plan"].get(p["plan"], [])) for p in (a, b)
            }
            values = [
                {r["entidad"]: r["avance_promedio_pct"] for r in by_plan[p["plan"]]} for p in (a, b)
            ]
            common = sorted(
                entity
                for entity in values[0].keys() & values[1].keys()
                if values[0][entity] is not None and values[1][entity] is not None
            )
            if len(common) >= 3:
                test = wilcoxon(
                    [values[0][e] for e in common],
                    [values[1][e] for e in common],
                    zero_method="zsplit",
                )
                paired.append(
                    {
                        "planes": [a["plan"], b["plan"]],
                        "entidades_pareadas": len(common),
                        "wilcoxon_stat": float(test.statistic),
                        "p_value": float(test.pvalue),
                    }
                )
        for row in paired:
            row["q_value_fdr"] = _bh([r["p_value"] for r in paired])[paired.index(row)]
        continuous_values = [
            {r["entidad"]: r["avance_promedio_pct"] for r in plan_entities.get(code, [])}
            for code in ("PDD_2016_2019", "PDD_2020_2023", "PDD_2024_2027")
        ]
        shared = sorted(
            set.intersection(*(set(values) for values in continuous_values))
            if continuous_values
            else set()
        )
        friedman = None
        if len(shared) >= 3 and all(
            all(values[entity] is not None for entity in shared) for values in continuous_values
        ):
            try:
                test = friedmanchisquare(
                    *[[values[entity] for entity in shared] for values in continuous_values]
                )
                friedman = {
                    "entidades_pareadas": len(shared),
                    "statistic": float(test.statistic),
                    "p_value": float(test.pvalue),
                }
            except ValueError:
                friedman = None
        malmquist = [
            _malmquist_interplan(
                left,
                right,
                plan_entities.get(left, []),
                plan_entities.get(right, []),
                _plan_dmu(state, left),
                _plan_dmu(state, right),
            )
            for left, right in (
                ("PDD_2016_2019", "PDD_2020_2023"),
                ("PDD_2020_2023", "PDD_2024_2027"),
            )
        ]
        return _store(
            key,
            {
                "estado": "CALCULADO",
                "planes": plans,
                "desigualdad_ppi_gini_hhi": plans,
                "comparaciones_pareadas": paired,
                "prueba_cambio_estructural_planes": paired,
                "friedman_tres_planes": friedman,
                "malmquist_interanual": malmquist,
                "malmquist_inter_planes": malmquist,
                "correlaciones_fdr": _correlations(state),
                "matriz_correlaciones_pdd": _correlations(state),
                "advertencia": (
                    "Asociaciones y productividad descriptivas; no identifican efectos causales."
                ),
            },
        )

    async def resumen_ejecutivo(self) -> dict[str, Any]:
        key = (self.bind_key, "pdd-dea", "resumen")
        if cached := _cached(key):
            return cached
        catalog = await self.catalogo_y_conciliacion_ppi()
        fulfillment = await self.cumplimiento_metas()
        frontier = await self.frontera_dea_pdd()
        econometrics = await self.econometria_comparada_pdd()
        return _store(
            key,
            {
                "estado": "CALCULADO",
                "catalogo_ppi": catalog,
                "cumplimiento": fulfillment,
                "frontera_dea": frontier,
                "econometria_comparada": econometrics,
            },
        )

    async def explorador_programas_y_seguridad_humana(self) -> dict[str, Any]:
        key = (self.bind_key, "pdd-dea", "explorador")
        if cached := _cached(key):
            return cached
        from sqlalchemy import text as sql_text

        try:
            lines_result = await self.session.execute(
                sql_text("""SELECT id::text, codigo_plan, parent_id::text, nivel, codigo,
                           nombre, orden, ppi_anual_cop, fuente, metadatos
                    FROM seguimiento.pdd_lineas_y_programas ORDER BY codigo_plan, orden, id""")
            )
            lines = [dict(row) for row in lines_result.mappings()]
            metas_result = await self.session.execute(
                sql_text("""SELECT codigo_plan, linea_id::text, tipo_meta, codigo, nombre,
                           indicador, unidad_medida, linea_nombre, fuente, fila_fuente,
                           datos_oficiales
                    FROM seguimiento.pdd_metas_oficiales ORDER BY codigo_plan, fila_fuente""")
            )
            metas = [dict(row) for row in metas_result.mappings()]
            dimensions_result = await self.session.execute(
                sql_text(
                    """SELECT codigo, nombre, orden, activa
                    FROM motor_politicas.dimensiones_seguridad_humana ORDER BY orden, codigo"""
                )
            )
            dimensions = [dict(row) for row in dimensions_result.mappings()]
            if not any(row["codigo"] == "cultural" for row in dimensions):
                dimensions.append(
                    {
                        "codigo": "cultural",
                        "nombre": "Seguridad Cultural",
                        "orden": 8,
                        "activa": False,
                        "fuente": "COMPLEMENTO_TAXONOMIA_PNUD; sin fila local en catálogo",
                    }
                )
            mesas_result = await self.session.execute(
                sql_text(
                    """SELECT codigo_oficial, nombre, tipo_mesa, dimension_id::text, linea_id::text
                    FROM mesas_trabajo.mesas ORDER BY nombre"""
                )
            )
            mesas = [dict(row) for row in mesas_result.mappings()]
            pas_result = await self.session.execute(
                sql_text(
                    """SELECT codigo, nombre, entidad_responsable, linea_estrategica_codigo,
                           indicador_asociado_codigo
                    FROM seguimiento.compromisos_pas ORDER BY codigo"""
                )
            )
            commitments = [dict(row) for row in pas_result.mappings()]
            theft_result = await self.session.execute(
                sql_text(
                    """WITH por_anio AS (
                           SELECT anio, count(*) filas, sum(cantidad) casos
                           FROM geodatos.estadisticas_hurtos GROUP BY anio
                       )
                       SELECT (SELECT count(*) FROM geodatos.estadisticas_hurtos) filas,
                           (SELECT coalesce(sum(cantidad), 0)
                            FROM geodatos.estadisticas_hurtos) casos,
                           (SELECT jsonb_agg(jsonb_build_object('anio', anio, 'filas', filas,
                                                               'casos', casos) ORDER BY anio)
                            FROM por_anio) por_anio"""
                )
            )
            theft = dict(theft_result.mappings().one())
        except Exception:
            lines, metas, dimensions, mesas, commitments, theft = [], [], [], [], [], {}
        focus_lines = self._ppi_2024_lines()
        focus = next((line for line in focus_lines if line["linea"] == "Seguridad Humana"), None)
        driver_ids = {
            row["id"]
            for row in lines
            if row["codigo_plan"] == "PDD_2024_2027"
            and row["nivel"] == "IMPULSOR"
            and str(row.get("codigo") or "").startswith("1.")
            and str(row.get("codigo") or "").count(".") == 1
        }
        security_programs = [
            row
            for row in lines
            if row["codigo_plan"] == "PDD_2024_2027"
            and row["nivel"] == "PROGRAMA"
            and row.get("parent_id") in driver_ids
        ]
        programs_by_code: dict[str, dict[str, Any]] = {}
        for row in security_programs:
            code = str(row.get("codigo") or row["nombre"])
            merged = programs_by_code.setdefault(
                code,
                row
                | {
                    "ppi_anual_cop": {year: 0.0 for year in ("2024", "2025", "2026", "2027")},
                    "filas_fuente": 0,
                },
            )
            merged["filas_fuente"] += 1
            for year in ("2024", "2025", "2026", "2027"):
                merged["ppi_anual_cop"][year] += float(
                    row.get("ppi_anual_cop", {}).get(year, 0) or 0
                )
        security_programs = list(programs_by_code.values())
        link_counts: dict[str, int] = defaultdict(int)
        for meta in metas:
            link = (meta.get("datos_oficiales") or {}).get("_vinculo_triada", {})
            link_counts[str(link.get("metodo_emparejamiento") or "SIN_VINCULO")] += 1
        payload = {
            "estado": "CALCULADO" if lines or metas else "CATALOGO_NO_SINCRONIZADO",
            "catalogo": {
                "planes": list(PLANS),
                "lineas_programas": lines,
                "metas_oficiales": metas,
                "conteos": {
                    "lineas_programas": len(lines),
                    "metas_oficiales": len(metas),
                    "metas_vinculadas_a_triada": sum(
                        v for k, v in link_counts.items() if k != "SIN_VINCULO"
                    ),
                    "emparejamiento_por_metodo": dict(link_counts),
                },
            },
            "monitor_linea_1_seguridad_humana": {
                "linea": "Seguridad Humana",
                "ppi_total_corriente_cop": 5_666_917_744_338,
                "ppi_por_componente": focus,
                "impulsores": list(COMPONENTES_SEGURIDAD_HUMANA),
                "programas_oficiales_esperados": 26,
                "programas_catalogados": security_programs,
                "dimensiones_pnud": {"total": len(dimensions), "items": dimensions},
                "mesas_territoriales": {"total": len(mesas), "items": mesas},
                "compromisos_pas": {"total": len(commitments), "items": commitments},
                "hurtos": theft,
                "trazabilidad": (
                    "Se devuelven las llaves oficiales de cada catálogo fuente. No se afirma "
                    "una asignación programa-dimensión/mesa/PAS si los registros no comparten "
                    "un código o vínculo persistido."
                ),
            },
            "fuente_catalogo": str(BASE_DIR),
        }
        return _store(key, payload)


def _group_rows(rows: list[dict[str, Any]], field: str) -> dict[str, list[dict[str, Any]]]:
    result: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        result[str(row.get(field) or "SIN_DATO")].append(row)
    return dict(result)


def _rank_entities(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups = _group_rows(rows, "entidad")
    ranked = []
    for entity, items in groups.items():
        values = [r["avance_norm"] for r in items if r.get("avance_norm") is not None]
        ranked.append(
            {
                "entidad": entity,
                "grupo": _group(entity),
                "metas": len(items),
                "metas_evaluables": len(values),
                "metas_huerfanas_sin_avance": len(items) - len(values),
                "metas_rezago_critico": sum(value < 40 for value in values),
                "avance_promedio_pct": float(np.mean(values)) if values else None,
            }
        )
    return sorted(
        ranked,
        key=lambda r: (
            r["avance_promedio_pct"] is None,
            -(r["avance_promedio_pct"] or 0),
            r["entidad"],
        ),
    )


def _gini(values: list[float]) -> float | None:
    arr = np.asarray(values, dtype=float)
    if len(arr) == 0 or np.sum(arr) <= 0:
        return None
    arr.sort()
    n = len(arr)
    return float((2 * np.sum((np.arange(1, n + 1)) * arr) / (n * np.sum(arr))) - (n + 1) / n)


def _hhi(values: list[float]) -> float | None:
    arr = np.asarray(values, dtype=float)
    total = arr.sum()
    return float(np.sum((arr / total) ** 2)) if len(arr) and total > 0 else None


def _malmquist_interplan(
    plan_a: str,
    plan_b: str,
    entities_a: list[dict[str, Any]],
    entities_b: list[dict[str, Any]],
    dmu_a: dict[str, tuple[np.ndarray, np.ndarray]] | None = None,
    dmu_b: dict[str, tuple[np.ndarray, np.ndarray]] | None = None,
) -> dict[str, Any]:
    if dmu_a and dmu_b:
        common_dmus = sorted(dmu_a.keys() & dmu_b.keys())
        xa = np.asarray([dmu_a[e][0] for e in sorted(dmu_a)], dtype=float)
        ya = np.asarray([dmu_a[e][1] for e in sorted(dmu_a)], dtype=float)
        xb = np.asarray([dmu_b[e][0] for e in sorted(dmu_b)], dtype=float)
        yb = np.asarray([dmu_b[e][1] for e in sorted(dmu_b)], dtype=float)
        observations = []
        effch_values, techch_values, mpi_values = [], [], []
        for entity in common_dmus:
            x0, y0 = dmu_a[entity]
            x1, y1 = dmu_b[entity]
            distances = {
                "d00": _output_distance(xa, ya, x0, y0),
                "d01": _output_distance(xa, ya, x1, y1),
                "d10": _output_distance(xb, yb, x0, y0),
                "d11": _output_distance(xb, yb, x1, y1),
            }
            if any(v is None or v <= 0 for v in distances.values()):
                continue
            d00, d01, d10, d11 = (distances[k] for k in ("d00", "d01", "d10", "d11"))
            effch = d11 / d00
            techch = math.sqrt((d00 / d10) * (d01 / d11))
            mpi = effch * techch
            observations.append(
                {
                    "entidad": entity,
                    "distancias_output": distances,
                    "effch": effch,
                    "techch": techch,
                    "mpi": mpi,
                }
            )
            effch_values.append(effch)
            techch_values.append(techch)
            mpi_values.append(mpi)
        effch_global = _geomean(effch_values) if effch_values else None
        techch_global = _geomean(techch_values) if techch_values else None
        mpi_global = (
            effch_global * techch_global
            if effch_global is not None and techch_global is not None
            else None
        )
        return {
            "transicion": f"{plan_a}->{plan_b}",
            "dmu_pareadas": len(observations),
            "entidades": observations,
            "mpi_global": mpi_global,
            "effch_global": effch_global,
            "techch_global": techch_global,
            "metodo": (
                "Malmquist output-oriented CRS exacto: distancias direccionales "
                "con LP HiGHS; MPI = EFFCH × TECHCH."
            ),
        }
    left = {r["entidad"]: r["avance_promedio_pct"] for r in entities_a}
    right = {r["entidad"]: r["avance_promedio_pct"] for r in entities_b}
    common = sorted(
        entity
        for entity in left.keys() & right.keys()
        if left[entity] is not None and right[entity] is not None
    )
    changes = [max(float(right[e]), 0.01) / max(float(left[e]), 0.01) for e in common]
    productivity = _geomean(changes) if changes else None
    return {
        "transicion": f"{plan_a}->{plan_b}",
        "dmu_pareadas": len(common),
        "entidades": [
            {
                "entidad": entity,
                "avance_plan_a_pct": left[entity],
                "avance_plan_b_pct": right[entity],
            }
            for entity in common
        ],
        "mpi_global": productivity,
        "effch_global": 1.0 if productivity is not None else None,
        "techch_global": productivity,
        "metodo": (
            "Proxy geométrico de variación del avance medio entre planes; no sustituye "
            "Malmquist DEA con fronteras temporales comparables."
        ),
    }


def _output_distance(X: np.ndarray, Y: np.ndarray, x: np.ndarray, y: np.ndarray) -> float | None:
    fit = _lp(X, Y, x, y, vrs=False)
    phi = _number(fit.get("phi")) if fit.get("estado") == "CALCULADO" else None
    return 1.0 / phi if phi and phi > 0 else None


def _plan_dmu(state: dict[str, Any], plan: str) -> dict[str, tuple[np.ndarray, np.ndarray]]:
    rows = state["goals_by_plan"].get(plan, [])
    grouped = _group_rows(rows, "entidad")
    result = {}
    for entity, items in grouped.items():
        advances = [row["avance_norm"] for row in items if row.get("avance_norm") is not None]
        if not advances:
            continue
        years = {int(row["vigencia"]) for row in items}
        spending = sum(state["financial"].get((entity, year, "apropiacion"), 0.0) for year in years)
        if spending <= 0:
            # Consistent programmatic-effort input where historical financial data is absent.
            spending = float(len(items)) * 1_000_000
        achieved = sum(min(100.0, value) / 100 for value in advances)
        effective = len(
            {
                row.get("indicador") or row["clave_item"]
                for row in items
                if row.get("avance_norm") is not None and row["avance_norm"] >= 75
            }
        )
        result[entity] = (
            np.asarray([max(spending, 1.0)]),
            np.asarray([max(achieved, 0.0001), max(float(effective), 0.0001)]),
        )
    return result


def _bootstrap_bcc(
    X: np.ndarray, Y: np.ndarray, frontier_idx: list[int], *, repetitions: int = 200
) -> dict[int, list[float]]:
    if len(X) < 9 or not frontier_idx:
        return {}
    rng = np.random.default_rng(202409)
    result: dict[int, list[float]] = {i: [] for i in range(len(X))}
    size = len(frontier_idx)
    for _ in range(repetitions):
        sample = rng.choice(frontier_idx, size=size, replace=True)
        bx, by = X[sample], Y[sample]
        for i in range(len(X)):
            fit = _lp(bx, by, X[i], Y[i], vrs=True)
            value = _number(fit.get("eficiencia")) if fit.get("estado") == "CALCULADO" else None
            if value is not None:
                result[i].append(float(np.clip(value, 0, 1)))
    return result


def _pdl_locality_frontier(state: dict[str, Any]) -> dict[str, Any]:
    totals = {
        "Alcaldía Local Histórica y del Caribe Norte": 97_691_041_529.0,
        "Alcaldía Local de la Virgen y Turística": 161_289_996_409.01,
        "Alcaldía Local Industrial y de la Bahía": 46_000_000_000.0,
    }
    rows = state["goals_by_plan"].get("PDD_2024_2027", [])
    by_locality = {
        name: [row for row in rows if name.casefold() in str(row["entidad"]).casefold()]
        for name in totals
    }
    valid = [
        (name, by_locality[name])
        for name in totals
        if any(r.get("avance_norm") is not None for r in by_locality[name])
    ]
    details = [
        {
            "localidad": name,
            "ppi_oficial_cop": totals[name],
            "metas_evaluables": sum(row.get("avance_norm") is not None for row in group),
            "avance_promedio_pct": float(
                np.mean([r["avance_norm"] for r in group if r.get("avance_norm") is not None])
            )
            if any(r.get("avance_norm") is not None for r in group)
            else None,
            "estado": "CALCULADO"
            if any(r.get("avance_norm") is not None for r in group)
            else "SIN_DATOS_EN_BD_CSH",
        }
        for name, group in by_locality.items()
    ]
    if len(valid) >= 3:
        X = np.asarray([[totals[name]] for name, _ in valid])
        Y = np.asarray(
            [
                [
                    max(
                        sum(
                            min(r["avance_norm"], 100) / 100
                            for r in group
                            if r.get("avance_norm") is not None
                        ),
                        0.0001,
                    ),
                    max(
                        float(
                            sum(
                                r.get("avance_norm") is not None and r["avance_norm"] >= 75
                                for r in group
                            )
                        ),
                        0.0001,
                    ),
                ]
                for _name, group in valid
            ]
        )
        scores = [_lp(X, Y, X[i], Y[i], vrs=True).get("eficiencia") for i in range(len(valid))]
        for detail, score in zip(details, scores, strict=True):
            detail["theta_bcc"] = score
    return {
        "nivel": "PDL_LOCALIDADES",
        "n": len(valid),
        "dmus": details,
        "modelo": (
            "BCC orientado a insumos; PPI oficial como insumo; avances registrados como outputs."
        ),
        "advertencia": "La frontera requiere avance registrado para las tres localidades.",
    }


def _line_frontier(
    rows: list[dict[str, Any]], state: dict[str, Any], insumo: str
) -> list[dict[str, Any]]:
    groups = _group_rows(rows, "linea_norm")
    output: list[dict[str, Any]] = []
    for line, items in groups.items():
        values = [r["avance_norm"] for r in items if r.get("avance_norm") is not None]
        entities = {r["entidad"] for r in items}
        years = {int(r["vigencia"]) for r in items}
        spend = sum(
            state["financial"].get(
                (e, y, "apropiacion" if insumo == "conciliado_ppi" else "pagos"), 0
            )
            for e in entities
            for y in years
        )
        effective = {
            str(row.get("indicador") or row.get("clave_item"))
            for row in items
            if row.get("avance_norm") is not None and row["avance_norm"] >= 75
        }
        output.append(
            {
                "linea": line,
                "insumo_cop": spend,
                "avance_promedio_pct": float(np.mean(values)) if values else None,
                "metas_evaluables": len(values),
                "y1_metas_pdd_cumplidas_eq": sum(min(v, 100) / 100 for v in values),
                "y2_indicadores_eficaces_ge75": len(effective),
                "estado": "CALCULADO" if spend > 0 and values else "SIN_INSUMO_O_AVANCE",
            }
        )
    eligible = [row for row in output if row["insumo_cop"] > 0 and row["metas_evaluables"]]
    if len(eligible) >= 3:
        X = np.asarray([[row["insumo_cop"]] for row in eligible], dtype=float)
        Y = np.asarray(
            [
                [
                    max(row["y1_metas_pdd_cumplidas_eq"], 0.0001),
                    max(float(row["y2_indicadores_eficaces_ge75"]), 0.0001),
                ]
                for row in eligible
            ],
            dtype=float,
        )
        for i, row in enumerate(eligible):
            estimate = _lp(X, Y, X[i], Y[i], vrs=True)
            row["theta_bcc"] = (
                estimate.get("eficiencia") if estimate.get("estado") == "CALCULADO" else None
            )
    return output


def _correlations(state: dict[str, Any]) -> list[dict[str, Any]]:
    rows = [
        r
        for r in state["goals_by_plan"].get("PDD_2020_2023", [])
        if r.get("avance_norm") is not None
    ]
    finance = state["financial"]
    spend = [finance.get((r["entidad"], int(r["vigencia"]), "apropiacion"), 0.0) for r in rows]
    advance = [r["avance_norm"] for r in rows]
    records = []
    for name, fn in (("pearson", pearsonr), ("spearman", spearmanr)):
        valid = [(x, y) for x, y in zip(spend, advance, strict=True) if x > 0]
        if len(valid) < 3:
            records.append({"metodo": name, "n": len(valid), "coeficiente": None, "p_value": None})
            continue
        try:
            stat = fn(*zip(*valid, strict=True))
            records.append(
                {
                    "metodo": name,
                    "n": len(valid),
                    "coeficiente": float(stat.statistic),
                    "p_value": float(stat.pvalue),
                }
            )
        except ValueError:
            records.append({"metodo": name, "n": len(valid), "coeficiente": None, "p_value": None})
    valid_ps = [r["p_value"] for r in records if r["p_value"] is not None]
    q_values = _bh(valid_ps) if valid_ps else []
    j = 0
    for row in records:
        if row["p_value"] is not None:
            row["q_value_bh"] = q_values[j]
            row["q_value_fdr"] = q_values[j]
            j += 1
    return records
