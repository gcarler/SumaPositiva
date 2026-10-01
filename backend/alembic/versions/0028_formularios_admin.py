"""Gestión de formularios para el administrador de la plataforma.

Revision ID: 0028_formularios_admin
Revises: 0026_fotos_mes_vigilancia
"""

import json

from sqlalchemy import text

from alembic import op

revision = "0028_formularios_admin"
down_revision = "0026_fotos_mes_vigilancia"
branch_labels = None
depends_on = None
PERMISOS = ("formularios:leer", "formularios:gestionar")


def upgrade() -> None:
    for permiso in PERMISOS:
        op.execute(
            text("""
                WITH actualizado AS (
                    UPDATE autenticacion.roles
                    SET permisos = permisos || CAST(:permisos AS jsonb)
                    WHERE codigo = 'administrador_identidades'
                      AND NOT permisos @> CAST(:permisos AS jsonb)
                    RETURNING codigo
                )
                INSERT INTO autenticacion.eventos_identidad (accion, detalle)
                SELECT 'permiso_sistema_agregado', jsonb_build_object(
                    'revision', CAST(:revision AS text), 'rol', codigo,
                    'permiso', CAST(:permiso AS text),
                    'motivo', 'Habilitar gestión de formularios en la plataforma interna'
                ) FROM actualizado
            """).bindparams(permisos=json.dumps([permiso]), revision=revision, permiso=permiso)
        )


def downgrade() -> None:
    for permiso in PERMISOS:
        op.execute(
            text("""
                WITH actualizado AS (
                    UPDATE autenticacion.roles SET permisos = permisos - :permiso
                    WHERE codigo = 'administrador_identidades' AND permisos ? :permiso
                    RETURNING codigo
                )
                INSERT INTO autenticacion.eventos_identidad (accion, detalle)
                SELECT 'permiso_sistema_retirado', jsonb_build_object(
                    'revision', CAST(:revision AS text), 'rol', codigo,
                    'permiso', CAST(:permiso AS text),
                    'motivo', 'Revertir gestión administrativa de formularios'
                ) FROM actualizado
            """).bindparams(revision=revision, permiso=permiso)
        )
