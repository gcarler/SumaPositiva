"""Admitir estado BORRADOR en testimonios comunitarios.

Revision ID: 0085_borrador_testimonios
Revises: 0084_aportes_colas_y_apoyos
"""

from alembic import op

revision = "0085_borrador_testimonios"
down_revision = "0084_aportes_colas_y_apoyos"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE participacion_ciudadana.testimonios_comunitarios
        DROP CONSTRAINT IF EXISTS chk_estado_testimonio,
        ADD CONSTRAINT chk_estado_testimonio
        CHECK (estado IN ('BORRADOR', 'PENDIENTE', 'APROBADO', 'DESTACADO', 'RECHAZADO'));
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE participacion_ciudadana.testimonios_comunitarios
        DROP CONSTRAINT IF EXISTS chk_estado_testimonio,
        ADD CONSTRAINT chk_estado_testimonio
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'DESTACADO', 'RECHAZADO'));
        """
    )
