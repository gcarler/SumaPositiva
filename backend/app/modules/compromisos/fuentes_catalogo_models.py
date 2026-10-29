"""Registro versionado de insumos analíticos; separado de solicitudes institucionales."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FuenteDato(Base):
    __tablename__ = "fuentes_datos"
    __table_args__ = (
        CheckConstraint(
            "estado_promocion IN ('pendiente_validacion', 'aprobada', 'bloqueada')", name="ck_fuentes_datos_estado"
        ),
        {"schema": "seguimiento"},
    )

    clave: Mapped[str] = mapped_column(String(120), primary_key=True)
    custodios: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    dataset_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    licencia: Mapped[str] = mapped_column(String(120), nullable=False, server_default=text("'por_verificar'"))
    estado_promocion: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=text("'pendiente_validacion'")
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class FuenteVersion(Base):
    __tablename__ = "fuentes_versiones"
    __table_args__ = (
        UniqueConstraint("fuente_clave", "sha256", name="uq_fuentes_versiones_clave_sha"),
        Index("ix_fuentes_versiones_fuente", "fuente_clave", "creado_en"),
        {"schema": "seguimiento"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    fuente_clave: Mapped[str] = mapped_column(
        String(120), ForeignKey("seguimiento.fuentes_datos.clave", ondelete="RESTRICT"), nullable=False
    )
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    filas: Mapped[int] = mapped_column(Integer, nullable=False)
    ultima_extraccion_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class PaqueteArtefactos(Base):
    __tablename__ = "paquetes_artefactos"
    __table_args__ = ({"schema": "seguimiento"},)

    clave: Mapped[str] = mapped_column(String(120), primary_key=True)
    prefijo: Mapped[str] = mapped_column(String(256), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(512), nullable=False)
    atribucion: Mapped[str] = mapped_column(String(120), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class ArtefactoFuente(Base):
    __tablename__ = "artefactos_fuente"
    __table_args__ = (
        UniqueConstraint("ruta", "sha256", name="uq_artefactos_fuente_ruta_sha"),
        Index("ix_artefactos_fuente_sha", "sha256"),
        CheckConstraint(
            "estado_calidad IN ('sin_evaluacion', 'pendiente_asignacion', 'cuarentena', 'validado')",
            name="ck_artefactos_fuente_estado",
        ),
        {"schema": "seguimiento"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ruta: Mapped[str] = mapped_column(String(1024), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    formato: Mapped[str] = mapped_column(String(40), nullable=False)
    rol: Mapped[str] = mapped_column(String(40), nullable=False)
    evidencia_origen: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    paquete_clave: Mapped[str | None] = mapped_column(
        String(120), ForeignKey("seguimiento.paquetes_artefactos.clave"), nullable=True
    )
    fuente_clave: Mapped[str | None] = mapped_column(String(120), ForeignKey("seguimiento.fuentes_datos.clave"))
    version_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("seguimiento.fuentes_versiones.id"))
    licencia: Mapped[str] = mapped_column(String(120), nullable=False, server_default=text("'por_verificar'"))
    estado_calidad: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=text("'pendiente_asignacion'")
    )
    registrado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )


class ContratoFuente(Base):
    __tablename__ = "contratos_fuente"
    __table_args__ = (
        UniqueConstraint("fuente_clave", "version", name="uq_contratos_fuente_clave_version"),
        {"schema": "seguimiento"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    fuente_clave: Mapped[str] = mapped_column(
        String(120), ForeignKey("seguimiento.fuentes_datos.clave", ondelete="RESTRICT"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    esquema: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    registrado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )


class LoteFuente(Base):
    __tablename__ = "lotes_fuente"
    __table_args__ = (
        UniqueConstraint("version_id", "manifiesto_sha256", name="uq_lotes_fuente_version_manifiesto"),
        CheckConstraint(
            "estado IN ('capturado', 'verde', 'ambar', 'rojo', 'cuarentena')", name="ck_lotes_fuente_estado"
        ),
        Index("ix_lotes_fuente_version_estado", "version_id", "estado"),
        {"schema": "seguimiento"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    version_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("seguimiento.fuentes_versiones.id", ondelete="RESTRICT"), nullable=False
    )
    corrida_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("seguimiento.corridas_pipeline.id"))
    estado: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'capturado'"))
    manifiesto_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    resultado_calidad: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
