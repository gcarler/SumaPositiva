"""Devolucion de Razones Motivadas C-150 de 2015 y Auditoria.

Revision ID: 0007_devolucion_razones
Revises: 0006_evidencias_multimedia
Create Date: 2026-10-01 07:15:00.000000
"""

from alembic import op

revision = "0007_devolucion_razones"
down_revision = "0006_evidencias_multimedia"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Esquema
    "CREATE SCHEMA IF NOT EXISTS auditoria",
    # 2. Tabla auditoria.registros_auditoria
    """
    CREATE TABLE IF NOT EXISTS auditoria.registros_auditoria (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        tabla_afectada VARCHAR(100) NOT NULL,
        registro_id UUID NOT NULL,
        accion VARCHAR(50) NOT NULL,
        usuario_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE RESTRICT,
        causal VARCHAR(50) NOT NULL,
        justificacion_motivada TEXT NOT NULL,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_causal_devolucion CHECK (causal IN ('tecnica', 'juridica', 'presupuestal'))
    )
    """,
    # 3. Indices
    "CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro ON auditoria.registros_auditoria(tabla_afectada, registro_id)",
    "CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria.registros_auditoria(accion)",
    # 4. Trigger de inmutabilidad (Append-only)
    """
    CREATE OR REPLACE FUNCTION auditoria.prevenir_modificacion_auditoria()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'El registro de auditoría es inmutable por disposición de control forense.';
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """,
    """
    CREATE TRIGGER trg_inmutabilidad_auditoria
        BEFORE UPDATE OR DELETE ON auditoria.registros_auditoria
        FOR EACH ROW EXECUTE FUNCTION auditoria.prevenir_modificacion_auditoria()
    """,
    # 5. Comentarios
    "COMMENT ON TABLE auditoria.registros_auditoria IS 'Log de auditoría forense inmutable y registro de razones motivadas (C-150/15)'",
    "COMMENT ON COLUMN auditoria.registros_auditoria.causal IS 'Causales constitucionales de devolución: tecnica, juridica, presupuestal'",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TRIGGER IF EXISTS trg_inmutabilidad_auditoria ON auditoria.registros_auditoria",
    "DROP FUNCTION IF EXISTS auditoria.prevenir_modificacion_auditoria",
    "DROP TABLE IF EXISTS auditoria.registros_auditoria CASCADE",
    "DROP SCHEMA IF EXISTS auditoria CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
