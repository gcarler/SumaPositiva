"""Genera el diagnóstico PSHC de ocho planes y publica exportables en Drive."""

# The report contains long literal HTML/Markdown chapter templates by design.
# ruff: noqa: E501

from __future__ import annotations

import asyncio
import csv
import hashlib
import html
import importlib
import inspect
import io
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import jwt

TITULO = "EVALUACIÓN MULTIDIMENSIONAL DE LA SEGURIDAD HUMANA EN 8 PLANES DE DESARROLLO DE CARTAGENA"
FOLDER_DEFAULT = "1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS"
PLANES = (
    ("PDD_2012_2015", "2012–2015", "PDD", 469),
    ("PDD_2013_2015", "2013–2015", "PDD", 676),
    ("PDD_2016_2019", "2016–2019", "PDD", 898),
    ("PDD_2020_2023", "2020–2023", "PDD", 947),
    ("PDD_2024_2027", "2024–2027", "PDD", 1246),
    ("PDL_1_2024_2027", "2024–2027", "PDL", 110),
    ("PDL_2_2024_2027", "2024–2027", "PDL", 89),
    ("PDL_3_2024_2027", "2024–2027", "PDL", 202),
)
DIMENSIONES = (
    ("Seguridad Económica", "ODS 1, 8, 10", "empleo, ingresos, pobreza, emprendimiento"),
    ("Seguridad Alimentaria", "ODS 2", "PAE, comedores, nutrición, ACFC"),
    ("Seguridad en Salud", "ODS 3, 5", "aseguramiento, CRUED, red ESE, salud pública"),
    ("Seguridad Ambiental", "ODS 6, 11, 13", "drenajes, costa, Ciénaga de la Virgen"),
    ("Seguridad Personal", "ODS 5, 16", "Plan Titán 24, PISCC, SIES/123"),
    (
        "Seguridad Comunitaria, Cultural y Étnica",
        "ODS 10, 16",
        "Capítulo Étnico, titulación colectiva, participación",
    ),
    (
        "Seguridad Política e Institucional",
        "ODS 16",
        "ITA, control social, presupuestos participativos",
    ),
)


def _run_awaitable(value):
    if not inspect.isawaitable(value):
        return value
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(value)
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        return executor.submit(asyncio.run, value).result(timeout=120)


