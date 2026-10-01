"""Mesas de trabajo ltree

Revision ID: 0010_mesas_trabajo_ltree
Revises: 0009_salvaguardas_enfoque
Create Date: 2026-10-01 07:45:00.000000
"""

from alembic import op

revision = "0010_mesas_trabajo_ltree"
down_revision = "0009_salvaguardas_enfoque"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Esquema
    "CREATE SCHEMA IF NOT EXISTS mesas_trabajo;",
    # 2. Extension ltree
    "CREATE EXTENSION IF NOT EXISTS ltree;",
    # 3. Tabla mesas
    """
    CREATE TABLE IF NOT EXISTS mesas_trabajo.mesas (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        mesa_padre_id UUID REFERENCES mesas_trabajo.mesas(id) ON DELETE CASCADE,
        ruta_jerarquica ltree NOT NULL,
        tipo_mesa VARCHAR(50) NOT NULL,
        codigo_oficial VARCHAR(100) UNIQUE NOT NULL,
        shortcode_ciudadano VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(250) NOT NULL,
        slug VARCHAR(100),
        lugar_nombre VARCHAR(300),
        fecha DATE,
        horario VARCHAR(100),
        aforo_maximo INTEGER DEFAULT 0,
        total_asistentes INTEGER DEFAULT 0,
        estado VARCHAR(50) NOT NULL DEFAULT 'PROGRAMADA',
        modalidad VARCHAR(50) NOT NULL DEFAULT 'PRESENCIAL',
        linea_id UUID REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE RESTRICT,
        dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
        territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
        facilitador_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    )
    """,
    # 4. Asegurar columnas en caso de pre-existencia de la tabla
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS mesa_padre_id UUID REFERENCES mesas_trabajo.mesas(id) ON DELETE CASCADE;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS aforo_maximo INTEGER DEFAULT 0;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS total_asistentes INTEGER DEFAULT 0;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS linea_id UUID REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE RESTRICT;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS facilitador_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS metadatos JSONB NOT NULL DEFAULT '{}'::jsonb;",
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS slug VARCHAR(100);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN slug DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN fecha DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN horario DROP NOT NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN shortcode_ciudadano TYPE VARCHAR(50);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN codigo_oficial TYPE VARCHAR(100);",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN tipo_mesa TYPE VARCHAR(50);",
    # 5. Indices
    "CREATE INDEX IF NOT EXISTS idx_mesas_ruta_gist ON mesas_trabajo.mesas USING GIST (ruta_jerarquica);",
    "CREATE INDEX IF NOT EXISTS idx_mesas_codigo ON mesas_trabajo.mesas(codigo_oficial);",
    "CREATE INDEX IF NOT EXISTS idx_mesas_shortcode ON mesas_trabajo.mesas(shortcode_ciudadano);",
    "CREATE INDEX IF NOT EXISTS idx_mesas_tipo ON mesas_trabajo.mesas(tipo_mesa);",
    "CREATE INDEX IF NOT EXISTS idx_mesas_estado ON mesas_trabajo.mesas(estado);",
    "CREATE INDEX IF NOT EXISTS idx_mesas_fecha ON mesas_trabajo.mesas(fecha);",
    "CREATE INDEX IF NOT EXISTS idx_mesas_territorio ON mesas_trabajo.mesas(territorio_id);",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TABLE IF EXISTS mesas_trabajo.mesas CASCADE;",
    "DROP SCHEMA IF EXISTS mesas_trabajo CASCADE;",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
