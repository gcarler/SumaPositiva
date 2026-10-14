"""Add Drive security-dimension and government-period tags to Triada rows.

Revision ID: 0064_drive_seguridad_humana
Revises: 0063_motor_ingesta_masiva_triada
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0064_drive_seguridad_humana"
down_revision: str | Sequence[str] | None = "0063_motor_ingesta_masiva_triada"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("archivos_plan_ingeridos", "registros_triada_normalizados"):
        op.add_column(
            table,
            sa.Column(
                "dimensiones_seguridad_humana",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text("'[]'::jsonb"),
                nullable=False,
            ),
            schema="seguimiento",
        )
        op.add_column(
            table, sa.Column("periodo_gobierno", sa.String(20), nullable=True), schema="seguimiento"
        )
        op.create_index(
            f"idx_{table}_periodo_gobierno", table, ["periodo_gobierno"], schema="seguimiento"
        )
        op.create_index(
            f"idx_{table}_dimensiones_gin",
            table,
            ["dimensiones_seguridad_humana"],
            schema="seguimiento",
            postgresql_using="gin",
        )


def downgrade() -> None:
    for table in ("registros_triada_normalizados", "archivos_plan_ingeridos"):
        op.drop_index(f"idx_{table}_dimensiones_gin", table_name=table, schema="seguimiento")
        op.drop_index(f"idx_{table}_periodo_gobierno", table_name=table, schema="seguimiento")
        op.drop_column(table, "periodo_gobierno", schema="seguimiento")
        op.drop_column(table, "dimensiones_seguridad_humana", schema="seguimiento")
