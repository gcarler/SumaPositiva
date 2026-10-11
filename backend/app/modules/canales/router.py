"""Enrutador FastAPI para el canal de WhatsApp e ingesta comunitaria directa."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import get_session
from app.modules.canales.schemas import (
    WhatsAppIngestaRespuesta,
    WhatsAppSimulacionEntrante,
    WhatsAppWebhookPayload,
)
from app.modules.canales.service import CanalWhatsAppService

logger = logging.getLogger("polis.canales.whatsapp.router")

router = APIRouter()

WHATSAPP_VERIFY_TOKEN_DEFAULT = "polis_cartagena_2026"


def obtener_verify_token() -> str:
    """Obtiene el token de verificación del webhook desde la configuración o valor por defecto."""
    try:
        cfg = Settings()
        return getattr(cfg, "whatsapp_verify_token", None) or WHATSAPP_VERIFY_TOKEN_DEFAULT
    except Exception:
        return WHATSAPP_VERIFY_TOKEN_DEFAULT


@router.get(
    "/webhook",
    summary="Verificación del Webhook de WhatsApp Cloud API",
    description=(
        "Handshake público estándar exigido por Meta WhatsApp Cloud API para verificar el webhook. "
        "Valida que hub.mode sea 'subscribe' y que hub.verify_token coincida con el configurado."
    ),
    response_class=PlainTextResponse,
    status_code=status.HTTP_200_OK,
)
async def verificar_webhook_whatsapp(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
) -> PlainTextResponse:
    """Valida la suscripción del webhook de Meta."""
    token_esperado = obtener_verify_token()

    if hub_mode == "subscribe" and hub_verify_token == token_esperado:
        logger.info("Webhook de WhatsApp verificado exitosamente por Meta.")
        return PlainTextResponse(content=hub_challenge or "", status_code=status.HTTP_200_OK)

    logger.warning(
        "Fallo de verificación en webhook de WhatsApp: mode=%s token_recibido=%s",
        hub_mode,
        hub_verify_token,
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verificación de webhook inválida. Token no coincide.",
    )


@router.post(
    "/webhook",
    summary="Recepción de Mensajes y Eventos de WhatsApp Cloud API",
    description=(
        "Recepción asíncrona de mensajes comunitarios enviados vía WhatsApp. Procesa texto, "
        "audios o imágenes y genera automáticamente la radicación oficial POL-2026-XXXX."
    ),
    status_code=status.HTTP_200_OK,
)
async def recibir_evento_whatsapp(
    payload: WhatsAppWebhookPayload,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Recibe y enruta los mensajes entrantes de WhatsApp."""
    try:
        service = CanalWhatsAppService(session)
        procesados = await service.procesar_webhook_meta(payload)
        return {
            "status": "received",
            "mensajes_procesados": len(procesados),
            "radicados": [p.codigo_radicado for p in procesados],
        }
    except Exception as e:
        logger.exception("Error al procesar evento de webhook de WhatsApp: %s", str(e))
        # Siempre retornar 200 OK a Meta para evitar reintentos continuos en caso de mensaje malformado
        return {"status": "error_captured", "detail": str(e)}


@router.post(
    "/simular",
    response_model=WhatsAppIngestaRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Simulación de Ingesta Comunitaria vía WhatsApp",
    description=(
        "Endpoint para pruebas y auditoría forense que procesa un mensaje como si proviniese "
        "de un líder comunitario en un barrio popular de Cartagena. Genera radicado oficial "
        "POL-2026-XXXX y retorna el acuse institucional de recibo."
    ),
)
async def simular_mensaje_whatsapp(
    datos: WhatsAppSimulacionEntrante,
    session: AsyncSession = Depends(get_session),
) -> WhatsAppIngestaRespuesta:
    """Simula la llegada de un reporte o propuesta comunitaria vía WhatsApp."""
    service = CanalWhatsAppService(session)
    return await service.registrar_mensaje_comunitario(
        telefono_remitente=datos.telefono_remitente,
        nombre_remitente=datos.nombre_remitente,
        texto_mensaje=datos.texto_mensaje,
        tipo_mensaje=datos.tipo_mensaje,
        linea_id=datos.linea_id,
        territorio_id=datos.territorio_id,
    )
