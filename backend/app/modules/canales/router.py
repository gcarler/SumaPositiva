"""Webhook autenticado: el acuse confirma recepción durable, el worker radica después."""

import hashlib
import hmac

from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.canales.schemas import (
    WhatsAppIngestaRespuesta,
    WhatsAppRecepcionRespuesta,
    WhatsAppSimulacionEntrante,
    WhatsAppWebhookPayload,
)
from app.modules.canales.service import CanalWhatsAppService

router = APIRouter()


def configuracion_webhook(request: Request) -> Settings:
    cfg = request.app.state.settings
    if not cfg.whatsapp_habilitado or not cfg.whatsapp_verify_token or not cfg.whatsapp_app_secret:
        raise HTTPException(503, "Recepción WhatsApp deshabilitada o sin configuración completa")
    return cfg


@router.get(
    "/webhook",
    summary="Verificación del Webhook de WhatsApp Cloud API",
    response_class=PlainTextResponse,
    status_code=status.HTTP_200_OK,
)
async def verificar_webhook_whatsapp(
    request: Request,
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
) -> PlainTextResponse:
    cfg = configuracion_webhook(request)
    if hub_mode == "subscribe" and hmac.compare_digest(hub_verify_token or "", cfg.whatsapp_verify_token):
        return PlainTextResponse(content=hub_challenge or "", status_code=200)
    raise HTTPException(403, "Verificación de webhook inválida")


@router.post(
    "/webhook",
    response_model=WhatsAppRecepcionRespuesta,
    summary="Recepción durable de mensajes WhatsApp",
    description="HTTP200 confirma el inbox del lote. La radicación y los rechazos se resuelven después por mensaje.",
    status_code=status.HTTP_200_OK,
)
async def recibir_evento_whatsapp(
    payload: WhatsAppWebhookPayload,
    request: Request,
    session: SessionDependency,
    x_hub_signature_256: str | None = Header(default=None, alias="X-Hub-Signature-256"),
) -> WhatsAppRecepcionRespuesta:
    cfg = configuracion_webhook(request)
    firma = "sha256=" + hmac.new(cfg.whatsapp_app_secret.encode(), await request.body(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(x_hub_signature_256 or "", firma):
        raise HTTPException(401, "Firma de webhook inválida")
    return await CanalWhatsAppService(session).procesar_webhook_meta(payload)


@router.post(
    "/simular",
    response_model=WhatsAppIngestaRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Simulación local de ingesta comunitaria WhatsApp",
)
async def simular_mensaje_whatsapp(
    datos: WhatsAppSimulacionEntrante,
    request: Request,
    session: SessionDependency,
) -> WhatsAppIngestaRespuesta:
    if request.app.state.settings.environment == "production":
        raise HTTPException(403, "La simulación WhatsApp no está habilitada en producción")
    return await CanalWhatsAppService(session).registrar_mensaje_comunitario(
        telefono_remitente=datos.telefono_remitente,
        nombre_remitente=datos.nombre_remitente,
        texto_mensaje=datos.texto_mensaje,
        tipo_mensaje=datos.tipo_mensaje,
        linea_id=datos.linea_id,
        territorio_id=datos.territorio_id,
    )
