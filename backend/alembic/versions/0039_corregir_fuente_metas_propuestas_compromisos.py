"""Corregir fuente y marcar metas de compromisos como propuestas sin validar (OBS-11).

Revision ID: 0039_corregir_fuente_metas
Revises: 0038_merge_heads
Create Date: 2026-10-04 01:17:00.000000
"""

from typing import Sequence, Union
from alembic import op

revision: str = "0039_corregir_fuente_metas"
down_revision: Union[str, Sequence[str], None] = "0038_merge_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NUEVA_FUENTE = (
    "Catálogo propuesto por el equipo, PENDIENTE de validación institucional, "
    "no proviene del Decreto 037"
)


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE seguimiento.compromisos_pas
        SET metadatos = jsonb_set(
            jsonb_set(
                COALESCE(metadatos, '{{}}'::jsonb),
                '{{fuente}}',
                to_jsonb('{NUEVA_FUENTE}'::text)
            ),
            '{{meta_validada}}',
            'false'::jsonb
        ) || '{{"alerta_fuente": "propuesta_sin_validar"}}'::jsonb;
        """
    )


def downgrade() -> None:
    pass
