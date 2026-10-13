import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = ({"schema": "autenticacion"},)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    permisos: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )

    usuarios: Mapped[list["Usuario"]] = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        Index("idx_usuarios_nivel", "nivel_identidad", postgresql_include=[]),
        Index("idx_usuarios_rol", "rol_id", postgresql_include=[]),
        {
            ("schema"): ("autenticacion"),
            ("comment"): (
                "Directorio de participantes con credenciales y niveles de identidad cívica"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    rol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.roles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    correo: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hash_contrasena: Mapped[str] = mapped_column(String(255), nullable=False)
    nivel_identidad: Mapped[str] = mapped_column(
        String(20),
        default="declarada",
        server_default=text("'declarada'"),
        nullable=False,
        comment="declarada, autenticada o verificada",
    )
    nombres: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(100), nullable=False)
    activo: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
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

    correo_verificado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rol: Mapped["Rol"] = relationship("Rol", back_populates="usuarios")
    mfa: Mapped["UsuarioMfa | None"] = relationship(
        "UsuarioMfa", back_populates="usuario", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def codigo_rol(self) -> str:
        return self.rol.codigo

    @property
    def permisos(self) -> list[str]:
        return self.rol.permisos

    @property
    def mfa_activo(self) -> bool:
        mfa_inst = self.__dict__.get("mfa")
        if mfa_inst is None:
            return False
        return bool(mfa_inst.activo)


class UsuarioMfa(Base):
    __tablename__ = "usuarios_mfa"
    __table_args__ = (
        Index("idx_usuarios_mfa_usuario", "usuario_id", unique=True),
        {
            "schema": "autenticacion",
            "comment": "Configuración de autenticación multifactor TOTP (RFC 6238) y códigos de recuperación",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    secreto_cifrado: Mapped[str] = mapped_column(String(512), nullable=False)
    activo: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    codigos_recuperacion: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    activado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ultimo_uso_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    intentos_fallidos: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="mfa")


class SesionUsuario(Base):
    __tablename__ = "sesiones_usuario"
    __table_args__ = (
        Index("idx_sesiones_usuario_usuario", "usuario_id"),
        {"schema": "autenticacion"},
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("autenticacion.usuarios.id", ondelete="CASCADE"), nullable=False
    )
    creada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revocada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TokenAccion(Base):
    __tablename__ = "tokens_accion"
    __table_args__ = (Index("idx_tokens_accion_usuario", "usuario_id"), {"schema": "autenticacion"})
    hash_token: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("autenticacion.usuarios.id", ondelete="CASCADE"), nullable=False
    )
    proposito: Mapped[str] = mapped_column(String(20), nullable=False)
    nonce: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    entregas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    enviado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EventoIdentidad(Base):
    __tablename__ = "eventos_identidad"
    __table_args__ = ({"schema": "autenticacion"},)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    objetivo_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    accion: Mapped[str] = mapped_column(String(60), nullable=False)
    detalle: Mapped[dict] = mapped_column(JSONB, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )


class LimiteAcceso(Base):
    __tablename__ = "limites_acceso"
    __table_args__ = ({"schema": "autenticacion"},)
    clave: Mapped[str] = mapped_column(String(64), primary_key=True)
    intentos: Mapped[int] = mapped_column(Integer, nullable=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


Index("uq_usuarios_correo_normalizado", func.lower(Usuario.correo), unique=True)
