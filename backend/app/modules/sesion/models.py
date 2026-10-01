"""Modelos SQLAlchemy 2.0 para sesiones cívicas anónimas."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SesionAnonima(Base):
    """Registro persistente de sesión ciudadana anónima para auditoría y Habeas Data."""

    __tablename__ = "sesiones_anonimas"
    __table_args__ = (
        Index("idx_sesiones_expira", "expira_en", postgresql_include=[]),
        Index("idx_sesiones_huella", "huella_hash", postgresql_include=[]),
        {
            ("schema"): ("participacion_ciudadana"),
            ("comment"): ("Registro y auditoria de sesiones civicas anonimas con firma digital"),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    huella_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Hash HMAC-SHA256 con salt de IP conforme a Ley 1581/12 (Habeas Data)",
    )
    expira_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    activa: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
