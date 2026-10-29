"""Tabla de anexos y archivos adjuntos para actividades de proyectos.

Revision ID: 0090_anexos_actividades
Revises: 0089_fechas_mesas_por_definir
Create Date: 2026-10-29
"""

from alembic import op

revision = "0090_anexos_actividades"
down_revision = "0089_fechas_mesas_por_definir"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("""
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.actividades_anexos (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            actividad_id VARCHAR(120) NOT NULL,
            modulo_dueno VARCHAR(50) NOT NULL,
            recurso_id VARCHAR(100) NOT NULL,
            nombre_archivo_original VARCHAR(255) NOT NULL,
            nombre_archivo_seguro VARCHAR(255) NOT NULL,
            ruta_almacenamiento VARCHAR(500) NOT NULL,
            tipo_mime VARCHAR(100) NOT NULL,
            tamano_bytes INTEGER NOT NULL,
            hash_sha256 VARCHAR(64) NOT NULL,
            descripcion TEXT,
            subido_por_sujeto_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
            subido_por_nombre VARCHAR(150),
            creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
            eliminado_en TIMESTAMP WITH TIME ZONE
        );
    """)

    bind.exec_driver_sql("""
        CREATE INDEX IF NOT EXISTS idx_actividades_anexos_actividad
        ON participacion_ciudadana.actividades_anexos (actividad_id)
        WHERE eliminado_en IS NULL;
    """)

    bind.exec_driver_sql("""
        CREATE INDEX IF NOT EXISTS idx_actividades_anexos_modulo_recurso
        ON participacion_ciudadana.actividades_anexos (modulo_dueno, recurso_id)
        WHERE eliminado_en IS NULL;
    """)


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("DROP TABLE IF EXISTS participacion_ciudadana.actividades_anexos CASCADE;")
