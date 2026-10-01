"""Control de fases DNP, auditoría y OAuth institucional.

Revision ID: 0025_control_fases_y_oauth
Revises: 0024_testimonios_memoria
Create Date: 2026-10-01 16:53:00
"""

from sqlalchemy import text
from alembic import op

revision = "0025_control_fases_y_oauth"
down_revision = "0024_testimonios_memoria"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Asegurar reglas de participación web en fases_politica
    op.execute(
        text("""
        UPDATE motor_politicas.fases_politica
        SET reglas_participacion = jsonb_set(
            COALESCE(reglas_participacion, '{}'::jsonb),
            '{habilitada_web}',
            'true'::jsonb,
            true
        )
        WHERE codigo = 'FASE_1_DIAGNOSTICO';
        """)
    )

    op.execute(
        text("""
        UPDATE motor_politicas.fases_politica
        SET reglas_participacion = jsonb_set(
            COALESCE(reglas_participacion, '{}'::jsonb),
            '{habilitada_web}',
            'false'::jsonb,
            true
        )
        WHERE codigo <> 'FASE_1_DIAGNOSTICO';
        """)
    )

    # 2. Asignar permisos politicas:gestionar y auditoria:leer a autoridad_distrital y administrador_identidades
    op.execute(
        text("""
        UPDATE autenticacion.roles
        SET permisos = permisos || '["politicas:gestionar", "auditoria:leer"]'::jsonb
        WHERE codigo = 'autoridad_distrital'
          AND NOT permisos ? 'politicas:gestionar';
        """)
    )

    op.execute(
        text("""
        UPDATE autenticacion.roles
        SET permisos = permisos || '["politicas:gestionar", "auditoria:leer"]'::jsonb
        WHERE codigo = 'administrador_identidades'
          AND NOT permisos ? 'politicas:gestionar';
        """)
    )


def downgrade() -> None:
    op.execute(
        text("""
        UPDATE motor_politicas.fases_politica
        SET reglas_participacion = reglas_participacion - 'habilitada_web';
        """)
    )

    op.execute(
        text("""
        UPDATE autenticacion.roles
        SET permisos = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(permisos) elem
            WHERE elem NOT IN ('politicas:gestionar')
        )
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades');
        """)
    )
