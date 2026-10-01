"""Unificar las entregas concurrentes de integridad y presupuesto.

Revision ID: 0018_merge_mesas_presupuesto
Revises: 0016_integridad_mesas, 0016_presupuesto_e_indicadores
"""

revision = "0018_merge_mesas_presupuesto"
down_revision = ("0016_integridad_mesas", "0016_presupuesto_e_indicadores")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
