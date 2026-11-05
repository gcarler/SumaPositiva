"""Admitir indicadores descriptivos sin clasificación de riesgo acreditada.

Revision ID: 0096_riesgo_sin_evaluar
Revises: 0095_sembrar_censo_35_mesas
Create Date: 2026-11-05
"""

from sqlalchemy import text

from alembic import op

revision = "0096_riesgo_sin_evaluar"
down_revision = "0095_sembrar_censo_35_mesas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout='5s'")
    op.execute("ALTER TABLE geodatos.indicadores_territorio DROP CONSTRAINT chk_nivel_riesgo")
    op.execute("""
        ALTER TABLE geodatos.indicadores_territorio ADD CONSTRAINT chk_nivel_riesgo
        CHECK (nivel_riesgo IN ('bajo','medio','alto','critico','sin_evaluar'))
    """)


def downgrade() -> None:
    if (
        op.get_bind()
        .execute(
            text("""
        SELECT EXISTS (SELECT 1 FROM geodatos.indicadores_territorio WHERE nivel_riesgo='sin_evaluar')
    """)
        )
        .scalar_one()
    ):
        raise RuntimeError(
            "Restaurar previamente la carga de indicadores sin evaluar; no se inventa un nivel de riesgo"
        )
    op.execute("SET LOCAL lock_timeout='5s'")
    op.execute("ALTER TABLE geodatos.indicadores_territorio DROP CONSTRAINT chk_nivel_riesgo")
    op.execute("""
        ALTER TABLE geodatos.indicadores_territorio ADD CONSTRAINT chk_nivel_riesgo
        CHECK (nivel_riesgo IN ('bajo','medio','alto','critico'))
    """)
