import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import relationship
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

    fotos_mesa: Mapped[list["FotoMesa"]] = relationship(
        back_populates="evidencia",
        cascade="all, delete-orphan",
    )


class FotoMesa(Base):
    __tablename__ = "fotos_mesa"
    __table_args__ = (
        Index(
            "idx_fotos_mesa_publicas",
            "mesa_id",
            "creado_en",
            postgresql_where=text("estado = 'APROBADA'"),
        ),
        Index(
            "idx_fotos_mesa_revision",
            "creado_en",
            postgresql_where=text("estado = 'PENDIENTE'"),
        ),
        {"schema": "mesas_trabajo"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    mesa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesas_trabajo.mesas.id", ondelete="CASCADE"),
        nullable=False,
    )
    evidencia_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.evidencias_multimedia.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    subido_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    autorizacion_imagen: Mapped[bool] = mapped_column(Boolean, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), default="PENDIENTE", server_default=text("'PENDIENTE'"), nullable=False
    )
    observacion_revision: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    revisada_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    revisada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    evidencia: Mapped["EvidenciaMultimedia"] = relationship(back_populates="fotos_mesa")
