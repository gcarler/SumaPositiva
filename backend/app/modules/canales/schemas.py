"""Esquemas Pydantic v2 para el canal de WhatsApp e ingesta comunitaria directa."""

import uuid
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class WhatsAppWebhookVerification(BaseModel):
    """Esquema de verificación de webhook de Meta Cloud API (GET handshake)."""

    hub_mode: str = Field(alias="hub.mode")
    hub_verify_token: str = Field(alias="hub.verify_token")
    hub_challenge: str = Field(alias="hub.challenge")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class WhatsAppTextMessage(BaseModel):
    """Sub-objeto de mensaje de texto."""

    body: str = Field(..., description="Cuerpo del mensaje de texto")


class WhatsAppMediaMessage(BaseModel):
    """Sub-objeto para audios, imágenes o documentos."""

    id: str | None = None
    mime_type: str | None = None
    sha256: str | None = None
    caption: str | None = None
    filename: str | None = None


class WhatsAppMessage(BaseModel):
    """Estructura de mensaje individual de Meta WhatsApp Cloud API."""

    from_: str = Field(alias="from", description="Número de teléfono remitente en formato E.164")
    id: str = Field(..., description="ID único del mensaje de WhatsApp")
    timestamp: str | None = None
    type: str = Field(default="text", description="text, audio, image, document, etc.")
    text: WhatsAppTextMessage | None = None
    audio: WhatsAppMediaMessage | None = None
    image: WhatsAppMediaMessage | None = None
    document: WhatsAppMediaMessage | None = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class WhatsAppContactProfile(BaseModel):
    """Perfil del contacto remitente."""

    name: str = Field(default="Líder Comunitario WhatsApp")


class WhatsAppContact(BaseModel):
    """Contacto de WhatsApp remitente."""

    profile: WhatsAppContactProfile = Field(default_factory=WhatsAppContactProfile)
    wa_id: str

    model_config = ConfigDict(extra="allow")


class WhatsAppValue(BaseModel):
    """Cuerpo de valor del cambio de webhook."""

    messaging_product: str = "whatsapp"
    metadata: dict[str, Any] = Field(default_factory=dict)
    contacts: list[WhatsAppContact] = Field(default_factory=list)
    messages: list[WhatsAppMessage] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class WhatsAppChange(BaseModel):
    """Cambio unitario de webhook."""

    value: WhatsAppValue
    field: str = "messages"

    model_config = ConfigDict(extra="allow")


class WhatsAppEntry(BaseModel):
    """Entrada de webhook de Meta."""

    id: str
    changes: list[WhatsAppChange] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class WhatsAppWebhookPayload(BaseModel):
    """Payload estándar de Meta WhatsApp Cloud API."""

    object: str = "whatsapp_business_account"
    entry: list[WhatsAppEntry] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class WhatsAppSimulacionEntrante(BaseModel):
    """Esquema para simulación directa de pruebas y auditoría forense."""

    telefono_remitente: str = Field(
        ...,
        min_length=7,
        max_length=25,
        description="Número de teléfono del remitente (ej. +573001234567)",
    )
    nombre_remitente: str = Field(
        default="Líder Comunitario WhatsApp",
        max_length=150,
        description="Nombre o seudónimo del líder comunitario",
    )
    texto_mensaje: str = Field(
        ...,
        min_length=5,
        description="Texto del mensaje, reporte barrial o propuesta cívica",
    )
    tipo_mensaje: Literal["text", "audio", "image", "document"] = Field(
        default="text",
        description="Tipo de mensaje simulado",
    )
    linea_id: uuid.UUID | None = Field(
        default=None,
        description="UUID opcional de la línea estratégica (se infiere si no se indica)",
    )
    territorio_id: uuid.UUID | None = Field(
        default=None,
        description="UUID opcional del territorio distrital (se infiere si no se indica)",
    )


class WhatsAppIngestaRespuesta(BaseModel):
    """DTO de respuesta tras la ingesta y radicación de la propuesta."""

    codigo_radicado: str = Field(
        ...,
        description="Código oficial de radicación inmutable POL-2026-XXXX",
    )
    propuesta_id: uuid.UUID = Field(
        ...,
        description="UUIDv7 asignado a la propuesta en base de datos",
    )
    titulo: str = Field(
        ...,
        description="Título sintético asignado a la propuesta comunitaria",
    )
    canal: str = Field(
        default="whatsapp",
        description="Canal de origen verificado",
    )
    territorio_identificado: str | None = Field(
        default=None,
        description="Barrio, corregimiento o localidad popular identificada",
    )
    mensaje_respuesta: str = Field(
        ...,
        description="Mensaje institucional generado para el acuse de recibo en WhatsApp",
    )
