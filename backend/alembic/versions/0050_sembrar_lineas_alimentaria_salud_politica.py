"""Sembrar lineas estrategicas para las 3 dimensiones restantes (AUD20-H04 / EDIT-15).

Revision ID: 0050_lineas_alim_salud_pol
Revises: 0049_fuentes_distritales_esp
Create Date: 2026-10-05 15:30:00.000000

Contexto:
En cumplimiento del mandato de integralidad metodológica DNP y el hallazgo AUD20-H04,
se siembran de forma idempotente (ON CONFLICT DO NOTHING) las 3 líneas estratégicas
restantes para las dimensiones de Seguridad Alimentaria, Seguridad en Salud y
Seguridad Política del Distrito de Cartagena de Indias.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = "0050_lineas_alim_salud_pol"
down_revision: Union[str, None] = "0049_fuentes_distritales_esp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LINEAS_RESTANTES = [
    {
        "id": "9e4f5a9e-05a8-5eb5-8e3b-734f19b16b4c",
        "codigo": "LE-05",
        "titulo": "Soberanía Alimentaria, Nutrición Comunitaria y Circuitos Cortos de Abastecimiento",
        "descripcion": (
            "Garantía progresiva del derecho humano a la alimentación, comedores comunitarios, "
            "ollas comunitarias y circuitos cortos de comercialización campesina y pesquera en Cartagena."
        ),
        "problema_abordado": "Inseguridad alimentaria y desnutrición en sectores de pobreza extrema y corregimientos.",
        "objetivo_especifico": "Asegurar el acceso a alimentos nutritivos y fortalecer la economía popular agropecuaria y pesquera.",
        "dimension_codigo": "alimentaria",
        "fallback_dimension_id": "01a0f5dd-532e-7906-90af-31d884eba586",
        "entidad_lider": "Secretaría de Participación y Desarrollo Social",
        "entidades_coresponsables": ["Plan de Emergencia Social Pedro Romero (PES-PR)", "UMATA"],
        "fuentes_financiacion": ["SGP", "RECURSOS_PROPIOS"],
        "costo_estimado": 18500000000.00,
        "orden": 5,
    },
    {
        "id": "5a5dc65c-3f9f-50d4-a78b-1e74a8997a4a",
        "codigo": "LE-06",
        "titulo": "Atención Primaria, Salud Mental Barrial y Reducción del Daño",
        "descripcion": (
            "Fortalecimiento de la salud mental comunitaria, prevención del consumo de sustancias "
            "psicoactivas, reducción del daño y redes barriales de cuidado emocional."
        ),
        "problema_abordado": "Aumento en trastornos de salud mental, consumo problemático no atendido y déficit de centros de escucha barrial.",
        "objetivo_especifico": "Desplegar equipos comunitarios de salud mental y mitigar factores de riesgo psicosocial en jóvenes.",
        "dimension_codigo": "salud",
        "fallback_dimension_id": "01a0f5dd-532e-7910-8a72-9b61f5ad2a24",
        "entidad_lider": "Departamento Administrativo Distrital de Salud (DADIS)",
        "entidades_coresponsables": ["Secretaría de Participación y Desarrollo Social", "ESE Hospital Local Cartagena de Indias"],
        "fuentes_financiacion": ["SGP", "RECURSOS_PROPIOS", "FONSET"],
        "costo_estimado": 22000000000.00,
        "orden": 6,
    },
    {
        "id": "2a5f56b2-6be1-5e8a-8288-75ea7f2f11ae",
        "codigo": "LE-07",
        "titulo": "Transparencia, Cultura de la Legalidad y Garantías para el Liderazgo Social",
        "descripcion": (
            "Protección y garantías para líderes y lideresas sociales, prevención de la corrupción, "
            "rendición de cuentas permanente y pedagogía para el control social."
        ),
        "problema_abordado": "Estigmatización y amenazas contra defensores de DDHH y barreras para la veeduría ciudadana.",
        "objetivo_especifico": "Brindar salvaguardas efectivas a la participación comunitaria y consolidar la transparencia institucional.",
        "dimension_codigo": "politica",
        "fallback_dimension_id": "01a0f5dd-532e-78f9-9b6a-87d6e649c6df",
        "entidad_lider": "Secretaría del Interior y Convivencia Ciudadana",
        "entidades_coresponsables": ["Escuela de Gobierno y Liderazgo", "Instituto Comunal de Cartagena (IDACCC)"],
        "fuentes_financiacion": ["FONSET", "RECURSOS_PROPIOS"],
        "costo_estimado": 9500000000.00,
        "orden": 7,
    },
]


def upgrade() -> None:
    sql_insert = text("""
        INSERT INTO motor_politicas.lineas_estrategicas (
            id, fase_id, dimension_id, codigo, titulo, descripcion,
            problema_abordado, objetivo_especifico,
            costo_estimado, fuentes_financiacion, entidad_lider,
            entidades_coresponsables, orden, activa, metadatos
        ) VALUES (
            CAST(:id AS uuid),
            COALESCE(
                (SELECT id FROM motor_politicas.fases_politica WHERE codigo IN ('FASE_1_DIAGNOSTICO', 'FASE_1') ORDER BY orden ASC LIMIT 1),
                (SELECT id FROM motor_politicas.fases_politica ORDER BY orden ASC LIMIT 1)
            ),
            COALESCE(
                (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = :dimension_codigo LIMIT 1),
                CAST(:fallback_dimension_id AS uuid)
            ),
            :codigo, :titulo, :descripcion,
            :problema_abordado, :objetivo_especifico,
            :costo_estimado, :fuentes_financiacion, :entidad_lider,
            :entidades_coresponsables, :orden, true, '{}'::jsonb
        ) ON CONFLICT (codigo) DO NOTHING;
    """)

    conn = op.get_bind()
    for linea in LINEAS_RESTANTES:
        conn.execute(
            sql_insert,
            {
                "id": linea["id"],
                "codigo": linea["codigo"],
                "titulo": linea["titulo"],
                "descripcion": linea["descripcion"],
                "problema_abordado": linea["problema_abordado"],
                "objetivo_especifico": linea["objetivo_especifico"],
                "dimension_codigo": linea["dimension_codigo"],
                "fallback_dimension_id": linea["fallback_dimension_id"],
                "orden": linea["orden"],
                "entidad_lider": linea["entidad_lider"],
                "entidades_coresponsables": linea["entidades_coresponsables"],
                "fuentes_financiacion": linea["fuentes_financiacion"],
                "costo_estimado": linea["costo_estimado"],
            },
        )


def downgrade() -> None:
    op.execute("""
        DELETE FROM participacion_ciudadana.propuestas_ciudadanas
        WHERE linea_id IN (
            SELECT id FROM motor_politicas.lineas_estrategicas
            WHERE codigo IN ('LE-05', 'LE-06', 'LE-07')
        );
    """)
    op.execute("""
        DELETE FROM motor_politicas.lineas_estrategicas
        WHERE codigo IN ('LE-05', 'LE-06', 'LE-07');
    """)
