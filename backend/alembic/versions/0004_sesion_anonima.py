"""Sesion anonima con firma digital y trazabilidad segun Ley 1581 de 2012.

Revision ID: 0004_sesion_anonima
Revises: 0003_participacion_ciudadana
Create Date: 2026-10-01 06:21:00.000000
"""

from alembic import op

revision = "0004_sesion_anonima"
down_revision = "0003_participacion_ciudadana"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Tabla de sesiones anonimas
    """
    CREATE TABLE IF NOT EXISTS participacion_ciudadana.sesiones_anonimas (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        huella_hash VARCHAR(64) NOT NULL,
        expira_en TIMESTAMPTZ NOT NULL,
        activa BOOLEAN NOT NULL DEFAULT true,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_sesiones_huella ON participacion_ciudadana.sesiones_anonimas(huella_hash)",
    "CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON participacion_ciudadana.sesiones_anonimas(expira_en)",
    # 2. Agregar trazabilidad a propuestas_ciudadanas
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas ADD COLUMN IF NOT EXISTS sesion_id UUID",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas ADD COLUMN IF NOT EXISTS huella_hash VARCHAR(64)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_sesion ON participacion_ciudadana.propuestas_ciudadanas(sesion_id)",
    "CREATE INDEX IF NOT EXISTS idx_propuestas_huella ON participacion_ciudadana.propuestas_ciudadanas(huella_hash)",
    # 3. Comentarios de cumplimiento Ley 1581 de 2012
    "COMMENT ON TABLE participacion_ciudadana.sesiones_anonimas IS 'Registro y auditoria de sesiones civicas anonimas con firma digital'",
    "COMMENT ON COLUMN participacion_ciudadana.sesiones_anonimas.huella_hash IS 'Hash HMAC-SHA256 con salt de IP conforme a Ley 1581/12 (Habeas Data)'",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.sesion_id IS 'Identificador UUIDv7 de la sesion anonima firmada'",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.huella_hash IS 'Huella no reversible para prevencion de abuso y trazabilidad forense'",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP INDEX IF EXISTS participacion_ciudadana.idx_propuestas_huella",
    "DROP INDEX IF EXISTS participacion_ciudadana.idx_propuestas_sesion",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas DROP COLUMN IF EXISTS huella_hash",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas DROP COLUMN IF EXISTS sesion_id",
    "DROP TABLE IF EXISTS participacion_ciudadana.sesiones_anonimas CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
