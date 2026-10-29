"""Instala el checkpoint PostgreSQL de LangGraph bajo control de Alembic.

Revision ID: 0073_checkpoint_durable_pipeline
Revises: 0072_integridad_pasos_pipeline
"""

from collections.abc import Sequence

from langgraph.checkpoint.postgres.base import MIGRATIONS

from alembic import op

revision: str = "0073_checkpoint_durable_pipeline"
down_revision: str | Sequence[str] | None = "0072_integridad_pasos_pipeline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if len(MIGRATIONS) != 10:
        raise RuntimeError("Versión de langgraph-checkpoint-postgres incompatible con revisión 0073")
    for version, statement in enumerate(MIGRATIONS):
        op.execute(statement.replace("INDEX CONCURRENTLY", "INDEX"))
        op.execute(f"INSERT INTO checkpoint_migrations (v) VALUES ({version}) ON CONFLICT DO NOTHING")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS checkpoint_writes")
    op.execute("DROP TABLE IF EXISTS checkpoint_blobs")
    op.execute("DROP TABLE IF EXISTS checkpoints")
    op.execute("DROP TABLE IF EXISTS checkpoint_migrations")
