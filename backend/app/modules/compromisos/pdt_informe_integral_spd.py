"""Consolida un corte auditable del PDT-AI-EVALUATOR para la SPD."""

from __future__ import annotations

import csv
import hashlib
import importlib
import inspect
import io
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _rows(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [row for row in value if isinstance(row, dict)]
    if isinstance(value, dict):
        for key in ("resultados_dmu", "dmus", "unidades", "registros", "items"):
            rows = value.get(key)
            if isinstance(rows, list):
                return [row for row in rows if isinstance(row, dict)]
    return []


async def _invoke(fn, **kwargs):
    signature = inspect.signature(fn)
    accepts_kwargs = any(
        parameter.kind is inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    )
    filtered = {
        key: value for key, value in kwargs.items() if accepts_kwargs or key in signature.parameters
    }
    result = fn(**filtered)
    return await result if inspect.isawaitable(result) else result


def _load_module(name: str):
    return importlib.import_module(f"app.modules.compromisos.{name}")


async def _load_hoshin(plan_codigo: str, db) -> dict[str, Any]:
    try:
        module = _load_module("pdt_hoshin_kanri")
        result = await _invoke(
            module.construir_matriz_x_hoshin_kanri_pdt,
            codigo_plan=plan_codigo,
            plan_codigo=plan_codigo,
            db=db,
        )
        payload = _as_dict(result)
        charts = payload.get("bowling_charts_pdca", payload.get("bowling_charts", []))
        if isinstance(charts, dict):
            charts = charts.get("items", charts.get("charts", []))
        charts = _rows(charts)
        quadrants = payload.get("conteo_cuadrantes") or payload.get("cuadrantes_matriz_x") or {}
        if not quadrants:
            quadrants = payload.get("matriz_x", {}).get("conteo_cuadrantes", {})
        articulation = _as_dict(payload.get("articulacion_distrital_local_pdl"))
        return {
            "estado": payload.get("estado", "DISPONIBLE"),
            "evaluacion_fair": _as_dict(payload.get("evaluacion_fair")),
            "conteo_cuadrantes_matriz_x": quadrants,
            "resumen_bowling_chart_pdca": {
                "total": len(charts),
                "conteo_estados": _count_values(charts, "color_semaforo", "estado"),
            },
            "articulacion_distrital_local_pdl": {
                "estado": articulation.get("estado", "NO_DISPONIBLE"),
                "total_planes_locales": articulation.get("total_planes_locales", 0),
                "total_metas_pdl": articulation.get("total_metas_pdl", 0),
                "total_ucgs": articulation.get("total_ucgs", len(articulation.get("ucgs", []))),
            },
        }
    except Exception as exc:
        return {"estado": "NO_DISPONIBLE", "detalle": type(exc).__name__}


async def _load_revision(plan_codigo: str) -> dict[str, Any]:
    try:
        module = _load_module("pdt_revision_por_meta")
        builder = getattr(module, "evaluar_metas_10_dimensiones", None)
        if builder is None:
            builder = module.construir_matriz_revision_por_meta_pdt
        payload = _as_dict(
            await _invoke(builder, plan_codigo=plan_codigo, codigo_plan=plan_codigo, limit=50)
        )
        dimensions = payload.get("resumen_dimensiones") or payload.get(
            "evaluacion_10_dimensiones", {}
        )
        triada = (
            payload.get("resumen_vinculos_pa_triada")
            or payload.get("resumen_articulacion_pa")
            or {}
        )
        reviewers = payload.get("dictamen_7_revisores", payload.get("hallazgos_por_revisor", {}))
        if isinstance(reviewers, list):
            reviewers = _count_values(reviewers, "revisor", "rol")
        return {
            "estado": payload.get("estado", "DISPONIBLE"),
            "total_metas_evaluadas": payload.get(
                "total_metas_evaluadas",
                payload.get("total_metas", payload.get("total_metas_plan", 0)),
            ),
            "resumen_dimensiones": dimensions,
            "resumen_vinculos_pa_triada": triada,
            "hallazgos_por_revisor": reviewers,
            "hallazgos": _rows(payload.get("hallazgos")),
        }
    except Exception as exc:
        return {
            "estado": "NO_DISPONIBLE",
            "detalle": type(exc).__name__,
            "total_metas_evaluadas": 0,
            "resumen_dimensiones": {},
            "resumen_vinculos_pa_triada": {},
            "hallazgos_por_revisor": {},
        }


async def _load_dictamens(db, plan_codigo: str) -> dict[str, Any]:
    try:
        module = _load_module("pdt_persistencia_pg")
        fn = getattr(module, "listar_dictamenes_hallazgos_pg", None)
        if fn is None:
            fn = module.listar_dictamenes_hallazgos_pdt_pg
        return _as_dict(
            await _invoke(fn, db=db, plan_codigo=plan_codigo, codigo_plan=plan_codigo, limit=25)
        )
    except Exception as exc:
        return {
            "estado": "NO_DISPONIBLE",
            "detalle": type(exc).__name__,
            "total_dictamenes": 0,
            "dictamenes_hallazgos": [],
        }


async def _load_dea(orientacion: str, db) -> tuple[dict[str, Any], dict[str, Any]]:
    try:
        module = _load_module("pdd_dea_service")
        levels_fn = module.obtener_dea_cartagena_4_niveles
        board_fn = getattr(module, "obtener_tablero_alcalde_y_armonizacion_dea", None)
        if board_fn is None:
            board_fn = module.obtener_tablero_dea_cartagena
        levels = _as_dict(await _invoke(levels_fn, orientacion=orientacion, db=db))
        board = _as_dict(await _invoke(board_fn, orientacion=orientacion, db=db))
        return levels, board
    except Exception as exc:
        return (
            {"estado": "NO_DISPONIBLE", "detalle": type(exc).__name__, "niveles": {}},
            {
                "estado": "NO_DISPONIBLE",
                "detalle": type(exc).__name__,
                "alertas_falso_cumplimiento_nominal": [],
                "benchmarks_armonizacion_presupuestal": [],
            },
        )


def _count_values(rows: list[dict[str, Any]], *keys: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        value = next((row.get(key) for key in keys if row.get(key) is not None), "SIN_ESTADO")
        label = str(value)
        counts[label] = counts.get(label, 0) + 1
    return counts


def _summarize_levels(payload: dict[str, Any]) -> dict[str, Any]:
    source = payload.get("niveles", payload.get("fronteras", {}))
    expected = (
        "nivel_1_territorial_localidades_ucg",
        "nivel_2_institucional_secretarias",
        "nivel_3_operativo_ieo_ese",
        "nivel_4_temporal_inter_cuatrienial",
    )
    levels = {}
    for key in expected:
        block = _as_dict(source.get(key))
        dmus = _rows(block.get("dmus", block.get("resultados_dmu", block.get("unidades"))))
        if not dmus:
            for subkey in (
                "frontera_localidades_distritales",
                "frontera_unidades_comuneras_ucg",
                "subfrontera_a_instituciones_educativas_ieo",
                "subfrontera_b_centros_salud_ese",
                "frontera_vigencias_anuales_2020_2027",
            ):
                sub = _as_dict(block.get(subkey))
                dmus.extend(_rows(sub.get("resultados_dmu", sub.get("dmus"))))
        levels[key] = {
            "total_dmus_evaluadas": block.get(
                "total_dmus", block.get("total_dmus_evaluadas", len(dmus))
            ),
            "dmus_eficientes": block.get(
                "eficientes", sum(1 for row in dmus if _theta(row) >= 1.0)
            ),
            "dmus_ineficientes": block.get(
                "ineficientes", sum(1 for row in dmus if _theta(row) < 1.0)
            ),
            "frontera_separada_homogenea": True,
            "padron_censal_bd_csh": block.get("padron_censal_bd_csh", {}),
            "fuentes_financiacion": block.get(
                "resumen_fuentes_financiacion_y_holguras",
                block.get("fuentes_financiacion", block.get("desagregacion_fuentes", {})),
            ),
            "dmus": dmus,
        }
    return {
        "estado": payload.get("estado", "DISPONIBLE"),
        "orientacion": payload.get("orientacion"),
        "fronteras_independientes": True,
        "resumen_fuentes_financiacion_y_holguras": payload.get(
            "resumen_fuentes_financiacion_y_holguras", {}
        ),
        "niveles": levels,
    }


def _theta(row: dict[str, Any]) -> float:
    try:
        return float(row.get("theta_bcc", row.get("eficiencia_bcc", 0)) or 0)
    except (TypeError, ValueError):
        return 0.0


def _fmt_benchmarks(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
        elif isinstance(item, dict):
            label = str(
                item.get("dmu") or item.get("unidad") or item.get("benchmark") or ""
            ).strip()
            if label:
                out.append(label)
    return out


def _board_rows(board: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    tablero_block = _as_dict(board.get("tablero_alcalde_y_programas"))
    alerts = _rows(
        board.get(
            "alertas_falso_cumplimiento_nominal",
            board.get(
                "alertas_desperdicio",
                tablero_block.get("alertas_ineficiencia_financiera_desperdicio", []),
            ),
        )
    )
    if not alerts:
        alerts = [
            row
            for level in _as_dict(board.get("niveles")).values()
            for row in _rows(level)
            if _theta(row) <= 0.70
            and float(row.get("cumplimiento_fisico", row.get("avance_fisico_pct", 0)) or 0) >= 0.9
        ]
    arm_block = _as_dict(board.get("armonizacion_presupuestal_plurianual"))
    benchmarks = _rows(
        board.get(
            "benchmarks_armonizacion_presupuestal",
            board.get("benchmarks", arm_block.get("recomendaciones_armonizacion", [])),
        )
    )
    return alerts, benchmarks


def _harmonization(levels: dict[str, Any], board: dict[str, Any]) -> list[dict[str, Any]]:
    arm_block = _as_dict(board.get("armonizacion_presupuestal_plurianual"))
    direct_recs = _rows(arm_block.get("recomendaciones_armonizacion"))
    if direct_recs:
        return [
            {
                "nivel": str(r.get("nivel", r.get("frontera", ""))),
                "dmu": str(r.get("dmu_ineficiente", r.get("dmu", ""))),
                "theta_bcc": _theta(r),
                "benchmarks_referencia": _fmt_benchmarks(
                    r.get("benchmarks_oficiales_frontera", r.get("benchmarks_referencia", []))
                ),
                "presupuesto_total_reasignable_cop": r.get(
                    "holgura_presupuestal_reasignable_s_minus_cop",
                    r.get("presupuesto_total_reasignable_cop", 0.0),
                ),
            }
            for r in direct_recs
        ]
    _, explicit_benchmarks = _board_rows(board)
    dmus = [row for level in levels["niveles"].values() for row in level["dmus"]]
    benchmarks = explicit_benchmarks or [row for row in dmus if _theta(row) >= 1.0]
    recommendations = []
    for row in dmus:
        theta = _theta(row)
        if theta >= 1.0:
            continue
        refs = _fmt_benchmarks(row.get("benchmarks_referencia")) or [
            str(item.get("dmu", item.get("unidad", "")))
            for item in benchmarks
            if str(item.get("dmu", item.get("unidad", "")))
        ]
        recommendations.append(
            {
                "nivel": row.get("nivel", row.get("nivel_dmu", "")),
                "dmu": row.get("dmu", row.get("unidad", "")),
                "theta_bcc": theta,
                "benchmarks_referencia": refs,
                "presupuesto_total_reasignable_cop": row.get(
                    "holgura_presupuestal_s_minus_cop", row.get("s_minus_cop", 0)
                ),
            }
        )
    return recommendations


def _exports(sections: dict[str, Any], fingerprint: str) -> dict[str, str]:
    hoshin = sections["sintesis_hoshin_kanri_y_pdl"]
    revision = sections["sintesis_revision_10d_y_vinculos_pa"]
    dea = sections["sintesis_dea_4_niveles_y_fuentes"]
    alerts = sections["tablero_alcalde_alertas_desperdicio"]
    harmonization = sections["tabla_armonizacion_presupuestal_spd"]
    md = [
        "# Informe Integral SPD — PDT-AI-EVALUATOR",
        "",
        "## Hoshin Kanri y PDL",
        "Estado: "
        f"{hoshin.get('estado')}; FAIR: "
        f"`{json.dumps(hoshin.get('evaluacion_fair', {}), ensure_ascii=False)}`",
        "",
        "## Revisión 10D y vínculos PA",
        f"Metas evaluadas: {revision.get('total_metas_evaluadas', 0)}",
        "",
        "## Fronteras DEA",
        "| Nivel | DMUs | Eficientes | Ineficientes |",
        "|---|---:|---:|---:|",
    ]
    for name, value in dea["niveles"].items():
        md.append(
            f"| {name} | {value['total_dmus_evaluadas']} | "
            f"{value['dmus_eficientes']} | {value['dmus_ineficientes']} |"
        )
    md.extend(
        [
            "",
            "## Alertas de desperdicio",
            f"Total: {alerts['total_alertas']}",
            "",
            "## Armonización presupuestal",
            "| Nivel | DMU | θ BCC | Benchmarks | Reasignable COP |",
            "|---|---|---:|---|---:|",
        ]
    )
    for row in harmonization:
        b_list = _fmt_benchmarks(row.get("benchmarks_referencia", []))
        md.append(
            f"| {row['nivel']} | {row['dmu']} | {row['theta_bcc']} | "
            f"{', '.join(b_list)} | "
            f"{row['presupuesto_total_reasignable_cop']} |"
        )
    md.extend(["", f"Huella SHA-256 del corte: `{fingerprint}`"])
    buffer = io.StringIO(newline="")
    fields = [
        "nivel",
        "dmu",
        "calificacion_nominal",
        "calificacion_recalificada_dea",
        "theta_ccr",
        "theta_bcc",
        "eficiencia_escala_se",
        "holgura_presupuestal_s_minus_cop",
        "benchmarks_referencia",
    ]
    writer = csv.DictWriter(buffer, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    by_dmu = {
        str(row.get("dmu", row.get("unidad", ""))): row
        for level in dea["niveles"].values()
        for row in level["dmus"]
    }
    export_rows = alerts["unidades"] + harmonization
    for row in export_rows:
        source = by_dmu.get(str(row.get("dmu", "")), row)
        b_refs = _fmt_benchmarks(
            row.get("benchmarks_referencia", source.get("benchmarks_referencia", []))
        )
        writer.writerow(
            {
                "nivel": row.get("nivel", source.get("nivel", source.get("nivel_dmu", ""))),
                "dmu": row.get("dmu", source.get("dmu", "")),
                "calificacion_nominal": source.get(
                    "cumplimiento_fisico",
                    source.get(
                        "avance_fisico_pct",
                        row.get("calificacion_nominal_sin_dea", ""),
                    ),
                ),
                "calificacion_recalificada_dea": row.get(
                    "calificacion_recalificada_dea",
                    row.get(
                        "dictamen",
                        "ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"
                        if row in alerts["unidades"]
                        else "ARMONIZACION_PRESUPUESTAL",
                    ),
                ),
                "theta_ccr": source.get("theta_ccr", row.get("theta_ccr", "")),
                "theta_bcc": row.get("theta_bcc", source.get("theta_bcc", "")),
                "eficiencia_escala_se": source.get(
                    "SE_o",
                    source.get("eficiencia_escala_se", row.get("eficiencia_escala_se", "")),
                ),
                "holgura_presupuestal_s_minus_cop": row.get(
                    "holgura_presupuestal_s_minus_cop",
                    row.get(
                        "presupuesto_total_reasignable_cop",
                        source.get(
                            "holgura_presupuestal_s_minus_cop", source.get("s_minus_cop", "")
                        ),
                    ),
                ),
                "benchmarks_referencia": ";".join(b_refs),
            }
        )
    return {"markdown_ejecutivo": "\n".join(md), "csv_armonizacion_y_alertas": buffer.getvalue()}


async def generar_informe_integral_spd_cartagena(
    plan_codigo: str = "PDD_2024_2027",
    orientacion_dea: str = "input",
    incluir_exportables: bool = True,
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    hoshin, revision, dictamens, dea_pair = await _gather_sources(plan_codigo, orientacion_dea, db)
    dea_raw, board = dea_pair
    dea = _summarize_levels(dea_raw)
    alerts_rows, _ = _board_rows(board)
    harmonization = _harmonization(dea, board)
    slack_total = 0.0
    for row in alerts_rows:
        try:
            slack_total += float(
                row.get("holgura_presupuestal_s_minus_cop", row.get("s_minus_cop", 0)) or 0
            )
        except (TypeError, ValueError):
            continue
    alerts = {
        "total_alertas": len(alerts_rows),
        "unidades": alerts_rows,
        "holgura_presupuestal_total_cop": slack_total,
        "estado": board.get("estado", "DISPONIBLE"),
    }
    revision["dictamenes_y_subsanaciones"] = {
        "estado": dictamens.get("estado", "DISPONIBLE"),
        "total_dictamenes": dictamens.get(
            "total_dictamenes", len(dictamens.get("dictamenes_hallazgos", []))
        ),
        "dictamenes": _rows(dictamens.get("dictamenes_hallazgos")),
        "conteo_estados": _count_values(
            _rows(dictamens.get("dictamenes_hallazgos")), "estado_revision"
        ),
    }
    sections = {
        "sintesis_hoshin_kanri_y_pdl": hoshin,
        "sintesis_revision_10d_y_vinculos_pa": revision,
        "sintesis_dea_4_niveles_y_fuentes": dea,
        "tablero_alcalde_alertas_desperdicio": alerts,
        "tabla_armonizacion_presupuestal_spd": harmonization,
    }
    canonical = json.dumps(
        sections, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str
    )
    fingerprint = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    result = {
        "encabezado_institucional": {
            "entidad": (
                "Alcaldía Mayor de Cartagena de Indias — Secretaría de Planeación Distrital (SPD)"
            ),
            "plan_codigo": plan_codigo,
            "orientacion_dea": orientacion_dea,
            "version_metodologica": "PDT-AI-EVALUATOR-SPD-v2026.10",
            "generado_en": datetime.now(UTC).isoformat(),
            "fingerprint_corte_sha256": fingerprint,
        },
        **sections,
    }
    if incluir_exportables:
        result["exportables_auditables"] = _exports(sections, fingerprint)
    return result


async def _gather_sources(plan_codigo: str, orientacion_dea: str, db):
    hoshin, revision, dictamens, dea_pair = await __import__("asyncio").gather(
        _load_hoshin(plan_codigo, db),
        _load_revision(plan_codigo),
        _load_dictamens(db, plan_codigo),
        _load_dea(orientacion_dea, db),
    )
    return hoshin, revision, dictamens, dea_pair
