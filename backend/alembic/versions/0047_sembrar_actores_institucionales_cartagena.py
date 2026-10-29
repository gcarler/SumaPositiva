"""sembrar 17 actores institucionales cartagena 2026

Revision ID: 0047_actores_cartagena_2026
Revises: 0046_depurar_columnas_mesas
Create Date: 2026-10-05 14:40:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0047_actores_cartagena_2026"
down_revision = "0046_depurar_columnas_mesas"
branch_labels = None
depends_on = None

ACTORES_INSTITUCIONALES = [
    {
        "codigo": "ACT-SICC",
        "nombre": "Secretaría del Interior y Convivencia Ciudadana (SICC)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["personal", "comunitaria"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Despacho Institucional SICC"},
        "expectativas_principales": "Liderar el orden público, desarticulación de microtráfico, desarme barrial y convivencia ciudadana.",
        "acciones_involucramiento": "Coordinación operativa con MECAR, Distriseguridad e inspecciones de policía.",
    },
    {
        "codigo": "ACT-DISTRISEG",
        "nombre": "Distriseguridad",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["personal"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección General Distriseguridad"},
        "expectativas_principales": "Modernización tecnológica, videovigilancia LPR, alarmas comunitarias y apoyo logístico a la fuerza pública.",
        "acciones_involucramiento": "Ejecución de recursos FONSET e instalación de tecnología de vigilancia preventiva.",
    },
    {
        "codigo": "ACT-PARTICIPACION",
        "nombre": "Secretaría de Participación y Desarrollo Social",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["comunitaria", "alimentaria"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Despacho Secretaría de Participación"},
        "expectativas_principales": "Fortalecimiento de organizaciones comunales, prevención de VBG y garantía de derechos sociales.",
        "acciones_involucramiento": "Convocatoria comunitaria, concertación con JAC y enlace con comedores comunitarios.",
    },
    {
        "codigo": "ACT-EPA",
        "nombre": "Establecimiento Público Ambiental (EPA Cartagena)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["ambiental"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección General EPA"},
        "expectativas_principales": "Recuperación de la Ciénaga de la Virgen, control de vertimientos, calidad del aire y arbolado urbano.",
        "acciones_involucramiento": "Intervención ecoterritorial y concertación ambiental comunitaria.",
    },
    {
        "codigo": "ACT-OAGRD",
        "nombre": "Oficina Asesora para la Gestión del Riesgo de Desastres (OAGRD)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["ambiental", "comunitaria"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección OAGRD"},
        "expectativas_principales": "Mitigación de riesgos por inundaciones pluviales, marejadas, erosión costera y deslizamientos en laderas.",
        "acciones_involucramiento": "Planes barriales de emergencia y comités comunitarios de gestión del riesgo.",
    },
    {
        "codigo": "ACT-CORVIVIENDA",
        "nombre": "Fondo de Vivienda de Interés Social y Reforma Urbana Distrital (Corvivienda)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["economica", "comunitaria"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Gerencia General Corvivienda"},
        "expectativas_principales": "Mejoramiento integral de vivienda, titulación predial y reasentamiento en zonas no mitigables.",
        "acciones_involucramiento": "Proyectos habitacionales priorizados en Olaya Herrera, Pozón y Mandela.",
    },
    {
        "codigo": "ACT-GEPM",
        "nombre": "Gerencia de Espacio Público y Movilidad (GEPM)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["economica", "comunitaria"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Gerencia GEPM"},
        "expectativas_principales": "Ordenamiento y concertación del uso del espacio público con vendedores informales y comerciantes.",
        "acciones_involucramiento": "Mesas de concertación sectorial y acuerdos de reubicación y formalización productiva.",
    },
    {
        "codigo": "ACT-PES-PR",
        "nombre": "Plan de Emergencia Social Pedro Romero (PES-PR)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["economica", "alimentaria"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección General PES-PR"},
        "expectativas_principales": "Superación de la pobreza extrema, inclusión financiera popular y soberanía alimentaria en barrios críticos.",
        "acciones_involucramiento": "Microcrédito comunitario contra el gota a gota y red de apoyo alimentario barrial.",
    },
    {
        "codigo": "ACT-DADIS",
        "nombre": "Departamento Administrativo Distrital de Salud (DADIS)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["salud"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección General DADIS"},
        "expectativas_principales": "Fortalecimiento de la red hospitalaria pública, salud mental comunitaria y control epidemiológico.",
        "acciones_involucramiento": "Brigadas de salud barrial y atención primaria en zonas periféricas e insulares.",
    },
    {
        "codigo": "ACT-ESC-GOBIERNO",
        "nombre": "Escuela de Gobierno y Liderazgo",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["politica", "comunitaria"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección Escuela de Gobierno"},
        "expectativas_principales": "Formación en cultura ciudadana, liderazgo democrático, derechos humanos y control social.",
        "acciones_involucramiento": "Capacitación a voceros de mesas y veedurías ciudadanas distritales.",
    },
    {
        "codigo": "ACT-IDACCC",
        "nombre": "Instituto Comunal de Cartagena (IDACCC)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["comunitaria", "politica"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección IDACCC"},
        "expectativas_principales": "Representación, modernización y articulación técnica de las Juntas de Acción Comunal de Cartagena.",
        "acciones_involucramiento": "Canalización de propuestas de juntas de acción comunal hacia el PAS distrital.",
    },
    {
        "codigo": "ACT-IPCC",
        "nombre": "Instituto de Patrimonio y Cultura de Cartagena (IPCC)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["comunitaria", "personal"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Dirección General IPCC"},
        "expectativas_principales": "Preservación del patrimonio cultural material e inmaterial y dinamización de procesos artísticos comunitarios.",
        "acciones_involucramiento": "Programas de prevención de violencia a través del arte y estímulos a creadores locales.",
    },
    {
        "codigo": "ACT-ALC-LOC1",
        "nombre": "Alcaldía de la Localidad 1 (Histórica y del Caribe Norte)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["comunitaria", "personal", "ambiental"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Alcaldía Local 1"},
        "expectativas_principales": "Gobernanza local, fondos de desarrollo local y articulación comunitaria en la Localidad 1.",
        "acciones_involucramiento": "Seguimiento a las mesas territoriales y fondos de inversión local participativa.",
    },
    {
        "codigo": "ACT-ALC-LOC2",
        "nombre": "Alcaldía de la Localidad 2 (De la Virgen y Turística)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["comunitaria", "personal", "ambiental"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Alcaldía Local 2"},
        "expectativas_principales": "Convivencia barrial, desescalamiento de fronteras invisibles y gestión de drenajes en la Localidad 2.",
        "acciones_involucramiento": "Mesas territoriales de Olaya Herrera, Pozón y articulación comunitaria vecinal.",
    },
    {
        "codigo": "ACT-ALC-LOC3",
        "nombre": "Alcaldía de la Localidad 3 (Industrial y de la Bahía)",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["comunitaria", "economica", "ambiental"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Alcaldía Local 3"},
        "expectativas_principales": "Inclusión productiva, mitigación de impactos ambientales industriales y convivencia en la Localidad 3.",
        "acciones_involucramiento": "Mesas territoriales de Nelson Mandela, Membrillal y corredor industrial de Mamonal.",
    },
    {
        "codigo": "ACT-PLANEACION",
        "nombre": "Secretaría de Planeación Distrital",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["politica", "economica"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Despacho Secretaría de Planeación"},
        "expectativas_principales": "Coordinación del Plan de Desarrollo, viabilidad técnica de políticas públicas y articulación CONPES/DNP.",
        "acciones_involucramiento": "Consolidación del Plan de Acción y Seguimiento (PAS) y banco de proyectos BPIN.",
    },
    {
        "codigo": "ACT-HACIENDA",
        "nombre": "Secretaría de Hacienda Distrital",
        "tipo": "institucional",
        "territorio": "distrital",
        "dimensiones_principales": ["economica", "politica"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {"organizacion": "Alcaldía Mayor de Cartagena", "cargo": "Despacho Secretaría de Hacienda"},
        "expectativas_principales": "Sostenibilidad fiscal, viabilidad presupuestal cuatrienal, consistencia con el MFMP y recaudo tributario.",
        "acciones_involucramiento": "Certificación de disponibilidad financiera y asignación de techos presupuestales a la política.",
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    insert_sql = sa.text("""
        INSERT INTO participacion_ciudadana.actores_estrategicos (
            id, codigo, nombre, tipo, territorio, dimensiones_principales,
            nivel_poder, nivel_interes, postura, contacto,
            expectativas_principales, acciones_involucramiento,
            es_demostracion, creado_en, actualizado_en
        ) VALUES (
            public.generar_uuid_v7(), :codigo, :nombre, :tipo, :territorio,
            CAST(:dimensiones_principales AS jsonb),
            :nivel_poder, :nivel_interes, :postura, CAST(:contacto AS jsonb),
            :expectativas_principales, :acciones_involucramiento,
            false, now(), now()
        )
        ON CONFLICT (codigo) DO NOTHING;
    """)

    import json

    for actor in ACTORES_INSTITUCIONALES:
        conn.execute(
            insert_sql,
            {
                "codigo": actor["codigo"],
                "nombre": actor["nombre"],
                "tipo": actor["tipo"],
                "territorio": actor["territorio"],
                "dimensiones_principales": json.dumps(actor["dimensiones_principales"]),
                "nivel_poder": actor["nivel_poder"],
                "nivel_interes": actor["nivel_interes"],
                "postura": actor["postura"],
                "contacto": json.dumps(actor["contacto"]),
                "expectativas_principales": actor["expectativas_principales"],
                "acciones_involucramiento": actor["acciones_involucramiento"],
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    delete_sql = sa.text("""
        DELETE FROM participacion_ciudadana.actores_estrategicos
        WHERE codigo LIKE 'ACT-%';
    """)
    conn.execute(delete_sql)
