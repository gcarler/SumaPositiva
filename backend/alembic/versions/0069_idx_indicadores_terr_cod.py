"""Índice único idempotente del corpus de indicadores territoriales (Geovisor/PDT).

Revision ID: 0069_idx_indicadores_terr_cod
Revises: 0068_tablas_pdt_ai_evaluator
Create Date: 2026-10-21

Contexto:
El sembrador `scripts/poblar_geodatos_territorios_pdt.py` creaba este índice
por DDL en runtime (hallazgo BD-1 del plan de remediación 2026-10-20). La
creación pasa al lineage Alembic; el runtime queda en DML de siembra.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0069_idx_indicadores_terr_cod"
down_revision: str | Sequence[str] | None = "0068_tablas_pdt_ai_evaluator"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_indicadores_territorio_terr_cod_anio
        ON geodatos.indicadores_territorio (territorio_id, codigo_indicador, anio_corte)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS geodatos.ux_indicadores_territorio_terr_cod_anio")
