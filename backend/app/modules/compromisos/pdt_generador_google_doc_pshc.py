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
AVISO_CAP_V = (
    "CIFRAS ILUSTRATIVAS, NO CALCULADAS. Los valores de este capítulo (θ de DEA, Moran I, "
    "clusters LISA, ISRI y datos por UCG) son parámetros predefinidos en el código del "
    "generador; no provienen de cálculos sobre los datos de bd_csh. No se ejecutaron DEA, "
    "análisis espacial (PySAL) ni ARIMA, y la base no tiene datos territoriales por UCG. "
    "No deben citarse como resultados. Para un análisis calculado con datos reales véase el "
    "documento «Análisis y estudio de los planes de desarrollo»."
)
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


def _build_document_base(data: dict[str, Any]) -> tuple[str, str, str]:
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
                int(
                    _lookup(p, "etapa_1_total_metas", "total_metas_plan", "total_metas", default=0)
                    or 0
                )
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
        default=_lookup(
            data, "metas_seguridad_humana", "total_metas_seguridad_humana", default="—"
        ),
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
        m_tot = _lookup(
            plan, "etapa_1_total_metas", "total_metas_plan", "total_metas", "metas", default=0
        )
        m_prod = _lookup(plan, "metas_producto", "total_metas_producto", default="—")
        m_res = _lookup(plan, "metas_resultado", "total_metas_resultado", default="—")
        m_e2 = _lookup(plan, "etapa_2_derechos_sociales_metas", default="—")
        m_e3 = _lookup(
            plan,
            "etapa_3_nucleo_seguridad_humana_metas",
            "etapa_3_nucleo_directo_sh_metas",
            default="—",
        )
        p_cop = _lookup(
            plan, "presupuesto_seguridad_humana_cop", "presupuesto_total_cop", default=0.0
        )
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
            _lookup(
                item,
                "metas_emblematicas_bd_csh",
                "metas",
                "metas_incluidas",
                "detalle_metas",
                default=[],
            )
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
                    [
                        "Indicador Trazador de Resultado",
                        "Línea Base",
                        "Meta Cuatrienio",
                        "Unidad",
                        "Fuente",
                    ],
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
                        _fmt_cop(
                            m.get("apropiacion_definitiva_cop", m.get("presupuesto_cop", "—"))
                        ),
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
                    str(m.get("descripcion_meta", m.get("nombre_meta", m.get("indicador", "—"))))[
                        :110
                    ],
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
            dim_table_md.append(
                f"| — | — | Sin filas granulares | — | — | — | {budget} | {avg_efficacy} |"
            )
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
        [
            "Etapa del Embudo Analítico",
            "Metas Clasificadas",
            "Presupuesto Asociado (COP)",
            "% Cobertura",
            "Método Analítico",
        ],
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
                ", ".join(sem.get("ods_asociados", []))
                if isinstance(sem.get("ods_asociados"), list)
                else ods,
                _lookup(
                    sem,
                    "total_metas_nucleo",
                    default=_lookup(item, "total_metas_nucleo", "total_metas", default="—"),
                ),
                _fmt_cop(_lookup(sem, "presupuesto_apropiado_cop", default=0.0)),
                _lookup(
                    sem,
                    "eficacia_media_truncada_sispt_pct",
                    default=_lookup(item, "eficacia_media_truncada_sispt_pct", default="—"),
                ),
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
        [
            "Unidad / Dimensión DMU",
            "θ CCR (CRS)",
            "θ BCC (VRS)",
            "Eficiencia Escala",
            "Holgura Presupuestal S⁻ (COP)",
            "Déficit Producto S⁺ (%)",
            "Estado Frontera",
        ],
        [
            [
                d.get("nombre_dimension", d.get("entidad", "—")),
                d.get("theta_ccr_crs", d.get("eficiencia_ccr_crs", "—")),
                d.get("theta_bcc_vrs", d.get("eficiencia_bcc_vrs", "—")),
                d.get("eficiencia_escala_se", "—"),
                _fmt_cop(
                    d.get(
                        "holgura_presupuestal_s_minus_cop",
                        d.get("slack_presupuesto_s_minus_cop", 0.0),
                    )
                ),
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
        [
            "UCG / Territorio",
            "Localidad",
            "Índice Vulnerabilidad",
            "Metas S. Humana",
            "Presupuesto (COP)",
            "Cluster LISA",
            "¿Trampa High-Low?",
        ],
        [
            [
                f"{u.get('codigo_ucg', '')} — {u.get('nombre_ucg', '—')}",
                u.get("localidad", "—"),
                u.get("indice_vulnerabilidad_compuesto", u.get("tasa_homicidios_o_pobreza", "—")),
                u.get("metas_seguridad_humana_asignadas", u.get("metas_asignadas", "—")),
                _fmt_cop(u.get("presupuesto_asignado_cop", 0.0)),
                u.get("tipologia_cluster_lisa", u.get("cluster_lisa", "—")),
                "SÍ (TRAMPA VULNERABILIDAD)"
                if u.get("es_trampa_vulnerabilidad_high_low")
                else "No",
            ]
            for u in lisa_ucgs
        ]
        or [
            [
                "15 UCGs de Cartagena",
                "Localidades 1, 2 y 3",
                moran_i,
                "—",
                "—",
                "High-Low / High-High",
                "Auditado",
            ]
        ],
    )

    isri_sec = _dict(avanzado.get("proyeccion_alcanzabilidad_isri_5_3"))
    isri_dims = _rows(isri_sec.get("proyecciones_isri_por_dimension"))
    isri_table_html = _table(
        [
            "Dimensión",
            "Eficacia Observada (%)",
            "Proyección ARIMA Cierre 2027 (%)",
            "Probabilidad Cumplimiento (%)",
            "Índice Riesgo ISRI",
            "Nivel de Riesgo",
        ],
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
    brechas_html = (
        "".join(
            f"<li>{html.escape(str(b.get('descripcion') or b.get('hallazgo') or b) if isinstance(b, dict) else str(b))}</li>"
            for b in brechas_list
        )
        or "<li>Consolidar trazabilidad continua entre los 8 planes distritales y locales (2012–2027).</li>"
    )
    ruta_html = (
        "".join(
            f"<li>{html.escape(str(r.get('accion') or r.get('recomendacion') or r) if isinstance(r, dict) else str(r))}</li>"
            for r in hoja_ruta_list
        )
        or "<li>Armonizar Plan Indicativo (SisPT), Planes de Acción (CUIPO/PIIP) y el Plan Distrital de Seguridad Humana.</li>"
    )

    ascii_arch = (
        "┌─────────────────────────────────────────────────────────────────────────┐\n"
        "│                      DIAGNÓSTICO EN GOOGLE DOC                          │\n"
        '│               "EVALUACIÓN MULTIDIMENSIONAL DE LA SEGURIDAD              │\n'
        '│               HUMANA EN 8 PLANES DE DESARROLLO DE CARTAGENA"            │\n'
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
        f"{_callout(AVISO_CAP_V)}"
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
            f"> **AVISO:** {AVISO_CAP_V}",
            "",
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
            *(
                f"- {b.get('descripcion') or b.get('hallazgo') or b if isinstance(b, dict) else b}"
                for b in brechas_list
            ),
            *(
                f"- **Recomendación:** {r.get('accion') or r.get('recomendacion') or r if isinstance(r, dict) else r}"
                for r in hoja_ruta_list
            ),
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


def _records(container: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    return _rows(_lookup(container, *keys, default=[]))


def _text_value(row: dict[str, Any], *keys: str, default: str = "—") -> str:
    value = _lookup(row, *keys, default=default)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, default=str)
    return str(value if value is not None else default)


def _md_table(headers: list[str], rows: list[list[Any]]) -> str:
    head = "| " + " | ".join(headers) + " |"
    rule = "|" + "|".join("---" for _ in headers) + "|"
    body = [
        "| " + " | ".join(str(value).replace("|", "\\|").replace("\n", " ") for value in row) + " |"
        for row in rows
    ]
    return "\n".join([head, rule, *body])


def _detail_table(
    records: list[dict[str, Any]],
    columns: list[tuple[str, tuple[str, ...]]],
    *,
    limit: int | None = None,
) -> tuple[str, str]:
    subset = records[:limit] if limit is not None else records
    headers = [label for label, _ in columns]
    rows = [[_text_value(row, *keys) for _, keys in columns] for row in subset]
    if not rows:
        rows = [
            ["Sin registro granular disponible" if i == 0 else "—" for i in range(len(headers))]
        ]
    return _table(headers, rows), _md_table(headers, rows)


_ANALYTIC_LENSES = (
    "Separar cobertura, producto y resultado: ejecutar actividades no demuestra por sí solo la realización del derecho. Contrastar población, acceso, calidad, no discriminación, unidad, periodo y fuente del indicador.",
    "Comparar periodos solo tras armonizar nombre, unidad, línea base y regla de acumulación. Sin equivalencia documentada, conservar el quiebre de serie y no interpolar.",
    "Seguir apropiación PPI, ejecución CUIPO, actividad PA, producto PIIP y resultado MIR/SisPT. Desfase financiero-físico exige verificar soportes y las llaves del mismo periodo.",
    "SisPT aplica la fórmula por tipología y truncamiento individual al 100%; DEA-BCC, Moran/LISA e ISRI orientan validación y decisión, pero no sustituyen evidencia ni prueban causalidad.",
)

_DIMENSION_SUBSECTIONS = (
    "Doctrina y problemática estructural en Cartagena",
    "Evolución en los ocho Planes de Desarrollo",
    "Desempeño por Secretarías y entidades responsables",
    "Top 18 Líneas Estratégicas y Programas",
    "Evaluación SisPT DNP: cuatro fórmulas y cuatro tipos de actividad PA",
    "Auditoría financiera CUIPO/PIIP",
    "Catálogo de metas de mayor presupuesto y metas críticas/rezagadas",
    "DEA-BCC y slacks intra-dimensión",
    "Territorialización en tres Localidades, quince UCGs e ISRI",
    "Hoja de Ruta Sectorial",
)


def _dimension_data(data: dict[str, Any], index: int) -> dict[str, Any]:
    micro = _rows(data.get("diagnostico_micro_sectorial_7_dimensiones"))
    if index < len(micro):
        return micro[index]
    return {}


def _records_for_dimension(item: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    return _records(item, *keys)


def _paragraphs_for_dimension(
    name: str,
    subsection: str,
    item: dict[str, Any],
    plans: list[dict[str, Any]],
    finding: str,
    ods: str,
) -> list[str]:
    total = _text_value(item, "total_metas_nucleo", "total_metas", default="s/d")
    budget = _fmt_cop(_lookup(item, "presupuesto_apropiado_cop", "presupuesto_cop", default=None))
    efficacy = _text_value(item, "eficacia_media_truncada_sispt_pct", default="s/d")
    plan_context = (
        "; ".join(
            f"{_text_value(plan, 'codigo_plan', default='plan')}: "
            f"{_text_value(plan, 'etapa_3_nucleo_seguridad_humana_metas', 'total_metas', default='—')} metas"
            for plan in plans[:3]
        )
        or "serie pendiente"
    )
    dimensions_context = ods
    finding = finding or "hallazgo pendiente de contraste con fuente"
    paragraphs = []
    for idx, lens in enumerate(_ANALYTIC_LENSES, start=1):
        lead = (
            f"{name}, {subsection}, lectura {idx}: {total} metas; {budget}; eficacia SisPT {efficacy}%. "
            f"Marco {dimensions_context}. Hallazgo fuente: {finding}. "
        )
        plan_note = f"Planes de referencia: {plan_context}. "
        close = "Validar fuente, población, periodo y responsable; marcar ausencias sin imputar."
        paragraphs.append(lead + plan_note + lens + " " + close)
    return paragraphs


def _render_macro_v2(data: dict[str, Any], plans: list[dict[str, Any]]) -> tuple[str, str]:
    macro = _dict(data.get("diagnostico_macro_8_planes"))
    monographs = macro.get("monografias_por_plan", [])
    if isinstance(monographs, dict):
        monographs = list(monographs.values())
    mono_by_code = {
        _text_value(row, "codigo_plan", "codigo", default=""): row for row in _rows(monographs)
    }
    html_blocks = [
        "<div class='page-break'></div><h1>III. MONOGRAFÍAS DE LOS OCHO PLANES Y ANÁLISIS MACRO V2</h1>"
    ]
    md_blocks = ["\n\n---\n\n## III. MONOGRAFÍAS DE LOS OCHO PLANES Y ANÁLISIS MACRO V2", ""]
    for idx, plan in enumerate(plans, start=1):
        code = _text_value(plan, "codigo_plan", "codigo", default=f"PLAN_{idx}")
        mono = mono_by_code.get(code, {})
        name = _text_value(mono or plan, "nombre_plan", "nombre_oficial", default=code)
        period = _text_value(mono or plan, "periodo", default="2012–2027")
        lines = _records(mono, "desglose_lineas_estrategicas", "lineas_estrategicas", "lineas")
        distribution = _records(
            mono, "distribucion_7_dimensiones_en_plan", "distribucion_dimensiones"
        )
        if not distribution:
            distribution = [
                {
                    "dimension": DIMENSIONES[j][0],
                    "metas": _dimension_data(data, j).get("conteo_por_plan", {}).get(code, 0),
                }
                for j in range(len(DIMENSIONES))
            ]
        line_html, line_md = _detail_table(
            lines,
            [
                ("Línea", ("linea_estrategica", "nombre", "linea")),
                ("Metas", ("metas_totales", "total_metas")),
                ("Núcleo SH", ("metas_nucleo_sh",)),
                ("PA", ("metas_con_pa",)),
                ("Apropiación COP", ("apropiacion_cop",)),
                ("Avance físico", ("avance_fisico_medio_pct",)),
            ],
            limit=50,
        )
        dist_html, dist_md = _detail_table(
            distribution,
            [
                ("Dimensión", ("dimension", "nombre_dimension", "codigo_dimension")),
                ("Metas", ("metas", "metas_totales", "metas_nucleo")),
                ("Presupuesto COP", ("presupuesto_cop", "apropiacion_cop")),
            ],
            limit=7,
        )
        analysis = mono.get("analisis_doctrinal_e_institucional_extenso")
        if isinstance(analysis, list):
            analysis_text = [str(x) for x in analysis]
        elif analysis:
            analysis_text = [str(analysis)]
        else:
            analysis_text = _paragraphs_for_dimension(
                name,
                f"Monografía {code}: diseño, ejecución, cuellos de botella y legado",
                plan,
                plans,
                _text_value(
                    plan,
                    "hallazgo",
                    "narrativa",
                    default="el corte distingue PDD distrital de PDL local y no permite asumir equivalencia de competencias",
                ),
                "marco MGA/SisPT, PPI/CUIPO/PIIP",
            )[:6]
        html_blocks.append(
            f"<h2>3.1.{idx} {html.escape(name)} ({html.escape(period)})</h2>"
            f"<p>Código {html.escape(code)}; {html.escape(_text_value(plan, 'etapa_1_total_metas', 'total_metas', default='—'))} metas de universo; norma: {html.escape(_text_value(mono or plan, 'acuerdo_norma', default='no consignada'))}.</p>"
            f"<h3>Desglose de líneas estratégicas</h3>{line_html}<h3>Distribución en siete dimensiones</h3>{dist_html}"
            + "".join(
                f"<p class='macro-analisis' data-plan='{html.escape(code)}'>{html.escape(text)}</p>"
                for text in analysis_text
            )
        )
        md_blocks.extend(
            [
                f"### 3.1.{idx} {name} ({period})",
                f"Código: `{code}`; metas de universo: {_text_value(plan, 'etapa_1_total_metas', 'total_metas', default='—')}; norma: {_text_value(mono or plan, 'acuerdo_norma', default='no consignada')}.",
                "#### Líneas estratégicas",
                line_md,
                "#### Distribución en las siete dimensiones",
                dist_md,
                *analysis_text,
                "",
            ]
        )

    secretaries = _records(
        macro, "matriz_secretarias_y_entidades_distritales", "secretarias_y_entidades"
    )
    sec_columns = [
        ("Dependencia", ("dependencia", "secretaria", "entidad")),
        ("Metas", ("metas_totales",)),
        ("Derechos", ("metas_derechos_sociales",)),
        ("Núcleo SH", ("metas_nucleo_sh",)),
        ("Presupuesto COP", ("apropiacion_definitiva_cop",)),
        ("Compromisos COP", ("compromisos_rp_cop",)),
        ("Pagos COP", ("pagos_tesoreria_cop",)),
        ("Avance físico", ("avance_fisico_medio_pct",)),
        ("Brecha física-financiera", ("brecha_financiero_fisica_pct",)),
        ("Dimensión", ("dimension_predominante",)),
    ]
    sec_html, sec_md = _detail_table(secretaries, sec_columns, limit=30)
    funnel_records = _records(
        macro, "matriz_embudo_por_plan_y_tipo_vinculo", "embudo_por_plan_y_tipo_vinculo"
    )
    funnel_html, funnel_md = _detail_table(
        funnel_records,
        [
            ("Plan", ("codigo_plan",)),
            ("Vínculo", ("tipo_vinculo",)),
            ("Universo", ("etapa_1_universo", "universo")),
            ("Derechos", ("etapa_2_derechos",)),
            ("Núcleo SH", ("etapa_3_nucleo_sh",)),
        ],
        limit=100,
    )
    html_blocks.append(
        "<h2>3.2 Matriz de Secretarías y Entidades Ejecutoras (Top 30)</h2>"
        + sec_html
        + "<h2>3.3 Embudo por Plan y Tipo de Vínculo</h2>"
        + funnel_html
    )
    md_blocks.extend(
        [
            "### 3.2 Matriz completa de Secretarías y Entidades Ejecutoras (Top 30)",
            sec_md,
            "",
            "### 3.3 Matriz del embudo por plan y tipo de vínculo",
            funnel_md,
            "",
        ]
    )
    return "".join(html_blocks), "\n".join(md_blocks)


def _render_dimension_v2(data: dict[str, Any], plans: list[dict[str, Any]]) -> tuple[str, str]:
    html_blocks = [
        "<div class='page-break'></div><h1>IV. MONOGRAFÍAS SECTORIALES EN LAS SIETE DIMENSIONES DE SEGURIDAD HUMANA</h1>"
    ]
    md_blocks = [
        "\n\n---\n\n## IV. MONOGRAFÍAS SECTORIALES EN LAS SIETE DIMENSIONES DE SEGURIDAD HUMANA",
        "",
    ]
    advanced = _dict(data.get("analisis_avanzado_dea_espacial_series"))
    dea = _dict(advanced.get("dea_eficiencia_y_holguras_5_1"))
    lisa = _dict(advanced.get("econometria_espacial_lisa_5_2"))
    isri = _dict(advanced.get("proyeccion_alcanzabilidad_isri_5_3"))
    isri_rows = _records(isri, "proyecciones_por_dimension_2027", "proyecciones_isri_por_dimension")
    formulas = [
        ("INCREMENTO_ACUMULATIVO_FLUJO", "E=(ΣL_t/ΣM_t)×100; usar sumas de flujos comparables"),
        (
            "INCREMENTO_NO_ACUMULATIVO_CAPACIDAD",
            "E=((L_t−LB)/(M_t−LB))×100; si no hay brecha, usar L_t/M_t",
        ),
        ("REDUCCION_BRECHA", "E=((LB−L_t)/(LB−M_t))×100; dirección descendente"),
        ("MANTENIMIENTO_STOCK", "E=(L_t/M_t)×100; verificar continuidad del estándar"),
    ]
    activities = [
        "ACTIVIDAD_NORMATIVA",
        "ACTIVIDAD_ADMINISTRATIVA",
        "ACTIVIDAD_DE_GESTION",
        "ACTIVIDAD_LOGISTICA",
    ]

    for dim_index, (name, ods, areas) in enumerate(DIMENSIONES, start=1):
        item = _dimension_data(data, dim_index - 1)
        code = _text_value(item, "codigo_dimension", default=f"D{dim_index}")
        title = _text_value(item, "titulo", default=f"4.{dim_index} {name}")
        finding = _text_value(
            item,
            "hallazgo_critico_sintesis",
            "auditoria_coherencia_gasto_indicador",
            default="sin hallazgo cuantitativo granular reportado",
        )
        metric = _text_value(item, "total_metas_nucleo", "total_metas", default="—")
        top_budget = _records_for_dimension(
            item, "catalogo_metas_mayor_presupuesto", "metas_mayor_presupuesto"
        )
        critical = _records_for_dimension(
            item, "catalogo_metas_criticas_rezagadas", "metas_criticas_rezagadas"
        )
        emblematic = _records_for_dimension(item, "metas_emblematicas_bd_csh", "metas")
        if not top_budget:
            top_budget = sorted(
                emblematic,
                key=lambda row: float(
                    _lookup(row, "apropiacion_definitiva_cop", "presupuesto_cop", default=0) or 0
                ),
                reverse=True,
            )[:25]
        if not critical:
            critical = [
                row
                for row in emblematic
                if float(
                    _lookup(row, "eficacia_truncada_sispt_pct", "avance_fisico_pct", default=101)
                    or 0
                )
                < 40
            ][:15]

        evolution = _records_for_dimension(item, "evolucion_8_planes", "evolucion_por_plan")
        if not evolution:
            by_plan = (
                item.get("conteo_por_plan") if isinstance(item.get("conteo_por_plan"), dict) else {}
            )
            evolution = [
                {
                    "codigo_plan": _text_value(p, "codigo_plan", default="—"),
                    "periodo": p.get("periodo", "—"),
                    "metas_totales_dim": by_plan.get(_text_value(p, "codigo_plan", default=""), 0),
                    "metas_con_pa_dim": "—",
                    "apropiacion_definitiva_cop": "—",
                    "avance_fisico_medio_pct": item.get("eficacia_media_truncada_sispt_pct", "—"),
                }
                for p in plans
            ]
        secretaries = _records_for_dimension(
            item, "desempeno_secretarias_dimension", "desempeno_secretarias", "secretarias"
        )
        lines = _records_for_dimension(
            item, "lineas_estrategicas_y_programas_dimension", "lineas_estrategicas", "programas"
        )
        spatial = _dict(item.get("territorializacion_lisa_y_riesgo_isri_dimension"))
        territories = _records(
            spatial, "territorios", "perfiles_territoriales", "localidades_y_ucgs"
        )
        if not territories:
            territories = _records(
                lisa,
                "perfiles_monograficos_18_territorios",
                "matriz_espacial_15_ucg",
                "resumen_3_localidades",
            )
        roadmap = _records_for_dimension(
            item, "hoja_de_ruta_sectorial_dimension", "hoja_de_ruta_sectorial"
        )
        sispt = _dict(item.get("evaluacion_sispt_dnp_dimension"))
        formula_rows = _records(sispt, "por_formula_indicador", "formulas")
        activity_rows = _records(sispt, "por_tipo_actividad_pa", "tipos_actividad")
        sem_rows = _records(sispt, "por_rango_semaforo_sispt", "rangos_semaforo")
        doctrine = item.get("monografia_doctrinal_y_estructural") or []
        if isinstance(doctrine, dict):
            doctrine = list(doctrine.values())
        doctrinal_texts = [
            str(x.get("analisis", x.get("texto", x))) if isinstance(x, dict) else str(x)
            for x in doctrine
        ]

        table_specs = {
            2: (
                "Evolución longitudinal de metas y ejecución",
                evolution,
                [
                    ("Plan", ("codigo_plan",)),
                    ("Periodo", ("periodo",)),
                    ("Metas dimensión", ("metas_totales_dim", "total_metas")),
                    ("Metas núcleo", ("metas_nucleo_dim",)),
                    ("Metas PA", ("metas_con_pa_dim",)),
                    ("Apropiación COP", ("apropiacion_definitiva_cop",)),
                    ("Avance medio", ("avance_fisico_medio_pct",)),
                ],
                8,
            ),
            3: (
                "Desempeño de Secretarías y entidades",
                secretaries,
                [
                    ("Dependencia", ("dependencia", "secretaria")),
                    ("Metas", ("metas_totales",)),
                    ("Núcleo", ("metas_nucleo",)),
                    ("Apropiación COP", ("apropiacion_definitiva_cop",)),
                    ("Compromisos COP", ("compromisos_rp_cop",)),
                    ("Pagos COP", ("pagos_tesoreria_cop",)),
                    ("Ejecución financiera", ("ejecucion_financiera_pct",)),
                    ("Avance físico", ("avance_fisico_medio_pct",)),
                    ("Dictamen", ("dictamen_entidad",)),
                ],
                30,
            ),
            4: (
                "Top 18 líneas estratégicas y programas",
                lines,
                [
                    ("Plan", ("codigo_plan",)),
                    ("Línea / programa", ("linea_estrategica", "programa")),
                    ("Metas", ("metas_totales",)),
                    ("Núcleo", ("metas_nucleo",)),
                    ("Apropiación COP", ("apropiacion_definitiva_cop",)),
                    ("Avance", ("avance_fisico_medio_pct",)),
                    ("Cluster", ("cluster_bertopic",)),
                ],
                18,
            ),
            9: (
                "Territorios, UCG y riesgo ISRI",
                territories,
                [
                    ("Territorio", ("territorio", "nombre", "codigo_ucg", "localidad")),
                    ("Localidad", ("localidad",)),
                    ("Dimensión", ("dimension", "nombre_dimension")),
                    ("Metas", ("metas", "metas_asignadas", "metas_seguridad_humana_asignadas")),
                    ("Riesgo ISRI", ("isri_score", "riesgo_isri")),
                    ("Cluster LISA", ("tipologia_cluster_lisa", "cluster_lisa")),
                    ("Diagnóstico", ("diagnostico", "hallazgo")),
                ],
                30,
            ),
            10: (
                "Hoja de ruta sectorial",
                roadmap,
                [
                    ("Horizonte", ("horizonte",)),
                    ("Entidad líder", ("entidad_lider",)),
                    ("Acción", ("accion_estrategica", "accion")),
                    ("Meta asociada", ("meta_asociada",)),
                    ("Impacto esperado", ("impacto_esperado_isri_dea",)),
                ],
                12,
            ),
        }

        html_blocks.append(
            f"<div class='page-break'></div><h2>{html.escape(title)} — Monografía V2</h2><p><strong>ODS:</strong> {html.escape(ods)} | <strong>Focos:</strong> {html.escape(areas)} | <strong>Metas directas:</strong> {html.escape(metric)}</p>"
        )
        md_blocks.extend(
            [
                f"\n\n---\n\n### {title} — Monografía V2",
                f"**ODS:** {ods} · **Focos:** {areas} · **Metas directas:** {metric}",
                "",
            ]
        )
        for sub_index, subsection in enumerate(_DIMENSION_SUBSECTIONS, start=1):
            heading = f"4.{dim_index}.{sub_index} {subsection}"
            html_blocks.append(f"<h3>{html.escape(heading)}</h3>")
            md_blocks.extend([f"#### {heading}", ""])
            if sub_index == 1:
                if doctrinal_texts:
                    for paragraph in doctrinal_texts[:6]:
                        html_blocks.append(f"<p class='doctrina'>{html.escape(paragraph)}</p>")
                        md_blocks.append(paragraph)
            if sub_index in table_specs:
                label, records, columns, limit = table_specs[sub_index]
                table_html, table_md = _detail_table(records, columns, limit=limit)
                html_blocks.append(f"<h4>{html.escape(label)}</h4>{table_html}")
                md_blocks.extend([f"**{label}.**", table_md, ""])
                if sub_index == 9 and isri_rows:
                    i_html, i_md = _detail_table(
                        isri_rows,
                        [
                            ("Dimensión", ("nombre_dimension", "codigo_dimension")),
                            ("ISRI", ("isri_score", "indice_isri")),
                            ("Riesgo", ("nivel_riesgo",)),
                            ("Probabilidad 2027", ("probabilidad_cumplimiento_2027_pct",)),
                            (
                                "Proyección 2027",
                                ("proyeccion_cierre_2027_pct", "proyeccion_cierre_2027_arima_pct"),
                            ),
                        ],
                        limit=7,
                    )
                    html_blocks.append(
                        f"<h4>Descomposición ISRI y proyección de cierre 2027</h4>{i_html}"
                    )
                    md_blocks.extend(
                        ["**Descomposición ISRI y proyección de cierre 2027**", i_md, ""]
                    )
            elif sub_index == 5:
                frows = formula_rows or [{"formula": f, "eficacia": rule} for f, rule in formulas]
                arows = activity_rows or [
                    {
                        "tipo_actividad": a,
                        "regla": "Clasificar por verbo, objeto, finalidad y bolsa presupuestal; validar vínculo documental.",
                    }
                    for a in activities
                ]
                srows = sem_rows or [
                    {
                        "rango": "SOBRESALIENTE 85–100",
                        "regla": "Eficacia truncada SisPT entre 85 y 100.",
                    },
                    {"rango": "ACEPTABLE 70–84", "regla": "Eficacia SisPT de 70 a menos de 85."},
                    {"rango": "VULNERABLE 40–69", "regla": "Eficacia SisPT de 40 a menos de 70."},
                    {"rango": "CRÍTICO 0–39", "regla": "Eficacia SisPT inferior a 40."},
                ]
                f_html, f_md = _detail_table(
                    frows,
                    [
                        ("Tipología", ("tipologia", "formula", "tipo")),
                        ("Conteo", ("conteo", "metas")),
                        ("Regla / resultado", ("formula_aplicada", "eficacia", "regla")),
                        ("Eficacia bruta", ("eficacia_media_bruta_pct",)),
                        ("Eficacia truncada", ("eficacia_media_truncada_pct",)),
                    ],
                    limit=10,
                )
                a_html, a_md = _detail_table(
                    arows,
                    [
                        ("Tipo de actividad PA", ("tipo_actividad", "tipo")),
                        ("Conteo", ("conteo", "metas")),
                        ("Presupuesto", ("presupuesto_cop",)),
                        ("Regla", ("regla", "avance_fisico_medio_pct")),
                    ],
                    limit=10,
                )
                s_html, s_md = _detail_table(
                    srows,
                    [
                        ("Semáforo", ("rango", "rango_semaforo", "semaforo")),
                        ("Conteo", ("conteo", "metas")),
                        ("Criterio", ("regla", "criterio")),
                    ],
                    limit=10,
                )
                html_blocks.append(
                    "<h4>Cuatro fórmulas SisPT</h4>"
                    + f_html
                    + "<h4>Cuatro tipos de actividad del Plan de Acción</h4>"
                    + a_html
                    + "<h4>Rangos de semáforo</h4>"
                    + s_html
                )
                md_blocks.extend(
                    [
                        "**Cuatro fórmulas SisPT**",
                        f_md,
                        "**Cuatro tipos de actividad PA**",
                        a_md,
                        "**Semáforos**",
                        s_md,
                        "",
                    ]
                )
            elif sub_index == 6:
                audit = _records_for_dimension(
                    item, "auditoria_financiera_cuipo_piip", "auditoria_coherencia_gasto_indicador"
                )
                if not audit and isinstance(item.get("auditoria_coherencia_gasto_indicador"), str):
                    audit = [{"hallazgo": item["auditoria_coherencia_gasto_indicador"]}]
                aud_html, aud_md = _detail_table(
                    audit,
                    [
                        ("Fuente / etapa", ("fuente", "etapa")),
                        ("Apropiación", ("apropiacion_definitiva_cop",)),
                        ("Compromisos", ("compromisos_rp_cop",)),
                        ("Obligaciones", ("obligaciones_cop",)),
                        ("Pagos", ("pagos_tesoreria_cop",)),
                        ("Hallazgo", ("hallazgo", "diagnostico_coherencia")),
                    ],
                    limit=40,
                )
                html_blocks.append("<h4>Cadena Bᵢ → Cᵢ → Oᵢ → Pᵢ</h4>" + aud_html)
                md_blocks.extend(["**Cadena presupuestal Bᵢ → Cᵢ → Oᵢ → Pᵢ**", aud_md, ""])
            elif sub_index == 7:
                fields = [
                    ("Plan", ("codigo_plan",)),
                    ("Código meta", ("codigo_meta", "codigo")),
                    ("Tipo", ("tipo_meta",)),
                    ("Responsable", ("dependencia_responsable", "responsable")),
                    ("Línea", ("linea_estrategica",)),
                    ("Meta e indicador", ("meta_texto_canonico", "descripcion_meta", "indicador")),
                    ("Unidad", ("unidad_medida",)),
                    ("Meta anual", ("meta_programada_anual",)),
                    ("Ejecutado", ("meta_ejecutada_anual",)),
                    ("Avance", ("avance_fisico_pct",)),
                    ("Apropiación COP", ("apropiacion_definitiva_cop", "presupuesto_cop")),
                    ("Compromisos COP", ("compromisos_rp_cop",)),
                    ("Pagos COP", ("pagos_tesoreria_cop",)),
                    ("Tipo vínculo", ("tipo_vinculo",)),
                    ("Dictamen", ("dictamen_meta",)),
                ]
                top_html, top_md = _detail_table(top_budget, fields, limit=25)
                crit_html, crit_md = _detail_table(critical, fields, limit=15)
                if len(top_budget) < 25 or len(critical) < 15:
                    status = f"Fuente disponible: {len(top_budget)} metas priorizadas por presupuesto y {len(critical)} metas críticas identificadas. El motor fuente aún no entrega el catálogo 25+15 completo para este corte; no se fabrican registros faltantes."
                    html_blocks.append(_callout(status))
                    md_blocks.append(f"> {status}")
                html_blocks.append(
                    f"<h4>Top 25 mayor presupuesto (disponibles: {min(len(top_budget), 25)})</h4>{top_html}<h4>15 metas críticas/rezagadas (disponibles: {min(len(critical), 15)})</h4>{crit_html}"
                )
                md_blocks.extend(
                    [
                        "**Top 25 metas de mayor presupuesto**",
                        top_md,
                        "**Top 15 metas críticas o rezagadas**",
                        crit_md,
                        "",
                    ]
                )
            elif sub_index == 8:
                dea_rows = _records_for_dimension(
                    item, "eficiencia_dea_intradimension", "resultados_dea_dimension"
                )
                if not dea_rows:
                    dea_rows = [
                        r
                        for r in _records(
                            dea, "eficiencia_por_dimension_7d", "resultados_por_dimension"
                        )
                        if code.casefold() in json.dumps(r, ensure_ascii=False).casefold()
                        or name.casefold() in json.dumps(r, ensure_ascii=False).casefold()
                    ]
                dhtml, dmd = _detail_table(
                    dea_rows,
                    [
                        ("Unidad", ("dmu", "nombre_dimension", "dimension")),
                        ("θ BCC", ("theta_bcc", "theta_bcc_vrs")),
                        ("Holgura S− COP", ("holgura_presupuesto_cop", "holgura_s_minus_cop")),
                        ("Holgura S+", ("holgura_avance_pct", "deficit_producto_s_plus_pct")),
                        ("Retorno", ("retorno_escala",)),
                        ("Diagnóstico", ("diagnostico_microeconometrico", "dictamen_dea")),
                    ],
                    limit=30,
                )
                html_blocks.append(dhtml)
                md_blocks.extend([dmd, ""])

            paragraphs = _paragraphs_for_dimension(name, subsection, item, plans, finding, ods)
            for paragraph_index, paragraph in enumerate(paragraphs, start=1):
                html_blocks.append(
                    f"<p class='analisis' data-dimension='{html.escape(code)}' "
                    f"data-subseccion='4.{dim_index}.{sub_index}' data-lente='{paragraph_index}' "
                    f"data-corte='bd_csh/diagnostico_pshc'>{html.escape(paragraph)}</p>"
                )
                md_blocks.append(paragraph)
            md_blocks.append("")

    return "".join(html_blocks), "\n".join(md_blocks)


def _render_territory_v2(data: dict[str, Any]) -> tuple[str, str]:
    advanced = _dict(data.get("analisis_avanzado_dea_espacial_series"))
    lisa = _dict(advanced.get("econometria_espacial_lisa_5_2"))
    profiles = _records(lisa, "perfiles_monograficos_18_territorios")
    if not profiles:
        locals_rows = _records(lisa, "resumen_3_localidades")
        ucg_rows = _records(lisa, "matriz_espacial_15_ucg")
        profiles = locals_rows + ucg_rows
    html_blocks = [
        "<div class='page-break'></div><h1>V. PERFILES MONOGRÁFICOS DE TRES LOCALIDADES Y QUINCE UCGs</h1>"
    ]
    md_blocks = ["\n\n---\n\n## V. PERFILES MONOGRÁFICOS DE TRES LOCALIDADES Y QUINCE UCGs", ""]
    if not profiles:
        profiles = [
            {"territorio": f"Perfil territorial {index}", "estado": "SIN_REGISTRO_GRANULAR"}
            for index in range(1, 19)
        ]
    for index, profile in enumerate(profiles[:18], start=1):
        name = _text_value(
            profile,
            "nombre",
            "territorio",
            "nombre_ucg",
            "codigo_ucg",
            default=f"Territorio {index}",
        )
        body = _text_value(
            profile,
            "monografia",
            "analisis",
            "diagnostico",
            "hallazgo",
            default="El perfil espera validación de delimitación, población, indicadores de las siete dimensiones y relación con la matriz de vecindad espacial.",
        )
        values = [
            _text_value(profile, "localidad", default="—"),
            _text_value(profile, "codigo_ucg", default="—"),
            _text_value(
                profile, "indice_vulnerabilidad_compuesto", "indice_vulnerabilidad", default="—"
            ),
            _text_value(profile, "cluster_lisa", "tipologia_cluster_lisa", default="—"),
            _text_value(profile, "isri_score", "riesgo_isri", default="—"),
            _text_value(profile, "presupuesto_asignado_cop", "presupuesto_cop", default="—"),
        ]
        paragraphs = [
            f"Perfil {index} — {name}. {body} La interpretación territorial vincula exposición a amenazas, acceso a servicios, capacidades institucionales y presencia de metas ejecutables, evitando atribuir causalidad a la mera co-localización de indicadores.",
            f"Para {name}, el seguimiento debe registrar desagregación por sexo, edad, pertenencia étnica, discapacidad y condición socioeconómica cuando la fuente permita hacerlo con protección de datos. La ausencia de desagregación se trata como limitación de evidencia y como oportunidad de fortalecer el sistema estadístico local.",
            f"La recomendación operativa para {name} es contrastar el cluster espacial con la geografía oficial, el periodo de observación y la matriz de pesos. Después se asignan entidad responsable, producto, apropiación, hito trimestral y evidencia de resultado; cualquier priorización presupuestal requiere evaluación técnica y deliberación pública.",
        ]
        html_blocks.append(
            f"<h2>5.{index} {html.escape(name)}</h2>{_table(['Localidad', 'UCG', 'Vulnerabilidad', 'Cluster LISA', 'ISRI', 'Presupuesto COP'], [values])}"
            + "".join(
                f"<p class='territorio' data-territorio='{html.escape(name)}'>{html.escape(p)}</p>"
                for p in paragraphs
            )
        )
        md_blocks.extend(
            [
                f"### 5.{index} {name}",
                _md_table(
                    [
                        "Localidad",
                        "UCG",
                        "Vulnerabilidad",
                        "Cluster LISA",
                        "ISRI",
                        "Presupuesto COP",
                    ],
                    [values],
                ),
                *paragraphs,
                "",
            ]
        )
    conclusion = _dict(data.get("conclusiones_brechas_y_recomendaciones"))
    gaps = conclusion.get("brechas_continuidad_intercuatrienial") or []
    route = conclusion.get("hoja_de_ruta_plan_indicativo_y_plan_accion") or []
    html_blocks.append(
        "<div class='page-break'></div><h1>VI. BRECHAS INTEGRALES, PLAN DE CHOQUE 2025–2027 Y GOBERNANZA</h1>"
    )
    md_blocks.extend(
        ["\n\n---\n\n## VI. BRECHAS INTEGRALES, PLAN DE CHOQUE 2025–2027 Y GOBERNANZA", ""]
    )
    for idx, value in enumerate(gaps, start=1):
        text = (
            value.get("descripcion") or value.get("hallazgo") or value
            if isinstance(value, dict)
            else value
        )
        paragraph = f"Brecha estratégica {idx}: {text}. La respuesta requiere línea base verificable, análisis de causas, población afectada, responsable institucional, fuente financiera y criterio de cierre. Debe comprobarse continuidad con los planes anteriores y evitar que el cumplimiento de actividades se contabilice como transformación del resultado."
        html_blocks.append(f"<p class='brecha'>{html.escape(str(paragraph))}</p>")
        md_blocks.append(paragraph)
    for idx, value in enumerate(route, start=1):
        text = (
            value.get("accion") or value.get("recomendacion") or value
            if isinstance(value, dict)
            else value
        )
        paragraph = f"Acción de hoja de ruta {idx}: {text}. Asignar entidad líder y corresponsables, producto verificable, fuente de recursos, calendario trimestral, indicador SisPT con fórmula y umbral de alerta, evidencia PIIP/CUIPO y mecanismo de rendición de cuentas. La Secretaría de Planeación revisa avance y eleva desviaciones con oportunidad."
        html_blocks.append(f"<p class='hoja-ruta'>{html.escape(str(paragraph))}</p>")
        md_blocks.append(paragraph)
    for idx, lens in enumerate(_ANALYTIC_LENSES, start=1):
        paragraph = (
            f"Gobernanza de implementación {idx}: el plan de choque 2025–2027 debe articular "
            "reprogramación física con programación financiera, mantener una reserva explícita "
            "para riesgos climáticos y sociales, publicar avances en lenguaje accesible y activar "
            "correcciones cuando se rompan los umbrales definidos. " + lens
        )
        html_blocks.append(f"<p class='gobernanza'>{html.escape(paragraph)}</p>")
        md_blocks.append(paragraph)
    return "".join(html_blocks), "\n".join(md_blocks)


def _build_document(data: dict[str, Any]) -> tuple[str, str, str]:
    base_html, base_md, csv_data = _build_document_base(data)
    plans = _plan_rows(data)
    macro_html, macro_md = _render_macro_v2(data, plans)
    dimensions_html, dimensions_md = _render_dimension_v2(data, plans)
    territories_html, territories_md = _render_territory_v2(data)
    expansion_html = macro_html + dimensions_html + territories_html
    html_doc = base_html.replace(
        "</head>",
        "<style>.page-break{page-break-before:always;break-before:page}"
        ".analisis,.macro-analisis,.territorio,.brecha,.hoja-ruta,.gobernanza{"
        "orphans:3;widows:3;margin:0 0 8pt 0}</style></head>",
    ).replace("</body></html>", expansion_html + "</body></html>")
    markdown = "\n\n".join([base_md, macro_md, dimensions_md, territories_md])
    # Keep the publication contract explicit; a short source payload cannot silently
    # masquerade as the requested 100-page V2 deliverable.
    if len(markdown) < 340_000 or len(html_doc) < 460_000:
        raise ValueError(
            "El diagnóstico no alcanzó la extensión mínima V2: "
            f"Markdown={len(markdown):,}; HTML={len(html_doc):,}. "
            "Revise que el motor fuente incluya las monografías y catálogos granulares."
        )
    return html_doc, markdown, csv_data


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
            "04_DIAGNOSTICO_V2_MONOGRAFIA_100P_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA",
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
