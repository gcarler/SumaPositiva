"""Ajustar cronograma de la Fase 1 Diagnóstico de la Política Pública.

Revision ID: 0087_cronograma_diagnostico
Revises: 0086_permiso_vista_proyectos
Create Date: 2026-10-28

Contexto:
Ajuste de cronograma operativo para la Fase 1 (FASE_1_DIAGNOSTICO)
de la Política Pública de Seguridad Humana Integral de Cartagena:
- Fecha de inicio: 2026-10-27 (ayer respecto al corte 28-oct-2026)
- Fecha de cierre: 2026-12-31
"""

from alembic import op

revision = "0087_cronograma_diagnostico"
down_revision = "0086_permiso_vista_proyectos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE motor_politicas.fases_politica
        SET fecha_inicio = '2026-10-27',
            fecha_cierre = '2026-12-31'
        WHERE codigo = 'FASE_1_DIAGNOSTICO';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE motor_politicas.fases_politica
        SET fecha_inicio = '2026-02-01',
            fecha_cierre = '2026-06-30'
        WHERE codigo = 'FASE_1_DIAGNOSTICO';
        """
    )
