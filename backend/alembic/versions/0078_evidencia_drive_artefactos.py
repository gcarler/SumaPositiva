"""Conserva evidencia de catálogo Drive por artefacto sin acreditar custodia.

Revision ID: 0078_evidencia_drive_artefactos
Revises: 0077_paquetes_artefactos
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0078_evidencia_drive_artefactos"
down_revision: str | Sequence[str] | None = "0077_paquetes_artefactos"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "artefactos_fuente",
        sa.Column("evidencia_origen", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_column("artefactos_fuente", "evidencia_origen", schema="seguimiento")
