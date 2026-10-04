"""Mapeo de Actores Estratégicos y Gobernanza Territorial (AUD-14).

Revision ID: 0040_modulo_actores_estrategicos
Revises: 0039_corregir_fuente_metas
Create Date: 2026-10-04 01:40:00.000000
"""

from typing import Sequence, Union
from alembic import op

revision: str = "0040_modulo_actores_estrategicos"
down_revision: Union[str, Sequence[str], None] = "0039_corregir_fuente_metas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.actores_estrategicos (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo VARCHAR(50) UNIQUE NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            territorio VARCHAR(50) NOT NULL,
            barrio_vereda VARCHAR(150),
            dimensiones_principales JSONB NOT NULL DEFAULT '[]'::jsonb,
            nivel_poder VARCHAR(20) NOT NULL,
            nivel_interes VARCHAR(20) NOT NULL,
            postura VARCHAR(50) NOT NULL,
            contacto JSONB NOT NULL DEFAULT '{}'::jsonb,
            mesas_asistidas JSONB NOT NULL DEFAULT '[]'::jsonb,
            propuestas_radicadas INTEGER NOT NULL DEFAULT 0,
            expectativas_principales TEXT NOT NULL DEFAULT '',
            acciones_involucramiento TEXT NOT NULL DEFAULT '',
            es_demostracion BOOLEAN NOT NULL DEFAULT false,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_actores_tipo
            ON participacion_ciudadana.actores_estrategicos (tipo)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_actores_territorio
            ON participacion_ciudadana.actores_estrategicos (territorio)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_actores_demostracion
            ON participacion_ciudadana.actores_estrategicos (es_demostracion)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS participacion_ciudadana.actores_estrategicos CASCADE;")
