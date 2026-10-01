import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FormularioConsulta(Base):
    __tablename__ = "formularios_consulta"
    __table_args__ = (
        Index("idx_formularios_codigo", "codigo", postgresql_include=[]),
        Index("idx_formularios_dimension", "dimension_id", postgresql_include=[]),
        Index("idx_formularios_territorio", "territorio_id", postgresql_include=[]),
        Index("idx_formularios_estado", "estado", postgresql_include=[]),
        {"schema": "participacion_ciudadana"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    titulo: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    estado: Mapped[str] = mapped_column(
        String(50), server_default=text("'PUBLICADO'"), nullable=False
    )
    esquema_preguntas: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    enfoque_diferencial_habilitado: Mapped[bool] = mapped_column(
        Boolean, server_default=text("true"), nullable=False
    )
    permite_evidencias: Mapped[bool] = mapped_column(
        Boolean, server_default=text("true"), nullable=False
    )
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    respuestas: Mapped[list["RespuestaFormulario"]] = relationship(
        "RespuestaFormulario", back_populates="formulario", cascade="all, delete-orphan"
    )


class RespuestaFormulario(Base):
    __tablename__ = "respuestas_formulario"
    __table_args__ = (
        UniqueConstraint("formulario_id", "sujeto_id", name="uq_respuesta_formulario_sujeto"),
        Index("idx_respuestas_formulario", "formulario_id", postgresql_include=[]),
        Index("idx_respuestas_sujeto", "sujeto_id", postgresql_include=[]),
        {"schema": "participacion_ciudadana"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    formulario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.formularios_consulta.id", ondelete="CASCADE"),
        nullable=False,
    )
    sujeto_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    datos_enfoque: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    datos_respuesta: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    evidencias: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    formulario: Mapped["FormularioConsulta"] = relationship(
        "FormularioConsulta", back_populates="respuestas"
    )
