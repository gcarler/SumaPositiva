import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FormularioConsulta(Base):
    __tablename__ = "formularios_consulta"
    __table_args__ = (
        CheckConstraint("estado IN ('BORRADOR', 'PUBLICADO', 'CERRADO')", name="estado_valido"),
        CheckConstraint("jsonb_typeof(esquema_preguntas) = 'array'", name="preguntas_array"),
        CheckConstraint(
            "documento_constructor IS NULL OR jsonb_typeof(documento_constructor) = 'object'",
            name="documento_objeto",
        ),
        UniqueConstraint("slug", name="uq_formulario_slug"),
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
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    documento_constructor: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
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
    estado: Mapped[str] = mapped_column(String(50), server_default=text("'PUBLICADO'"), nullable=False)
    esquema_preguntas: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    enfoque_diferencial_habilitado: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    permite_evidencias: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    respuestas: Mapped[list["RespuestaFormulario"]] = relationship(
        "RespuestaFormulario", back_populates="formulario", passive_deletes="all"
    )


class RespuestaFormulario(Base):
    __tablename__ = "respuestas_formulario"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(datos_respuesta) = 'object'", name="datos_objeto"),
        CheckConstraint("jsonb_typeof(datos_enfoque) = 'object'", name="enfoque_objeto"),
        CheckConstraint("jsonb_typeof(evidencias) = 'array'", name="evidencias_array"),
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
        ForeignKey(
            "participacion_ciudadana.formularios_consulta.id",
            ondelete="RESTRICT",
            name="fk_respuestas_formulario_formulario_id_formularios_consulta",
        ),
        nullable=False,
    )
    sujeto_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    datos_enfoque: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    datos_respuesta: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    evidencias: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    formulario: Mapped["FormularioConsulta"] = relationship("FormularioConsulta", back_populates="respuestas")
