"""Motores de inteligencia forense de solo lectura sobre la Triada normalizada."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import tempfile
import time
import unicodedata
from collections import Counter, defaultdict
from functools import wraps
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compromisos.ingesta_masiva_excel import ENTIDADES_CANONICAS_CARTAGENA
from app.modules.compromisos.models import ArchivoPlanIngerido, RegistroTriadaNormalizado
from app.modules.compromisos.taxonomia_seguridad import DIMENSIONES, PERIODOS

_TTL = 300.0
_ACCENT_TRANSLATION = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
_NON_WORD = re.compile(r"[^a-z0-9]+")
_CACHE: dict[str, tuple[float, list[dict[str, Any]], list[dict[str, Any]]]] = {}
_LOCKS: dict[str, asyncio.Lock] = {}
_RESULTS: dict[tuple[Any, ...], tuple[float, Any]] = {}
BASE_DIR = Path(__file__).resolve().parents[4] / "data" / "planes_desarrollo"
CACHE_INTELIGENCIA = BASE_DIR / "cache_inteligencia_triada_6m.json"
_DISK_RESULTS: dict[str, Any] | None = None
_DISK_RESULT_LOCK = asyncio.Lock()
_PERSISTED_METHODS = {
    "patologias_dnp",
    "continuidad_gobiernos",
    "radar_transparencia",
    "alineacion_territorial",
    "simulador_cierre",
    "resumen_ejecutivo",
}
_CLON_JSON = ArchivoPlanIngerido.metadatos["alerta_calidad"].astext
_CAMPOS = (
    "id",
    "vigencia",
    "periodo_gobierno",
    "corte_periodo",
    "dimensiones_seguridad_humana",
    "entidad_normalizada",
    "motor_destino",
    "linea_estrategica",
    "codigo_meta_pdd",
    "codigo_bpim",
    "programa",
    "indicador",
    "descripcion_actividad",
    "verbo_fuerte_dnp",
    "avance_fisico_pct",
    "avance_estrategico_pct",
    "avance_t1",
    "avance_t2",
    "avance_t3",
    "avance_t4",
    "apropiacion_definitiva_cop",
    "obligaciones_cop",
    "pagos_tesoreria_cop",
    "archivo_id",
)
_LOCALIDADES: dict[str, tuple[str, ...]] = {
    "Localidad 1 - Histórica y del Caribe Norte": (
        "localidad 1",
        "historica y del caribe norte",
        "lhcn",
        "bocagrande",
        "getsemani",
        "centro historico",
        "manga",
        "crespo",
        "pie de la popa",
        "santa rita",
        "canapote",
        "daniel lemaitre",
        "torices",
        "el bosque",
        "barrio chino",
        "martinez martelo",
        "tierra bomba",
        "baru",
        "islas del rosario",
        "bocachica",
    ),
    "Localidad 2 - De la Virgen y Turística": (
        "localidad 2",
        "virgen y turistica",
        "olaya",
        "olaya herrera",
        "la boquilla",
        "chiquinquira",
        "el pozon",
        "pozon",
        "boston",
        "la candelaria",
        "la esperanza",
        "alcibia",
        "tesca",
        "villa estrella",
        "bayunca",
        "pontezuela",
        "punta canoa",
        "arroyo de piedra",
        "arroyo grande",
        "las palmeras",
        "fredonia",
        "nuevo paraiso",
    ),
    "Localidad 3 - Industrial y de la Bahía": (
        "localidad 3",
        "industrial y de la bahia",
        "mamonal",
        "pasacaballos",
        "albornoz",
        "arroz barato",
        "puerta de hierro",
        "policarpa",
        "nelson mandela",
        "el recreo",
        "la concepcion",
        "ternenera",
        "san jose de los campanos",
        "providencia",
        "blas de lezo",
        "el carmelo",
        "el socorro",
        "vista hermosa",
        "santa clara",
        "ceballos",
        "bellavista",
        "membrillal",
    ),
}
_ENTIDAD_LOCALIDAD = {
    "Alcaldía Local Histórica y del Caribe Norte": next(iter(_LOCALIDADES)),
    "Alcaldía Local de la Virgen y Turística": tuple(_LOCALIDADES)[1],
    "Alcaldía Local Industrial y de la Bahía": tuple(_LOCALIDADES)[2],
}
_ALIAS_LOCALIDAD = {
    " ".join(alias.lower().split()): locality
    for locality, aliases in _LOCALIDADES.items()
    for alias in aliases
}
_LOCALIDAD_PATTERN = re.compile(
    r"\b(?:"
    + "|".join(re.escape(alias) for alias in sorted(_ALIAS_LOCALIDAD, key=len, reverse=True))
    + r")\b"
)
_DEBILES = {
    "apoyar",
    "asistir",
    "atender",
    "coordinar",
    "desarrollar",
    "fortalecer",
    "gestionar",
    "realizar",
    "implementar",
    "llevar",
    "participar",
    "promover",
    "prestar",
    "brindar",
    "efectuar",
    "hacer",
    "adelantar",
    "contribuir",
    "garantizar",
    "socializar",
    "acompanar",
}


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _norm(value: Any) -> str:
    plain = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-zA-Z0-9]+", " ", plain).lower().split())


def _norm_fast(value: Any) -> str:
    return " ".join(
        _NON_WORD.sub(" ", str(value or "").lower().translate(_ACCENT_TRANSLATION)).split()
    )


def _period(record: dict[str, Any]) -> str | None:
    value = record.get("periodo_gobierno")
    if value in PERIODOS:
        return value
    year = record.get("vigencia")
    if year is None:
        return None
    return "ANTES_2020" if year < 2020 else "2020_2023" if year <= 2023 else "2024_2027"


def _entidades_canonicas_activas(names: list[str]) -> list[str]:
    observed = Counter(name for name in names if name in ENTIDADES_CANONICAS_CARTAGENA)
    entities = [name for name, _ in observed.most_common(30)]
    for name in ENTIDADES_CANONICAS_CARTAGENA:
        if len(entities) == 30:
            break
        if name not in entities:
            entities.append(name)
    return entities


def _clave_identificadora_valida(value: Any) -> bool:
    normalized = _norm(value)
    if not normalized or normalized in {
        "na",
        "n a",
        "n/a",
        "nd",
        "none",
        "ninguno",
        "0",
        "sin codigo",
        "no aplica",
        "no disponible",
        "----",
        "-",
    }:
        return False
    return "xxxx" not in normalized and "pendiente" not in normalized


def _cache_result(method):
    @wraps(method)
    async def wrapped(self, *args, **kwargs):
        key = (self._cache_key, method.__name__, repr(args), repr(sorted(kwargs.items())))
        cached = _RESULTS.get(key)
        if cached and time.monotonic() - cached[0] < _TTL:
            return cached[1]
        persistent_key = None
        if method.__name__ in _PERSISTED_METHODS and _uses_default_arguments(
            method, self, args, kwargs
        ):
            persistent_key = "/".join(
                (
                    hashlib.sha256(self._cache_key.encode()).hexdigest(),
                    method.__name__,
                )
            )
            value = await _read_persisted_result(persistent_key)
            if value is not None:
                _RESULTS[key] = (time.monotonic(), value)
                return value
        value = await method(self, *args, **kwargs)
        _RESULTS[key] = (time.monotonic(), value)
        if persistent_key:
            await _store_persisted_result(persistent_key, value)
        return value

    return wrapped


def _uses_default_arguments(method, self, args, kwargs) -> bool:
    import inspect

    signature = inspect.signature(method)
    bound = signature.bind(self, *args, **kwargs)
    bound.apply_defaults()
    return all(
        value == signature.parameters[name].default
        for name, value in bound.arguments.items()
        if name != "self" and signature.parameters[name].default is not inspect.Parameter.empty
    )


async def _read_persisted_result(key: str) -> Any:
    global _DISK_RESULTS
    async with _DISK_RESULT_LOCK:
        if _DISK_RESULTS is None:
            try:
                content = json.loads(CACHE_INTELIGENCIA.read_text(encoding="utf-8"))
                _DISK_RESULTS = content.get("entries", {}) if content.get("version") == 1 else {}
            except (OSError, ValueError, TypeError):
                _DISK_RESULTS = {}
        entry = _DISK_RESULTS.get(key)
        return entry.get("payload") if entry else None


async def _store_persisted_result(key: str, value: Any) -> None:
    global _DISK_RESULTS
    async with _DISK_RESULT_LOCK:
        if _DISK_RESULTS is None:
            try:
                content = json.loads(CACHE_INTELIGENCIA.read_text(encoding="utf-8"))
                _DISK_RESULTS = content.get("entries", {}) if content.get("version") == 1 else {}
            except (OSError, ValueError, TypeError):
                _DISK_RESULTS = {}
        _DISK_RESULTS[key] = {"payload": value, "stored_at": time.time()}
        try:
            CACHE_INTELIGENCIA.parent.mkdir(parents=True, exist_ok=True)
            fd, temporary = tempfile.mkstemp(
                prefix="polis-inteligencia-", dir=str(CACHE_INTELIGENCIA.parent)
            )
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as target:
                    json.dump(
                        {"version": 1, "entries": _DISK_RESULTS},
                        target,
                        ensure_ascii=False,
                        separators=(",", ":"),
                        default=str,
                    )
                os.replace(temporary, CACHE_INTELIGENCIA)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
        except OSError:
            return


def _visible(
    rows: list[dict[str, Any]], *, vigencia=None, periodo=None, dimension=None, entidad=None
):
    norm_entidad = _norm(entidad) if entidad else None
    return [
        row
        for row in rows
        if (vigencia is None or row.get("vigencia") == vigencia)
        and (periodo is None or _period(row) == periodo)
        and (dimension is None or dimension in (row.get("dimensiones_seguridad_humana") or []))
        and (norm_entidad is None or _norm(row.get("entidad_normalizada")) == norm_entidad)
    ]


class InteligenciaTriadaService:
    """Calcula seis lecturas analíticas sin modificar las tablas canónicas."""

    def __init__(self, session: AsyncSession):
        self.session = session
        bind = session.get_bind()
        self._cache_key = str(getattr(bind, "url", id(bind)))

    async def _snapshot(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        now = time.monotonic()
        cached = _CACHE.get(self._cache_key)
        if cached and now - cached[0] < _TTL:
            return cached[1], cached[2]
        lock = _LOCKS.setdefault(self._cache_key, asyncio.Lock())
        async with lock:
            cached = _CACHE.get(self._cache_key)
            if cached and time.monotonic() - cached[0] < _TTL:
                return cached[1], cached[2]
            columns = []
            for name in _CAMPOS:
                if name == "programa":
                    columns.append(
                        func.coalesce(
                            RegistroTriadaNormalizado.datos_origen["programa"].astext,
                            RegistroTriadaNormalizado.datos_origen["nombre_programa"].astext,
                        ).label("programa")
                    )
                else:
                    columns.append(getattr(RegistroTriadaNormalizado, name))
            stmt = (
                select(*columns)
                .join(
                    ArchivoPlanIngerido,
                    ArchivoPlanIngerido.id == RegistroTriadaNormalizado.archivo_id,
                )
                .where(_CLON_JSON.is_distinct_from("CONTENIDO_IDENTICO_OTRO_CORTE"))
            )
            result = await self.session.stream(
                stmt.execution_options(stream_results=True, yield_per=5000)
            )
            records = []
            async for partition in result.partitions(5000):
                records.extend(dict(zip(_CAMPOS, tuple(row), strict=True)) for row in partition)
            await result.close()
            archives_result = await self.session.execute(
                select(
                    ArchivoPlanIngerido.id,
                    ArchivoPlanIngerido.nombre_archivo,
                    ArchivoPlanIngerido.entidad_normalizada,
                    ArchivoPlanIngerido.vigencia,
                    ArchivoPlanIngerido.corte_periodo,
                    ArchivoPlanIngerido.filas_extraidas,
                    ArchivoPlanIngerido.metadatos,
                )
            )
            archives = [
                {
                    "id": row[0],
                    "nombre_archivo": row[1],
                    "entidad": row[2],
                    "vigencia": row[3],
                    "corte_periodo": row[4],
                    "filas_extraidas": row[5],
                    "metadatos": row[6] or {},
                }
                for row in archives_result.all()
            ]
            _CACHE[self._cache_key] = (time.monotonic(), records, archives)
            return records, archives

    async def _ancillary(self) -> tuple[int, int]:
        from app.modules.geodatos.models import EstadisticaHurto
        from app.modules.mesas.models import Mesa

        hurtos, mesas = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(EstadisticaHurto.cantidad), 0),
                    select(func.count()).select_from(Mesa).scalar_subquery(),
                )
            )
        ).one()
        return int(hurtos), int(mesas)

    @_cache_result
    async def patologias_dnp(self, *, vigencia=None, periodo=None, dimension=None, entidad=None):
        rows, _ = await self._snapshot()
        selected = _visible(
            rows, vigencia=vigencia, periodo=periodo, dimension=dimension, entidad=entidad
        )
        actions = [r for r in selected if r["motor_destino"] == "PLAN_ACCION"]
        strong = sum(r["verbo_fuerte_dnp"] is True for r in actions)
        weak = sum(r["verbo_fuerte_dnp"] is False for r in actions)
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in selected:
            if row["entidad_normalizada"]:
                groups[row["entidad_normalizada"]].append(row)
        ranking = []
        cases = []
        mirage = financial = bottleneck = 0
        active_entities = _entidades_canonicas_activas(
            [name for name, items in groups.items() for _ in items]
        )
        for entity in active_entities:
            own = groups.get(entity, [])
            pa = [r for r in own if r["motor_destino"] == "PLAN_ACCION"]
            pdd = [r for r in own if r["motor_destino"] == "PLAN_DESARROLLO"]
            inv = [r for r in own if r["motor_destino"] == "INVERSION_PRESUPUESTAL"]
            strong_n = sum(r["verbo_fuerte_dnp"] is True for r in pa)
            weak_n = sum(r["verbo_fuerte_dnp"] is False for r in pa)
            denominator = strong_n + weak_n
            pct_strong = 100 * strong_n / denominator if denominator else 0.0
            op_values = [
                _num(r["avance_fisico_pct"]) for r in pa if r["avance_fisico_pct"] is not None
            ]
            strategic = [
                _num(r["avance_estrategico_pct"])
                for r in pdd
                if r["avance_estrategico_pct"] is not None
            ]
            appropriation = sum(_num(r["apropiacion_definitiva_cop"]) for r in own)
            payments = sum(_num(r["pagos_tesoreria_cop"]) for r in own)
            weak_majority = denominator > 0 and weak_n / denominator >= 0.6
            avg_op = sum(op_values) / len(op_values) if op_values else 0.0
            avg_strategic = sum(strategic) / len(strategic) if strategic else 0.0
            entity_mirage = bool(
                pdd and pa and avg_strategic <= 35 and (avg_op >= 75 or weak_majority)
            )
            entity_bottleneck = sum(
                _num(r["apropiacion_definitiva_cop"]) > 0
                and _num(r["obligaciones_cop"]) == 0
                and _num(r["pagos_tesoreria_cop"]) == 0
                for r in inv
            )
            entity_financial = sum(
                _num(r["apropiacion_definitiva_cop"]) > 0
                and max(_num(r["obligaciones_cop"]), _num(r["pagos_tesoreria_cop"]))
                / _num(r["apropiacion_definitiva_cop"])
                >= 0.75
                and any(
                    r[key] is not None for key in ("avance_fisico_pct", "avance_estrategico_pct")
                )
                and max(_num(r["avance_fisico_pct"]), _num(r["avance_estrategico_pct"])) <= 35
                for r in own
            )
            mirage += int(entity_mirage)
            bottleneck += entity_bottleneck
            financial += entity_financial
            traceable = sum(
                _clave_identificadora_valida(r["codigo_bpim"])
                or _clave_identificadora_valida(r["codigo_meta_pdd"])
                for r in own
            )
            coherence = (
                100
                * sum(
                    max(_num(r["avance_fisico_pct"]), _num(r["avance_estrategico_pct"])) >= 50
                    or _num(r["apropiacion_definitiva_cop"]) == 0
                    or max(_num(r["obligaciones_cop"]), _num(r["pagos_tesoreria_cop"]))
                    / max(_num(r["apropiacion_definitiva_cop"]), 1)
                    < 0.75
                    for r in own
                )
                / len(own)
                if own
                else 0.0
            )
            score = round(
                0.45 * pct_strong
                + 0.30 * (100 * traceable / len(own) if own else 0)
                + 0.25 * coherence,
                2,
            )
            predominant = (
                "ESPEJISMO_OPERATIVO"
                if entity_mirage
                else "FORMULACION_DEBIL_DNP"
                if denominator and pct_strong < 50
                else "CUELLO_BOTELLA_PRESUPUESTAL"
                if entity_bottleneck
                else "DESACOPLE_FISICO_FINANCIERO"
                if entity_financial
                else "SALUDABLE"
            )
            ranking.append(
                {
                    "entidad": entity,
                    "indice_calidad_dnp_100": score,
                    "actividades_verbo_fuerte": strong_n,
                    "actividades_verbo_debil": weak_n,
                    "porcentaje_verbo_fuerte": round(pct_strong, 2),
                    "avance_estrategico_promedio_pct": round(avg_strategic, 2),
                    "avance_operativo_promedio_pct": round(avg_op, 2),
                    "apropiacion_total_cop": appropriation,
                    "pagos_total_cop": payments,
                    "patologia_predominante": predominant,
                }
            )
            if entity_mirage or entity_bottleneck or entity_financial:
                for r in own:
                    if len(cases) >= 100:
                        break
                    is_pa_mirage_case = r["motor_destino"] == "PLAN_ACCION" and (
                        r["avance_fisico_pct"] is not None
                        and _num(r["avance_fisico_pct"]) >= 75
                        or r["verbo_fuerte_dnp"] is False
                    )
                    is_bottleneck_case = (
                        _num(r["apropiacion_definitiva_cop"]) > 0
                        and _num(r["obligaciones_cop"]) == 0
                        and _num(r["pagos_tesoreria_cop"]) == 0
                    )
                    if entity_mirage and is_pa_mirage_case:
                        typ = "ESPEJISMO_OPERATIVO"
                    elif is_bottleneck_case:
                        typ = "CUELLO_BOTELLA_CONTRACTUAL"
                    elif (
                        r["apropiacion_definitiva_cop"]
                        and max(_num(r["obligaciones_cop"]), _num(r["pagos_tesoreria_cop"]))
                        / _num(r["apropiacion_definitiva_cop"])
                        >= 0.75
                        and any(
                            r[k] is not None
                            for k in ("avance_fisico_pct", "avance_estrategico_pct")
                        )
                        and max(_num(r["avance_fisico_pct"]), _num(r["avance_estrategico_pct"]))
                        <= 35
                    ):
                        typ = "SOBREEJECUCION_FINANCIERA"
                    else:
                        continue
                    cases.append(
                        {
                            "tipo_patologia": typ,
                            "entidad": entity,
                            "vigencia": r["vigencia"],
                            "codigo_bpim": r["codigo_bpim"],
                            "codigo_meta_pdd": r["codigo_meta_pdd"],
                            "descripcion": r["descripcion_actividad"] or r["indicador"],
                            "avance_estrategico_pct": _num(r["avance_estrategico_pct"]),
                            "avance_fisico_pct": _num(r["avance_fisico_pct"]),
                            "apropiacion_cop": _num(r["apropiacion_definitiva_cop"]),
                            "pagos_cop": _num(r["pagos_tesoreria_cop"]),
                        }
                    )
        ranking.sort(key=lambda x: (-x["indice_calidad_dnp_100"], x["entidad"]))
        return {
            "resumen_global": {
                "total_actividades_evaluadas": len(actions),
                "actividades_verbo_fuerte": strong,
                "actividades_verbo_debil": weak,
                "porcentaje_formulacion_fuerte_dnp": round(100 * strong / (strong + weak), 2)
                if strong + weak
                else 0.0,
                "total_alertas_espejismo": mirage,
                "total_alertas_sobreejecucion_financiera": financial,
                "total_alertas_cuello_botella_contractual": bottleneck,
            },
            "ranking_entidades_dnp": ranking,
            "casos_criticos": cases[:25],
        }

    @_cache_result
    async def continuidad_gobiernos(self, *, dimension=None, entidad=None):
        rows, _ = await self._snapshot()
        selected = _visible(rows, dimension=dimension, entidad=entidad)
        per_period: dict[str, list[dict[str, Any]]] = {p: [] for p in PERIODOS}
        for row in selected:
            period = _period(row)
            if period:
                per_period[period].append(row)
        comparison = {}
        bpim_periods: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(
            lambda: defaultdict(list)
        )
        recycled: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        dimension_counts: dict[str, Counter[str]] = {p: Counter() for p in PERIODOS}
        for period, items in per_period.items():
            bpims = {
                r["codigo_bpim"] for r in items if _clave_identificadora_valida(r["codigo_bpim"])
            }
            metas = {r["codigo_meta_pdd"] for r in items if r["codigo_meta_pdd"]}
            entities = {r["entidad_normalizada"] for r in items if r["entidad_normalizada"]}
            comparison[period] = {
                "archivos_unicos": len({r["archivo_id"] for r in items}),
                "total_registros": len(items),
                "entidades_activas": len(entities),
                "bpims_unicos": len(bpims),
                "metas_unicas": len(metas),
                "apropiacion_total_cop": sum(_num(r["apropiacion_definitiva_cop"]) for r in items),
                "registros_por_motor": dict(Counter(r["motor_destino"] for r in items)),
            }
            for row in items:
                bpim = row["codigo_bpim"]
                if _clave_identificadora_valida(bpim):
                    bpim_periods[bpim][period].append(row)
                text = _norm_fast(
                    row["indicador"] or row["codigo_meta_pdd"] or row["descripcion_actividad"]
                )
                if text and row["entidad_normalizada"]:
                    recycled[(row["entidad_normalizada"], text)].append(row)
                for dim in row["dimensiones_seguridad_humana"] or []:
                    if dim in DIMENSIONES:
                        dimension_counts[period][dim] += 1
        surviving = [code for code, periods in bpim_periods.items() if len(periods) >= 2]
        highlights = []
        for code in surviving:
            items = [r for vals in bpim_periods[code].values() for r in vals]
            highlights.append(
                {
                    "codigo_bpim": code,
                    "entidades": sorted(
                        {r["entidad_normalizada"] for r in items if r["entidad_normalizada"]}
                    ),
                    "periodos": sorted(bpim_periods[code]),
                    "vigencias": sorted({r["vigencia"] for r in items if r["vigencia"]}),
                    "total_registros": len(items),
                    "apropiacion_acumulada_cop": sum(
                        _num(r["apropiacion_definitiva_cop"]) for r in items
                    ),
                }
            )
        highlights.sort(key=lambda x: (-x["total_registros"], x["codigo_bpim"]))
        migrations = []
        for dim in DIMENSIONES:
            weights = {}
            for period, items in per_period.items():
                count = dimension_counts[period][dim]
                weights[period] = {
                    "registros": count,
                    "participacion_pct": round(100 * count / len(items), 2) if items else 0.0,
                }
            first, last = (
                weights[PERIODOS[0]]["participacion_pct"],
                weights[PERIODOS[-1]]["participacion_pct"],
            )
            migrations.append(
                {
                    "dimension": dim,
                    "periodos": weights,
                    "tendencia": "CRECIENTE"
                    if last - first > 1
                    else "DECRECIENTE"
                    if first - last > 1
                    else "ESTABLE",
                }
            )
        recycled_items = []
        for (entity, text), items in recycled.items():
            periods = sorted({_period(r) for r in items if _period(r)})
            if len(periods) < 2:
                continue
            advances = {
                p: round(
                    sum(
                        _num(r["avance_estrategico_pct"] or r["avance_fisico_pct"])
                        for r in items
                        if _period(r) == p
                    )
                    / sum(_period(r) == p for r in items),
                    2,
                )
                for p in periods
            }
            recycled_items.append(
                {
                    "entidad": entity,
                    "texto_meta_o_indicador": text[:500],
                    "periodos_detectados": periods,
                    "vigencias": sorted({r["vigencia"] for r in items if r["vigencia"]}),
                    "avance_promedio_por_periodo": advances,
                }
            )
        recycled_items.sort(
            key=lambda x: (
                -len(x["periodos_detectados"]),
                x["entidad"],
                x["texto_meta_o_indicador"],
            )
        )
        return {
            "comparativa_periodos": comparison,
            "continuidad_bpim": {
                "total_bpims_historicos": len(bpim_periods),
                "bpims_en_multiples_periodos": len(surviving),
                "bpims_huerfanos_un_solo_periodo": len(bpim_periods) - len(surviving),
                "tasa_continuidad_institucional_pct": round(
                    100 * len(surviving) / len(bpim_periods), 2
                )
                if bpim_periods
                else 0.0,
                "proyectos_continuos_destacados": highlights[:20],
            },
            "migracion_dimensiones_seguridad": migrations,
            "metas_recicladas": recycled_items[:20],
        }

    @_cache_result
    async def radar_transparencia(self, *, entidad=None, vigencia=None):
        rows, archives = await self._snapshot()
        entity_norm = _norm(entidad) if entidad else None
        candidates = [
            a
            for a in archives
            if (not entity_norm or _norm(a["entidad"]) == entity_norm)
            and (vigencia is None or a["vigencia"] == vigencia)
        ]
        clones = [
            a
            for a in candidates
            if a["metadatos"].get("alerta_calidad") == "CONTENIDO_IDENTICO_OTRO_CORTE"
        ]
        clone_files = [
            {
                "nombre_archivo": a["nombre_archivo"],
                "entidad": a["entidad"],
                "vigencia": a["vigencia"],
                "corte_periodo": a["corte_periodo"],
                "corte_clonado_de": a["metadatos"].get("corte_clonado_de"),
                "filas_extraidas": a["filas_extraidas"],
                "huella_tabular_sha256": a["metadatos"].get("huella_tabular_sha256"),
            }
            for a in clones
        ]
        same_cut = [
            {
                "nombre_archivo": a["nombre_archivo"],
                "entidad": a["entidad"],
                "vigencia": a["vigencia"],
                "clones_tabulares_fusionados": a["metadatos"].get(
                    "clones_tabulares_fusionados", []
                ),
            }
            for a in candidates
            if a["metadatos"].get("clones_tabulares_fusionados")
        ]
        selected = [
            r
            for r in rows
            if (not entity_norm or _norm(r["entidad_normalizada"]) == entity_norm)
            and (vigencia is None or r["vigencia"] == vigencia)
        ]
        by_activity: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
        for r in selected:
            key = (
                r["entidad_normalizada"],
                r["vigencia"],
                r["codigo_bpim"],
                r["codigo_meta_pdd"],
                _norm(r["indicador"] or r["descripcion_actividad"]),
            )
            if key[-1]:
                by_activity[key].append(r)
        zombies = []
        for key, items in by_activity.items():
            cuts = {
                r["corte_periodo"] for r in items if r["corte_periodo"] in {"T1", "T2", "T3", "T4"}
            }
            vals = [
                _num(
                    r["avance_fisico_pct"] if r["avance_fisico_pct"] is not None else r["avance_t4"]
                )
                for r in items
                if r["corte_periodo"] in cuts
            ]
            if len(cuts) >= 2 and vals and len(set(vals)) == 1:
                zombies.append(
                    {
                        "entidad": key[0],
                        "vigencia": key[1],
                        "codigo_bpim": key[2],
                        "codigo_meta_pdd": key[3],
                        "indicador": key[4],
                        "cortes": sorted(cuts),
                        "avance_pct": vals[0],
                    }
                )
        zombie_rows = sorted(zombies, key=lambda x: (x["entidad"] or "", x["vigencia"] or 0))[:25]
        per_entity_year: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
        for r in selected:
            if r["entidad_normalizada"] and r["vigencia"]:
                per_entity_year[(r["entidad_normalizada"], r["vigencia"])].append(r)
        december = []
        for (entity, year), items in per_entity_year.items():
            quarterly = [
                _num(r[f"avance_t{i}"])
                for r in items
                for i in range(1, 4)
                if r[f"avance_t{i}"] is not None
            ]
            annual = [
                _num(r["avance_t4"] if r["avance_t4"] is not None else r["avance_fisico_pct"])
                for r in items
                if r["corte_periodo"] in {"T4", "ANUAL"}
            ]
            if quarterly and annual:
                jump = sum(annual) / len(annual) - sum(quarterly) / len(quarterly)
                if jump >= 50:
                    december.append(
                        {
                            "entidad": entity,
                            "vigencia": year,
                            "salto_pct": round(jump, 2),
                            "avance_promedio_t1_t3_pct": round(sum(quarterly) / len(quarterly), 2),
                            "avance_t4_anual_pct": round(sum(annual) / len(annual), 2),
                        }
                    )
        coverage = []
        for entity in _entidades_canonicas_activas([a["entidad"] for a in archives]):
            years = {}
            for year in range(2016, 2027):
                items = [a for a in candidates if a["entidad"] == entity and a["vigencia"] == year]
                years[str(year)] = {
                    "archivos": len(items),
                    "cortes": sorted({a["corte_periodo"] for a in items if a["corte_periodo"]}),
                }
            covered = [int(y) for y, v in years.items() if v["archivos"]]
            coverage.append(
                {
                    "entidad": entity,
                    "cobertura_anual": years,
                    "anios_con_reporte": covered,
                    "anios_sin_reporte": [y for y in range(2016, 2027) if y not in covered],
                    "indice_transparencia_pct": round(100 * len(covered) / 11, 2),
                }
            )
        return {
            "archivos_corte_clonado": clone_files,
            "clones_tabulares_mismo_corte": same_cut,
            "metas_congeladas_zombies": zombie_rows,
            "efecto_diciembre_magico": sorted(december, key=lambda x: -x["salto_pct"])[:25],
            "matriz_completitud_entidades": coverage,
            "total_metas_congeladas_zombies": len(zombies),
            "total_efecto_diciembre_magico": len(december),
        }

    @_cache_result
    async def alineacion_territorial(self):
        rows, _ = await self._snapshot()
        total_hurtos, total_mesas = await self._ancillary()
        from app.modules.mesas.models import Mesa

        mesa_rows = (
            await self.session.execute(
                select(Mesa.nombre, Mesa.lugar_nombre, Mesa.total_asistentes)
            )
        ).all()
        by_locality: dict[str, list[dict[str, Any]]] = {name: [] for name in _LOCALIDADES}
        focus: dict[str, dict[str, Any]] = {}
        barrios_por_localidad: dict[str, Counter[str]] = {name: Counter() for name in _LOCALIDADES}
        for row in rows:
            text = _norm_fast(
                " ".join(
                    str(row.get(k) or "")
                    for k in ("descripcion_actividad", "indicador", "linea_estrategica")
                )
            )
            mentions = set(_LOCALIDAD_PATTERN.findall(text))
            matches = set()
            entity_loc = _ENTIDAD_LOCALIDAD.get(row["entidad_normalizada"])
            if entity_loc:
                matches.add(entity_loc)
            for mention in mentions:
                locality = _ALIAS_LOCALIDAD.get(mention)
                if locality:
                    matches.add(locality)
                    barrios_por_localidad[locality][mention] += 1
            for locality in matches:
                by_locality[locality].append(row)
            if row["motor_destino"] == "PLAN_ACCION":
                for name in mentions:
                    item = focus.setdefault(
                        name,
                        {
                            "barrio": name,
                            "actividades": 0,
                            "entidades": set(),
                            "presupuesto_asociado_cop": 0.0,
                        },
                    )
                    item["actividades"] += 1
                    if row["entidad_normalizada"]:
                        item["entidades"].add(row["entidad_normalizada"])
                    item["presupuesto_asociado_cop"] += _num(row["apropiacion_definitiva_cop"])
        localidades = []
        for locality, items in by_locality.items():
            appropriation = sum(_num(r["apropiacion_definitiva_cop"]) for r in items)
            payments = sum(_num(r["pagos_tesoreria_cop"]) for r in items)
            # Mesas no siempre tienen localidad estructurada; clasificar solo por nombre/lugar.
            terms = _LOCALIDADES[locality]
            locality_mesas = [
                m for m in mesa_rows if any(term in _norm(f"{m[0]} {m[1] or ''}") for term in terms)
            ]
            investment_share = (
                100
                * appropriation
                / max(sum(_num(r["apropiacion_definitiva_cop"]) for r in rows), 1)
            )
            demand_share = 100 * len(locality_mesas) / max(total_mesas, 1)
            gap = abs(investment_share - demand_share)
            barrios = [name for name, _ in barrios_por_localidad[locality].most_common(10)]
            localidades.append(
                {
                    "localidad": locality,
                    "registros_triada": len(items),
                    "actividades_plan_accion": sum(
                        r["motor_destino"] == "PLAN_ACCION" for r in items
                    ),
                    "metas_pdd": len({r["codigo_meta_pdd"] for r in items if r["codigo_meta_pdd"]}),
                    "apropiacion_cop": appropriation,
                    "pagos_cop": payments,
                    "mesas_ciudadanas": len(locality_mesas),
                    "asistentes_mesas": sum(int(m[2] or 0) for m in locality_mesas),
                    "proporcion_inversion_pct": round(investment_share, 2),
                    "proporcion_demanda_ciudadana_pct": round(demand_share, 2),
                    "brecha_desalineacion_pct": round(gap, 2),
                    "estado_alineacion": "ALINEADO"
                    if gap < 10
                    else "SUBINVERSION_MODERADA"
                    if investment_share < demand_share
                    else "DEFICIT_CRITICO_ATENCION",
                    "barrios_mencionados_top": barrios,
                }
            )
        barrios = sorted(focus.values(), key=lambda x: (-x["actividades"], x["barrio"]))[:20]
        for item in barrios:
            item["entidades"] = sorted(item["entidades"])
        return {
            "resumen_territorial": {
                "total_hurtos_bd": total_hurtos,
                "total_mesas_trabajo_bd": total_mesas,
                "total_registros_triada_territorializados": len(
                    set(r["id"] for values in by_locality.values() for r in values)
                ),
                "apropiacion_territorializada_cop": sum(
                    sum(_num(r["apropiacion_definitiva_cop"]) for r in values)
                    for values in by_locality.values()
                ),
            },
            "localidades": localidades,
            "barrios_foco": barrios,
        }

    @_cache_result
    async def buscador(
        self, *, q="seguridad", vigencia=None, periodo=None, dimension=None, motor=None, limite=50
    ):
        rows, _ = await self._snapshot()
        terms = [_norm(t) for t in q.split() if _norm(t)]
        matches = []
        for row in rows:
            if vigencia is not None and row["vigencia"] != vigencia:
                continue
            if periodo and _period(row) != periodo:
                continue
            if dimension and dimension not in (row["dimensiones_seguridad_humana"] or []):
                continue
            if motor and row["motor_destino"] != motor:
                continue
            haystack = _norm_fast(
                " ".join(
                    str(row.get(k) or "")
                    for k in (
                        "descripcion_actividad",
                        "indicador",
                        "linea_estrategica",
                        "codigo_bpim",
                        "programa",
                    )
                )
            )
            if terms and not all(term in haystack for term in terms):
                continue
            matches.append(row)
        entities: dict[str, list[dict[str, Any]]] = defaultdict(list)
        annual: dict[int, list[dict[str, Any]]] = defaultdict(list)
        duplicate: dict[tuple[int, str], dict[str, Any]] = {}
        for row in matches:
            if row["entidad_normalizada"]:
                entities[row["entidad_normalizada"]].append(row)
            if row["vigencia"]:
                annual[row["vigencia"]].append(row)
                code = row["codigo_bpim"] or row["codigo_meta_pdd"]
                if _clave_identificadora_valida(code):
                    key = (row["vigencia"], code)
                    item = duplicate.setdefault(
                        key,
                        {
                            "vigencia": row["vigencia"],
                            "code": code,
                            "entities": set(),
                            "rows": [],
                            "amount": 0.0,
                        },
                    )
                    if row["entidad_normalizada"]:
                        item["entities"].add(row["entidad_normalizada"])
                    item["rows"].append(row)
                    item["amount"] += _num(row["apropiacion_definitiva_cop"])
        dup_alerts = [
            {
                "vigencia": item["vigencia"],
                "entidades": sorted(e for e in item["entities"] if e),
                "tema_superpuesto": item["code"],
                "registros_involucrados": len(item["rows"]),
                "apropiacion_conjunta_cop": item["amount"],
            }
            for item in duplicate.values()
            if len(item["entities"]) >= 2
        ]
        entity_list = [
            {
                "entidad": entity,
                "registros": len(items),
                "apropiacion_cop": sum(_num(r["apropiacion_definitiva_cop"]) for r in items),
                "pagos_cop": sum(_num(r["pagos_tesoreria_cop"]) for r in items),
                "motores": sorted({r["motor_destino"] for r in items}),
            }
            for entity, items in entities.items()
        ]
        entity_list.sort(key=lambda x: (-x["registros"], x["entidad"]))
        annual_result = {
            str(year): {
                "registros": len(items),
                "apropiacion_cop": sum(_num(r["apropiacion_definitiva_cop"]) for r in items),
            }
            for year, items in sorted(annual.items())
        }
        sample = [
            {
                "vigencia": r["vigencia"],
                "entidad": r["entidad_normalizada"],
                "motor": r["motor_destino"],
                "codigo_bpim": r["codigo_bpim"],
                "codigo_meta_pdd": r["codigo_meta_pdd"],
                "indicador": r["indicador"],
                "descripcion_actividad": r["descripcion_actividad"],
                "apropiacion_cop": _num(r["apropiacion_definitiva_cop"]),
                "avance_fisico_pct": _num(r["avance_fisico_pct"]),
            }
            for r in matches[:limite]
        ]
        return {
            "consulta": {
                "q": q,
                "vigencia": vigencia,
                "periodo": periodo,
                "dimension": dimension,
                "motor": motor,
                "limite": limite,
            },
            "total_coincidencias": len(matches),
            "presupuesto_asociado": {
                "apropiacion_total_cop": sum(
                    _num(r["apropiacion_definitiva_cop"]) for r in matches
                ),
                "obligaciones_total_cop": sum(_num(r["obligaciones_cop"]) for r in matches),
                "pagos_total_cop": sum(_num(r["pagos_tesoreria_cop"]) for r in matches),
            },
            "entidades_involucradas": entity_list,
            "evolucion_anual": annual_result,
            "alertas_duplicidad_institucional": dup_alerts,
            "muestra_registros": sample,
        }

    @_cache_result
    async def simulador_cierre(self, *, entidad=None, dimension=None):
        rows, _ = await self._snapshot()
        selected = [
            r
            for r in rows
            if (not entidad or _norm(r["entidad_normalizada"]) == _norm(entidad))
            and (not dimension or dimension in (r["dimensiones_seguridad_humana"] or []))
        ]
        current = [r for r in selected if r["vigencia"] and 2024 <= r["vigencia"] <= 2026]
        historic = [r for r in selected if r["vigencia"] and 2016 <= r["vigencia"] <= 2023]

        def project(group, hist):
            vals = [
                _num(
                    r["avance_estrategico_pct"]
                    if r["avance_estrategico_pct"] is not None
                    else r["avance_fisico_pct"]
                )
                for r in group
                if r["avance_estrategico_pct"] is not None or r["avance_fisico_pct"] is not None
            ]
            actual = sum(vals) / len(vals) if vals else 0.0
            annual_history: dict[int, list[float]] = defaultdict(list)
            for row in hist:
                if row["vigencia"] and (
                    row["avance_estrategico_pct"] is not None
                    or row["avance_fisico_pct"] is not None
                ):
                    annual_history[row["vigencia"]].append(
                        _num(
                            row["avance_estrategico_pct"]
                            if row["avance_estrategico_pct"] is not None
                            else row["avance_fisico_pct"]
                        )
                    )
            year_means = {
                year: sum(values) / len(values) for year, values in annual_history.items()
            }
            history_years = sorted(year_means)
            speed = (
                max(
                    0.0,
                    (year_means[history_years[-1]] - year_means[history_years[0]])
                    / max(history_years[-1] - history_years[0], 1),
                )
                if len(history_years) >= 2
                else actual / max(len({r["vigencia"] for r in group if r["vigencia"]}), 1)
            )
            forecast = min(100.0, max(0.0, actual + speed * 1.25))
            probability = min(100.0, max(0.0, forecast))
            return actual, speed, forecast, probability

        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        hist_by_entity: dict[str, list[dict[str, Any]]] = defaultdict(list)
        dims: dict[str, list[dict[str, Any]]] = defaultdict(list)
        hist_by_dim: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in current:
            if row["entidad_normalizada"]:
                grouped[row["entidad_normalizada"]].append(row)
            for name in row["dimensiones_seguridad_humana"] or []:
                dims[name].append(row)
        for row in historic:
            if row["entidad_normalizada"]:
                hist_by_entity[row["entidad_normalizada"]].append(row)
            for name in row["dimensiones_seguridad_humana"] or []:
                hist_by_dim[name].append(row)
        projections = []
        for entity, items in grouped.items():
            actual, speed, forecast, probability = project(items, hist_by_entity[entity])
            projections.append(
                {
                    "entidad": entity,
                    "registros_2024_2027": len(items),
                    "avance_actual_pct": round(actual, 2),
                    "velocidad_anual_historica_pct": round(speed, 2),
                    "proyeccion_cierre_2027_pct": round(forecast, 2),
                    "probabilidad_cumplimiento_pct": round(probability, 2),
                    "semaforo_predictivo": "CUMPLIRA"
                    if probability >= 80
                    else "RIESGO_MODERADO"
                    if probability >= 50
                    else "INCUMPLIMIENTO_INMINENTE",
                    "aceleracion_trimestral_requerida_pct": round(max(0, (100 - actual) / 5), 2),
                    "apropiacion_periodo_cop": sum(
                        _num(r["apropiacion_definitiva_cop"]) for r in items
                    ),
                }
            )
        projections.sort(
            key=lambda x: (x["semaforo_predictivo"], -x["avance_actual_pct"], x["entidad"])
        )
        dim_projections = []
        for name in DIMENSIONES:
            items = dims[name]
            actual, _, forecast, _ = project(items, hist_by_dim[name])
            dim_projections.append(
                {
                    "dimension": name,
                    "registros_2024_2027": len(items),
                    "avance_actual_pct": round(actual, 2),
                    "proyeccion_cierre_2027_pct": round(forecast, 2),
                    "semaforo_predictivo": "CUMPLIRA"
                    if forecast >= 80
                    else "RIESGO_MODERADO"
                    if forecast >= 50
                    else "INCUMPLIMIENTO_INMINENTE",
                }
            )
        observed_current = [
            r
            for r in current
            if r["avance_estrategico_pct"] is not None or r["avance_fisico_pct"] is not None
        ]
        weighted_actual = (
            sum(
                _num(
                    r["avance_estrategico_pct"]
                    if r["avance_estrategico_pct"] is not None
                    else r["avance_fisico_pct"]
                )
                for r in observed_current
            )
            / len(observed_current)
            if observed_current
            else 0.0
        )
        weighted_forecast = sum(
            p["proyeccion_cierre_2027_pct"] * p["registros_2024_2027"] for p in projections
        ) / max(sum(p["registros_2024_2027"] for p in projections), 1)
        return {
            "horizonte": {
                "periodo": "2024_2027",
                "anios_evaluados": [2024, 2025, 2026],
                "anio_cierre": 2027,
                "fraccion_tiempo_transcurrido_pct": 62.5,
            },
            "resumen_prediccion": {
                "entidades_cumpliran": sum(
                    p["semaforo_predictivo"] == "CUMPLIRA" for p in projections
                ),
                "entidades_riesgo_moderado": sum(
                    p["semaforo_predictivo"] == "RIESGO_MODERADO" for p in projections
                ),
                "entidades_incumplimiento_inminente": sum(
                    p["semaforo_predictivo"] == "INCUMPLIMIENTO_INMINENTE" for p in projections
                ),
                "avance_actual_ponderado_pct": round(weighted_actual, 2),
                "avance_proyectado_2027_pct": round(weighted_forecast, 2),
            },
            "proyecciones_por_entidad": projections,
            "proyecciones_por_dimension": dim_projections,
        }

    @_cache_result
    async def resumen_ejecutivo(self):
        rows, archives = await self._snapshot()
        total_records = await self.session.scalar(
            select(func.count()).select_from(RegistroTriadaNormalizado)
        )
        m1 = await self.patologias_dnp(vigencia=None, periodo=None, dimension=None, entidad=None)
        m2 = await self.continuidad_gobiernos(dimension=None, entidad=None)
        m3 = await self.radar_transparencia(entidad=None, vigencia=None)
        m4 = await self.alineacion_territorial()
        m5 = await self.buscador(
            q="seguridad", vigencia=None, periodo=None, dimension=None, motor=None, limite=50
        )
        m6 = await self.simulador_cierre(entidad=None, dimension=None)
        return {
            "universo": {
                "total_registros_saneados": total_records or 0,
                "total_archivos_activos": len(archives),
                "entidades_canonicas": len(
                    {r["entidad_normalizada"] for r in rows if r["entidad_normalizada"]}
                ),
                "cobertura_entidad_canonica_pct": round(
                    100 * sum(r["entidad_normalizada"] is not None for r in rows) / len(rows), 2
                )
                if rows
                else 0,
                "bpims_unicos": len(
                    {
                        r["codigo_bpim"]
                        for r in rows
                        if _clave_identificadora_valida(r["codigo_bpim"])
                    }
                ),
                "metas_pdd_unicas": len(
                    {r["codigo_meta_pdd"] for r in rows if r["codigo_meta_pdd"]}
                ),
            },
            "motor_1_patologias": {
                "resumen_global": m1["resumen_global"],
                "ranking_entidades_dnp": m1["ranking_entidades_dnp"][:10],
                "casos_criticos": m1["casos_criticos"][:10],
            },
            "motor_2_continuidad": {
                "comparativa_periodos": m2["comparativa_periodos"],
                "continuidad_bpim": m2["continuidad_bpim"],
                "migracion_dimensiones_seguridad": m2["migracion_dimensiones_seguridad"],
                "metas_recicladas": m2["metas_recicladas"][:10],
            },
            "motor_3_transparencia": {
                "archivos_corte_clonado": m3["archivos_corte_clonado"],
                "clones_tabulares_mismo_corte": m3["clones_tabulares_mismo_corte"],
                "matriz_completitud_entidades": m3["matriz_completitud_entidades"][:10],
                "conteo_metas_congeladas_zombies": m3["total_metas_congeladas_zombies"],
                "conteo_efecto_diciembre_magico": m3["total_efecto_diciembre_magico"],
            },
            "motor_4_territorial": {
                "resumen_territorial": m4["resumen_territorial"],
                "localidades": m4["localidades"],
                "barrios_foco": m4["barrios_foco"][:10],
            },
            "motor_5_buscador_destacado": m5,
            "motor_6_simulador_2027": {
                "horizonte": m6["horizonte"],
                "resumen_prediccion": m6["resumen_prediccion"],
                "proyecciones_por_entidad": m6["proyecciones_por_entidad"][:15],
                "proyecciones_por_dimension": m6["proyecciones_por_dimension"],
            },
        }
