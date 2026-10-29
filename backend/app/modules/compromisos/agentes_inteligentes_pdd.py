"""Capa neurosimbólica de consulta PDD con tools SQL y orquestación LangGraph."""

from __future__ import annotations

import asyncio
import hashlib
import inspect
import json
import os
import re
import time
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .catalogo_planeacion_corte_polis import ReferenciaCatalogoPlaneacion, comprobar_matriz_y_catalogo
from .contexto_corte_polis import ContextoCorte
from .correspondencias_meta_pa_polis import resumir_matriz_correspondencias
from .matriz_correspondencias_corte_polis import ReferenciaMatrizPlaneacion
from .ppi_planeacion_corte_polis import ReferenciaPPIPlaneacion

MOTOR = "POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2"
DIMENSIONES = (
    "Personal",
    "Comunitaria",
    "Económica",
    "Alimentaria",
    "Salud",
    "Ambiental",
    "Política",
)
# Alias dentro de la taxonomía heredada. No son equivalencias con PERS/COM/.../SAT.
ETIQUETAS_DIMENSIONES_HEREDADAS = {
    dimension: (dimension, "Seguridad en la Salud" if dimension == "Salud" else f"Seguridad {dimension}")
    for dimension in DIMENSIONES
}
MAX_RESULTADOS = 40
PDT_CACHE_PATH = Path(__file__).resolve().parents[4] / "data" / "planes_desarrollo" / "cache_pdt_ai_evaluator.json"


class ConsultaAgentesPDD(BaseModel):
    pregunta: str = Field(min_length=5, max_length=2000)
    codigo_plan: str = "TODOS"
    dimension_sh: str = "TODAS"
    grado_frontalidad: str = "TODOS"
    profundidad: str = "forense"
    archivo: str | None = None


class InterpretarFragmentoPDD(BaseModel):
    texto_fragmento: str = Field(min_length=10, max_length=30000)
    codigo_plan_referencia: str = "PDD_2024_2027"
    archivo_origen: str | None = None
    pagina: int | None = Field(default=None, ge=1)


@dataclass
class ToolContext:
    session: AsyncSession | None
    consulta: ConsultaAgentesPDD
    corte: ContextoCorte | None = None
    planeacion: ReferenciaMatrizPlaneacion | None = None
    catalogo: ReferenciaCatalogoPlaneacion | None = None
    ppi: ReferenciaPPIPlaneacion | None = None
    invocaciones: list[dict[str, Any]] = field(default_factory=list)
    resultados: dict[str, Any] = field(default_factory=dict)
    ampliar_busqueda: bool = False
    cobertura_universo_bd: dict[str, Any] = field(default_factory=dict)
    cobertura_universo_operativo: dict[str, Any] = field(default_factory=dict)
    cobertura_nodos: dict[str, Any] = field(default_factory=dict)


class GrafoState(TypedDict, total=False):
    consulta: ConsultaAgentesPDD
    contexto: ToolContext
    traza: list[dict[str, Any]]
    evidencias: list[dict[str, Any]]
    nodos: list[dict[str, Any]]
    metas: list[dict[str, Any]]
    conciliacion: list[dict[str, Any]]
    articulacion: list[dict[str, Any]]
    evaluacion_pdt_gbr: dict[str, Any]
    iteracion: int
    aprobado: bool
    observacion: str
    reintento_consumido: bool


