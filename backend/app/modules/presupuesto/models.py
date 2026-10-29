import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FuenteFinanciacion(Base):
    __tablename__ = "fuentes_financiacion"
    __table_args__ = (
        Index("idx_fuentes_codigo", "codigo", postgresql_include=[]),
        {"schema": "presupuesto"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_fuente: Mapped[str] = mapped_column(String(50), nullable=False)
    base_legal: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )


class AsignacionPresupuestal(Base):
    __tablename__ = "asignaciones_presupuestales"
    __table_args__ = (
        Index("idx_asignaciones_fuente", "fuente_financiacion_id", postgresql_include=[]),
        {"schema": "presupuesto"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    fuente_financiacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("presupuesto.fuentes_financiacion.id", ondelete="RESTRICT"),
        nullable=False,
    )
    linea_estrategica_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.lineas_estrategicas.id", ondelete="SET NULL"),
        nullable=True,
    )
    nodo_instrumento_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    monto_estimado: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    anio_vigencia: Mapped[int] = mapped_column(Integer, nullable=False)
    es_vigencia_futura: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    tipo_vigencia_futura: Mapped[str | None] = mapped_column(String(50), nullable=True)
    codigo_bpin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    justificacion: Mapped[str] = mapped_column(Text, nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
