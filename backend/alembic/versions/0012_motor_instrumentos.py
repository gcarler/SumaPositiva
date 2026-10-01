"""Motor de Instrumentos MGA: Arbol de Problemas y Objetivos

Revision ID: 0012_motor_instrumentos
Revises: 0011_participantes_y_actas
Create Date: 2026-10-01 08:03:00.000000
"""

from alembic import op

revision = "0012_motor_instrumentos"
down_revision = "0011_participantes_y_actas"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Esquema motor_instrumentos
    "CREATE SCHEMA IF NOT EXISTS motor_instrumentos;",
    # 2. Tabla instrumentos
    """
    CREATE TABLE IF NOT EXISTS motor_instrumentos.instrumentos (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        mesa_id UUID NULL REFERENCES mesas_trabajo.mesas(id) ON DELETE CASCADE,
        linea_id UUID NULL REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE SET NULL,
        tipo_instrumento VARCHAR(50) NOT NULL,
        nombre VARCHAR(250) NOT NULL,
        descripcion TEXT NULL,
        estado VARCHAR(50) NOT NULL DEFAULT 'EN_CONSTRUCCION',
        instrumento_origen_id UUID NULL REFERENCES motor_instrumentos.instrumentos(id) ON DELETE SET NULL,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
    """,
    # 3. Indices para instrumentos
    "CREATE INDEX IF NOT EXISTS idx_instrumentos_mesa ON motor_instrumentos.instrumentos(mesa_id);",
    "CREATE INDEX IF NOT EXISTS idx_instrumentos_tipo ON motor_instrumentos.instrumentos(tipo_instrumento);",
    "CREATE INDEX IF NOT EXISTS idx_instrumentos_estado ON motor_instrumentos.instrumentos(estado);",
    # 4. Tabla nodos_instrumento
    """
    CREATE TABLE IF NOT EXISTS motor_instrumentos.nodos_instrumento (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        instrumento_id UUID NOT NULL REFERENCES motor_instrumentos.instrumentos(id) ON DELETE CASCADE,
        nodo_padre_id UUID NULL REFERENCES motor_instrumentos.nodos_instrumento(id) ON DELETE CASCADE,
        tipo_nodo VARCHAR(50) NOT NULL,
        tipo_relacion VARCHAR(50) NOT NULL DEFAULT 'CENTRAL',
        nivel INTEGER NOT NULL DEFAULT 1,
        orden INTEGER NOT NULL DEFAULT 0,
        contenido TEXT NOT NULL,
        nodo_origen_id UUID NULL REFERENCES motor_instrumentos.nodos_instrumento(id) ON DELETE SET NULL,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
    """,
    # 5. Indices para nodos_instrumento
    "CREATE INDEX IF NOT EXISTS idx_nodos_instrumento ON motor_instrumentos.nodos_instrumento(instrumento_id);",
    "CREATE INDEX IF NOT EXISTS idx_nodos_padre ON motor_instrumentos.nodos_instrumento(nodo_padre_id);",
    "CREATE INDEX IF NOT EXISTS idx_nodos_tipo ON motor_instrumentos.nodos_instrumento(tipo_nodo);",
    "CREATE INDEX IF NOT EXISTS idx_nodos_relacion ON motor_instrumentos.nodos_instrumento(tipo_relacion);",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TABLE IF EXISTS motor_instrumentos.nodos_instrumento CASCADE;",
    "DROP TABLE IF EXISTS motor_instrumentos.instrumentos CASCADE;",
    "DROP SCHEMA IF EXISTS motor_instrumentos CASCADE;",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
