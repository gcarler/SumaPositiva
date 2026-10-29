"""Modelo Relacional y Persistencia del Banco de Alternativas MGA (EDIT-09).

Cierra el ciclo de vida metodológico MGA / DNP creando la tabla relacional
motor_politicas.banco_alternativas, sembrando las 8 alternativas de solución canónicas
de Cartagena, y asignando los permisos RBAC correspondientes.

Revision ID: 0043_modulo_banco_alternativas
Revises: 0042_modulo_fuentes_informacion
Create Date: 2026-10-04 13:30:00.000000
"""

import json
from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0043_modulo_banco_alternativas"
down_revision: str | Sequence[str] | None = "0042_modulo_fuentes_informacion"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ALTERNATIVAS_CANONICAS = [
    {
        "id": "01a0f810-e5ca-7001-a001-000000000001",
        "codigo": "ALT-ESCNNA-01",
        "nombre": "Ruta Distrital Segura y Protección Integral contra la ESCNNA en Entornos Turísticos y Escolares",
        "descripcion": (
            "Estrategia intersectorial de prevención, detección temprana, rescate y protección integral "
            "frente a la Explotación Sexual Comercial de Niñas, Niños y Adolescentes (ESCNNA) en el "
            "Centro Histórico, corredores turísticos, playas y zonas hoteleras de Cartagena."
        ),
        "sector": "proteccion_nna",
        "linea_estrategica_codigo": "LE-02",
        "dimension_codigo": "personal",
        "objetivo_central": (
            "Erradicar la explotación sexual comercial y vulneraciones graves de derechos de niñas, "
            "niños y adolescentes en entornos turísticos y comerciales del Distrito."
        ),
        "territorio_cobertura": "Centro Histórico (UCG 1), Bocagrande, La Boquilla y Playa Blanca (Barú)",
        "poblacion_objetivo_estimada": 14500,
        "costo_estimado_cop": 4500000000.00,
        "horizonte_anios": 4,
        "fuentes_financiacion_sugeridas": ["FONSET", "Cooperación Internacional", "SGP"],
        "estado": "priorizada",
        "requiere_consulta_previa": False,
        "metadatos": {
            "responsable_distrital": "Secretaría del Interior y Convivencia Ciudadana / DADIS",
            "marco_normativo": "Ley 679 de 2001, Ley 1098 de 2006, CONPES 4040",
            "indicador_resultado": "Tasa de denuncias atendidas y desarticulación de redes ESCNNA",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000002",
        "codigo": "ALT-CONV-02",
        "nombre": "Programa Integral de Desarme Social, Oportunidades y Mediación Comunitaria 'Jóvenes Constructores de Paz'",
        "descripcion": (
            "Estrategia territorial de desarme voluntario, desarticulación de fronteras invisibles, "
            "acompañamiento psicosocial, formación técnica laboral y resolución pacífica de conflictos "
            "comunitarios en barrios de alta conflictividad de la Localidad 2."
        ),
        "sector": "seguridad_convivencia",
        "linea_estrategica_codigo": "LE-01",
        "dimension_codigo": "comunitaria",
        "objetivo_central": (
            "Disminuir las muertes violentas y la vinculación de jóvenes a confrontaciones callejeras "
            "y economías ilícitas en sectores críticos de la Localidad de la Virgen y Turística."
        ),
        "territorio_cobertura": "Olaya Herrera (UCG 6), El Pozón (UCG 7), Nelson Mandela (UCG 8) y Fredonia",
        "poblacion_objetivo_estimada": 28000,
        "costo_estimado_cop": 6200000000.00,
        "horizonte_anios": 4,
        "fuentes_financiacion_sugeridas": ["FONSET", "SGP"],
        "estado": "priorizada",
        "requiere_consulta_previa": False,
        "metadatos": {
            "responsable_distrital": "Plan de Emergencia Social Pedro Romero (PES-PR) / Secretaría del Interior",
            "marco_normativo": "Ley 418 de 1997 / Ley 2272 de 2022 (Paz Total Territorial)",
            "indicador_resultado": "Reducción de homicidios juveniles y jóvenes vinculados a empleo formal",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000003",
        "codigo": "ALT-AMB-03",
        "nombre": "Plan de Restauración Ecoterritorial, Borde de Protección y Drenajes en la Ciénaga de la Virgen",
        "descripcion": (
            "Obras de bioingeniería, dragado ecológico, delimitación del borde de bajamar con senderos "
            "ecoturísticos comunitarios y adecuación de canales pluviales para mitigar el riesgo "
            "hidrometeorológico de inundaciones y contaminación crítica."
        ),
        "sector": "ambiente_habitat",
        "linea_estrategica_codigo": "LE-03",
        "dimension_codigo": "ambiental",
        "objetivo_central": (
            "Recuperar la capacidad hidráulica y el equilibrio ecológico de la Ciénaga de la Virgen "
            "conteniendo la ocupación informal y reduciendo el riesgo de desastre."
        ),
        "territorio_cobertura": "Sectores de bajamar de Olaya Herrera, Boston, La Candelaria, Fredonia y San Francisco",
        "poblacion_objetivo_estimada": 42000,
        "costo_estimado_cop": 12000000000.00,
        "horizonte_anios": 5,
        "fuentes_financiacion_sugeridas": ["SGR", "ICLD", "Presupuesto Participativo"],
        "estado": "viable",
        "requiere_consulta_previa": False,
        "metadatos": {
            "responsable_distrital": "Secretaría de Infraestructura / EPA Cartagena / OAGRD",
            "marco_normativo": "Ley 1523 de 2012 (Gestión del Riesgo) / POT Cartagena",
            "indicador_resultado": "Hectáreas de ciénaga recuperadas y familias con riesgo de inundación mitigado",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000004",
        "codigo": "ALT-CUID-04",
        "nombre": "Red Distrital de Manzanas del Cuidado y Centros de Día Comunitarios para Mujeres Cuidadoras",
        "descripcion": (
            "Implementación de infraestructura de servicios articulados de cuidado, relevo a cuidadoras "
            "familiares, formación técnica y prevención integral de violencias basadas en género (VBG) "
            "con Casas de Justicia Violeta en las Localidades 2 y 3."
        ),
        "sector": "genero_inclusion",
        "linea_estrategica_codigo": "LE-02",
        "dimension_codigo": "personal",
        "objetivo_central": (
            "Garantizar la redistribución del trabajo no remunerado de cuidado y proteger a mujeres y "
            "niñas frente a violencias de género e intrafamiliares."
        ),
        "territorio_cobertura": "Localidad 2 (El Pozón) y Localidad 3 (Nelson Mandela / El Carmelo)",
        "poblacion_objetivo_estimada": 19500,
        "costo_estimado_cop": 3800000000.00,
        "horizonte_anios": 4,
        "fuentes_financiacion_sugeridas": ["SGP", "Presupuesto Participativo", "ICLD"],
        "estado": "viable",
        "requiere_consulta_previa": False,
        "metadatos": {
            "responsable_distrital": "Secretaría de Participación y Desarrollo Social / Dirección de Mujer",
            "marco_normativo": "Ley 1257 de 2008 / Política Pública de Mujeres y Equidad de Género",
            "indicador_resultado": "Mujeres atendidas en Manzanas del Cuidado y reducción de tasa de feminicidios/VBG",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000005",
        "codigo": "ALT-INS-05",
        "nombre": "Centro de Innovación Tecnológica, Bilingüismo y Emprendimiento Náutico para Jóvenes Insulares",
        "descripcion": (
            "Construcción y operación comunitaria de un nodo de formación técnica en competencias digitales, "
            "inglés y oficios marino-costeros y ecoturísticos con enfoque de soberanía comunitaria en "
            "territorios colectivos de Tierrabomba y Barú."
        ),
        "sector": "educacion_cultura",
        "linea_estrategica_codigo": "LE-04",
        "dimension_codigo": "economica",
        "objetivo_central": (
            "Superar las barreras de aislamiento geográfico y desempleo estructural de la juventud "
            "insular cartagenera mediante competencias pertinentes para la economía azul."
        ),
        "territorio_cobertura": "Isla de Tierrabomba (Caño del Oro, Bocachica, Punta Arenas) y Barú (Ararca, Santa Ana)",
        "poblacion_objetivo_estimada": 8500,
        "costo_estimado_cop": 2900000000.00,
        "horizonte_anios": 3,
        "fuentes_financiacion_sugeridas": ["SGR", "Cooperación Internacional", "SGP"],
        "estado": "requiere_ajustes",
        "requiere_consulta_previa": True,
        "metadatos": {
            "responsable_distrital": "Secretaría de Educación Distrital / IPCC / Consejos Comunitarios",
            "marco_normativo": "Ley 70 de 1993, Convenio 169 de la OIT (Consulta Previa Obligatoria)",
            "indicador_resultado": "Jóvenes certificados en competencias náuticas e inserción productiva local",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000006",
        "codigo": "ALT-SEG-06",
        "nombre": "Modernización del Sistema de Videovigilancia LPR, Alarmas Comunitarias y Conectividad Policial Inteligente",
        "descripcion": (
            "Renovación tecnológica del circuito cerrado de televisión del Distrito, instalación de "
            "cámaras con reconocimiento de placas (LPR) en accesos viales críticos, botón de pánico "
            "barrial y articulación con los cuadrantes de policía."
        ),
        "sector": "seguridad_convivencia",
        "linea_estrategica_codigo": "LE-01",
        "dimension_codigo": "politica",
        "objetivo_central": (
            "Optimizar la capacidad de reacción y control disuasivo de la Fuerza Pública ante hurtos, "
            "homicidios y extorsiones en corredores viales y comerciales clave."
        ),
        "territorio_cobertura": "Corredores principales de Localidades 1, 2 y 3 (Pedro de Heredia, Cordialidad, Troncal)",
        "poblacion_objetivo_estimada": 350000,
        "costo_estimado_cop": 8500000000.00,
        "horizonte_anios": 3,
        "fuentes_financiacion_sugeridas": ["FONSET"],
        "estado": "en_formulacion",
        "requiere_consulta_previa": False,
        "metadatos": {
            "responsable_distrital": "Secretaría del Interior y Convivencia / Policía Metropolitana de Cartagena (MECAR)",
            "marco_normativo": "Ley 1801 de 2016 (Código Nacional de Policía) / FONSET",
            "indicador_resultado": "Tiempo promedio de respuesta policial y tasa de hurtos esclarecidos",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000007",
        "codigo": "ALT-ECON-07",
        "nombre": "Fondo de Financiamiento Popular y Microcrédito Comunitario contra el 'Gota a Gota' en el Mercado de Bazurto",
        "descripcion": (
            "Línea de crédito blando distrital con acompañamiento financiero para comerciantes "
            "informales, carretilleros y expendedores minoristas de Bazurto y economía popular, "
            "quebrando la extorsión del crédito usurero."
        ),
        "sector": "desarrollo_economico",
        "linea_estrategica_codigo": "LE-04",
        "dimension_codigo": "economica",
        "objetivo_central": (
            "Desarticular las redes extorsivas de agio y cobranza violenta ('gota a gota') "
            "fortaleciendo la liquidez de los trabajadores de la economía popular."
        ),
        "territorio_cobertura": "Mercado de Bazurto y zona de influencia comercial (Localidad 1 y 2)",
        "poblacion_objetivo_estimada": 12000,
        "costo_estimado_cop": 3500000000.00,
        "horizonte_anios": 3,
        "fuentes_financiacion_sugeridas": ["ICLD", "Fondo Emprender / Crédito de Fomento"],
        "estado": "viable",
        "requiere_consulta_previa": False,
        "metadatos": {
            "responsable_distrital": "Secretaría de Hacienda / Departamento Administrativo de Valorización",
            "marco_normativo": "Ley 2234 de 2022 (Política de Inclusión Financiera) / Decreto Distrital Bazurto",
            "indicador_resultado": "Unidades productivas populares desvinculadas de circuitos de cobranza usurera",
        },
    },
    {
        "id": "01a0f810-e5ca-7001-a001-000000000008",
        "codigo": "ALT-ETN-08",
        "nombre": "Plan de Fortalecimiento Institucional y Seguridad Alimentaria para Consejos Comunitarios de Comunidades Negras",
        "descripcion": (
            "Proyectos productivos agropecuarios y pesqueros artesanales sostenibles, gobernanza territorial "
            "y protección ambiental concertada con los Consejos Comunitarios de La Boquilla, Pasacaballos y "
            "Barú en el marco de la Ley 70 de 1993."
        ),
        "sector": "etnico_comunitario",
        "linea_estrategica_codigo": "LE-04",
        "dimension_codigo": "alimentaria",
        "objetivo_central": (
            "Asegurar la soberanía y autonomía alimentaria de las comunidades negras rurales e insulares, "
            "garantizando la preservación de sus medios de vida tradicionales."
        ),
        "territorio_cobertura": "Territorios Colectivos de La Boquilla, Pasacaballos, Barú y Bayunca",
        "poblacion_objetivo_estimada": 16500,
        "costo_estimado_cop": 2400000000.00,
        "horizonte_anios": 4,
        "fuentes_financiacion_sugeridas": ["SGP", "SGR"],
        "estado": "priorizada",
        "requiere_consulta_previa": True,
        "metadatos": {
            "responsable_distrital": "Secretaría de Participación / Gerencia de Espacio Público / Consejos Comunitarios",
            "marco_normativo": "Ley 70 de 1993, Decreto 1745 de 1995, Sentencia T-025 de 2004",
            "indicador_resultado": "Familias con seguridad alimentaria garantizada y hectáreas bajo aprovechamiento tradicional sostenible",
        },
    },
]


def upgrade() -> None:
    # 1. Tabla motor_politicas.banco_alternativas
    op.execute("""
        CREATE TABLE IF NOT EXISTS motor_politicas.banco_alternativas (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo VARCHAR(50) UNIQUE NOT NULL,
            nombre VARCHAR(250) NOT NULL,
            descripcion TEXT NOT NULL DEFAULT '',
            sector VARCHAR(50) NOT NULL,
            linea_estrategica_id UUID REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE SET NULL,
            linea_estrategica_codigo VARCHAR(50),
            dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
            dimension_codigo VARCHAR(50),
            costo_estimado_cop NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
            horizonte_anios INTEGER NOT NULL DEFAULT 4,
            estado VARCHAR(30) NOT NULL DEFAULT 'en_formulacion',
            requiere_consulta_previa BOOLEAN NOT NULL DEFAULT false,
            territorios_focalizados JSONB NOT NULL DEFAULT '[]'::jsonb,
            territorio_cobertura TEXT,
            poblacion_objetivo_estimada INTEGER NOT NULL DEFAULT 0,
            objetivo_central TEXT,
            fuentes_financiacion_sugeridas JSONB NOT NULL DEFAULT '[]'::jsonb,
            metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            CONSTRAINT chk_alternativa_estado CHECK (
                estado IN ('en_formulacion', 'viable', 'requiere_ajustes', 'priorizada', 'descartada')
            ),
            CONSTRAINT chk_alternativa_sector CHECK (
                sector IN (
                    'seguridad_convivencia', 'proteccion_nna', 'ambiente_habitat',
                    'genero_inclusion', 'desarrollo_economico', 'educacion_cultura',
                    'etnico_comunitario'
                )
            ),
            CONSTRAINT chk_alternativa_costo_positivo CHECK (costo_estimado_cop >= 0),
            CONSTRAINT chk_alternativa_horizonte_positivo CHECK (horizonte_anios > 0),
            CONSTRAINT chk_alternativa_poblacion_positiva CHECK (poblacion_objetivo_estimada >= 0)
        );
    """)

    # 2. Índices de optimización
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alternativas_codigo
            ON motor_politicas.banco_alternativas (codigo);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alternativas_sector
            ON motor_politicas.banco_alternativas (sector);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alternativas_estado
            ON motor_politicas.banco_alternativas (estado);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alternativas_dimension
            ON motor_politicas.banco_alternativas (dimension_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alternativas_linea
            ON motor_politicas.banco_alternativas (linea_estrategica_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alternativas_metadatos_gin
            ON motor_politicas.banco_alternativas USING gin (metadatos);
    """)
    op.execute("""
        COMMENT ON TABLE motor_politicas.banco_alternativas
            IS 'Banco Distrital de Alternativas MGA para Seguridad Humana Cartagena 2026-2036';
    """)

    # 3. Asignación de permisos RBAC en autenticacion.roles
    op.execute("""
        UPDATE autenticacion.roles
        SET permisos = permisos || '["alternativas:leer", "alternativas:gestionar"]'::jsonb
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades')
          AND NOT permisos ? 'alternativas:gestionar';
    """)
    op.execute("""
        UPDATE autenticacion.roles
        SET permisos = permisos || '["alternativas:leer"]'::jsonb
        WHERE codigo IN ('auditor_forense', 'facilitador_mesa', 'ciudadano')
          AND NOT permisos ? 'alternativas:leer';
    """)

    # 4. Sembrado canónico de las 8 iniciativas de Cartagena
    sql_insert = text("""
        INSERT INTO motor_politicas.banco_alternativas (
            id, codigo, nombre, descripcion, sector,
            linea_estrategica_id, linea_estrategica_codigo,
            dimension_id, dimension_codigo,
            costo_estimado_cop, horizonte_anios, estado,
            requiere_consulta_previa, territorios_focalizados, territorio_cobertura,
            poblacion_objetivo_estimada, objetivo_central,
            fuentes_financiacion_sugeridas, metadatos
        ) VALUES (
            :id, :codigo, :nombre, :descripcion, :sector,
            (SELECT id FROM motor_politicas.lineas_estrategicas WHERE codigo = :linea_estrategica_codigo LIMIT 1),
            :linea_estrategica_codigo,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = :dimension_codigo LIMIT 1),
            :dimension_codigo,
            :costo_estimado_cop, :horizonte_anios, :estado,
            :requiere_consulta_previa, CAST(:territorios_focalizados AS jsonb), :territorio_cobertura,
            :poblacion_objetivo_estimada, :objetivo_central,
            CAST(:fuentes_financiacion_sugeridas AS jsonb), CAST(:metadatos AS jsonb)
        ) ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            sector = EXCLUDED.sector,
            dimension_id = EXCLUDED.dimension_id,
            dimension_codigo = EXCLUDED.dimension_codigo,
            linea_estrategica_id = EXCLUDED.linea_estrategica_id,
            linea_estrategica_codigo = EXCLUDED.linea_estrategica_codigo,
            costo_estimado_cop = EXCLUDED.costo_estimado_cop,
            horizonte_anios = EXCLUDED.horizonte_anios,
            estado = EXCLUDED.estado,
            requiere_consulta_previa = EXCLUDED.requiere_consulta_previa,
            territorio_cobertura = EXCLUDED.territorio_cobertura,
            poblacion_objetivo_estimada = EXCLUDED.poblacion_objetivo_estimada,
            objetivo_central = EXCLUDED.objetivo_central,
            fuentes_financiacion_sugeridas = EXCLUDED.fuentes_financiacion_sugeridas,
            metadatos = EXCLUDED.metadatos;
    """)

    conn = op.get_bind()
    for alt in ALTERNATIVAS_CANONICAS:
        conn.execute(
            sql_insert,
            {
                "id": alt["id"],
                "codigo": alt["codigo"],
                "nombre": alt["nombre"],
                "descripcion": alt["descripcion"],
                "sector": alt["sector"],
                "linea_estrategica_codigo": alt["linea_estrategica_codigo"],
                "dimension_codigo": alt["dimension_codigo"],
                "costo_estimado_cop": alt["costo_estimado_cop"],
                "horizonte_anios": alt["horizonte_anios"],
                "estado": alt["estado"],
                "requiere_consulta_previa": alt["requiere_consulta_previa"],
                "territorios_focalizados": json.dumps([]),
                "territorio_cobertura": alt["territorio_cobertura"],
                "poblacion_objetivo_estimada": alt["poblacion_objetivo_estimada"],
                "objetivo_central": alt["objetivo_central"],
                "fuentes_financiacion_sugeridas": json.dumps(alt["fuentes_financiacion_sugeridas"]),
                "metadatos": json.dumps(alt["metadatos"]),
            },
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS motor_politicas.banco_alternativas CASCADE;")
