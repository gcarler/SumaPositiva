"""Participantes y Actas Comunitarias de Concertacion

Revision ID: 0011_participantes_y_actas
Revises: 0010_mesas_trabajo_ltree
Create Date: 2026-10-01 07:55:00.000000
"""

from alembic import op

revision = "0011_participantes_y_actas"
down_revision = "0010_mesas_trabajo_ltree"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Columna sha256_acta en mesas
    "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS sha256_acta CHAR(64) NULL;",
    "ALTER TABLE mesas_trabajo.mesas ALTER COLUMN lugar_nombre DROP NOT NULL;",
    # 2. Tabla participantes_mesa
    """
    CREATE TABLE IF NOT EXISTS mesas_trabajo.participantes_mesa (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        mesa_id UUID NOT NULL REFERENCES mesas_trabajo.mesas(id) ON DELETE CASCADE,
        sujeto_id VARCHAR(100) NOT NULL,
        usuario_id UUID NULL REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
        nombre_completo VARCHAR(200) NOT NULL,
        rol_en_mesa VARCHAR(50) NOT NULL DEFAULT 'ciudadano',
        organizacion_comunitaria VARCHAR(200) NULL,
        asistencia_confirmada BOOLEAN NOT NULL DEFAULT true,
        hora_ingreso TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT uq_participante_mesa UNIQUE (mesa_id, sujeto_id)
    );
    """,
    # 3. Indices participantes_mesa
    "CREATE INDEX IF NOT EXISTS idx_participantes_mesa ON mesas_trabajo.participantes_mesa(mesa_id);",
    "CREATE INDEX IF NOT EXISTS idx_participantes_rol ON mesas_trabajo.participantes_mesa(rol_en_mesa);",
    # 4. Tabla actas_comunitarias
    """
    CREATE TABLE IF NOT EXISTS mesas_trabajo.actas_comunitarias (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        mesa_id UUID NOT NULL REFERENCES mesas_trabajo.mesas(id) ON DELETE RESTRICT,
        numero_acta VARCHAR(100) NOT NULL UNIQUE,
        quorum_alcanzado BOOLEAN NOT NULL DEFAULT false,
        total_participantes INTEGER NOT NULL DEFAULT 0,
        resumen_deliberacion TEXT NOT NULL,
        acuerdos JSONB NOT NULL DEFAULT '[]'::jsonb,
        disensos JSONB NOT NULL DEFAULT '[]'::jsonb,
        compromisos_institucionales JSONB NOT NULL DEFAULT '[]'::jsonb,
        facilitador_firma_id UUID NULL REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
        nombre_facilitador_firma VARCHAR(200) NULL,
        sha256_acta CHAR(64) NOT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
        fecha_cierre TIMESTAMPTZ NULL,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
    """,
    # 5. Indices actas_comunitarias
    "CREATE INDEX IF NOT EXISTS idx_actas_mesa ON mesas_trabajo.actas_comunitarias(mesa_id);",
    "CREATE INDEX IF NOT EXISTS idx_actas_estado ON mesas_trabajo.actas_comunitarias(estado);",
    # 6. Trigger de Inmutabilidad Pericial (Sentencia C-150 de 2015)
    """
    CREATE OR REPLACE FUNCTION mesas_trabajo.prevenir_modificacion_acta_cerrada()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'DELETE' THEN
            IF OLD.estado IN ('CONCERTADA', 'PUBLICADA') THEN
                RAISE EXCEPTION 'Violación Forense (Sentencia C-150/15): No se puede modificar ni eliminar un Acta Comunitaria una vez Concertada o Publicada.';
            END IF;
            RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.estado IN ('CONCERTADA', 'PUBLICADA') THEN
                RAISE EXCEPTION 'Violación Forense (Sentencia C-150/15): No se puede modificar ni eliminar un Acta Comunitaria una vez Concertada o Publicada.';
            END IF;
            NEW.actualizado_en = clock_timestamp();
            RETURN NEW;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    "DROP TRIGGER IF EXISTS trg_inmutabilidad_acta ON mesas_trabajo.actas_comunitarias;",
    """
    CREATE TRIGGER trg_inmutabilidad_acta
    BEFORE UPDATE OR DELETE ON mesas_trabajo.actas_comunitarias
    FOR EACH ROW
    EXECUTE FUNCTION mesas_trabajo.prevenir_modificacion_acta_cerrada();
    """,
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TRIGGER IF EXISTS trg_inmutabilidad_acta ON mesas_trabajo.actas_comunitarias;",
    "DROP FUNCTION IF EXISTS mesas_trabajo.prevenir_modificacion_acta_cerrada();",
    "DROP TABLE IF EXISTS mesas_trabajo.actas_comunitarias CASCADE;",
    "DROP TABLE IF EXISTS mesas_trabajo.participantes_mesa CASCADE;",
    "ALTER TABLE mesas_trabajo.mesas DROP COLUMN IF EXISTS sha256_acta;",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
