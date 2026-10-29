"""Unicidad de pasos por hilo y vínculo verificable con la corrida de etapa.

Revision ID: 0072_integridad_pasos_pipeline
Revises: 0071_corridas_pipeline_grafo
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0072_integridad_pasos_pipeline"
down_revision: str | Sequence[str] | None = "0071_corridas_pipeline_grafo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_corridas_pipeline_pasos_thread_orden",
        "corridas_pipeline_pasos",
        ["thread_id", "orden"],
        schema="seguimiento",
    )
    op.create_foreign_key(
        "fk_corridas_pipeline_pasos_corrida_id",
        "corridas_pipeline_pasos",
        "corridas_pipeline",
        ["corrida_id"],
        ["id"],
        source_schema="seguimiento",
        referent_schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_constraint("fk_corridas_pipeline_pasos_corrida_id", "corridas_pipeline_pasos", schema="seguimiento")
    op.drop_constraint("uq_corridas_pipeline_pasos_thread_orden", "corridas_pipeline_pasos", schema="seguimiento")
