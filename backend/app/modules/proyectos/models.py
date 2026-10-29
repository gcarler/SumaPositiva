import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ActividadAnexo(Base):
    """Anexo o archivo adjunto asociado a una actividad de la formulación de la política pública."""

    __tablename__ = "actividades_anexos"
    __table_args__ = (
        Index("idx_actividades_anexos_actividad", "actividad_id"),
        Index("idx_actividades_anexos_modulo_recurso", "modulo_dueno", "recurso_id"),
        {"schema": "participacion_ciudadana"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.public.generar_uuid_v7(),
    )
    actividad_id: Mapped[str] = mapped_column(String(120), nullable=False)
    modulo_dueno: Mapped[str] = mapped_column(String(50), nullable=False)
    recurso_id: Mapped[str] = mapped_column(String(100), nullable=False)
    nombre_archivo_original: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_archivo_seguro: Mapped[str] = mapped_column(String(255), nullable=False)
    ruta_almacenamiento: Mapped[str] = mapped_column(String(500), nullable=False)
    tipo_mime: Mapped[str] = mapped_column(String(100), nullable=False)
    tamano_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    subido_por_sujeto_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    subido_por_nombre: Mapped[str | None] = mapped_column(String(150), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.clock_timestamp(),
        nullable=False,
    )
    eliminado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
