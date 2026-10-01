import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    pass


class Instrumento(Base):
    """Instrumento de formulación y diagnóstico de políticas (MGA / Marco Lógico)."""

    __tablename__ = "instrumentos"
    __table_args__ = (
        Index("idx_instrumentos_estado", "estado", postgresql_include=[]),
        Index("idx_instrumentos_mesa", "mesa_id", postgresql_include=[]),
        Index("idx_instrumentos_tipo", "tipo_instrumento", postgresql_include=[]),
        {"schema": "motor_instrumentos"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    mesa_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesas_trabajo.mesas.id", ondelete="CASCADE"),
        nullable=True,
    )
    linea_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.lineas_estrategicas.id", ondelete="SET NULL"),
        nullable=True,
    )
    tipo_instrumento: Mapped[str] = mapped_column(String(50), nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(50), default="EN_CONSTRUCCION", nullable=False)
    instrumento_origen_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_instrumentos.instrumentos.id", ondelete="SET NULL"),
        nullable=True,
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
    version_seq: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    @property
    def etag(self) -> str:
        return f'"{self.version_seq}"'

    nodos: Mapped[list["NodoInstrumento"]] = relationship(
        "NodoInstrumento",
        back_populates="instrumento",
        cascade="all, delete-orphan",
        order_by="NodoInstrumento.orden",
    )
    instrumento_origen: Mapped["Instrumento | None"] = relationship(
        "Instrumento",
        remote_side=[id],
        foreign_keys=[instrumento_origen_id],
        backref="instrumentos_derivados",
    )


class NodoInstrumento(Base):
    """Nodo polimórfico jerárquico dentro de un Árbol de Problemas o de Objetivos."""

    __tablename__ = "nodos_instrumento"
    __table_args__ = (
        Index("idx_nodos_instrumento", "instrumento_id", postgresql_include=[]),
        Index("idx_nodos_padre", "nodo_padre_id", postgresql_include=[]),
        Index("idx_nodos_relacion", "tipo_relacion", postgresql_include=[]),
        Index("idx_nodos_tipo", "tipo_nodo", postgresql_include=[]),
        {"schema": "motor_instrumentos"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    instrumento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_instrumentos.instrumentos.id", ondelete="CASCADE"),
        nullable=False,
    )
    nodo_padre_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_instrumentos.nodos_instrumento.id", ondelete="CASCADE"),
        nullable=True,
    )
    tipo_nodo: Mapped[str] = mapped_column(String(50), nullable=False)
    tipo_relacion: Mapped[str] = mapped_column(String(50), default="CENTRAL", nullable=False)
    nivel: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    nodo_origen_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_instrumentos.nodos_instrumento.id", ondelete="SET NULL"),
        nullable=True,
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
    version_seq: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    @property
    def etag(self) -> str:
        return f'"{self.version_seq}"'

    instrumento: Mapped["Instrumento"] = relationship("Instrumento", back_populates="nodos")
    padre: Mapped["NodoInstrumento | None"] = relationship(
        "NodoInstrumento",
        remote_side=[id],
        foreign_keys=[nodo_padre_id],
        back_populates="hijos",
    )
    hijos: Mapped[list["NodoInstrumento"]] = relationship(
        "NodoInstrumento",
        foreign_keys=[nodo_padre_id],
        back_populates="padre",
        cascade="all, delete-orphan",
        order_by="NodoInstrumento.orden",
    )
