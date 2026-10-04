import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Index, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CompromisoPAS(Base):
    """Compromiso Institucional del Plan de Acción y Seguimiento (PAS).
    
    Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026–2036.
    Desagregación vinculante de alternativas MGA hacia entidades distritales ejecutoras.
    """

    __tablename__ = "compromisos_pas"
    __table_args__ = (
        Index("idx_compromisos_codigo", "codigo", postgresql_include=[]),
        Index("idx_compromisos_entidad", "entidad_responsable", postgresql_include=[]),
        Index("idx_compromisos_estado", "estado", postgresql_include=[]),
        {"schema": "seguimiento", "comment": "Matriz de compromisos institucionales del PAS Cartagena"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    entidad_responsable: Mapped[str] = mapped_column(String(150), nullable=False)
    linea_estrategica_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    alternativa_mga_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    indicador_asociado_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    meta_cuatrienal_descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    meta_cuatrienal_valor: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    avance_cuatrienal_valor: Mapped[float | None] = mapped_column(
        Numeric(14, 4), server_default=None, nullable=True
    )
    porcentaje_cumplimiento: Mapped[float | None] = mapped_column(
        Numeric(6, 2), server_default=None, nullable=True
    )
    presupuesto_anual_cop: Mapped[float | None] = mapped_column(
        Numeric(16, 2), server_default=None, nullable=True
    )
    vigencias_programadas: Mapped[list[int]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(30), server_default="sin_reporte", nullable=False
    )
    fecha_corte_ultimo_reporte: Mapped[date | None] = mapped_column(
        Date, server_default=None, nullable=True
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
