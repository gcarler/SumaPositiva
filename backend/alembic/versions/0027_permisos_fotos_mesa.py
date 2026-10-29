"""Permisos de carga y moderación institucional de fotos de mesas.

Revision ID: 0027_permisos_fotos_mesa
Revises: 0026_fotos_mes_vigilancia
"""

from sqlalchemy import text

from alembic import op

revision = "0027_permisos_fotos_mesa"
down_revision = "0026_fotos_mes_vigilancia"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for rol in ("autoridad_distrital", "facilitador_mesa"):
        op.execute(
            text("""
            UPDATE autenticacion.roles
            SET permisos = permisos || CAST(:permiso AS jsonb)
            WHERE codigo = :rol AND NOT permisos @> CAST(:permiso AS jsonb)
        """).bindparams(rol=rol, permiso='["mesas:fotos:subir"]')
        )


def downgrade() -> None:
    op.execute(
        text("""
        UPDATE autenticacion.roles
        SET permisos = permisos - 'mesas:fotos:subir'
        WHERE codigo IN ('autoridad_distrital', 'facilitador_mesa')
    """)
    )
