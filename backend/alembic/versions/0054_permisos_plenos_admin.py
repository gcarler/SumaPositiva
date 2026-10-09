"""Asignar permisos plenos al rol administrador_identidades (GAP-FIX-01).

Revision ID: 0054_permisos_plenos_admin
Revises: 0053_permiso_testimonios_admin
Create Date: 2026-10-09 04:06:00.000000
"""

from typing import Sequence, Union
from alembic import op


revision: str = "0054_permisos_plenos_admin"
down_revision: Union[str, Sequence[str], None] = "0053_permiso_testimonios_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = (
            SELECT jsonb_agg(DISTINCT elem)
            FROM jsonb_array_elements_text(
                permisos || '["indicadores:gestionar", "instrumentos:gestionar", "presupuesto:gestionar", "mesas:abrir", "mesas:acuerdos", "mesas:fotos:subir", "asistencia:verificar", "ia:analizar"]'::jsonb
            ) AS elem
        )
        WHERE codigo = 'administrador_identidades';
        """
    )


def downgrade() -> None:
    pass
