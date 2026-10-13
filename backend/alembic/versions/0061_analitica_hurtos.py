"""Ingesta y visualización en geovisor de capas analíticas de hurtos 2018-2026.

Tarea: [GEO-HURTOS-01]
Plan Maestro: bridge/01_tarea_activa.md

Revision ID: 0061_analitica_hurtos
Revises: 0060_ambito_territorial
Create Date: 2026-10-13 16:30:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0061_analitica_hurtos"
down_revision: Union[str, Sequence[str], None] = "0060_ambito_territorial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabla de polígonos base analíticos (Urbano y Rural re-proyectados a EPSG:4326)
    op.execute("""
        CREATE TABLE IF NOT EXISTS geodatos.poligonos_analitica_hurtos (
            id INTEGER PRIMARY KEY,
            codigo VARCHAR(50) NOT NULL UNIQUE,
            nombre VARCHAR(100) NOT NULL,
            zona VARCHAR(20) NOT NULL,
            geometria geometry(MultiPolygon, 4326) NOT NULL,
            geometria_simplificada geometry(MultiPolygon, 4326),
            area_km2 DOUBLE PRECISION,
            centroide geometry(Point, 4326),
            metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_poligonos_hurtos_gist ON geodatos.poligonos_analitica_hurtos USING GIST (geometria);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_poligonos_hurtos_simp_gist ON geodatos.poligonos_analitica_hurtos USING GIST (geometria_simplificada);"
    )

    # 2. Tabla analítica estructurada de estadísticas de hurtos 2018-2026
    op.execute("""
        CREATE TABLE IF NOT EXISTS geodatos.estadisticas_hurtos (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            delito VARCHAR(50) NOT NULL,
            anio INTEGER NOT NULL,
            mes VARCHAR(20) NOT NULL,
            zona VARCHAR(20) NOT NULL,
            poligono_id INTEGER NOT NULL REFERENCES geodatos.poligonos_analitica_hurtos(id) ON DELETE CASCADE,
            armas_medios VARCHAR(100) NOT NULL,
            clase_sitio VARCHAR(100) NOT NULL,
            dia_semana VARCHAR(20) NOT NULL,
            cantidad INTEGER NOT NULL DEFAULT 1,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hurtos_delito_anio ON geodatos.estadisticas_hurtos (delito, anio);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hurtos_anio_mes ON geodatos.estadisticas_hurtos (anio, mes);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hurtos_zona ON geodatos.estadisticas_hurtos (zona);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hurtos_poligono_id ON geodatos.estadisticas_hurtos (poligono_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_hurtos_delito_zona_anio ON geodatos.estadisticas_hurtos (delito, zona, anio);"
    )

    # 3. Registrar capas temáticas analíticas en catálogo geodatos.capas_geovisor
    op.execute("""
        INSERT INTO geodatos.capas_geovisor (codigo, nombre, categoria, descripcion, tipo_geometria, color_estilo, activa, metadatos)
        VALUES
          ('HURTO_MOTOCICLETAS', 'Hurto a Motocicletas (2018-2026)', 'Seguridad y Convivencia', 'Estadísticas georreferenciadas de hurto a motocicletas en Cartagena 2018-2026', 'Poligonos', '#f97316', true, '{"fuente": "Policía Nacional / SIEDCO", "cobertura": "Distrito de Cartagena"}'::jsonb),
          ('HURTO_RESIDENCIAS', 'Hurto a Residencias (2018-2026)', 'Seguridad y Convivencia', 'Estadísticas georreferenciadas de hurto a residencias en Cartagena 2018-2026', 'Poligonos', '#8b5cf6', true, '{"fuente": "Policía Nacional / SIEDCO", "cobertura": "Distrito de Cartagena"}'::jsonb),
          ('HURTO_COMERCIO', 'Hurto a Comercio (2018-2026)', 'Seguridad y Convivencia', 'Estadísticas georreferenciadas de hurto a establecimientos de comercio en Cartagena 2018-2026', 'Poligonos', '#06b6d4', true, '{"fuente": "Policía Nacional / SIEDCO", "cobertura": "Distrito de Cartagena"}'::jsonb)
        ON CONFLICT (codigo) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          descripcion = EXCLUDED.descripcion,
          activa = true;
    """)


def downgrade() -> None:
    op.execute("DELETE FROM geodatos.capas_geovisor WHERE codigo IN ('HURTO_MOTOCICLETAS', 'HURTO_RESIDENCIAS', 'HURTO_COMERCIO');")
    op.execute("DROP TABLE IF EXISTS geodatos.estadisticas_hurtos CASCADE;")
    op.execute("DROP TABLE IF EXISTS geodatos.poligonos_analitica_hurtos CASCADE;")
