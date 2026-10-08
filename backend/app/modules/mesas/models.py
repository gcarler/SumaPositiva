import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    CHAR,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UserDefinedType

from app.core.database import Base
from app.modules.identidad.models import Usuario

if TYPE_CHECKING:
    pass


class Ltree(UserDefinedType):
    """Mapeo para el tipo de dato ltree de PostgreSQL."""

    cache_ok = True

    def get_col_spec(self, **kw):
        return "ltree"

    def bind_processor(self, dialect):
        def process(value):
            if value is not None:
                return str(value)
            return value

        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is not None:
                return str(value)
            return value

        return process


class Mesa(Base):
    """Mesa de Trabajo Jerárquica."""

    __tablename__ = "mesas"
    __table_args__ = (
        Index("idx_mesas_codigo", "codigo_oficial", postgresql_include=[]),
        Index("idx_mesas_estado", "estado", postgresql_include=[]),
        Index("idx_mesas_fecha", "fecha", postgresql_include=[]),
        Index(
            ("idx_mesas_ruta_gist"),
            ("ruta_jerarquica"),
            postgresql_using=("gist"),
            postgresql_include=[],
        ),
        Index("idx_mesas_shortcode", "shortcode_ciudadano", postgresql_include=[]),
        Index("idx_mesas_territorio", "territorio_id", postgresql_include=[]),
        Index("idx_mesas_tipo", "tipo_mesa", postgresql_include=[]),
        {"schema": "mesas_trabajo"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    mesa_padre_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesas_trabajo.mesas.id", ondelete="CASCADE"),
        nullable=True,
    )
    ruta_jerarquica: Mapped[str] = mapped_column(Ltree, nullable=False)
    tipo_mesa: Mapped[str] = mapped_column(String(50), nullable=False)
    codigo_oficial: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    shortcode_ciudadano: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    lugar_nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)
    horario: Mapped[str | None] = mapped_column(String(100), nullable=True)
    aforo_maximo: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_asistentes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estado: Mapped[str | None] = mapped_column(
        String(30), default="PROGRAMADA", server_default=text("'PROGRAMADA'"), nullable=True
    )
    modalidad: Mapped[str | None] = mapped_column(
        String(30), default="HIBRIDA_DIGITAL", server_default=text("'HIBRIDA_DIGITAL'"), nullable=True
    )
    sha256_acta: Mapped[str | None] = mapped_column(CHAR(64), nullable=True)

    linea_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.lineas_estrategicas.id", ondelete="RESTRICT"),
        nullable=True,
    )
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    facilitador_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )

    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=True,
    )
    actualizado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=True,
    )

    padre: Mapped["Mesa | None"] = relationship(
        "Mesa",
        remote_side=[id],
        back_populates="submesas",
    )
    submesas: Mapped[list["Mesa"]] = relationship(
        "Mesa",
        back_populates="padre",
        cascade="all, delete-orphan",
    )
    participantes: Mapped[list["ParticipanteMesa"]] = relationship(
        "ParticipanteMesa",
        back_populates="mesa",
        cascade="all, delete-orphan",
    )
    actas: Mapped[list["ActaComunitaria"]] = relationship(
        "ActaComunitaria",
        back_populates="mesa",
        cascade="all, delete-orphan",
    )
    fotos: Mapped[list["FotoMesa"]] = relationship(
        "FotoMesa",
        back_populates="mesa",
        cascade="all, delete-orphan",
    )
    agendas: Mapped[list["MesaAgenda"]] = relationship(
        "MesaAgenda",
        back_populates="mesa",
    )
    facilitador: Mapped["Usuario | None"] = relationship(
        "Usuario",
        foreign_keys=[facilitador_id],
        lazy="selectin",
    )

    @property
    def facilitador_nombre(self) -> str | None:
        if self.facilitador is not None:
            nombre = f"{self.facilitador.nombres or ''} {self.facilitador.apellidos or ''}".strip()
            return nombre or self.facilitador.correo
        if self.metadatos and isinstance(self.metadatos, dict):
            meta_facil = self.metadatos.get("facilitador")
            if meta_facil and isinstance(meta_facil, str) and meta_facil.strip():
                return meta_facil.strip()
        return None


class ParticipanteMesa(Base):
    """Participante o asistente registrado en una Mesa de Trabajo."""

    __tablename__ = "participantes_mesa"
    __table_args__ = (
        UniqueConstraint("mesa_id", "sujeto_id", name="uq_participante_mesa"),
        Index("idx_participantes_mesa", "mesa_id", postgresql_include=[]),
        Index("idx_participantes_rol", "rol_en_mesa", postgresql_include=[]),
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
    sujeto_id: Mapped[str] = mapped_column(String(100), nullable=False)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    nombre_completo: Mapped[str] = mapped_column(String(200), nullable=False)
    rol_en_mesa: Mapped[str] = mapped_column(String(50), default="ciudadano", nullable=False)
    organizacion_comunitaria: Mapped[str | None] = mapped_column(String(200), nullable=True)
    asistencia_confirmada: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hora_ingreso: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )

    mesa: Mapped["Mesa"] = relationship("Mesa", back_populates="participantes")


class ActaComunitaria(Base):
    """Acta Comunitaria de Concertación de una Mesa Deliberativa."""

    __tablename__ = "actas_comunitarias"
    __table_args__ = (
        Index("idx_actas_estado", "estado", postgresql_include=[]),
        Index("idx_actas_mesa", "mesa_id", postgresql_include=[]),
        {"schema": "mesas_trabajo"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    mesa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesas_trabajo.mesas.id", ondelete="RESTRICT"),
        nullable=False,
    )
    numero_acta: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    quorum_alcanzado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    total_participantes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resumen_deliberacion: Mapped[str] = mapped_column(Text, nullable=False)
    acuerdos: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    disensos: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    compromisos_institucionales: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    metadatos_cierre: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    facilitador_firma_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    nombre_facilitador_firma: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sha256_acta: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), default="BORRADOR", nullable=False)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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

    mesa: Mapped["Mesa"] = relationship("Mesa", back_populates="actas")


class MesaAgenda(Base):
    """Cronograma y Agenda Dinámica de Mesas de Trabajo (EDIT-02)."""

    __tablename__ = "agendas"
    __table_args__ = (
        Index("idx_agendas_tipo", "tipo", postgresql_include=[]),
        Index("idx_agendas_estado", "estado", postgresql_include=[]),
        Index("idx_agendas_fecha", "fecha", postgresql_include=[]),
        Index("idx_agendas_mesa_id", "mesa_id", postgresql_include=[]),
        {"schema": "mesas_trabajo"},
    )

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    mesa_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesas_trabajo.mesas.id", ondelete="SET NULL"),
        nullable=True,
    )
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    territorio: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    lugar: Mapped[str] = mapped_column(String(300), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    hora_inicio: Mapped[str] = mapped_column(String(20), default="08:30", nullable=False)
    hora_fin: Mapped[str] = mapped_column(String(20), default="12:00", nullable=False)
    estado: Mapped[str] = mapped_column(String(50), default="programada", nullable=False)
    dimensiones_onu: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    responsable: Mapped[str | None] = mapped_column(String(255), nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    mesa: Mapped["Mesa | None"] = relationship("Mesa", back_populates="agendas")
