"""Añadir metadatos versionados para la integridad pericial de actas.

Revision ID: 0021_integridad_pericial_acta
Revises: 0020_formularios_y_consultas
"""

from alembic import op

revision = "0021_integridad_pericial_acta"
down_revision = "0020_formularios_y_consultas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # El bootstrap de esta revisión no puede hacer UPDATE sobre actas concertadas:
    # el trigger de inmutabilidad lo rechaza. Marcar las filas preexistentes al añadir
    # la columna y restablecer luego el default de nuevas actas, sin desactivar guardas.
    op.execute("""
        ALTER TABLE mesas_trabajo.actas_comunitarias
        ADD COLUMN IF NOT EXISTS metadatos_cierre JSONB NOT NULL
        DEFAULT jsonb_build_object('version', 'polis-acta-v1-legacy', 'integridad_requiere_revision', true)
    """)
    op.execute("""
        ALTER TABLE mesas_trabajo.actas_comunitarias
        ALTER COLUMN metadatos_cierre SET DEFAULT '{}'::jsonb
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE mesas_trabajo.actas_comunitarias
        DROP COLUMN IF EXISTS metadatos_cierre
    """)
