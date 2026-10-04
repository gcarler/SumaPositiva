from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FuenteInformacion(Base):
    """Modelo ORM para fuentes oficiales de información y requerimientos distritales (EDIT-03)."""

    __tablename__ = "fuentes_informacion"
    __table_args__ = (
        Index("idx_fuentes_info_codigo", "codigo"),
        Index("idx_fuentes_info_entidad", "entidad"),
        Index("idx_fuentes_info_estado", "estado_entrega"),
        Index("idx_fuentes_info_radicado", "radicado_solicitud"),
        {"schema": "auditoria"},
    )

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    entidad: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_fuente: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, default="secundaria")
    ambito: Mapped[str] = mapped_column(String(30), nullable=False, default="local")
    dimension_seguridad: Mapped[str] = mapped_column(
        String(50), nullable=False, default="personal"
    )
    periodicidad: Mapped[str] = mapped_column(
        String(30), nullable=False, default="mensual"
    )
    radicado_solicitud: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha_solicitud: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_limite_respuesta: Mapped[date | None] = mapped_column(Date, nullable=True)
    estado_entrega: Mapped[str] = mapped_column(
        String(50), nullable=False, default="en_termino"
    )
    variables_solicitadas: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    resumen_datos: Mapped[str | None] = mapped_column(Text, nullable=True)
    archivo_adjunto_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsable_contacto: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    observaciones_calidad: Mapped[str | None] = mapped_column(Text, nullable=True)
    actualizado_por: Mapped[str | None] = mapped_column(String(100), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
