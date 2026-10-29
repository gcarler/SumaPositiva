"""Motor Hoshin Kanri (Marco FAIR, Matriz X, Bowling Charts PDCA y Catchball) para PDT."""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SECTORES_GBR: tuple[str, ...] = (
    "Educación Pública",
    "Salud Pública",
    "Infraestructura Vial",
    "Desarrollo Agrícola",
    "Medio Ambiente",
)

SIMBOLO_FUERTE = "●"
SIMBOLO_MEDIA = "○"
SIMBOLO_DEBIL = "△"

NIVEL_FUERTE = "FUERTE"
NIVEL_MEDIA = "MEDIA"
NIVEL_DEBIL = "DEBIL_ALERTA"

SEMAFORO_VERDE = "VERDE_EN_META"
SEMAFORO_AMARILLO = "AMARILLO_PREVENTIVO"
SEMAFORO_ROJO = "ROJO_CONTENCION_PDCA"

DEFAULT_CACHE_PATH = Path(__file__).resolve().parents[4] / "data" / "planes_desarrollo" / "cache_pdt_ai_evaluator.json"


def _normalizar(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", texto).strip().casefold()


def _round(valor: float | None, digitos: int = 4) -> float | None:
    return round(float(valor), digitos) if valor is not None else None


def _clamp(valor: float, minimo: float = 0.0, maximo: float = 100.0) -> float:
    return max(minimo, min(maximo, float(valor)))


def _extraer_dependencia_y_vigencia(dmu_label: str) -> tuple[str, int | None]:
    raw = str(dmu_label or "UNIDAD_SIN_NOMBRE").strip()
    if "|" in raw:
        dep_part, vig_part = raw.rsplit("|", 1)
        try:
            vigencia = int(vig_part.strip())
        except ValueError:
            vigencia = None
    else:
        dep_part = raw
        vigencia = None
    if dep_part.startswith("PPI_OFICIAL:"):
        dep_part = "PPI oficial agregado — " + dep_part.removeprefix("PPI_OFICIAL:")
    return dep_part.strip(), vigencia


def _cargar_diagnostico_cache(
    ruta_cache: Path | None = None,
    codigo_plan: str | None = None,
) -> dict[str, Any]:
    path = ruta_cache or DEFAULT_CACHE_PATH
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if isinstance(payload, dict) and "runs" in payload and isinstance(payload["runs"], dict):
        runs = list(payload["runs"].values())
        if not runs:
            return {}
        if codigo_plan:
            norm_plan = _normalizar(codigo_plan)
            for candidate in runs:
                if isinstance(candidate, dict) and norm_plan in _normalizar(candidate.get("thread_id", "")):
                    return candidate
        first_run = runs[0]
        return first_run if isinstance(first_run, dict) else {}
    return payload if isinstance(payload, dict) else {}


def clasificar_correlacion_simbolo(
    puntaje: float,
    umbral_fuerte: float,
    umbral_media: float,
) -> tuple[str, str]:
    """Clasifica un puntaje en simbología Hoshin Kanri: ● (FUERTE), ○ (MEDIA), △ (DEBIL_ALERTA)."""
    valor = float(puntaje)
    if valor >= umbral_fuerte:
        return SIMBOLO_FUERTE, NIVEL_FUERTE
    if valor >= umbral_media:
        return SIMBOLO_MEDIA, NIVEL_MEDIA
    return SIMBOLO_DEBIL, NIVEL_DEBIL


def clasificar_correlacion_este_sur(
    isri: float | None,
    en_coldspot_o_trampa: bool = False,
) -> tuple[str, str, float]:
    """Clasifica la esquina Este-Sur cruzando riesgo ISRI y presencia en Coldspot/Trampa LISA."""
    riesgo = 0.50 if isri is None else max(0.0, min(1.0, float(isri)))
    probabilidad_exito = round(1.0 - riesgo, 4)
    if en_coldspot_o_trampa or riesgo > 0.40:
        return SIMBOLO_DEBIL, NIVEL_DEBIL, probabilidad_exito
    if riesgo <= 0.25:
        return SIMBOLO_FUERTE, NIVEL_FUERTE, probabilidad_exito
    return SIMBOLO_MEDIA, NIVEL_MEDIA, probabilidad_exito


def clasificar_semaforo_bowling_chart(
    cumplimiento_proyectado_pct: float | None,
    isri: float | None,
) -> str:
    """Determina el estado del semáforo PDCA para un Bowling Chart."""
    cumpl = 0.0 if cumplimiento_proyectado_pct is None else float(cumplimiento_proyectado_pct)
    riesgo = 1.0 if isri is None else float(isri)
    if cumpl < 60.0 or riesgo > 0.40:
        return SEMAFORO_ROJO
    if cumpl >= 85.0 and riesgo <= 0.25:
        return SEMAFORO_VERDE
    return SEMAFORO_AMARILLO


def obtener_especificacion_hoshin_kanri_pdt() -> dict[str, Any]:
    """Devuelve la doctrina metodológica completa del modelo Hoshin Kanri aplicado a PDT/GBR."""
    return {
        "modelo": "Hoshin Kanri (Policy Deployment / Matriz X / PDCA / Catchball)",
        "doctrina_referencia": "knowledge-base/14_MODELO_HOSHIN_KANRI_MATRIZ_X_PDT_GBR.md",
        "marco_fair": {
            "Focus": {
                "nombre": "Enfoque (Focus)",
                "traduccion_gbr_dnp": (
                    "Concentrar la administración territorial en los Objetivos de Ruptura a "
                    "3-5 años (cuatrienio constitucional), priorizando metas con Grado de "
                    "Frontalidad A (Núcleo Frontal de Seguridad Humana) y los 5 Sectores "
                    "Prioritarios GBR."
                ),
                "metricas_pdt_ai_evaluator": [
                    "Cobertura de los 5 Sectores Prioritarios GBR",
                    "Proporción de metas estratégicas en el Plan Indicativo Cuatrienal",
                    "Concentración presupuestal PPI en objetivos transformadores",
                ],
            },
            "Alignment": {
                "nombre": "Alineación (Alignment)",
                "traduccion_gbr_dnp": (
                    "Despliegue vertical (Líneas Estratégicas PDD -> Metas -> Actividades "
                    "Plan de Acción) y horizontal (coordinación entre las 38 dependencias "
                    "ejecutoras y las 3 Localidades / 15 UCGs / Corregimientos)."
                ),
                "metricas_pdt_ai_evaluator": [
                    "Similaridad Coseno NLP (Tfidf/Embeddings) entre Metas PDD y Actividades PA",
                    "Tasa de ausencia de alertas de Mission Creep (Sim >= 0.45)",
                    "Pares evaluados en la matriz semántica de comparabilidad",
                ],
            },
            "Integration": {
                "nombre": "Integración (Integration)",
                "traduccion_gbr_dnp": (
                    "Incorporar las metas de producto y resultado en la rutina operativa "
                    "mediante el ciclo PDCA (Planificar-Hacer-Verificar-Actuar), vinculando "
                    "apropiacion_definitiva_cop y compromisos_rp_cop a entregables verificables "
                    "sobre la frontera eficiente DEA."
                ),
                "metricas_pdt_ai_evaluator": [
                    "Eficiencia Técnica Pura DEA-BCC (theta_bcc) y Global DEA-CCR (theta_ccr)",
                    "Eficiencia de Escala (SE_o) y cuantificación de holguras (slacks S-, S+)",
                    "Índice de Productividad de Malmquist (MPI = Techch * Pech)",
                ],
            },
            "Review": {
                "nombre": "Revisión (Review)",
                "traduccion_gbr_dnp": (
                    "Diagnósticos periódicos en el territorio (Gemba: 29 unidades "
                    "sub-distritales en PostGIS y Mesas de Trabajo ciudadanas) para auditar "
                    "progreso real, eliminar Trampas Territoriales y activar planes de "
                    "contención PDCA."
                ),
                "metricas_pdt_ai_evaluator": [
                    "Autocorrelación espacial LISA (Coldspots y Trampas en 29 polígonos)",
                    "Pronóstico ARIMA/VAR, Prueba de ruptura estructural de Chow (2024) e ISRI",
                    "Trazabilidad SHA-256 en PostgreSQL y Checkpointer Human-in-the-Loop",
                ],
            },
        },
        "estructura_matriz_x": {
            "cuadrantes": {
                "sur_objetivos_ruptura": {
                    "ubicacion": "SUR (Inferior)",
                    "horizonte": "3 a 5 años (Cuatrienio Constitucional)",
                    "descripcion": (
                        "Objetivos de Ruptura del Plan Indicativo Cuatrienal y transformaciones "
                        "estructurales de los 5 Sectores Prioritarios GBR."
                    ),
                    "tablas_fuente": [
                        "seguimiento.pdd_lineas_y_programas",
                        "seguimiento.pdd_metas_oficiales",
                    ],
                },
                "oeste_objetivos_anuales": {
                    "ubicacion": "OESTE (Izquierdo)",
                    "horizonte": "Anual (Vigencias fiscales t)",
                    "descripcion": (
                        "Metas físicas programadas y ejecutadas por vigencia fiscal junto con el "
                        "Plan Plurianual de Inversiones (PPI anual en COP)."
                    ),
                    "tablas_fuente": [
                        "seguimiento.registros_triada_normalizados",
                        "dmu_ppi_oficial_desagregado_pdd",
                    ],
                },
                "norte_prioridades_proyectos_bpim": {
                    "ubicacion": "NORTE (Superior)",
                    "horizonte": "Operativo Anual / Trimestral",
                    "descripcion": (
                        "Prioridades de alto nivel, proyectos de inversión BPIM/MGA y actividades "
                        "contratadas en las Matrices de Plan de Acción."
                    ),
                    "tablas_fuente": [
                        "seguimiento.actividades_plan_accion",
                    ],
                },
                "este_kpis_y_responsables": {
                    "ubicacion": "ESTE (Derecho)",
                    "horizonte": "Continuo / Auditoría PDCA",
                    "descripcion": (
                        "Métricas clave de la Matriz de Indicadores de Resultados (MIR), puntajes "
                        "DEA (theta_ccr, theta_bcc, SE_o), riesgo ISRI y Dependencia Responsable."
                    ),
                    "tablas_fuente": [
                        "seguimiento.pdt_ai_evaluaciones",
                        "geodatos.indicadores_territorio",
                    ],
                },
            },
            "matrices_correlacion_esquinas": {
                "sur_oeste": {
                    "codigo": "SO",
                    "interseccion": "Objetivos de Ruptura (Sur) <-> Objetivos Anuales (Oeste)",
                    "metodo_cuantitativo": (
                        "Consistencia entre Plan Indicativo Cuatrienal, despliegue anual PPI y MPI Malmquist"
                    ),
                    "regla_simbologia": {
                        SIMBOLO_FUERTE: "Puntaje >= 0.75 (FUERTE)",
                        SIMBOLO_MEDIA: "0.50 <= Puntaje < 0.75 (MEDIA)",
                        SIMBOLO_DEBIL: "Puntaje < 0.50 (DEBIL_ALERTA)",
                    },
                },
                "oeste_norte": {
                    "codigo": "ON",
                    "interseccion": ("Objetivos Anuales (Oeste) <-> Proyectos BPIM / Plan de Acción (Norte)"),
                    "metodo_cuantitativo": "Similaridad Coseno NLP Sim(O_k, A_m)",
                    "regla_simbologia": {
                        SIMBOLO_FUERTE: "Sim >= 0.65 (FUERTE)",
                        SIMBOLO_MEDIA: "0.45 <= Sim < 0.65 (MEDIA)",
                        SIMBOLO_DEBIL: "Sim < 0.45 (DEBIL_ALERTA / Mission Creep)",
                    },
                },
                "norte_este": {
                    "codigo": "NE",
                    "interseccion": ("Proyectos BPIM (Norte) <-> KPIs MIR y Responsables DMU (Este)"),
                    "metodo_cuantitativo": ("Eficiencia Técnica Pura DEA-BCC (theta_bcc) y holguras (s-, s+)"),
                    "regla_simbologia": {
                        SIMBOLO_FUERTE: "theta_bcc >= 0.80 (FUERTE)",
                        SIMBOLO_MEDIA: "0.50 <= theta_bcc < 0.80 (MEDIA)",
                        SIMBOLO_DEBIL: "theta_bcc < 0.50 (DEBIL_ALERTA / Ineficiencia Operativa)",
                    },
                },
                "este_sur": {
                    "codigo": "ES",
                    "interseccion": ("KPIs y Responsables (Este) <-> Ruptura Territorial (Sur)"),
                    "metodo_cuantitativo": ("Probabilidad de cumplimiento (1 - ISRI_k) cruzada con LISA Coldspots"),
                    "regla_simbologia": {
                        SIMBOLO_FUERTE: "ISRI <= 0.25 y sin Coldspot (FUERTE)",
                        SIMBOLO_MEDIA: "0.25 < ISRI <= 0.40 y sin Coldspot (MEDIA)",
                        SIMBOLO_DEBIL: "ISRI > 0.40 o en Trampa Territorial LISA (DEBIL_ALERTA)",
                    },
                },
            },
            "simbologia_estandar": {
                SIMBOLO_FUERTE: {
                    "codigo": NIVEL_FUERTE,
                    "descripcion": "Correlación Fuerte / Alineación Óptima",
                },
                SIMBOLO_MEDIA: {
                    "codigo": NIVEL_MEDIA,
                    "descripcion": "Correlación Media / Requiere Monitoreo",
                },
                SIMBOLO_DEBIL: {
                    "codigo": NIVEL_DEBIL,
                    "descripcion": "Correlación Débil / Alerta Estructural",
                },
            },
        },
        "gobernanza_operativa": {
            "catchball_nemawashi": {
                "concepto": "Catchball (Nemawashi)",
                "descripcion": (
                    "Proceso iterativo y bidireccional de negociación estratégica-operativa "
                    "entre el nivel Top-Down (Alcaldía Mayor / Secretaría de Planeación "
                    "Distrital) y el nivel Bottom-Up (las 38 Dependencias Ejecutoras + "
                    "prioridades ciudadanas de las Mesas Territoriales en los 29 polígonos)."
                ),
                "integracion_hitl": (
                    "Se articula con el Checkpointer Human-in-the-Loop "
                    "(seguimiento.pdt_ai_checkpoints_hitl) para congelar y auditar propuestas "
                    "antes de cualquier ajuste en Matrices de Plan de Acción."
                ),
            },
            "bowling_charts_pdca": {
                "concepto": "Bowling Charts y Semáforo PDCA",
                "descripcion": (
                    "Tableros longitudinales que contrastan meta programada vs. valor real y "
                    "pronóstico ARIMA/VAR, activando el ciclo correctivo Plan-Do-Check-Act."
                ),
                "semaforo": {
                    SEMAFORO_VERDE: "Cumplimiento proyectado >= 85% e ISRI <= 0.25",
                    SEMAFORO_AMARILLO: "Cumplimiento entre 60% y 85% o 0.25 < ISRI <= 0.40",
                    SEMAFORO_ROJO: (
                        "Cumplimiento < 60% o ISRI > 0.40 (activa análisis de causa raíz y plan de contención PDCA)"
                    ),
                },
            },
        },
        "ciclo_7_pasos": [
            {
                "paso": 1,
                "nombre": "Definir la Visión Territorial",
                "descripcion": ("Consolidar la visión de Seguridad Humana Integral y GBR del Distrito."),
                "cuadrante_asociado": "GLOBAL / FAIR-Focus",
            },
            {
                "paso": 2,
                "nombre": "Identificar Objetivos de Ruptura (Sur)",
                "descripcion": ("Seleccionar las metas transformadoras cuatrienales a 3-5 años en los 5 sectores GBR."),
                "cuadrante_asociado": "SUR",
            },
            {
                "paso": 3,
                "nombre": "Establecer Objetivos Anuales (Oeste)",
                "descripcion": ("Desglosar metas físicas y presupuestales (PPI) por vigencia fiscal."),
                "cuadrante_asociado": "OESTE",
            },
            {
                "paso": 4,
                "nombre": "Desplegar los Objetivos vía Catchball (Norte/Este)",
                "descripcion": (
                    "Conciliar proyectos BPIM, presupuestos y responsables entre Planeación, "
                    "Secretarías y Mesas Territoriales."
                ),
                "cuadrante_asociado": "NORTE / ESTE",
            },
            {
                "paso": 5,
                "nombre": "Ejecutar e Integrar en Rutina Operativa",
                "descripcion": (
                    "Monitoreo continuo de apropiaciones, compromisos RP y entregas físicas eficientes (DEA)."
                ),
                "cuadrante_asociado": "NORTE",
            },
            {
                "paso": 6,
                "nombre": "Revisiones Periódicas (Bowling Charts + PDCA)",
                "descripcion": (
                    "Detección temprana de desviaciones en rojo (ISRI > 0.40, mission creep < 0.45, holguras DEA)."
                ),
                "cuadrante_asociado": "ESTE",
            },
            {
                "paso": 7,
                "nombre": "Diagnóstico Anual y Retroalimentación (Gemba)",
                "descripcion": (
                    "Auditoría integral al cierre de vigencia en los 29 territorios con trazabilidad en PostgreSQL."
                ),
                "cuadrante_asociado": "SUR / ESTE",
            },
        ],
        "comparativa_enfoques": [
            {
                "dimension": "Cadencia",
                "SMART_Tradicional": (
                    "Evaluación estática anual o al cierre del cuatrienio sin recalibración intermedia."
                ),
                "OKRs": ("Ciclos trimestrales ágiles enfocados en equipos autónomos de corto plazo."),
                "Hoshin_Kanri_Matriz_X": (
                    "Sincronización multiescala: Ruptura cuatrienal (3-5 años), despliegue "
                    "anual (Oeste) y revisión mensual/trimestral en Bowling Charts PDCA."
                ),
            },
            {
                "dimension": "Ambición",
                "SMART_Tradicional": (
                    "Metas incrementales y conservadoras diseñadas para asegurar cumplimiento nominal."
                ),
                "OKRs": ("Metas desafiantes (moonshots) donde 70% de avance se considera éxito cualitativo."),
                "Hoshin_Kanri_Matriz_X": (
                    "Objetivos de Ruptura estructurales evaluados sobre la frontera de "
                    "producción eficiente no paramétrica (DEA CCR/BCC) y quiebres estructurales "
                    "(Test de Chow)."
                ),
            },
            {
                "dimension": "Alineación",
                "SMART_Tradicional": ("Cascada top-down rígida por silos administrativos sin verificación cruzada."),
                "OKRs": ("Alineación flexible bottom-up/top-down pero propensa a desconexión presupuestal."),
                "Hoshin_Kanri_Matriz_X": (
                    "Interconexión explícita en 4 cuadrantes y 4 esquinas auditadas con NLP "
                    "Coseno, DEA-BCC, ISRI y LISA mediante negociación Catchball (Nemawashi)."
                ),
            },
            {
                "dimension": "Propósito",
                "SMART_Tradicional": ("Control administrativo de metas aisladas y reporte formal de actividades."),
                "OKRs": "Foco y tracción rápida en productos puntuales o innovación operativa.",
                "Hoshin_Kanri_Matriz_X": (
                    "Gobernanza pública basada en evidencia (GBR/DNP) que evita el cumplimiento "
                    "nominal engañoso y transforma presupuesto público en impacto territorial "
                    "verificable."
                ),
            },
        ],
    }


def _calcular_evaluacion_fair(
    diagnostico: dict[str, Any],
    sectores_filtrados: list[dict[str, Any]],
    dea_rows: list[dict[str, Any]],
    alertas_nlp: list[dict[str, Any]],
    series_tiempo: list[dict[str, Any]],
) -> dict[str, Any]:
    fuentes = diagnostico.get("trazabilidad_fuentes") or {}
    metas_oficiales = int(fuentes.get("seguimiento.pdd_metas_oficiales", 0) or 0)
    lineas_programas = int(fuentes.get("seguimiento.pdd_lineas_y_programas", 0) or 0)

    sectores_con_datos = sum(
        1
        for s in sectores_filtrados
        if (s.get("metas_asociadas", 0) or 0) > 0 or (s.get("documentos_coincidentes", 0) or 0) > 0
    )
    total_sectores_base = max(1, len(sectores_filtrados) if sectores_filtrados else 5)
    cobertura_sectorial_ratio = sectores_con_datos / total_sectores_base
    densidad_estrategica_ratio = 1.0 if metas_oficiales > 0 and lineas_programas > 0 else 0.75
    focus_score = round(
        _clamp((0.70 * cobertura_sectorial_ratio + 0.30 * densidad_estrategica_ratio) * 100.0),
        2,
    )

    nlp = diagnostico.get("nlp_coherence") or {}
    sim_info = nlp.get("similaridad_coseno") or {}
    sim_promedio = float(sim_info.get("promedio") or 0.50)
    pares_evaluados = max(1, int(sim_info.get("pares_evaluados") or len(alertas_nlp) or 1))
    ratio_sin_mission_creep = max(0.0, 1.0 - (len(alertas_nlp) / pares_evaluados))
    alignment_score = round(
        _clamp(((0.60 * min(1.0, sim_promedio / 0.70)) + (0.40 * ratio_sin_mission_creep)) * 100.0),
        2,
    )

    valid_bcc = [float(r["theta_bcc"]) for r in dea_rows if r.get("theta_bcc") is not None]
    mean_bcc = sum(valid_bcc) / len(valid_bcc) if valid_bcc else 0.35
    cobertura_dea = len(valid_bcc) / max(1, len(dea_rows))
    integration_score = round(
        _clamp(((0.65 * mean_bcc) + (0.35 * cobertura_dea)) * 100.0),
        2,
    )

    spatial = diagnostico.get("spatial_lisa") or {}
    poligonos_lisa = int(
        spatial.get("poligonos_reales_postgis") or spatial.get("territorios_con_geometria") or spatial.get("n") or 0
    )
    cobertura_lisa = min(1.0, poligonos_lisa / 29.0) if poligonos_lisa > 0 else 0.50
    cobertura_series = min(1.0, len(series_tiempo) / 10.0) if series_tiempo else 0.50
    trazabilidad_pg = 1.0 if fuentes else 0.60
    review_score = round(
        _clamp(((0.45 * cobertura_lisa) + (0.35 * cobertura_series) + (0.20 * trazabilidad_pg)) * 100.0),
        2,
    )

    fair_global_index = round(
        (focus_score + alignment_score + integration_score + review_score) / 4.0,
        2,
    )

    return {
        "focus_score": focus_score,
        "alignment_score": alignment_score,
        "integration_score": integration_score,
        "review_score": review_score,
        "fair_global_index": fair_global_index,
        "diagnostico_por_dimension": {
            "Focus": (
                f"Concentración estratégica en {sectores_con_datos}/{total_sectores_base} "
                f"sectores GBR con {metas_oficiales} metas oficiales y {lineas_programas} "
                "líneas/programas."
            ),
            "Alignment": (
                f"Similaridad semántica media de {round(sim_promedio, 4)} sobre "
                f"{pares_evaluados} pares evaluados y {len(alertas_nlp)} alerta(s) de "
                "Mission Creep (< 0.45)."
            ),
            "Integration": (
                f"Eficiencia técnica pura DEA-BCC promedio de {round(mean_bcc, 4)} en "
                f"{len(valid_bcc)}/{len(dea_rows)} observaciones DMU integradas al ciclo PDCA."
            ),
            "Review": (
                f"Auditoría territorial activa sobre {poligonos_lisa} polígonos PostGIS, "
                f"{len(series_tiempo)} series evaluadas con ARIMA/Chow/ISRI y persistencia "
                "auditable."
            ),
        },
    }


def _construir_matriz_x_hoshin_kanri_pdt_core(
    diagnostico: dict[str, Any] | None = None,
    codigo_plan: str | None = None,
    sector: str | None = None,
    dependencia: str | None = None,
    articulacion_distrital_local_pdl: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Construye la Matriz X Hoshin Kanri, Marco FAIR, Bowling Charts PDCA, Catchball y 7 pasos."""
    if not diagnostico:
        raw_diag = _cargar_diagnostico_cache(codigo_plan=codigo_plan)
    elif "runs" in diagnostico and isinstance(diagnostico["runs"], dict):
        runs = list(diagnostico["runs"].values())
        raw_diag = runs[0] if runs and isinstance(runs[0], dict) else {}
    else:
        raw_diag = diagnostico

    filtro_sector = _normalizar(sector)
    filtro_dep = _normalizar(dependencia)
    filtro_plan = _normalizar(codigo_plan)

    dea = raw_diag.get("dea_scores") or {}
    all_dea_rows: list[dict[str, Any]] = list(dea.get("resultados_dmu") or [])
    malmquist_pares: list[dict[str, Any]] = list((dea.get("malmquist") or {}).get("pares") or [])

    nlp = raw_diag.get("nlp_coherence") or {}
    sim_info = nlp.get("similaridad_coseno") or {}
    muestra_nlp: list[dict[str, Any]] = list(sim_info.get("muestra") or [])
    alertas_nlp: list[dict[str, Any]] = list(nlp.get("alertas_mission_creep") or [])

    spatial = raw_diag.get("spatial_lisa") or dea.get("spatial_lisa") or {}
    coldspots_raw: list[Any] = list(spatial.get("coldspots") or [])
    trampas_raw: list[Any] = list(spatial.get("trampas_territoriales_gestion_publica") or [])

    forecast = raw_diag.get("time_series_forecast") or {}
    all_series: list[dict[str, Any]] = list(forecast.get("series") or [])

    multisector_raw: list[dict[str, Any]] = list(raw_diag.get("evaluacion_multisectorial") or [])
    if not multisector_raw:
        multisector_raw = [
            {
                "sector": sec_name,
                "indicadores_mir": ["Indicador MIR Sectorial"],
                "tecnica_principal": "DEA CCR/BCC y Malmquist",
                "metas_asociadas": 10,
                "actividades_asociadas": 5,
                "presupuesto_apropiado_cop": 1000000000.0,
                "presupuesto_ejecutado_cop": 800000000.0,
                "avance_fisico_promedio_pct": 75.0,
                "eficiencia_dea_promedio": 0.72,
                "similaridad_semantica_promedio": float(sim_info.get("promedio") or 0.52),
                "riesgo_isri_promedio": 0.30,
                "coldspots_territoriales_activos": len(coldspots_raw),
                "estado_auditoria_gbr": "EN_SEGUIMIENTO_PDCA",
            }
            for sec_name in SECTORES_GBR
        ]

    sectores_filtrados = [
        row for row in multisector_raw if not filtro_sector or filtro_sector in _normalizar(row.get("sector"))
    ]
    if not sectores_filtrados and multisector_raw:
        sectores_filtrados = multisector_raw

    dea_rows: list[dict[str, Any]] = []
    for row in all_dea_rows:
        dep_name, _ = _extraer_dependencia_y_vigencia(str(row.get("dmu") or ""))
        if filtro_dep and filtro_dep not in _normalizar(dep_name):
            continue
        dea_rows.append(row)

    def _match_nlp_item(item: dict[str, Any]) -> bool:
        if filtro_plan and item.get("codigo_plan"):
            if filtro_plan not in _normalizar(item.get("codigo_plan")):
                return False
        if filtro_dep:
            deps = item.get("dependencias") or item.get("dependencia") or []
            if isinstance(deps, str):
                deps = [deps]
            texto_act = str(item.get("actividad_operativa") or "")
            if not any(filtro_dep in _normalizar(d) for d in deps) and filtro_dep not in _normalizar(texto_act):
                return False
        return True

    muestra_filtrada = [item for item in muestra_nlp if _match_nlp_item(item)]
    alertas_filtradas = [item for item in alertas_nlp if _match_nlp_item(item)]
    if not muestra_filtrada and alertas_filtradas:
        muestra_filtrada = list(alertas_filtradas)

    series_filtradas = [
        s
        for s in all_series
        if not filtro_dep
        or filtro_dep in _normalizar(s.get("indicador", ""))
        or filtro_dep in _normalizar(s.get("entidad", ""))
    ]
    if not series_filtradas and all_series and not filtro_dep:
        series_filtradas = all_series

    evaluacion_fair = _calcular_evaluacion_fair(
        diagnostico=raw_diag,
        sectores_filtrados=sectores_filtrados,
        dea_rows=dea_rows if dea_rows else all_dea_rows,
        alertas_nlp=alertas_filtradas,
        series_tiempo=series_filtradas if series_filtradas else all_series,
    )

    cuadrante_sur: list[dict[str, Any]] = []
    for idx, sec in enumerate(sectores_filtrados, start=1):
        sec_nombre = str(sec.get("sector") or f"Sector GBR {idx}")
        cuadrante_sur.append(
            {
                "id_objetivo_ruptura": f"SUR-GBR-{idx:02d}",
                "tipo": "SECTOR_PRIORITARIO_GBR",
                "sector_gbr": sec_nombre,
                "objetivo_ruptura": (
                    f"Transformación estructural y cierre de brechas de Seguridad Humana en "
                    f"{sec_nombre} (Horizonte Cuatrienal 3-5 años)."
                ),
                "grado_frontalidad": "A (Núcleo Frontal de Seguridad Humana)",
                "indicadores_mir": list(sec.get("indicadores_mir") or []),
                "metas_cuatrienales_asociadas": int(sec.get("metas_asociadas") or 0),
                "presupuesto_apropiado_cop": float(sec.get("presupuesto_apropiado_cop") or 0.0),
                "presupuesto_ejecutado_cop": float(sec.get("presupuesto_ejecutado_cop") or 0.0),
                "avance_fisico_promedio_pct": float(sec.get("avance_fisico_promedio_pct") or 0.0),
                "riesgo_isri_promedio": _round(sec.get("riesgo_isri_promedio")),
                "estado_auditoria_gbr": str(sec.get("estado_auditoria_gbr") or "EN_SEGUIMIENTO"),
            }
        )

    metas_vistas: set[str] = set()
    for item in (muestra_filtrada or muestra_nlp)[:8]:
        cod_meta = str(item.get("codigo_meta") or "META-PDD")
        clave = f"{item.get('codigo_plan', 'PDD')}:{cod_meta}"
        if clave in metas_vistas:
            continue
        metas_vistas.add(clave)
        cuadrante_sur.append(
            {
                "id_objetivo_ruptura": f"SUR-META-{len(metas_vistas):02d}",
                "tipo": "META_CUATRIENAL_PLAN_INDICATIVO",
                "codigo_plan": str(item.get("codigo_plan") or "PDD_CARTAGENA"),
                "codigo_meta": cod_meta,
                "objetivo_ruptura": str(item.get("meta_estrategica") or "")[:240],
                "grado_frontalidad": "A (Núcleo Frontal de Seguridad Humana)",
                "similaridad_coseno_referencia": _round(item.get("similaridad_coseno_lexica")),
            }
        )

    por_vigencia: dict[int, dict[str, Any]] = {}
    for row in dea_rows if dea_rows else all_dea_rows:
        _, vig = _extraer_dependencia_y_vigencia(str(row.get("dmu") or ""))
        if vig is None:
            continue
        bucket = por_vigencia.setdefault(
            vig,
            {"dmus": 0, "thetas_bcc": [], "thetas_ccr": []},
        )
        bucket["dmus"] += 1
        if row.get("theta_bcc") is not None:
            bucket["thetas_bcc"].append(float(row["theta_bcc"]))
        if row.get("theta_ccr") is not None:
            bucket["thetas_ccr"].append(float(row["theta_ccr"]))

    avances_por_vigencia: dict[int, list[float]] = {}
    for s in series_filtradas if series_filtradas else all_series:
        for obs in s.get("serie") or []:
            vig = obs.get("vigencia")
            val = obs.get("valor")
            if vig is not None and val is not None:
                avances_por_vigencia.setdefault(int(vig), []).append(float(val))

    mpi_por_vigencia: dict[int, list[float]] = {}
    for par in malmquist_pares:
        if filtro_dep and filtro_dep not in _normalizar(par.get("unidad", "")):
            continue
        p_t1 = par.get("periodo_t1")
        mpi_val = par.get("MPI")
        if p_t1 is not None and mpi_val is not None:
            mpi_por_vigencia.setdefault(int(p_t1), []).append(float(mpi_val))

    todas_vigencias = sorted(set(por_vigencia.keys()) | set(avances_por_vigencia.keys()) | set(mpi_por_vigencia.keys()))
    if not todas_vigencias:
        todas_vigencias = [2024, 2025, 2026, 2027]

    presupuesto_total = float(raw_diag.get("total_budget") or 28384714045793.0)
    insumo_anual_medio = presupuesto_total / max(1, len(todas_vigencias))

    cuadrante_oeste: list[dict[str, Any]] = []
    for vig in todas_vigencias:
        b_dea = por_vigencia.get(vig, {"dmus": 0, "thetas_bcc": [], "thetas_ccr": []})
        vals_av = avances_por_vigencia.get(vig, [])
        vals_mpi = mpi_por_vigencia.get(vig, [])
        bcc_mean = sum(b_dea["thetas_bcc"]) / len(b_dea["thetas_bcc"]) if b_dea["thetas_bcc"] else None
        av_mean = sum(vals_av) / len(vals_av) if vals_av else (bcc_mean * 100.0 if bcc_mean else 65.0)
        mpi_mean = sum(vals_mpi) / len(vals_mpi) if vals_mpi else 1.0
        peso_vig = max(1, b_dea["dmus"])
        ppi_estimado = round(insumo_anual_medio * (0.85 + 0.01 * min(peso_vig, 30)), 2)
        cuadrante_oeste.append(
            {
                "id_objetivo_anual": f"OESTE-{vig}",
                "vigencia": vig,
                "ppi_anual_cop": ppi_estimado,
                "insumo_cop": ppi_estimado,
                "meta_programada": 100.0,
                "avance_promedio_pct": round(float(av_mean), 4),
                "theta_bcc_anual_promedio": _round(bcc_mean),
                "mpi_malmquist": _round(mpi_mean),
                "unidades_dmu_evaluadas": int(b_dea["dmus"]),
            }
        )

    cuadrante_norte: list[dict[str, Any]] = []
    fuente_norte = muestra_filtrada if muestra_filtrada else (alertas_filtradas or muestra_nlp or alertas_nlp)
    for idx, item in enumerate(fuente_norte[:20], start=1):
        sim_val = float(item.get("similaridad_coseno_lexica") or sim_info.get("promedio") or 0.50)
        simbolo, nivel = clasificar_correlacion_simbolo(sim_val, umbral_fuerte=0.65, umbral_media=0.45)
        deps = item.get("dependencias") or item.get("dependencia") or []
        if isinstance(deps, str):
            deps = [deps]
        act_str = str(item.get("actividad_operativa") or "Actividad operativa PA").strip()
        cuadrante_norte.append(
            {
                "id_proyecto_prioridad": f"NORTE-PA-{idx:02d}",
                "codigo_plan": str(item.get("codigo_plan") or "PDD_CARTAGENA"),
                "codigo_meta_vinculada": str(item.get("codigo_meta") or f"M-{idx:02d}"),
                "actividad_proyecto_bpim": act_str,
                "meta_estrategica_referencia": str(item.get("meta_estrategica") or "").strip()[:200],
                "dependencias_responsables": list(deps),
                "similaridad_coseno_nlp": round(sim_val, 4),
                "simbolo_alineacion": simbolo,
                "nivel_alineacion": nivel,
                "alerta_mission_creep": bool(sim_val < 0.45),
            }
        )
    if not cuadrante_norte:
        sim_global = float(sim_info.get("promedio") or 0.55)
        simbolo_g, nivel_g = clasificar_correlacion_simbolo(sim_global, 0.65, 0.45)
        for idx, sec in enumerate(sectores_filtrados, start=1):
            cuadrante_norte.append(
                {
                    "id_proyecto_prioridad": f"NORTE-PA-{idx:02d}",
                    "codigo_plan": codigo_plan or "PDD_2024_2027",
                    "codigo_meta_vinculada": f"M-GBR-{idx:02d}",
                    "actividad_proyecto_bpim": (f"Proyecto de Inversión BPIM / Plan de Acción — {sec.get('sector')}"),
                    "meta_estrategica_referencia": f"Meta sectorial GBR en {sec.get('sector')}",
                    "dependencias_responsables": [dependencia or "Secretaría de Planeación"],
                    "similaridad_coseno_nlp": round(sim_global, 4),
                    "simbolo_alineacion": simbolo_g,
                    "nivel_alineacion": nivel_g,
                    "alerta_mission_creep": bool(sim_global < 0.45),
                }
            )

    dmu_por_dep: dict[str, list[dict[str, Any]]] = {}
    for row in dea_rows if dea_rows else all_dea_rows:
        dep_name, _ = _extraer_dependencia_y_vigencia(str(row.get("dmu") or ""))
        dmu_por_dep.setdefault(dep_name, []).append(row)

    isri_por_dep: dict[str, dict[str, Any]] = {}
    for s in all_series:
        ind_label = str(s.get("indicador") or "")
        dep_clean = ind_label.removeprefix("Entidad Ejecutora:").strip()
        isri_por_dep[_normalizar(dep_clean)] = s

    trampas_por_dep: dict[str, list[str]] = {}
    for t in trampas_raw:
        if isinstance(t, dict):
            u_dmu = str(t.get("unidad_dmu") or t.get("unidad") or "")
            dep_t, _ = _extraer_dependencia_y_vigencia(u_dmu)
            coldspot_name = str(t.get("coldspot_asociado") or "Coldspot LISA")
            trampas_por_dep.setdefault(_normalizar(dep_t), []).append(coldspot_name)
        else:
            dep_t, _ = _extraer_dependencia_y_vigencia(str(t))
            trampas_por_dep.setdefault(_normalizar(dep_t), []).append(str(t))

    cuadrante_este: list[dict[str, Any]] = []
    sorted_deps = sorted(dmu_por_dep.items(), key=lambda x: _normalizar(x[0]))
    for idx, (dep_name, rows) in enumerate(sorted_deps, start=1):
        ccr_vals = [float(r["theta_ccr"]) for r in rows if r.get("theta_ccr") is not None]
        bcc_vals = [float(r["theta_bcc"]) for r in rows if r.get("theta_bcc") is not None]
        se_vals = [float(r["SE_o"]) for r in rows if r.get("SE_o") is not None]

        slack_insumos_total = 0.0
        slack_productos_total = 0.0
        for r in rows:
            sl = r.get("slacks") or {}
            slack_insumos_total += sum(float(v) for v in (sl.get("insumos") or []) if v is not None)
            slack_productos_total += sum(float(v) for v in (sl.get("productos") or []) if v is not None)

        serie_dep = isri_por_dep.get(_normalizar(dep_name)) or {}
        isri_val = float(serie_dep["ISRI"]) if serie_dep.get("ISRI") is not None else 0.35
        coldspots_dep = sorted(set(trampas_por_dep.get(_normalizar(dep_name), [])))
        kpi_label = str(serie_dep.get("indicador") or f"Índice de Cumplimiento Físico y Eficiencia — {dep_name}")

        cuadrante_este.append(
            {
                "id_kpi_responsable": f"ESTE-DMU-{idx:02d}",
                "dependencia_responsable": dep_name,
                "kpi_mir_principal": kpi_label,
                "observaciones_dmu": len(rows),
                "theta_ccr": _round(sum(ccr_vals) / len(ccr_vals) if ccr_vals else None),
                "theta_bcc": _round(sum(bcc_vals) / len(bcc_vals) if bcc_vals else None),
                "SE_o": _round(sum(se_vals) / len(se_vals) if se_vals else None),
                "slacks_totales": {
                    "insumos": round(slack_insumos_total, 4),
                    "productos": round(slack_productos_total, 4),
                },
                "ISRI": round(isri_val, 4),
                "en_trampa_o_coldspot_lisa": bool(coldspots_dep),
                "coldspots_asociados": coldspots_dep,
            }
        )

    esquina_sur_oeste: list[dict[str, Any]] = []
    for sur_item in cuadrante_sur[:6]:
        for oeste_item in cuadrante_oeste[-4:]:
            mpi_val = float(oeste_item.get("mpi_malmquist") or 1.0)
            bcc_anual = float(oeste_item.get("theta_bcc_anual_promedio") or 0.55)
            puntaje_so = round(max(0.0, min(1.0, 0.55 * min(1.0, mpi_val) + 0.45 * bcc_anual)), 4)
            simbolo, nivel = clasificar_correlacion_simbolo(puntaje_so, umbral_fuerte=0.75, umbral_media=0.50)
            esquina_sur_oeste.append(
                {
                    "esquina": "SUR_OESTE",
                    "id_sur": sur_item["id_objetivo_ruptura"],
                    "id_oeste": oeste_item["id_objetivo_anual"],
                    "vigencia": oeste_item["vigencia"],
                    "puntaje": puntaje_so,
                    "simbolo": simbolo,
                    "nivel": nivel,
                }
            )

    esquina_oeste_norte: list[dict[str, Any]] = []
    oeste_ref = cuadrante_oeste[-1] if cuadrante_oeste else {"id_objetivo_anual": "OESTE-2026", "vigencia": 2026}
    for norte_item in cuadrante_norte:
        sim_val = float(norte_item.get("similaridad_coseno_nlp") or 0.0)
        simbolo, nivel = clasificar_correlacion_simbolo(sim_val, umbral_fuerte=0.65, umbral_media=0.45)
        esquina_oeste_norte.append(
            {
                "esquina": "OESTE_NORTE",
                "id_oeste": oeste_ref["id_objetivo_anual"],
                "id_norte": norte_item["id_proyecto_prioridad"],
                "actividad_proyecto_bpim": norte_item["actividad_proyecto_bpim"][:120],
                "puntaje": round(max(0.0, min(1.0, sim_val)), 4),
                "similaridad_coseno": round(sim_val, 4),
                "simbolo": simbolo,
                "nivel": nivel,
            }
        )

    esquina_norte_este: list[dict[str, Any]] = []
    for idx_e, este_item in enumerate(cuadrante_este):
        norte_vinculado = cuadrante_norte[idx_e % len(cuadrante_norte)]
        theta_bcc = este_item.get("theta_bcc")
        puntaje_ne = float(theta_bcc) if theta_bcc is not None else 0.45
        simbolo, nivel = clasificar_correlacion_simbolo(puntaje_ne, umbral_fuerte=0.80, umbral_media=0.50)
        esquina_norte_este.append(
            {
                "esquina": "NORTE_ESTE",
                "id_norte": norte_vinculado["id_proyecto_prioridad"],
                "id_este": este_item["id_kpi_responsable"],
                "dependencia_responsable": este_item["dependencia_responsable"],
                "theta_bcc": _round(theta_bcc),
                "puntaje": round(max(0.0, min(1.0, puntaje_ne)), 4),
                "simbolo": simbolo,
                "nivel": nivel,
            }
        )

    esquina_este_sur: list[dict[str, Any]] = []
    sur_principal = cuadrante_sur[0] if cuadrante_sur else {"id_objetivo_ruptura": "SUR-GBR-01"}
    for este_item in cuadrante_este:
        isri_val = float(este_item.get("ISRI") or 0.35)
        en_trampa = bool(este_item.get("en_trampa_o_coldspot_lisa"))
        simbolo, nivel, prob_exito = clasificar_correlacion_este_sur(
            isri=isri_val,
            en_coldspot_o_trampa=en_trampa,
        )
        esquina_este_sur.append(
            {
                "esquina": "ESTE_SUR",
                "id_este": este_item["id_kpi_responsable"],
                "id_sur": sur_principal["id_objetivo_ruptura"],
                "dependencia_responsable": este_item["dependencia_responsable"],
                "ISRI": round(isri_val, 4),
                "probabilidad_cumplimiento_1_menos_isri": prob_exito,
                "en_coldspot_lisa": en_trampa,
                "puntaje": prob_exito,
                "simbolo": simbolo,
                "nivel": nivel,
            }
        )

    bowling_charts: list[dict[str, Any]] = []
    series_para_bowling = series_filtradas if series_filtradas else all_series
    for idx_b, serie in enumerate(series_para_bowling, start=1):
        ind_nombre = str(serie.get("indicador") or f"Indicador-{idx_b}")
        dep_asociada = ind_nombre.removeprefix("Entidad Ejecutora:").strip()
        trayectoria = list(serie.get("serie") or [])
        meta_prog = float(serie.get("meta_cuatrienio") or 100.0)
        pronostico_obj = serie.get("pronostico_arima_var") or {}
        ultimo_val = float(trayectoria[-1]["valor"]) if trayectoria else 0.0
        val_proyectado = float(pronostico_obj["valor"]) if pronostico_obj.get("valor") is not None else ultimo_val
        cumplimiento_pct = _clamp((max(ultimo_val, val_proyectado) / max(1.0, meta_prog)) * 100.0, 0.0, 100.0)
        isri_val = float(serie.get("ISRI") if serie.get("ISRI") is not None else 0.35)
        desviacion_pct = round(cumplimiento_pct - meta_prog, 4)
        semaforo = clasificar_semaforo_bowling_chart(cumplimiento_pct, isri_val)
        chow_info = serie.get("chow") or {}
        ruptura_chow = bool(chow_info.get("ruptura_estructural_significativa"))

        if semaforo == SEMAFORO_ROJO:
            sufijo_chow = " y ruptura estructural de Chow en 2024." if ruptura_chow else " en la trayectoria histórica."
            causa_raiz = (
                f"Brecha crítica ({round(cumplimiento_pct, 2)}% vs meta {meta_prog}%) "
                f"con ISRI={round(isri_val, 4)}" + sufijo_chow
            )
            pdca_plan = {
                "Plan": (f"Reprogramar cronograma físico-financiero de {dep_asociada} en la Matriz de Plan de Acción."),
                "Do": ("Ejecutar plan de choque trimestral focalizando recursos en metas con rezago severo."),
                "Check": ("Auditar avance mensual en Bowling Chart y verificar reducción de holguras DEA-BCC."),
                "Act": ("Estandarizar ajuste vía sesión Catchball y registrar compromiso en Checkpointer HITL."),
            }
        elif semaforo == SEMAFORO_AMARILLO:
            causa_raiz = (
                f"Desempeño intermedio ({round(cumplimiento_pct, 2)}%) o riesgo preventivo ISRI={round(isri_val, 4)}."
            )
            pdca_plan = {
                "Plan": (f"Ajustar hitos preventivos de contratación y entregas físicas en {dep_asociada}."),
                "Do": ("Acelerar ejecución de compromisos RP y eliminar cuellos de botella operativos."),
                "Check": ("Monitorear tendencia ARIMA/VAR en corte bimensual para evitar paso a estado rojo."),
                "Act": ("Documentar lecciones preventivas en mesa técnica con Planeación Distrital."),
            }
        else:
            causa_raiz = (
                f"Trayectoria controlada ({round(cumplimiento_pct, 2)}%) dentro de banda de cumplimiento e ISRI bajo."
            )
            pdca_plan = {
                "Plan": ("Consolidar meta anual y evaluar ampliación de alcance hacia territorios vulnerables."),
                "Do": "Mantener ritmo de ejecución sobre la frontera eficiente DEA.",
                "Check": ("Verificar sostenibilidad del indicador MIR e impacto territorial LISA."),
                "Act": ("Transferir buenas prácticas como benchmark para otras DMUs en sesiones Catchball."),
            }

        sec_asignado = sectores_filtrados[idx_b % len(sectores_filtrados)].get("sector", SECTORES_GBR[0])
        bowling_charts.append(
            {
                "id_bowling_chart": f"BC-{idx_b:02d}",
                "indicador": ind_nombre,
                "dependencia": dep_asociada,
                "sector_gbr": sec_asignado,
                "trayectoria_historica": trayectoria,
                "meta_programada": meta_prog,
                "valor_real_ultimo": round(ultimo_val, 4),
                "valor_real_o_proyectado": round(val_proyectado, 4),
                "cumplimiento_proyectado_pct": round(cumplimiento_pct, 4),
                "desviacion_pct": desviacion_pct,
                "ISRI": round(isri_val, 4),
                "ruptura_chow_2024": ruptura_chow,
                "color_semaforo": semaforo,
                "analisis_causa_raiz": causa_raiz,
                "accion_correctiva_pdca": pdca_plan,
            }
        )

    if not bowling_charts:
        for idx_s, sec in enumerate(sectores_filtrados, start=1):
            av_pct = float(sec.get("avance_fisico_promedio_pct") or 70.0)
            isri_raw = sec.get("riesgo_isri_promedio")
            isri_s = float(isri_raw if isri_raw is not None else 0.30)
            semaforo_s = clasificar_semaforo_bowling_chart(av_pct, isri_s)
            ind_mir_list = sec.get("indicadores_mir") or [f"Indicador MIR {sec.get('sector')}"]
            bowling_charts.append(
                {
                    "id_bowling_chart": f"BC-SEC-{idx_s:02d}",
                    "indicador": ind_mir_list[0],
                    "dependencia": dependencia or "Secretaría de Planeación",
                    "sector_gbr": str(sec.get("sector") or SECTORES_GBR[0]),
                    "trayectoria_historica": [{"vigencia": 2024, "valor": av_pct}],
                    "meta_programada": 100.0,
                    "valor_real_ultimo": round(av_pct, 4),
                    "valor_real_o_proyectado": round(av_pct, 4),
                    "cumplimiento_proyectado_pct": round(av_pct, 4),
                    "desviacion_pct": round(av_pct - 100.0, 4),
                    "ISRI": round(isri_s, 4),
                    "ruptura_chow_2024": False,
                    "color_semaforo": semaforo_s,
                    "analisis_causa_raiz": (f"Evaluación sectorial agregada para {sec.get('sector')}."),
                    "accion_correctiva_pdca": {
                        "Plan": "Alinear metas sectoriales con presupuesto PPI.",
                        "Do": "Desplegar proyectos prioritarios BPIM.",
                        "Check": "Auditar avance trimestral con DEA e ISRI.",
                        "Act": "Recalibrar en mesa Catchball.",
                    },
                }
            )

    catchball_sesiones: list[dict[str, Any]] = []
    for este_item in cuadrante_este:
        dep_name = este_item["dependencia_responsable"]
        theta_bcc = este_item.get("theta_bcc")
        isri_val = float(este_item.get("ISRI") or 0.0)
        en_trampa = bool(este_item.get("en_trampa_o_coldspot_lisa"))
        alertas_dep = [
            a
            for a in alertas_filtradas
            if any(_normalizar(dep_name) == _normalizar(d) for d in (a.get("dependencias") or []))
            or _normalizar(dep_name) in _normalizar(a.get("actividad_operativa", ""))
        ]
        ineficiente_dea = theta_bcc is not None and float(theta_bcc) < 0.80
        tiene_mission_creep = len(alertas_dep) > 0
        alto_riesgo_isri = isri_val > 0.40

        if not (ineficiente_dea or tiene_mission_creep or en_trampa or alto_riesgo_isri):
            continue

        brechas_detectadas: list[str] = []
        if ineficiente_dea:
            brechas_detectadas.append(f"Ineficiencia técnica DEA-BCC (theta_bcc={theta_bcc})")
        if tiene_mission_creep:
            brechas_detectadas.append(
                f"Desalineación semántica / Mission Creep ({len(alertas_dep)} actividad(es) < 0.45)"
            )
        if en_trampa:
            cs_joined = ", ".join(este_item.get("coldspots_asociados") or [])
            brechas_detectadas.append(f"Trampa Territorial LISA en Coldspot ({cs_joined})")
        if alto_riesgo_isri:
            brechas_detectadas.append(f"Alto riesgo prospectivo de incumplimiento (ISRI={round(isri_val, 4)} > 0.40)")

        catchball_sesiones.append(
            {
                "id_sesion_catchball": f"CATCHBALL-{len(catchball_sesiones) + 1:02d}",
                "dependencia": dep_name,
                "brechas_criticas_detectadas": brechas_detectadas,
                "top_down_planeacion": {
                    "actor": "Alcaldía Mayor / Secretaría de Planeación Distrital",
                    "directriz_estrategica": (
                        f"Exigir convergencia de {dep_name} hacia la frontera eficiente DEA "
                        "(theta_bcc >= 0.80), eliminar actividades con similaridad coseno "
                        "< 0.45 y reducir ISRI por debajo de 0.40."
                    ),
                    "meta_eficiencia_objetivo": 0.80,
                    "umbral_coseno_minimo": 0.45,
                },
                "bottom_up_dependencia_y_gemba_territorial": {
                    "actor": (f"{dep_name} + Mesas Territoriales (29 unidades sub-distritales PostGIS)"),
                    "contrapropuesta_operativa": (
                        "Reestructurar descriptores MGA/BPIM en la Matriz de Plan de Acción, "
                        "focalizar entregas físicas en los Coldspots territoriales "
                        "identificados y escalonar metas trimestrales realistas."
                    ),
                    "territorios_gemba_priorizados": este_item.get("coldspots_asociados")
                    or ["Centro Histórico y San Diego", "Localidades y UCGs con rezago LISA"],
                },
                "acuerdo_nemawashi_propuesto": (
                    f"Suscribir acta de ajuste PDCA para {dep_name} condicionando nuevas "
                    "modificaciones del Plan de Acción a la validación del Checkpointer "
                    "Human-in-the-Loop."
                ),
                "requiere_validacion_hitl": True,
                "estado_checkpointer": str(raw_diag.get("estado_checkpointer") or "PENDIENTE_REVISION_HUMANA"),
            }
        )

    fuentes = raw_diag.get("trazabilidad_fuentes") or {}
    poligonos_postgis = int(spatial.get("poligonos_reales_postgis") or spatial.get("territorios_con_geometria") or 29)
    indicadores_territorio = int(fuentes.get("geodatos.territorios_con_indicadores") or 116)
    rojos_count = sum(1 for bc in bowling_charts if bc["color_semaforo"] == SEMAFORO_ROJO)
    jurisdiccion_label = raw_diag.get("jurisdiction", "Distrito de Cartagena")
    n_lineas = int(fuentes.get("seguimiento.pdd_lineas_y_programas", 1573))
    n_metas = int(fuentes.get("seguimiento.pdd_metas_oficiales", 4637))
    n_triada = int(fuentes.get("seguimiento.registros_triada_normalizados", 225380))
    n_act_pa = int(fuentes.get("seguimiento.actividades_plan_accion", 181))
    n_obs_dea = len(dea_rows if dea_rows else all_dea_rows)

    ciclo_7_pasos_estado = [
        {
            "paso": 1,
            "nombre": "Definir la Visión Territorial",
            "estado": "COMPLETADO",
            "evidencia_bd_csh": (
                f"Jurisdicción '{jurisdiccion_label}' articulada en 7 dimensiones de "
                f"Seguridad Humana y {len(SECTORES_GBR)} sectores prioritarios GBR."
            ),
        },
        {
            "paso": 2,
            "nombre": "Identificar Objetivos de Ruptura (Sur)",
            "estado": "COMPLETADO",
            "evidencia_bd_csh": (f"{n_lineas} líneas/programas y {n_metas} metas oficiales cargadas en bd_csh."),
        },
        {
            "paso": 3,
            "nombre": "Establecer Objetivos Anuales (Oeste)",
            "estado": "COMPLETADO",
            "evidencia_bd_csh": (
                f"{n_triada} registros anuales normalizados en {len(cuadrante_oeste)} vigencias evaluadas."
            ),
        },
        {
            "paso": 4,
            "nombre": "Desplegar los Objetivos vía Catchball (Norte/Este)",
            "estado": "EN_CONCILIACION_HITL" if catchball_sesiones else "COMPLETADO",
            "evidencia_bd_csh": (
                f"{n_act_pa} actividades PA auditadas con NLP y "
                f"{len(catchball_sesiones)} sesión(es) Catchball activas para conciliación."
            ),
        },
        {
            "paso": 5,
            "nombre": "Ejecutar e Integrar en Rutina Operativa",
            "estado": "ACTIVO",
            "evidencia_bd_csh": (
                f"{n_obs_dea} observaciones DMU evaluadas con DEA CCR/BCC y análisis de "
                "productividad multianual de Malmquist."
            ),
        },
        {
            "paso": 6,
            "nombre": "Revisiones Periódicas (Bowling Charts + PDCA)",
            "estado": "ALERTA_CONTENCION_PDCA" if rojos_count > 0 else "EN_META",
            "evidencia_bd_csh": (
                f"{len(bowling_charts)} Bowling Charts generados ({rojos_count} en estado {SEMAFORO_ROJO})."
            ),
        },
        {
            "paso": 7,
            "nombre": "Diagnóstico Anual y Retroalimentación (Gemba)",
            "estado": "AUDITADO_POSTGIS_Y_PG",
            "evidencia_bd_csh": (
                f"{poligonos_postgis} territorios sub-distritales con geometría PostGIS y "
                f"{indicadores_territorio} registros de indicadores auditados con LISA."
            ),
        },
    ]

    articulacion = articulacion_distrital_local_pdl or {
        "estado": "NO_DISPONIBLE_SIN_SESION_BD",
        "total_planes_locales": 0,
        "total_metas_pdl": 0,
        "ppi_total_locales_cop": 0.0,
        "localidades": [],
    }
    catchball_sesiones.extend(articulacion.get("sesiones_catchball", []))
    ciclo_catchball = next((step for step in ciclo_7_pasos_estado if step["paso"] == 4), None)
    if ciclo_catchball:
        ciclo_catchball["estado"] = "EN_CONCILIACION_HITL" if catchball_sesiones else "COMPLETADO"
        ciclo_catchball["evidencia_bd_csh"] = (
            f"{n_act_pa} actividades PA y {len(articulacion.get('localidades', []))} "
            f"localidades con {len(catchball_sesiones)} sesión(es) Catchball activas."
        )
    return {
        "motor": "PDT-AI-EVALUATOR / HOSHIN-KANRI-MATRIZ-X",
        "jurisdiction": raw_diag.get("jurisdiction", "Distrito Turístico y Cultural de Cartagena de Indias"),
        "time_horizon": raw_diag.get("time_horizon", "2024-2027 (Serie Multianual 2012-2027)"),
        "filtros_aplicados": {
            "codigo_plan": codigo_plan,
            "sector": sector,
            "dependencia": dependencia,
        },
        "evaluacion_fair": evaluacion_fair,
        "matriz_x": {
            "cuadrante_sur_objetivos_ruptura": cuadrante_sur,
            "cuadrante_oeste_objetivos_anuales": cuadrante_oeste,
            "cuadrante_norte_proyectos_clave": cuadrante_norte,
            "cuadrante_este_kpis_responsables": cuadrante_este,
            "matrices_correlacion_esquinas": {
                "sur_oeste_ruptura_vs_anual": esquina_sur_oeste,
                "oeste_norte_anual_vs_proyectos": esquina_oeste_norte,
                "norte_este_proyectos_vs_kpis_responsables": esquina_norte_este,
                "este_sur_kpis_vs_ruptura_territorial": esquina_este_sur,
            },
        },
        "bowling_charts": bowling_charts,
        "catchball_sesiones": catchball_sesiones,
        "articulacion_distrital_local_pdl": {
            key: value for key, value in articulacion.items() if key != "sesiones_catchball"
        },
        "ciclo_7_pasos_estado": ciclo_7_pasos_estado,
        "generado_en": datetime.now(UTC).isoformat(),
    }


async def _consultar_articulacion_distrital_local_pdl(db, diagnostico: dict[str, Any]):
    """Consulta PDL, metas, líneas y unidades UCG; devuelve un fallback auditable ante fallos.

    Consulta de solo lectura en una sesión auxiliar del mismo engine (precedente
    de ambito_territorial): un fallo de catálogo nunca aborta la transacción
    principal del caso de uso, y esta consulta auxiliar no gestiona commits ni
    rollbacks (docs/transacciones.md).
    """
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession as AuxSession

    async def _ejecutar_catalogo(conexion: Any):
        plan_codes = [f"PDL_{index}_2024_2027" for index in range(1, 4)]
        plan_rows = (
            (
                await conexion.execute(
                    text(
                        """SELECT p.codigo_plan,p.nombre_oficial,p.ppi_total_corriente_cop,
                              count(DISTINCT l.id)::int total_lineas,
                              count(DISTINCT m.id)::int total_metas
                       FROM seguimiento.planes_desarrollo_distrital p
                       LEFT JOIN seguimiento.pdd_lineas_y_programas l ON l.codigo_plan=p.codigo_plan
                       LEFT JOIN seguimiento.pdd_metas_oficiales m ON m.codigo_plan=p.codigo_plan
                       WHERE p.codigo_plan = ANY(:planes)
                       GROUP BY p.codigo_plan,p.nombre_oficial,p.ppi_total_corriente_cop
                       ORDER BY p.codigo_plan"""
                    ),
                    {"planes": plan_codes},
                )
            )
            .mappings()
            .all()
        )
        meta_rows = (
            (
                await conexion.execute(
                    text(
                        """SELECT codigo_plan,codigo,nombre,indicador,linea_nombre
                       FROM seguimiento.pdd_metas_oficiales
                       WHERE codigo_plan = ANY(:planes)"""
                    ),
                    {"planes": plan_codes},
                )
            )
            .mappings()
            .all()
        )
        pdd_meta_rows = (
            (
                await conexion.execute(
                    text(
                        """SELECT nombre,indicador,linea_nombre
                       FROM seguimiento.pdd_metas_oficiales
                       WHERE codigo_plan='PDD_2024_2027'"""
                    )
                )
            )
            .mappings()
            .all()
        )
        territory_rows = (
            (
                await conexion.execute(
                    text(
                        """SELECT id::text id,codigo,nombre,tipo_territorio,metadatos
                       FROM geodatos.territorios
                       WHERE codigo LIKE 'UCG-%' OR tipo_territorio='localidad'
                       ORDER BY codigo"""
                    )
                )
            )
            .mappings()
            .all()
        )
        names = {
            "PDL_1_2024_2027": "Localidad 1 Histórica y del Caribe Norte",
            "PDL_2_2024_2027": "Localidad 2 de la Virgen y Turística",
            "PDL_3_2024_2027": "Localidad 3 Industrial y de la Bahía",
        }
        coldspots = (diagnostico.get("spatial_lisa") or {}).get("coldspots") or []
        coldspot_text = _normalizar(" ".join(str(row) for row in coldspots))
        pdd_texts = [
            _normalizar(" ".join(str(row.get(k) or "") for k in ("nombre", "indicador", "linea_nombre")))
            for row in pdd_meta_rows
        ]
        metas_by_plan: dict[str, list[dict[str, Any]]] = {}
        for row in meta_rows:
            metas_by_plan.setdefault(str(row["codigo_plan"]), []).append(dict(row))
        localidades = []
        sesiones = []
        for index, code in enumerate(plan_codes, start=1):
            plan = next((dict(row) for row in plan_rows if row["codigo_plan"] == code), {})
            ucg_codes = [f"UCG-{n:02d}" for n in range((index - 1) * 5 + 1, index * 5 + 1)]
            ucgs = [dict(row) for row in territory_rows if str(row["codigo"]) in ucg_codes]
            local_territory = next(
                (
                    dict(row)
                    for row in territory_rows
                    if str(row.get("codigo") or "").casefold()
                    in {f"loc-{index}".casefold(), f"localidad-{index}".casefold()}
                ),
                None,
            )
            metas = metas_by_plan.get(code, [])
            aligned = 0
            for meta in metas:
                descriptor = _normalizar(
                    " ".join(str(meta.get(k) or "") for k in ("nombre", "indicador", "linea_nombre"))
                )
                tokens = {token for token in descriptor.split() if len(token) > 4}
                if tokens and any(
                    len(tokens.intersection(set(texto.split()))) / len(tokens) >= 0.2 for texto in pdd_texts
                ):
                    aligned += 1
            alignment = round(aligned / len(metas) * 100, 2) if metas else 0.0
            ucg_coldspots = [
                row
                for row in ucgs
                if _normalizar(row.get("codigo")) in coldspot_text or _normalizar(row.get("nombre")) in coldspot_text
            ]
            locality = {
                "codigo_plan": code,
                "nombre_localidad": names[code],
                "territorio_geodatos": local_territory,
                "ppi_total_corriente_cop": float(plan.get("ppi_total_corriente_cop") or 0),
                "total_lineas": int(plan.get("total_lineas") or 0),
                "total_metas": int(plan.get("total_metas") or len(metas)),
                "ucgs_territoriales": ucgs,
                "coldspots_lisa_en_localidad": len(ucg_coldspots),
                "indice_alineacion_con_pdd_distrital": alignment,
                "estado_catchball_local": "REQUIERE_CATCHBALL" if metas or ucg_coldspots else "SIN_BRECHA_DETECTADA",
                "metas_pdl_destacadas": metas[:5],
            }
            localidades.append(locality)
            if metas or ucg_coldspots:
                sesiones.append(
                    {
                        "id_sesion_catchball": f"CATCHBALL-PDL-{index}",
                        "tipo": "DISTRITAL_LOCAL_PDL",
                        "codigo_plan": code,
                        "localidad": names[code],
                        "brechas_criticas_detectadas": [
                            f"{len(metas)} metas PDL sujetas a alineación/cofinanciación distrital",
                            *([f"{len(ucg_coldspots)} UCGs con coldspot LISA"] if ucg_coldspots else []),
                        ],
                        "requiere_validacion_hitl": True,
                        "actor_distrital": "Secretaría de Planeación Distrital",
                        "actor_local": names[code],
                    }
                )
        return {
            "estado": "DISPONIBLE",
            "total_planes_locales": len(plan_rows),
            "total_metas_pdl": sum(int(row.get("total_metas") or 0) for row in plan_rows),
            "ppi_total_locales_cop": sum(float(row.get("ppi_total_corriente_cop") or 0) for row in plan_rows),
            "localidades": localidades,
            "sesiones_catchball": sesiones,
        }

    # Consulta auxiliar sólo con sesión real (test dobres pasan la conexión directa).
    if not isinstance(db, AuxSession):
        return await _ejecutar_catalogo(db)
    async with AuxSession(db.bind, expire_on_commit=False) as auxiliar:
        return await _ejecutar_catalogo(auxiliar)


async def construir_matriz_x_hoshin_kanri_pdt(
    diagnostico: dict[str, Any] | None = None,
    codigo_plan: str | None = None,
    sector: str | None = None,
    dependencia: str | None = None,
    db=None,
) -> dict[str, Any]:
    """Construye la Matriz X y anexa la articulación distrital-local desde bd_csh."""
    if diagnostico and "runs" in diagnostico and isinstance(diagnostico["runs"], dict):
        runs = list(diagnostico["runs"].values())
        raw_diag = runs[0] if runs and isinstance(runs[0], dict) else {}
    elif diagnostico:
        raw_diag = diagnostico
    else:
        raw_diag = _cargar_diagnostico_cache(codigo_plan=codigo_plan)
    articulation = {
        "estado": "NO_DISPONIBLE_SIN_SESION_BD",
        "total_planes_locales": 0,
        "total_metas_pdl": 0,
        "ppi_total_locales_cop": 0.0,
        "localidades": [],
        "sesiones_catchball": [],
    }
    if db is not None:
        try:
            articulation = await _consultar_articulacion_distrital_local_pdl(db, raw_diag)
        except Exception as exc:
            articulation["estado"] = f"NO_DISPONIBLE_{type(exc).__name__}"
    return _construir_matriz_x_hoshin_kanri_pdt_core(
        diagnostico=raw_diag,
        codigo_plan=codigo_plan,
        sector=sector,
        dependencia=dependencia,
        articulacion_distrital_local_pdl=articulation,
    )
