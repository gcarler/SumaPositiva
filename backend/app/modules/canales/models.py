"""Recepción privada y durable de mensajes del proveedor WhatsApp."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CHAR, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import conv

from app.core.database import Base


class WhatsAppInbox(Base):
    __tablename__ = "whatsapp_inbox"
    __table_args__ = (
        UniqueConstraint("cuenta_proveedor", "mensaje_externo_id", name="uq_whatsapp_inbox_mensaje"),
        CheckConstraint(
            "estado IN ('pendiente', 'procesando', 'procesado', 'rechazado', 'error')",
            name=conv("chk_whatsapp_inbox_estado"),
        ),
        Index("idx_whatsapp_inbox_cola", "estado", "proximo_intento_en"),
        {"schema": "participacion_ciudadana", "comment": "Recepción privada durable y resultado por mensaje WhatsApp"},
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    cuenta_proveedor: Mapped[str] = mapped_column(String(300), nullable=False)
    mensaje_externo_id: Mapped[str] = mapped_column(String(300), nullable=False)
    contenido_hash: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'pendiente'"))
    intentos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    error_codigo: Mapped[str | None] = mapped_column(String(100))
    propuesta_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("participacion_ciudadana.propuestas_ciudadanas.id", ondelete="RESTRICT")
    )
    resultado: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    reclamo_token: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    reclamo_vence_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    proximo_intento_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recibido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )
    procesado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
