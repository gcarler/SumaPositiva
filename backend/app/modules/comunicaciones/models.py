import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TareaComunicacion(Base):
    """Modelo ORM para el plan de trabajo y cronograma de comunicaciones de la política pública."""

    __tablename__ = "tareas_comunicacion"
    __table_args__ = (
        UniqueConstraint("codigo", name="uq_tareas_comunicacion_codigo"),
        CheckConstraint(
            "estado IN ('pendiente', 'en_progreso', 'completada', 'reprogramada')",
            name="chk_tareas_comunicacion_estado",
        ),
        Index("idx_tareas_comunicacion_etapa", "etapa"),
        Index("idx_tareas_comunicacion_estado", "estado"),
        Index("idx_tareas_comunicacion_fechas", "fecha_inicio", "fecha_fin"),
        {"schema": "comunicacion"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.public.generar_uuid_v7(),
    )
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    etapa: Mapped[str] = mapped_column(String(100), nullable=False)
    territorio: Mapped[str] = mapped_column(String(150), nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False, default="")
    entregables: Mapped[str] = mapped_column(Text, nullable=False, default="")
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(50), nullable=False, default="pendiente", server_default="pendiente")
    responsable: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="Equipo de Comunicaciones",
        server_default="Equipo de Comunicaciones",
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
