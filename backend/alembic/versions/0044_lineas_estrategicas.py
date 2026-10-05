"""Sembrado canónico e idempotente de líneas estratégicas de Cartagena (H-09 / EDIT-13).

Revision ID: 0044_semillero_lineas_estrategicas_canonicas
Revises: 0043_modulo_banco_alternativas
Create Date: 2026-10-05 04:20:00.000000

Contexto:
En cumplimiento del mandato de alineación metodológica DNP y el hallazgo H-09 de AUD-19,
se siembran de forma idempotente (ON CONFLICT DO NOTHING) las 4 líneas estratégicas
canónicas del Distrito de Cartagena de Indias, resolviendo foreign keys dinámicas
hacia motor_politicas.fases_politica y motor_politicas.dimensiones_seguridad_humana.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = "0044_lineas_estrategicas"
down_revision: Union[str, None] = "0043_modulo_banco_alternativas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LINEAS_CANONICAS = [
    {
        "id": "7132df1a-f44e-579d-86d7-a9e9c1c6cafd",
        "codigo": "LE-01",
        "titulo": "Prevención de ESCNNA y Protección Integral de Niñez",
        "descripcion": (
            "Diagnóstico y caracterización de riesgos frente a la explotación sexual "
            "comercial de niñas, niños y adolescentes en corredores turísticos, playas y entornos escolares."
        ),
        "dimension_codigo": "personal",
        "orden": 1,
        "entidad_lider": "Secretaría del Interior y Convivencia Ciudadana",
        "fuentes_financiacion": ["FONSET"],
    },
    {
        "id": "5561f032-2a42-529e-a4b9-235d44b0fffe",
        "codigo": "LE-02",
        "titulo": "Convivencia Comunitaria y Transformación de Fronteras Invisibles",
        "descripcion": (
            "Identificación de conflictividades armadas, enfrentamientos entre jóvenes de sectores "
            "rivales y barreras invisibles en barrios de las Localidades 2 y 3."
        ),
        "dimension_codigo": "comunitaria",
        "orden": 2,
        "entidad_lider": "Secretaría del Interior y Convivencia Ciudadana",
        "fuentes_financiacion": ["FONSET"],
    },
    {
        "id": "c0aed8ac-cf87-5113-9104-2b08b45c7808",
        "codigo": "LE-03",
        "titulo": "Seguridad Ambiental y Resiliencia en la Ciénaga de la Virgen",
        "descripcion": (
            "Evaluación del impacto del relleno de manglares, vertimientos ilegales de aguas "
            "residuales y vulnerabilidad ante inundaciones pluviales y de marea."
        ),
        "dimension_codigo": "ambiental",
        "orden": 3,
        "entidad_lider": "Secretaría de Infraestructura / EPA Cartagena",
        "fuentes_financiacion": ["SGR", "ICLD"],
    },
    {
        "id": "f3869b1b-cb81-5186-8f18-d5bad2d15125",
        "codigo": "LE-04",
        "titulo": "Seguridad Económica, Inclusión Productiva e Informalidad",
        "descripcion": (
            "Caracterización del empleo informal, extorsión ('gota a gota') en el Mercado de "
            "Bazurto y alternativas económicas sostenibles para comunidades vulnerables."
        ),
        "dimension_codigo": "economica",
        "orden": 4,
        "entidad_lider": "Secretaría de Hacienda / Secretaría de Participación",
        "fuentes_financiacion": ["SGP", "ICLD"],
    },
]


def upgrade() -> None:
    # 1. Asegurar restricción única por código para habilitar ON CONFLICT DO NOTHING
    op.create_unique_constraint(
        "uq_lineas_estrategicas_codigo",
        "lineas_estrategicas",
        ["codigo"],
        schema="motor_politicas",
    )

    # 2. Inserción idempotente de las líneas canónicas con resolución de FKs
    sql_insert = text("""
        INSERT INTO motor_politicas.lineas_estrategicas (
            id, fase_id, dimension_id, codigo, titulo, descripcion,
            costo_estimado, fuentes_financiacion, entidad_lider,
            entidades_coresponsables, orden, activa, metadatos
        ) VALUES (
            CAST(:id AS uuid),
            (SELECT id FROM motor_politicas.fases_politica WHERE codigo IN ('FASE_1_DIAGNOSTICO', 'FASE_1') ORDER BY orden ASC LIMIT 1),
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = :dimension_codigo LIMIT 1),
            :codigo, :titulo, :descripcion,
            0.00, :fuentes_financiacion, :entidad_lider,
            ARRAY[]::text[], :orden, true, '{}'::jsonb
        ) ON CONFLICT (codigo) DO NOTHING;
    """)

    conn = op.get_bind()
    for linea in LINEAS_CANONICAS:
        conn.execute(
            sql_insert,
            {
                "id": linea["id"],
                "codigo": linea["codigo"],
                "titulo": linea["titulo"],
                "descripcion": linea["descripcion"],
                "dimension_codigo": linea["dimension_codigo"],
                "orden": linea["orden"],
                "entidad_lider": linea["entidad_lider"],
                "fuentes_financiacion": linea["fuentes_financiacion"],
            },
        )

    # 3. Enlazar banco_alternativas preexistentes con las líneas canónicas sembradas
    op.execute("""
        UPDATE motor_politicas.banco_alternativas b
        SET linea_estrategica_id = l.id
        FROM motor_politicas.lineas_estrategicas l
        WHERE b.linea_estrategica_codigo = l.codigo
          AND b.linea_estrategica_id IS NULL;
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM participacion_ciudadana.propuestas_ciudadanas
        WHERE linea_id IN (
            SELECT id FROM motor_politicas.lineas_estrategicas
            WHERE codigo IN ('LE-01', 'LE-02', 'LE-03', 'LE-04')
        );
    """)
    op.execute("""
        UPDATE motor_politicas.banco_alternativas
        SET linea_estrategica_id = NULL
        WHERE linea_estrategica_codigo IN ('LE-01', 'LE-02', 'LE-03', 'LE-04');
    """)
    op.execute("""
        DELETE FROM motor_politicas.lineas_estrategicas
        WHERE codigo IN ('LE-01', 'LE-02', 'LE-03', 'LE-04');
    """)
    op.drop_constraint(
        "uq_lineas_estrategicas_codigo",
        "lineas_estrategicas",
        schema="motor_politicas",
        type_="unique",
    )
