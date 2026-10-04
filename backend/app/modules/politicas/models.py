import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
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


class DimensionSeguridadHumana(Base):
    """Las 7 dimensiones de la Seguridad Humana (ONU/DNP) aplicadas al Distrito de Cartagena."""

    __tablename__ = "dimensiones_seguridad_humana"
    __table_args__ = (
        {
            ("schema"): ("motor_politicas"),
            ("comment"): (
                "Las 7 dimensiones de la Seguridad Humana (ONU/DNP) que estructur"
                "an el diagnóstico y metas de Cartagena"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment=(
            "Identificador textual corto: economica, alimentaria, "
            "salud, ambiental, personal, comunitaria, politica"
        ),
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), default="#6366f1", nullable=False)
    icono: Mapped[str] = mapped_column(String(50), default="shield", nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )

    lineas_estrategicas: Mapped[list["LineaEstrategica"]] = relationship(
        "LineaEstrategica",
        back_populates="dimension",
    )


class FasePolitica(Base):
    """Fases dinámicas del ciclo de vida de la Política Pública de Seguridad Humana de Cartagena."""

    __tablename__ = "fases_politica"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('preparatoria', 'activa', 'en_revision', 'cerrada', 'archivada')",
            name="chk_estado_fase",
        ),
        CheckConstraint(
            "progreso_porcentaje >= 0 AND progreso_porcentaje <= 100",
            name="chk_progreso_rango",
        ),
        {
            ("schema"): ("motor_politicas"),
            ("comment"): (
                "Fases dinámicas del ciclo de vida de la Política Pública de Segu"
                "ridad Humana de Cartagena"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(50), default="preparatoria", nullable=False)
    progreso_porcentaje: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    fecha_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_cierre: Mapped[date | None] = mapped_column(Date, nullable=True)
    reglas_participacion: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "permite_anonimo": True,
            "permite_fotos": True,
            "limite_aportes_por_usuario": 10,
        },
        server_default=text(
            '\'{"permite_anonimo": true, "permite_fotos": true, '
            '"limite_aportes_por_usuario": 10}\'::jsonb'
        ),
        nullable=False,
        comment=("Reglas de negocio parametrizables para la participación ciudadana en cada fase"),
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )

    lineas_estrategicas: Mapped[list["LineaEstrategica"]] = relationship(
        "LineaEstrategica",
        back_populates="fase",
        cascade="all, delete-orphan",
    )


class LineaEstrategica(Base):
    """Líneas estratégicas asociadas a fases, dimensiones y fuentes de financiación."""

    __tablename__ = "lineas_estrategicas"
    __table_args__ = (
        Index("idx_lineas_dimension", "dimension_id", postgresql_include=[]),
        Index("idx_lineas_fase", "fase_id", postgresql_include=[]),
        Index(
            ("idx_lineas_metadatos_gin"),
            ("metadatos"),
            postgresql_using=("gin"),
            postgresql_include=[],
        ),
        {
            ("schema"): ("motor_politicas"),
            ("comment"): (
                "Líneas estratégicas asociadas a fases, dimensiones de seguridad "
                "humana y fuentes de financiación"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    fase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.fases_politica.id", ondelete="RESTRICT"),
        nullable=False,
    )
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    problema_abordado: Mapped[str | None] = mapped_column(Text, nullable=True)
    objetivo_especifico: Mapped[str | None] = mapped_column(Text, nullable=True)
    costo_estimado: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00"), nullable=False
    )
    fuentes_financiacion: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        default=lambda: ["FONSET"],
        server_default=text("ARRAY['FONSET']::TEXT[]"),
        nullable=False,
        comment="Fuentes presupuestales en Colombia: FONSET, SGP, SGR, ICLD, Cooperación",
    )
    entidad_lider: Mapped[str] = mapped_column(
        String(250),
        default="Secretaría del Interior y Convivencia Ciudadana",
        server_default=text("'Secretaría del Interior y Convivencia Ciudadana'"),
        nullable=False,
    )
    entidades_coresponsables: Mapped[list[str] | None] = mapped_column(
        ARRAY(Text),
        default=list,
        server_default=text("ARRAY[]::TEXT[]"),
        nullable=True,
    )
    orden: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )

    fase: Mapped["FasePolitica"] = relationship(
        "FasePolitica",
        back_populates="lineas_estrategicas",
    )
    dimension: Mapped["DimensionSeguridadHumana | None"] = relationship(
        "DimensionSeguridadHumana",
        back_populates="lineas_estrategicas",
    )

    @property
    def sublineas(self):
        return (self.metadatos or {}).get("sublineas", [])


# Registro de modelos de formulación relacionados (EDIT-09)
from app.modules.alternativas.models import BancoAlternativas  # noqa: E402, F401