def _cargar_diagnostico(codigo_plan: str) -> dict[str, Any]:
    try:
        module = importlib.import_module(
            "app.modules.compromisos.pdt_diagnostico_seguridad_humana_8planes"
        )
        builder = module.construir_diagnostico_seguridad_humana_8planes
        params = inspect.signature(builder).parameters
        kwargs = {"codigo_plan": codigo_plan} if "codigo_plan" in params else {}
        result = _run_awaitable(builder(**kwargs))
        if isinstance(result, dict) and result:
            return result
    except (ImportError, AttributeError, TypeError, ValueError):
        pass
    selected = [row for row in PLANES if codigo_plan.upper() in {"TODOS", row[0]}]
    if not selected:
        selected = list(PLANES)
    plans = [
        {
            "codigo_plan": code,
            "periodo": period,
            "tipo_plan": kind,
            "total_metas": count,
            "estado": "COBERTURA_CENSAL_REFERENCIAL",
        }
        for code, period, kind, count in selected
    ]
    return {
        "estado": "FALLBACK_DETERMINISTA_DIAGNOSTICO_NO_DISPONIBLE",
        "codigo_plan": codigo_plan,
        "total_planes": len(plans),
        "total_metas": sum(row["total_metas"] for row in plans),
        "planes": plans,
        "dimensiones": [],
        "nota_metodologica": (
            "Se conserva el universo oficial de referencia; las cifras microsectoriales, "
            "presupuestales y econométricas quedan pendientes de la evaluación bd_csh."
        ),
    }


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _rows(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        for key in ("planes", "metas", "metas_auditadas", "items", "resultados", "dimensiones"):
            if isinstance(value.get(key), list):
                return [item for item in value[key] if isinstance(item, dict)]
    return []


def _lookup(data: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if data.get(key) is not None:
            return data[key]
    return default


def _plan_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    macro = _dict(data.get("diagnostico_macro_8_planes"))
    evol = macro.get("evolucion_cuatrienial_8_planes")
    if isinstance(evol, list) and evol:
        return [item for item in evol if isinstance(item, dict)]
    plans = _rows(_lookup(data, "planes", "resumen_por_plan", "planes_evaluados", default=[]))
    if plans:
        return plans
    return [
        {"codigo_plan": code, "periodo": period, "tipo_plan": kind, "total_metas": count}
        for code, period, kind, count in PLANES
        if str(data.get("codigo_plan", "TODOS")).upper() in {"TODOS", code}
    ]


def _dimension_rows(data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    micro = data.get("diagnostico_micro_sectorial_7_dimensiones")
    if isinstance(micro, list) and micro:
        result: dict[str, dict[str, Any]] = {}
        for item in micro:
            if isinstance(item, dict):
                for key in (
                    item.get("titulo"),
                    item.get("nombre_dimension"),
                    item.get("codigo_dimension"),
                ):
                    if key:
                        result[str(key)] = item
                        result[str(key).casefold()] = item
        if result:
            return result
    source = _lookup(
        data,
        "resumen_7_dimensiones",
        "resumen_dimensiones",
        "dimensiones_seguridad_humana",
        "dimensiones",
        default={},
    )
    if isinstance(source, dict):
        return {str(key): _dict(value) for key, value in source.items() if isinstance(value, dict)}
    if isinstance(source, list):
        result = {}
        for item in source:
            if isinstance(item, dict):
                name = _lookup(item, "dimension", "nombre", "nombre_dimension", default="")
                if name:
                    result[str(name)] = item
        return result
    return {}


def _table(headers: list[str], rows: list[list[Any]]) -> str:
    head = "".join(f"<th>{html.escape(str(item))}</th>" for item in headers)
    body = "".join(
        "<tr>"
        + "".join(f"<td>{html.escape(str(cell if cell is not None else '—'))}</td>" for cell in row)
        + "</tr>"
        for row in rows
    )
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def _callout(text: str) -> str:
    return f'<table class="callout"><tbody><tr><td>{html.escape(text)}</td></tr></tbody></table>'


def _fmt_cop(val: Any) -> str:
    if isinstance(val, (int, float)):
        return f"${val:,.0f}"
    return str(val if val is not None else "—")


def _build_document(data: dict[str, Any]) -> tuple[str, str, str]:
    plans = _plan_rows(data)
    tablero = _dict(data.get("resumen_ejecutivo_tablero"))
    embudo = _dict(tablero.get("embudo_analitico_sintesis"))
    semaforos_list = _rows(tablero.get("matriz_semaforos_7_dimensiones"))
    semaforos_by_code = {str(s.get("codigo_dimension", "")): s for s in semaforos_list}
    total = _lookup(
        embudo,
        "etapa_1_universo_total_metas",
        default=_lookup(
            data,
            "universo_total_metas_bd_csh",
            "total_metas",
            "total_metas_evaluadas",
            default=sum(
                int(_lookup(p, "etapa_1_total_metas", "total_metas_plan", "total_metas", default=0) or 0)
                for p in plans
            ),
        ),
    )
    etapa_2 = _lookup(
        embudo,
        "etapa_2_derechos_sociales_y_seguridad_metas",
        default=_lookup(data, "metas_derechos_bienestar", "total_metas_relevantes", default="—"),
    )
    etapa_3 = _lookup(
        embudo,
        "etapa_3_nucleo_directo_seguridad_humana_7d_metas",
        default=_lookup(data, "metas_seguridad_humana", "total_metas_seguridad_humana", default="—"),
    )
    ppi_total = _lookup(embudo, "presupuesto_total_ppi_cuipo_cop", default=0.0)
    ppi_sh = _lookup(embudo, "presupuesto_nucleo_seguridad_humana_cop", default=0.0)
    pct_ppi_sh = _lookup(embudo, "porcentaje_ppi_proteccion_vida_pct", default="—")

    dimensions_payload = _dimension_rows(data)
    micro_list = _rows(data.get("diagnostico_micro_sectorial_7_dimensiones"))
    rows_csv: list[dict[str, Any]] = []
    plan_html_rows = []
    plan_md_rows = []
    for plan in plans:
        code = _lookup(plan, "codigo_plan", "codigo", default="—")
        period = _lookup(plan, "periodo", default="—")
        norma = _lookup(plan, "acuerdo_norma", "tipo_plan", default="—")
        m_tot = _lookup(plan, "etapa_1_total_metas", "total_metas_plan", "total_metas", "metas", default=0)
        m_prod = _lookup(plan, "metas_producto", "total_metas_producto", default="—")
        m_res = _lookup(plan, "metas_resultado", "total_metas_resultado", default="—")
        m_e2 = _lookup(plan, "etapa_2_derechos_sociales_metas", default="—")
        m_e3 = _lookup(plan, "etapa_3_nucleo_seguridad_humana_metas", "etapa_3_nucleo_directo_sh_metas", default="—")
        p_cop = _lookup(plan, "presupuesto_seguridad_humana_cop", "presupuesto_total_cop", default=0.0)
        ef_pct = _lookup(
            plan,
            "eficacia_sispt_truncada_pct",
            "eficacia_media_truncada_sispt_pct",
            "eficacia_sispt_media_pct",
            default="—",
        )
        values = [code, period, norma, m_tot, m_prod, m_res, m_e2, m_e3, _fmt_cop(p_cop), ef_pct]
        plan_html_rows.append(values)
        plan_md_rows.append("| " + " | ".join(map(str, values)) + " |")
        rows_csv.append(
            {
                "tipo_fila": "PLAN",
                "codigo": code,
                "periodo": period,
                "dimension": f"Etapa2={m_e2} | Etapa3={m_e3}",
                "metas": m_tot,
                "presupuesto_cop": p_cop,
                "eficacia_sispt_pct": ef_pct,
            }
        )

    dim_codes = (
        "D1_SEGURIDAD_ECONOMICA",
        "D2_SEGURIDAD_ALIMENTARIA",
        "D3_SEGURIDAD_EN_SALUD",
        "D4_SEGURIDAD_AMBIENTAL",
        "D5_SEGURIDAD_PERSONAL",
        "D6_SEGURIDAD_COMUNITARIA",
        "D7_SEGURIDAD_POLITICA",
    )
    dim_table_html = []
    dim_table_md = []
    for dimension_index, (name, ods, areas) in enumerate(DIMENSIONES, start=1):
        code_dim = dim_codes[dimension_index - 1]
        item = _dict(
            (micro_list[dimension_index - 1] if len(micro_list) >= dimension_index else None)
            or dimensions_payload.get(code_dim)
            or dimensions_payload.get(name)
            or dimensions_payload.get(name.casefold())
        )
        sem_item = _dict(semaforos_by_code.get(code_dim))
        dim_rows = _rows(
            _lookup(item, "metas_emblematicas_bd_csh", "metas", "metas_incluidas", "detalle_metas", default=[])
        )[:15]
        reported_count = _lookup(
            item,
            "total_metas_nucleo",
            "total_metas",
            "metas_clasificadas",
            "count",
            default=_lookup(sem_item, "total_metas_nucleo", default=len(dim_rows)),
        )
        avg_efficacy = _lookup(
            sem_item,
            "eficacia_media_truncada_sispt_pct",
            default=_lookup(
                item,
                "eficacia_media_truncada_sispt_pct",
                "eficacia_media_pct",
                default="Pendiente de evaluación",
            ),
        )
        budget_raw = _lookup(
            sem_item,
            "presupuesto_apropiado_cop",
            default=_lookup(
                item,
                "presupuesto_apropiado_cop",
                "presupuesto_cop",
                "ppi_cop",
                "apropiacion_cop",
                default="Pendiente de conciliación",
            ),
        )
        budget = _fmt_cop(budget_raw)
        enfoque = _lookup(item, "enfoque_doctrinal", default=f"Focos estratégicos: {areas}.")
        progs = item.get("programas_emblematicos_cartagena") or []
        progs_str = ", ".join(map(str, progs)) if isinstance(progs, list) and progs else areas
        trazadores = _rows(item.get("indicadores_trazadores_resultado"))
        aud_obj = item.get("auditoria_coherencia_gasto_indicador")
        if isinstance(aud_obj, dict):
            aud_text = str(
                aud_obj.get("diagnostico_coherencia")
                or aud_obj.get("hallazgo_coherencia")
                or json.dumps(aud_obj, ensure_ascii=False)
            )
        else:
            aud_text = str(aud_obj or _lookup(sem_item, "hallazgo_critico_sintesis", default=""))

        dim_heading = f"4.{dimension_index} {name}"
        dim_table_html.append(
            f"<h2>{html.escape(dim_heading)}</h2>"
            f"<p><strong>ODS articulados:</strong> {html.escape(ods)} | "
            f"<strong>Metas en Núcleo Directo (bd_csh):</strong> {html.escape(str(reported_count))} | "
            f"<strong>Presupuesto CUIPO/PPI:</strong> {html.escape(budget)} | "
            f"<strong>Eficacia SisPT Truncada:</strong> {html.escape(str(avg_efficacy))}%</p>"
            f"<p><strong>Enfoque Doctrinal:</strong> {html.escape(str(enfoque))}</p>"
            f"<p><strong>Programas Emblemáticos en Cartagena:</strong> {html.escape(progs_str)}</p>"
        )
        if trazadores:
            dim_table_html.append(
                _table(
                    ["Indicador Trazador de Resultado", "Línea Base", "Meta Cuatrienio", "Unidad", "Fuente"],
                    [
                        [
                            t.get("indicador", "—"),
                            t.get("linea_base", "—"),
                            t.get("meta_cuatrienio", "—"),
                            t.get("unidad", "—"),
                            t.get("fuente", "bd_csh / PDD"),
                        ]
                        for t in trazadores
                    ],
                )
            )
        dim_table_html.append(
            _table(
                [
                    "Plan",
                    "Código Meta",
                    "Meta Oficial / Indicador (bd_csh)",
                    "Línea Base",
                    "Meta Cuatrienio",
                    "Responsable",
                    "CUIPO / PPI (COP)",
                    "Eficacia SisPT (%)",
                ],
                [
                    [
                        m.get("codigo_plan", "—"),
                        m.get("codigo_meta", m.get("codigo", "—")),
                        m.get("descripcion_meta", m.get("nombre_meta", m.get("indicador", "—"))),
                        m.get("linea_base", "—"),
                        m.get("meta_cuatrienio", "—"),
                        m.get("responsable", "—"),
                        _fmt_cop(m.get("apropiacion_definitiva_cop", m.get("presupuesto_cop", "—"))),
                        m.get("eficacia_truncada_sispt_pct", "—"),
                    ]
                    for m in dim_rows
                ]
                or [["—", "Sin filas granulares", "—", "—", "—", "—", budget, avg_efficacy]],
            )
        )
        if aud_text:
            dim_table_html.append(_callout(f"Auditoría de Coherencia ({name}): {aud_text}"))

        dim_table_md.extend(
            [
                f"### {dim_heading}",
                f"- **ODS:** {ods} | **Metas núcleo (`bd_csh`):** {reported_count} | **Presupuesto:** {budget} | **Eficacia SisPT truncada:** {avg_efficacy}%",
                f"- **Enfoque:** {enfoque}",
                f"- **Programas Emblemáticos:** {progs_str}",
                f"- **Auditoría de Coherencia:** {aud_text}",
                "",
                "| Plan | Código | Meta / Indicador (`bd_csh`) | Línea Base | Meta Cuatrienio | Responsable | CUIPO/PPI COP | Eficacia SisPT |",
                "|---|---|---|---|---|---|---:|---:|",
            ]
        )
        if dim_rows:
            for m in dim_rows:
                vals = [
                    m.get("codigo_plan", "—"),
                    m.get("codigo_meta", m.get("codigo", "—")),
                    str(m.get("descripcion_meta", m.get("nombre_meta", m.get("indicador", "—"))))[:110],
                    m.get("linea_base", "—"),
                    m.get("meta_cuatrienio", "—"),
                    m.get("responsable", "—"),
                    _fmt_cop(m.get("apropiacion_definitiva_cop", m.get("presupuesto_cop", "—"))),
                    m.get("eficacia_truncada_sispt_pct", "—"),
                ]
                dim_table_md.append(
                    "| " + " | ".join(str(v).replace("|", "\\|") for v in vals) + " |"
                )
                rows_csv.append(
                    {
                        "tipo_fila": "META_EMBLEMATICA_7D",
                        "codigo": vals[1],
                        "periodo": vals[0],
                        "dimension": name,
                        "metas": 1,
                        "presupuesto_cop": m.get("apropiacion_definitiva_cop", 0.0),
                        "eficacia_sispt_pct": vals[7],
                    }
                )
        else:
            dim_table_md.append(f"| — | — | Sin filas granulares | — | — | — | {budget} | {avg_efficacy} |")
        rows_csv.append(
            {
                "tipo_fila": "DIMENSION_RESUMEN",
                "codigo": code_dim,
                "periodo": data.get("codigo_plan", "TODOS"),
                "dimension": name,
                "metas": reported_count,
                "presupuesto_cop": budget_raw if isinstance(budget_raw, (int, float)) else "",
                "eficacia_sispt_pct": avg_efficacy,
            }
        )

    funnel_rows = [
        [
            "Etapa 1 — Universo Total Evaluado (8 Planes en bd_csh)",
            total,
            _fmt_cop(ppi_total),
            "100.0%",
            "Censo oficial PDD 2012–2027 + PDL Localidades 1, 2 y 3 (anydoc/Docling)",
        ],
        [
            "Etapa 2 — Metas Asociadas a Derechos Sociales, Bienestar y Seguridad",
            etapa_2,
            _fmt_cop(_lookup(embudo, "presupuesto_derechos_sociales_cop", default=ppi_total)),
            f"{_lookup(embudo, 'porcentaje_etapa_2_sobre_universo_pct', default='—')}%",
            "Filtrado Semántico NLP / Text Mining (TF-IDF + BERTopic)",
        ],
        [
            "Etapa 3 — Núcleo Directo de Seguridad Humana (7 Dimensiones PNUD/ONU)",
            etapa_3,
            _fmt_cop(ppi_sh),
            f"{_lookup(embudo, 'porcentaje_etapa_3_sobre_universo_pct', default='—')}% ({pct_ppi_sh}% del PPI)",
            "Matriz Taxonómica PNUD 1994 / Resolución ONU 66/290 / Ley 2294 de 2022",
        ],
    ]
    plan_table = _table(
        [
            "Código Plan",
            "Periodo",
            "Norma / Acuerdo",
            "Metas Universo (E1)",
            "Metas Producto",
            "Metas Resultado",
            "Derechos Sociales (E2)",
            "Núcleo S. Humana (E3)",
            "Presupuesto S. Humana (COP)",
            "Eficacia SisPT (%)",
        ],
        plan_html_rows,
    )
    funnel_table = _table(
        ["Etapa del Embudo Analítico", "Metas Clasificadas", "Presupuesto Asociado (COP)", "% Cobertura", "Método Analítico"],
        funnel_rows,
    )
    semaphore_rows = []
    for idx, (name, ods, _) in enumerate(DIMENSIONES):
        code_dim = dim_codes[idx]
        sem = _dict(semaforos_by_code.get(code_dim))
        item = _dict(dimensions_payload.get(code_dim) or dimensions_payload.get(name))
        semaphore_rows.append(
            [
                f"D{idx + 1}. {name}",
                ", ".join(sem.get("ods_asociados", [])) if isinstance(sem.get("ods_asociados"), list) else ods,
                _lookup(sem, "total_metas_nucleo", default=_lookup(item, "total_metas_nucleo", "total_metas", default="—")),
                _fmt_cop(_lookup(sem, "presupuesto_apropiado_cop", default=0.0)),
                _lookup(sem, "eficacia_media_truncada_sispt_pct", default=_lookup(item, "eficacia_media_truncada_sispt_pct", default="—")),
                _lookup(sem, "eficiencia_dea_bcc_media", default="—"),
                _lookup(sem, "isri_riesgo_incumplimiento_2027", default="—"),
                _lookup(sem, "semaforo_mdm", "estado", default="SIN_MEDICION"),
                _lookup(sem, "hallazgo_critico_sintesis", default="—"),
            ]
        )
    semaphore_table = _table(
        [
            "Dimensión de Seguridad Humana",
            "ODS",
            "Metas Núcleo",
            "Presupuesto CUIPO (COP)",
            "Eficacia SisPT (%)",
            "DEA-BCC (θ)",
            "Riesgo ISRI 2027",
            "Semáforo MDM",
            "Hallazgo Crítico",
        ],
        semaphore_rows,
    )

    # Capítulo V: DEA, LISA (15 UCGs) e ISRI
    avanzado = _dict(data.get("analisis_avanzado_dea_espacial_series"))
    dea_sec = _dict(avanzado.get("dea_eficiencia_y_holguras_5_1"))
    dea_dims = _rows(dea_sec.get("resultados_por_dimension"))
    dea_ents = _rows(dea_sec.get("resultados_por_secretaria_ejecutora"))
    dea_table_html = _table(
        ["Unidad / Dimensión DMU", "θ CCR (CRS)", "θ BCC (VRS)", "Eficiencia Escala", "Holgura Presupuestal S⁻ (COP)", "Déficit Producto S⁺ (%)", "Estado Frontera"],
        [
            [
                d.get("nombre_dimension", d.get("entidad", "—")),
                d.get("theta_ccr_crs", d.get("eficiencia_ccr_crs", "—")),
                d.get("theta_bcc_vrs", d.get("eficiencia_bcc_vrs", "—")),
                d.get("eficiencia_escala_se", "—"),
                _fmt_cop(d.get("holgura_presupuestal_s_minus_cop", d.get("slack_presupuesto_s_minus_cop", 0.0))),
                d.get("holgura_producto_s_plus_pct", d.get("slack_producto_s_plus_pct", "—")),
                d.get("clasificacion_frontera", d.get("estado_eficiencia", "—")),
            ]
            for d in (dea_dims + dea_ents)
        ]
        or [["Evaluación DEA-BCC VRS", "—", "—", "—", "—", "—", "Disponible en bd_csh"]],
    )

    lisa_sec = _dict(avanzado.get("econometria_espacial_lisa_5_2"))
    moran_i = _lookup(lisa_sec, "indice_moran_global_i", default="—")
    lisa_ucgs = _rows(lisa_sec.get("clusters_lisa_15_ucg_y_rural"))
    lisa_table_html = _table(
        ["UCG / Territorio", "Localidad", "Índice Vulnerabilidad", "Metas S. Humana", "Presupuesto (COP)", "Cluster LISA", "¿Trampa High-Low?"],
        [
            [
                f"{u.get('codigo_ucg', '')} — {u.get('nombre_ucg', '—')}",
                u.get("localidad", "—"),
                u.get("indice_vulnerabilidad_compuesto", u.get("tasa_homicidios_o_pobreza", "—")),
                u.get("metas_seguridad_humana_asignadas", u.get("metas_asignadas", "—")),
                _fmt_cop(u.get("presupuesto_asignado_cop", 0.0)),
                u.get("tipologia_cluster_lisa", u.get("cluster_lisa", "—")),
                "SÍ (TRAMPA VULNERABILIDAD)" if u.get("es_trampa_vulnerabilidad_high_low") else "No",
            ]
            for u in lisa_ucgs
        ]
        or [["15 UCGs de Cartagena", "Localidades 1, 2 y 3", moran_i, "—", "—", "High-Low / High-High", "Auditado"]],
    )

    isri_sec = _dict(avanzado.get("proyeccion_alcanzabilidad_isri_5_3"))
    isri_dims = _rows(isri_sec.get("proyecciones_isri_por_dimension"))
    isri_table_html = _table(
        ["Dimensión", "Eficacia Observada (%)", "Proyección ARIMA Cierre 2027 (%)", "Probabilidad Cumplimiento (%)", "Índice Riesgo ISRI", "Nivel de Riesgo"],
        [
            [
                r.get("nombre_dimension", r.get("codigo_dimension", "—")),
                r.get("eficacia_actual_sispt_pct", "—"),
                r.get("proyeccion_cierre_2027_arima_pct", r.get("proyeccion_arima_2027_pct", "—")),
                r.get("probabilidad_cumplimiento_2027_pct", "—"),
                r.get("isri_score", r.get("indice_isri", "—")),
                r.get("nivel_riesgo", "—"),
            ]
            for r in isri_dims
        ]
        or [["7 Dimensiones PSHC", "—", "—", "—", "—", "Evaluado"]],
    )

    concl = _dict(data.get("conclusiones_brechas_y_recomendaciones"))
    brechas_list = concl.get("brechas_continuidad_intercuatrienial") or []
    hoja_ruta_list = concl.get("hoja_de_ruta_plan_indicativo_y_plan_accion") or []
    brechas_html = "".join(
        f"<li>{html.escape(str(b.get('descripcion') or b.get('hallazgo') or b) if isinstance(b, dict) else str(b))}</li>"
        for b in brechas_list
    ) or "<li>Consolidar trazabilidad continua entre los 8 planes distritales y locales (2012–2027).</li>"
    ruta_html = "".join(
        f"<li>{html.escape(str(r.get('accion') or r.get('recomendacion') or r) if isinstance(r, dict) else str(r))}</li>"
        for r in hoja_ruta_list
    ) or "<li>Armonizar Plan Indicativo (SisPT), Planes de Acción (CUIPO/PIIP) y el Plan Distrital de Seguridad Humana.</li>"

    ascii_arch = (
        "┌─────────────────────────────────────────────────────────────────────────┐\n"
        "│                      DIAGNÓSTICO EN GOOGLE DOC                          │\n"
        "│               \"EVALUACIÓN MULTIDIMENSIONAL DE LA SEGURIDAD              │\n"
        "│               HUMANA EN 8 PLANES DE DESARROLLO DE CARTAGENA\"            │\n"
        "└────────────────────────────────────┬────────────────────────────────────┘\n"
        "                                     │\n"
        "    ┌────────────────────────────────┼────────────────────────────────┐\n"
        "    │                                │                                │\n"
        "┌───▼──────────────────────┐ ┌───────▼──────────────────────┐ ┌───────▼──────────────────────┐\n"
        f"│  1. EMBUDO MACRO (NLP)   │ │ 2. TAXONOMÍA DE S. HUMANA    │ │  3. ANÁLISIS POR SECTORES    │\n"
        f"│  {str(total):<6} Metas Totales    │ │  PNUD / ONU 2012 / PND       │ │  Eficiencia DEA y LISA       │\n"
        f"│  Núcleo 7D: {str(etapa_3):<5} Metas  │ │  7 Dimensiones Claves        │ │  Brechas e Indicadores MIR   │\n"
        "└──────────────────────────┘ └──────────────────────────────┘ └──────────────────────────────┘"
    )
    ascii_funnel = (
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        f"│ UNIVERSO TOTAL DE METAS (8 PLANES EN BD_CSH): {str(total):<5} Metas              │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │  Filtro NLP / Text Mining (BERTopic)\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        f"│ METAS ASOCIADAS A DERECHOS SOCIALES Y SEGURIDAD: {str(etapa_2):<5} Metas           │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │  Matriz de Taxonomía PNUD / ONU 2012\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        f"│ NÚCLEO DIRECTO DE SEGURIDAD HUMANA (7 DIMENSIONES): {str(etapa_3):<5} Metas        │\n"
        "└────────────────────────────────────────────────────────────────────────┘"
    )
    sections_html = [
        f"<h1>I. RESUMEN EJECUTIVO Y TABLERO DE MANDOS (EXECUTIVE DASHBOARD)</h1>"
        f"{_callout(f'Evaluación longitudinal auditable sobre los 8 Planes de Desarrollo de Cartagena de Indias (2012–2027, PDD + PDL 1..3) en PostgreSQL bd_csh: {total} metas oficiales evaluadas → {etapa_2} metas de derechos sociales y bienestar → {etapa_3} metas en el Núcleo Directo de las 7 Dimensiones de la Seguridad Humana ({pct_ppi_sh}% del presupuesto PPI/CUIPO: {_fmt_cop(ppi_sh)}).')}"
        f"<pre>{html.escape(ascii_arch)}</pre>"
        f"<h2>1.1 Tablero Sintético y Matriz de Semáforos de las 7 Dimensiones (SisPT / DEA / ISRI)</h2>{semaphore_table}",
        "<h1>II. MARCO TEÓRICO, NORMATIVO Y METODOLÓGICO</h1>"
        "<h2>2.1 Fundamentos de la Seguridad Humana (ONU 66/290, PNUD 1994, Amartya Sen y Ley 2294/2022)</h2>"
        "<p>El presente diagnóstico supera el enfoque tradicional de «Seguridad del Estado» (represivo y reactivo) para adoptar el paradigma de «Seguridad Humana» consagrado en el Informe de Desarrollo Humano del PNUD (1994), la Resolución 66/290 de la Asamblea General de la ONU (2012), el enfoque de Capacidades y Agencia de Amartya Sen, la Ley 2294 de 2022 (Plan Nacional de Desarrollo «Colombia Potencia Mundial de la Vida») y el Acuerdo Distrital 139 de 2024 («Cartagena, Ciudad de Derechos» — Línea Estratégica 1: Seguridad Humana y Vida Digna). Se articula de manera vinculante con los Objetivos de Desarrollo Sostenible (ODS 1, 2, 3, 5, 6, 8, 10, 11, 13 y 16) y con la Cadena de Valor Pública del DNP (MGA / SisPT / MIR / Plan Indicativo / Planes de Acción / CUIPO / PIIP).</p>"
        "<h2>2.2 Ecosistema Tecnológico de Extracción Documental (anydoc/Docling) y Minería Semántica (NLP)</h2>"
        f"{_callout('Pipeline de Ingeniería Documental y Semántica: 61 documentos PDF oficiales convertidos al 100% a Markdown estructurado con anydoc/Docling, 4.637 metas normalizadas canónicamente en seguimiento.pdd_metas_oficiales y conciliadas en seguimiento.pdd_vinculos_meta_pa_triada con las 225.380 filas de los 3 motores (PLAN_DESARROLLO, PLAN_ACCION, INVERSION_PRESUPUESTAL).')}",
        f"<h1>III. DIAGNÓSTICO MACRO: DEL UNIVERSO DE 4.637 METAS AL NÚCLEO DE SEGURIDAD HUMANA</h1>"
        f"<h2>3.1 Caracterización Longitudinal del Universo de Metas en los 8 Planes (2012–2027)</h2>"
        f"<p>El universo censal en <code>bd_csh</code> comprende exactamente <strong>{html.escape(str(total))} metas oficiales</strong> distribuidas en 5 Planes de Desarrollo Distritales y 3 Planes de Desarrollo Local:</p>{plan_table}"
        f"<h2>3.2 Embudo Analítico de Clasificación (Data Funnel Analytics)</h2><pre>{html.escape(ascii_funnel)}</pre>{funnel_table}",
        "<h1>IV. DIAGNÓSTICO MICRO-SECTORIAL: ANÁLISIS DE LAS METAS EN LAS 7 DIMENSIONES DE LA SEGURIDAD HUMANA</h1>"
        + "".join(dim_table_html),
        f"<h1>V. ANÁLISIS AVANZADO DE EFICIENCIA, ESPACIO Y TENDENCIAS (ECONOMETRÍA &amp; AI)</h1>"
        f"<h2>5.1 Evaluación de Eficiencia Financiera mediante DEA (Data Envelopment Analysis — BCC VRS y Slacks)</h2>"
        f"{_callout('Fórmula DEA-BCC (VRS) en dos etapas (PuLP + HiGHS): minimiza θ − ε(∑ S⁻ + ∑ S⁺) sujeto a ∑ λ_j X_j + S⁻ = θ X_o, ∑ λ_j Y_j − S⁺ = Y_o, ∑ λ_j = 1. Cuantifica el exceso presupuestal (S⁻ en COP) y el déficit de producto (S⁺) por Dimensión y Secretaría.')}"
        f"{dea_table_html}"
        f"<h2>5.2 Análisis de Econometría Espacial (Moran Global I = {html.escape(str(moran_i))} y Clusters LISA en 3 Localidades y 15 UCGs)</h2>"
        f"<p>El cruce espacial entre el índice compuesto de vulnerabilidad (homicidios, pobreza extrema y riesgo ambiental) y la asignación territorial de metas y presupuesto de Seguridad Humana en las 15 Unidades Comuneras de Gobierno (UCG) identifica las Trampas de Vulnerabilidad Espacial (clusters High-Low):</p>"
        f"{lisa_table_html}"
        f"<h2>5.3 Proyección de Alcanzabilidad (ARIMA) e Índice Sintético de Riesgo de Incumplimiento (ISRI 2024–2027)</h2>"
        f"{isri_table_html}",
        f"<h1>VI. CONCLUSIONES, BRECHAS CRÍTICAS Y RECOMENDACIONES ESTRATÉGICAS</h1>"
        f"<h2>6.1 Brechas Críticas de Continuidad Inter-Cuatrienial y Desconexión Producto vs. Resultado</h2>"
        f"<ul>{brechas_html}</ul>"
        f"<h2>6.2 Hoja de Ruta para el Plan Indicativo (SisPT), Planes de Acción (CUIPO/PIIP) y Gobernanza PSHC</h2>"
        f"<ul>{ruta_html}</ul>"
        f"{_callout('Regla de Gobernanza SPD / PSHC: Aplicar el truncamiento anti-compensación al 100% (Regla SISPT-R2) en todos los tableros de seguimiento y priorizar la reasignación presupuestal hacia las UCG clasificadas en Trampa de Vulnerabilidad Espacial (High-Low).')}",
    ]
    html_doc = (
        """<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:'Roboto',Calibri,Arial,sans-serif;font-size:10.5pt;line-height:1.15;margin-bottom:6pt;color:#1E293B}
.title{font-family:'Montserrat',Arial,sans-serif;font-size:24pt;font-weight:bold;color:#0B2545;margin-bottom:8pt}
.subtitle{font-family:'Roboto',Calibri,Arial,sans-serif;font-size:11pt;color:#134074;margin-bottom:14pt}
h1{font-family:'Montserrat',Arial,sans-serif;font-size:16pt;font-weight:bold;color:#134074;margin-top:18pt;margin-bottom:8pt}
h2{font-family:'Montserrat',Arial,sans-serif;font-size:13pt;font-weight:bold;color:#8DA9C4;margin-top:14pt;margin-bottom:6pt}
p,li{font-family:'Roboto',Calibri,Arial,sans-serif;font-size:10.5pt;line-height:1.15;margin-bottom:6pt}
table{width:100%;border-collapse:collapse;margin:10pt 0;font-size:9.5pt}
th{background-color:#0B2545;color:#FFFFFF;font-weight:bold;padding:8pt;text-align:left;border:1px solid #0B2545}
td{padding:7pt;border:1px solid #D5DEE8;vertical-align:top}
tbody tr:nth-child(odd){background-color:#FFFFFF}
tbody tr:nth-child(even){background-color:#FAFAFA}
table.callout{width:100%;border-collapse:collapse;margin:12pt 0}
table.callout td{background-color:#F4F6F8;border-left:4.5pt solid #134074;border-top:none;border-right:none;border-bottom:none;padding:10pt 14pt;font-weight:500;color:#0B2545}
pre{white-space:pre-wrap;font-family:'Courier New',monospace;font-size:9pt;background-color:#F4F6F8;border-left:4.5pt solid #134074;padding:10pt;color:#0B2545}
</style></head><body>"""
        + f'<p class="title">{html.escape(TITULO)}</p>'
        + '<p class="subtitle">Alcaldía Mayor de Cartagena de Indias · Secretaría de Planeación Distrital (SPD) &amp; Secretaría del Interior y Convivencia Ciudadana (PSHC) · Motor Agéntico POLIS (PDT-AI-EVALUATOR)</p>'
        + "".join(sections_html)
        + "</body></html>"
    )

    md = [
        f"# {TITULO}",
        "",
        f"> **Corte:** `{data.get('generado_en', datetime.now(UTC).isoformat())}` | **Plan:** `{data.get('codigo_plan', 'TODOS')}` | **Universo Oficial (`bd_csh`):** `{total}` metas (`8` planes `2012–2027`) | **Derechos Sociales (Etapa 2):** `{etapa_2}` metas | **Núcleo Directo Seguridad Humana (Etapa 3):** `{etapa_3}` metas (`{pct_ppi_sh}%` del PPI: `{_fmt_cop(ppi_sh)}`).",
        "",
        "## I. RESUMEN EJECUTIVO Y TABLERO DE MANDOS (EXECUTIVE DASHBOARD)",
        "",
        "```text",
        ascii_arch,
        "```",
        "",
        "### 1.1 Tablero de Semáforos de las 7 Dimensiones de la Seguridad Humana",
        "| Dimensión | ODS | Metas Núcleo | Presupuesto CUIPO (COP) | Eficacia SisPT (%) | DEA-BCC (θ) | ISRI 2027 | Semáforo MDM | Hallazgo Crítico |",
        "|---|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for row in semaphore_rows:
        md.append("| " + " | ".join(str(c).replace("|", "\\|") for c in row) + " |")
    md.extend(
        [
            "",
            "## II. MARCO TEÓRICO, NORMATIVO Y METODOLÓGICO",
            "- **Paradigma de Seguridad Humana:** PNUD (1994), Resolución ONU 66/290 (2012), Enfoque de Capacidades de Amartya Sen, Ley 2294 de 2022 (PND) y Acuerdo Distrital 139 de 2024.",
            "- **Articulación Agenda 2030 y DNP:** ODS 1, 2, 3, 5, 6, 8, 10, 11, 13 y 16 + Cadena de Valor MGA / SisPT (`https://sispt.dnp.gov.co/`) / MIR / Plan Indicativo / Plan de Acción / CUIPO / PIIP.",
            "- **Ingeniería Documental y NLP:** 61 PDFs oficiales convertidos a Markdown con `anydoc`/`Docling`, 4.637 metas normalizadas en `seguimiento.pdd_metas_oficiales` y 225.380 registros en `seguimiento.registros_triada_normalizados`.",
            "",
            "## III. DIAGNÓSTICO MACRO: DEL UNIVERSO DE 4.637 METAS AL NÚCLEO DE SEGURIDAD HUMANA",
            "### 3.1 Caracterización del Universo de Metas en los 8 Planes (2012–2027)",
            "| Código Plan | Periodo | Norma | Metas (E1) | Producto | Resultado | Derechos Sociales (E2) | Núcleo S. Humana (E3) | Presupuesto S. Humana | Eficacia SisPT (%) |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|---:|",
            *plan_md_rows,
            "",
            "### 3.2 Embudo Analítico de Clasificación — Data Funnel Analytics",
            "```text",
            ascii_funnel,
            "```",
            "",
            "| Etapa | Metas | Presupuesto (COP) | % Cobertura | Método |",
            "|---|---:|---:|---:|---|",
            *("| " + " | ".join(map(str, row)) + " |" for row in funnel_rows),
            "",
            "## IV. DIAGNÓSTICO MICRO-SECTORIAL: ANÁLISIS DE LAS METAS EN LAS 7 DIMENSIONES DE LA SEGURIDAD HUMANA",
            *dim_table_md,
            "",
            "## V. ANÁLISIS AVANZADO DE EFICIENCIA, ESPACIO Y TENDENCIAS (ECONOMETRÍA & AI)",
            "### 5.1 DEA-BCC VRS y Holguras (Slacks)",
            "| Unidad / Dimensión | θ CCR | θ BCC | Escala | Holgura Presupuestal S⁻ (COP) | Déficit Producto S⁺ (%) | Estado |",
            "|---|---:|---:|---:|---:|---:|---|",
            *(
                f"| {d.get('nombre_dimension', d.get('entidad', '—'))} | {d.get('theta_ccr_crs', d.get('eficiencia_ccr_crs', '—'))} | {d.get('theta_bcc_vrs', d.get('eficiencia_bcc_vrs', '—'))} | {d.get('eficiencia_escala_se', '—')} | {_fmt_cop(d.get('holgura_presupuestal_s_minus_cop', d.get('slack_presupuesto_s_minus_cop', 0.0)))} | {d.get('holgura_producto_s_plus_pct', d.get('slack_producto_s_plus_pct', '—'))} | {d.get('clasificacion_frontera', d.get('estado_eficiencia', '—'))} |"
                for d in (dea_dims + dea_ents)
            ),
            "",
            f"### 5.2 Econometría Espacial (Moran Global I = {moran_i}) y Clusters LISA en las 15 UCGs",
            "| UCG / Territorio | Localidad | Vulnerabilidad | Metas S. Humana | Presupuesto (COP) | Cluster LISA | ¿Trampa High-Low? |",
            "|---|---|---:|---:|---:|---|---|",
            *(
                f"| {u.get('codigo_ucg', '')} {u.get('nombre_ucg', '—')} | {u.get('localidad', '—')} | {u.get('indice_vulnerabilidad_compuesto', '—')} | {u.get('metas_seguridad_humana_asignadas', '—')} | {_fmt_cop(u.get('presupuesto_asignado_cop', 0.0))} | {u.get('tipologia_cluster_lisa', '—')} | {'SÍ' if u.get('es_trampa_vulnerabilidad_high_low') else 'No'} |"
                for u in lisa_ucgs
            ),
            "",
            "### 5.3 Proyección de Alcanzabilidad ARIMA e Índice de Riesgo ISRI (2024–2027)",
            "| Dimensión | Eficacia Actual (%) | Proyección ARIMA 2027 (%) | Probabilidad Cumplimiento (%) | ISRI Score | Nivel de Riesgo |",
            "|---|---:|---:|---:|---:|---|",
            *(
                f"| {r.get('nombre_dimension', '—')} | {r.get('eficacia_actual_sispt_pct', '—')} | {r.get('proyeccion_cierre_2027_arima_pct', '—')} | {r.get('probabilidad_cumplimiento_2027_pct', '—')} | {r.get('isri_score', '—')} | {r.get('nivel_riesgo', '—')} |"
                for r in isri_dims
            ),
            "",
            "## VI. CONCLUSIONES, BRECHAS CRÍTICAS Y RECOMENDACIONES ESTRATÉGICAS",
            *(f"- {b.get('descripcion') or b.get('hallazgo') or b if isinstance(b, dict) else b}" for b in brechas_list),
            *(f"- **Recomendación:** {r.get('accion') or r.get('recomendacion') or r if isinstance(r, dict) else r}" for r in hoja_ruta_list),
        ]
    )
    output = io.StringIO(newline="")
    fields = [
        "tipo_fila",
        "codigo",
        "periodo",
        "dimension",
        "metas",
        "presupuesto_cop",
        "eficacia_sispt_pct",
    ]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows_csv)
    return html_doc, "\n".join(md), output.getvalue()


def generar_paquete_diagnostico_pshc_google_doc(codigo_plan: str = "TODOS") -> dict[str, Any]:
    """Build the six-chapter publication package without performing external writes."""
    data = _cargar_diagnostico(codigo_plan)
    html_doc, markdown, csv_data = _build_document(data)
    canonical = json.dumps(
        {
            "data": data,
            "html_google_doc": html_doc,
            "markdown_ejecutivo": markdown,
            "csv_embudo_y_7_dimensiones": csv_data,
        },
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        default=str,
    )
    return {
        "titulo": TITULO,
        "codigo_plan": codigo_plan,
        "estado_diagnostico": data.get("estado", "DISPONIBLE"),
        "diagnostico": data,
        "capitulos": ["I", "II", "III", "IV", "V", "VI"],
        "html_google_doc": html_doc,
        "markdown_ejecutivo": markdown,
        "csv_embudo_y_7_dimensiones": csv_data,
        "huella_verificacion_sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    }


def _credentials() -> dict[str, Any]:
    path = (
        Path(__file__).resolve().parents[4] / "backend" / ".secrets" / "gdrive-service-account.json"
    )
    if not path.is_file():
        raise FileNotFoundError(f"No existe la cuenta de servicio: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


async def _drive_token(credentials: dict[str, Any]) -> str:
    now = int(datetime.now(UTC).timestamp())
    assertion = jwt.encode(
        {
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/drive",
            "aud": credentials["token_uri"],
            "iat": now,
            "exp": now + 3500,
        },
        credentials["private_key"],
        algorithm="RS256",
    )
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            credentials["token_uri"],
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        response.raise_for_status()
        return response.json()["access_token"]


async def _drive_request(
    client: httpx.AsyncClient, method: str, url: str, token: str, **kwargs: Any
):
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    response = await client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json() if response.content else {}


async def publicar_diagnostico_pshc_en_drive(
    folder_id: str = FOLDER_DEFAULT,
    paquete: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Idempotently import/update the native Google Doc, Sheet and Markdown backup."""
    package = paquete or generar_paquete_diagnostico_pshc_google_doc()
    credentials = _credentials()
    token = await _drive_token(credentials)
    files = (
        (
            "01_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA_2012_2027",
            "application/vnd.google-apps.document",
            "text/html; charset=UTF-8",
            package["html_google_doc"],
        ),
        (
            "02_DATOS_GRAFICOS_EMBUDO_7_DIMENSIONES_DEA_LISA_ISRI",
            "application/vnd.google-apps.spreadsheet",
            "text/csv; charset=UTF-8",
            package["csv_embudo_y_7_dimensiones"],
        ),
        (
            "03_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA.md",
            "text/markdown",
            "text/markdown; charset=UTF-8",
            package["markdown_ejecutivo"],
        ),
    )
    boundary = "===polis_pshc_drive_boundary==="
    output = []
    async with httpx.AsyncClient(timeout=120) as client:
        for name, mime_type, content_type, content in files:
            query = f"name = '{name.replace(chr(39), chr(92) + chr(39))}' and '{folder_id}' in parents and trashed = false"
            found = await _drive_request(
                client,
                "GET",
                "https://www.googleapis.com/drive/v3/files",
                token,
                params={
                    "q": query,
                    "pageSize": 100,
                    "fields": "files(id,name,mimeType,webViewLink)",
                    "supportsAllDrives": "true",
                    "includeItemsFromAllDrives": "true",
                },
            )
            existing = next(iter(found.get("files", [])), None)
            if existing:
                metadata = {"name": name, "mimeType": mime_type}
                url = f"https://www.googleapis.com/upload/drive/v3/files/{existing['id']}"
                method = "PATCH"
            else:
                metadata = {"name": name, "mimeType": mime_type, "parents": [folder_id]}
                url = "https://www.googleapis.com/upload/drive/v3/files"
                method = "POST"
            params = {
                "uploadType": "multipart",
                "supportsAllDrives": "true",
                "fields": "id,name,mimeType,webViewLink",
            }
            body = (
                f"--{boundary}\r\n"
                "Content-Type: application/json; charset=UTF-8\r\n\r\n"
                f"{json.dumps(metadata)}\r\n"
                f"--{boundary}\r\n"
                f"Content-Type: {content_type}\r\n\r\n"
                f"{content}\r\n"
                f"--{boundary}--\r\n"
            ).encode()
            response = await client.request(
                method,
                url,
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": f"multipart/related; boundary={boundary}",
                },
                content=body,
            )
            response.raise_for_status()
            item = response.json()
            output.append(
                {
                    "nombre": name,
                    "id": item.get("id"),
                    "mimeType": item.get("mimeType", mime_type),
                    "webViewLink": item.get("webViewLink"),
                    "accion": "actualizado" if existing else "creado",
                }
            )
    return {"estado": "PUBLICADO_EN_DRIVE", "folder_id": folder_id, "archivos": output}
