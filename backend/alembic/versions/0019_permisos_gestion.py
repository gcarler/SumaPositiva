"""Asignar permisos de gestión a los roles institucionales existentes.

Revision ID: 0019_permisos_gestion
Revises: 0018_merge_mesas_presupuesto
"""

import json

from sqlalchemy import text

from alembic import op

revision = "0019_permisos_gestion"
down_revision = "0018_merge_mesas_presupuesto"
branch_labels = None
depends_on = None

PERMISOS_POR_ROL = {
    "autoridad_distrital": (
        "presupuesto:gestionar",
        "indicadores:gestionar",
        "instrumentos:gestionar",
        "ia:analizar",
        "mesas:abrir",
        "mesas:acuerdos",
        "asistencia:verificar",
    ),
    "facilitador_mesa": ("instrumentos:gestionar", "ia:analizar"),
}


def upgrade() -> None:
    for rol, permisos in PERMISOS_POR_ROL.items():
        for permiso in permisos:
            op.execute(
                text("""
                UPDATE autenticacion.roles
                SET permisos = permisos || CAST(:permiso AS jsonb)
                WHERE codigo = :rol AND NOT permisos @> CAST(:permiso AS jsonb)
            """).bindparams(rol=rol, permiso=json.dumps([permiso]))
            )


def downgrade() -> None:
    for rol, permisos in PERMISOS_POR_ROL.items():
        op.execute(
            text("""
            UPDATE autenticacion.roles AS rol
            SET permisos = (
                SELECT COALESCE(jsonb_agg(permiso.value ORDER BY permiso.orden), '[]'::jsonb)
                FROM jsonb_array_elements(rol.permisos) WITH ORDINALITY AS permiso(value, orden)
                WHERE NOT CAST(:quitar AS jsonb) @> jsonb_build_array(permiso.value)
            )
            WHERE rol.codigo = :rol
        """).bindparams(rol=rol, quitar=json.dumps(permisos))
        )
