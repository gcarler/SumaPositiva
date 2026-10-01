"""Habilitar las extensiones requeridas por el dominio POLIS."""

from alembic import op

revision = "0001_extensions"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    for extension in ("postgis", "ltree", "pgcrypto", "pg_trgm"):
        op.execute(f'CREATE EXTENSION IF NOT EXISTS "{extension}"')


def downgrade() -> None:
    # Shared extensions can be used by later migrations or other schemas.
    # Rolling back the revision must not remove spatial data or those dependencies.
    pass
