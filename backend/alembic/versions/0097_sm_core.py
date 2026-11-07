"""Creación del núcleo portable SM (Fase 1 y 2).

Crea las tablas portables independientes del dominio POLIS:
``sm_eventos``, ``sm_mensajes``, ``sm_entregas``, ``sm_auditorias`` y
``sm_consentimientos``. La trazabilidad y el consentimiento usan hash, nunca
contacto crudo. Herald continúa funcionando paralelo; SM nace como núcleo
portable y no sustituye la cola existente.

Revision ID: 0097_sm_core
Revises: 0096_riesgo_sin_evaluar
Create Date: 2026-11-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0097_sm_core"
down_revision: str | None = "0096_riesgo_sin_evaluar"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "participacion_ciudadana"


def upgrade() -> None:
    op.create_table(
        "sm_eventos",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("public.generar_uuid_v7()"), primary_key=True
        ),
        sa.Column("tenant", sa.String(length=32), nullable=False),
        sa.Column("tipo_evento", sa.String(length=80), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=False),
        sa.Column("entidad", sa.String(length=80), nullable=True),
        sa.Column("entidad_id", sa.String(length=200), nullable=True),
        sa.Column(
            "payload", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("idempotencia", sa.String(length=255), nullable=False),
        sa.Column("origen", sa.String(length=120), nullable=False),
        sa.Column("canal", sa.String(length=20), nullable=False),
        sa.Column("contacto_hash", sa.String(length=80), nullable=False),
        sa.Column("plantilla", sa.String(length=80), nullable=True),
        sa.Column("asunto", sa.String(length=200), nullable=True),
        sa.Column("cuerpo", sa.Text(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False),
        sa.CheckConstraint("tenant <> ''", name=op.f("chk_sm_eventos_tenant")),
        schema=SCHEMA,
        comment="Eventos transaccionales portables del núcleo SM",
    )
    op.create_index(
        "uq_sm_eventos_tenant_idempotencia",
        "sm_eventos",
        ["tenant", "idempotencia"],
        unique=True,
        schema=SCHEMA,
    )
    op.create_index("ix_sm_eventos_tenant_creado", "sm_eventos", ["tenant", "creado_en"], unique=False, schema=SCHEMA)
    op.create_index("ix_sm_eventos_tipo", "sm_eventos", ["tipo_evento"], unique=False, schema=SCHEMA)

    op.create_table(
        "sm_mensajes",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("public.generar_uuid_v7()"), primary_key=True
        ),
        sa.Column(
            "evento_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.sm_eventos.id", name="fk_sm_mensajes_evento"),
            nullable=False,
        ),
        sa.Column("tenant", sa.String(length=32), nullable=False),
        sa.Column("canal", sa.String(length=20), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=False),
        sa.Column("contacto_hash", sa.String(length=80), nullable=False),
        sa.Column("plantilla", sa.String(length=80), nullable=True),
        sa.Column("asunto", sa.String(length=200), nullable=True),
        sa.Column("cuerpo", sa.Text(), nullable=True),
        sa.Column("estado", sa.String(length=20), nullable=False),
        sa.Column("idempotencia", sa.String(length=255), nullable=False),
        sa.Column(
            "metadatos", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False),
        sa.Column(
            "actualizado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False
        ),
        sa.CheckConstraint("tenant <> ''", name=op.f("chk_sm_mensajes_tenant")),
        sa.CheckConstraint(
            "estado IN ('pendiente','encolado','enviado','entregado','fallido','agotado','cancelado')",
            name=op.f("chk_sm_mensajes_estado"),
        ),
        sa.CheckConstraint("idempotencia <> ''", name=op.f("chk_sm_mensajes_idempotencia")),
        schema=SCHEMA,
        comment="Outbox portable del núcleo SM",
    )
    op.create_index(
        "uq_sm_mensajes_tenant_idempotencia",
        "sm_mensajes",
        ["tenant", "idempotencia"],
        unique=True,
        schema=SCHEMA,
    )
    op.create_index("ix_sm_mensajes_cola", "sm_mensajes", ["estado", "canal"], unique=False, schema=SCHEMA)
    op.create_index("ix_sm_mensajes_evento", "sm_mensajes", ["evento_id"], unique=False, schema=SCHEMA)
    op.create_index("ix_sm_mensajes_creado", "sm_mensajes", ["creado_en"], unique=False, schema=SCHEMA)

    op.create_table(
        "sm_entregas",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("public.generar_uuid_v7()"), primary_key=True
        ),
        sa.Column(
            "mensaje_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.sm_mensajes.id", name="fk_sm_entregas_mensaje"),
            nullable=False,
        ),
        sa.Column("tenant", sa.String(length=32), nullable=False),
        sa.Column("idempotencia", sa.String(length=255), nullable=False),
        sa.Column("canal", sa.String(length=20), nullable=False),
        sa.Column("intento", sa.Integer(), nullable=False),
        sa.Column("estado_entrega", sa.String(length=20), nullable=False),
        sa.Column("externo_id", sa.String(length=200), nullable=True),
        sa.Column("detalle", sa.String(length=500), nullable=True),
        sa.Column(
            "payload", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False),
        sa.CheckConstraint("idempotencia <> ''", name=op.f("chk_sm_entregas_mensaje")),
        sa.CheckConstraint("estado_entrega IN ('enviado','fallido')", name=op.f("chk_sm_entregas_estado")),
        schema=SCHEMA,
        comment="Registro de intentos de entrega por canal SM",
    )
    op.create_index(
        "uq_sm_entregas_mensaje_intento",
        "sm_entregas",
        ["mensaje_id", "intento"],
        unique=True,
        schema=SCHEMA,
    )
    op.create_index("ix_sm_entregas_mensaje", "sm_entregas", ["mensaje_id"], unique=False, schema=SCHEMA)
    op.create_index("ix_sm_entregas_creado", "sm_entregas", ["creado_en"], unique=False, schema=SCHEMA)

    op.create_table(
        "sm_auditorias",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("public.generar_uuid_v7()"), primary_key=True
        ),
        sa.Column(
            "evento_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.sm_eventos.id", name="fk_sm_auditorias_evento"),
            nullable=True,
        ),
        sa.Column(
            "mensaje_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.sm_mensajes.id", name="fk_sm_auditorias_mensaje"),
            nullable=True,
        ),
        sa.Column("tenant", sa.String(length=32), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=False),
        sa.Column("accion", sa.String(length=80), nullable=False),
        sa.Column("detalle", sa.String(length=500), nullable=True),
        sa.Column("hash", sa.String(length=80), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False),
        sa.CheckConstraint("hash <> ''", name=op.f("chk_sm_auditorias_hash")),
        schema=SCHEMA,
        comment="Auditoría portable de SM sin PII",
    )
    op.create_index(
        "ix_sm_auditorias_tenant_creado", "sm_auditorias", ["tenant", "creado_en"], unique=False, schema=SCHEMA
    )
    op.create_index("ix_sm_auditorias_evento", "sm_auditorias", ["evento_id"], unique=False, schema=SCHEMA)
    op.create_index("ix_sm_auditorias_mensaje", "sm_auditorias", ["mensaje_id"], unique=False, schema=SCHEMA)

    op.create_table(
        "sm_consentimientos",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("public.generar_uuid_v7()"), primary_key=True
        ),
        sa.Column("tenant", sa.String(length=32), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=False),
        sa.Column("canal", sa.String(length=20), nullable=False),
        sa.Column("contacto_hash", sa.String(length=80), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False),
        sa.Column("origen", sa.String(length=120), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False),
        sa.Column(
            "actualizado_en", sa.DateTime(timezone=True), server_default=sa.text("clock_timestamp()"), nullable=False
        ),
        sa.CheckConstraint("estado IN ('otorgado','revocado')", name=op.f("chk_sm_consentimientos_estado")),
        schema=SCHEMA,
        comment="Consentimiento por canal y contacto hash",
    )
    op.create_index(
        "uq_sm_consentimientos_tenant_actor_canal_contacto",
        "sm_consentimientos",
        ["tenant", "actor", "canal", "contacto_hash"],
        unique=True,
        schema=SCHEMA,
    )
    op.create_index("ix_sm_consentimientos_tenant", "sm_consentimientos", ["tenant"], unique=False, schema=SCHEMA)
    op.create_index(
        "ix_sm_consentimientos_actualizado", "sm_consentimientos", ["actualizado_en"], unique=False, schema=SCHEMA
    )


def downgrade() -> None:
    op.drop_table("sm_consentimientos", schema=SCHEMA)
    op.drop_table("sm_auditorias", schema=SCHEMA)
    op.drop_table("sm_entregas", schema=SCHEMA)
    op.drop_table("sm_mensajes", schema=SCHEMA)
    op.drop_table("sm_eventos", schema=SCHEMA)
