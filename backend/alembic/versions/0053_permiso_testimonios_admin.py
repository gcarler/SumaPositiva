"""Asignar permiso testimonios:moderar al rol administrador_identidades (FEAT-TESTIMONIOS-01).

Revision ID: 0053_permiso_testimonios_admin
Revises: 0052_alinear_esquema_mesas
Create Date: 2026-10-08 20:05:00.000000
"""

from typing import Sequence, Union
from alembic import op


revision: str = "0053_permiso_testimonios_admin"
down_revision: Union[str, Sequence[str], None] = "0052_alinear_esquema_mesas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE autenticacion.roles 
        SET permisos = permisos || '["testimonios:moderar"]'::jsonb 
        WHERE codigo = 'administrador_identidades' AND NOT (permisos ? 'testimonios:moderar');
        """
    )


def downgrade() -> None:
    pass
