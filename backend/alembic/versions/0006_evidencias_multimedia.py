"""Evidencias multimedia y fotográficas seguras con despojo EXIF (Ley 1581/12).

Revision ID: 0006_evidencias_multimedia
Revises: 0005_control_acceso_y_roles
Create Date: 2026-10-01 07:02:00.000000
"""

from alembic import op

revision = "0006_evidencias_multimedia"
down_revision = "0005_control_acceso_y_roles"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Tabla evidencias_multimedia
    """
    CREATE TABLE IF NOT EXISTS participacion_ciudadana.evidencias_multimedia (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        propuesta_id UUID REFERENCES participacion_ciudadana.propuestas_ciudadanas(id) ON DELETE SET NULL,
        autor_sujeto_id UUID,
        nombre_archivo_original VARCHAR(255) NOT NULL,
        nombre_archivo_seguro VARCHAR(255) NOT NULL,
        ruta_almacenamiento VARCHAR(500) NOT NULL,
        tipo_mime VARCHAR(50) NOT NULL,
        tamano_bytes INTEGER NOT NULL,
        hash_sha256 VARCHAR(64) NOT NULL,
        exif_despojado BOOLEAN NOT NULL DEFAULT true,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_evidencias_tipo_mime CHECK (tipo_mime IN ('image/jpeg', 'image/png', 'image/webp'))
    )
    """,
    # 2. Índices de optimización y trazabilidad
    "CREATE INDEX IF NOT EXISTS idx_evidencias_propuesta ON participacion_ciudadana.evidencias_multimedia(propuesta_id)",
    "CREATE INDEX IF NOT EXISTS idx_evidencias_autor ON participacion_ciudadana.evidencias_multimedia(autor_sujeto_id)",
    "CREATE INDEX IF NOT EXISTS idx_evidencias_hash ON participacion_ciudadana.evidencias_multimedia(hash_sha256)",
    # 3. Comentarios periciales y de protección de líderes
    "COMMENT ON TABLE participacion_ciudadana.evidencias_multimedia IS 'Registro pericial de evidencias fotográficas comunitarias con despojo estricto de metadatos EXIF y coordenadas GPS (Ley 1581/12)'",
    "COMMENT ON COLUMN participacion_ciudadana.evidencias_multimedia.exif_despojado IS 'Bandera de verificación pericial de despojo de metadatos sensibles'",
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TABLE IF EXISTS participacion_ciudadana.evidencias_multimedia CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
