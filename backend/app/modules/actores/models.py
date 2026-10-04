import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ActorEstrategico(Base):
    """Modelo ORM para actores estratégicos y gobernanza territorial (AUD-14)."""

    __tablename__ = "actores_estrategicos"
    __table_args__ = (
        Index("idx_actores_tipo", "tipo"),
        Index("idx_actores_territorio", "territorio"),
        Index("idx_actores_demostracion", "es_demostracion"),
        {"schema": "participacion_ciudadana"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    territorio: Mapped[str] = mapped_column(String(50), nullable=False)
    barrio_vereda: Mapped[str | None] = mapped_column(String(150), nullable=True)
    dimensiones_principales: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    nivel_poder: Mapped[str] = mapped_column(String(20), nullable=False)
    nivel_interes: Mapped[str] = mapped_column(String(20), nullable=False)
    postura: Mapped[str] = mapped_column(String(50), nullable=False)
    contacto: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    mesas_asistidas: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    propuestas_radicadas: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    expectativas_principales: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    acciones_involucramiento: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    es_demostracion: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
