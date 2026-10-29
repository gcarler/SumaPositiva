"""Impide repetir una etapa del mismo hilo e intento tras perder un checkpoint.

Revision ID: 0074_idempotencia_thread
Revises: 0073_checkpoint_durable_pipeline
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0074_idempotencia_thread"
down_revision: str | Sequence[str] | None = "0073_checkpoint_durable_pipeline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE UNIQUE INDEX uq_corridas_pipeline_thread_etapa_intento "
        "ON seguimiento.corridas_pipeline (thread_id, etapa, intento) "
        "WHERE thread_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX seguimiento.uq_corridas_pipeline_thread_etapa_intento")
