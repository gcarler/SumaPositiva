"""sembrar 3 fuentes distritales con destinacion especifica (AUD20-H03)

Revision ID: 0049_fuentes_distritales_esp
Revises: 0048_indicadores_impacto_2036
Create Date: 2026-10-05 14:44:00.000000

"""

import json

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0049_fuentes_distritales_esp"
down_revision = "0048_indicadores_impacto_2036"
branch_labels = None
depends_on = None

FUENTES_DISTRITALES = [
    {
        "codigo": "FTE-PRO-CULTURA",
        "nombre": "Estampilla Pro-Cultura",
        "tipo_fuente": "TRIBUTARIA_DESTINACION_ESPECIFICA",
        "base_legal": "Ley 397 de 1997, Ley 666 de 2001",
        "descripcion": "Recursos tributarios distritales con destinación específica para la promoción artística, infraestructura cultural y salvaguarda del patrimonio material e inmaterial en Cartagena.",
        "metadatos": {
            "sector": "cultura_patrimonio",
            "administrador": "Instituto de Patrimonio y Cultura de Cartagena (IPCC)",
            "destinacion": "Seguridad comunitaria y convivencia ciudadana a través del arte y la memoria",
        },
    },
    {
        "codigo": "FTE-PRO-ADULTO",
        "nombre": "Estampilla Pro-Adulto Mayor",
        "tipo_fuente": "TRIBUTARIA_DESTINACION_ESPECIFICA",
        "base_legal": "Ley 1276 de 2009",
        "descripcion": "Recursos tributarios distritales con destinación específica para la financiación y sostenimiento de los Centros Vida y Centros de Bienestar del Anciano en el Distrito de Cartagena.",
        "metadatos": {
            "sector": "desarrollo_social",
            "administrador": "Secretaría de Participación y Desarrollo Social",
            "destinacion": "Atención integral, nutrición y cuidado de adultos mayores en extrema vulnerabilidad",
        },
    },
    {
        "codigo": "FTE-SOBRETASA-GAS",
        "nombre": "Sobretasa a la Gasolina",
        "tipo_fuente": "TRIBUTARIA_DESTINACION_ESPECIFICA",
        "base_legal": "Ley 488 de 1998, Ley 788 de 2002",
        "descripcion": "Renta territorial con destinación específica para la construcción, mantenimiento y rehabilitación de la malla vial urbana, corredores de transporte y seguridad vial.",
        "metadatos": {
            "sector": "infraestructura_movilidad",
            "administrador": "Secretaría de Infraestructura / DATT",
            "destinacion": "Movilidad segura, accesibilidad a barrios populares y pacificación del tránsito",
        },
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    insert_sql = sa.text("""
        INSERT INTO presupuesto.fuentes_financiacion (
            id, codigo, nombre, tipo_fuente, base_legal, descripcion,
            activa, metadatos, creado_en, actualizado_en
        ) VALUES (
            public.generar_uuid_v7(), :codigo, :nombre, :tipo_fuente, :base_legal, :descripcion,
            true, CAST(:metadatos AS jsonb), now(), now()
        )
        ON CONFLICT (codigo) DO NOTHING;
    """)

    for fte in FUENTES_DISTRITALES:
        conn.execute(
            insert_sql,
            {
                "codigo": fte["codigo"],
                "nombre": fte["nombre"],
                "tipo_fuente": fte["tipo_fuente"],
                "base_legal": fte["base_legal"],
                "descripcion": fte["descripcion"],
                "metadatos": json.dumps(fte["metadatos"]),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    delete_sql = sa.text("""
        DELETE FROM presupuesto.fuentes_financiacion
        WHERE codigo IN ('FTE-PRO-CULTURA', 'FTE-PRO-ADULTO', 'FTE-SOBRETASA-GAS');
    """)
    conn.execute(delete_sql)
