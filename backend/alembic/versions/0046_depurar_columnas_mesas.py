"""Depuracion de 14 columnas legadas en mesas_trabajo.mesas (H-07 / EDIT-13).

Revision ID: 0046_depurar_columnas_mesas
Revises: 0045_agendas_mesa_id
Create Date: 2026-10-05 04:50:00.000000

Contexto:
Depuracion controlada de 14 columnas legadas remanentes del esquema inicial
(04_mesas_trabajo_360.sql) no modeladas en el modelo canonico SQLAlchemy de Mesa
ni presentes en polis_test.

Inventario de las 14 columnas:
1. descripcion (text, 0 no nulos): sin uso.
2. coordenadas (geometry(Point,4326), 33 no nulos): preservadas en metadatos->coordenadas.
3. dimension_principal_id (uuid, 33 no nulos): 100% redundante con dimension_id.
4. enfoque_poblacional (varchar(50), 33 no nulos): preservado en metadatos->enfoque_poblacional.
5. es_consulta_previa (boolean, 33 no nulos): preservado en metadatos->es_consulta_previa.
6. enlace_streaming (varchar(255), 0 no nulos): sin uso.
7. aforo_presencial (integer, 33 no nulos): 100% redundante con aforo_maximo.
8. facilitador_responsable (varchar(150), 0 no nulos): sin uso.
9. relator_comunitario (varchar(150), 0 no nulos): sin uso.
10. total_asistentes_presenciales (integer, 33 no nulos): 100% valores en 0.
11. total_asistentes_digitales (integer, 33 no nulos): 100% valores en 0.
12. total_propuestas_producidas (integer, 33 no nulos): 100% valores en 0.
13. acta_pdf_url (varchar(255), 0 no nulos): sin uso.
14. metadata (jsonb, 33 no nulos): 100% '{}' redundante con metadatos.

Salvaguarda pericial (Regla H-07):
Antes de remover las columnas fisicas, los datos reales no redundantes
(coordenadas espaciales, enfoque poblacional y salvaguarda de consulta previa)
se migran al campo canonico JSONB `metadatos`, garantizando cero perdida de informacion.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0046_depurar_columnas_mesas"
down_revision: str | None = "0045_agendas_mesa_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Paso 1: Salvaguarda y migracion de datos a metadatos JSONB (solo si las columnas existen)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'mesas_trabajo' AND table_name = 'mesas' AND column_name = 'enfoque_poblacional'
            ) THEN
                UPDATE mesas_trabajo.mesas
                SET metadatos = COALESCE(metadatos, '{}'::jsonb) || jsonb_build_object(
                    'enfoque_poblacional', enfoque_poblacional,
                    'es_consulta_previa', es_consulta_previa,
                    'coordenadas', CASE 
                        WHEN coordenadas IS NOT NULL THEN jsonb_build_object(
                            'longitud', ST_X(coordenadas),
                            'latitud', ST_Y(coordenadas)
                        )
                        ELSE NULL 
                    END
                )
                WHERE enfoque_poblacional IS NOT NULL 
                   OR es_consulta_previa IS NOT NULL 
                   OR coordenadas IS NOT NULL;
            END IF;
        END $$;
        """
    )

    # Paso 2: Eliminar indices sobre columnas legadas si existen
    op.execute("DROP INDEX IF EXISTS mesas_trabajo.idx_mesas_geo_gist;")
    op.execute("DROP INDEX IF EXISTS mesas_trabajo.idx_mesas_dimension;")

    # Paso 3: Eliminar llave foranea redundante si existe
    op.execute(
        """
        ALTER TABLE mesas_trabajo.mesas 
        DROP CONSTRAINT IF EXISTS mesas_dimension_principal_id_fkey;
        """
    )

    # Paso 4: Eliminar las 14 columnas legadas si existen
    columnas_a_eliminar = [
        "descripcion",
        "coordenadas",
        "dimension_principal_id",
        "enfoque_poblacional",
        "es_consulta_previa",
        "enlace_streaming",
        "aforo_presencial",
        "facilitador_responsable",
        "relator_comunitario",
        "total_asistentes_presenciales",
        "total_asistentes_digitales",
        "total_propuestas_producidas",
        "acta_pdf_url",
        "metadata",
    ]

    for col in columnas_a_eliminar:
        op.execute(f"ALTER TABLE mesas_trabajo.mesas DROP COLUMN IF EXISTS {col};")


def downgrade() -> None:
    # Paso 1: Recrear las 14 columnas legadas si no existen
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS descripcion TEXT;")
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS coordenadas geometry(Point, 4326);")
    op.execute(
        "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS dimension_principal_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL;"
    )
    op.execute(
        "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS enfoque_poblacional VARCHAR(50) DEFAULT 'GENERAL';"
    )
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS es_consulta_previa BOOLEAN DEFAULT false;")
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS enlace_streaming VARCHAR(255);")
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS aforo_presencial INTEGER DEFAULT 150;")
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS facilitador_responsable VARCHAR(150);")
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS relator_comunitario VARCHAR(150);")
    op.execute(
        "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS total_asistentes_presenciales INTEGER DEFAULT 0;"
    )
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS total_asistentes_digitales INTEGER DEFAULT 0;")
    op.execute(
        "ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS total_propuestas_producidas INTEGER DEFAULT 0;"
    )
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS acta_pdf_url VARCHAR(255);")
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;")

    # Paso 2: Recrear indices
    op.execute("CREATE INDEX IF NOT EXISTS idx_mesas_geo_gist ON mesas_trabajo.mesas USING gist (coordenadas);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mesas_dimension ON mesas_trabajo.mesas (dimension_principal_id);")

    # Paso 3: Rehidratar datos desde metadatos JSONB hacia columnas legadas
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'mesas_trabajo' AND table_name = 'mesas' AND column_name = 'enfoque_poblacional'
            ) THEN
                UPDATE mesas_trabajo.mesas
                SET enfoque_poblacional = COALESCE(metadatos->>'enfoque_poblacional', 'GENERAL'),
                    es_consulta_previa = COALESCE((metadatos->>'es_consulta_previa')::boolean, false),
                    coordenadas = CASE 
                        WHEN metadatos ? 'coordenadas' AND metadatos->'coordenadas'->>'longitud' IS NOT NULL THEN
                            ST_SetSRID(ST_MakePoint(
                                (metadatos->'coordenadas'->>'longitud')::double precision,
                                (metadatos->'coordenadas'->>'latitud')::double precision
                            ), 4326)
                        ELSE NULL
                    END,
                    dimension_principal_id = dimension_id,
                    aforo_presencial = aforo_maximo,
                    metadata = metadatos;
            END IF;
        END $$;
        """
    )
