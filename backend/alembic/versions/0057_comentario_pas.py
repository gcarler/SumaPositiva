"""Alinear comentario de tabla compromisos_pas para paridad estricta.

Tarea: [AUD-COMP-01]
Plan Maestro: Auditoría Técnica de Completitud y Consistencia POLIS 2026

Revision ID: 0057_comentario_pas
Revises: 0056_radicacion_notif
Create Date: 2026-10-11 18:00:00.000000
"""

from typing import Sequence, Union
from alembic import op


revision: str = "0057_comentario_pas"
down_revision: Union[str, Sequence[str], None] = "0056_radicacion_notif"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table_comment(
        "compromisos_pas",
        "Matriz de compromisos institucionales del PAS Cartagena",
        existing_comment=None,
        schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_table_comment(
        "compromisos_pas",
        existing_comment="Matriz de compromisos institucionales del PAS Cartagena",
        schema="seguimiento",
    )
