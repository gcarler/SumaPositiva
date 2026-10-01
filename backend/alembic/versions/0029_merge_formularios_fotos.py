"""Unir los permisos independientes de formularios y fotos de mesas.

Revision ID: 0029_merge_formularios_fotos
Revises: 0027_permisos_fotos_mesa, 0028_formularios_admin
"""

revision = "0029_merge_formularios_fotos"
down_revision = ("0027_permisos_fotos_mesa", "0028_formularios_admin")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
