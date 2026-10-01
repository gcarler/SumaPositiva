"""Esquema y tabla de propuestas ciudadanas con enfoque diferencial y territorio.

Revision ID: 0003_participacion_ciudadana
Revises: 0002_motor_politicas_y_geodatos
Create Date: 2026-10-01 06:12:00.000000
"""

from alembic import op

revision = "0003_participacion_ciudadana"
down_revision = "0002_motor_politicas_y_geodatos"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Esquema
    "CREATE SCHEMA IF NOT EXISTS participacion_ciudadana",
    # 2. Tabla propuestas_ciudadanas
    """
    CREATE TABLE IF NOT EXISTS participacion_ciudadana.propuestas_ciudadanas (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        linea_id UUID NOT NULL REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE RESTRICT,
        dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
        territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
        tipo_aporte VARCHAR(50) NOT NULL DEFAULT 'propuesta',
        titulo VARCHAR(300) NOT NULL,
        descripcion TEXT NOT NULL,
        autor_nombre VARCHAR(150) NOT NULL DEFAULT 'Ciudadano Anónimo',
        es_anonimo BOOLEAN NOT NULL DEFAULT true,
        metadata_enfoque JSONB NOT NULL DEFAULT '{}'::jsonb,
        archivos_adjuntos JSONB NOT NULL DEFAULT '[]'::jsonb,
        apoyos_contador INT NOT NULL DEFAULT 0,
        estado VARCHAR(50) NOT NULL DEFAULT 'publicado',
        activo BOOLEAN NOT NULL DEFAULT true,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_tipo_aporte CHECK (tipo_aporte IN (
            'propuesta', 'observacion', 'alerta_comunitaria', 'anotacion', 'pregunta'
        )),
        CONSTRAINT chk_estado_propuesta CHECK (estado IN (
            'borrador', 'publicado', 'en_revision', 'incorporado', 'rechazado'
        ))
    )
    """,
    # 3. Índices
    "CREATE INDEX IF NOT EXISTS idx_propuestas_linea ON participacion_ciudadana.propuestas_ciudadanas(linea_id)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_dimension ON participacion_ciudadana.propuestas_ciudadanas(dimension_id)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_territorio ON participacion_ciudadana.propuestas_ciudadanas(territorio_id)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_activo ON participacion_ciudadana.propuestas_ciudadanas(activo)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_tipo ON participacion_ciudadana.propuestas_ciudadanas(tipo_aporte)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_metadata_enfoque_gin ON participacion_ciudadana.propuestas_ciudadanas USING GIN (metadata_enfoque)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_titulo_trgm ON participacion_ciudadana.propuestas_ciudadanas USING GIN (titulo gin_trgm_ops)",
    # 4. Triggers de actualización temporal
    "DROP TRIGGER IF EXISTS trg_actualizar_propuestas ON participacion_ciudadana.propuestas_ciudadanas",
    """
    CREATE TRIGGER trg_actualizar_propuestas
        BEFORE UPDATE ON participacion_ciudadana.propuestas_ciudadanas
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    # 5. Comentarios
    "COMMENT ON TABLE participacion_ciudadana.propuestas_ciudadanas IS 'Aportes, propuestas y alertas ciudadanas para la formulación de políticas públicas con enfoque diferencial y anclaje territorial'",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.metadata_enfoque IS 'Metadatos estructurados de enfoque diferencial (etnia, género, ciclo vital, víctimas Ley 1448/11, discapacidad)'",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.activo IS 'Bandera de soporte para soft-delete'",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TABLE IF EXISTS participacion_ciudadana.propuestas_ciudadanas CASCADE",
    "DROP SCHEMA IF EXISTS participacion_ciudadana CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
