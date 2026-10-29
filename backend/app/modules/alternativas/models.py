import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BancoAlternativas(Base):
    """Iniciativa de solución formulada en el Banco Distrital de Alternativas MGA.

    Estructurada metodológicamente bajo lineamientos DNP para la Política Pública
    de Seguridad Humana Integral de Cartagena de Indias 2026–2036.
    """

    __tablename__ = "banco_alternativas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('en_formulacion', 'viable', 'requiere_ajustes', 'priorizada', 'descartada')",
            name="chk_alternativa_estado",
        ),
        CheckConstraint(
            "sector IN ('seguridad_convivencia', 'proteccion_nna', 'ambiente_habitat', "
            "'genero_inclusion', 'desarrollo_economico', 'educacion_cultura', 'etnico_comunitario')",
            name="chk_alternativa_sector",
        ),
        CheckConstraint("costo_estimado_cop >= 0", name="chk_alternativa_costo_positivo"),
        CheckConstraint("horizonte_anios > 0", name="chk_alternativa_horizonte_positivo"),
        CheckConstraint("poblacion_objetivo_estimada >= 0", name="chk_alternativa_poblacion_positiva"),
        Index("idx_alternativas_codigo", "codigo", postgresql_include=[]),
        Index("idx_alternativas_sector", "sector", postgresql_include=[]),
        Index("idx_alternativas_estado", "estado", postgresql_include=[]),
        Index("idx_alternativas_dimension", "dimension_id", postgresql_include=[]),
        Index("idx_alternativas_linea", "linea_estrategica_id", postgresql_include=[]),
        Index("idx_alternativas_metadatos_gin", "metadatos", postgresql_using="gin", postgresql_include=[]),
        {
            "schema": "motor_politicas",
            "comment": "Banco Distrital de Alternativas MGA para Seguridad Humana Cartagena 2026-2036",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, default="", server_default=text("''"), nullable=False)
    sector: Mapped[str] = mapped_column(String(50), nullable=False)
    linea_estrategica_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.lineas_estrategicas.id", ondelete="SET NULL"),
        nullable=True,
    )
    linea_estrategica_codigo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    dimension_codigo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    costo_estimado_cop: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00"), server_default=text("0.00"), nullable=False
    )
    horizonte_anios: Mapped[int] = mapped_column(Integer, default=4, server_default=text("4"), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(30), default="en_formulacion", server_default=text("'en_formulacion'"), nullable=False
    )
    requiere_consulta_previa: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    territorios_focalizados: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    territorio_cobertura: Mapped[str | None] = mapped_column(Text, nullable=True)
    poblacion_objetivo_estimada: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    objetivo_central: Mapped[str | None] = mapped_column(Text, nullable=True)
    fuentes_financiacion_sugeridas: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    # Relaciones
    linea_estrategica: Mapped[Any] = relationship("LineaEstrategica", lazy="select")
    dimension: Mapped[Any] = relationship("DimensionSeguridadHumana", lazy="select")
