"""Evaluación descriptiva, PPI y DEA de los Planes de Desarrollo de Cartagena."""

from __future__ import annotations

import asyncio
import math
import re
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
    (
        "Eje Transversal: Cartagena con Atención y Garantía de Derechos a Población Diferencial"
    ): 75_369_100_000,
}

PLANS: tuple[dict[str, Any], ...] = (
    {
        "codigo_plan": "PDD_2012_2015",
        "periodo": "2012–2015",
        "nombre_oficial": "En Cartagena Hay Campo para Todos",
        "norma_adopcion": "Acuerdo Distrital 001/012 de 2012 (referencia documental)",
        "archivos": (
            "pdd_2012_2015_campo_para_todos_cdim.md",
            "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf",
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
        "archivos": ("pdd_2016_2019_acuerdo_006_primero_la_gente.pdf",),
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
        "codigo_plan": "PDL_2024_2027",
        "periodo": "2024–2027",
        "nombre_oficial": "Planes de Desarrollo Local de Cartagena (3 localidades)",
        "norma_adopcion": "Acuerdos locales de 2024",
        "archivos": (
            "pdl_2024_2027_localidad_1_historica.md",
            "pdl_2024_2027_localidad_2_virgen_turistica.md",
            "pdl_2024_2027_localidad_3_industrial_bahia.md",
        ),
        "desde": 2024,
        "hasta": 2027,
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


def _cached(key: tuple[Any, ...]) -> dict[str, Any] | None:
    item = _RESULT.get(key)
    return item[1] if item and time.monotonic() - item[0] < TTL else None


def _store(key: tuple[Any, ...], value: dict[str, Any]) -> dict[str, Any]:
    _RESULT[key] = (time.monotonic(), value)
    return value


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


def _line_key(value: Any, plan: str) -> str:
    text_value = re.sub(r"\s+", " ", str(value or "").strip())
    upper = text_value.upper()
    if plan == "PDD_2024_2027":
        aliases = (
            ("SEGURIDAD HUMANA", "Seguridad Humana"),
            ("DESARROLLO ECONÓMICO", "Desarrollo Económico Equitativo"),
            ("DESARROLLO ECONOMICO", "Desarrollo Económico Equitativo"),
            ("CIUDAD CONECTADA", "Ciudad Conectada y Sostenible"),
            ("INNOVACIÓN PÚBLICA", "Innovación Pública y Participación Ciudadana"),
            ("INNOVACION PUBLICA", "Innovación Pública y Participación Ciudadana"),
            ("CAPÍTULO", "Capítulo de los Pueblos y Comunidades Étnicas"),
            ("CAPITULO", "Capítulo de los Pueblos y Comunidades Étnicas"),
        )
        for token, normalized in aliases:
            if token in upper:
                return normalized
    if plan == "PDD_2020_2023":
        for pillar in ("RESILIENTE", "INCLUYENTE", "CONTINGENTE", "TRANSPARENTE"):
            if pillar in upper:
                return f"Cartagena {pillar.title()}"
        if "TRANSVERSAL" in upper or "DIFERENCIAL" in upper:
            return "Eje Transversal"
    return text_value or "SIN_LINEA"


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
        line = _line_key(row.get("linea"), plan)
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
            if plan_code == "PDL_2024_2027":
                matched = [
                    row
                    for row in state["raw_pdd"]
                    if row["plan"] == "PDD_2024_2027"
                    and str(row["entidad"]).startswith("Alcaldía Local")
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
                    "ppi_total_corriente_cop": self._plan_ppi_nominal(plan_code),
                    "ppi_total_constante_2025_cop": self._plan_ppi_constant(plan_code),
                    "ppi_estado": (
                        "OFICIAL_EXTRAIDO"
                        if self._plan_ppi_nominal(plan_code) is not None
                        else "PDF_ESCANEADO_SIN_OCR"
                        if plan_code == "PDD_2016_2019"
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
        if plan == "PDD_2024_2027":
            return float(sum(PPI_2024.values()))
        if plan == "PDD_2020_2023":
            return float(
                sum(PPI_2020_2019_COP[year] / _money_factor(year) for year in PPI_2020_2019_COP)
            )
        return None

    @staticmethod
    def _plan_ppi_constant(plan: str) -> float | None:
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
                            if line["linea"] == "Seguridad Humana"
                        ),
                        None,
                    ),
                },
                "planes_desarrollo_local_2024_2027": _rank_entities(localities),
                "cumplimiento_por_entidad": _rank_entities(all_rows),
                "componentes_seguridad_humana": list(COMPONENTES_SEGURIDAD_HUMANA),
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
                detail["bootstrap_ic95"] = None
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
                    "bootstrap_replicas": 0,
                    "bootstrap_intervalos": (
                        "Pendientes; scores deterministas reportados sin corrección bootstrap."
                    ),
                    "dmus": details,
                    "ranking_entidades_pdd": details,
                    "frontera_por_linea": _line_frontier(rows, state, insumo),
                }
            )
        return _store(
            key,
            {
                "estado": "CALCULADO",
                "insumo": insumo,
                "planes": result,
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
) -> dict[str, Any]:
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
