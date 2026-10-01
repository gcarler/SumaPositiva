-- =============================================================================
-- POLIS: Base de Datos bd_csh (Cartagena Seguridad Humana)
-- Script 03: Dominio Geoespacial y Territorial de Cartagena (geodatos)
-- =============================================================================

SET search_path TO geodatos, public;

-- 1. Tabla: territorios
-- Jerarquía territorial formal del Distrito de Cartagena de Indias con soporte PostGIS
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
);

COMMENT ON TABLE geodatos.territorios IS 'División político-administrativa oficial del Distrito de Cartagena con geometrías vectoriales EPSG:4326';
COMMENT ON COLUMN geodatos.territorios.tipo_territorio IS 'Nivel territorial: distrito, localidad, unidad_actuacion_comunera (UAC), barrio, corregimiento o zona_insular';
COMMENT ON COLUMN geodatos.territorios.es_zona_etnica IS 'Indica si el territorio es consejo comunitario afrodescendiente o resguardo indígena (Consulta Previa)';

-- Índices Espaciales y B-Tree
CREATE INDEX IF NOT EXISTS idx_territorios_geometria ON geodatos.territorios USING GIST (geometria);
CREATE INDEX IF NOT EXISTS idx_territorios_centroide ON geodatos.territorios USING GIST (centroide);
CREATE INDEX IF NOT EXISTS idx_territorios_padre ON geodatos.territorios(territorio_padre_id);
CREATE INDEX IF NOT EXISTS idx_territorios_tipo ON geodatos.territorios(tipo_territorio);
CREATE INDEX IF NOT EXISTS idx_territorios_nombre_trgm ON geodatos.territorios USING GIN (nombre gin_trgm_ops);

-- 2. Tabla: indicadores_territorio
-- Cifras clave bajo las 7 dimensiones de la Seguridad Humana e Índice de Conflictividad Social (ICS)
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
);

COMMENT ON TABLE geodatos.indicadores_territorio IS 'Estadísticas e indicadores territoriales para la conexión bidireccional Mapa <-> Datos';
CREATE INDEX IF NOT EXISTS idx_indicadores_territorio ON geodatos.indicadores_territorio(territorio_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_dimension ON geodatos.indicadores_territorio(dimension_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_codigo ON geodatos.indicadores_territorio(codigo_indicador);

-- 3. Tabla: capas_geovisor
-- Capas temáticas del Geovisor (Alertas SAT/CIPRAT, Inversiones FONSET, Problemáticas Críticas)
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
);

COMMENT ON TABLE geodatos.capas_geovisor IS 'Catálogo de capas espaciales temáticas superponibles en el Geovisor de Cartagena';

-- Disparadores de actualización temporal
CREATE OR REPLACE TRIGGER trg_actualizar_territorios
    BEFORE UPDATE ON geodatos.territorios
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal();

CREATE OR REPLACE TRIGGER trg_actualizar_indicadores
    BEFORE UPDATE ON geodatos.indicadores_territorio
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal();

CREATE OR REPLACE TRIGGER trg_actualizar_capas
    BEFORE UPDATE ON geodatos.capas_geovisor
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal();

-- =============================================================================
-- DATOS SEMILLA: Malla Territorial Oficial de Cartagena de Indias
-- =============================================================================

-- Distrito (Nivel 0)
INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, centroide)
VALUES ('DISTRITO-CTG', 'Distrito Turístico y Cultural de Cartagena de Indias', 'distrito', ST_SetSRID(ST_MakePoint(-75.5144, 10.4236), 4326))
ON CONFLICT (codigo) DO NOTHING;

-- Localidades (Nivel 1)
INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, territorio_padre_id, centroide)
VALUES
    ('LOC-1', 'Localidad 1: Histórica y del Caribe Norte', 'localidad', 
     (SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'), ST_SetSRID(ST_MakePoint(-75.5450, 10.4280), 4326)),
    ('LOC-2', 'Localidad 2: De la Virgen y Turística', 'localidad', 
     (SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'), ST_SetSRID(ST_MakePoint(-75.4950, 10.4150), 4326)),
    ('LOC-3', 'Localidad 3: Industrial y de la Bahía', 'localidad', 
     (SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'), ST_SetSRID(ST_MakePoint(-75.4900, 10.3700), 4326))
ON CONFLICT (codigo) DO NOTHING;

-- Corregimientos y Zonas Insulares con Enfoque Étnico
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
ON CONFLICT (codigo) DO NOTHING;

-- Barrios Emblemáticos Prioritarios para Seguridad Humana
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
ON CONFLICT (codigo) DO NOTHING;

-- Capas del Geovisor
INSERT INTO geodatos.capas_geovisor (codigo, nombre, categoria, descripcion, tipo_geometria, color_estilo)
VALUES
    ('SAT_DEFENSORIA', 'Alertas Tempranas SAT / CIPRAT', 'Seguridad y Convivencia', 'Advertencias y escenarios de riesgo inminente emitidos por la Defensoría del Pueblo para Cartagena', 'Poligonos', '#ef4444'),
    ('CONFLICTIVIDAD_ICS', 'Índice de Conflictividad Social (ICS)', 'Diálogo Social', 'Mapeo de tensiones comunitarias, bloqueos viales, riñas y protestas ciudadanas', 'MapaCalor', '#f59e0b'),
    ('FONSET_PROYECTOS', 'Inversiones del Fondo de Seguridad (FONSET)', 'Transparencia Fiscal', 'Proyectos de infraestructura de seguridad, cámaras, movilidad policial y centros comunitarios financiados con FONSET', 'Puntos', '#10b981'),
    ('CIENAGA_VIRGEN', 'Seguridad Ambiental Ciénaga de la Virgen', 'Medio Ambiente', 'Monitoreo de invasiones en rondas de manglar, rellenos ilegales y vertimientos de aguas residuales', 'Poligonos', '#06b6d4')
ON CONFLICT (codigo) DO NOTHING;
