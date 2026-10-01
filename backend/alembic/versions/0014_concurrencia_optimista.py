"""Concurrencia optimista y control de conflictos

Revision ID: 0014_concurrencia_optimista
Revises: 0013_semillas_sectoriales_cartagena
Create Date: 2026-10-01 08:14:00.000000
"""

from alembic import op

revision = "0014_concurrencia_optimista"
down_revision = "0013_semillas_sectoriales"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar version_seq a motor_instrumentos.nodos_instrumento
    op.execute(
        "ALTER TABLE motor_instrumentos.nodos_instrumento ADD COLUMN IF NOT EXISTS version_seq INTEGER NOT NULL DEFAULT 1"
    )

    # Agregar version_seq a motor_instrumentos.instrumentos
    op.execute(
        "ALTER TABLE motor_instrumentos.instrumentos ADD COLUMN IF NOT EXISTS version_seq INTEGER NOT NULL DEFAULT 1"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE motor_instrumentos.instrumentos DROP COLUMN IF EXISTS version_seq")
    op.execute("ALTER TABLE motor_instrumentos.nodos_instrumento DROP COLUMN IF EXISTS version_seq")
