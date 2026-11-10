"""Programación, reclamaciones recuperables y simulación explícita del worker SM."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0099_sm_worker_backoff"
down_revision = "0098_sm_contactos_boveda"
branch_labels = None
depends_on = None
SCHEMA = "participacion_ciudadana"


def upgrade() -> None:
    op.add_column("sm_mensajes", sa.Column("proximo_intento_en", sa.DateTime(timezone=True)), schema=SCHEMA)
    op.add_column("sm_mensajes", sa.Column("reclamado_hasta", sa.DateTime(timezone=True)), schema=SCHEMA)
    op.add_column("sm_mensajes", sa.Column("reclamacion_token", postgresql.UUID(as_uuid=True)), schema=SCHEMA)
    op.add_column(
        "sm_mensajes",
        sa.Column("reintentable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_sm_mensajes_proximo_intento", "sm_mensajes", ["tenant", "estado", "proximo_intento_en"], schema=SCHEMA
    )
    op.drop_constraint("chk_sm_mensajes_estado", "sm_mensajes", schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_sm_mensajes_estado"),
        "sm_mensajes",
        "estado IN ('pendiente','encolado','enviado','entregado','fallido','agotado','cancelado','simulado')",
        schema=SCHEMA,
    )
    op.drop_constraint("chk_sm_entregas_estado", "sm_entregas", schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_sm_entregas_estado"),
        "sm_entregas",
        "estado_entrega IN ('enviado','fallido','simulado','en_curso','incierto')",
        schema=SCHEMA,
    )
    op.create_table(
        "sm_worker_latidos",
        sa.Column("tenant", sa.String(32), primary_key=True),
        sa.Column("ultimo_latido_en", sa.DateTime(timezone=True), nullable=False),
        schema=SCHEMA,
        comment="Última ronda del worker SM por tenant; sin datos personales",
    )


def downgrade() -> None:
    # No reinterpretar una simulación como envío real al volver a 0098.
    op.execute(f"""UPDATE {SCHEMA}.sm_mensajes
        SET metadatos=metadatos || jsonb_build_object('sm_estado_pre_downgrade', estado), estado='cancelado'
        WHERE estado='simulado' OR reclamacion_token IS NOT NULL""")
    op.execute(f"""UPDATE {SCHEMA}.sm_entregas
        SET payload=payload || jsonb_build_object('sm_estado_pre_downgrade', estado_entrega), estado_entrega='fallido'
        WHERE estado_entrega IN ('simulado','en_curso','incierto')""")
    op.drop_table("sm_worker_latidos", schema=SCHEMA)
    op.drop_constraint("chk_sm_entregas_estado", "sm_entregas", schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_sm_entregas_estado"), "sm_entregas", "estado_entrega IN ('enviado','fallido')", schema=SCHEMA
    )
    op.drop_constraint("chk_sm_mensajes_estado", "sm_mensajes", schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_sm_mensajes_estado"),
        "sm_mensajes",
        "estado IN ('pendiente','encolado','enviado','entregado','fallido','agotado','cancelado')",
        schema=SCHEMA,
    )
    op.drop_index("ix_sm_mensajes_proximo_intento", table_name="sm_mensajes", schema=SCHEMA)
    for columna in ("reintentable", "reclamacion_token", "reclamado_hasta", "proximo_intento_en"):
        op.drop_column("sm_mensajes", columna, schema=SCHEMA)
