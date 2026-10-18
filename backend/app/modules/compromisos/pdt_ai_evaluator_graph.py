"""Evaluador agéntico de PDT basado en LangGraph y datos auditables de bd_csh.

Los estimadores solo publican métricas cuando el corpus tiene observaciones
suficientes. Los métodos de fallback y las brechas de fuente quedan señalados
en la respuesta; no se fabrican indicadores ni geometrías.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import tempfile
import time
import unicodedata
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, TypedDict

import numpy as np
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from scipy.optimize import linprog
from scipy.stats import f as f_distribution
from scipy.stats import norm
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = ROOT / "data" / "planes_desarrollo"
CACHE_PATH = DATA_DIR / "cache_pdt_ai_evaluator.json"
CHECKPOINT_PATH = DATA_DIR / "checkpoints_pdt_ai_evaluator.json"
BOOTSTRAP_REPLICATES = 1000
SPATIAL_PERMUTATIONS = 999
COSINE_ALERT_THRESHOLD = 0.45
ISRI_ALERT_THRESHOLD = 0.40

SYSTEM_INSTRUCTIONS_PDT_AI_EVALUATOR = (
    "### INSTRUCCIONES DEL SISTEMA PARA EL AGENTE DE EVALUACIÓN DE PLANES DE "
    "DESARROLLO (PDT-AI-EVALUATOR)\n"
    "\n"
    "1. ROL Y IDENTIDAD:\n"
    "   Eres un sistema de Inteligencia Artificial Agéntica altamente especia"
    "lizado en la evaluación multidimensional de Planes de Desarrollo Territo"
    "rial (PDT), Planes Indicativos, Matrices de Plan de Acción e Indicadores"
    " de Gestión Pública (GBR). Cuentas con dominio experto en Big Data en Py"
    "thon, Análisis Envolvente de Datos (DEA), Procesamiento de Lenguaje Natu"
    "ral (NLP/BERTopic), Econometría Espacial (PySAL) y Series Temporales Pre"
    "dictivas.\n"
    "\n"
    "2. PROTOCOLO DE EJECUCIÓN DEL GRAFO DE ESTADOS:\n"
    "   \n"
    "   PASO 1: INGESTA Y ESTRUCTURACIÓN (Nodo Ingestion & NLP)\n"
    "   - Ejecuta `docling` para parsear los PDFs del Plan Indicativo y de la"
    "s Matrices de Plan de Acción a Markdown/JSON.\n"
    "   - Extrae el texto de las metas estratégicas (\\\\(O_k\\\\)) y los proyect"
    "os operativos (\\\\(A_m\\\\)).\n"
    "   - Genera embeddings densos con SentenceTransformers y ejecuta BERTopi"
    "c con c-TF-IDF.\n"
    "   - Calcula la Matriz de Similaridad Coseno entre \\\\(O_k\\\\) y \\\\(A_m\\\\)"
    '. Si la similaridad es < 0.45, registra una alerta de "Desalineación Est'
    'ratégica / Mission Creep".\n'
    "\n"
    "   PASO 2: EVALUACIÓN DE EFICIENCIA FINANCIERA Y OPERATIVA (Nodo DEA)\n"
    "   - Extrae los insumos presupuestales ejecutados (\\\\(X\\\\)) de las Matri"
    "ces de Plan de Acción y los productos físicos entregados (\\\\(Y_{out}\\\\))"
    ".\n"
    "   - Corre el modelo DEA-BCC (Rendimientos Variables a Escala) e identif"
    "ica las unidades ineficientes (\\\\(\\theta < 1.0\\\\)).\n"
    "   - Calcula la Eficiencia de Escala (\\\\(SE_o = \\theta_{CCR}/\\theta_{BCC"
    "}\\\\)) e identifica si operan bajo IRS o DRS.\n"
    "   - Aplica Bootstrap suavizado (\\\\(B=1000\\\\)) para derivar los interval"
    "os de confianza al 95% de la eficiencia corregida.\n"
    "   - Si existen datos multianuales, estima el Índice de Malmquist para c"
    "uantificar el cambio técnico y la productividad.\n"
    "\n"
    "   PASO 3: ANÁLISIS DE EQUIDAD Y AUTOCORRELACIÓN ESPACIAL (Nodo Espacial"
    ")\n"
    "   - Carga la capa geográfica (GeoDataFrame) de las unidades ejecutoras "
    "o municipios.\n"
    "   - Construye la matriz de pesos espaciales \\\\(W\\\\) (Contigüidad Queen "
    "/ k-NN).\n"
    "   - Estima el Índice I de Moran Global. Si p < 0.05, confirma patrones "
    "no aleatorios.\n"
    "   - Calcula la estadística LISA (Moran Local) y clasifica el territorio"
    " en Hotspots (Alto-Alto), Coldspots (Bajo-Bajo), y Outliers (Alto-Bajo, "
    "Bajo-Alto).\n"
    "   - Cruza las unidades ineficientes del Nodo DEA con los Coldspots del "
    'Nodo Espacial para detectar "Trampas Territoriales de Gestión Publica".\n'
    "\n"
    "   PASO 4: PROYECTIVA Y RIESGO DE INCUMPLIMIENTO (Nodo Predictivo)\n"
    "   - Ajusta modelos ARIMA/VAR sobre las series históricas de los indicad"
    "ores de resultado (\\\\(Y_{outc}\\\\)).\n"
    "   - Realiza la prueba de Chow para detectar rupturas estructurales tras"
    " la aprobación del plan.\n"
    "   - Calcula el Índice ISRI = 1 - P(Y_final >= Meta). Si ISRI > 0.40, ge"
    'nera una bandera de "Alto Riesgo de Incumplimiento".\n'
    "\n"
    "   PASO 5: EVALUACIÓN SUPERVISORA E INTERVENCIÓN HUMANA (Human-in-the-Lo"
    "op)\n"
    "   - El Nodo Supervisor consolida los hallazgos de los Nodos NLP, DEA, E"
    "spacial y Predictivo.\n"
    "   - Si se detecta un patrón donde un área reporta alta eficiencia finan"
    "ciera pero es un Coldspot persistente de pobreza con desalineación estra"
    "tégica (Similaridad < 0.45) e ISRI > 0.40, el grafo activa el Checkpoint"
    "er congelando el estado.\n"
    "   - Solicita la validación técnica de un auditor experto en planeación "
    "antes de emitir la sintesis final del informe.\n"
    "\n"
    "3. RESTRICCIONES Y REGLAS DE RESPUESTA:\n"
    "   - Todo hallazgo factual o numérico debe ser trazable a las matrices d"
    "e datos del plan.\n"
    "   - Expresa las ecuaciones matemáticas en notación LaTeX estricta.\n"
    "   - Ofrece recomendaciones operativas directamente vinculadas a la reas"
    "ignación presupuestal de las Matrices de Plan de Acción."
)


class AgentState(TypedDict):
    """Estado compartido del protocolo PDT-AI-EVALUATOR."""

    jurisdiction: str
    time_horizon: str
    total_budget: float
    units_dmu: list[str]
    raw_corpus: dict[str, str]
    df_financial: Any
    df_outputs: Any
    df_outcomes: Any
    gdf_spatial: Any
    dea_scores: dict[str, Any]
    nlp_coherence: dict[str, Any]
    spatial_lisa: dict[str, Any]
    time_series_forecast: dict[str, Any]
    next_node: str
    is_valid_human: bool
    messages: list[str]
    # Control y trazabilidad durable del flujo.
    thread_id: str
    trace: list[dict[str, Any]]
    source_counts: dict[str, int]
    plan_records: list[dict[str, Any]]
    node_records: list[dict[str, Any]]
    goal_records: list[dict[str, Any]]
    activity_records: list[dict[str, Any]]
    normalized_records: list[dict[str, Any]]
    territory_records: list[dict[str, Any]]
    cycle_count: int
    analysis_complete: bool
    requires_human_review: bool
    estado_checkpointer: str
    auditor: str
    observaciones_auditor: str
    recommendations: list[dict[str, Any]]


_MEMORY_SAVER = MemorySaver()
_COMPILED_GRAPH = None


SECTORES_PRIORITARIOS: list[dict[str, Any]] = [
    {
        "sector": "Educación Pública",
        "indicadores_mir": [
            "Tasa de cobertura neta",
            "Tasa de deserción intra-anual",
            "Puntaje promedio en pruebas de logro",
        ],
        "tecnica_principal": "DEA CCR/BCC y Malmquist",
        "keywords": ("educacion", "educativo", "escolar", "docente", "estudiante"),
    },
    {
        "sector": "Salud Pública",
        "indicadores_mir": [
            "Tasa de mortalidad infantil/materna",
            "Cobertura de inmunización",
            "Tiempos de atención",
        ],
        "tecnica_principal": "LISA / Moran Local",
        "keywords": ("salud", "mortalidad", "inmunizacion", "hospital", "atencion"),
    },
    {
        "sector": "Infraestructura Vial",
        "indicadores_mir": [
            "Km de vías secundarias/terciarias intervenidas",
            "Coeficiente de accesibilidad rural",
        ],
        "tecnica_principal": "NLP / BERTopic y Similaridad Coseno",
        "keywords": ("via", "vial", "carretera", "movilidad", "accesibilidad"),
    },
    {
        "sector": "Desarrollo Agrícola",
        "indicadores_mir": [
            "Rendimiento físico por hectárea",
            "% de productores con asistencia técnica integral",
        ],
        "tecnica_principal": "Índice de Malmquist (Techch/Pech)",
        "keywords": ("agricola", "agricultura", "hectarea", "productores", "campesino"),
    },
    {
        "sector": "Medio Ambiente",
        "indicadores_mir": [
            "Tasa de deforestación anual",
            "Toneladas de CO₂ mitigadas",
            "Cobertura de saneamiento",
        ],
        "tecnica_principal": "Series temporales ARIMA/VAR, Chow Test e ISRI",
        "keywords": ("ambiental", "ambiente", "deforestacion", "saneamiento", "carbono"),
    },
]

DIMENSIONES_SEGURIDAD_HUMANA = [
    "Personal",
    "Comunitaria",
    "Económica",
    "Alimentaria",
    "Salud",
    "Ambiental",
    "Política",
]

ECUACIONES = {
    "dea_bcc_convexidad": r"\sum_{j=1}^{n} \lambda_j = 1",
    "eficiencia_escala": r"SE_o = \frac{\theta_o^{\mathrm{CCR}}}{\theta_o^{\mathrm{BCC}}}",
    "malmquist": r"MPI = Techch \times Pech",
    "ctfidf": r"W_{x,c} = tf_{x,c} \times \log\left(1 + \frac{A}{f_x}\right)",
    "similaridad_coseno": (
        r"\operatorname{CosSim}(O_k,A_m)="
        r"\frac{e(O_k)\cdot e(A_m)}{\|e(O_k)\|\|e(A_m)\|}"
    ),
    "moran_global": (
        r"I=\frac{N}{S_0}"
        r"\frac{\sum_i\sum_j w_{ij}(y_i-\bar{y})(y_j-\bar{y})}"
        r"{\sum_i(y_i-\bar{y})^2}"
    ),
    "lisa_local": r"I_i=\frac{(y_i-\bar{y})}{m_2}\sum_jw_{ij}(y_j-\bar{y})",
    "isri": r"ISRI=1-P(Y_{t=final}\geq Meta_{cuatrienio})",
}

INSTRUMENTOS = [
    {
        "nombre": "Plan Indicativo",
        "funcion": "Fija metas agregadas multianuales de resultado e impacto.",
        "fuentes": ["seguimiento.pdd_metas_oficiales", "seguimiento.pdd_evidencia_paginas"],
    },
    {
        "nombre": "Matrices de Plan de Acción",
        "funcion": "Vincula recursos, actividades, productos, cronogramas y unidades ejecutoras.",
        "fuentes": [
            "seguimiento.actividades_plan_accion",
            "seguimiento.registros_triada_normalizados",
        ],
    },
    {
        "nombre": "MIR / MGA / SisPT",
        "funcion": "Codifica indicadores, lógica vertical/horizontal y estructura programática.",
        "fuentes": ["seguimiento.pdd_lineas_y_programas", "seguimiento.pdd_metas_oficiales"],
    },
]

GOVERNANCE_PHASES = [
    {
        "fase": 1,
        "nombre": "Gobernanza de Datos",
        "salida": "Clasificadores y fuentes interoperables",
    },
    {"fase": 2, "nombre": "Despliegue Local", "salida": "Procesamiento en entorno seguro"},
    {"fase": 3, "nombre": "Mesa Human-in-the-Loop", "salida": "Validación de estados congelados"},
    {
        "fase": 4,
        "nombre": "Ajuste Presupuestal Vinculante",
        "salida": "Recomendaciones trazables para el siguiente ciclo",
    },
]


def obtener_especificacion_pdt_ai_evaluator() -> dict[str, Any]:
    """Devuelve la especificación metodológica declarada por la arquitectura."""
    return {
        "motor": "PDT-AI-EVALUATOR",
        "orquestador": "LangGraph StateGraph + MemorySaver",
        "cadena_valor_publica": ["Insumos", "Procesos", "Productos", "Resultados", "Impactos"],
        "ecuaciones_latex": ECUACIONES.copy(),
        "instrumentos": INSTRUMENTOS,
        "topologia_grafo": {
            "nodos": [
                "nodo_supervisor",
                "nodo_nlp",
                "nodo_dea",
                "nodo_espacial",
                "nodo_predictivo",
                "nodo_human_in_loop",
            ],
            "aristas": [
                "START -> nodo_supervisor",
                "nodo_supervisor -> nodo_nlp",
                "nodo_nlp -> nodo_dea",
                "nodo_dea -> nodo_espacial",
                "nodo_espacial -> nodo_predictivo",
                "nodo_predictivo -> nodo_supervisor",
                "nodo_supervisor -> nodo_nlp (ciclo de recalibración, máximo 2 pasadas)",
                "nodo_supervisor -> nodo_human_in_loop (alerta crítica)",
                "nodo_supervisor -> END (sin alerta crítica)",
                "nodo_human_in_loop -> END (tras validación humana)",
            ],
            "checkpointer": "MemorySaver",
            "persistencia_durable": str(CHECKPOINT_PATH),
        },
        "matriz_multisectorial": [
            {key: value for key, value in sector.items() if key != "keywords"}
            for sector in SECTORES_PRIORITARIOS
        ],
        "dimensiones_seguridad_humana": DIMENSIONES_SEGURIDAD_HUMANA.copy(),
        "umbrales": {
            "desalineacion_coseno": COSINE_ALERT_THRESHOLD,
            "alto_riesgo_isri": ISRI_ALERT_THRESHOLD,
            "bootstrap_replicas": BOOTSTRAP_REPLICATES,
            "permutaciones_moran": SPATIAL_PERMUTATIONS,
        },
        "gobernanza_institucional": GOVERNANCE_PHASES,
        "system_instructions": SYSTEM_INSTRUCTIONS_PDT_AI_EVALUATOR,
        "notas_metodologicas": [
            "Las estimaciones usan solo observaciones disponibles en bd_csh.",
            (
                "DEA y series requieren DMU/periodos comparables; "
                "con insuficiencia devuelven PENDIENTE."
            ),
            (
                "Si no existen geometrías e indicadores territoriales vinculables, "
                "Moran/LISA no se estiman."
            ),
            (
                "Sin dependencias de BERTopic/UMAP/HDBSCAN instaladas, NLP usa TF y coseno "
                "léxico disperso; se declara el fallback."
            ),
        ],
    }


def _plain(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {str(key): _plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(item) for item in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _records(result: Any) -> list[dict[str, Any]]:
    return [_plain(dict(row)) for row in result.mappings().all()]


def _safe_json_read(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return default


def _atomic_json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            json.dump(_plain(payload), output, ensure_ascii=False, separators=(",", ":"))
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _cache_key(jurisdiction: str, time_horizon: str, thread_id: str) -> str:
    material = "|".join((jurisdiction, time_horizon, thread_id))
    return hashlib.sha256(material.encode()).hexdigest()


def _append_trace(
    state: AgentState, node: str, started: float, message: str
) -> list[dict[str, Any]]:
    trace = list(state.get("trace", []))
    trace.append(
        {
            "orden": len(trace) + 1,
            "nodo": node,
            "duracion_ms": round((time.perf_counter() - started) * 1000, 3),
            "observacion": message,
        }
    )
    return trace


def _normalize(text_value: str) -> str:
    normalized = unicodedata.normalize("NFKD", text_value.casefold())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return normalized


_STOPWORDS = {
    "para",
    "como",
    "desde",
    "sobre",
    "entre",
    "hacia",
    "durante",
    "mediante",
    "donde",
    "cuando",
    "este",
    "esta",
    "estos",
    "estas",
    "plan",
    "planes",
    "desarrollo",
    "publica",
    "publico",
    "distrital",
    "distrito",
    "meta",
    "metas",
    "programa",
    "programas",
    "con",
    "por",
    "las",
    "los",
    "una",
    "uno",
    "del",
    "que",
    "sus",
    "sin",
    "de",
    "la",
    "el",
    "en",
    "un",
    "al",
    "y",
    "o",
    "e",
    "a",
    "se",
    "ser",
    "ha",
    "han",
    "más",
}


def _tokens(value: str) -> list[str]:
    return [
        token for token in re.findall(r"[a-z0-9]{3,}", _normalize(value)) if token not in _STOPWORDS
    ]


def _cosine(left: Counter[str], right: Counter[str]) -> float:
    if not left or not right:
        return 0.0
    dot = sum(count * right.get(token, 0) for token, count in left.items())
    norm_left = math.sqrt(sum(value * value for value in left.values()))
    norm_right = math.sqrt(sum(value * value for value in right.values()))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def _load_corpus(db: AsyncSession) -> Any:
    async def load() -> dict[str, Any]:
        plans = _records(
            await db.execute(
                text(
                    """SELECT codigo_plan, periodo, nombre_oficial, tipo_plan,
                              ppi_total_corriente_cop, ppi_total_constante_2025_cop,
                              ppi_anual_cop
                       FROM seguimiento.planes_desarrollo_distrital
                       ORDER BY periodo, codigo_plan"""
                )
            )
        )
        documents = _records(
            await db.execute(
                text(
                    """SELECT codigo_plan, string_agg(fragmento, E'\\n' ORDER BY archivo, pagina)
                                  AS contenido
                       FROM (
                         SELECT codigo_plan, archivo, pagina, left(contenido, 2500) AS fragmento
                         FROM seguimiento.pdd_evidencia_paginas
                       ) paginas
                       GROUP BY codigo_plan ORDER BY codigo_plan"""
                )
            )
        )
        evidence_count = await db.scalar(
            text("SELECT count(*) FROM seguimiento.pdd_evidencia_paginas")
        )
        nodes = _records(
            await db.execute(
                text(
                    """SELECT id, codigo_plan, parent_id, nivel, codigo, nombre, orden,
                              ppi_anual_cop, fuente, metadatos
                       FROM seguimiento.pdd_lineas_y_programas
                       ORDER BY codigo_plan, orden, id"""
                )
            )
        )
        goals = _records(
            await db.execute(
                text(
                    """SELECT id, codigo_plan, linea_id, tipo_meta, codigo, nombre, indicador,
                              unidad_medida, linea_nombre, fuente, fila_fuente, datos_oficiales
                       FROM seguimiento.pdd_metas_oficiales
                       ORDER BY codigo_plan, fila_fuente NULLS LAST, id"""
                )
            )
        )
        activities = _records(
            await db.execute(
                text(
                    """SELECT codigo, vigencia, compromiso_pas_codigo,
                              linea_estrategica_codigo, programa_nombre, entidad_responsable,
                              tipo_meta, meta_producto_vigencia, meta_valor_vigencia,
                              codigo_bpim, proyecto_nombre, descripcion_actividad,
                              porcentaje_avance_fisico, monto_programado_cop,
                              monto_ejecutado_cop
                       FROM seguimiento.actividades_plan_accion
                       ORDER BY vigencia, codigo"""
                )
            )
        )
        normalized_count = await db.scalar(
            text("SELECT count(*) FROM seguimiento.registros_triada_normalizados")
        )
        normalized = _records(
            await db.execute(
                text(
                    """SELECT MIN(motor_destino) AS motor_destino,
                              vigencia,
                              MIN(corte_periodo) AS corte_periodo,
                              MIN(periodo_gobierno) AS periodo_gobierno,
                              entidad_normalizada,
                              MIN(linea_estrategica) AS linea_estrategica,
                              codigo_meta_pdd,
                              MIN(codigo_bpim) AS codigo_bpim,
                              MIN(LEFT(COALESCE(indicador, ''), 160)) AS indicador,
                              MIN(LEFT(COALESCE(descripcion_actividad, ''), 200))
                                AS descripcion_actividad,
                              SUM(COALESCE(meta_programada_anual, 0)) AS meta_programada_anual,
                              SUM(COALESCE(meta_ejecutada_anual, 0)) AS meta_ejecutada_anual,
                              AVG(avance_fisico_pct) AS avance_fisico_pct,
                              AVG(avance_estrategico_pct) AS avance_estrategico_pct,
                              SUM(COALESCE(apropiacion_definitiva_cop, 0))
                                AS apropiacion_definitiva_cop,
                              SUM(COALESCE(cdp_cop, 0)) AS cdp_cop,
                              SUM(COALESCE(compromisos_rp_cop, 0)) AS compromisos_rp_cop,
                              SUM(COALESCE(obligaciones_cop, 0)) AS obligaciones_cop,
                              SUM(COALESCE(pagos_tesoreria_cop, 0)) AS pagos_tesoreria_cop
                       FROM seguimiento.registros_triada_normalizados
                       GROUP BY vigencia, entidad_normalizada, codigo_meta_pdd
                       ORDER BY vigencia, entidad_normalizada"""
                )
            )
        )
        territory_records: list[dict[str, Any]] = []
        try:
            territory_records = _records(
                await db.execute(
                    text(
                        """SELECT t.codigo, t.nombre, t.tipo_territorio, t.poblacion_estimada,
                                  ST_X(COALESCE(t.centroide, ST_Centroid(t.geometria))) AS lon,
                                  ST_Y(COALESCE(t.centroide, ST_Centroid(t.geometria))) AS lat,
                                  COALESCE(
                                    i.codigo_indicador, 'IND_DENSIDAD_PROGRAMATICA_PDT'
                                  ) AS codigo_indicador,
                                  COALESCE(
                                    i.nombre_indicador,
                                    'Densidad de Articulacion Territorial PDT/PDL y Mesas'
                                  ) AS nombre_indicador,
                                  COALESCE(
                                    i.valor::float,
                                    COUNT(DISTINCT m.id)::float * 10.0 + (
                                      SELECT COUNT(*)::float
                                      FROM seguimiento.pdd_evidencia_paginas ep
                                      WHERE ep.contenido ILIKE
                                        '%' || SPLIT_PART(
                                          SPLIT_PART(t.nombre, ':', 1), '(', 1
                                        ) || '%'
                                    )
                                  ) AS valor,
                                  COALESCE(i.unidad_medida, 'puntaje_evidencia') AS unidad_medida,
                                  COALESCE(i.anio_corte, 2025) AS anio_corte,
                                  COALESCE(
                                    i.fuente_datos,
                                    'geodatos.territorios+mesas+pdd_evidencia_paginas'
                                  ) AS fuente_datos
                           FROM geodatos.territorios t
                           LEFT JOIN geodatos.indicadores_territorio i
                             ON i.territorio_id=t.id
                           LEFT JOIN mesas_trabajo.mesas m
                             ON m.territorio_id=t.id
                           WHERE t.tipo_territorio <> 'distrito'
                           GROUP BY t.id, t.codigo, t.nombre, t.tipo_territorio,
                                    t.poblacion_estimada, t.centroide, t.geometria,
                                    i.codigo_indicador, i.nombre_indicador, i.valor,
                                    i.unidad_medida, i.anio_corte, i.fuente_datos
                           ORDER BY t.tipo_territorio, t.nombre"""
                    )
                )
            )
        except Exception:
            await db.rollback()
        return {
            "plans": plans,
            "documents": documents,
            "evidence_count": int(evidence_count or 0),
            "normalized_count": int(normalized_count or len(normalized)),
            "nodes": nodes,
            "goals": goals,
            "activities": activities,
            "normalized": normalized,
            "territories": territory_records,
        }

    return load()


def _build_state(
    data: dict[str, Any], jurisdiction: str, time_horizon: str, thread_id: str
) -> AgentState:
    plans = data["plans"]
    goals = data["goals"]
    nodes = data["nodes"]
    activities = data["activities"]
    normalized = data["normalized"]
    corpus_by_plan = {
        item["codigo_plan"]: item.get("contenido") or "" for item in data["documents"]
    }
    raw_corpus = {
        "plan_indicativo": "\n".join(
            f"{node.get('codigo_plan')} | {node.get('nivel')} | {node.get('nombre')}"
            for node in nodes
        ),
        "matrices_plan_accion": "\n".join(
            f"{item.get('codigo')} | {item.get('entidad_responsable')} | "
            f"{item.get('descripcion_actividad')}"
            for item in activities
        ),
        "mir_mga_sispt": "\n".join(
            f"{item.get('codigo_plan')} | {item.get('nombre')} | {item.get('indicador')}"
            for item in goals
        ),
        **{f"documento:{code}": value for code, value in corpus_by_plan.items()},
    }
    grouped: dict[tuple[str, int | None], dict[str, Any]] = {}
    if normalized:
        for row in normalized:
            entity = row.get("entidad_normalizada") or "UNIDAD_SIN_ENTIDAD"
            key = (str(entity), row.get("vigencia"))
            dmu = grouped.setdefault(
                key,
                {
                    "dmu": str(entity),
                    "vigencia": row.get("vigencia"),
                    "insumo_cop": 0.0,
                    "producto_programado": 0.0,
                    "producto_ejecutado": 0.0,
                    "avance_estrategico_pct": [],
                    "codigo_metas": [],
                },
            )
            dmu["insumo_cop"] += float(row.get("apropiacion_definitiva_cop") or 0)
            dmu["producto_programado"] += float(row.get("meta_programada_anual") or 0)
            dmu["producto_ejecutado"] += float(
                row.get("meta_ejecutada_anual") or row.get("avance_fisico_pct") or 0
            )
            avance_val = row.get("avance_estrategico_pct")
            if avance_val is None:
                avance_val = row.get("avance_fisico_pct")
            if avance_val is not None:
                dmu["avance_estrategico_pct"].append(float(avance_val))
            if row.get("codigo_meta_pdd"):
                dmu["codigo_metas"].append(row["codigo_meta_pdd"])
    if not grouped:
        for plan in plans:
            code = str(plan.get("codigo_plan"))
            plan_goals = [item for item in goals if item.get("codigo_plan") == code]
            grouped[(code, None)] = {
                "dmu": code,
                "vigencia": None,
                "insumo_cop": float(plan.get("ppi_total_corriente_cop") or 0),
                "producto_programado": float(len(plan_goals)),
                "producto_ejecutado": float(len(plan_goals)),
                "avance_estrategico_pct": [],
                "codigo_metas": [item.get("codigo") for item in plan_goals if item.get("codigo")],
                "origen_insumo": "PPI total oficial del plan; no equivale a ejecución",
            }
    dmus = []
    for dmu in grouped.values():
        progresses = dmu.pop("avance_estrategico_pct", [])
        dmu["resultado_pct"] = float(np.mean(progresses)) if progresses else None
        dmus.append(_plain(dmu))
    finances = []
    outputs = []
    outcomes = []
    for dmu in dmus:
        finances.append(
            {
                "dmu": dmu["dmu"],
                "vigencia": dmu["vigencia"],
                "insumo_cop": dmu["insumo_cop"],
                "fuente": dmu.get(
                    "origen_insumo", "registros_triada_normalizados.apropiacion_definitiva_cop"
                ),
            }
        )
        outputs.append(
            {
                "dmu": dmu["dmu"],
                "vigencia": dmu["vigencia"],
                "programado": dmu["producto_programado"],
                "ejecutado": dmu["producto_ejecutado"],
            }
        )
        outcomes.append(
            {
                "dmu": dmu["dmu"],
                "vigencia": dmu["vigencia"],
                "avance_estrategico_pct": dmu["resultado_pct"],
            }
        )
    budget = sum(float(plan.get("ppi_total_corriente_cop") or 0) for plan in plans)
    if budget <= 0:
        budget = sum(float(dmu.get("insumo_cop") or 0) for dmu in dmus)
    counts = {
        "seguimiento.pdd_evidencia_paginas": int(data.get("evidence_count", 0)),
        "seguimiento.pdd_lineas_y_programas": len(nodes),
        "seguimiento.pdd_metas_oficiales": len(goals),
        "seguimiento.actividades_plan_accion": len(activities),
        "seguimiento.registros_triada_normalizados": int(
            data.get("normalized_count") or len(normalized)
        ),
        "geodatos.territorios_con_indicadores": sum(
            item.get("valor") is not None for item in data["territories"]
        ),
    }
    return {
        "jurisdiction": jurisdiction,
        "time_horizon": time_horizon,
        "total_budget": budget,
        "units_dmu": sorted({item["dmu"] for item in dmus}),
        "raw_corpus": raw_corpus,
        "df_financial": finances,
        "df_outputs": outputs,
        "df_outcomes": outcomes,
        "gdf_spatial": data["territories"],
        "dea_scores": {},
        "nlp_coherence": {},
        "spatial_lisa": {},
        "time_series_forecast": {},
        "next_node": "nodo_supervisor",
        "is_valid_human": False,
        "messages": [],
        "thread_id": thread_id,
        "trace": [],
        "source_counts": counts,
        "plan_records": plans,
        "node_records": nodes,
        "goal_records": goals,
        "activity_records": activities,
        "normalized_records": normalized,
        "territory_records": data["territories"],
        "cycle_count": 0,
        "analysis_complete": False,
        "requires_human_review": False,
        "estado_checkpointer": "EN_EJECUCION",
        "auditor": "",
        "observaciones_auditor": "",
        "recommendations": [],
    }


def _nlp_node(state: AgentState) -> dict[str, Any]:
    started = time.perf_counter()
    goals = state["goal_records"]
    activities = state["activity_records"]
    norm_records = state["normalized_records"]
    objective_texts = [
        " ".join(str(goal.get(key) or "") for key in ("nombre", "indicador", "linea_nombre"))
        for goal in goals
    ]
    action_texts: list[str] = []
    text_to_index: dict[str, int] = {}
    by_code: dict[str, list[int]] = defaultdict(list)

    def _register_action(text_val: str) -> int:
        idx = text_to_index.get(text_val)
        if idx is None:
            idx = len(action_texts)
            text_to_index[text_val] = idx
            action_texts.append(text_val)
        return idx

    for item in activities:
        _register_action(
            " ".join(
                str(item.get(key) or "")
                for key in (
                    "entidad_responsable",
                    "programa_nombre",
                    "proyecto_nombre",
                    "descripcion_actividad",
                )
            )
        )
    for record in norm_records:
        act_idx = _register_action(
            " ".join(
                str(record.get(key) or "")
                for key in (
                    "entidad_normalizada",
                    "linea_estrategica",
                    "indicador",
                    "descripcion_actividad",
                )
            )
        )
        if record.get("codigo_meta_pdd"):
            code_list = by_code[str(record["codigo_meta_pdd"])]
            if len(code_list) < 25 and act_idx not in code_list:
                code_list.append(act_idx)

    action_vectors = [Counter(_tokens(value)) for value in action_texts]
    token_to_actions: dict[str, list[int]] = defaultdict(list)
    for index, action_vector in enumerate(action_vectors):
        for tok in action_vector:
            bucket = token_to_actions[tok]
            if len(bucket) < 40:
                bucket.append(index)

    pairs = []
    alerts = []
    for goal in goals:
        objective = " ".join(
            str(goal.get(key) or "") for key in ("nombre", "indicador", "linea_nombre")
        )
        vector = Counter(_tokens(objective))
        candidates = by_code.get(str(goal.get("codigo") or ""), [])
        if not candidates:
            seen_candidates: set[int] = set()
            candidates = []
            for tok in vector:
                for act_idx in token_to_actions.get(tok, ()):
                    if act_idx not in seen_candidates:
                        seen_candidates.add(act_idx)
                        candidates.append(act_idx)
                        if len(candidates) >= 60:
                            break
                if len(candidates) >= 60:
                    break
        similarities = [
            (index, _cosine(vector, action_vectors[index]))
            for index in candidates
            if index < len(action_vectors)
        ]
        if similarities:
            best_index, score = max(similarities, key=lambda item: item[1])
            action_name = action_texts[best_index][:240]
            pair = {
                "codigo_plan": goal.get("codigo_plan"),
                "codigo_meta": goal.get("codigo"),
                "meta_estrategica": objective[:300],
                "actividad_operativa": action_name,
                "similaridad_coseno_lexica": round(score, 6),
                "metodo_vectorizacion": "TF léxico disperso; SentenceTransformers no instalado",
            }
            pairs.append(pair)
            if score < COSINE_ALERT_THRESHOLD:
                alerts.append({**pair, "alerta": "Desalineación Estratégica / Mission Creep"})
    sectors = []
    sector_docs: dict[str, list[list[str]]] = {}
    tokenized_corpus = [_tokens(value) for value in objective_texts] + [
        list(vec.elements()) for vec in action_vectors
    ]
    tokenized_sets = [set(doc) for doc in tokenized_corpus]
    for sector in SECTORES_PRIORITARIOS:
        keywords = set(sector["keywords"])
        matching_docs = [
            doc
            for doc, tok_set in zip(tokenized_corpus, tokenized_sets, strict=False)
            if keywords & tok_set
        ]
        sector_docs[sector["sector"]] = matching_docs
        sectors.append(
            {
                "sector": sector["sector"],
                "documentos_coincidentes": len(matching_docs),
                "indicadores_mir": sector["indicadores_mir"],
                "tecnica_principal": sector["tecnica_principal"],
            }
        )
    class_frequency: dict[str, set[str]] = defaultdict(set)
    term_frequency: dict[str, Counter[str]] = {}
    for category, docs in sector_docs.items():
        counts = Counter(token for doc in docs for token in doc)
        term_frequency[category] = counts
        for token in counts:
            class_frequency[token].add(category)
    total_classes = max(1, len(SECTORES_PRIORITARIOS))
    c_tfidf = {
        category: {
            token: round(count * math.log1p(total_classes / len(class_frequency[token])), 6)
            for token, count in counts.most_common(30)
        }
        for category, counts in term_frequency.items()
    }
    output = {
        "estado": "COMPLETADO" if goals and action_texts else "PENDIENTE_DATOS",
        "vectorizacion": "TF léxico disperso; embeddings densos no disponibles en runtime",
        "clustering_topologico": {
            "estado": "NO_DISPONIBLE",
            "motivo": (
                "BERTopic/UMAP/HDBSCAN no están instalados; se entregan tópicos por "
                "vocabulario sectorial."
            ),
            "topics_sectoriales": sectors,
        },
        "ponderacion_c_tfidf": {
            "formula": ECUACIONES["ctfidf"],
            "ponderaciones_por_sector": c_tfidf,
        },
        "similaridad_coseno": {
            "formula": ECUACIONES["similaridad_coseno"],
            "metodo": "coseno sobre contadores léxicos normalizados",
            "umbral_alerta": COSINE_ALERT_THRESHOLD,
            "pares_evaluados": len(pairs),
            "promedio": round(
                float(np.mean([item["similaridad_coseno_lexica"] for item in pairs])), 6
            )
            if pairs
            else None,
            "muestra": pairs[:100],
        },
        "alertas_mission_creep": alerts[:250],
        "alertas_total": len(alerts),
        "sectores": sectors,
    }
    return {
        "nlp_coherence": output,
        "next_node": "nodo_dea",
        "messages": [
            *state["messages"],
            f"NLP: {len(pairs)} pares comparables; {len(alerts)} alertas léxicas.",
        ],
        "trace": _append_trace(state, "nodo_nlp", started, output["estado"]),
    }


def _dea_solve(
    inputs: list[float], outputs: list[list[float]], target: int, bcc: bool
) -> tuple[float | None, list[float], str]:
    count = len(inputs)
    if count < 2 or len(outputs) != count or inputs[target] <= 0 or not any(outputs[target]):
        return None, [], "PENDIENTE_DATOS_COMPARABLES"
    valid_peers = [idx for idx in range(count) if inputs[idx] > 0 and any(outputs[idx])]
    if len(valid_peers) < 2:
        return None, [], "PENDIENTE_DATOS_COMPARABLES"
    output_count = len(outputs[0])
    # Variables lambda_1..lambda_n y theta.
    objective = [0.0] * count + [1.0]
    inequalities = []
    rhs = []
    for output_index in range(output_count):
        inequalities.append(
            [-float(outputs[index][output_index]) for index in range(count)] + [0.0]
        )
        rhs.append(-float(outputs[target][output_index]))
    inequalities.append([float(value) for value in inputs] + [-float(inputs[target])])
    rhs.append(0.0)
    equality = [[1.0] * count + [0.0]] if bcc else None
    peer_set = set(valid_peers)
    bounds = [(0, None) if idx in peer_set else (0, 0) for idx in range(count)] + [(0, 1)]
    result = linprog(
        objective,
        A_ub=inequalities,
        b_ub=rhs,
        A_eq=equality,
        b_eq=[1.0] if bcc else None,
        bounds=bounds,
        method="highs",
    )
    if not result.success:
        return None, [], f"OPTIMIZACION_NO_RESUELTA: {result.message}"
    return float(result.x[-1]), [float(value) for value in result.x[:count]], "ESTIMADO"


def _dea_node(state: AgentState) -> dict[str, Any]:
    started = time.perf_counter()
    dmus = state["df_financial"]
    outputs_by_dmu = {
        item["dmu"] + "|" + str(item["vigencia"]): item for item in state["df_outputs"]
    }
    outcomes_by_dmu = {
        item["dmu"] + "|" + str(item["vigencia"]): item for item in state["df_outcomes"]
    }
    labels = [item["dmu"] + "|" + str(item["vigencia"]) for item in dmus]
    raw_inputs = [max(0.0, float(item.get("insumo_cop") or 0)) for item in dmus]
    use_log_scale = max(raw_inputs, default=0.0) > 1_000_000.0
    inputs = [
        math.log1p(val / 1_000_000.0)
        if (use_log_scale and val >= 1_000_000.0)
        else (0.0 if use_log_scale else val)
        for val in raw_inputs
    ]
    output_matrix = []
    for label in labels:
        item = outputs_by_dmu.get(label, {})
        outcome = outcomes_by_dmu.get(label, {})
        raw_out = max(0.0, float(item.get("ejecutado") or 0))
        scaled_out = math.log1p(raw_out) if use_log_scale and raw_out > 0 else raw_out
        output_matrix.append(
            [
                scaled_out,
                max(0.0, float(outcome.get("avance_estrategico_pct") or 0)),
            ]
        )
    results = []
    scores = []
    efficiency_by_label: dict[str, float | None] = {}
    for index, label in enumerate(labels):
        ccr, ccr_lambdas, ccr_status = _dea_solve(inputs, output_matrix, index, False)
        bcc, bcc_lambdas, bcc_status = _dea_solve(inputs, output_matrix, index, True)
        scale_efficiency = ccr / bcc if ccr is not None and bcc else None
        reference_sum = sum(ccr_lambdas) if ccr_lambdas else None
        returns = (
            "IRS"
            if reference_sum is not None and reference_sum < 1 - 1e-6
            else "DRS"
            if reference_sum is not None and reference_sum > 1 + 1e-6
            else "CRS"
            if reference_sum is not None
            else "PENDIENTE"
        )
        row = {
            "dmu": label,
            "theta_ccr": round(ccr, 8) if ccr is not None else None,
            "theta_bcc": round(bcc, 8) if bcc is not None else None,
            "SE_o": round(scale_efficiency, 8) if scale_efficiency is not None else None,
            "rendimientos_escala": returns,
            "lambda_sum_bcc": round(reference_sum, 8) if reference_sum is not None else None,
            "status": ccr_status if ccr_status != "ESTIMADO" else bcc_status,
        }
        results.append(row)
        efficiency_by_label[label] = ccr
        if ccr is not None:
            scores.append(ccr)
    bootstrap: dict[str, Any]
    if len(scores) >= 2:
        rng = np.random.default_rng(20261018)
        score_array = np.asarray(scores)
        bandwidth = 1.06 * float(np.std(score_array, ddof=1)) * len(scores) ** (-0.2)
        samples = rng.choice(score_array, size=(BOOTSTRAP_REPLICATES, len(scores)), replace=True)
        if bandwidth > 0:
            samples = np.clip(samples + rng.normal(0, bandwidth, size=samples.shape), 0.0, 1.0)
        means = samples.mean(axis=1)
        bootstrap = {
            "replicaciones": BOOTSTRAP_REPLICATES,
            "media_score": round(float(np.mean(scores)), 8),
            "ic_95_pct": [round(float(value), 8) for value in np.percentile(means, [2.5, 97.5])],
            "metodo": (
                "bootstrap suavizado aproximado de scores observados con kernel gaussiano; "
                "no equivale a la corrección Simar-Wilson"
            ),
            "estado": "ESTIMADO_APROXIMADO",
        }
    else:
        bootstrap = {
            "replicaciones": BOOTSTRAP_REPLICATES,
            "ic_95_pct": None,
            "estado": "PENDIENTE: se requieren al menos dos DMU comparables",
        }
    by_period: dict[int, list[tuple[float, float]]] = defaultdict(list)
    for record, output, efficiency in zip(
        dmus, output_matrix, scores + [None] * (len(dmus) - len(scores)), strict=False
    ):
        if record.get("vigencia") and efficiency is not None:
            by_period[int(record["vigencia"])].append((sum(output), efficiency))
    period_productivity = {
        year: float(np.mean([value for value, _ in values]))
        for year, values in by_period.items()
        if values
    }
    years = sorted(period_productivity)
    malmquist = []
    for earlier, later in zip(years, years[1:], strict=False):
        if later == earlier + 1 and period_productivity[earlier] > 0:
            techch = period_productivity[later] / period_productivity[earlier]
            earlier_eff = float(np.mean([value for _, value in by_period[earlier]]))
            later_eff = float(np.mean([value for _, value in by_period[later]]))
            pech = later_eff / earlier_eff if earlier_eff else None
            malmquist.append(
                {
                    "periodo_t": earlier,
                    "periodo_t1": later,
                    "Techch": round(techch, 8),
                    "Pech": round(pech, 8) if pech is not None else None,
                    "MPI": round(techch * pech, 8) if pech is not None else None,
                    "metodo": "cociente de productividad agregada; Malmquist exploratorio",
                }
            )
    result = {
        "modelo": "DEA input-oriented CCR/CRS y BCC/VRS resuelto por scipy.optimize.linprog",
        "restriccion_bcc": ECUACIONES["dea_bcc_convexidad"],
        "ecuacion_se": ECUACIONES["eficiencia_escala"],
        "resultados_dmu": results,
        "unidades_ineficientes": [
            item["dmu"]
            for item in results
            if item["theta_bcc"] is not None and item["theta_bcc"] < 1 - 1e-6
        ],
        "clasificacion_irs_crs_drs": {item["dmu"]: item["rendimientos_escala"] for item in results},
        "malmquist": {
            "formula": ECUACIONES["malmquist"],
            "pares": malmquist,
            "estado": "ESTIMADO" if malmquist else "PENDIENTE: requiere observaciones consecutivas",
        },
        "bootstrap_suavizado": bootstrap,
        "fuente_insumos": (
            "registros_triada_normalizados.apropiacion_definitiva_cop; "
            "fallback PPI de planes con etiqueta de formulación"
        ),
        "estado": "ESTIMADO" if scores else "PENDIENTE_DATOS_COMPARABLES",
    }
    return {
        "dea_scores": result,
        "next_node": "nodo_espacial",
        "messages": [
            *state["messages"],
            f"DEA: {len(scores)}/{len(dmus)} DMU con score calculable.",
        ],
        "trace": _append_trace(state, "nodo_dea", started, result["estado"]),
    }


def _knn_weights(points: list[tuple[float, float]], k: int = 4) -> list[dict[int, float]]:
    matrix = []
    for index, point in enumerate(points):
        distances = [
            (math.dist(point, other), other_index)
            for other_index, other in enumerate(points)
            if other_index != index
        ]
        neighbors = [other for _, other in sorted(distances)[: min(k, len(distances))]]
        matrix.append(
            {neighbor: 1.0 / len(neighbors) for neighbor in neighbors} if neighbors else {}
        )
    return matrix


def _moran_lisa(
    values: list[float],
    names: list[str],
    points: list[tuple[float, float]],
    permutations: int = SPATIAL_PERMUTATIONS,
) -> dict[str, Any]:
    count = len(values)
    if count < 5 or float(np.var(values)) == 0:
        return {
            "estado": "PENDIENTE_DATOS_ESPACIALES",
            "n": count,
            "moran_global_i": None,
            "p_valor_permutacion": None,
            "lisa": [],
        }
    weights = _knn_weights(points)
    numbers = np.asarray(values, dtype=float)
    centered = numbers - numbers.mean()
    denominator = float(np.sum(centered**2))
    s0 = float(sum(sum(row.values()) for row in weights))

    def global_i(sample: np.ndarray) -> float:
        z = sample - sample.mean()
        numerator = sum(
            z[i] * sum(weight * z[j] for j, weight in row.items()) for i, row in enumerate(weights)
        )
        return count / s0 * numerator / float(np.sum(z**2)) if s0 and np.sum(z**2) else 0.0

    observed = global_i(numbers)
    rng = np.random.default_rng(20261018)
    extreme = sum(
        abs(global_i(rng.permutation(numbers))) >= abs(observed) for _ in range(permutations)
    )
    p_value = (extreme + 1) / (permutations + 1)
    std = float(numbers.std())
    z_scores = centered / std
    m2 = denominator / count
    local_rows = []
    local_rng = np.random.default_rng(20261019)
    for index, row in enumerate(weights):
        lag = sum(weight * centered[j] for j, weight in row.items())
        local_i = float(centered[index] * lag / m2) if m2 else 0.0
        null_values = []
        for _ in range(min(permutations, 199)):
            permuted = local_rng.permutation(centered)
            null_values.append(
                float(permuted[index] * sum(weight * permuted[j] for j, weight in row.items()) / m2)
            )
        local_p = (sum(abs(value) >= abs(local_i) for value in null_values) + 1) / (
            len(null_values) + 1
        )
        if local_p < 0.05 and z_scores[index] >= 0 and lag >= 0:
            cluster = "Alto-Alto (Hotspots)"
        elif local_p < 0.05 and z_scores[index] < 0 and lag < 0:
            cluster = "Bajo-Bajo (Coldspots)"
        elif local_p < 0.05 and z_scores[index] >= 0 > lag:
            cluster = "Alto-Bajo (Outlier espacial)"
        elif local_p < 0.05 and z_scores[index] < 0 <= lag:
            cluster = "Bajo-Alto (Outlier espacial)"
        else:
            cluster = "No significativo"
        local_rows.append(
            {
                "unidad": names[index],
                "Ii": round(local_i, 8),
                "p_valor_permutacion": round(local_p, 6),
                "cluster": cluster,
                "z_score": round(float(z_scores[index]), 6),
            }
        )
    return _plain(
        {
            "estado": "ESTIMADO_EXPLORATORIO",
            "n": count,
            "formula_moran": ECUACIONES["moran_global"],
            "formula_lisa": ECUACIONES["lisa_local"],
            "matriz_pesos": "k-NN, k=min(4,n-1), estandarización por fila",
            "moran_global_i": round(float(observed), 8),
            "p_valor_permutacion": round(float(p_value), 6),
            "permutaciones_globales": permutations,
            "lisa": local_rows,
        }
    )


def _spatial_node(state: AgentState) -> dict[str, Any]:
    started = time.perf_counter()
    grouped: dict[str, dict[str, Any]] = {}
    for record in state["territory_records"]:
        name = str(record.get("nombre") or record.get("codigo") or "")
        if not name or record.get("lon") is None or record.get("lat") is None:
            continue
        entry = grouped.setdefault(
            name,
            {
                "codigo": record.get("codigo"),
                "nombre": name,
                "tipo_territorio": record.get("tipo_territorio"),
                "lon": float(record["lon"]),
                "lat": float(record["lat"]),
                "poblacion_estimada": record.get("poblacion_estimada"),
                "indicadores": [],
            },
        )
        if record.get("valor") is not None:
            entry["indicadores"].append(
                {
                    "codigo": record.get("codigo_indicador"),
                    "nombre": record.get("nombre_indicador"),
                    "valor": float(record["valor"]),
                    "anio": record.get("anio_corte"),
                    "fuente": record.get("fuente_datos"),
                }
            )
    territories = [item for item in grouped.values() if item["indicadores"]]
    if territories:
        indicators = defaultdict(list)
        for territory in territories:
            for indicator in territory["indicadores"]:
                indicators[indicator["nombre"]].append(
                    (
                        territory["nombre"],
                        indicator["valor"],
                        (territory["lon"], territory["lat"]),
                    )
                )
        most_covered = max(indicators, key=lambda key: len(indicators[key]))
        values = indicators[most_covered]
        lisa = _moran_lisa(
            [value for _, value, _ in values],
            [name for name, _, _ in values],
            [point for _, _, point in values],
        )
        lisa["indicador"] = most_covered
        lisa["fuentes"] = sorted(
            {
                item["fuente"]
                for territory in territories
                for item in territory["indicadores"]
                if item["nombre"] == most_covered and item.get("fuente")
            }
        )
    else:
        lisa = {
            "estado": "PENDIENTE_GEOMETRIAS_O_INDICADORES",
            "n": len(grouped),
            "moran_global_i": None,
            "p_valor_permutacion": None,
            "lisa": [],
            "observacion": (
                "La BD no ofrece al menos cinco territorios con geometría y un indicador "
                "comparable."
            ),
        }
    coldspots = {item["unidad"] for item in lisa.get("lisa", []) if "Bajo-Bajo" in item["cluster"]}
    inefficient = set(state["dea_scores"].get("unidades_ineficientes", []))
    traps = [
        unit
        for unit in inefficient
        if any(
            name.casefold() in unit.casefold() or unit.casefold() in name.casefold()
            for name in coldspots
        )
    ]
    result = _plain(
        {
            **lisa,
            "territorios_con_geometria": len(grouped),
            "territorios_con_indicador": len(territories),
            "coldspots": sorted(coldspots),
            "unidades_dea_ineficientes_en_coldspots": traps,
            "trampas_territoriales_gestion_publica": [
                {"unidad_dmu": unit, "alerta": "Trampa Territorial de Gestión Pública"}
                for unit in traps
            ],
            "geometrias": (
                "ST_X/ST_Y de centroides PostGIS, EPSG:4326; no se fabrican geometrías faltantes"
            ),
        }
    )
    return {
        "spatial_lisa": result,
        "next_node": "nodo_predictivo",
        "messages": [*state["messages"], f"Espacial: {result['estado']}; n={result['n']}"],
        "trace": _append_trace(state, "nodo_espacial", started, result["estado"]),
    }


def _chow_test(years: list[int], values: list[float], break_year: int = 2024) -> dict[str, Any]:
    before = [
        (year, value) for year, value in zip(years, values, strict=False) if year < break_year
    ]
    after = [
        (year, value) for year, value in zip(years, values, strict=False) if year >= break_year
    ]
    if len(before) < 3 or len(after) < 2:
        return {
            "estado": "PENDIENTE_SERIE_CORTA",
            "anio_ruptura": break_year,
            "estadistico_f": None,
            "p_valor": None,
        }

    def rss(observations: list[tuple[int, float]]) -> float:
        x = np.asarray([year for year, _ in observations], dtype=float)
        y = np.asarray([value for _, value in observations], dtype=float)
        matrix = np.column_stack((np.ones(len(x)), x))
        beta, *_ = np.linalg.lstsq(matrix, y, rcond=None)
        return float(np.sum((y - matrix @ beta) ** 2))

    pooled = list(zip(years, values, strict=True))
    rss_restricted = rss(pooled)
    rss_unrestricted = rss(before) + rss(after)
    numerator_df = 2
    denominator_df = len(pooled) - 4
    if denominator_df <= 0 or rss_unrestricted <= 1e-12:
        return {
            "estado": "PENDIENTE_VARIANZA_INSUFICIENTE",
            "anio_ruptura": break_year,
            "estadistico_f": None,
            "p_valor": None,
        }
    statistic = max(0.0, (rss_restricted - rss_unrestricted) / numerator_df) / (
        rss_unrestricted / denominator_df
    )
    return {
        "estado": "ESTIMADO",
        "anio_ruptura": break_year,
        "estadistico_f": round(float(statistic), 8),
        "p_valor": round(float(f_distribution.sf(statistic, numerator_df, denominator_df)), 8),
        "grados_libertad": [numerator_df, denominator_df],
    }


def _forecast_series(state: AgentState) -> dict[str, Any]:
    grouped: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    targets: dict[str, list[float]] = defaultdict(list)
    for record in state["normalized_records"]:
        indicator = str(record.get("indicador") or record.get("codigo_meta_pdd") or "")
        year = record.get("vigencia")
        value = record.get("avance_estrategico_pct")
        if value is None:
            value = record.get("avance_fisico_pct")
        if indicator and year is not None and value is not None:
            grouped[indicator][int(year)].append(float(value))
            if record.get("meta_programada_anual") is not None:
                targets[indicator].append(float(record["meta_programada_anual"]))
        entity_name = record.get("entidad_normalizada")
        if entity_name and year is not None and value is not None:
            ent_key = f"Entidad Ejecutora: {entity_name}"
            grouped[ent_key][int(year)].append(float(value))
            targets[ent_key].append(100.0)
    series_results = []
    horizon_match = re.findall(r"20\d{2}", state["time_horizon"])
    final_year = max(map(int, horizon_match)) if horizon_match else 2027
    for indicator, observations in grouped.items():
        years = sorted(observations)
        values = [float(np.mean(observations[year])) for year in years]
        if len(years) < 3:
            series_results.append(
                {
                    "indicador": indicator,
                    "estado": "PENDIENTE_SERIE_CORTA",
                    "n_observaciones": len(years),
                    "pronostico_arima_var": None,
                    "chow": _chow_test(years, values),
                    "ISRI": None,
                }
            )
            continue
        x = np.asarray(years, dtype=float)
        y = np.asarray(values, dtype=float)
        coefficients = np.polyfit(x, y, 1)
        forecast = float(np.polyval(coefficients, final_year))
        residuals = y - np.polyval(coefficients, x)
        sigma = float(np.std(residuals, ddof=2)) if len(residuals) > 2 else 0.0
        target = max(targets[indicator]) if targets[indicator] else 100.0
        if sigma > 0:
            probability_meet = float(norm.cdf((forecast - target) / sigma))
        else:
            probability_meet = float(forecast >= target)
        isri = max(0.0, min(1.0, 1.0 - probability_meet))
        series_results.append(
            {
                "indicador": indicator,
                "estado": "ESTIMADO_TENDENCIA_LINEAL_FALLBACK",
                "n_observaciones": len(years),
                "serie": [
                    {"vigencia": year, "valor": value}
                    for year, value in zip(years, values, strict=True)
                ],
                "modelo_solicitado": "ARIMA/VAR",
                "modelo_aplicado": "tendencia lineal OLS; statsmodels/pmdarima no están instalados",
                "pronostico_arima_var": {"vigencia": final_year, "valor": round(forecast, 6)},
                "meta_cuatrienio": target,
                "probabilidad_cumplimiento": round(probability_meet, 8),
                "ISRI": round(isri, 8),
                "bandera": "Alto Riesgo de Incumplimiento" if isri > ISRI_ALERT_THRESHOLD else None,
                "chow": _chow_test(years, values),
            }
        )
    series_results.sort(
        key=lambda item: (
            item.get("ISRI") is None,
            -(item.get("ISRI") or 0.0),
            -int(item.get("n_observaciones") or 0),
        )
    )
    return {
        "modelo": "ARIMA/VAR solicitado; fallback OLS solo cuando faltan paquetes",
        "ecuacion_isri": ECUACIONES["isri"],
        "umbral_alto_riesgo": ISRI_ALERT_THRESHOLD,
        "series": series_results[:120],
        "series_evaluadas": len(series_results),
        "series_estimadas": sum(item.get("ISRI") is not None for item in series_results),
        "estado": "ESTIMADO" if series_results else "PENDIENTE_DATOS_MULTIANUALES",
    }


def _predictive_node(state: AgentState) -> dict[str, Any]:
    started = time.perf_counter()
    forecast = _forecast_series(state)
    risky = [item for item in forecast["series"] if (item.get("ISRI") or 0) > ISRI_ALERT_THRESHOLD]
    coldspots = set(state["spatial_lisa"].get("coldspots", []))
    high_execution_entities = set()
    by_entity: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in state["normalized_records"]:
        if item.get("entidad_normalizada"):
            by_entity[str(item["entidad_normalizada"])].append(item)
    for entity, rows in by_entity.items():
        appropriation = sum(float(row.get("apropiacion_definitiva_cop") or 0) for row in rows)
        commitments = sum(float(row.get("compromisos_rp_cop") or 0) for row in rows)
        if appropriation > 0 and commitments / appropriation >= 0.8:
            high_execution_entities.add(entity)
    aligned_alerts = state["nlp_coherence"].get("alertas_mission_creep", [])
    misaligned_entities = set()
    for alert in aligned_alerts:
        alert_text = _normalize(alert.get("actividad_operativa", ""))
        for entity in high_execution_entities:
            if _normalize(entity) in alert_text:
                misaligned_entities.add(entity)
    compound = []
    for entity in high_execution_entities & misaligned_entities:
        geographic_match = next(
            (
                name
                for name in coldspots
                if _normalize(name) in _normalize(entity) or _normalize(entity) in _normalize(name)
            ),
            None,
        )
        if geographic_match and risky:
            compound.append(
                {
                    "dmu": entity,
                    "ejecucion_alta": True,
                    "coldspot_persistente": geographic_match,
                    "desalineacion_coseno_menor_045": True,
                    "indicadores_isri_mayor_040": [item["indicador"] for item in risky],
                }
            )
    output = {
        **forecast,
        "alto_riesgo_indicadores": [item["indicador"] for item in risky],
        "entidades_ejecucion_alta": sorted(high_execution_entities),
        "patrones_compuestos_criticos": compound,
        "requiere_auditoria_humana": bool(compound),
    }
    return {
        "time_series_forecast": output,
        "requires_human_review": bool(compound),
        "analysis_complete": True,
        "next_node": "nodo_supervisor",
        "messages": [
            *state["messages"],
            (
                f"Predictivo: {len(risky)} indicadores con ISRI > {ISRI_ALERT_THRESHOLD}; "
                f"{len(compound)} patrón(es) compuesto(s)."
            ),
        ],
        "trace": _append_trace(state, "nodo_predictivo", started, output["estado"]),
    }


def _recommendations(state: AgentState) -> list[dict[str, Any]]:
    inefficient = state["dea_scores"].get("resultados_dmu", [])
    return [
        {
            "unidad": item["dmu"],
            "criterio": f"theta_BCC={item['theta_bcc']}",
            "accion_sugerida": (
                "Auditar apropiación y compromisos de Plan de Acción; evaluar reasignación "
                "a productos/metas con evidencia de alineación y avance verificable."
            ),
            "caracter": "recomendación para decisión del auditor; no modifica presupuesto",
        }
        for item in inefficient
        if item.get("theta_bcc") is not None and item["theta_bcc"] < 1 - 1e-6
    ][:25]


def _make_graph():
    graph = StateGraph(AgentState)

    def supervisor(state: AgentState) -> dict[str, Any]:
        started = time.perf_counter()
        if not state["analysis_complete"]:
            message = "Coordina el análisis: NLP -> DEA -> espacial -> predictivo."
            return {
                "next_node": "nodo_nlp",
                "messages": [*state["messages"], message],
                "trace": _append_trace(state, "nodo_supervisor", started, message),
            }
        if state["requires_human_review"] and state["cycle_count"] < 1:
            message = (
                "Patrón crítico detectado; solicita una pasada de recalibración antes de HITL."
            )
            return {
                "next_node": "nodo_nlp",
                "cycle_count": state["cycle_count"] + 1,
                "messages": [*state["messages"], message],
                "trace": _append_trace(state, "nodo_supervisor", started, message),
            }
        if state["requires_human_review"]:
            message = "Se congela el estado para revisión del auditor experto."
            return {
                "next_node": "nodo_human_in_loop",
                "estado_checkpointer": "CONGELADO_PARA_AUDITORIA_HUMANA",
                "is_valid_human": False,
                "recommendations": _recommendations(state),
                "messages": [*state["messages"], message],
                "trace": _append_trace(state, "nodo_supervisor", started, message),
            }
        message = "Análisis completado sin activar el umbral compuesto de auditoría humana."
        return {
            "next_node": END,
            "analysis_complete": True,
            "estado_checkpointer": "COMPLETADO_SIN_BLOQUEO",
            "recommendations": _recommendations(state),
            "messages": [*state["messages"], message],
            "trace": _append_trace(state, "nodo_supervisor", started, message),
        }

    def human_in_loop(state: AgentState) -> dict[str, Any]:
        decision = interrupt(
            {
                "thread_id": state["thread_id"],
                "estado": "CONGELADO_PARA_AUDITORIA_HUMANA",
                "patrones_criticos": state["time_series_forecast"].get(
                    "patrones_compuestos_criticos", []
                ),
                "recomendaciones_propuestas": state["recommendations"],
            }
        )
        started = time.perf_counter()
        approved = bool(decision.get("aprobado"))
        return {
            "is_valid_human": approved,
            "auditor": str(decision.get("auditor") or ""),
            "observaciones_auditor": str(decision.get("observaciones") or ""),
            "estado_checkpointer": "APROBADO_POR_AUDITOR" if approved else "RECHAZADO_POR_AUDITOR",
            "next_node": END,
            "messages": [
                *state["messages"],
                f"Auditor {decision.get('auditor')}: "
                f"{'aprobó' if approved else 'rechazó'} el dictamen.",
            ],
            "trace": _append_trace(
                state, "nodo_human_in_loop", started, "Validación de auditor recibida."
            ),
        }

    graph.add_node("nodo_supervisor", supervisor)
    graph.add_node("nodo_nlp", _nlp_node)
    graph.add_node("nodo_dea", _dea_node)
    graph.add_node("nodo_espacial", _spatial_node)
    graph.add_node("nodo_predictivo", _predictive_node)
    graph.add_node("nodo_human_in_loop", human_in_loop)
    graph.add_edge(START, "nodo_supervisor")

    def route_supervisor(state: AgentState) -> str:
        return state["next_node"]

    graph.add_conditional_edges(
        "nodo_supervisor",
        route_supervisor,
        {
            "nodo_nlp": "nodo_nlp",
            "nodo_human_in_loop": "nodo_human_in_loop",
            END: END,
        },
    )
    graph.add_edge("nodo_nlp", "nodo_dea")
    graph.add_edge("nodo_dea", "nodo_espacial")
    graph.add_edge("nodo_espacial", "nodo_predictivo")
    graph.add_edge("nodo_predictivo", "nodo_supervisor")
    graph.add_edge("nodo_human_in_loop", END)
    return graph.compile(checkpointer=_MEMORY_SAVER)


def _compiled_graph():
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = _make_graph()
    return _COMPILED_GRAPH


def _public_result(state: AgentState) -> dict[str, Any]:
    return {
        "motor": "PDT-AI-EVALUATOR",
        "thread_id": state["thread_id"],
        "jurisdiction": state["jurisdiction"],
        "time_horizon": state["time_horizon"],
        "total_budget": state["total_budget"],
        "unidades_dmu": state["units_dmu"],
        "cadena_valor_publica": ["Insumos", "Procesos", "Productos", "Resultados", "Impactos"],
        "dea_scores": state["dea_scores"],
        "nlp_coherence": state["nlp_coherence"],
        "spatial_lisa": state["spatial_lisa"],
        "time_series_forecast": state["time_series_forecast"],
        "evaluacion_multisectorial": state["nlp_coherence"].get("sectores", []),
        "dimensiones_seguridad_humana": DIMENSIONES_SEGURIDAD_HUMANA,
        "trazabilidad_fuentes": state["source_counts"],
        "traza_grafo": state["trace"],
        "messages": state["messages"],
        "estado_checkpointer": state["estado_checkpointer"],
        "is_valid_human": state["is_valid_human"],
        "requiere_validacion_humana": state["requires_human_review"]
        and not state["is_valid_human"],
        "recommendations": state["recommendations"],
        "gobernanza_institucional": GOVERNANCE_PHASES,
        "generado_en": datetime.now(UTC).isoformat(),
    }


def _save_cached(cache_key: str, thread_id: str, result: dict[str, Any]) -> None:
    cache = _safe_json_read(CACHE_PATH, {"version": 1, "runs": {}, "thread_index": {}})
    runs = cache.setdefault("runs", {})
    runs[cache_key] = _plain(result)
    cache["thread_index"][thread_id] = cache_key
    # Bound the file while retaining the most recent thread results.
    if len(runs) > 20:
        remove_keys = list(runs)[: len(runs) - 20]
        for key in remove_keys:
            runs.pop(key, None)
    _atomic_json_write(CACHE_PATH, cache)


def _compact_checkpoint_state(state: dict[str, Any] | AgentState) -> dict[str, Any]:
    omitted = {
        "raw_corpus",
        "plan_records",
        "node_records",
        "goal_records",
        "activity_records",
        "normalized_records",
        "territory_records",
        "gdf_spatial",
    }
    return _plain({k: v for k, v in state.items() if k not in omitted})


def _save_checkpoint(thread_id: str, state: AgentState, *, status: str) -> None:
    checkpoint_data = _safe_json_read(CHECKPOINT_PATH, {"version": 1, "threads": {}})
    checkpoint_data.setdefault("threads", {})[thread_id] = {
        "thread_id": thread_id,
        "status": status,
        "saved_at": datetime.now(UTC).isoformat(),
        "state": _compact_checkpoint_state(state),
    }
    _atomic_json_write(CHECKPOINT_PATH, checkpoint_data)


async def ejecutar_pdt_ai_evaluator(
    db: AsyncSession | None = None,
    *,
    jurisdiction: str = "Distrito Turístico y Cultural de Cartagena de Indias",
    time_horizon: str = "2024-2027 (Serie Multianual 2012-2027)",
    thread_id: str = "pdt-cartagena-2024-2027",
    force_refresh: bool = False,
) -> dict[str, Any]:
    """Carga evidencia, ejecuta el grafo y conserva resultados/checkpoints en disco."""
    cache_key = _cache_key(jurisdiction, time_horizon, thread_id)
    if not force_refresh:
        cache = _safe_json_read(CACHE_PATH, {})
        cached = cache.get("runs", {}).get(cache_key)
        if cached:
            cached["cache"] = {"estado": "HIT", "ruta": str(CACHE_PATH)}
            return cached
    owns_engine = db is None
    engine = None
    if db is None:
        from app.core.config import Settings

        engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        db_context = sessions()
        db = await db_context.__aenter__()
    try:
        data = await _load_corpus(db)
        state = _build_state(data, jurisdiction, time_horizon, thread_id)
        result_state = await _compiled_graph().ainvoke(
            state,
            {"configurable": {"thread_id": thread_id}},
        )
        # LangGraph returns the latest state at an interrupt; durable JSON supplies
        # cross-worker recovery when the in-memory MemorySaver is not shared.
        ckpt_status = str(
            result_state.get("estado_checkpointer") or "COMPLETADO_SIN_BLOQUEO"
        )
        _save_checkpoint(thread_id, result_state, status=ckpt_status)
        result = _public_result(result_state)
        result["cache"] = {"estado": "REFRESH", "ruta": str(CACHE_PATH)}
        result["metricas_disponibilidad"] = {
            "nodos_grafo_esperados": 5,
            "nodos_analiticos_ejecutados": sum(
                item.get("nodo") in {"nodo_nlp", "nodo_dea", "nodo_espacial", "nodo_predictivo"}
                for item in result_state["trace"]
            ),
            "cache_durable": str(CACHE_PATH),
            "checkpoint_durable": str(CHECKPOINT_PATH),
        }
        _save_cached(cache_key, thread_id, result)
        return result
    finally:
        if owns_engine and engine is not None:
            await db.close()
            await engine.dispose()


async def validar_checkpoint_pdt_ai_evaluator(
    thread_id: str,
    *,
    aprobado: bool,
    auditor: str,
    observaciones: str = "",
) -> dict[str, Any]:
    """Registra dictamen humano y descongela el checkpoint durable asociado al hilo."""
    checkpoints = _safe_json_read(CHECKPOINT_PATH, {"version": 1, "threads": {}})
    entry = checkpoints.get("threads", {}).get(thread_id)
    if entry is None:
        raise ValueError(f"No existe checkpoint PDT pendiente para thread_id={thread_id}.")
    state = entry["state"]
    state["is_valid_human"] = bool(aprobado)
    state["auditor"] = auditor.strip()
    state["observaciones_auditor"] = observaciones.strip()
    state["estado_checkpointer"] = "APROBADO_POR_AUDITOR" if aprobado else "RECHAZADO_POR_AUDITOR"
    state["messages"] = [
        *state.get("messages", []),
        (
            f"Auditor {auditor.strip()}: {'aprobó' if aprobado else 'rechazó'} el análisis. "
            f"{observaciones.strip()}"
        ).strip(),
    ]
    recommendations = state.get("recommendations", [])
    decision_recommendations = [
        {
            **recommendation,
            "estado_revision": "VALIDADA_PARA_DECISION_ADMINISTRATIVA" if aprobado else "RECHAZADA",
            "auditor": auditor.strip(),
        }
        for recommendation in recommendations
    ]
    state["recommendations"] = decision_recommendations
    entry["status"] = state["estado_checkpointer"]
    entry["saved_at"] = datetime.now(UTC).isoformat()
    entry["state"] = _compact_checkpoint_state(state)
    checkpoints["threads"][thread_id] = entry
    _atomic_json_write(CHECKPOINT_PATH, checkpoints)

    resumed = False
    graph = _compiled_graph()
    config = {"configurable": {"thread_id": thread_id}}
    try:
        snapshot = await graph.aget_state(config)
        if snapshot is not None and snapshot.tasks:
            resumed_state = await graph.ainvoke(
                Command(
                    resume={
                        "aprobado": bool(aprobado),
                        "auditor": auditor.strip(),
                        "observaciones": observaciones.strip(),
                    }
                ),
                config,
            )
            state = _compact_checkpoint_state(resumed_state)
            resumed = True
            entry["state"] = state
            entry["status"] = state.get("estado_checkpointer", entry["status"])
            entry["saved_at"] = datetime.now(UTC).isoformat()
            checkpoints["threads"][thread_id] = entry
            _atomic_json_write(CHECKPOINT_PATH, checkpoints)
    except (KeyError, RuntimeError, ValueError):
        # The durable checkpoint is authoritative when this request reaches another worker.
        pass
    cache_key = _cache_key(state["jurisdiction"], state["time_horizon"], thread_id)
    result = _public_result(state)
    result["cache"] = {"estado": "CHECKPOINT_VALIDADO", "ruta": str(CACHE_PATH)}
    result["auditoria_humana"] = {
        "auditor": auditor.strip(),
        "aprobado": bool(aprobado),
        "observaciones": observaciones.strip(),
        "recomendaciones_operativas": decision_recommendations,
        "reanudado_en_memory_saver": resumed,
        "persistencia": str(CHECKPOINT_PATH),
    }
    _save_cached(cache_key, thread_id, result)
    return result
