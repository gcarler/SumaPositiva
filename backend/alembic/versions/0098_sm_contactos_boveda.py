"""Bóveda AEAD de contactos SM; no modifica contactos históricos ni envía mensajes."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0098_sm_contactos_boveda"
down_revision = "0097_sm_core"
branch_labels = None
depends_on = None
SCHEMA = "participacion_ciudadana"


def upgrade() -> None:
    op.create_table(
        "sm_contactos_boveda",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("public.generar_uuid_v7()")
        ),
        sa.Column("tenant", sa.String(32), nullable=False),
        sa.Column("actor", sa.String(120), nullable=False),
        sa.Column("canal", sa.String(20), nullable=False),
        sa.Column("contacto_hash", sa.String(80), nullable=False),
        sa.Column("contacto_cifrado", sa.LargeBinary(), nullable=False),
        sa.Column("key_id", sa.String(40), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("clock_timestamp()")),
        sa.Column(
            "actualizado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("clock_timestamp()")
        ),
        sa.CheckConstraint("tenant <> '' AND actor <> '' AND key_id <> ''", name=op.f("chk_sm_boveda_identidad")),
        schema=SCHEMA,
        comment="Contactos SM cifrados AES-256-GCM; descifrado exclusivo de despacho/rotación",
    )
    op.create_index(
        "uq_sm_boveda_contacto",
        "sm_contactos_boveda",
        ["tenant", "actor", "canal", "contacto_hash"],
        unique=True,
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_table("sm_contactos_boveda", schema=SCHEMA)
