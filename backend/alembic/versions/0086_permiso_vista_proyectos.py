"""Permiso de lectura de la vista agregada de Proyectos (sin tablas nuevas).

Revision ID: 0086_permiso_vista_proyectos
Revises: 0085_borrador_testimonios
Create Date: 2026-10-28

Contexto:
El menú Institucional "Proyectos" agrega en una sola consulta read-only las
actividades de comunicaciones, agendas de mesas, formularios y Plan de
Acción (actividades_plan_accion). No crea tablas ni persistencia paralela:
solo habilita `proyectos:leer` para los mismos roles con lectura institucional.
La escritura sigue siendo responsabilidad del módulo dueño de cada actividad.
"""

from alembic import op

revision = "0086_permiso_vista_proyectos"
down_revision = "0085_borrador_testimonios"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Consulta agregada: mismos roles con lectura de comunicaciones (matriz permisos-api).
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = (
            SELECT jsonb_agg(DISTINCT elem)
            FROM jsonb_array_elements_text(permisos || '["proyectos:leer"]'::jsonb) AS elem
        )
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades', 'auditor_forense', 'facilitador_mesa');
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = (
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements_text(permisos) AS elem
            WHERE elem <> 'proyectos:leer'
        )
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades', 'auditor_forense', 'facilitador_mesa');
        """
    )
