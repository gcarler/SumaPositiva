import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, desc, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TestimonioComunitario(Base):
    """Testimonio Comunitario y Memoria Social de la Ciudadanía en Cartagena."""

    __tablename__ = "testimonios_comunitarios"
    __table_args__ = (
        Index("idx_testimonios_estado", "estado", postgresql_where="activo = true"),
        Index("idx_testimonios_territorio", "territorio_id"),
        Index("idx_testimonios_dimension", "dimension_id"),
        Index("idx_testimonios_fecha", desc("creado_en")),
        {"schema": "participacion_ciudadana"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.public.generar_uuid_v7(),
    )
    codigo_unico: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sujeto_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    nombre_autor: Mapped[str] = mapped_column(String(200), nullable=False)
    organizacion_comunitaria: Mapped[str | None] = mapped_column(String(200), nullable=True)
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    titulo: Mapped[str] = mapped_column(String(250), nullable=False)
    relato: Mapped[str] = mapped_column(Text, nullable=False)
    url_foto: Mapped[str | None] = mapped_column(String(500), nullable=True)
    url_audio_video: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metadatos_enfoque: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    estado: Mapped[str] = mapped_column(String(30), default="PENDIENTE", nullable=False)
    motivo_moderacion: Mapped[str | None] = mapped_column(Text, nullable=True)
    moderado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    moderado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.clock_timestamp(),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.clock_timestamp(),
        onupdate=func.clock_timestamp(),
        nullable=False,
    )

    territorio = relationship("Territorio", lazy="selectin")
    dimension = relationship("DimensionSeguridadHumana", lazy="selectin")
