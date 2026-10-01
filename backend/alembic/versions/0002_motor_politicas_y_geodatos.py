"""Esquemas y tablas iniciales de motor_politicas y geodatos.

Revision ID: 0002_motor_politicas_y_geodatos
Revises: 0001_extensions
Create Date: 2026-10-01 06:00:00.000000
"""

from alembic import op

revision = "0002_motor_politicas_y_geodatos"
down_revision = "0001_extensions"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    # 1. Esquemas
    "CREATE SCHEMA IF NOT EXISTS motor_politicas",
    "CREATE SCHEMA IF NOT EXISTS geodatos",
    # 2. Funciones globales de persistencia
    """
    CREATE OR REPLACE FUNCTION public.generar_uuid_v7()
    RETURNS uuid
    AS $$
    DECLARE
      v_time timestamp with time zone := clock_timestamp();
      v_epoch bigint;
      v_bytes bytea;
    BEGIN
      v_epoch := (extract(epoch from v_time) * 1000)::bigint;
      v_bytes := gen_random_bytes(16);
      v_bytes := set_byte(v_bytes, 0, (v_epoch >> 40 & 255)::int);
      v_bytes := set_byte(v_bytes, 1, (v_epoch >> 32 & 255)::int);
      v_bytes := set_byte(v_bytes, 2, (v_epoch >> 24 & 255)::int);
      v_bytes := set_byte(v_bytes, 3, (v_epoch >> 16 & 255)::int);
      v_bytes := set_byte(v_bytes, 4, (v_epoch >> 8 & 255)::int);
      v_bytes := set_byte(v_bytes, 5, (v_epoch & 255)::int);
      v_bytes := set_byte(v_bytes, 6, ((get_byte(v_bytes, 6) & 15) | 112)::int);
      v_bytes := set_byte(v_bytes, 8, ((get_byte(v_bytes, 8) & 63) | 128)::int);
      RETURN encode(v_bytes, 'hex')::uuid;
    END;
    $$ LANGUAGE plpgsql VOLATILE;
    """,
    """
    CREATE OR REPLACE FUNCTION public.actualizar_marca_temporal()
    RETURNS trigger
    AS $$
    BEGIN
      NEW.actualizado_en = clock_timestamp();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    # 3. Tablas motor_politicas
    """
    CREATE TABLE IF NOT EXISTS motor_politicas.dimensiones_seguridad_humana (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT NOT NULL,
        color_hex VARCHAR(7) NOT NULL DEFAULT '#6366f1',
        icono VARCHAR(50) NOT NULL DEFAULT 'shield',
        orden INT NOT NULL DEFAULT 1,
        activa BOOLEAN NOT NULL DEFAULT true,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS motor_politicas.fases_politica (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        orden INT NOT NULL,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        estado VARCHAR(50) NOT NULL DEFAULT 'preparatoria',
        progreso_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        fecha_inicio DATE,
        fecha_cierre DATE,
        reglas_participacion JSONB NOT NULL DEFAULT '{"permite_anonimo": true, "permite_fotos": true, "limite_aportes_por_usuario": 10}'::jsonb,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_estado_fase CHECK (estado IN ('preparatoria', 'activa', 'en_revision', 'cerrada', 'archivada')),
        CONSTRAINT chk_progreso_rango CHECK (progreso_porcentaje >= 0 AND progreso_porcentaje <= 100)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS motor_politicas.lineas_estrategicas (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        fase_id UUID NOT NULL REFERENCES motor_politicas.fases_politica(id) ON DELETE RESTRICT,
        dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
        codigo VARCHAR(50) NOT NULL,
        titulo VARCHAR(300) NOT NULL,
        descripcion TEXT NOT NULL,
        problema_abordado TEXT,
        objetivo_especifico TEXT,
        costo_estimado NUMERIC(18,2) NOT NULL DEFAULT 0.00,
        fuentes_financiacion TEXT[] NOT NULL DEFAULT ARRAY['FONSET']::TEXT[],
        entidad_lider VARCHAR(250) NOT NULL DEFAULT 'Secretaría del Interior y Convivencia Ciudadana',
        entidades_coresponsables TEXT[] DEFAULT ARRAY[]::TEXT[],
        orden INT NOT NULL DEFAULT 1,
        activa BOOLEAN NOT NULL DEFAULT true,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    )
    """,
    # 4. Índices motor_politicas
    "CREATE INDEX IF NOT EXISTS idx_lineas_fase ON motor_politicas.lineas_estrategicas(fase_id)",
    "CREATE INDEX IF NOT EXISTS idx_lineas_dimension ON motor_politicas.lineas_estrategicas(dimension_id)",
    "CREATE INDEX IF NOT EXISTS idx_lineas_metadatos_gin ON motor_politicas.lineas_estrategicas USING GIN (metadatos)",
    # 5. Triggers motor_politicas
    "DROP TRIGGER IF EXISTS trg_actualizar_dimensiones ON motor_politicas.dimensiones_seguridad_humana",
    """
    CREATE TRIGGER trg_actualizar_dimensiones
        BEFORE UPDATE ON motor_politicas.dimensiones_seguridad_humana
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    "DROP TRIGGER IF EXISTS trg_actualizar_fases ON motor_politicas.fases_politica",
    """
    CREATE TRIGGER trg_actualizar_fases
        BEFORE UPDATE ON motor_politicas.fases_politica
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    "DROP TRIGGER IF EXISTS trg_actualizar_lineas ON motor_politicas.lineas_estrategicas",
    """
    CREATE TRIGGER trg_actualizar_lineas
        BEFORE UPDATE ON motor_politicas.lineas_estrategicas
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    # 6. Tablas geodatos
    """
    CREATE TABLE IF NOT EXISTS geodatos.territorios (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(200) NOT NULL,
        tipo_territorio VARCHAR(50) NOT NULL,
        territorio_padre_id UUID REFERENCES geodatos.territorios(id) ON DELETE CASCADE,
        geometria geometry(MultiPolygon, 4326),
        centroide geometry(Point, 4326),
        poblacion_estimada INT,
        estrato_predominante INT,
        es_zona_etnica BOOLEAN NOT NULL DEFAULT false,
        nombre_consejo_comunitario VARCHAR(250),
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_tipo_territorio CHECK (tipo_territorio IN (
            'distrito',
            'localidad',
            'unidad_actuacion_comunera',
            'barrio',
            'corregimiento',
            'zona_insular'
        ))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS geodatos.indicadores_territorio (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        territorio_id UUID NOT NULL REFERENCES geodatos.territorios(id) ON DELETE CASCADE,
        dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
        codigo_indicador VARCHAR(100) NOT NULL,
        nombre_indicador VARCHAR(250) NOT NULL,
        valor NUMERIC(14,4) NOT NULL,
        unidad_medida VARCHAR(50) NOT NULL,
        nivel_riesgo VARCHAR(30) NOT NULL DEFAULT 'medio',
        anio_corte INT NOT NULL DEFAULT 2026,
        fuente_datos VARCHAR(200) NOT NULL,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_nivel_riesgo CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto', 'critico'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS geodatos.capas_geovisor (
        id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(200) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        descripcion TEXT,
        tipo_geometria VARCHAR(50) NOT NULL DEFAULT 'Poligonos',
        color_estilo VARCHAR(7) NOT NULL DEFAULT '#ef4444',
        activa BOOLEAN NOT NULL DEFAULT true,
        metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    )
    """,
    # 7. Índices geodatos
    "CREATE INDEX IF NOT EXISTS idx_territorios_geometria ON geodatos.territorios USING GIST (geometria)",
    "CREATE INDEX IF NOT EXISTS idx_territorios_centroide ON geodatos.territorios USING GIST (centroide)",
    "CREATE INDEX IF NOT EXISTS idx_territorios_padre ON geodatos.territorios(territorio_padre_id)",
    "CREATE INDEX IF NOT EXISTS idx_territorios_tipo ON geodatos.territorios(tipo_territorio)",
    "CREATE INDEX IF NOT EXISTS idx_territorios_nombre_trgm ON geodatos.territorios USING GIN (nombre gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_indicadores_territorio ON geodatos.indicadores_territorio(territorio_id)",
    "CREATE INDEX IF NOT EXISTS idx_indicadores_dimension ON geodatos.indicadores_territorio(dimension_id)",
    "CREATE INDEX IF NOT EXISTS idx_indicadores_codigo ON geodatos.indicadores_territorio(codigo_indicador)",
    # 8. Comentarios de tablas y columnas
    "COMMENT ON TABLE motor_politicas.dimensiones_seguridad_humana IS 'Las 7 dimensiones de la Seguridad Humana (ONU/DNP) que estructuran el diagnóstico y metas de Cartagena'",
    "COMMENT ON COLUMN motor_politicas.dimensiones_seguridad_humana.codigo IS 'Identificador textual corto: economica, alimentaria, salud, ambiental, personal, comunitaria, politica'",
    "COMMENT ON TABLE motor_politicas.fases_politica IS 'Fases dinámicas del ciclo de vida de la Política Pública de Seguridad Humana de Cartagena'",
    "COMMENT ON COLUMN motor_politicas.fases_politica.reglas_participacion IS 'Reglas de negocio parametrizables para la participación ciudadana en cada fase'",
    "COMMENT ON TABLE motor_politicas.lineas_estrategicas IS 'Líneas estratégicas asociadas a fases, dimensiones de seguridad humana y fuentes de financiación'",
    "COMMENT ON COLUMN motor_politicas.lineas_estrategicas.fuentes_financiacion IS 'Fuentes presupuestales en Colombia: FONSET, SGP, SGR, ICLD, Cooperación'",
    "COMMENT ON TABLE geodatos.territorios IS 'División político-administrativa oficial del Distrito de Cartagena con geometrías vectoriales EPSG:4326'",
    "COMMENT ON COLUMN geodatos.territorios.tipo_territorio IS 'Nivel territorial: distrito, localidad, unidad_actuacion_comunera (UAC), barrio, corregimiento o zona_insular'",
    "COMMENT ON COLUMN geodatos.territorios.es_zona_etnica IS 'Indica si el territorio es consejo comunitario afrodescendiente o resguardo indígena (Consulta Previa)'",
    "COMMENT ON TABLE geodatos.indicadores_territorio IS 'Estadísticas e indicadores territoriales para la conexión bidireccional Mapa <-> Datos'",
    "COMMENT ON TABLE geodatos.capas_geovisor IS 'Catálogo de capas espaciales temáticas superponibles en el Geovisor de Cartagena'",
    # 8. Triggers geodatos
    "DROP TRIGGER IF EXISTS trg_actualizar_territorios ON geodatos.territorios",
    """
    CREATE TRIGGER trg_actualizar_territorios
        BEFORE UPDATE ON geodatos.territorios
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    "DROP TRIGGER IF EXISTS trg_actualizar_indicadores ON geodatos.indicadores_territorio",
    """
    CREATE TRIGGER trg_actualizar_indicadores
        BEFORE UPDATE ON geodatos.indicadores_territorio
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    "DROP TRIGGER IF EXISTS trg_actualizar_capas ON geodatos.capas_geovisor",
    """
    CREATE TRIGGER trg_actualizar_capas
        BEFORE UPDATE ON geodatos.capas_geovisor
        FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal()
    """,
    # 9. Datos semilla: 7 Dimensiones de Seguridad Humana
    """
    INSERT INTO motor_politicas.dimensiones_seguridad_humana (codigo, nombre, descripcion, color_hex, icono, orden)
    VALUES
        ('economica', 'Seguridad Económica', 'Garantía de un ingreso básico asegurado, empleo digno y superación de la pobreza extrema en los sectores más vulnerables de Cartagena.', '#10b981', 'briefcase', 1),
        ('alimentaria', 'Seguridad Alimentaria', 'Acceso físico y económico permanente a alimentos suficientes, nutritivos y culturalmente adecuados, fortaleciendo circuitos cortos con la zona corregimental.', '#f59e0b', 'utensils', 2),
        ('salud', 'Seguridad en Salud', 'Protección contra enfermedades, atención integral primaria, prevención de adicciones y garantía de salud mental para niños, niñas y jóvenes.', '#ef4444', 'heart-pulse', 3),
        ('ambiental', 'Seguridad Ambiental', 'Protección del hábitat frente a la erosión costera, saneamiento de la Ciénaga de la Virgen y la Bahía, y mitigación de amenazas climáticas extremas.', '#06b6d4', 'leaf', 4),
        ('personal', 'Seguridad Personal', 'Protección de la integridad física frente a violencias, desarme, prevención estricta de la trata de personas y erradicación de la ESCNNA en Cartagena.', '#8b5cf6', 'shield-check', 5),
        ('comunitaria', 'Seguridad Comunitaria', 'Preservación de la identidad cultural, cohesión social vecinal, mediación de conflictos comunitarios y protección de los derechos de pueblos afrodescendientes e insulares.', '#ec4899', 'users', 6),
        ('politica', 'Seguridad Política', 'Garantía del ejercicio pleno de los derechos humanos, libertad de expresión, protección a líderes comunitarios y transparencia activa en la gestión pública.', '#3b82f6', 'landmark', 7)
    ON CONFLICT (codigo) DO UPDATE
    SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, color_hex = EXCLUDED.color_hex
    """,
    # 10. Datos semilla: 3 Fases del Ciclo de la Política Pública
    """
    INSERT INTO motor_politicas.fases_politica (orden, codigo, nombre, descripcion, estado, progreso_porcentaje, fecha_inicio, fecha_cierre)
    VALUES
        (1, 'FASE_1_DIAGNOSTICO', 'Fase 1: Alistamiento y Diagnóstico Participativo', 'Levantamiento de línea base, geovisor de conflictividad, alertas tempranas SAT y mesas territoriales en las 3 localidades y zona insular.', 'activa', 35.00, '2026-02-01', '2026-06-30'),
        (2, 'FASE_2_FORMULACION', 'Fase 2: Formulación de Alternativas y Líneas Estratégicas', 'Co-creación de árboles de soluciones, recepción de propuestas ciudadanas y concertación de alternativas con actores clave.', 'preparatoria', 0.00, '2026-07-01', '2026-10-31'),
        (3, 'FASE_3_PLAN_ACCION', 'Fase 3: Plan de Acción e Inversión (FONSET / MPI)', 'Costeo de metas cuatrienales, asignación presupuestal del FONSET, regalías OCAD y adopción jurídica mediante Acuerdo Distrital.', 'preparatoria', 0.00, '2026-11-01', '2026-12-31')
    ON CONFLICT (codigo) DO UPDATE
    SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, estado = EXCLUDED.estado
    """,
    # 11. Datos semilla: Malla Territorial Oficial de Cartagena (15 territorios distritales con centroides EPSG:4326)
    """
    INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, centroide)
    VALUES ('DISTRITO-CTG', 'Distrito Turístico y Cultural de Cartagena de Indias', 'distrito', ST_SetSRID(ST_MakePoint(-75.5144, 10.4236), 4326))
    ON CONFLICT (codigo) DO NOTHING
    """,
    """
    INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, territorio_padre_id, centroide)
    VALUES
        ('LOC-1', 'Localidad 1: Histórica y del Caribe Norte', 'localidad', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'), ST_SetSRID(ST_MakePoint(-75.5450, 10.4280), 4326)),
        ('LOC-2', 'Localidad 2: De la Virgen y Turística', 'localidad', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'), ST_SetSRID(ST_MakePoint(-75.4950, 10.4150), 4326)),
        ('LOC-3', 'Localidad 3: Industrial y de la Bahía', 'localidad', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'), ST_SetSRID(ST_MakePoint(-75.4900, 10.3700), 4326))
    ON CONFLICT (codigo) DO NOTHING
    """,
    """
    INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, territorio_padre_id, centroide, es_zona_etnica, nombre_consejo_comunitario)
    VALUES
        ('CORR-BOQUILLA', 'La Boquilla', 'corregimiento', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1'), ST_SetSRID(ST_MakePoint(-75.4850, 10.4700), 4326), true, 'Consejo Comunitario de Comunidades Negras de La Boquilla'),
        ('CORR-PASACABALLOS', 'Pasacaballos', 'corregimiento', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-3'), ST_SetSRID(ST_MakePoint(-75.5200, 10.2980), 4326), true, 'Consejo Comunitario de Pasacaballos'),
        ('CORR-BAYUNCA', 'Bayunca', 'corregimiento', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2'), ST_SetSRID(ST_MakePoint(-75.4050, 10.4780), 4326), true, 'Consejo Comunitario de Bayunca'),
        ('INS-BARU', 'Isla de Barú', 'zona_insular', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-3'), ST_SetSRID(ST_MakePoint(-75.6300, 10.2100), 4326), true, 'Consejo Comunitario de Barú'),
        ('INS-TIERRABOMBA', 'Isla de Tierra Bomba (Bocachica / Caño del Oro / Punta Arena)', 'zona_insular', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1'), ST_SetSRID(ST_MakePoint(-75.5750, 10.3550), 4326), true, 'Consejos Comunitarios de Tierra Bomba y Bocachica'),
        ('INS-ROSARIO', 'Archipiélago de Nuestra Señora del Rosario', 'zona_insular', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1'), ST_SetSRID(ST_MakePoint(-75.7500, 10.1800), 4326), true, 'Consejo Comunitario Islas del Rosario')
    ON CONFLICT (codigo) DO NOTHING
    """,
    """
    INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, territorio_padre_id, centroide)
    VALUES
        ('BARRIO-OLAYA', 'Olaya Herrera (Todos los sectores)', 'barrio', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2'), ST_SetSRID(ST_MakePoint(-75.4980, 10.4050), 4326)),
        ('BARRIO-POZON', 'El Pozón', 'barrio', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2'), ST_SetSRID(ST_MakePoint(-75.4680, 10.4120), 4326)),
        ('BARRIO-MANDELA', 'Nelson Mandela', 'barrio', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-3'), ST_SetSRID(ST_MakePoint(-75.4720, 10.3750), 4326)),
        ('BARRIO-CENTRO', 'Centro Histórico y San Diego', 'barrio', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1'), ST_SetSRID(ST_MakePoint(-75.5480, 10.4230), 4326)),
        ('BARRIO-GETSEMANI', 'Getsemaní', 'barrio', 
         (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1'), ST_SetSRID(ST_MakePoint(-75.5450, 10.4200), 4326))
    ON CONFLICT (codigo) DO NOTHING
    """,
    # 12. Datos semilla: Capas del Geovisor
    """
    INSERT INTO geodatos.capas_geovisor (codigo, nombre, categoria, descripcion, tipo_geometria, color_estilo)
    VALUES
        ('SAT_DEFENSORIA', 'Alertas Tempranas SAT / CIPRAT', 'Seguridad y Convivencia', 'Advertencias y escenarios de riesgo inminente emitidos por la Defensoría del Pueblo para Cartagena', 'Poligonos', '#ef4444'),
        ('CONFLICTIVIDAD_ICS', 'Índice de Conflictividad Social (ICS)', 'Diálogo Social', 'Mapeo de tensiones comunitarias, bloqueos viales, riñas y protestas ciudadanas', 'MapaCalor', '#f59e0b'),
        ('FONSET_PROYECTOS', 'Inversiones del Fondo de Seguridad (FONSET)', 'Transparencia Fiscal', 'Proyectos de infraestructura de seguridad, cámaras, movilidad policial y centros comunitarios financiados con FONSET', 'Puntos', '#10b981'),
        ('CIENAGA_VIRGEN', 'Seguridad Ambiental Ciénaga de la Virgen', 'Medio Ambiente', 'Monitoreo de invasiones en rondas de manglar, rellenos ilegales y vertimientos de aguas residuales', 'Poligonos', '#06b6d4')
    ON CONFLICT (codigo) DO NOTHING
    """,
]

INSTRUCCIONES_DOWNGRADE = [
    "DROP TABLE IF EXISTS geodatos.capas_geovisor CASCADE",
    "DROP TABLE IF EXISTS geodatos.indicadores_territorio CASCADE",
    "DROP TABLE IF EXISTS geodatos.territorios CASCADE",
    "DROP TABLE IF EXISTS motor_politicas.lineas_estrategicas CASCADE",
    "DROP TABLE IF EXISTS motor_politicas.fases_politica CASCADE",
    "DROP TABLE IF EXISTS motor_politicas.dimensiones_seguridad_humana CASCADE",
    "DROP SCHEMA IF EXISTS geodatos CASCADE",
    "DROP SCHEMA IF EXISTS motor_politicas CASCADE",
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
