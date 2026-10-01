"""Apoyos Unicos y Trigger Contador

Revision ID: 0008_apoyos_unicos
Revises: 0007_devolucion_razones
Create Date: 2026-10-01 07:24:50.000000
"""

from alembic import op

revision = "0008_apoyos_unicos"
down_revision = "0007_devolucion_razones"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Tabla de apoyos
    """
    CREATE TABLE IF NOT EXISTS participacion_ciudadana.apoyos_propuestas (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        propuesta_id UUID NOT NULL REFERENCES participacion_ciudadana.propuestas_ciudadanas(id) ON DELETE CASCADE,
        sujeto_id UUID NOT NULL,
        tipo_sujeto VARCHAR(20) NOT NULL,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uq_apoyo_propuesta_sujeto UNIQUE (propuesta_id, sujeto_id),
        CONSTRAINT chk_tipo_sujeto CHECK (tipo_sujeto IN ('usuario', 'sesion_anonima'))
    )
    """,
    # 2. Indices
    "CREATE INDEX IF NOT EXISTS idx_apoyos_propuesta ON participacion_ciudadana.apoyos_propuestas(propuesta_id)",
    "CREATE INDEX IF NOT EXISTS idx_apoyos_sujeto ON participacion_ciudadana.apoyos_propuestas(sujeto_id)",
    # 3. Trigger para actualizar el contador automáticamente
    """
    CREATE OR REPLACE FUNCTION participacion_ciudadana.actualizar_contador_apoyos()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            UPDATE participacion_ciudadana.propuestas_ciudadanas
            SET apoyos_contador = apoyos_contador + 1
            WHERE id = NEW.propuesta_id;
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE participacion_ciudadana.propuestas_ciudadanas
            SET apoyos_contador = apoyos_contador - 1
            WHERE id = OLD.propuesta_id;
            RETURN OLD;
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """,
    """
    CREATE TRIGGER trg_actualizar_contador_apoyos
        AFTER INSERT OR DELETE ON participacion_ciudadana.apoyos_propuestas
        FOR EACH ROW EXECUTE FUNCTION participacion_ciudadana.actualizar_contador_apoyos()
    """,
    # 4. Comentarios
    "COMMENT ON TABLE participacion_ciudadana.apoyos_propuestas IS 'Registro de respaldos únicos (1 ciudadano = 1 voto) a propuestas'",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TRIGGER IF EXISTS trg_actualizar_contador_apoyos ON participacion_ciudadana.apoyos_propuestas",
    "DROP FUNCTION IF EXISTS participacion_ciudadana.actualizar_contador_apoyos",
    "DROP TABLE IF EXISTS participacion_ciudadana.apoyos_propuestas CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
