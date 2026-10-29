import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Noticia(Base):
    __tablename__ = "noticias"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_noticias_slug"),
        CheckConstraint("estado IN ('publicada', 'borrador', 'archivada')", name="estado_valido"),
        CheckConstraint(
            "categoria IN ('avance_politica', 'mesa_realizada', 'acuerdo_distrital', "
            "'convocatoria', 'informe', 'logro')",
            name="categoria_valida",
        ),
        Index("idx_noticias_publicacion", "estado", "destacada", "orden_prioridad", "publicada_en"),
        {"schema": "comunicacion"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.public.generar_uuid_v7(),
    )
    slug: Mapped[str] = mapped_column(String(250), nullable=False)
    titulo: Mapped[str] = mapped_column(String(250), nullable=False)
    resumen: Mapped[str] = mapped_column(Text, nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    imagen_portada: Mapped[str | None] = mapped_column(Text, nullable=True)
    galeria: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    video_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    categoria: Mapped[str] = mapped_column(String(40), nullable=False)
    autor: Mapped[str] = mapped_column(String(200), nullable=False)
    publicada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.clock_timestamp()
    )
    destacada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    orden_prioridad: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador", server_default="borrador")
    etiquetas: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.clock_timestamp()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.clock_timestamp(),
        onupdate=func.clock_timestamp(),
    )
