"""Alineacion de tipos y restricciones en mesas_trabajo.mesas (AUD21-H01).

Revision ID: 0052_alinear_esquema_mesas
Revises: 0051_modulo_tareas_comunicacion
Create Date: 2026-10-08 01:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0052_alinear_esquema_mesas"
down_revision: Union[str, None] = "0051_modulo_tareas_comunicacion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UPGRADE_STATEMENTS = [
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN slug TYPE VARCHAR(180);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN slug SET NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN nombre TYPE VARCHAR(255);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN lugar_nombre TYPE VARCHAR(255);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN estado TYPE VARCHAR(30);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN estado DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN modalidad TYPE VARCHAR(30);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN modalidad DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN creado_en DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN actualizado_en DROP NOT NULL;",
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'mesas_slug_key'
        ) THEN
            ALTER TABLE mesas_trabajo.mesas ADD CONSTRAINT mesas_slug_key UNIQUE (slug);
        END IF;
    END $$;
    """,
]

DOWNGRADE_STATEMENTS = [
    "ALTER TABLE mesas_trabajo.mesas DROP CONSTRAINT IF EXISTS mesas_slug_key;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN slug TYPE VARCHAR(100);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN slug DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN nombre TYPE VARCHAR(250);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN lugar_nombre TYPE VARCHAR(300);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN estado TYPE VARCHAR(50);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN estado SET NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN modalidad TYPE VARCHAR(50);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN modalidad SET NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN creado_en SET NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN actualizado_en SET NOT NULL;",
]


def upgrade() -> None:
    for stmt in UPGRADE_STATEMENTS:
        op.execute(sa.text(stmt))


def downgrade() -> None:
    for stmt in DOWNGRADE_STATEMENTS:
        op.execute(sa.text(stmt))
