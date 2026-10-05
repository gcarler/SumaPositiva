"""sembrar 3 indicadores de impacto 2036 (AUD20-H01)

Revision ID: 0048_indicadores_impacto_2036
Revises: 0047_actores_cartagena_2026
Create Date: 2026-10-05 14:42:00.000000

"""

from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = "0048_indicadores_impacto_2036"
down_revision = "0047_actores_cartagena_2026"
branch_labels = None
depends_on = None

INDICADORES_IMPACTO = [
    {
        "codigo": "IND-IMP-01",
        "nombre": "Índice de Incidencia de Pobreza Multidimensional (IPM)",
        "tipo_indicador": "impacto",
        "linea_codigo": "LE-04",
        "dimension_codigo": "economica",
        "definicion": "Porcentaje de personas u hogares en Cartagena privados de bienes y servicios básicos evaluados a través de las dimensiones de educación, niñez, trabajo, salud y vivienda/servicios (Sentencia T-025 de 2004).",
        "metodo_calculo": "(Población en situación de pobreza multidimensional / Población total de Cartagena) * 100",
        "unidad_medida": "Porcentaje",
        "sentido_esperado": "descendente",
        "periodicidad": "Anual",
        "linea_base_valor": 31.1,
        "linea_base_anio": 2024,
        "meta_cuatrienio": 22.5,
        "meta_anualizada": {"2024": 31.1, "2025": 28.0, "2026": 25.0, "2027": 22.5},
        "valor_actual": 31.1,
        "porcentaje_avance": 0.0,
        "fuente_datos": "DANE - Encuesta Nacional de Calidad de Vida (ECV)",
        "responsable_reporte": "Secretaría de Planeación Distrital / PES-PR",
        "metadatos": {"horizonte": 2036, "meta_2036": 15.0, "enfoque_ged": "Sentencia T-025 de 2004", "tipo": "impacto"},
    },
    {
        "codigo": "IND-IMP-02",
        "nombre": "Tasa de Convivencia Barrial y Desescalamiento de Violencias",
        "tipo_indicador": "impacto",
        "linea_codigo": "LE-02",
        "dimension_codigo": "comunitaria",
        "definicion": "Medición integral de la reducción de homicidios, riñas y fronteras invisibles en sectores críticos de las tres localidades de Cartagena.",
        "metodo_calculo": "Índice ponderado de eventos violentos y lesiones personales por cada 100.000 habitantes en cuadrantes priorizados",
        "unidad_medida": "Puntos",
        "sentido_esperado": "descendente",
        "periodicidad": "Bienal",
        "linea_base_valor": 68.4,
        "linea_base_anio": 2024,
        "meta_cuatrienio": 45.0,
        "meta_anualizada": {"2024": 68.4, "2025": 60.0, "2026": 52.0, "2027": 45.0},
        "valor_actual": 68.4,
        "porcentaje_avance": 0.0,
        "fuente_datos": "Sistema de Información Estadístico, Delincuencial, Contravencional y Operativo (SIEDCO / MECAR / SICC)",
        "responsable_reporte": "Secretaría del Interior y Convivencia Ciudadana (SICC) / Distriseguridad",
        "metadatos": {"horizonte": 2036, "meta_2036": 25.0, "enfoque_ged": "Seguridad Humana Integral", "tipo": "impacto"},
    },
    {
        "codigo": "IND-IMP-03",
        "nombre": "Índice de Resiliencia Climática y Seguridad Ambiental en la Ciénaga de la Virgen",
        "tipo_indicador": "impacto",
        "linea_codigo": "LE-03",
        "dimension_codigo": "ambiental",
        "definicion": "Nivel de recuperación ecoterritorial, mitigación de riesgo de inundación y calidad de vida de las comunidades de borde de la Ciénaga de la Virgen.",
        "metodo_calculo": "Índice sintético de hectáreas de manglar recuperadas, reducción de viviendas en riesgo de anegamiento y calidad de agua",
        "unidad_medida": "Índice 0-100",
        "sentido_esperado": "ascendente",
        "periodicidad": "Bienal",
        "linea_base_valor": 32.0,
        "linea_base_anio": 2024,
        "meta_cuatrienio": 58.0,
        "meta_anualizada": {"2024": 32.0, "2025": 40.0, "2026": 48.0, "2027": 58.0},
        "valor_actual": 32.0,
        "porcentaje_avance": 0.0,
        "fuente_datos": "EPA Cartagena / Cardique / OAGRD / Invemar",
        "responsable_reporte": "Establecimiento Público Ambiental (EPA Cartagena)",
        "metadatos": {"horizonte": 2036, "meta_2036": 85.0, "enfoque_ged": "Justicia Ambiental y Protección Costera", "tipo": "impacto"},
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    insert_sql = sa.text("""
        INSERT INTO indicadores.fichas_tecnicas_indicadores (
            id, codigo, nombre, tipo_indicador, linea_estrategica_id, dimension_id,
            definicion, metodo_calculo, unidad_medida, sentido_esperado, periodicidad,
            linea_base_valor, linea_base_anio, meta_cuatrienio, meta_anualizada,
            valor_actual, porcentaje_avance, fuente_datos, responsable_reporte,
            metadatos, creado_en, actualizado_en
        ) VALUES (
            public.generar_uuid_v7(), :codigo, :nombre, :tipo_indicador,
            (SELECT id FROM motor_politicas.lineas_estrategicas WHERE codigo = :linea_codigo LIMIT 1),
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = :dimension_codigo LIMIT 1),
            :definicion, :metodo_calculo, :unidad_medida, :sentido_esperado, :periodicidad,
            :linea_base_valor, :linea_base_anio, :meta_cuatrienio, CAST(:meta_anualizada AS jsonb),
            :valor_actual, :porcentaje_avance, :fuente_datos, :responsable_reporte,
            CAST(:metadatos AS jsonb), now(), now()
        )
        ON CONFLICT (codigo) DO NOTHING;
    """)

    for ind in INDICADORES_IMPACTO:
        conn.execute(
            insert_sql,
            {
                "codigo": ind["codigo"],
                "nombre": ind["nombre"],
                "tipo_indicador": ind["tipo_indicador"],
                "linea_codigo": ind["linea_codigo"],
                "dimension_codigo": ind["dimension_codigo"],
                "definicion": ind["definicion"],
                "metodo_calculo": ind["metodo_calculo"],
                "unidad_medida": ind["unidad_medida"],
                "sentido_esperado": ind["sentido_esperado"],
                "periodicidad": ind["periodicidad"],
                "linea_base_valor": ind["linea_base_valor"],
                "linea_base_anio": ind["linea_base_anio"],
                "meta_cuatrienio": ind["meta_cuatrienio"],
                "meta_anualizada": json.dumps(ind["meta_anualizada"]),
                "valor_actual": ind["valor_actual"],
                "porcentaje_avance": ind["porcentaje_avance"],
                "fuente_datos": ind["fuente_datos"],
                "responsable_reporte": ind["responsable_reporte"],
                "metadatos": json.dumps(ind["metadatos"]),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    delete_sql = sa.text("""
        DELETE FROM indicadores.fichas_tecnicas_indicadores
        WHERE codigo IN ('IND-IMP-01', 'IND-IMP-02', 'IND-IMP-03');
    """)
    conn.execute(delete_sql)