def _plain(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [_plain(v) for v in value]
    return value


def _row_dict(row: Any) -> dict[str, Any]:
    return _plain(dict(row))


def _terms(query: str) -> list[str]:
    return [term for term in re.findall(r"[\wáéíóúñ]{4,}", query.casefold())[:12]]


def _read_pdt_cache() -> dict[str, Any] | None:
    try:
        payload = json.loads(PDT_CACHE_PATH.read_text(encoding="utf-8"))
        runs = payload.get("runs", {})
        if not runs:
            return None
        return max(
            runs.values(),
            key=lambda item: str(item.get("generado_en") or item.get("thread_id") or ""),
        )
    except (OSError, TypeError, ValueError):
        return None


async def _load_pdt_diagnostic(
    session: AsyncSession, corte: ContextoCorte | None = None
) -> tuple[dict[str, Any] | None, str]:
    if corte is not None:
        corte.verificar()
    diagnostic = await asyncio.to_thread(_read_pdt_cache) if corte is None else None
    if diagnostic:
        return diagnostic, "cache_pdt_ai_evaluator.json"
    try:
        from app.modules.compromisos.pdt_ai_evaluator_graph import ejecutar_pdt_ai_evaluator

        if corte is not None:
            thread_id = f"pdt-{corte.run_id}"
            resultado = await ejecutar_pdt_ai_evaluator(session, thread_id=thread_id, force_refresh=True)
            if resultado.get("thread_id") != thread_id:
                raise ValueError("El PDT devolvió una identidad de hilo ajena al corte")
            if resultado.get("estado_checkpointer") != "COMPLETADO_SIN_BLOQUEO":
                raise ValueError("El PDT no completó su evaluación para el corte")
            return resultado, "ejecucion_pdt_ai_evaluator_mismo_run_id"
        return await ejecutar_pdt_ai_evaluator(session), "ejecucion_pdt_ai_evaluator"
    except Exception:
        if corte is not None:
            raise
        return None, "PDT-AI-EVALUATOR no disponible"


def _matches_pdt_filter(value: Any, terms: list[str], plan_code: str) -> bool:
    haystack = str(value or "").casefold()
    plan_matches = True
    if plan_code != "TODOS":
        plan = plan_code.casefold()
        years = re.findall(r"20\d{2}", plan)
        plan_matches = plan in haystack
        row_year = re.search(r"20\d{2}", haystack)
        plan_matches = plan_matches or bool(
            years and row_year and int(years[0]) <= int(row_year.group()) <= int(years[-1])
        )
    terms_match = not terms or any(term.casefold() in haystack for term in terms)
    return plan_matches and terms_match


async def _evaluacion_pdt_gbr(
    session: AsyncSession, consulta: ConsultaAgentesPDD, corte: ContextoCorte | None = None
) -> dict[str, Any]:
    diagnostic, source = await _load_pdt_diagnostic(session, corte)
    if not diagnostic:
        return {
            "estado": "PENDIENTE",
            "fuente": source,
            "dmu_dea": [],
            "alertas_mission_creep": [],
            "trampas_territoriales": [],
            "indicadores_isri_alto_riesgo": [],
            "dictamenes_dependencias": [],
            "hoshin_kanri_fair": {"estado": "PENDIENTE"},
            "revision_10d_resumen": {"estado": "PENDIENTE"},
            "dea_4_niveles_cartagena": await _resumen_dea_4_niveles_cartagena(session),
        }
    terms = _terms(consulta.pregunta)
    dea = diagnostic.get("dea_scores", {})
    selected_dmus = [
        row for row in dea.get("resultados_dmu", []) if _matches_pdt_filter(row.get("dmu"), terms, consulta.codigo_plan)
    ]
    relevant_dependencies = {str(row.get("dmu", "")).rsplit("|", 1)[0] for row in selected_dmus}
    nlp = diagnostic.get("nlp_coherence", {})
    alerts = [
        row
        for row in nlp.get("alertas_mission_creep", [])
        if _matches_pdt_filter(
            " ".join(
                str(row.get(key) or "")
                for key in (
                    "codigo_plan",
                    "actividad_operativa",
                    "meta_estrategica",
                    "dependencias",
                )
            ),
            terms,
            consulta.codigo_plan,
        )
    ][:100]
    spatial = diagnostic.get("spatial_lisa", {})
    traps = [
        row
        for row in spatial.get("trampas_territoriales_gestion_publica", [])
        if _matches_pdt_filter(row.get("unidad_dmu") or row.get("diagnostico"), terms, consulta.codigo_plan)
    ][:100]
    forecast = diagnostic.get("time_series_forecast", {})
    risks = [
        row
        for row in forecast.get("series", [])
        if row.get("ISRI") is not None
        and float(row["ISRI"]) > 0.40
        and (
            _matches_pdt_filter(row.get("indicador"), terms, consulta.codigo_plan)
            or any(
                dependency.casefold() in str(row.get("indicador", "")).casefold()
                for dependency in relevant_dependencies
            )
        )
    ][:100]
    from app.modules.compromisos.pdt_dictamen_ejecutivo import generar_dictamen_ejecutivo_pdt

    report = generar_dictamen_ejecutivo_pdt(diagnostic)
    briefs = [
        row
        for row in report.get("dictamenes_dependencias", [])
        if (
            any(row["dependencia"].casefold() in name.casefold() for name in relevant_dependencies)
            if relevant_dependencies
            else _matches_pdt_filter(row.get("dependencia"), terms, consulta.codigo_plan)
        )
    ]
    hoshin_summary = await _resumen_hoshin_kanri(diagnostic, consulta)
    revision_summary = await _resumen_revision_10d(session, diagnostic, consulta)
    dea4_summary = await _resumen_dea_4_niveles_cartagena(session)
    return {
        "estado": diagnostic.get("estado_checkpointer", "DISPONIBLE"),
        "fuente": source,
        "consulta": consulta.pregunta,
        "codigo_plan": consulta.codigo_plan,
        "dmu_dea": [
            {
                key: row.get(key)
                for key in (
                    "dmu",
                    "theta_ccr",
                    "theta_bcc",
                    "SE_o",
                    "rendimientos_escala",
                    "slacks",
                    "origen_insumo",
                )
            }
            for row in selected_dmus[:100]
        ],
        "alertas_mission_creep": alerts,
        "coldspots_lisa": [
            row
            for row in spatial.get("lisa", [])
            if "Bajo-Bajo" in str(row.get("cluster", "")) and _matches_pdt_filter(row.get("unidad"), terms, "TODOS")
        ],
        "trampas_territoriales": traps,
        "indicadores_isri_alto_riesgo": risks,
        "pruebas_chow_2024": [{"indicador": row.get("indicador"), **(row.get("chow") or {})} for row in risks],
        "dictamenes_dependencias": briefs,
        "hoshin_kanri_fair": hoshin_summary,
        "revision_10d_resumen": revision_summary,
        "dea_4_niveles_cartagena": dea4_summary,
    }


async def _resumen_dea_4_niveles_cartagena(session: AsyncSession) -> dict[str, Any]:
    try:
        from app.modules.compromisos.pdd_dea_service import (
            obtener_dea_cartagena_4_niveles,
            obtener_tablero_dea_cartagena,
        )

        levels = await obtener_dea_cartagena_4_niveles(db=session)
        tablero = await obtener_tablero_dea_cartagena(db=session)
        return {
            "estado": levels.get("estado", "DISPONIBLE"),
            "niveles": {
                name: {key: value.get(key, 0) for key in ("total_dmus", "eficientes", "ineficientes")}
                for name, value in (levels.get("niveles") or {}).items()
            },
            "alertas_tablero_alcalde": tablero.get("alertas_falso_cumplimiento_nominal", []),
            "total_alertas_tablero_alcalde": tablero.get("total_alertas_falso_cumplimiento_nominal", 0),
            "benchmarks_armonizacion_presupuestal": tablero.get("benchmarks_armonizacion_presupuestal", []),
        }
    except Exception as exc:
        return {"estado": "NO_DISPONIBLE", "detalle": type(exc).__name__}


async def _resumen_hoshin_kanri(diagnostic: dict[str, Any], consulta: ConsultaAgentesPDD) -> dict[str, Any]:
    try:
        from app.modules.compromisos.pdt_hoshin_kanri import construir_matriz_x_hoshin_kanri_pdt

        result = await asyncio.to_thread(
            construir_matriz_x_hoshin_kanri_pdt,
            diagnostico=diagnostic,
            codigo_plan=None if consulta.codigo_plan == "TODOS" else consulta.codigo_plan,
        )
        if inspect.isawaitable(result):
            result = await result
        fair = result.get("evaluacion_fair") or {}
        charts = result.get("bowling_charts") or []
        states: dict[str, int] = {}
        for chart in charts:
            state = str(chart.get("color_semaforo") or chart.get("estado") or "SIN_ESTADO")
            states[state] = states.get(state, 0) + 1
        return {
            "estado": "DISPONIBLE",
            **{
                key: fair.get(key)
                for key in (
                    "fair_global_index",
                    "focus_score",
                    "alignment_score",
                    "integration_score",
                    "review_score",
                )
            },
            "bowling_charts_pdca": {
                "total": len(charts),
                "conteo_estados": states,
            },
        }
    except Exception as exc:
        return {"estado": "NO_DISPONIBLE", "detalle": type(exc).__name__}


async def _resumen_revision_10d(
    session: AsyncSession, diagnostic: dict[str, Any], consulta: ConsultaAgentesPDD
) -> dict[str, Any]:
    try:
        from app.modules.compromisos.pdt_revision_por_meta import (
            construir_matriz_revision_por_meta_pdt,
        )

        parameters = inspect.signature(construir_matriz_revision_por_meta_pdt).parameters
        kwargs = {
            "db": session,
            "diagnostico": diagnostic,
            "codigo_plan": ("PDD_2024_2027" if consulta.codigo_plan == "TODOS" else consulta.codigo_plan),
            "dependencia": None,
            "limit": 100,
        }
        kwargs = {name: value for name, value in kwargs.items() if name in parameters}
        if inspect.iscoroutinefunction(construir_matriz_revision_por_meta_pdt):
            result = await construir_matriz_revision_por_meta_pdt(**kwargs)
        else:
            result = await asyncio.to_thread(construir_matriz_revision_por_meta_pdt, **kwargs)
            if inspect.isawaitable(result):
                result = await result
        if not isinstance(result, dict):
            return {"estado": "NO_DISPONIBLE"}
        summary = result.get("resumen_ejecutivo_revision") or result.get("resumen_auditoria")
        return {
            "estado": "DISPONIBLE" if summary is not None else "RESUMEN_NO_DISPONIBLE",
            "total_metas_evaluadas": result.get("total_metas_evaluadas", result.get("metas_devueltas", 0)),
            "resumen_ejecutivo_revision": summary or {},
        }
    except Exception as exc:
        return {"estado": "NO_DISPONIBLE", "detalle": type(exc).__name__}


async def _query_evidencias(ctx: ToolContext) -> list[dict[str, Any]]:
    consulta = ctx.consulta
    tokens = _terms(consulta.pregunta)
    if ctx.ampliar_busqueda:
        tokens = tokens[:5]
    predicates = ["codigo_plan = :plan"] if consulta.codigo_plan != "TODOS" else []
    if consulta.archivo:
        predicates.append("archivo = :archivo")
    params: dict[str, Any] = {
        "plan": consulta.codigo_plan,
        "archivo": consulta.archivo or "",
        "limit": MAX_RESULTADOS,
    }
    token_predicates = []
    for index, token in enumerate(tokens):
        params[f"term_{index}"] = f"%{token}%"
        token_predicates.append(f"contenido ILIKE :term_{index}")
    if token_predicates:
        predicates.append("(" + " OR ".join(token_predicates) + ")")
    where = " AND ".join(predicates) if predicates else "TRUE"
    rows = (
        (
            await ctx.session.execute(
                text(
                    f"""SELECT codigo_plan, archivo, pagina, sha256_contenido, origen_texto,
                           filas_tabla_detectadas, contenido
                    FROM seguimiento.pdd_evidencia_paginas
                    WHERE {where}
                    ORDER BY pagina
                    LIMIT :limit"""
                ),
                {**params, "archivo": ""},
            )
        )
        .mappings()
        .all()
    )
    evidence = []
    for row in rows:
        content = str(row["contenido"] or "")
        digest = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
        if digest != row["sha256_contenido"]:
            continue
        evidence.append(
            {
                "codigo_plan": row["codigo_plan"],
                "archivo": row["archivo"],
                "pagina": row["pagina"],
                "sha256_contenido": digest,
                "origen_texto": row["origen_texto"],
                "filas_tabla_detectadas": row["filas_tabla_detectadas"],
                "extracto_relevante": content[:1600],
            }
        )
    return evidence


def _catalogo_del_contexto(ctx: ToolContext):
    if ctx.corte is None or ctx.catalogo is None:
        raise ValueError("El catálogo de planeación requiere corte y referencia verificables")
    etiquetas = {etiqueta for variantes in ETIQUETAS_DIMENSIONES_HEREDADAS.values() for etiqueta in variantes}
    if ctx.consulta.dimension_sh != "TODAS" and ctx.consulta.dimension_sh not in etiquetas:
        raise ValueError("El catálogo conserva la clasificación SH heredada, no códigos de la taxonomía canónica 7D")
    return ctx.catalogo.leer(ctx.corte)


def _query_nodos_corte(ctx: ToolContext, *, limit: int | None = MAX_RESULTADOS) -> list[dict[str, Any]]:
    if limit is not None and limit < 0:
        raise ValueError("El límite de nodos no puede ser negativo")
    catalogo = _catalogo_del_contexto(ctx)
    consulta = ctx.consulta
    etiquetas = next(
        (variantes for variantes in ETIQUETAS_DIMENSIONES_HEREDADAS.values() if consulta.dimension_sh in variantes),
        (),
    )
    terms = _terms(consulta.pregunta)
    needle = terms[0].casefold() if terms else ""
    universo = [n for n in catalogo.nodos if consulta.codigo_plan in ("TODOS", n.codigo_plan)]
    filtrados = [
        n
        for n in universo
        if (consulta.dimension_sh == "TODAS" or n.metadatos.get("dimension_sh_primaria") in etiquetas)
        and (
            consulta.grado_frontalidad == "TODOS"
            or str(n.metadatos.get("grado_frontalidad_sh") or "").startswith(consulta.grado_frontalidad)
        )
        and (not needle or needle in n.nombre.casefold() or needle in (n.codigo or "").casefold())
    ]
    filtrados.sort(key=lambda n: (n.codigo_plan, n.orden, str(n.id)))
    muestra = filtrados if limit is None else filtrados[:limit]
    ctx.cobertura_nodos = {
        "nodos_por_plan_totales": {
            p: c.nodos for p, c in catalogo.cobertura_sql.items() if consulta.codigo_plan in ("TODOS", p)
        },
        "total_nodos_coincidentes_sin_truncar": len(filtrados),
        "nodos_incluidos_en_muestra": len(muestra),
        "muestra_truncada": len(filtrados) > len(muestra),
        "taxonomia": "CLASIFICACION_SH_HEREDADA_NO_CANONICA_7D",
        "etiquetas_dimension_consultadas": list(etiquetas),
        "busqueda": "SUBCADENA_LITERAL_PRIMER_TERMINO",
    }
    return [n.model_dump(mode="json") for n in muestra]


def _query_metas_corte(ctx: ToolContext) -> list[dict[str, Any]]:
    catalogo = _catalogo_del_contexto(ctx)
    terms = _terms(ctx.consulta.pregunta)
    needle = terms[0].casefold() if terms else ""
    universo = [m for m in catalogo.metas if ctx.consulta.codigo_plan in ("TODOS", m.codigo_plan)]
    filtradas = [
        m for m in universo if not needle or needle in m.nombre.casefold() or needle in (m.indicador or "").casefold()
    ]
    filtradas.sort(key=lambda m: (m.codigo_plan, m.fila_fuente is None, m.fila_fuente or 0, str(m.id)))
    muestra = filtradas[:MAX_RESULTADOS]
    totales = {
        p: c.metas for p, c in catalogo.cobertura_sql.items() if c.metas and ctx.consulta.codigo_plan in ("TODOS", p)
    }
    ctx.cobertura_universo_bd = {
        "planes_evaluados_count": len(totales),
        "metas_por_plan_totales": totales,
        "total_metas_coincidentes_sin_truncar": len(filtradas),
        "metas_incluidas_en_muestra": len(muestra),
        "muestra_truncada": len(filtradas) > len(muestra),
        "filtros_aplicados": ["codigo_plan", "primer_termino_nombre_o_indicador"],
        "limite": "Las metas no tienen clasificación SH propia; dimensión y frontalidad solo filtran nodos.",
    }
    return [m.model_dump(mode="json") for m in muestra]


async def _query_nodos(ctx: ToolContext, *, limit: int | None = MAX_RESULTADOS) -> list[dict[str, Any]]:
    if ctx.catalogo is not None:
        return await asyncio.to_thread(_query_nodos_corte, ctx, limit=limit)
    consulta = ctx.consulta
    rows = (
        (
            await ctx.session.execute(
                text(
                    """SELECT id, codigo_plan, parent_id, nivel, codigo, nombre, orden,
                          ppi_anual_cop, fuente, metadatos
                   FROM seguimiento.pdd_lineas_y_programas
                   WHERE (:plan = 'TODOS' OR codigo_plan = :plan)
                     AND (:grado = 'TODOS' OR metadatos->>'grado_frontalidad_sh' LIKE :grado_like)
                     AND (:dimension = 'TODAS' OR metadatos->>'dimension_sh_primaria' = :dimension)
                     AND (
                        :busqueda = '' OR nombre ILIKE :busqueda_like
                        OR codigo ILIKE :busqueda_like
                     )
                   ORDER BY codigo_plan, orden, id LIMIT :limite"""
                ),
                {
                    "plan": consulta.codigo_plan,
                    "grado": consulta.grado_frontalidad,
                    "grado_like": consulta.grado_frontalidad + "%",
                    "dimension": consulta.dimension_sh,
                    "busqueda": " ".join(_terms(consulta.pregunta)),
                    "busqueda_like": f"%{_terms(consulta.pregunta)[0]}%" if _terms(consulta.pregunta) else "%%",
                    "limite": limit,
                },
            )
        )
        .mappings()
        .all()
    )
    return [_row_dict(row) for row in rows]


async def _query_metas(ctx: ToolContext) -> list[dict[str, Any]]:
    if ctx.catalogo is not None:
        return await asyncio.to_thread(_query_metas_corte, ctx)
    terms = _terms(ctx.consulta.pregunta)
    needle = terms[0] if terms else ""
    coverage_rows = (
        (
            await ctx.session.execute(
                text(
                    """SELECT codigo_plan, count(*)::int AS total_metas,
                       count(*) FILTER (WHERE
                         (:needle = '' OR nombre ILIKE :pattern OR indicador ILIKE :pattern)
                       )::int AS total_coincidentes
                       FROM seguimiento.pdd_metas_oficiales
                       WHERE (:plan = 'TODOS' OR codigo_plan = :plan)
                       GROUP BY codigo_plan ORDER BY codigo_plan"""
                ),
                {
                    "plan": ctx.consulta.codigo_plan,
                    "needle": needle,
                    "pattern": f"%{needle}%",
                },
            )
        )
        .mappings()
        .all()
    )
    rows = (
        (
            await ctx.session.execute(
                text(
                    """SELECT id, codigo_plan, linea_id, tipo_meta, codigo, nombre, indicador,
                          unidad_medida, linea_nombre, fuente, fila_fuente, datos_oficiales
                   FROM seguimiento.pdd_metas_oficiales
                   WHERE (:plan = 'TODOS' OR codigo_plan = :plan)
                     AND (:needle = '' OR nombre ILIKE :pattern OR indicador ILIKE :pattern)
                   ORDER BY codigo_plan, fila_fuente NULLS LAST LIMIT :limite"""
                ),
                {
                    "plan": ctx.consulta.codigo_plan,
                    "needle": needle,
                    "pattern": f"%{needle}%",
                    "limite": MAX_RESULTADOS,
                },
            )
        )
        .mappings()
        .all()
    )
    metas = [_row_dict(row) for row in rows]
    totals = {str(row["codigo_plan"]): int(row["total_metas"]) for row in coverage_rows}
    matched = sum(int(row["total_coincidentes"]) for row in coverage_rows)
    ctx.cobertura_universo_bd = {
        "planes_evaluados_count": len(totals),
        "metas_por_plan_totales": totals,
        "total_metas_coincidentes_sin_truncar": matched,
        "metas_incluidas_en_muestra": len(metas),
        "muestra_truncada": matched > len(metas),
    }
    return metas


def _query_ppi_corte(ctx: ToolContext) -> list[dict[str, Any]]:
    """Lee cifras formuladas exactas; no calcula deflación ni agrega jerarquías."""
    if ctx.corte is None or ctx.ppi is None or ctx.catalogo is None:
        raise ValueError("PPI congelado requiere corte, referencia PPI y catálogo")
    if ctx.consulta.dimension_sh != "TODAS" or ctx.consulta.grado_frontalidad != "TODOS":
        raise ValueError("PPI crudo por corte solo admite filtro de plan; no acredita clasificación SH")
    captura = ctx.ppi.leer(ctx.corte)
    catalogo = ctx.catalogo.leer(ctx.corte)
    if captura.base_origen != catalogo.base_origen:
        raise ValueError("PPI y catálogo proceden de bases distintas")
    cobertura = {k: v.model_dump() for k, v in captura.conteos_sql.items()}
    if cobertura != {k: v.model_dump() for k, v in catalogo.cobertura_sql.items()}:
        raise ValueError("Cobertura PPI distinta del catálogo del corte")

    def estructura(n):
        return n.codigo_plan, n.parent_id, n.nivel

    if {n.id: estructura(n) for n in captura.nodos} != {n.id: estructura(n) for n in catalogo.nodos}:
        raise ValueError("Identidades o estructura PPI distintas del catálogo del corte")
    planes = sorted(
        (p for p in captura.planes if ctx.consulta.codigo_plan in {"TODOS", p.codigo_plan}),
        key=lambda p: (p.periodo, p.codigo_plan),
    )
    salida = []
    for plan in planes:
        crudo = plan.model_dump(mode="json")
        estado = (
            "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA"
            if plan.codigo_plan == "PDD_2020_2023"
            else "SIN_IPC_ANUAL_COMPLETO_2026_2027"
            if plan.codigo_plan == "PDD_2024_2027" or plan.codigo_plan.startswith("PDL_")
            else "PPI_CRUDO_SIN_COMPARABILIDAD_ACREDITADA"
        )
        salida.append(
            {
                **crudo,
                "valores_crudos": crudo,
                "ppi_total_corriente_cop": (
                    None if plan.codigo_plan == "PDD_2020_2023" else crudo["ppi_total_corriente_cop"]
                ),
                "ppi_total_constante_2025_cop": None,
                "desglose_abcn_constante_2025_cop": None,
                "desglose_7d_constante_2025_cop": None,
                "estado_financiero": estado,
                "representacion_jsonb": captura.representacion_jsonb,
                "fuente_cifras": "PPI_FORMULADO_CONGELADO",
                "ppi_sha256": ctx.ppi.captura.stem,
                "run_id": str(ctx.corte.run_id),
                "estado_publicacion": "no_publicable",
            }
        )
    ctx.resultados["cobertura_financiera"] = {
        "origen": "PPI_FORMULADO_CONGELADO",
        "run_id": str(ctx.corte.run_id),
        "ppi_sha256": ctx.ppi.captura.stem,
        "catalogo_sha256": ctx.catalogo.catalogo.stem,
        "planes_capturados": len(captura.planes),
        "planes_filtrados": len(planes),
        "conteos_por_plan": {p.codigo_plan: cobertura[p.codigo_plan] for p in planes},
        "filtro_textual_aplicado": False,
        "filtros_aplicados": {"codigo_plan": ctx.consulta.codigo_plan},
        "comparabilidad_financiera_acreditada": False,
        "estado_publicacion": "no_publicable",
        "limite": "Numeric copiado y JSONB crudo; sin ejecución, agregación jerárquica, deflación ni ranking.",
    }
    return salida


async def _query_ppi(ctx: ToolContext) -> list[dict[str, Any]]:
    if ctx.ppi is not None:
        planes = await asyncio.to_thread(_query_ppi_corte, ctx)
        await _query_metas(ctx)
        return planes
    rows = (
        (
            await ctx.session.execute(
                text(
                    """SELECT codigo_plan, periodo, nombre_oficial, ppi_total_corriente_cop,
                          ppi_total_constante_2025_cop, ppi_anual_cop, fuentes, metadatos
                   FROM seguimiento.planes_desarrollo_distrital
                   WHERE (:plan = 'TODOS' OR codigo_plan = :plan)
                   ORDER BY periodo, codigo_plan"""
                ),
                {"plan": ctx.consulta.codigo_plan},
            )
        )
        .mappings()
        .all()
    )
    output = []
    for row in rows:
        plan = _row_dict(row)
        code = str(plan["codigo_plan"])
        sin_total_comparable = (
            code in {"PDD_2020_2023", "PDD_2024_2027"}
            or code.startswith("PDL_")
            or plan.get("ppi_total_constante_2025_cop") is None
        )
        node_rows = (
            (
                await ctx.session.execute(
                    text(
                        """SELECT metadatos FROM seguimiento.pdd_lineas_y_programas
                       WHERE codigo_plan=:plan"""
                    ),
                    {"plan": row["codigo_plan"]},
                )
            )
            .mappings()
            .all()
        )
        grades: dict[str, float] = dict.fromkeys("ABCN", 0.0)
        dimensions = dict.fromkeys(DIMENSIONES, 0.0)
        for node in node_rows:
            metadata = node["metadatos"] or {}
            grade = str(metadata.get("grado_frontalidad_sh", "N"))[:1]
            if grade in grades:
                grades[grade] += float(metadata.get("ppi_total_constante_2025_cop") or 0)
            for dimension, weight in (metadata.get("pesos_7d") or {}).items():
                if dimension in dimensions:
                    dimensions[dimension] += float(metadata.get("ppi_total_constante_2025_cop") or 0) * float(
                        weight or 0
                    )
        if sin_total_comparable:
            if code == "PDD_2020_2023":
                # La BD puede conservar una suma previa aunque el documento tenga tres totales discordantes.
                plan["ppi_total_corriente_cop"] = None
            plan["ppi_total_constante_2025_cop"] = None
            plan["desglose_abcn_constante_2025_cop"] = None
            plan["desglose_7d_constante_2025_cop"] = None
            plan["estado_financiero"] = (
                "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA"
                if code == "PDD_2020_2023"
                else "SIN_IPC_ANUAL_COMPLETO_2026_2027"
                if code == "PDD_2024_2027" or code.startswith("PDL_")
                else "SIN_TOTAL_COMPARABLE"
            )
        else:
            plan["desglose_abcn_constante_2025_cop"] = grades
            plan["desglose_7d_constante_2025_cop"] = dimensions
            plan["estado_financiero"] = "TOTAL_COMPARABLE"
        plan["fuente_cifras"] = "seguimiento.planes_desarrollo_distrital y pdd_lineas_y_programas"
        output.append(plan)
    if ctx.catalogo is not None:
        # El PPI sigue vivo, pero no puede reemplazar el universo de metas fijado por el corte.
        await _query_metas(ctx)
        return output
    terms = _terms(ctx.consulta.pregunta)
    needle = terms[0] if terms else ""
    meta_counts = (
        (
            await ctx.session.execute(
                text(
                    """SELECT codigo_plan, count(*)::int AS total_metas,
                       count(*) FILTER (WHERE
                         (:needle = '' OR nombre ILIKE :pattern OR indicador ILIKE :pattern)
                       )::int AS total_coincidentes
                       FROM seguimiento.pdd_metas_oficiales
                       WHERE (:plan = 'TODOS' OR codigo_plan = :plan)
                       GROUP BY codigo_plan"""
                ),
                {
                    "plan": ctx.consulta.codigo_plan,
                    "needle": needle,
                    "pattern": f"%{needle}%",
                },
            )
        )
        .mappings()
        .all()
    )
    meta_totals = {str(row["codigo_plan"]): int(row["total_metas"]) for row in meta_counts}
    total_matches = sum(int(row["total_coincidentes"]) for row in meta_counts)
    ctx.cobertura_universo_bd = {
        "planes_evaluados_count": len(output),
        "metas_por_plan_totales": meta_totals,
        "total_metas_coincidentes_sin_truncar": total_matches,
        "metas_incluidas_en_muestra": 0,
        "muestra_truncada": total_matches > 0,
    }
    return output


def _query_actividades_corte(ctx: ToolContext) -> list[dict[str, Any]]:
    if ctx.corte is None or ctx.planeacion is None:
        raise ValueError("La lectura de planeación necesita un corte y una referencia de matriz")
    if ctx.consulta.dimension_sh != "TODAS" or ctx.consulta.grado_frontalidad != "TODOS":
        raise ValueError("La matriz congelada no contiene clasificación SH/frontalidad para aplicar esos filtros")
    lectura = ctx.planeacion.leer(ctx.corte)
    filas = [
        fila
        for fila in lectura.matriz.filas
        if ctx.consulta.codigo_plan == "TODOS" or fila.codigo_plan == ctx.consulta.codigo_plan
    ]
    resumen = resumir_matriz_correspondencias(filas)
    activas = [
        fila for fila in filas if fila.actividad_pa_id is not None and fila.estado_correspondencia != "DESCARTADO"
    ]
    muestra = activas[:MAX_RESULTADOS]
    ctx.cobertura_universo_operativo = {
        "origen": "MATRIZ_PLANEACION_CONGELADA",
        "run_id": lectura.run_id,
        "instantanea_sha256": lectura.instantanea_sha256,
        "base_origen": lectura.base_origen,
        "modo_matriz": lectura.modo_matriz,
        "metas_distintas": resumen.metas_distintas,
        "metas_sin_pa_identificado": resumen.metas_sin_pa,
        "metas_con_multiples_actividades": resumen.metas_con_multiples_actividades,
        "pares_meta_pa_sin_truncar": len(activas),
        "total_actividades_pa_coincidentes_sin_truncar": len({fila.actividad_pa_id for fila in activas}),
        "actividades_incluidas_en_muestra": len({fila.actividad_pa_id for fila in muestra}),
        "muestra_truncada": len(muestra) < len(activas),
        "filtro_textual_aplicado": False,
        "total_registros_triada_coincidentes_sin_truncar": None,
        "registros_incluidos_en_muestra": 0,
        "suma_apropiacion_universo_filtrado_cop": None,
        "suma_compromisos_universo_filtrado_cop": None,
        "promedio_avance_fisico_universo_filtrado_pct": None,
        "estado_publicacion": "no_publicable",
        "limite": "Solo filtro de plan; sin filtro léxico, clasificación 7D, ejecución o impacto acreditado.",
    }
    ctx.resultados["cobertura_universo_operativo"] = ctx.cobertura_universo_operativo
    return [
        {
            "codigo_plan": fila.codigo_plan,
            "meta_id": str(fila.meta_id),
            "codigo_meta": fila.codigo_meta,
            "nombre_meta": fila.nombre_meta,
            "nombre_nodo": fila.nodo_plan_nombre,
            "programa_pdd_id": str(fila.programa_pdd_id) if fila.programa_pdd_id else None,
            "programa_pdd_nombre": fila.programa_pdd_nombre,
            "actividad_pa_id": str(fila.actividad_pa_id),
            "actividad_pa_codigo": fila.codigo_actividad_pa,
            "codigo_bpim": fila.codigo_bpim,
            "vigencia": fila.vigencia,
            "estado_correspondencia": fila.estado_correspondencia,
            "documento_evidencia": fila.documento_evidencia,
            "pagina_evidencia": fila.pagina_evidencia,
            "sha256_documento": fila.sha256_documento,
            "instantanea_sha256": lectura.instantanea_sha256,
        }
        for fila in muestra
    ]


async def _query_actividades(ctx: ToolContext) -> list[dict[str, Any]]:
    if ctx.planeacion is not None:
        return await asyncio.to_thread(_query_actividades_corte, ctx)
    rows = (
        (
            await ctx.session.execute(
                text(
                    """SELECT codigo, vigencia, compromiso_pas_codigo, programa_nombre,
                          entidad_responsable, tipo_meta, meta_producto_vigencia, codigo_bpim,
                          proyecto_nombre, descripcion_actividad, porcentaje_avance_fisico,
                          monto_programado_cop, monto_ejecutado_cop
                   FROM seguimiento.actividades_plan_accion
                   ORDER BY vigencia DESC, codigo"""
                )
            )
        )
        .mappings()
        .all()
    )
    activities = [_row_dict(row) for row in rows]
    nodes = await _query_nodos(ctx, limit=None)
    terms = set(_terms(ctx.consulta.pregunta))
    matches = []
    for node in nodes:
        grade = str((node.get("metadatos") or {}).get("grado_frontalidad_sh", "N"))[:1]
        if grade not in {"A", "B"}:
            continue
        node_terms = set(_terms(node.get("nombre", ""))) | terms
        for activity in activities:
            activity_text = " ".join(
                str(activity.get(key) or "") for key in ("programa_nombre", "proyecto_nombre", "descripcion_actividad")
            )
            overlap = set(_terms(activity_text)) & node_terms
            if overlap:
                matches.append(
                    {
                        "codigo_plan": node["codigo_plan"],
                        "codigo_nodo": node.get("codigo"),
                        "nombre_nodo": node["nombre"],
                        "grado_frontalidad": (node.get("metadatos") or {}).get("grado_frontalidad_sh"),
                        "dimension_sh_primaria": (node.get("metadatos") or {}).get("dimension_sh_primaria"),
                        "actividad_pa_codigo": activity["codigo"],
                        "entidad_responsable": activity["entidad_responsable"],
                        "codigo_bpim": activity["codigo_bpim"],
                        "producto_mga_dnp": activity["proyecto_nombre"],
                        "descripcion_actividad": activity["descripcion_actividad"],
                        "porcentaje_avance_fisico": activity["porcentaje_avance_fisico"],
                        "terminos_coincidentes": sorted(overlap),
                    }
                )
    matched_activity_codes = {str(row["actividad_pa_codigo"]) for row in matches if row.get("actividad_pa_codigo")}
    sample = matches[:MAX_RESULTADOS]
    matched_activities = [row for row in activities if str(row.get("codigo")) in matched_activity_codes]
    activity_codes = list(
        {
            str(row[key])
            for row in matched_activities
            for key in ("codigo", "compromiso_pas_codigo", "codigo_bpim")
            if row.get(key)
        }
    )
    triad_rows = []
    if activity_codes:
        triad_rows = (
            (
                await ctx.session.execute(
                    text(
                        """SELECT count(*)::int AS total_registros,
                           count(*) FILTER (WHERE coalesce(apropiacion_definitiva_cop,0)>0
                             OR coalesce(compromisos_rp_cop,0)>0)::int AS registros_con_soporte,
                           coalesce(sum(apropiacion_definitiva_cop),0)::float AS apropiacion,
                           coalesce(sum(compromisos_rp_cop),0)::float AS compromisos
                           FROM seguimiento.registros_triada_normalizados
                           WHERE codigo_bpim = ANY(:codigos) OR codigo_meta_pdd = ANY(:codigos)"""
                    ),
                    {"codigos": activity_codes},
                )
            )
            .mappings()
            .all()
        )
    triad = triad_rows[0] if triad_rows else {}
    advances = [
        float(row["porcentaje_avance_fisico"])
        for row in matched_activities
        if row.get("porcentaje_avance_fisico") is not None
    ]
    ctx.cobertura_universo_operativo = {
        "total_actividades_pa_coincidentes_sin_truncar": len(matched_activity_codes),
        "actividades_incluidas_en_muestra": len(
            {str(row["actividad_pa_codigo"]) for row in sample if row.get("actividad_pa_codigo")}
        ),
        "total_registros_triada_coincidentes_sin_truncar": int(triad.get("total_registros", 0) or 0),
        "registros_incluidos_en_muestra": min(int(triad.get("total_registros", 0) or 0), MAX_RESULTADOS),
        "suma_apropiacion_universo_filtrado_cop": float(triad.get("apropiacion", 0) or 0),
        "suma_compromisos_universo_filtrado_cop": float(triad.get("compromisos", 0) or 0),
        "promedio_avance_fisico_universo_filtrado_pct": (sum(advances) / len(advances) if advances else None),
    }
    ctx.resultados["cobertura_universo_operativo"] = ctx.cobertura_universo_operativo
    return sample


def _record(ctx: ToolContext, name: str, params: dict[str, Any], value: Any) -> Any:
    count = len(value) if isinstance(value, list) else (1 if value else 0)
    ctx.invocaciones.append({"herramienta": name, "parametros": params, "registros_recuperados": count})
    ctx.resultados[name] = value
    return value


def _cognitive_model(messages: list[Any], info: AgentInfo) -> ModelResponse:
    returned = {
        part.tool_name
        for message in messages
        if isinstance(message, ModelRequest)
        for part in message.parts
        if isinstance(part, ToolReturnPart)
    }
    pending = next((tool for tool in info.function_tools if tool.name not in returned), None)
    if pending:
        return ModelResponse(parts=[ToolCallPart(tool_name=pending.name, args={})])
    return ModelResponse(
        parts=[TextPart("Consulta completada con registros recuperados por las herramientas de lectura.")]
    )


def _make_agent(name: str, instructions: str, model: Any) -> Agent:
    return Agent(model, deps_type=ToolContext, output_type=str, instructions=instructions, name=name)


def _build_agents(ctx: ToolContext, *, modelo: Any = None) -> dict[str, Agent]:
    external_model = os.getenv("POLIS_IA_MODELO")
    if modelo is not None:
        model: Any = modelo
    elif os.getenv("OPENAI_API_KEY") and external_model != "test":
        model = external_model or "openai:gpt-4o-mini"
    else:
        model = FunctionModel(_cognitive_model, model_name="polis-pdd-function-cognitive")
    agents = {
        "lector_semantico_documental": _make_agent(
            "AgenteLectorSemanticoDocumental",
            "Busca evidencia documental real; no infieras hechos ausentes.",
            model,
        ),
        "reconstructor_causal_mga": _make_agent(
            "AgenteReconstructorCausalMGA",
            "Consulta estructura jerárquica y metas oficiales del plan.",
            model,
        ),
        "taxonomo_neurosimbolico_sh": _make_agent(
            "AgenteTaxonomoNeurosimbolicoSH",
            "Inspecciona clasificación SH y pesos 7D persistidos.",
            model,
        ),
        "auditor_financiero_ppi": _make_agent(
            "AgenteAuditorFinancieroPPI",
            "Lee PPI crudo del corte; no acredita comparabilidad ni ejecución."
            if ctx.ppi is not None
            else "Concilia únicamente montos leídos de PostgreSQL.",
            model,
        ),
        "articulador_operativo_bpim": _make_agent(
            "AgenteArticuladorOperativoBPIM",
            "Consulta la matriz congelada cuando se aporta; distingue candidatos de acreditaciones. "
            "En consulta SQL independiente cruza nodos A/B con actividades y BPIM existentes.",
            model,
        ),
    }

    @agents["lector_semantico_documental"].tool
    async def tool_buscar_evidencia_paginas_pdd(
        run: RunContext[ToolContext],
    ) -> list[dict[str, Any]]:
        """Buscar páginas de evidencia por términos, plan y archivo en bd_csh."""
        ctx = run.deps
        return _record(
            ctx,
            "tool_buscar_evidencia_paginas_pdd",
            {"pregunta": ctx.consulta.pregunta, "codigo_plan": ctx.consulta.codigo_plan},
            await _query_evidencias(ctx),
        )

    @agents["reconstructor_causal_mga"].tool
    async def tool_consultar_nodos_mga(run: RunContext[ToolContext]) -> list[dict[str, Any]]:
        """Consultar líneas y programas MGA, frontalidad, pesos 7D y PPI."""
        ctx = run.deps
        return _record(
            ctx,
            "tool_consultar_nodos_mga",
            {
                "codigo_plan": ctx.consulta.codigo_plan,
                "dimension_sh": ctx.consulta.dimension_sh,
                "grado_frontalidad": ctx.consulta.grado_frontalidad,
            },
            await _query_nodos(ctx),
        )

    @agents["reconstructor_causal_mga"].tool
    async def tool_consultar_metas_oficiales(run: RunContext[ToolContext]) -> dict[str, Any]:
        """Consultar metas oficiales, indicadores, línea base y meta de cuatrienio."""
        ctx = run.deps
        metas = await _query_metas(ctx)
        _record(
            ctx,
            "tool_consultar_metas_oficiales",
            {"codigo_plan": ctx.consulta.codigo_plan, "pregunta": ctx.consulta.pregunta},
            metas,
        )
        return {"metas": metas, "cobertura_universo_bd": ctx.cobertura_universo_bd}

    @agents["auditor_financiero_ppi"].tool
    async def tool_conciliar_ppi_plan(run: RunContext[ToolContext]) -> dict[str, Any]:
        """Leer el origen PPI configurado y respetar sus límites financieros."""
        ctx = run.deps
        plans = await _query_ppi(ctx)
        _record(
            ctx,
            "tool_conciliar_ppi_plan",
            {"codigo_plan": ctx.consulta.codigo_plan},
            plans,
        )
        return {"planes": plans, "cobertura_universo_bd": ctx.cobertura_universo_bd}

    @agents["auditor_financiero_ppi"].tool
    async def tool_consultar_evaluador_pdt_gbr(
        run: RunContext[ToolContext],
    ) -> dict[str, Any]:
        """Cruzar la consulta con DEA, mission creep, LISA, ISRI/Chow y dictamen PDT."""
        ctx = run.deps
        result = await _evaluacion_pdt_gbr(ctx.session, ctx.consulta, ctx.corte)
        ctx.invocaciones.append(
            {
                "herramienta": "tool_consultar_evaluador_pdt_gbr",
                "parametros": {
                    "pregunta": ctx.consulta.pregunta,
                    "codigo_plan": ctx.consulta.codigo_plan,
                },
                "registros_recuperados": len(result.get("dmu_dea", [])),
            }
        )
        ctx.resultados["tool_consultar_evaluador_pdt_gbr"] = result
        return result

    @agents["articulador_operativo_bpim"].tool
    async def tool_cruzar_actividades_pa_bpim(run: RunContext[ToolContext]) -> dict[str, Any]:
        """Consulta pares meta–PA por corte o coincidencias SQL, con alcance explícito."""
        ctx = run.deps
        matches = await _query_actividades(ctx)
        _record(
            ctx,
            "tool_cruzar_actividades_pa_bpim",
            {"codigo_plan": ctx.consulta.codigo_plan, "pregunta": ctx.consulta.pregunta},
            matches,
        )
        return {
            "actividades": matches,
            "cobertura_universo_operativo": ctx.cobertura_universo_operativo,
        }

    return agents


AGENT_SPECS = [
    {
        "id_nodo": "lector_semantico_documental",
        "nombre_agente": "AgenteLectorSemanticoDocumental",
        "rol": "Recuperación y lectura de evidencia primaria",
        "herramientas_asignadas": ["tool_buscar_evidencia_paginas_pdd"],
        "esquema_salida": "citas SHA-256 verificadas",
    },
    {
        "id_nodo": "reconstructor_causal_mga",
        "nombre_agente": "AgenteReconstructorCausalMGA",
        "rol": "Reconstrucción de jerarquía MGA y metas",
        "herramientas_asignadas": ["tool_consultar_nodos_mga", "tool_consultar_metas_oficiales"],
        "esquema_salida": "nodos y metas oficiales",
    },
    {
        "id_nodo": "taxonomo_neurosimbolico_sh",
        "nombre_agente": "AgenteTaxonomoNeurosimbolicoSH",
        "rol": "Inspección simbólica de frontalidad y siete dimensiones",
        "herramientas_asignadas": ["tool_consultar_nodos_mga"],
        "esquema_salida": "clasificación y pesos persistidos",
    },
    {
        "id_nodo": "auditor_financiero_ppi",
        "nombre_agente": "AgenteAuditorFinancieroPPI",
        "rol": "Conciliación de montos PPI desde la BD",
        "herramientas_asignadas": [
            "tool_conciliar_ppi_plan",
            "tool_consultar_evaluador_pdt_gbr",
        ],
        "esquema_salida": "PPI observado, desglose y evaluación PDT-AI-EVALUATOR",
    },
    {
        "id_nodo": "articulador_operativo_bpim",
        "nombre_agente": "AgenteArticuladorOperativoBPIM",
        "rol": "Articulación de actividades con BPIM/MGA",
        "herramientas_asignadas": ["tool_cruzar_actividades_pa_bpim"],
        "esquema_salida": "coincidencias trazables",
    },
    {
        "id_nodo": "critico_verificador_forense",
        "nombre_agente": "AgenteCriticoVerificadorForense",
        "rol": "Verificación de hashes, evidencia y límites de afirmación",
        "herramientas_asignadas": [],
        "esquema_salida": "dictamen de invariantes",
    },
]
TOOL_SPECS = [
    {
        "nombre": "tool_buscar_evidencia_paginas_pdd",
        "descripcion": "Búsqueda léxica acotada de páginas y citas verificadas por SHA-256",
        "tabla": "seguimiento.pdd_evidencia_paginas",
    },
    {
        "nombre": "tool_consultar_nodos_mga",
        "descripcion": "Líneas/programas, jerarquía, frontalidad, pesos 7D y PPI",
        "tabla": "seguimiento.pdd_lineas_y_programas",
    },
    {
        "nombre": "tool_consultar_metas_oficiales",
        "descripcion": "Metas e indicadores oficiales",
        "tabla": "seguimiento.pdd_metas_oficiales",
    },
    {
        "nombre": "tool_conciliar_ppi_plan",
        "descripcion": "PPI corriente, constante y distribución persistida",
        "tabla": "seguimiento.planes_desarrollo_distrital + pdd_lineas_y_programas",
    },
    {
        "nombre": "tool_consultar_evaluador_pdt_gbr",
        "descripcion": "Cruce consultivo con DEA, NLP, LISA, ISRI/Chow y dictamen ejecutivo PDT",
        "tabla": "cache_pdt_ai_evaluator.json + PDT-AI-EVALUATOR",
    },
    {
        "nombre": "tool_cruzar_actividades_pa_bpim",
        "descripcion": "Cruce de nodos A/B con actividades, entidades y BPIM",
        "tabla": "seguimiento.actividades_plan_accion",
    },
]
GRAPH_EDGES = [
    {"desde": "START", "hasta": "lector_semantico_documental", "tipo": "directa"},
    *[
        {"desde": left["id_nodo"], "hasta": right["id_nodo"], "tipo": "directa"}
        for left, right in zip(AGENT_SPECS, AGENT_SPECS[1:], strict=False)
    ],
    {
        "desde": "critico_verificador_forense",
        "hasta": "lector_semantico_documental",
        "tipo": "condicional",
        "condicion": "citas insuficientes y primera iteracion",
    },
    {
        "desde": "critico_verificador_forense",
        "hasta": "END",
        "tipo": "condicional",
        "condicion": "verificacion completada o maximo dos iteraciones",
    },
]


async def obtener_arquitectura_agentes(session: AsyncSession) -> dict[str, Any]:
    counts = (
        (
            await session.execute(
                text(
                    """SELECT
                         (SELECT count(*) FROM seguimiento.pdd_evidencia_paginas)
                           evidencias_paginas,
                         (SELECT count(*) FROM seguimiento.pdd_lineas_y_programas) nodos_mga,
                         (SELECT count(*) FROM seguimiento.pdd_metas_oficiales
                          WHERE codigo_plan LIKE 'PDD_%') metas_pdd,
                         (SELECT count(*) FROM seguimiento.pdd_metas_oficiales
                          WHERE codigo_plan LIKE 'PDL_%') metas_pdl"""
                )
            )
        )
        .mappings()
        .one()
    )
    diagnostic, diagnostic_source = await _load_pdt_diagnostic(session)
    pdt = _pdt_architecture_summary(diagnostic, diagnostic_source)
    return {
        "motor": MOTOR,
        "orquestador": "LangGraph StateGraph",
        "framework_agentes": "PydanticAI",
        "nodos_langgraph": AGENT_SPECS,
        "aristas_grafo": GRAPH_EDGES,
        "herramientas_registradas": TOOL_SPECS,
        "corpus_conectado": _row_dict(counts),
        "integracion_pdt_ai_evaluator": pdt,
    }


async def arquitectura_agentes_ia(session: AsyncSession) -> dict[str, Any]:
    """Compatibilidad con la ruta existente de arquitectura de agentes."""
    return await obtener_arquitectura_agentes(session)


def _pdt_architecture_summary(diagnostic: dict[str, Any] | None, source: str) -> dict[str, Any]:
    if not diagnostic:
        return {
            "estado": "NO_DISPONIBLE",
            "fuente": source,
            "total_dmus": 0,
            "pares_malmquist": 0,
            "poligonos_postgis_lisa": 0,
            "trampas_territoriales": 0,
            "series_alto_riesgo_isri": 0,
            "dependencias_dictaminadas": 0,
            "sectores_gbr": 0,
        }
    dea = diagnostic.get("dea_scores", {})
    spatial = diagnostic.get("spatial_lisa", {})
    forecast = diagnostic.get("time_series_forecast", {})
    from app.modules.compromisos.pdt_dictamen_ejecutivo import generar_dictamen_ejecutivo_pdt

    report = generar_dictamen_ejecutivo_pdt(diagnostic)
    return {
        "estado": diagnostic.get("estado_checkpointer", "DISPONIBLE"),
        "motor": diagnostic.get("motor", "PDT-AI-EVALUATOR"),
        "fuente": source,
        "total_dmus": len(dea.get("resultados_dmu", [])),
        "pares_malmquist": len(dea.get("malmquist", {}).get("pares", [])),
        "poligonos_postgis_lisa": int(
            spatial.get("poligonos_reales_postgis", spatial.get("territorios_con_poligono_geojson", 0))
        ),
        "trampas_territoriales": len(spatial.get("trampas_territoriales_gestion_publica", [])),
        "series_alto_riesgo_isri": len(forecast.get("alto_riesgo_indicadores", [])),
        "dependencias_dictaminadas": sum(
            not str(row.get("dependencia", "")).startswith("PPI oficial agregado")
            for row in report.get("dictamenes_dependencias", [])
        ),
        "sectores_gbr": len(report.get("sintesis_sectores", [])),
    }


async def _run_agent(agents: dict[str, Agent], key: str, ctx: ToolContext) -> str:
    result = await agents[key].run(
        "Consulta: "
        f"{ctx.consulta.pregunta}\n"
        f"Plan={ctx.consulta.codigo_plan}; dimension={ctx.consulta.dimension_sh}; "
        f"frontalidad={ctx.consulta.grado_frontalidad}. "
        "Usa las herramientas asignadas y conserva estrictamente la evidencia.",
        deps=ctx,
    )
    return result.output


def _trace_entry(order: int, key: str, started: float, ctx: ToolContext, reason: str) -> dict[str, Any]:
    spec = next(item for item in AGENT_SPECS if item["id_nodo"] == key)
    calls = ctx.invocaciones
    ctx.invocaciones = []
    return {
        "orden": order,
        "nodo_langgraph": key,
        "agente": spec["nombre_agente"],
        "razonamiento": reason,
        "herramientas_invocadas": calls,
        "duracion_ms": round((time.perf_counter() - started) * 1000, 2),
        "estado": "COMPLETADO",
    }


async def ejecutar_articulacion_por_corte(
    consulta: ConsultaAgentesPDD, corte: ContextoCorte, planeacion: ReferenciaMatrizPlaneacion
) -> dict[str, Any]:
    """Herramienta del supervisor: Agent local, solo artefactos y sin sesión SQL."""
    ctx = ToolContext(session=None, consulta=consulta, corte=corte, planeacion=planeacion)
    await asyncio.to_thread(_query_actividades_corte, ctx)
    agentes = _build_agents(ctx, modelo=FunctionModel(_cognitive_model, model_name="polis-pdd-function-cognitive"))
    gestion = await agentes["articulador_operativo_bpim"].run(
        f"Consultar matriz del corte para el plan {consulta.codigo_plan}. Pregunta: {consulta.pregunta}", deps=ctx
    )
    if "tool_cruzar_actividades_pa_bpim" not in ctx.resultados:
        raise ValueError("El agente no ejecutó la herramienta de articulación")
    uso = gestion.usage
    return {
        "esquema": "polis.articulacion_planeacion_corte.v1",
        "run_id": str(corte.run_id),
        "corte": corte.referencia(),
        "consulta": consulta.model_dump(),
        "modelo": "polis-pdd-function-cognitive",
        "version_prompt": "articulacion_planeacion_corte.v1",
        "uso": {"requests": uso.requests, "input_tokens": uso.input_tokens, "output_tokens": uso.output_tokens},
        "alcance": "SOLO_ARTICULACION_PA_POR_CORTE",
        "estado_publicacion": "no_publicable",
        "cobertura": ctx.cobertura_universo_operativo,
        "muestra": ctx.resultados["tool_cruzar_actividades_pa_bpim"],
        "herramientas_invocadas": ctx.invocaciones,
        "limite": "Cruces descriptivos; sin clasificación 7D, montos, inferencia LLM externa ni evaluación causal.",
    }


async def ejecutar_catalogo_por_corte(
    consulta: ConsultaAgentesPDD, corte: ContextoCorte, catalogo: ReferenciaCatalogoPlaneacion
) -> dict[str, Any]:
    """Ejecuta las dos tools MGA mediante Agent local sin conexión SQL ni proveedor externo."""
    ctx = ToolContext(session=None, consulta=consulta, corte=corte, catalogo=catalogo)
    await asyncio.to_thread(_catalogo_del_contexto, ctx)
    agentes = _build_agents(ctx, modelo=FunctionModel(_cognitive_model, model_name="polis-pdd-function-cognitive"))
    gestion = await agentes["reconstructor_causal_mga"].run(
        f"Consultar catálogo del corte para {consulta.codigo_plan}. Pregunta: {consulta.pregunta}", deps=ctx
    )
    herramientas = ("tool_consultar_nodos_mga", "tool_consultar_metas_oficiales")
    if any(h not in ctx.resultados for h in herramientas):
        raise ValueError("El agente no ejecutó las herramientas del catálogo")
    uso = gestion.usage
    ruta = (
        catalogo.catalogo
        if catalogo.catalogo.is_absolute()
        else Path(__file__).resolve().parents[4] / catalogo.catalogo
    )
    return {
        "esquema": "polis.consulta_catalogo_corte.v1",
        "run_id": str(corte.run_id),
        "corte": corte.referencia(),
        "catalogo_sha256": ruta.stem,
        "consulta": consulta.model_dump(),
        "modelo": "polis-pdd-function-cognitive",
        "version_prompt": "consulta_catalogo_corte.v1",
        "uso": {"requests": uso.requests, "input_tokens": uso.input_tokens, "output_tokens": uso.output_tokens},
        "cobertura_nodos": ctx.cobertura_nodos,
        "cobertura_metas": ctx.cobertura_universo_bd,
        "muestras": {h: ctx.resultados[h] for h in herramientas},
        "herramientas_invocadas": ctx.invocaciones,
        "estado_publicacion": "no_publicable",
        "alcance": "SOLO_NODOS_Y_METAS_POR_CORTE",
        "limite": (
            "Catálogo formulado y clasificación heredada; no acredita ejecución, impacto ni clasificación canónica 7D."
        ),
    }


async def ejecutar_ppi_por_corte(
    consulta: ConsultaAgentesPDD,
    corte: ContextoCorte,
    catalogo: ReferenciaCatalogoPlaneacion,
    ppi: ReferenciaPPIPlaneacion,
) -> dict[str, Any]:
    """Ejecuta solo la tool financiera con Agent local; sin sesión ni otras tools SQL."""
    ctx = ToolContext(session=None, consulta=consulta, corte=corte, catalogo=catalogo, ppi=ppi)
    await asyncio.to_thread(_query_ppi_corte, ctx)
    agent = _make_agent(
        "AgentePPIFormuladoPorCorte",
        "Lee solo cifras crudas congeladas; no acredita comparabilidad, ejecución ni causalidad.",
        FunctionModel(_cognitive_model, model_name="polis-pdd-function-cognitive"),
    )

    @agent.tool
    async def tool_conciliar_ppi_plan(run: RunContext[ToolContext]) -> dict[str, Any]:
        planes = await _query_ppi(run.deps)
        _record(run.deps, "tool_conciliar_ppi_plan", {"codigo_plan": consulta.codigo_plan}, planes)
        return {"planes": planes, "cobertura": run.deps.resultados["cobertura_financiera"]}

    gestion = await agent.run(f"Lee PPI del plan {consulta.codigo_plan} en el corte indicado.", deps=ctx)
    if "tool_conciliar_ppi_plan" not in ctx.resultados:
        raise ValueError("El agente no ejecutó la herramienta financiera")
    uso = gestion.usage
    return {
        "esquema": "polis.consulta_ppi_corte.v1",
        "run_id": str(corte.run_id),
        "corte": corte.referencia(),
        "consulta": consulta.model_dump(),
        "modelo": "polis-pdd-function-cognitive",
        "version_prompt": "consulta_ppi_corte.v1",
        "uso": {"requests": uso.requests, "input_tokens": uso.input_tokens, "output_tokens": uso.output_tokens},
        "cobertura_financiera": ctx.resultados["cobertura_financiera"],
        "cobertura_metas": ctx.cobertura_universo_bd,
        "planes": ctx.resultados["tool_conciliar_ppi_plan"],
        "herramientas_invocadas": ctx.invocaciones,
        "estado_publicacion": "no_publicable",
        "alcance": "SOLO_PPI_FORMULADO_POR_CORTE_SIN_SQL",
    }


async def ejecutar_consulta_pdd(
    session: AsyncSession,
    consulta: ConsultaAgentesPDD,
    *,
    corte: ContextoCorte | None = None,
    planeacion: ReferenciaMatrizPlaneacion | None = None,
    catalogo: ReferenciaCatalogoPlaneacion | None = None,
    ppi: ReferenciaPPIPlaneacion | None = None,
) -> dict[str, Any]:
    referencia_corte = corte.referencia() if corte is not None else None
    if planeacion is not None:
        if corte is None:
            raise ValueError("La referencia de planeación requiere corte")
        await asyncio.to_thread(planeacion.leer, corte)
        if consulta.dimension_sh != "TODAS" or consulta.grado_frontalidad != "TODOS":
            raise ValueError("La matriz congelada no contiene clasificación SH/frontalidad para aplicar esos filtros")
    ctx = ToolContext(
        session=session, consulta=consulta, corte=corte, planeacion=planeacion, catalogo=catalogo, ppi=ppi
    )
    if ppi is not None:
        await asyncio.to_thread(_query_ppi_corte, ctx)
    if catalogo is not None:
        captura = await asyncio.to_thread(_catalogo_del_contexto, ctx)
        if planeacion is not None:
            comprobar_matriz_y_catalogo(captura, await asyncio.to_thread(planeacion.leer, corte))
    agents = _build_agents(ctx)
    state: GrafoState = {"consulta": consulta, "contexto": ctx, "traza": [], "iteracion": 1}
    graph = StateGraph(GrafoState)

    async def run_node(key: str, reason: str, output_field: str | None = None):
        async def handler(current: GrafoState) -> dict[str, Any]:
            ctx = current["contexto"]
            started = time.perf_counter()
            if key == "critico_verificador_forense":
                evidences = current.get("evidencias", [])
                valid = [item for item in evidences if len(item.get("sha256_contenido", "")) == 64]
                retry = not valid and current.get("iteracion", 1) == 1
                ctx.ampliar_busqueda = retry
                approved = bool(valid) or not _terms(consulta.pregunta)
                current_trace = _trace_entry(
                    len(current["traza"]) + 1,
                    key,
                    started,
                    ctx,
                    "Verifica SHA-256 de la BD y limita la síntesis a registros recuperados.",
                )
                return {
                    "traza": [*current["traza"], current_trace],
                    "aprobado": approved,
                    "iteracion": current.get("iteracion", 1) + int(retry),
                    "reintento_consumido": retry,
                    "observacion": (
                        "Citas SHA-256 comprobadas contra el contenido fuente."
                        if valid
                        else ("Sin coincidencias documentales verificables; no se atribuyen citas ni cifras.")
                    ),
                }
            await _run_agent(agents, key, ctx)
            new_trace = _trace_entry(len(current["traza"]) + 1, key, started, ctx, reason)
            update: dict[str, Any] = {"traza": [*current["traza"], new_trace]}
            if output_field:
                tool_by_field = {
                    "evidencias": "tool_buscar_evidencia_paginas_pdd",
                    "nodos": "tool_consultar_nodos_mga",
                    "metas": "tool_consultar_metas_oficiales",
                    "conciliacion": "tool_conciliar_ppi_plan",
                    "articulacion": "tool_cruzar_actividades_pa_bpim",
                    "evaluacion_pdt_gbr": "tool_consultar_evaluador_pdt_gbr",
                }
                output_fields = output_field if isinstance(output_field, tuple) else (output_field,)
                for field_name in output_fields:
                    update[field_name] = ctx.resultados.get(tool_by_field[field_name], [])
            return update

        return handler

    sequence = [
        (
            "lector_semantico_documental",
            "Recupera páginas coincidentes y valida el SHA-256 almacenado.",
            "evidencias",
        ),
        (
            "reconstructor_causal_mga",
            "Consulta jerarquía MGA y metas oficiales por filtros de la pregunta.",
            "metas",
        ),
        (
            "taxonomo_neurosimbolico_sh",
            "Lee clasificación A/B/C/N y pesos 7D almacenados; no los infiere para cifras.",
            "nodos",
        ),
        (
            "auditor_financiero_ppi",
            "Lee PPI formulado congelado; el evaluador PDT de este nodo puede consultar SQL vivo."
            if ppi is not None
            else "Reconcilia exclusivamente montos persistidos en las tablas de planes y nodos.",
            ("conciliacion", "evaluacion_pdt_gbr"),
        ),
        (
            "articulador_operativo_bpim",
            "Busca coincidencias léxicas trazables de actividades PA con nodos A/B.",
            "articulacion",
        ),
        (
            "critico_verificador_forense",
            "Verifica citas y restringe afirmaciones al resultado de las tools.",
            None,
        ),
    ]
    for key, reason, output_field in sequence:
        graph.add_node(key, await run_node(key, reason, output_field))
    graph.add_edge(START, sequence[0][0])
    for (left, _, _), (right, _, _) in zip(sequence, sequence[1:], strict=False):
        graph.add_edge(left, right)

    def after_critic(current: GrafoState) -> str:
        if not current.get("aprobado") and current.get("reintento_consumido", False):
            return "retry"
        return "end"

    graph.add_conditional_edges(
        "critico_verificador_forense",
        after_critic,
        {"retry": "lector_semantico_documental", "end": END},
    )
    compiled = graph.compile()
    result = await compiled.ainvoke(state)
    financial = result.get("conciliacion", [])
    nodes = result.get("nodos", [])
    metas = result.get("metas", [])
    citations = result.get("evidencias", [])
    plan_summary = [
        {
            key: plan.get(key)
            for key in (
                "codigo_plan",
                "nombre_oficial",
                "ppi_total_corriente_cop",
                "ppi_total_constante_2025_cop",
                "estado_financiero",
                "desglose_abcn_constante_2025_cop",
                "desglose_7d_constante_2025_cop",
            )
        }
        for plan in financial
    ]
    approved = bool(result.get("aprobado")) or not _terms(consulta.pregunta)
    plan_lines = [
        f"{plan.get('codigo_plan')}: PPI corriente COP "
        f"{plan.get('ppi_total_corriente_cop')}; constante 2025 COP "
        f"{plan.get('ppi_total_constante_2025_cop')} "
        f"({plan.get('estado_financiero', 'SIN_ESTADO')})"
        for plan in financial
    ]
    synthesis = (
        "PPI formulado por plan según el catálogo documental: " + "; ".join(plan_lines)
        if plan_lines
        else "La consulta no encontró planes con PPI en la BD para los filtros indicados."
    )
    synthesis += (
        f" Se recuperaron {len(citations)} páginas con SHA-256 verificado, "
        f"{len(nodes)} nodos MGA y {len(metas)} metas oficiales."
    )
    return {
        "run_id": str(corte.run_id) if corte is not None else str(uuid.uuid4()),
        "corte": referencia_corte,
        "alcance_corte": (
            "NODOS_METAS_Y_PPI_POR_CORTE_EVIDENCIA_PDT_Y_OTRAS_TOOLS_PUEDEN_USAR_SQL_VIVO"
            if ppi is not None
            else "NODOS_Y_METAS_POR_CORTE_OTRAS_CONSULTAS_SQL_EN_VIVO"
            if catalogo is not None and planeacion is None
            else "NODOS_METAS_Y_ARTICULACION_PA_POR_CORTE_OTRAS_CONSULTAS_SQL_EN_VIVO"
            if catalogo is not None
            else "ARTICULACION_PA_POR_CORTE_OTRAS_CONSULTAS_SQL_EN_VIVO"
            if planeacion is not None
            else (
                "REFERENCIA_VERIFICADA_SQL_EN_VIVO_NO_CONCILIADO"
                if corte is not None
                else "CONSULTA_INDEPENDIENTE_SQL_EN_VIVO"
            )
        ),
        "motor": MOTOR,
        "cobertura_financiera": ctx.resultados.get("cobertura_financiera"),
        "pregunta": consulta.pregunta,
        "sintesis_ejecutiva": synthesis,
        "dictamen_forense_detallado": {
            "planes_analizados": plan_summary,
            "evaluacion_pdt_gbr": result.get("evaluacion_pdt_gbr", {}),
            "limites": (
                "Nodos, metas y PPI provienen del mismo corte; evidencia y PDT pueden consultar SQL vivo. "
                "La articulación solo se congela con referencia de matriz. PPI crudo sin comparabilidad acreditada."
                if ppi is not None
                else "Nodos y metas provienen del catálogo congelado; PPI, evidencia y PDT siguen en SQL vivo. "
                "La articulación PA usa matriz congelada solo si se aporta su referencia. "
                "Clasificación SH heredada; no acredita ejecución, clasificación canónica 7D ni impacto."
                if catalogo is not None
                else "La articulación PA proviene de la matriz congelada; las otras consultas siguen en SQL vivo. "
                "Las candidaturas no acreditan ejecución ni impacto."
                if planeacion is not None
                else "La clasificación procede de BD; las coincidencias léxicas con actividades no prueban causalidad."
            ),
        },
        "traza_langgraph": result.get("traza", []),
        "citas_evidencia_documental": citations,
        "evidencia_financiera_y_metas": {
            "planes_analizados": plan_summary,
            "nodos_destacados": nodes[:20],
            "metas_destacadas": metas[:20],
            "articulacion_pa_bpim": result.get("articulacion", []),
            "evaluacion_pdt_gbr": result.get("evaluacion_pdt_gbr", {}),
            "cobertura_universo_bd": ctx.cobertura_universo_bd,
            "cobertura_nodos": ctx.cobertura_nodos,
            "cobertura_universo_operativo": ctx.cobertura_universo_operativo,
        },
        "cobertura_universo_bd": ctx.cobertura_universo_bd,
        "cobertura_universo_operativo": ctx.cobertura_universo_operativo,
        "evaluacion_pdt_gbr": result.get("evaluacion_pdt_gbr", {}),
        "verificacion_critica": {
            "aprobado": approved,
            "iteraciones_langgraph": result.get("iteracion", 1),
            "cero_alucinacion_financiera": True,
            "citas_sha256_verificadas": len(citations),
            "observacion_verificador": result.get("observacion", ""),
        },
    }


def _fragment_analysis(text_fragment: str, plan_code: str) -> dict[str, Any]:
    program = re.search(r"(?im)^\s*Programa\s*:\s*(.+)$", text_fragment)
    subprogram = re.search(r"(?im)^\s*Subprograma\s*:\s*(.+)$", text_fragment)
    meta = re.search(r"(?im)^\s*Meta\s*:\s*(.+)$", text_fragment)
    meta_text = meta.group(1).strip() if meta else text_fragment.strip()
    named_nodes = []
    for level, match in (("PROGRAMA", program), ("SUBPROGRAMA", subprogram)):
        if match:
            name = match.group(1).strip()
            named_nodes.append(
                {
                    "nivel": level,
                    "codigo_detectado": None,
                    "nombre": name,
                    "problema_central_inferido": "No indicado explícitamente en el fragmento.",
                    "objetivo_mga_inferido": name,
                }
            )
    digits = re.findall(r"\d+(?:[,.]\d+)?\s*%?", meta_text)
    weights = dict.fromkeys(DIMENSIONES, 0.0)
    matched = next(
        (dimension for dimension in DIMENSIONES if dimension.casefold() in text_fragment.casefold()),
        "Personal",
    )
    weights[matched] = 1.0
    grade = (
        "A"
        if any(term in text_fragment.casefold() for term in ("reducir", "prevalencia", "hogares vulnerables"))
        else "B"
    )
    return {
        "nodos_extraidos": named_nodes,
        "metas_extraidas": [
            {
                "tipo_meta": "RESULTADO",
                "descripcion_meta": meta_text,
                "indicador_sugerido": meta_text[:180],
                "linea_base": digits[0] if digits else None,
                "meta_cuatrienio": digits[-1] if len(digits) > 1 else None,
                "evaluacion_crema": {
                    "claro": bool(meta_text),
                    "relevante": True,
                    "economico": False,
                    "medible": bool(digits),
                    "adecuado": bool(meta_text),
                    "puntaje_crema_pct": 80.0 if digits else 60.0,
                    "observacion_dnp": (
                        "Evaluación heurística del texto aportado; requiere validación contra fuente oficial."
                    ),
                },
            }
        ],
        "clasificacion_neurosimbolica": {
            "grado_frontalidad": grade,
            "etiqueta_frontalidad": {"A": "A_NUCLEO_FRONTAL", "B": "B_DETERMINANTE_DIRECTO"}[grade],
            "dimension_sh_primaria": matched,
            "pesos_7d": weights,
            "justificacion_causal_ia": (
                "Asignación heurística provisional basada en términos explícitos; no reemplaza clasificación oficial."
            ),
            "evidencias_homologas_bd": [],
        },
        "articulacion_bpim_sugerida": {
            "codigo_bpim_sugerido": "",
            "producto_catalogo_mga_dnp": program.group(1).strip() if program else "",
            "entidad_responsable_sugerida": "Por validar en catálogo oficial",
        },
    }


async def interpretar_fragmento(session: AsyncSession, request: InterpretarFragmentoPDD) -> dict[str, Any]:
    analysis = _fragment_analysis(request.texto_fragmento, request.codigo_plan_referencia)
    ctx = ToolContext(
        session,
        ConsultaAgentesPDD(
            pregunta=request.texto_fragmento,
            codigo_plan=request.codigo_plan_referencia,
            archivo=request.archivo_origen,
        ),
    )
    agents = _build_agents(ctx)
    trace = []
    for index, (key, name) in enumerate(
        (
            ("lector_semantico_documental", "AgenteLectorSemanticoDocumental"),
            ("reconstructor_causal_mga", "AgenteReconstructorCausalMGA"),
            ("taxonomo_neurosimbolico_sh", "AgenteTaxonomoNeurosimbolicoSH"),
        ),
        1,
    ):
        start = len(ctx.invocaciones)
        await _run_agent(agents, key, ctx)
        trace.append(
            {
                "orden": index,
                "agente": name,
                "herramientas_invocadas": ctx.invocaciones[start:],
                "estado": "COMPLETADO",
            }
        )
    analysis["clasificacion_neurosimbolica"]["evidencias_homologas_bd"] = ctx.resultados.get(
        "tool_buscar_evidencia_paginas_pdd", []
    )[:5]
    analysis["traza_agentes"] = trace
    return analysis
