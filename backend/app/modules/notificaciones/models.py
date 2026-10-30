"""Modelos SQLAlchemy para notificaciones transaccionales y fe pública de radicación."""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import conv

from app.core.database import Base


class NotificacionTransaccional(Base):
    """Intención durable de entrega, reclamada después del commit por un consumidor."""

    __tablename__ = "notificaciones_transaccionales"
    __table_args__ = (
        CheckConstraint(
            "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion', 'registro_bienvenida', "
            "'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana')",
            name=conv("chk_notificaciones_tipo_evento"),
        ),
        CheckConstraint(
            "estado_envio IN ('pendiente', 'procesando', 'enviado', 'simulado', 'fallido')",
            name=conv("chk_notificaciones_estado_envio"),
        ),
        Index("idx_notif_codigo_radicado", "codigo_radicado"),
        Index("idx_notif_destinatario", "destinatario_correo"),
        Index("idx_notif_creado_en", "creado_en"),
        Index("idx_notif_cola", "estado_envio", "proximo_intento_en"),
        {
            "schema": "participacion_ciudadana",
            "comment": (
                "Constancias de radicación y avisos transaccionales "
                "para erradicar el silencio administrativo (C-150/15)"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo_radicado: Mapped[str] = mapped_column(String(50), nullable=False)
    destinatario_correo: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_evento: Mapped[str] = mapped_column(String(50), nullable=False)
    asunto: Mapped[str] = mapped_column(String(250), nullable=False)
    cuerpo_html: Mapped[str] = mapped_column(Text, nullable=False)
    estado_envio: Mapped[str] = mapped_column(String(30), nullable=False)
    error_detalle: Mapped[str | None] = mapped_column(Text, nullable=True)
    intentos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"), default=0)
    proximo_intento_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reclamo_token: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    reclamo_vence_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    enviado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    simulado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
