"""Síntesis pericial ejecutiva del diagnóstico multidimensional PDT."""

from __future__ import annotations

import re
import unicodedata
from datetime import UTC, datetime
from typing import Any

SECTORES_GBR = (
    "Educación Pública",
    "Salud Pública",
    "Infraestructura Vial",
    "Desarrollo Agrícola",
    "Medio Ambiente",
)


def _normalizar(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(caracter for caracter in texto if not unicodedata.combining(caracter))
    return re.sub(r"\s+", " ", texto).strip().casefold()


def _mean(rows: list[dict[str, Any]], key: str) -> float | None:
    values = [float(row[key]) for row in rows if row.get(key) is not None]
    return sum(values) / len(values) if values else None


def _round(value: float | None, digits: int = 4) -> float | None:
    return round(value, digits) if value is not None else None


def _dependency_from_dmu(row: dict[str, Any]) -> str:
    name = str(row.get("dmu") or "UNIDAD_SIN_NOMBRE")
    if name.startswith("PPI_OFICIAL:"):
        return "PPI oficial agregado — " + name.removeprefix("PPI_OFICIAL:")
    return name.rsplit("|", 1)[0]


def _alert_matches(alert: dict[str, Any], dependency: str) -> bool:
    linked = alert.get("dependencias") or alert.get("dependencia")
    if isinstance(linked, str):
        linked = [linked]
    if linked and any(_normalizar(value) == _normalizar(dependency) for value in linked):
        return True
    return _normalizar(dependency) in _normalizar(alert.get("actividad_operativa", ""))


def _prescription(
    inefficiency: bool,
    mission_creep: bool,
    traps: list[str],
    critical: list[dict[str, Any]],
) -> dict[str, Any]:
    actions = []
    if inefficiency:
        actions.append(
            "Revisar holguras, metas físicas y soportes de ejecución antes de proponer una "
            "reasignación en la siguiente Matriz de Plan de Acción."
        )
    if mission_creep:
        actions.append(
            "Conciliar cada actividad señalada con la meta PDD/MGA correspondiente y documentar "
            "el vínculo o su corrección."
        )
    if traps:
        actions.append(
            "Priorizar una auditoría territorial conjunta con Planeación y la dependencia para "
            "contrastar cobertura, localización e inversión."
        )
    if critical:
        actions.append(
            "Solicitar plan de mitigación para los indicadores con ISRI superior a 0.40 y revisar "
            "la ruptura estructural de 2024 antes de fijar metas de cierre."
        )
    if not actions:
        actions.append(
            "Mantener seguimiento trimestral y respaldar cualquier ajuste presupuestal con "
            "evidencia verificable de productos y resultados."
        )
    return {
        "doctrina": "GBR/DNP; recomendación técnica no vinculante",
        "requiere_auditoria_focalizada": bool(mission_creep or traps or critical or inefficiency),
        "acciones_recomendadas": actions,
        "regla_presupuestal": (
            "No modifica apropiaciones; la autoridad competente decide tras validar evidencia, "
            "metas, restricciones legales y trazabilidad."
        ),
    }


def generar_dictamen_ejecutivo_pdt(
    diagnostico: dict[str, Any],
    dependencia: str | None = None,
    sector: str | None = None,
) -> dict[str, Any]:
    """Genera pliego pericial por dependencia y síntesis de los cinco sectores GBR."""
    dea = diagnostico.get("dea_scores", {})
    dea_rows = dea.get("resultados_dmu", [])
    by_dependency: dict[str, list[dict[str, Any]]] = {}
    for row in dea_rows:
        name = _dependency_from_dmu(row)
        by_dependency.setdefault(name, []).append(row)

    normalized_filter = _normalizar(dependencia)
    dependency_names = sorted(
        (
            name
            for name in by_dependency
            if not normalized_filter or normalized_filter in _normalizar(name)
        ),
        key=_normalizar,
    )
    bootstrap_by_dmu = dea.get("bias_corrected", dea.get("bootstrap_suavizado", {})).get(
        "por_dmu", {}
    )
    malmquist_rows = dea.get("malmquist", {}).get("pares", [])
    traps = dea.get("spatial_lisa", diagnostico.get("spatial_lisa", {})).get(
        "trampas_territoriales_gestion_publica", []
    )
    trap_names = [
        str(item.get("unidad_dmu") or item.get("unidad") or item)
        if isinstance(item, dict)
        else str(item)
        for item in traps
    ]
    alerts = diagnostico.get("nlp_coherence", {}).get("alertas_mission_creep", [])
    similarity = diagnostico.get("nlp_coherence", {}).get("similaridad_coseno", {})
    forecast = diagnostico.get("time_series_forecast", {})
    critical_series = [
        item
        for item in forecast.get("series", [])
        if item.get("ISRI") is not None and float(item["ISRI"]) > 0.40
    ]

    briefs = []
    for name in dependency_names:
        rows = by_dependency[name]
        row_labels = {str(row.get("dmu")) for row in rows}
        dep_alerts = [alert for alert in alerts if _alert_matches(alert, name)]
        dep_traps = [
            territory
            for territory in trap_names
            if _normalizar(name) in _normalizar(territory)
            or _normalizar(territory) in _normalizar(name)
        ]
        dep_malmquist = [
            item for item in malmquist_rows if _normalizar(item.get("unidad")) == _normalizar(name)
        ]
        dep_critical = [
            item
            for item in critical_series
            if _normalizar(name) in _normalizar(item.get("indicador", ""))
            or _normalizar(item.get("entidad")) == _normalizar(name)
            or item.get("entidad") is None
        ]
        inefficient = any(
            row.get("theta_bcc") is not None and float(row["theta_bcc"]) < 1 - 1e-6 for row in rows
        )
        bootstrap_intervals = {
            label: bootstrap_by_dmu[label] for label in row_labels if label in bootstrap_by_dmu
        }
        briefs.append(
            {
                "dependencia": name,
                "periodos_dmu": sorted(row_labels),
                "observaciones_dea": len(rows),
                "theta_ccr_promedio": _round(_mean(rows, "theta_ccr")),
                "theta_bcc_promedio": _round(_mean(rows, "theta_bcc")),
                "SE_o_promedio": _round(_mean(rows, "SE_o")),
                "rendimientos_escala": {
                    code: sum(row.get("rendimientos_escala") == code for row in rows)
                    for code in ("CRS", "IRS", "DRS")
                },
                "slacks": {str(row.get("dmu")): row.get("slacks", {}) for row in rows},
                "bootstrap_simar_wilson": bootstrap_intervals,
                "malmquist": dep_malmquist,
                "nlp": {
                    "pares_evaluados_globales": similarity.get("pares_evaluados", 0),
                    "similaridad_media_global": similarity.get("promedio"),
                    "alertas_mission_creep_vinculadas": dep_alerts,
                    "alertas_vinculadas_total": len(dep_alerts),
                },
                "trampas_territoriales": dep_traps,
                "indicadores_isri_mayor_040": dep_critical,
                "prueba_chow_2024": [
                    {"indicador": item.get("indicador"), **(item.get("chow") or {})}
                    for item in dep_critical
                ],
                "dictamen_prescriptivo": _prescription(
                    inefficient, bool(dep_alerts), dep_traps, dep_critical
                ),
            }
        )

    nlp_sectors = diagnostico.get("nlp_coherence", {}).get("sectores", [])
    multisector_rows = diagnostico.get("evaluacion_multisectorial", [])
    sector_rows_by_name = {
        _normalizar(row.get("sector")): row
        for row in multisector_rows
        if isinstance(row, dict) and row.get("sector")
    }
    nlp_sector_by_name = {
        _normalizar(row.get("sector")): row
        for row in nlp_sectors
        if isinstance(row, dict) and row.get("sector")
    }
    normalized_sector = _normalizar(sector)
    selected_sectors = [
        name
        for name in SECTORES_GBR
        if not normalized_sector or normalized_sector in _normalizar(name)
    ]
    sector_summaries = []
    for name in selected_sectors:
        row = sector_rows_by_name.get(_normalizar(name), {})
        nlp_row = nlp_sector_by_name.get(_normalizar(name), {})
        sector_summaries.append(
            {
                "sector": name,
                "indicadores_mir": row.get("indicadores_mir", nlp_row.get("indicadores_mir", [])),
                "tecnica_principal": row.get("tecnica_principal", nlp_row.get("tecnica_principal")),
                "documentos_coincidentes": row.get(
                    "documentos_coincidentes", nlp_row.get("documentos_coincidentes", 0)
                ),
                "metas_asociadas": row.get("metas_asociadas", 0),
                "actividades_asociadas": row.get("actividades_asociadas", 0),
                "presupuesto_ejecutado_cop": row.get("presupuesto_ejecutado_cop"),
                "eficiencia_dea_promedio": row.get("eficiencia_dea_promedio"),
                "similaridad_semantica_promedio": row.get("similaridad_semantica_promedio"),
                "riesgo_isri_promedio": row.get("riesgo_isri_promedio"),
                "estado_auditoria_gbr": row.get("estado_auditoria_gbr", "PENDIENTE_EVIDENCIA"),
            }
        )

    fecha = datetime.now(UTC)
    high_risk_count = sum(len(item["indicadores_isri_mayor_040"]) for item in briefs)
    audit_count = sum(
        bool(item["dictamen_prescriptivo"]["requiere_auditoria_focalizada"]) for item in briefs
    )
    summary = (
        f"Dictamen PDT para {diagnostico.get('jurisdiction', 'jurisdicción no especificada')}: "
        f"{len(briefs)} dependencia(s), {len(sector_summaries)} sector(es), "
        f"{high_risk_count} señal(es) ISRI > 0.40 y {audit_count} dependencia(s) con "
        "recomendación de auditoría focalizada. Las recomendaciones son técnicas y no "
        "modifican apropiaciones."
    )
    markdown_lines = [
        "# Dictamen pericial ejecutivo PDT",
        "",
        f"**Jurisdicción:** {diagnostico.get('jurisdiction', 'No especificada')}  ",
        f"**Horizonte:** {diagnostico.get('time_horizon', 'No especificado')}  ",
        f"**Fecha:** {fecha.isoformat()}",
        "",
        "## Síntesis ejecutiva",
        "",
        summary,
        "",
        "## Dictámenes por dependencia",
        "",
    ]
    if not briefs:
        markdown_lines.append(
            "No hay dependencias que coincidan con el filtro o con observaciones DEA disponibles."
        )
    for item in briefs:
        markdown_lines.extend(
            [
                f"### {item['dependencia']}",
                "",
                f"- DEA: CCR={item['theta_ccr_promedio']}, BCC={item['theta_bcc_promedio']}, "
                f"SE={item['SE_o_promedio']}; escalas={item['rendimientos_escala']}",
                f"- DMUs con holguras: {len(item['slacks'])}; intervalos bootstrap: "
                f"{len(item['bootstrap_simar_wilson'])}; pares Malmquist: {len(item['malmquist'])}",
                f"- Alertas NLP vinculadas: {item['nlp']['alertas_vinculadas_total']}; "
                f"trampas territoriales: {len(item['trampas_territoriales'])}; "
                f"indicadores ISRI críticos: {len(item['indicadores_isri_mayor_040'])}",
                "- **Prescripción:** "
                + " ".join(item["dictamen_prescriptivo"]["acciones_recomendadas"]),
                "",
            ]
        )
    markdown_lines.extend(["## Síntesis sectorial GBR", ""])
    for item in sector_summaries:
        markdown_lines.extend(
            [
                f"### {item['sector']}",
                "",
                f"- Técnica: {item['tecnica_principal'] or 'Pendiente de dato'}; "
                f"estado: {item['estado_auditoria_gbr']}.",
                f"- Indicadores MIR: {', '.join(item['indicadores_mir']) or 'No disponibles'}.",
                f"- Metas: {item['metas_asociadas']}; "
                f"actividades: {item['actividades_asociadas']}; "
                f"ejecución: {item['presupuesto_ejecutado_cop']} COP.",
                "",
            ]
        )
    markdown_lines.extend(
        [
            "## Alcance y trazabilidad",
            "",
            "Las cifras provienen del diagnóstico PDT-AI-EVALUATOR y las fuentes de seguimiento "
            "PDD/PPI declaradas allí. Las eficiencias son relativas al conjunto comparable; "
            "no constituyen inferencia causal ni certificación fiscal.",
            "",
        ]
    )
    return {
        "filtros": {"dependencia": dependencia, "sector": sector},
        "dependencia": dependencia,
        "sector": sector,
        "resumen_ejecutivo": summary,
        "fecha_generacion": fecha,
        "dictamenes_dependencias": briefs,
        "sintesis_sectores": sector_summaries,
        "informe_markdown": "\n".join(markdown_lines),
        "trazabilidad": {
            "motor": diagnostico.get("motor", "PDT-AI-EVALUATOR"),
            "fuentes": diagnostico.get("trazabilidad_fuentes", {}),
            "dea_solver": dea.get("modelo"),
            "bootstrap": dea.get("bias_corrected", dea.get("bootstrap_suavizado", {})).get(
                "metodo"
            ),
            "generado_en": fecha.isoformat(),
        },
    }
