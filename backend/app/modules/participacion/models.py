import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.actores import models as _actores_models  # noqa: F401


class EscenarioEspecial(Base):
    __tablename__ = "escenarios_especiales"
    __table_args__ = (
        Index("idx_escenarios_tipo", "tipo_escenario"),
        Index("idx_escenarios_fecha", "fecha"),
        Index("idx_escenarios_territorio", "territorio_id"),
        {"schema": "participacion_ciudadana"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.public.generar_uuid_v7(),
    )
    codigo_unico: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    tipo_escenario: Mapped[str] = mapped_column(String(100), nullable=False)
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    lugar: Mapped[str] = mapped_column(String(250), nullable=False)
    entidad_convocante: Mapped[str] = mapped_column(String(150), nullable=False)
    total_asistentes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    desglose_poblacional: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    sintesis_acuerdos: Mapped[str | None] = mapped_column(Text, nullable=True)
    url_evidencia: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estado: Mapped[str] = mapped_column(String(50), default="REALIZADO", nullable=False)
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
