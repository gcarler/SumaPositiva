import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EvidenciaMultimedia(Base):
    __tablename__ = "evidencias_multimedia"
    __table_args__ = (
        Index("idx_evidencias_autor", "autor_sujeto_id", postgresql_include=[]),
        Index("idx_evidencias_hash", "hash_sha256", postgresql_include=[]),
        Index("idx_evidencias_propuesta", "propuesta_id", postgresql_include=[]),
        {
            ("schema"): ("participacion_ciudadana"),
            ("comment"): (
                "Registro pericial de evidencias fotográficas comunitarias con de"
                "spojo estricto de metadatos EXIF y coordenadas GPS (Ley 1581/12)"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    propuesta_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.propuestas_ciudadanas.id", ondelete="SET NULL"),
        nullable=True,
    )
    autor_sujeto_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    nombre_archivo_original: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_archivo_seguro: Mapped[str] = mapped_column(String(255), nullable=False)
    ruta_almacenamiento: Mapped[str] = mapped_column(String(500), nullable=False)
    tipo_mime: Mapped[str] = mapped_column(String(50), nullable=False)
    tamano_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    exif_despojado: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
        comment="Bandera de verificación pericial de despojo de metadatos sensibles",
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
