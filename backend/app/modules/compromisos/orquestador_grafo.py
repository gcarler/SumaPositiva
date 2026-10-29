"""Orquestador experto del pipeline de datos: supervisor LangGraph + puertas PydanticAI.

Capa inteligente MONTADA sobre el corredor determinista (`scripts/pipeline_datos_polis.py`)
— no lo sustituye: cada etapa sigue ejecutándose con el mismo sustrato, bitácora 0070 y
reglas de idempotencia. Lo que añade esta capa:

1. **Grafo supervisor** (LangGraph): plan de etapas, aristas condicionales y congelamiento
    (`interrupt`) para revisión humana, reutilizando el patrón probado en
   `pdt_ai_evaluator_graph.py`.
2. **Puertas de calidad PydanticAI** antes de promocionar el resultado de cada etapa:
   contrato estricto del `resumen` (modelos Pydantic sobre las claves REALES que los
   motores entregan a la bitácora 0070) + reglas validables, y el dictamen final es un
   objeto `DictamenPuerta` emitido por un agente PydanticAI (determinista por defecto vía
   `FunctionModel`; con `OPENAI_API_KEY` y `POLIS_IA_MODELO != 'test'` se promueve a un
   juez LLM con el mismo esquema de salida).
3. **Diario auditable persistido** (migraciones 0071-0073): cada nodo escribe una fila
   en `seguimiento.corridas_pipeline_pasos` con `thread_id`, orden, estado, duración,
   payload JSONB del dictamen y su SHA-256; la corrida de etapa queda ligada en
   `seguimiento.corridas_pipeline.thread_id`. La evidencia histórica queda en Postgres.

Aislamiento: el resolutor de bitácora honra `POLIS_TEST_DATABASE_URL` cuando está definido.

La reanudación de un thread congelado usa el checkpoint PostgreSQL del mismo hilo.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Literal, TypedDict

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, ToolCallPart, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.articulacion_supervisor_corte_polis import (
    SolicitudArticulacionCorte,
    analizar_articulacion_corte,
)
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.corte_datos_polis import (
    construir_manifiesto_corte,
    verificar_manifiesto_corte,
    verificar_resumen_fuentes,
)

RAIZ = Path(__file__).resolve().parents[4]
BACKEND = RAIZ / "backend"
GRAFO_ETAPAS = ("fuentes", "conciliacion", "dea")
SEVERIDAD_CONGELA = "alta"  # solo severidad alta congela para revisión humana

# ------------------------------------------------------------------ dictámenes


class HallazgoPuerta(BaseModel):
    """Ítem del examen de una puerta: regla, severidad y lectura honesta."""

    regla: str
    severidad: Literal["baja", "media", "alta"]
    detalle: str


class DictamenPuerta(BaseModel):
    """Salida validada (PydanticAI) de una puerta de calidad antes de promover."""

    aprobado: bool
    severidad: Literal["baja", "media", "alta"]
    observaciones: str
    hallazgos: list[HallazgoPuerta] = Field(default_factory=list)


class DecisionAuditor(BaseModel):
    """Decisión humana validada en un paso `interrupt` (HITL)."""

    aprobado: bool
    auditor: str = Field(min_length=1)
    observaciones: str = ""
    motivo: str = "revisado_por_auditor"


# --------------------------------------------------------------- contratos 0070


class ContratoResumenFuentes(BaseModel):
    """Claves mínimas que el sincronizador de fuentes entrega en el resumen real."""

    model_config = ConfigDict(extra="allow")
    ok: bool
    log: str | None = None
    estado_calidad: Literal["verde", "ambar", "rojo"]
    estado_publicacion: Literal["publicable", "no_publicable"]
    consolidado_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class ContratoResumenConciliacion(BaseModel):
    """Claves mínimas del conciliador (idempotencia + distribución de vínculos)."""

    model_config = ConfigDict(extra="allow")
    metas_conciliadas: int = Field(ge=0)
    total_filas_en_bd: int = Field(ge=0)
    distribucion_por_tipo_vinculo: dict[str, int]
    cruces_hermanos_3_motores_aplicados: int = Field(ge=0)
    planes_procesados: list[str]


class ContratoResumenDea(BaseModel):
    """Claves mínimas del dictamen DEA 4 niveles (estado + fronteras homogéneas)."""

    model_config = ConfigDict(extra="allow")
    estado: str
    sistema: str
    niveles: dict[str, Any]
    separacion_estricta_fronteras_homogeneas: bool = False


CONTRATOS: dict[str, type[BaseModel]] = {
    "fuentes": ContratoResumenFuentes,
    "conciliacion": ContratoResumenConciliacion,
    "dea": ContratoResumenDea,
}


def examinar_resumen(etapa: str, resumen: Any) -> list[HallazgoPuerta]:
    """Examen determinista: contrato Pydantic + reglas votables sobre el resumen real."""
    hallazgos: list[HallazgoPuerta] = []
    contrato = CONTRATOS.get(etapa)
    if contrato is None:
        hallazgos.append(
            HallazgoPuerta(
                regla="contrato_desconocido",
                severidad=SEVERIDAD_CONGELA,
                detalle=f"Etapa '{etapa}' sin contrato de resumen registrado; no se promueve.",
            )
        )
    else:
        try:
            contrato.model_validate(resumen or {})
        except Exception as exc:
            hallazgos.append(
                HallazgoPuerta(
                    regla=f"contrato_{etapa}",
                    severidad=SEVERIDAD_CONGELA,
                    detalle=f"El resumen viola el contrato Pydantic '{contrato.__name__}': {exc}",
                )
            )

    if etapa == "conciliacion" and isinstance(resumen, dict):
        metas = int(resumen.get("metas_conciliadas") or 0)
        filas = int(resumen.get("total_filas_en_bd", -1))
        if filas >= 0 and filas != metas:
            hallazgos.append(
                HallazgoPuerta(
                    regla="idempotencia_conciliacion",
                    severidad=SEVERIDAD_CONGELA,
                    detalle=f"metas_conciliadas={metas} difiere de total_filas_en_bd={filas}: la "
                    "tabla quedó en estado intermedio y la corrida no es idempotente.",
                )
            )
        distribucion = resumen.get("distribucion_por_tipo_vinculo") or {}
        total_tipos = sum(int(v) for v in distribucion.values())
        if total_tipos > 0:
            inferidos = int(distribucion.get("VINCULO_SECTORIAL_INFERIDO", 0)) / total_tipos
            if inferidos >= 0.50:
                hallazgos.append(
                    HallazgoPuerta(
                        regla="proporcion_inferida",
                        severidad="media",
                        detalle=f"{inferidos:.1%} de los vínculos es inferencia sectorial; precisión "
                        "sin validar (sin gold set): seguimiento EAF pendiente.",
                    )
                )
        if metas == 0:
            hallazgos.append(
                HallazgoPuerta(
                    regla="cobertura_nula",
                    severidad=SEVERIDAD_CONGELA,
                    detalle="0 metas conciliadas; el cruce de la tríada no encontró universo.",
                )
            )

    if etapa == "dea" and isinstance(resumen, dict):
        if not resumen.get("separacion_estricta_fronteras_homogeneas", False):
            hallazgos.append(
                HallazgoPuerta(
                    regla="fronteras_homogeneas",
                    severidad=SEVERIDAD_CONGELA,
                    detalle="La verificación de homogeneidad de fronteras DEA no es estricta; el "
                    "dictamen no cumple la doctrina de las 4 fronteras.",
                )
            )
        if str(resumen.get("estado", "")).lower() == "error":
            hallazgos.append(
                HallazgoPuerta(
                    regla="estado_dea",
                    severidad=SEVERIDAD_CONGELA,
                    detalle=f"El motor DEA reportó estado '{resumen.get('estado')}'.",
                )
            )

    if etapa == "fuentes" and isinstance(resumen, dict) and resumen.get("ok") is False:
        hallazgos.append(
            HallazgoPuerta(
                regla="sincronizador_fallido",
                severidad=SEVERIDAD_CONGELA,
                detalle=f"El sincronizador reportó ok=false: {resumen.get('motivo', 'sin motivo')}.",
            )
        )
    if etapa == "fuentes" and isinstance(resumen, dict) and resumen.get("estado_publicacion") != "publicable":
        hallazgos.append(
            HallazgoPuerta(
                regla="fuentes_no_publicables",
                severidad=SEVERIDAD_CONGELA,
                detalle=f"El corte de fuentes está {resumen.get('estado_calidad', 'sin estado')}; "
                "su evaluación impide avanzar a promoción.",
            )
        )
    if etapa == "fuentes" and isinstance(resumen, dict) and resumen.get("estado_calidad") != "verde":
        hallazgos.append(
            HallazgoPuerta(
                regla="calidad_fuentes_no_verde",
                severidad=SEVERIDAD_CONGELA,
                detalle="La calidad del corte de fuentes no es verde; exige revisión antes de promoción.",
            )
        )
    return hallazgos


def severidad_real(hallazgos: list[HallazgoPuerta]) -> Literal["baja", "media", "alta"]:
    if any(h.severidad == SEVERIDAD_CONGELA for h in hallazgos):
        return SEVERIDAD_CONGELA
    return "media" if any(h.severidad == "media" for h in hallazgos) else "baja"


# ------------------------------------------------------------------ agente PydanticAI


def _extract_json_de_ultimo_mensaje(messages: list[ModelMessage]) -> Any:
    """Extrae el JSON del prompt de la puerta (llega como UserPromptPart)."""
    for message in reversed(messages):
        if isinstance(message, ModelRequest):
            for part in reversed(message.parts):
                if isinstance(part, UserPromptPart) and isinstance(part.content, str):
                    return json.loads(part.content)
    return None


def _dictamen_de_reglas(messages: list[Any], info: AgentInfo) -> ModelResponse:
    """FunctionModel determinista: re-emite el examen de reglas como salida validada."""
    hallazgos_crudos = _extract_json_de_ultimo_mensaje(list(messages))
    hallazgos_crudos = hallazgos_crudos if isinstance(hallazgos_crudos, list) else []
    severidad = severidad_real([HallazgoPuerta.model_validate(h) for h in hallazgos_crudos if isinstance(h, dict)])
    args = {
        "aprobado": severidad != SEVERIDAD_CONGELA,
        "severidad": severidad,
        "observaciones": "; ".join(str(h.get("detalle", "")) for h in hallazgos_crudos if isinstance(h, dict))
        or "Contrato y reglas cumplidos.",
        "hallazgos": hallazgos_crudos,
    }
    herramienta_salida = info.model_request_parameters.output_tools[0].name
    return ModelResponse(parts=[ToolCallPart(tool_name=herramienta_salida, args=args)])


def _modelo_puerta() -> Any:
    """Modelo de la puerta: LLM real si se configura de forma explícita, FunctionModel si no."""
    externo = os.getenv("POLIS_IA_MODELO")
    if os.getenv("OPENAI_API_KEY") and externo != "test" and externo is not None:
        return externo
    return FunctionModel(_dictamen_de_reglas, model_name="polis-pipeline-puerta-determinista")


_AGENTE_PUERTA: Agent | None = None


def agente_puerta() -> Agent:
    """Agente PydanticAI que emite `DictamenPuerta` validado (instancia única por proceso)."""
    global _AGENTE_PUERTA
    if _AGENTE_PUERTA is None:
        _AGENTE_PUERTA = Agent(_modelo_puerta(), output_type=DictamenPuerta)
    return _AGENTE_PUERTA


# ------------------------------------------------------------------ estado del grafo


class EstadoOrquestacion(TypedDict, total=False):
    thread_id: str
    run_id: str
    corte_manifest_path: str
    corte_manifest_sha256: str
    solicitud_planeacion: dict[str, str]
    resultado_planeacion: dict[str, Any]
    plan: list[str]
    etapa_actual: str
    resultados: dict[str, dict[str, Any]]  # exit_code + resumen real por etapa
    pareceres: dict[str, dict[str, Any]]  # dictamen de puerta por etapa
    decisiones: dict[str, dict[str, Any]]  # decisión humana por etapa
    requiere_revision_humana: bool
    estado_checkpointer: str
    traza: list[dict[str, Any]]  # por nodo: orden, detalles
    mensajes: list[str]


# ------------------------------------------------------------------ bitácora (0071)


def _url_bitacora() -> str:
    """URL de la bitácora; la base de pruebas explícita gana (aislamiento, hallazgo EAF)."""
    prueba = os.environ.get("POLIS_TEST_DATABASE_URL")
    if prueba:
        return prueba
    real = os.environ.get("POLIS_DATABASE_URL")
    if real:
        return real
    env_file = BACKEND / ".env"
    if env_file.exists():
        for linea in env_file.read_text().splitlines():
            if linea.startswith("POLIS_DATABASE_URL="):
                return linea.split("=", 1)[1].strip()
    raise RuntimeError("URL de bitácora no disponible (POLIS_TEST_DATABASE_URL / POLIS_DATABASE_URL / backend/.env)")


async def _coro_registrar_paso(
    thread_id: str,
    nodo: str,
    etapa: str | None,
    estado: str,
    duracion_ms: int,
    payload: dict[str, Any] | None,
    corrida_id: int | None = None,
) -> int:
    """Inserta una fila del diario auditable y devuelve su `orden` para el thread."""
    paquete = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str) if payload else None
    sha = hashlib.sha256(paquete.encode("utf-8")).hexdigest() if paquete else None
    engine = create_async_engine(_url_bitacora(), pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("SELECT pg_advisory_xact_lock(hashtextextended(:thread_id, 0))"),
                {"thread_id": thread_id},
            )
            res = await conn.execute(
                text(
                    "INSERT INTO seguimiento.corridas_pipeline_pasos "
                    "(thread_id, corrida_id, nodo, orden, etapa, estado, fin_en, duracion_ms, payload, sha256_payload) "
                    "VALUES (CAST(:thread_id AS VARCHAR(120)), :corrida_id, :nodo, "
                    "COALESCE((SELECT max(orden) + 1 FROM seguimiento.corridas_pipeline_pasos "
                    "WHERE thread_id = CAST(:thread_id AS VARCHAR(120))), 1), "
                    ":etapa, :estado, now(), :duracion_ms, :payload, :sha256) RETURNING orden"
                ).bindparams(bindparam("payload", type_=JSONB)),
                {
                    "thread_id": thread_id,
                    "corrida_id": corrida_id,
                    "nodo": nodo,
                    "etapa": etapa,
                    "estado": estado,
                    "duracion_ms": duracion_ms,
                    "payload": json.loads(paquete) if paquete else None,
                    "sha256": sha,
                },
            )
            return int(res.scalar_one())
    finally:
        await engine.dispose()


async def registrar_paso(
    thread_id: str,
    nodo: str,
    etapa: str | None,
    estado: str,
    inicio: float,
    payload: dict[str, Any] | None = None,
    corrida_id: int | None = None,
) -> int:
    """Interfaz de los nodos: un fallo de trazabilidad detiene el grafo."""
    duracion_ms = int((time.monotonic() - inicio) * 1000)
    return await _coro_registrar_paso(thread_id, nodo, etapa, estado, duracion_ms, payload, corrida_id)


async def _coro_ligar_thread_a_corrida(corrida_id: int, etapa: str, thread_id: str) -> int:
    """Firma la corrida exacta devuelta por el corredor, sin inferir por tiempo."""
    engine = create_async_engine(_url_bitacora(), pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            res = await conn.execute(
                text(
                    "UPDATE seguimiento.corridas_pipeline SET thread_id = :thread_id "
                    "WHERE id = :corrida_id AND etapa = :etapa "
                    "AND (thread_id IS NULL OR thread_id = :thread_id) RETURNING id"
                ),
                {"thread_id": thread_id, "etapa": etapa, "corrida_id": corrida_id},
            )
            return len(res.scalars().all())
    finally:
        await engine.dispose()


# ------------------------------------------------------------------ sustrato determinista


def correr_etapa_determinista(etapa: str, thread_id: str) -> tuple[int, dict[str, Any], int | None]:
    """Sustrato por defecto: delega al corredor real con su bitácora 0070 (--thread-id)."""
    proceso = subprocess.run(
        [
            sys.executable,
            "scripts/pipeline_datos_polis.py",
            "--etapa",
            etapa,
            "--ejecutar",
            "--intentos",
            "1",
            "--thread-id",
            thread_id,
        ],
        cwd=RAIZ,
        capture_output=True,
        text=True,
        check=False,
    )
    marcador = "POLIS_PIPELINE_RESULT_JSON="
    for linea in reversed((proceso.stdout or "").splitlines()):
        if not linea.startswith(marcador):
            continue
        try:
            paquete = json.loads(linea.removeprefix(marcador))
        except json.JSONDecodeError:
            break
        detalle = paquete.get(etapa) if isinstance(paquete, dict) else None
        if isinstance(detalle, dict) and isinstance(detalle.get("resumen"), dict):
            estado = detalle.get("estado")
            codigo = detalle.get("exit_code")
            if estado == "exitoso" and codigo == 0 and proceso.returncode == 0:
                return 0, detalle["resumen"], detalle.get("corrida_id")
            return (
                proceso.returncode or codigo or 1,
                {
                    **detalle["resumen"],
                    "ok": False,
                    "estado_corrida": estado,
                },
                detalle.get("corrida_id"),
            )
        break
    return (
        proceso.returncode or 1,
        {
            "ok": False,
            "error": "El corredor no emitió un resultado estructurado válido para la etapa",
            "salida": ((proceso.stdout or "") + (proceso.stderr or ""))[-4000:],
        },
        None,
    )


MANEJADORES_DEFECTO: dict[str, Any] = {"default": correr_etapa_determinista}

# Los manejadores NO viajan en el estado del grafo (MemorySaver serializa con msgpack
# y no admite callables); viven como registro de proceso por thread (mismo límite
# in-proceso de la reanudación HITL).
_MANEJADORES_POR_THREAD: dict[str, dict[str, Any]] = {}


def resolver_handler(thread_id: str, etapa: str):
    """Manejador de la etapa para un thread: inyectado, 'default' o el sustrato real."""
    mapa = _MANEJADORES_POR_THREAD.get(thread_id) or MANEJADORES_DEFECTO
    return mapa.get(etapa) or mapa.get("default") or correr_etapa_determinista


def _congelar_corte_capturado(run_id: str, resumen: dict[str, Any]) -> tuple[str, str]:
    """Fija el inventario y la calidad del banco capturado por la etapa real."""
    identificador = uuid.UUID(run_id)
    ruta, sha = construir_manifiesto_corte(
        RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json",
        RAIZ / "data/banco_fuentes_oficiales/evaluacion_estructural_2026.json",
        RAIZ / "data/capas_analiticas/cortes",
        identificador,
        resumen,
    )
    verificar_manifiesto_corte(ruta, sha, identificador)
    return str(ruta), sha


# ------------------------------------------------------------------ grafo supervisor


def _make_graph(checkpointer: AsyncPostgresSaver):
    """supervisor → corredor (sustrato) → puerta → (HITL) → supervisor … → cierre."""
    graph = StateGraph(EstadoOrquestacion)

    def _traza(state: EstadoOrquestacion, nodo: str, detalle: str) -> list[dict[str, Any]]:
        return [
            *state.get("traza", []),
            {
                "nodo": nodo,
                "orden": len(state.get("traza", [])) + 1,
                "etapa": state.get("etapa_actual"),
                "detalles": detalle,
            },
        ]

    def supervisor(state: EstadoOrquestacion) -> dict[str, Any]:
        """Elige la siguiente etapa del plan; delega el congelamiento en la puerta/HITL."""
        plan = state.get("plan", [])
        pareceres = state.get("pareceres", {})
        pendientes = [etapa for etapa in plan if etapa not in pareceres]
        if state.get("requiere_revision_humana"):
            return {
                "estado_checkpointer": "CONGELADO_PARA_AUDITORIA_HUMANA",
                "mensajes": [*state.get("mensajes", []), "supervisor: congelado para auditoría humana."],
                "traza": _traza(state, "nodo_supervisor", "requiere_revision_humana"),
            }
        rechazadas = [etapa for etapa in plan if etapa in pareceres and not pareceres[etapa].get("aprobado")]
        if rechazadas:
            return {
                "etapa_actual": None,
                "estado_checkpointer": "DETENIDO_POR_PUERTA",
                "mensajes": [*state.get("mensajes", []), f"supervisor: etapas rechazadas {', '.join(rechazadas)}."],
                "traza": _traza(state, "nodo_supervisor", f"rechazadas={','.join(rechazadas)}"),
            }
        if pendientes:
            return {
                "etapa_actual": pendientes[0],
                "mensajes": [*state.get("mensajes", []), f"supervisor: ejecutar {pendientes[0]}."],
                "traza": _traza(state, "nodo_supervisor", f"siguiente={pendientes[0]}"),
            }
        if state.get("solicitud_planeacion") and not state.get("resultado_planeacion"):
            return {
                "etapa_actual": None,
                "estado_checkpointer": "ANALIZANDO_PLANEACION_CONGELADA",
                "traza": _traza(state, "nodo_supervisor", "articulacion_planeacion_por_corte"),
            }
        analisis = state.get("resultado_planeacion")
        estado_final = (
            "COMPLETADO_CON_ANALISIS_NO_PUBLICABLE"
            if analisis and analisis.get("ok")
            else "DETENIDO_POR_ANALISIS_PLANEACION"
            if analisis
            else "COMPLETADO_SIN_BLOQUEO"
        )
        return {
            "etapa_actual": None,
            "estado_checkpointer": estado_final,
            "mensajes": [*state.get("mensajes", []), f"supervisor: plan completado ({estado_final})."],
            "traza": _traza(state, "nodo_supervisor", estado_final),
        }

    def ruta_supervisor(state: EstadoOrquestacion) -> str:
        if state.get("requiere_revision_humana"):
            return "CONGELADO_PARA_AUDITORIA_HUMANA"
        if state.get("etapa_actual"):
            return "nodo_corredor"
        if state.get("estado_checkpointer") == "ANALIZANDO_PLANEACION_CONGELADA":
            return "nodo_articulacion_planeacion"
        return "COMPLETADO_SIN_BLOQUEO"

    async def articulacion_planeacion(state: EstadoOrquestacion) -> dict[str, Any]:
        inicio = time.monotonic()
        try:
            corte = ContextoCorte(
                uuid.UUID(state["run_id"]), Path(state["corte_manifest_path"]), state["corte_manifest_sha256"]
            )
            solicitud = SolicitudArticulacionCorte.model_validate(state["solicitud_planeacion"])
            resultado = await analizar_articulacion_corte(solicitud, corte)
        except Exception as exc:  # noqa: BLE001 - el fallo analítico se registra sin promover
            resultado = {
                "ok": False,
                "run_id": state["run_id"],
                "error": repr(exc),
                "estado_publicacion": "no_publicable",
            }
        await registrar_paso(
            state["thread_id"],
            "nodo_articulacion_planeacion",
            None,
            "exitoso" if resultado["ok"] else "fallo",
            inicio,
            resultado,
        )
        return {
            "resultado_planeacion": resultado,
            "traza": _traza(state, "nodo_articulacion_planeacion", "exitoso" if resultado["ok"] else "fallo"),
        }

    async def corredor(state: EstadoOrquestacion) -> dict[str, Any]:
        """Ejecuta la etapa con el sustrato inyectado; firma la corrida con el thread."""
        etapa = state["etapa_actual"]
        thread_id = state["thread_id"]
        inicio = time.monotonic()
        handler = resolver_handler(thread_id, etapa)
        exit_code, resumen, corrida_id = -1, {}, None
        estado = "fallo"
        referencia_corte: dict[str, str] = {}
        try:
            if state.get("corte_manifest_path"):
                verificar_manifiesto_corte(
                    Path(state["corte_manifest_path"]), state["corte_manifest_sha256"], uuid.UUID(state["run_id"])
                )
            elif etapa != "fuentes" and handler is correr_etapa_determinista:
                raise ValueError("La etapa real requiere un manifiesto de fuentes congelado")
            respuesta = (
                handler(etapa, thread_id)
                if not asyncio.iscoroutinefunction(handler)
                else await handler(etapa, thread_id)
            )
            exit_code, resumen = respuesta[:2]
            corrida_id = respuesta[2] if len(respuesta) > 2 else None
            estado = "exitoso" if exit_code == 0 else "fallo"
            if exit_code == 0 and etapa == "fuentes" and handler is correr_etapa_determinista:
                if state.get("corte_manifest_path"):
                    corte = verificar_manifiesto_corte(
                        Path(state["corte_manifest_path"]), state["corte_manifest_sha256"], uuid.UUID(state["run_id"])
                    )
                    verificar_resumen_fuentes(corte, resumen)
                else:
                    ruta_corte, sha_corte = _congelar_corte_capturado(state["run_id"], resumen)
                    referencia_corte = {"corte_manifest_path": ruta_corte, "corte_manifest_sha256": sha_corte}
        except Exception as exc:  # noqa: BLE001 - la etapa registra su propia excepción
            exit_code, resumen = -1, {"ok": False, "error": repr(exc)}
            estado = "fallo"
        ligadas = 0
        if corrida_id is not None:
            try:
                ligadas = await _coro_ligar_thread_a_corrida(corrida_id, etapa, thread_id)
            except Exception as exc:  # noqa: BLE001 - se convierte en fallo de trazabilidad
                resumen = {**resumen, "ok": False, "error_enlace_corrida": repr(exc)}
            if ligadas != 1:
                exit_code = -1
                resumen = {**resumen, "ok": False, "error_enlace_corrida": "Corrida sin enlace exacto al hilo"}
                estado = "fallo"
        await registrar_paso(
            thread_id,
            "nodo_corredor",
            etapa,
            estado,
            inicio,
            {"run_id": state["run_id"], "exit_code": exit_code, "resumen": resumen, **referencia_corte},
            corrida_id,
        )
        return {
            **referencia_corte,
            "resultados": {
                **(state.get("resultados") or {}),
                etapa: {"exit_code": exit_code, "resumen": resumen, "corrida_id": corrida_id},
            },
            "corridas_ligadas": ligadas,
            "mensajes": [*state.get("mensajes", []), f"corredor[{etapa}] → {estado} (exit={exit_code})"],
            "traza": _traza(state, "nodo_corredor", estado),
        }

    async def puerta(state: EstadoOrquestacion) -> dict[str, Any]:
        """Contrato Pydantic + reglas auditable + dictamen PydanticAI validado antes de promover."""
        etapa = state["etapa_actual"]
        thread_id = state["thread_id"]
        inicio = time.monotonic()
        paquete = (state.get("resultados") or {}).get(etapa, {})
        hallazgos = examinar_resumen(etapa, paquete.get("resumen"))
        if paquete.get("exit_code") != 0:
            hallazgos.append(
                HallazgoPuerta(
                    regla="fallo_etapa",
                    severidad=SEVERIDAD_CONGELA,
                    detalle=f"El corredor terminó con exit_code={paquete.get('exit_code')}; no se promueve.",
                )
            )
        severidad = severidad_real(hallazgos)
        try:
            gestion = await agente_puerta().run(json.dumps([h.model_dump() for h in hallazgos], ensure_ascii=False))
            dictamen: DictamenPuerta = gestion.output
        except Exception as exc:  # noqa: BLE001 - la puerta no puede tumbar el grafo
            dictamen = DictamenPuerta(
                aprobado=severidad != SEVERIDAD_CONGELA,
                severidad=severidad,
                observaciones=f"Jugador de respaldo (la puerta no emitió dictamen validado): {exc}",
                hallazgos=hallazgos,
            )
        if severidad == SEVERIDAD_CONGELA:
            dictamen = DictamenPuerta(
                aprobado=False,
                severidad=SEVERIDAD_CONGELA,
                observaciones=dictamen.observaciones,
                hallazgos=hallazgos,
            )
        congelar = (not dictamen.aprobado) and dictamen.severidad == SEVERIDAD_CONGELA
        await registrar_paso(
            thread_id,
            "nodo_puerta",
            etapa,
            "congelado" if congelar else ("aprobado" if dictamen.aprobado else "rechazado"),
            inicio,
            dictamen.model_dump(),
            paquete.get("corrida_id"),
        )
        estado: dict[str, Any] = {
            "pareceres": {**(state.get("pareceres") or {}), etapa: dictamen.model_dump()},
            "requiere_revision_humana": congelar,
            "mensajes": [
                *state.get("mensajes", []),
                f"puerta[{etapa}] → severidad={dictamen.severidad} aprobado={dictamen.aprobado}",
            ],
            "traza": _traza(state, "nodo_puerta", dictamen.severidad),
        }
        if congelar:
            # Visible desde la primera invocación sin esperar al supervisor.
            estado["estado_checkpointer"] = "CONGELADO_PARA_AUDITORIA_HUMANA"
        return estado

    async def revision_humana(state: EstadoOrquestacion) -> dict[str, Any]:
        """HITL: congela y espera una decisión validada por el esquema `DecisionAuditor`."""
        etapa = state["etapa_actual"]
        thread_id = state["thread_id"]
        dictamen = (state.get("pareceres") or {}).get(etapa, {})
        inicio = time.monotonic()
        cruda = interrupt(
            {
                "thread_id": thread_id,
                "etapa": etapa,
                "dictamen_puerta": dictamen,
                "resumen": (state.get("resultados") or {}).get(etapa),
            }
        )
        decision = DecisionAuditor.model_validate(cruda or {})
        hallazgos_rojos = any(h.get("severidad") == SEVERIDAD_CONGELA for h in dictamen.get("hallazgos", []))
        aprobado_final = decision.aprobado and not hallazgos_rojos
        estado_auditor = "aprobado_por_auditor" if aprobado_final else "rechazado_por_auditor"
        corrida_id = (state.get("resultados") or {}).get(etapa, {}).get("corrida_id")
        await registrar_paso(
            thread_id,
            "nodo_revision_humana",
            etapa,
            estado_auditor,
            inicio,
            decision.model_dump(),
            corrida_id,
        )
        resultados = dict(state.get("resultados") or {})
        if not aprobado_final and etapa in resultados:
            resultados[etapa] = {
                "exit_code": -1,
                "resumen": {
                    **(resultados[etapa].get("resumen") or {}),
                    "ok": False,
                    "rejectado": f"Rechazado por {decision.auditor}: {decision.observaciones}",
                },
            }
        return {
            "pareceres": {**(state.get("pareceres") or {}), etapa: {**dictamen, "aprobado": aprobado_final}},
            "decisiones": {**(state.get("decisiones") or {}), etapa: decision.model_dump()},
            "resultados": resultados,
            "requiere_revision_humana": False,
            "estado_checkpointer": estado_auditor.replace("_por_auditor", "").upper(),
            "mensajes": [
                *state.get("mensajes", []),
                f"auditor {decision.auditor}: {'aprobó' if aprobado_final else 'no promocionó'} {etapa}.",
            ],
            "traza": _traza(state, "nodo_revision_humana", estado_auditor),
        }

    graph.add_node("nodo_supervisor", supervisor)
    graph.add_node("nodo_corredor", corredor)
    graph.add_node("nodo_puerta", puerta)
    graph.add_node("nodo_revision_humana", revision_humana)
    graph.add_node("nodo_articulacion_planeacion", articulacion_planeacion)
    graph.add_edge(START, "nodo_supervisor")
    graph.add_conditional_edges(
        "nodo_supervisor",
        ruta_supervisor,
        {
            "nodo_corredor": "nodo_corredor",
            "nodo_articulacion_planeacion": "nodo_articulacion_planeacion",
            "CONGELADO_PARA_AUDITORIA_HUMANA": "nodo_revision_humana",
            "COMPLETADO_SIN_BLOQUEO": END,
        },
    )
    graph.add_edge("nodo_corredor", "nodo_puerta")
    graph.add_conditional_edges(
        "nodo_puerta",
        lambda state: "nodo_revision_humana" if state.get("requiere_revision_humana") else "nodo_supervisor",
        {"nodo_revision_humana": "nodo_revision_humana", "nodo_supervisor": "nodo_supervisor"},
    )
    graph.add_edge("nodo_revision_humana", "nodo_supervisor")
    graph.add_edge("nodo_articulacion_planeacion", "nodo_supervisor")
    return graph.compile(checkpointer=checkpointer)


def _url_checkpoint() -> str:
    """DSN psycopg de la misma base que guarda el diario; la base de prueba prevalece."""
    return make_url(_url_bitacora()).set(drivername="postgresql").render_as_string(hide_password=False)


def _config_thread(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


# ------------------------------------------------------------------ API pública


def correr_grafo(
    plan: list[str],
    thread_id: str | None = None,
    manejadores: dict[str, Any] | None = None,
    aprobacion: DecisionAuditor | None = None,
    corte: tuple[Path, str, uuid.UUID] | None = None,
    planeacion: SolicitudArticulacionCorte | None = None,
) -> dict[str, Any]:
    """Ejecuta o reanuda tras un `interrupt` el grafo supervisor.

    - `plan`: etapas a supervisar (subconjunto de `GRAFO_ETAPAS`).
    - `manejadores`: mapa `etapa → callable(etapa, thread_id) -> (exit_code, resumen)`;
      por defecto el sustrato determinista delega al corredor real (`scripts`).
    - `aprobacion`: decisión humana para reanudar un thread congelado.
    """
    thread_id = thread_id or f"pipeline-{uuid.uuid4().hex}"
    if not plan or any(etapa not in GRAFO_ETAPAS for etapa in plan):
        raise ValueError(f"Plan vacío o etapa desconocida; etapas válidas: {GRAFO_ETAPAS}")
    if len(plan) != len(set(plan)):
        raise ValueError("El plan contiene etapas duplicadas")
    for etapa, handler in (manejadores or {}).items():
        if handler is not None and not callable(handler):
            raise TypeError(f"manejador de '{etapa}' no es callable")
    if corte is not None:
        verificar_manifiesto_corte(*corte)
        corte = (corte[0].resolve(), corte[1], corte[2])
    if planeacion is not None and aprobacion is None:
        if corte is None:
            raise ValueError("El análisis de planeación requiere un corte explícito")
        planeacion.referencia().leer(ContextoCorte(corte[2], corte[0], corte[1]))
    _MANEJADORES_POR_THREAD[thread_id] = manejadores or MANEJADORES_DEFECTO
    config = _config_thread(thread_id)
    if aprobacion is not None:
        entrada: Any = Command(resume=aprobacion.model_dump())
    else:
        entrada = {
            "thread_id": thread_id,
            "run_id": str(corte[2]) if corte is not None else str(uuid.uuid4()),
            "corte_manifest_path": str(corte[0]) if corte is not None else "",
            "corte_manifest_sha256": corte[1] if corte is not None else "",
            "solicitud_planeacion": planeacion.normalizada() if planeacion is not None else {},
            "plan": plan,
            "mensajes": [],
            "traza": [],
            "resultados": {},
            "pareceres": {},
            "decisiones": {},
            "requiere_revision_humana": False,
        }

    async def invocar() -> dict[str, Any]:
        async with AsyncPostgresSaver.from_conn_string(_url_checkpoint()) as checkpointer:
            if aprobacion is not None:
                checkpoint = await checkpointer.aget_tuple(config)
                if checkpoint is None:
                    raise ValueError(f"No existe checkpoint durable para el thread {thread_id}")
                guardado = checkpoint.checkpoint["channel_values"]
                if corte is not None and (
                    guardado.get("corte_manifest_path") != str(corte[0])
                    or guardado.get("corte_manifest_sha256") != corte[1]
                    or guardado.get("run_id") != str(corte[2])
                ):
                    raise ValueError("La reanudación no puede cambiar el corte del checkpoint")
                if planeacion is not None and (guardado.get("solicitud_planeacion") != planeacion.normalizada()):
                    raise ValueError("La reanudación no puede cambiar la referencia de planeación del checkpoint")
            return await _make_graph(checkpointer).ainvoke(entrada, config)

    try:
        resultado = asyncio.run(invocar())
    except BaseException:
        _MANEJADORES_POR_THREAD.pop(thread_id, None)
        raise
    if "__interrupt__" not in resultado:
        _MANEJADORES_POR_THREAD.pop(thread_id, None)
    return {
        "thread_id": thread_id,
        "run_id": resultado.get("run_id") or thread_id,
        "corte_manifest_path": resultado.get("corte_manifest_path") or None,
        "corte_manifest_sha256": resultado.get("corte_manifest_sha256") or None,
        "solicitud_planeacion": resultado.get("solicitud_planeacion") or None,
        "resultado_planeacion": resultado.get("resultado_planeacion") or None,
        "estado_checkpointer": resultado.get("estado_checkpointer"),
        "pareceres": resultado.get("pareceres") or {},
        "decisiones": resultado.get("decisiones") or {},
        "resultados": resultado.get("resultados") or {},
        "traza": resultado.get("traza") or [],
        "mensajes": resultado.get("mensajes") or [],
        "interrumpido": "__interrupt__" in resultado,
        "__interrupt__": resultado.get("__interrupt__"),
    }
