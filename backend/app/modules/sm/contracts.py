"""Contratos agnósticos del núcleo portable SM."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

FIRMA_VERSION = "sm-v1"


class SMCanal(StrEnum):
    """Canales portables soportados en la primera fase."""

    CORREO = "correo"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    SMS = "sms"
    WEBHOOK = "webhook"


class SMEstadoMensaje(StrEnum):
    """Estados controlados del outbox portable."""

    PENDIENTE = "pendiente"
    ENCOLADO = "encolado"
    ENVIADO = "enviado"
    ENTREGADO = "entregado"
    FALLIDO = "fallido"
    AGOTADO = "agotado"
    CANCELADO = "cancelado"
    SIMULADO = "simulado"


class SMEstadoEntrega(StrEnum):
    """Resultado de un intento de entrega."""

    ENVIADO = "enviado"
    FALLIDO = "fallido"
    PREPARADO = "preparado"
    SIMULADO = "simulado"
    EN_CURSO = "en_curso"
    INCIERTO = "incierto"


class SMEstadoConsentimiento(StrEnum):
    """Estado del consentimiento por canal y contacto."""

    OTORGADO = "otorgado"
    REVOCADO = "revocado"


class SMEstadoSalud(StrEnum):
    """Salud agregada del núcleo."""

    SALUDABLE = "saludable"
    DEGRADADO = "degradado"
    CRITICO = "critico"


class SMContacto(BaseModel):
    """Contacto por canal. Nunca debe quedar como PII en auditoría."""

    model_config = ConfigDict(extra="forbid")

    canal: SMCanal
    identificador: str = Field(min_length=3, max_length=255, repr=False)
    actor: str = Field(min_length=1, max_length=120)


class SMEvento(BaseModel):
    """Evento transaccional portable hacia cualquier software."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    tenant: str = Field(min_length=1, max_length=32, default="polis")
    tipo_evento: str = Field(min_length=3, max_length=80)
    actor: str = Field(min_length=1, max_length=120)
    entidad: str | None = Field(default=None, min_length=1, max_length=80)
    entidad_id: str | None = Field(default=None, min_length=1, max_length=200)
    payload: dict[str, str] = Field(default_factory=dict)
    idempotencia: str = Field(..., min_length=8, max_length=255)
    origen: str = Field(default="sm", min_length=1, max_length=120)
    canal: SMCanal
    contacto: SMContacto
    plantilla: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_\-\.]{1,79}$")
    asunto: str | None = Field(default=None, max_length=200)
    cuerpo: str | None = None
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SMMensaje(BaseModel):
    """Mensaje del outbox portable. No guarda contacto crudo, solo hash."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    tenant: str = Field(min_length=1, max_length=32, default="polis")
    evento_id: UUID
    canal: SMCanal
    actor: str = Field(min_length=1, max_length=120)
    contacto_hash: str = Field(..., max_length=80)
    plantilla: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_\-\.]{1,79}$")
    asunto: str | None = Field(default=None, max_length=200)
    cuerpo: str | None = None
    estado: SMEstadoMensaje = SMEstadoMensaje.PENDIENTE
    idempotencia: str = Field(..., min_length=8, max_length=255)
    metadatos: dict[str, str] = Field(default_factory=dict)
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))
    actualizado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))

    proximo_intento_en: datetime | None = None


class SMEntrega(BaseModel):
    """Intento de entrega registrado de forma forense."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    tenant: str = Field(min_length=1, max_length=32, default="polis")
    mensaje_id: UUID
    canal: SMCanal
    intento: int = Field(ge=1)
    estado_entrega: SMEstadoEntrega
    externo_id: str | None = Field(default=None, max_length=200)
    detalle: str | None = Field(default=None, max_length=500)
    payload: dict[str, str] = Field(default_factory=dict)
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SMAuditoria(BaseModel):
    """Auditoría portable sin PII y con hash forense."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    tenant: str = Field(min_length=1, max_length=32, default="polis")
    evento_id: UUID | None = None
    mensaje_id: UUID | None = None
    actor: str = Field(min_length=1, max_length=120)
    accion: str = Field(min_length=1, max_length=80)
    detalle: str | None = Field(default=None, max_length=500)
    hash: str = Field(..., max_length=80)
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SMConsentimiento(BaseModel):
    """Consentimiento durable por canal y hash de contacto."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    tenant: str = Field(min_length=1, max_length=32, default="polis")
    actor: str = Field(min_length=1, max_length=120)
    canal: SMCanal
    contacto_hash: str = Field(..., max_length=80)
    estado: SMEstadoConsentimiento
    origen: str = Field(default="sm", min_length=1, max_length=120)
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))
    actualizado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SMResultadoEntrega(BaseModel):
    """Resultado de adaptar un mensaje a un canal."""

    model_config = ConfigDict(extra="forbid")

    mensaje_id: UUID
    canal: SMCanal
    intento: int = Field(ge=1)
    estado_entrega: SMEstadoEntrega = SMEstadoEntrega.PREPARADO
    payload: dict[str, str] = Field(default_factory=dict)
    externo_id: str | None = Field(default=None, max_length=200)
    detalle: str | None = Field(default=None, max_length=500)
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SMSalud(BaseModel):
    """Salud agregada del núcleo SM."""

    model_config = ConfigDict(extra="forbid")

    tenant: str = Field(min_length=1, max_length=32, default="polis")
    estado: SMEstadoSalud
    pendientes: int = Field(ge=0)
    enviados: int = Field(ge=0)
    fallidos: int = Field(ge=0)
    canales_vivos: tuple[SMCanal, ...] = ()
    motivos: tuple[str, ...] = ()
    actualizado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))
    simulados: int = Field(default=0, ge=0)
    worker_ultimo_latido: datetime | None = None
    antiguedad_pendiente_segundos: float | None = None
    canales_degradados: tuple[SMCanal, ...] = ()
