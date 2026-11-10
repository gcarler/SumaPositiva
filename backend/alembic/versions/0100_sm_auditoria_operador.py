"""Atribución del operador autenticado en la auditoría SM (310/MED-01)."""

import sqlalchemy as sa

from alembic import op

revision = "0100_sm_auditoria_operador"
down_revision = "0099_sm_worker_backoff"
branch_labels = None
depends_on = None
SCHEMA = "participacion_ciudadana"


def upgrade() -> None:
    op.add_column(
        "sm_auditorias",
        sa.Column("operador", sa.String(120), nullable=True),
        schema=SCHEMA,
    )
    op.create_check_constraint(
        op.f("chk_sm_auditorias_operador"),
        "sm_auditorias",
        "operador IS NULL OR operador <> ''",
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_constraint("chk_sm_auditorias_operador", "sm_auditorias", schema=SCHEMA)
    op.drop_column("sm_auditorias", "operador", schema=SCHEMA)
