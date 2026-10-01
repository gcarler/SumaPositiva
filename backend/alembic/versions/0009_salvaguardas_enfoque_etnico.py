"""Salvaguardas enfoque etnico y consulta previa

Revision ID: 0009_salvaguardas_enfoque
Revises: 0008_apoyos_unicos
Create Date: 2026-10-01 07:35:15.000000
"""

from alembic import op

revision = "0009_salvaguardas_enfoque"
down_revision = "0008_apoyos_unicos"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # Agregar columnas a propuestas_ciudadanas
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas ADD COLUMN IF NOT EXISTS es_territorio_etnico BOOLEAN NOT NULL DEFAULT false;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas ADD COLUMN IF NOT EXISTS requiere_consulta_previa BOOLEAN NOT NULL DEFAULT false;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas ADD COLUMN IF NOT EXISTS ruta_etnica_diferenciada BOOLEAN NOT NULL DEFAULT false;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas ADD COLUMN IF NOT EXISTS consejo_comunitario VARCHAR(250);",
    # Agregar indices
    "CREATE INDEX IF NOT EXISTS idx_prop_territorio_etnico ON participacion_ciudadana.propuestas_ciudadanas(es_territorio_etnico) WHERE es_territorio_etnico = true;",
    "CREATE INDEX IF NOT EXISTS idx_prop_consulta_previa ON participacion_ciudadana.propuestas_ciudadanas(requiere_consulta_previa) WHERE requiere_consulta_previa = true;",
    # Comentarios
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.es_territorio_etnico IS 'Indica si la propuesta afecta o se origina en un resguardo indigena o consejo comunitario afro (Convenio 169 OIT)';",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.requiere_consulta_previa IS 'Bandera forense que previene la implementacion publica hasta no agotar la ruta de consulta previa';",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.ruta_etnica_diferenciada IS 'Activa procesos especiales de facilitacion linguistica y cultural';",
    "COMMENT ON COLUMN participacion_ciudadana.propuestas_ciudadanas.consejo_comunitario IS 'Nombre oficial del consejo u organizacion base territorial';",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP INDEX IF EXISTS participacion_ciudadana.idx_prop_consulta_previa;",
    "DROP INDEX IF EXISTS participacion_ciudadana.idx_prop_territorio_etnico;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas DROP COLUMN IF EXISTS consejo_comunitario;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas DROP COLUMN IF EXISTS ruta_etnica_diferenciada;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas DROP COLUMN IF EXISTS requiere_consulta_previa;",
    "ALTER TABLE participacion_ciudadana.propuestas_ciudadanas DROP COLUMN IF EXISTS es_territorio_etnico;",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
