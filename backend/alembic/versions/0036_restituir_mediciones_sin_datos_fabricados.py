"""Restituir mediciones de indicadores: eliminar datos fabricados (OBS-02) y agregar bandera es_demostracion.

Revision ID: 0036_restituir_mediciones
Revises: 0035_mediciones_indicadores_seed
Create Date: 2026-10-04 00:15:00.000000
"""

from sqlalchemy import text

from alembic import op

revision = "0036_restituir_mediciones"
down_revision = "0035_mediciones_indicadores_seed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Agregar columna es_demostracion a indicadores.mediciones_indicador si no existe
    conn.execute(
        text("""
            ALTER TABLE indicadores.mediciones_indicador
            ADD COLUMN IF NOT EXISTS es_demostracion BOOLEAN NOT NULL DEFAULT false;
        """)
    )

    # 2. ELIMINAR todas las mediciones previas sin procedencia real verificable (OBS-02)
    # Prohibición expresa de procedencia falsa, URLs ficticias o nombres inventados
    conn.execute(
        text("""
            DELETE FROM indicadores.mediciones_indicador
            WHERE es_demostracion IS NOT TRUE;
        """)
    )

    # 3. Restablecer las 8 fichas técnicas a su estado previo sin mediciones fabricadas:
    # valor_actual = 0, porcentaje_avance = 0, metadatos limpios
    conn.execute(
        text("""
            UPDATE indicadores.fichas_tecnicas_indicadores
            SET valor_actual = 0.0,
                porcentaje_avance = 0.0,
                metadatos = '{}'::jsonb,
                actualizado_en = clock_timestamp();
        """)
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text("""
            ALTER TABLE indicadores.mediciones_indicador
            DROP COLUMN IF EXISTS es_demostracion;
        """)
    )
