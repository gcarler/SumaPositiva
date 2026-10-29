"""Evita duplicar lotes de una misma versión y manifiesto.

Revision ID: 0076_lotes_idempotentes
Revises: 0075_catalogo_fuentes
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0076_lotes_idempotentes"
down_revision: str | Sequence[str] | None = "0075_catalogo_fuentes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_lotes_fuente_version_manifiesto",
        "lotes_fuente",
        ["version_id", "manifiesto_sha256"],
        schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_constraint("uq_lotes_fuente_version_manifiesto", "lotes_fuente", schema="seguimiento")
