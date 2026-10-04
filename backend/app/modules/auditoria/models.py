import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RegistroAuditoria(Base):
    """Log inmutable de devoluciones y auditoría forense."""

    __tablename__ = "registros_auditoria"
    __table_args__ = (
        Index("idx_auditoria_accion", "accion", postgresql_include=[]),
        Index(
            ("idx_auditoria_tabla_registro"),
            ("tabla_afectada"),
            ("registro_id"),
            postgresql_include=[],
        ),
        {
            ("schema"): ("auditoria"),
            ("comment"): (
                "Log de auditoría forense inmutable y registro de razones motivadas (C-150/15)"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    tabla_afectada: Mapped[str] = mapped_column(String(100), nullable=False)
    registro_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    accion: Mapped[str] = mapped_column(String(50), nullable=False)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("autenticacion.usuarios.id", ondelete="RESTRICT"),
        nullable=True,
    )
    causal: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Causales constitucionales de devolución: tecnica, juridica, presupuestal",
    )
    justificacion_motivada: Mapped[str] = mapped_column(Text, nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )


# Modelos adicionales en esquema auditoria
from app.modules.fuentes.models import FuenteInformacion  # noqa: E402, F401

