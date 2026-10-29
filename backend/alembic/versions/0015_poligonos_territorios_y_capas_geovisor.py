"""Poligonos de territorios y capas del geovisor.

Revision ID: 0015_poligonos_geovisor
Revises: 0014_concurrencia_optimista
Create Date: 2026-10-01 13:58:00.000000
"""

from alembic import op

revision = "0015_poligonos_geovisor"
down_revision = "0014_concurrencia_optimista"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Crear tabla geodatos.geometrias_capas y sus índices GiST
    op.execute("""
        CREATE TABLE IF NOT EXISTS geodatos.geometrias_capas (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            categoria VARCHAR(100) NOT NULL,
            nombre VARCHAR(250) NOT NULL,
            descripcion TEXT,
            tipo_geometria VARCHAR(50) NOT NULL,
            geometria geometry(Geometry, 4326) NOT NULL,
            metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_geometrias_capas_gist ON geodatos.geometrias_capas USING GIST (geometria);"
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_geometrias_capas_categoria ON geodatos.geometrias_capas (categoria);")

    # 2. Poblar territorios con MultiPolígonos (se insertan datos sintéticos válidos para la región de Cartagena)
    # En un entorno real, estos provienen de la Infraestructura de Datos Espaciales (IDE) de Cartagena.
    op.execute("""
        UPDATE geodatos.territorios 
        SET geometria = ST_Multi(ST_GeomFromText('POLYGON((-75.55 10.45, -75.50 10.45, -75.50 10.40, -75.55 10.40, -75.55 10.45))', 4326)),
            centroide = ST_GeomFromText('POINT(-75.525 10.425)', 4326)
        WHERE geometria IS NULL;
    """)

    # 3. Poblar capas temáticas del geovisor
    op.execute("""
        INSERT INTO geodatos.geometrias_capas (categoria, nombre, descripcion, tipo_geometria, geometria)
        VALUES 
        ('ALERTA_SAT', 'Alerta SAT Centro', 'Alerta temprana de conflictividad', 'POINT', ST_GeomFromText('POINT(-75.53 10.43)', 4326)),
        ('RECURSO_HIDRICO', 'Ciénaga de la Virgen', 'Cuerpo de agua protegido', 'POLYGON', ST_GeomFromText('POLYGON((-75.50 10.45, -75.48 10.45, -75.48 10.43, -75.50 10.43, -75.50 10.45))', 4326)),
        ('ZONA_FONSET', 'Proyecto FONSET Zona 1', 'Intervención integral de seguridad', 'POLYGON', ST_GeomFromText('POLYGON((-75.52 10.40, -75.51 10.40, -75.51 10.39, -75.52 10.39, -75.52 10.40))', 4326)),
        ('CONFLICTIVIDAD_ICS', 'Zona de Conflicto Getsemaní', 'Alta conflictividad por gentrificación', 'POLYGON', ST_GeomFromText('POLYGON((-75.545 10.425, -75.540 10.425, -75.540 10.420, -75.545 10.420, -75.545 10.425))', 4326));
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS geodatos.geometrias_capas CASCADE;")
    op.execute("UPDATE geodatos.territorios SET geometria = NULL, centroide = NULL;")
