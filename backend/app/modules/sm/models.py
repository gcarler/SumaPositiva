"""Modelos SQLAlchemy portables del núcleo SM.

Estas tablas existen en el mismo entorno de producción, pero son intencionalmente
genéricas: cualquier software puede reutilizarlas sin acoplarse a las entidades
de POLIS. Solo el núcleo conoce eventos, mensajes, consentimientos, entregas y
auditoría.
"""

import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import conv

from app.core.database import Base

SCHEMA = "participacion_ciudadana"


class SMEventoRegistro(Base):
    """Evento durable de SM. Un evento es la intención trazable y auditable."""

    __tablename__ = "sm_eventos"
    __table_args__ = (
        CheckConstraint("tenant <> ''", name=conv("chk_sm_eventos_tenant")),
        Index("uq_sm_eventos_tenant_idempotencia", "tenant", "idempotencia", unique=True),
        Index("ix_sm_eventos_tenant_creado", "tenant", "creado_en"),
        Index("ix_sm_eventos_tipo", "tipo_evento"),
        {
            "schema": SCHEMA,
            "comment": "Eventos transaccionales portables del núcleo SM",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    tenant: Mapped[str] = mapped_column(String(32), nullable=False)
    tipo_evento: Mapped[str] = mapped_column(String(80), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), nullable=False)
    entidad: Mapped[str | None] = mapped_column(String(80), nullable=True)
    entidad_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    idempotencia: Mapped[str] = mapped_column(String(255), nullable=False)
    origen: Mapped[str] = mapped_column(String(120), nullable=False)
    canal: Mapped[str] = mapped_column(String(20), nullable=False)
    contacto_hash: Mapped[str] = mapped_column(String(80), nullable=False)
    plantilla: Mapped[str | None] = mapped_column(String(80), nullable=True)
    asunto: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cuerpo: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )


class SMMensajeRegistro(Base):
    """Mensaje generado a partir de un evento, por canal y tenant."""

    __tablename__ = "sm_mensajes"
    __table_args__ = (
        CheckConstraint("tenant <> ''", name=conv("chk_sm_mensajes_tenant")),
        CheckConstraint(
            "estado IN ('pendiente','encolado','enviado','entregado','fallido','agotado','cancelado')",
            name=conv("chk_sm_mensajes_estado"),
        ),
        CheckConstraint("idempotencia <> ''", name=conv("chk_sm_mensajes_idempotencia")),
        Index("uq_sm_mensajes_tenant_idempotencia", "tenant", "idempotencia", unique=True),
        Index("ix_sm_mensajes_cola", "estado", "canal"),
        Index("ix_sm_mensajes_evento", "evento_id"),
        Index("ix_sm_mensajes_creado", "creado_en"),
        {
            "schema": SCHEMA,
            "comment": "Outbox portable del núcleo SM",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.sm_eventos.id", name="fk_sm_mensajes_evento"),
        nullable=False,
    )
    tenant: Mapped[str] = mapped_column(String(32), nullable=False)
    canal: Mapped[str] = mapped_column(String(20), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), nullable=False)
    contacto_hash: Mapped[str] = mapped_column(String(80), nullable=False)
    plantilla: Mapped[str | None] = mapped_column(String(80), nullable=True)
    asunto: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cuerpo: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False)
    idempotencia: Mapped[str] = mapped_column(String(255), nullable=False)
    metadatos: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    creado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    actualizado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )


class SMEntregaRegistro(Base):
    """Registro atómico de cada intento de entrega de un mensaje."""

    __tablename__ = "sm_entregas"
    __table_args__ = (
        CheckConstraint("idempotencia <> ''", name=conv("chk_sm_entregas_mensaje")),
        CheckConstraint(
            "estado_entrega IN ('enviado','fallido')",
            name=conv("chk_sm_entregas_estado"),
        ),
        Index("uq_sm_entregas_mensaje_intento", "mensaje_id", "intento", unique=True),
        Index("ix_sm_entregas_mensaje", "mensaje_id"),
        Index("ix_sm_entregas_creado", "creado_en"),
        {
            "schema": SCHEMA,
            "comment": "Registro de intentos de entrega por canal SM",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    mensaje_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.sm_mensajes.id", name="fk_sm_entregas_mensaje"),
        nullable=False,
    )
    tenant: Mapped[str] = mapped_column(String(32), nullable=False)
    idempotencia: Mapped[str] = mapped_column(String(255), nullable=False)
    canal: Mapped[str] = mapped_column(String(20), nullable=False)
    intento: Mapped[int] = mapped_column(Integer, nullable=False)
    estado_entrega: Mapped[str] = mapped_column(String(20), nullable=False)
    externo_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    detalle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payload: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    creado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )


class SMAuditoriaRegistro(Base):
    """Trazabilidad independiente de la entrega. No guarda PII, solo hash."""

    __tablename__ = "sm_auditorias"
    __table_args__ = (
        CheckConstraint("hash <> ''", name=conv("chk_sm_auditorias_hash")),
        Index("ix_sm_auditorias_tenant_creado", "tenant", "creado_en"),
        Index("ix_sm_auditorias_evento", "evento_id"),
        Index("ix_sm_auditorias_mensaje", "mensaje_id"),
        {
            "schema": SCHEMA,
            "comment": "Auditoría portable de SM sin PII",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    evento_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.sm_eventos.id", name="fk_sm_auditorias_evento"),
        nullable=True,
    )
    mensaje_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.sm_mensajes.id", name="fk_sm_auditorias_mensaje"),
        nullable=True,
    )
    tenant: Mapped[str] = mapped_column(String(32), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), nullable=False)
    accion: Mapped[str] = mapped_column(String(80), nullable=False)
    detalle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hash: Mapped[str] = mapped_column(String(80), nullable=False)
    creado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )


class SMConsentimientoRegistro(Base):
    """Consentimiento portable por canal y contacto hash. Nunca guarda contacto crudo."""

    __tablename__ = "sm_consentimientos"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('otorgado','revocado')",
            name=conv("chk_sm_consentimientos_estado"),
        ),
        Index(
            "uq_sm_consentimientos_tenant_actor_canal_contacto",
            "tenant",
            "actor",
            "canal",
            "contacto_hash",
            unique=True,
        ),
        Index("ix_sm_consentimientos_tenant", "tenant"),
        Index("ix_sm_consentimientos_actualizado", "actualizado_en"),
        {
            "schema": SCHEMA,
            "comment": "Consentimiento por canal y contacto hash",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    tenant: Mapped[str] = mapped_column(String(32), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), nullable=False)
    canal: Mapped[str] = mapped_column(String(20), nullable=False)
    contacto_hash: Mapped[str] = mapped_column(String(80), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False)
    origen: Mapped[str] = mapped_column(String(120), nullable=False)
    creado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    actualizado_en: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
