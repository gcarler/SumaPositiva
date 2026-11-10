"""Router HTTP para el núcleo portable SM.

Expone endpoints seguros y transaccionales para ingesta de eventos, gestión de
consentimiento (Habeas Data Ley 1581 / GDPR), inspección del outbox y salud
operativa sin exponer jamás datos de contacto en texto claro.
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.database import SessionDependency
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso

from .boveda import SMBovedaError
from .contracts import (
    SMCanal,
    SMConsentimiento,
    SMContacto,
    SMEstadoMensaje,
    SMEvento,
    SMMensaje,
    SMSalud,
)
from .core import SMConsentimientoFaltante, SMError, SMIdempotenciaConflict
from .repository import SMRepository
from .service_db import SMServicioDB
from .worker import SMResumenProcesamiento, SMWorker

logger = logging.getLogger("sm.router")

router = APIRouter(prefix="/sm", tags=["SM Core"])
repo = SMRepository(tenant="polis")


# --- Esquemas de entrada y salida ---


class SMConsentimientoIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    actor: str = Field(min_length=1, max_length=120)
    canal: SMCanal
    contacto: str = Field(min_length=3, max_length=255, repr=False)
    consentido: bool
    origen: str = Field(default="api", max_length=120)


class SMEventoIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo_evento: str = Field(min_length=3, max_length=80)
    actor: str = Field(min_length=1, max_length=120)
    canal: SMCanal
    contacto: str = Field(min_length=3, max_length=255, repr=False)
    idempotencia: str = Field(min_length=8, max_length=255)
    entidad: str | None = Field(default=None, max_length=80)
    entidad_id: str | None = Field(default=None, max_length=200)
    plantilla: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_\-\.]{1,79}$")
    asunto: str | None = Field(default=None, max_length=200)
    cuerpo: str | None = None
    payload: dict[str, str] = Field(default_factory=dict)
    origen: str = Field(default="api", max_length=120)


class SMWorkerRunIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limite: int = Field(default=25, ge=1, le=200)


class SMRespuestaVerificacionConsentimiento(BaseModel):
    """Resultado de la verificación; no repite la huella suministrada."""

    actor: str
    canal: SMCanal
    consentido: bool


# --- Endpoints ---


@router.post(
    "/consent",
    response_model=SMConsentimiento,
    status_code=status.HTTP_200_OK,
    summary="Registrar o actualizar consentimiento",
    dependencies=[Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada"))],
)
async def registrar_consentimiento(
    payload: SMConsentimientoIn,
    session: SessionDependency,
    request: Request,
    sujeto: SujetoAutenticadoDep,
) -> SMConsentimiento:
    """Registra de manera segura el consentimiento previo del titular para un canal."""
    try:
        consentimiento = await SMServicioDB(session, settings=request.app.state.settings).registrar_consentimiento(
            actor=payload.actor,
            canal=payload.canal,
            contacto=payload.contacto,
            consentido=payload.consentido,
            origen=payload.origen,
            operador=str(sujeto.sujeto_id),
        )
        return consentimiento
    except SMBovedaError as exc:
        logger.error("sm.boveda_no_configurada")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bóveda de contactos SM no disponible.",
        ) from exc
    except (SMError, ValueError) as exc:
        logger.warning("sm.consentimiento_rechazado")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc) or "No fue posible registrar el consentimiento.",
        ) from exc
    except Exception as exc:
        logger.error("sm.consentimiento_error_interno")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al registrar el consentimiento.",
        ) from exc


@router.get(
    "/consent/{canal}/{actor}",
    response_model=SMRespuestaVerificacionConsentimiento,
    summary="Verificar consentimiento activo",
    dependencies=[Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada"))],
)
async def verificar_consentimiento(
    canal: SMCanal,
    actor: str,
    contacto_hash: Annotated[str, Query(pattern=r"^[a-f0-9]{64}$")],
    session: SessionDependency,
) -> SMRespuestaVerificacionConsentimiento:
    """Verifica si un contacto tiene consentimiento vigente (otorgado) sin exponer el contacto ni repetir su huella."""
    otorgado = await repo.verificar_consentimiento(
        session,
        actor=actor,
        canal=canal,
        contacto_hash=contacto_hash,
    )
    return SMRespuestaVerificacionConsentimiento(
        actor=actor,
        canal=canal,
        consentido=otorgado,
    )


@router.post(
    "/events",
    response_model=SMMensaje,
    status_code=status.HTTP_201_CREATED,
    summary="Ingestar evento transaccional",
    dependencies=[Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada"))],
)
async def procesar_evento(
    payload: SMEventoIn,
    session: SessionDependency,
    request: Request,
    sujeto: SujetoAutenticadoDep,
) -> SMMensaje:
    """Ingresa un evento hacia el outbox multicanal con idempotencia y auditoría forense."""
    contacto = SMContacto(
        canal=payload.canal,
        identificador=payload.contacto,
        actor=payload.actor,
    )
    evento = SMEvento(
        tenant="polis",
        tipo_evento=payload.tipo_evento,
        actor=payload.actor,
        entidad=payload.entidad,
        entidad_id=payload.entidad_id,
        payload=payload.payload,
        idempotencia=payload.idempotencia,
        origen=payload.origen,
        canal=payload.canal,
        contacto=contacto,
        plantilla=payload.plantilla,
        asunto=payload.asunto,
        cuerpo=payload.cuerpo,
    )
    try:
        mensaje = await SMServicioDB(session, settings=request.app.state.settings).procesar_evento(
            evento, operador=str(sujeto.sujeto_id)
        )
        return mensaje
    except SMConsentimientoFaltante as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except SMIdempotenciaConflict as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except SMError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.warning("sm.operacion_fallida")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fallo interno al procesar el evento.",
        ) from exc


@router.get(
    "/messages/{mensaje_id}",
    response_model=SMMensaje,
    summary="Consultar mensaje del outbox",
    dependencies=[Depends(requerir_permiso("auditoria:leer", nivel_minimo="declarada"))],
)
async def consultar_mensaje(
    mensaje_id: UUID,
    session: SessionDependency,
) -> SMMensaje:
    """Consulta el estado del outbox sin exponer PII."""
    mensaje = await repo.obtener_mensaje(session, mensaje_id)
    if not mensaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mensaje {mensaje_id} no encontrado",
        )
    return mensaje


@router.get(
    "/messages",
    response_model=list[SMMensaje],
    summary="Listar mensajes del outbox",
    dependencies=[Depends(requerir_permiso("auditoria:leer", nivel_minimo="declarada"))],
)
async def listar_mensajes(
    session: SessionDependency,
    canal: SMCanal | None = None,
    estado: SMEstadoMensaje | None = None,
    limite: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[SMMensaje]:
    """Lista mensajes del outbox con filtros operativos."""
    mensajes = await repo.listar_mensajes(session, canal=canal, estado=estado, limite=limite)
    return list(mensajes)


@router.post(
    "/worker/run-once",
    response_model=SMResumenProcesamiento,
    summary="Disparar procesamiento de outbox (worker)",
    dependencies=[Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada"))],
)
async def ejecutar_worker(
    request: Request,
    payload: SMWorkerRunIn | None = None,
) -> SMResumenProcesamiento:
    """Ejecuta una ronda de despacho de mensajes encolados aplicando reintentos y auditoría."""
    limite = payload.limite if payload else 25
    try:
        settings = request.app.state.settings
        if not settings.sm_worker_habilitado:
            raise HTTPException(status_code=409, detail="Worker SM deshabilitado por configuración")
        async with request.app.state.database.sessions() as session:
            return await SMWorker(settings=settings).procesar_lote(session, limite=limite)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("sm.operacion_fallida")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fallo interno al ejecutar el worker.",
        ) from exc


@router.get(
    "/health",
    response_model=SMSalud,
    summary="Estado de salud operativo de SM Core",
    dependencies=[Depends(requerir_permiso("auditoria:leer", nivel_minimo="declarada"))],
)
async def salud_sm(
    session: SessionDependency,
    request: Request,
) -> SMSalud:
    """Retorna las métricas agregadas del subsistema de mensajería transaccional."""
    return await repo.salud(session, settings=request.app.state.settings)
