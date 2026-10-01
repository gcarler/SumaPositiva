-- ============================================================================
-- SCRIPT 04: ESQUEMA Y SEMILLAS DE MESAS DE TRABAJO 360° (PHYGITAL & LTREE)
-- Base de Datos: bd_csh (Cartagena Seguridad Humana)
-- PostgreSQL 18.6 + PostGIS 3.6 + ltree
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS mesas_trabajo;

-- Tabla principal de Mesas de Co-creación y Deliberación Ciudadana
CREATE TABLE IF NOT EXISTS mesas_trabajo.mesas (
    id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
    
    -- 1. Identificación y Codificación Semántica Inteligente
    codigo_oficial VARCHAR(30) NOT NULL UNIQUE,      -- Ej: 'MT-L01-01', 'MR-ISL-08', 'MP-ETN-08'
    shortcode_ciudadano VARCHAR(10) NOT NULL UNIQUE,  -- Ej: 'MT101', 'ISLA08' (Fácil de dictar por radio/SMS)
    ruta_jerarquica ltree NOT NULL,                   -- Ej: 'csh.mt.l01', 'csh.mr.tierrabomba'
    slug VARCHAR(180) NOT NULL UNIQUE,                -- URL amigable
    nombre VARCHAR(255) NOT NULL,
    tipo_mesa VARCHAR(40) NOT NULL,                  -- 'TERRITORIAL', 'RURAL_INSULAR', 'POBLACIONAL', 'SECTORIAL'
    descripcion TEXT,
    
    -- 2. Facetas Territoriales y Espaciales (PostGIS)
    territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
    lugar_nombre VARCHAR(255) NOT NULL,              -- Lugar físico/auditorio
    coordenadas geometry(Point, 4326),               -- Punto espacial exacto (EPSG:4326)
    
    -- 3. Facetas Temáticas y Normativas (Decreto 037/26 & Ley 70/93)
    dimension_principal_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
    enfoque_poblacional VARCHAR(50) DEFAULT 'GENERAL',-- 'GENERAL', 'ETNICO', 'MUJERES', 'JUVENTUD', 'VICTIMAS', 'INFANCIA', etc.
    es_consulta_previa BOOLEAN DEFAULT FALSE,        -- Salvaguarda étnica Convenio 169 OIT
    
    -- 4. Operación Phygital y Logística
    modalidad VARCHAR(30) DEFAULT 'HIBRIDA_DIGITAL', -- 'PRESENCIAL', 'VIRTUAL', 'HIBRIDA_DIGITAL'
    enlace_streaming VARCHAR(255),
    fecha DATE NOT NULL,
    horario VARCHAR(100) NOT NULL,
    aforo_presencial INT DEFAULT 150,
    
    -- 5. Ciclo de Vida y Facilitación
    estado VARCHAR(30) DEFAULT 'PROGRAMADA',         -- 'PROGRAMADA', 'CONVOCADA', 'EN_DELIBERACION', 'ACTA_CONCERTADA', 'FINALIZADA'
    facilitador_responsable VARCHAR(150),
    relator_comunitario VARCHAR(150),
    
    -- 6. Trazabilidad Criptográfica (Sentencia C-150 de 2015)
    total_asistentes_presenciales INT DEFAULT 0,
    total_asistentes_digitales INT DEFAULT 0,
    total_propuestas_producidas INT DEFAULT 0,
    sha256_acta CHAR(64),                            -- Hash inmutable del acta final
    acta_pdf_url VARCHAR(255),
    
    -- Metadatos adicionales
    metadata JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT clock_timestamp(),
    actualizado_en TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- Índices de ultra-alto rendimiento
CREATE INDEX IF NOT EXISTS idx_mesas_codigo ON mesas_trabajo.mesas(codigo_oficial);
CREATE INDEX IF NOT EXISTS idx_mesas_shortcode ON mesas_trabajo.mesas(shortcode_ciudadano);
CREATE INDEX IF NOT EXISTS idx_mesas_ruta_gist ON mesas_trabajo.mesas USING gist(ruta_jerarquica);
CREATE INDEX IF NOT EXISTS idx_mesas_geo_gist ON mesas_trabajo.mesas USING gist(coordenadas);
CREATE INDEX IF NOT EXISTS idx_mesas_tipo ON mesas_trabajo.mesas(tipo_mesa);
CREATE INDEX IF NOT EXISTS idx_mesas_estado ON mesas_trabajo.mesas(estado);
CREATE INDEX IF NOT EXISTS idx_mesas_fecha ON mesas_trabajo.mesas(fecha);
CREATE INDEX IF NOT EXISTS idx_mesas_territorio ON mesas_trabajo.mesas(territorio_id);
CREATE INDEX IF NOT EXISTS idx_mesas_dimension ON mesas_trabajo.mesas(dimension_principal_id);

-- Trigger de actualización temporal
CREATE OR REPLACE TRIGGER trg_actualizar_mesas
BEFORE UPDATE ON mesas_trabajo.mesas
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_temporal();

-- ============================================================================
-- POBLAMIENTO OFICIAL: 26 MESAS DEL PLAN DE DESARROLLO DE CARTAGENA
-- ============================================================================

DO $$
DECLARE
    -- IDs de Territorios
    v_distrito UUID;
    v_loc1 UUID;
    v_loc2 UUID;
    v_loc3 UUID;
    v_boquilla UUID;
    v_pasacaballos UUID;
    v_bayunca UUID;
    v_tierrabomba UUID;
    v_baru UUID;
    v_rosario UUID;
    
    -- IDs de Dimensiones
    v_dim_econ UUID;
    v_dim_alim UUID;
    v_dim_salud UUID;
    v_dim_amb UUID;
    v_dim_pers UUID;
    v_dim_com UUID;
    v_dim_pol UUID;
BEGIN
    -- 1. Resolver Territorios
    SELECT id INTO v_distrito FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG';
    SELECT id INTO v_loc1 FROM geodatos.territorios WHERE codigo = 'LOC-1';
    SELECT id INTO v_loc2 FROM geodatos.territorios WHERE codigo = 'LOC-2';
    SELECT id INTO v_loc3 FROM geodatos.territorios WHERE codigo = 'LOC-3';
    SELECT id INTO v_boquilla FROM geodatos.territorios WHERE codigo = 'CORR-BOQUILLA';
    SELECT id INTO v_pasacaballos FROM geodatos.territorios WHERE codigo = 'CORR-PASACABALLOS';
    SELECT id INTO v_bayunca FROM geodatos.territorios WHERE codigo = 'CORR-BAYUNCA';
    SELECT id INTO v_tierrabomba FROM geodatos.territorios WHERE codigo = 'INS-TIERRABOMBA';
    SELECT id INTO v_baru FROM geodatos.territorios WHERE codigo = 'INS-BARU';
    SELECT id INTO v_rosario FROM geodatos.territorios WHERE codigo = 'INS-ROSARIO';

    -- 2. Resolver Dimensiones
    SELECT id INTO v_dim_econ FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'economica';
    SELECT id INTO v_dim_alim FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'alimentaria';
    SELECT id INTO v_dim_salud FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'salud';
    SELECT id INTO v_dim_amb FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'ambiental';
    SELECT id INTO v_dim_pers FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'personal';
    SELECT id INTO v_dim_com FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria';
    SELECT id INTO v_dim_pol FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'politica';

    -- ========================================================================
    -- BLOQUE 1: MESAS TERRITORIALES (MT)
    -- ========================================================================
    INSERT INTO mesas_trabajo.mesas (
        codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug, nombre, tipo_mesa,
        territorio_id, lugar_nombre, coordenadas, dimension_principal_id, enfoque_poblacional,
        es_consulta_previa, modalidad, fecha, horario, aforo_presencial, estado
    ) VALUES
    (
        'MT-L01-01', 'MT101', 'csh.mt.loc1', 'localidad-historica-caribe-norte',
        'Mesa Territorial Localidad Histórica y del Caribe Norte', 'TERRITORIAL',
        v_loc1, 'SENA Plaza de la Aduana, Auditorio Rodolfo Martínez',
        ST_SetSRID(ST_MakePoint(-75.5489, 10.4225), 4326),
        v_dim_com, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-01', '8:30 am - 12:00 m', 250, 'PROGRAMADA'
    ),
    (
        'MT-L02-01', 'MT201', 'csh.mt.loc2', 'localidad-de-la-virgen-y-turistica',
        'Mesa Territorial Localidad De La Virgen y Turística', 'TERRITORIAL',
        v_loc2, 'Sala de Juntas, Estadio Jaime Morón',
        ST_SetSRID(ST_MakePoint(-75.4983, 10.3995), 4326),
        v_dim_pers, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-02', '8:30 am - 12:00 m', 250, 'PROGRAMADA'
    ),
    (
        'MT-L03-01', 'MT301', 'csh.mt.loc3', 'localidad-industrial-y-de-la-bahia',
        'Mesa Territorial Localidad Industrial y de la Bahía', 'TERRITORIAL',
        v_loc3, 'Institución Educativa Nelson Mandela',
        ST_SetSRID(ST_MakePoint(-75.4795, 10.3702), 4326),
        v_dim_econ, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-03', '8:30 am - 12:00 m', 300, 'PROGRAMADA'
    )
    ON CONFLICT (codigo_oficial) DO UPDATE SET
        lugar_nombre = EXCLUDED.lugar_nombre,
        coordenadas = EXCLUDED.coordenadas;

    -- ========================================================================
    -- BLOQUE 2: MESAS RURALES E INSULARES (MR)
    -- ========================================================================
    INSERT INTO mesas_trabajo.mesas (
        codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug, nombre, tipo_mesa,
        territorio_id, lugar_nombre, coordenadas, dimension_principal_id, enfoque_poblacional,
        es_consulta_previa, modalidad, fecha, horario, aforo_presencial, estado
    ) VALUES
    ('MR-RUR-01', 'MR101', 'csh.mr.boquilla', 'mesa-la-boquilla', 'Mesa Rural La Boquilla', 'RURAL_INSULAR',
     v_boquilla, 'Centro Cultural de La Boquilla', ST_SetSRID(ST_MakePoint(-75.5005, 10.4735), 4326),
     v_dim_amb, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-06', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MR-RUR-02', 'MR102', 'csh.mr.arroyopiedra', 'mesa-arroyo-de-piedra', 'Mesa Rural Arroyo de Piedra', 'RURAL_INSULAR',
     v_loc1, 'Institución Educativa Arroyo de Piedra', ST_SetSRID(ST_MakePoint(-75.3340, 10.6380), 4326),
     v_dim_alim, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-06', '8:30 am - 12:00 m', 120, 'PROGRAMADA'),

    ('MR-RUR-03', 'MR103', 'csh.mr.puntacanoa', 'mesa-punta-canoa', 'Mesa Rural Punta Canoa', 'RURAL_INSULAR',
     v_loc1, 'Institución Educativa Punta Canoa', ST_SetSRID(ST_MakePoint(-75.4670, 10.5510), 4326),
     v_dim_amb, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-06', '8:30 am - 12:00 m', 100, 'PROGRAMADA'),

    ('MR-RUR-04', 'MR104', 'csh.mr.bayunca', 'mesa-bayunca', 'Mesa Rural Bayunca', 'RURAL_INSULAR',
     v_bayunca, 'Institución Educativa de Bayunca', ST_SetSRID(ST_MakePoint(-75.4310, 10.4790), 4326),
     v_dim_com, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-05', '8:30 am - 12:00 m', 200, 'PROGRAMADA'),

    ('MR-RUR-05', 'MR105', 'csh.mr.pasacaballos', 'mesa-pasacaballos', 'Mesa Rural Pasacaballos', 'RURAL_INSULAR',
     v_pasacaballos, 'Institución Técnica de Pasacaballos', ST_SetSRID(ST_MakePoint(-75.5130, 10.2970), 4326),
     v_dim_amb, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-05', '8:30 am - 12:00 m', 200, 'PROGRAMADA'),

    ('MR-RUR-06', 'MR106', 'csh.mr.arroyogrande', 'mesa-arroyo-grande', 'Mesa Rural Arroyo Grande', 'RURAL_INSULAR',
     v_loc1, 'Institución Educativa de Arroyo Grande', ST_SetSRID(ST_MakePoint(-75.3120, 10.6890), 4326),
     v_dim_alim, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-05', '8:30 am - 12:00 m', 120, 'PROGRAMADA'),

    ('MR-ISL-07', 'MR107', 'csh.mr.santaana', 'mesa-santa-ana-baru', 'Mesa Insular Santa Ana (Barú)', 'RURAL_INSULAR',
     v_baru, 'Institución Educativa Barbacoas', ST_SetSRID(ST_MakePoint(-75.5920, 10.2450), 4326),
     v_dim_econ, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-08', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MR-ISL-08', 'MR108', 'csh.mr.tierrabomba', 'mesa-tierra-bomba', 'Mesa Insular Tierra Bomba', 'RURAL_INSULAR',
     v_tierrabomba, 'Institución Educativa Tierra Bomba', ST_SetSRID(ST_MakePoint(-75.5800, 10.3550), 4326),
     v_dim_com, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-08', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MR-ISL-09', 'MR109', 'csh.mr.bocachica', 'mesa-bocachica', 'Mesa Insular Bocachica', 'RURAL_INSULAR',
     v_tierrabomba, 'Institución Educativa Domingo Benkos Biohó', ST_SetSRID(ST_MakePoint(-75.6050, 10.3190), 4326),
     v_dim_com, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-09', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MR-ISL-10', 'MR110', 'csh.mr.rosario', 'mesa-islas-del-rosario', 'Mesa Insular Archipiélago del Rosario', 'RURAL_INSULAR',
     v_rosario, 'Institución Educativa Isla Rosario', ST_SetSRID(ST_MakePoint(-75.7480, 10.1750), 4326),
     v_dim_amb, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-10', '8:30 am - 12:00 m', 100, 'PROGRAMADA'),

    ('MR-ISL-11', 'MR111', 'csh.mr.islafuerte', 'mesa-isla-fuerte', 'Mesa Insular Isla Fuerte', 'RURAL_INSULAR',
     v_distrito, 'Institución Educativa Isla Fuerte', ST_SetSRID(ST_MakePoint(-76.1780, 9.3870), 4326),
     v_dim_amb, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-11', '8:30 am - 12:00 m', 80, 'PROGRAMADA')
    ON CONFLICT (codigo_oficial) DO UPDATE SET
        lugar_nombre = EXCLUDED.lugar_nombre,
        coordenadas = EXCLUDED.coordenadas;

    -- ========================================================================
    -- BLOQUE 3: MESAS POBLACIONALES Y ENFOQUE DIFERENCIAL (MP)
    -- ========================================================================
    INSERT INTO mesas_trabajo.mesas (
        codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug, nombre, tipo_mesa,
        territorio_id, lugar_nombre, coordenadas, dimension_principal_id, enfoque_poblacional,
        es_consulta_previa, modalidad, fecha, horario, aforo_presencial, estado
    ) VALUES
    ('MP-POB-01', 'MP101', 'csh.mp.adulto_mayor', 'mesa-adulto-mayor', 'Mesa Poblacional de Adulto Mayor', 'POBLACIONAL',
     v_distrito, 'Concejo Distrital de Cartagena', ST_SetSRID(ST_MakePoint(-75.5492, 10.4231), 4326),
     v_dim_salud, 'ADULTO_MAYOR', FALSE, 'HIBRIDA_DIGITAL', '2026-02-10', '8:30 am - 12:00 m', 100, 'PROGRAMADA'),

    ('MP-POB-02', 'MP102', 'csh.mp.infancia', 'mesa-infancia-adolescencia', 'Mesa Poblacional de Infancia y Adolescencia (Prevención ESCNNA)', 'POBLACIONAL',
     v_loc1, 'Universidad del Sinú (Sede Pie de la Popa)', ST_SetSRID(ST_MakePoint(-75.5320, 10.4190), 4326),
     v_dim_pers, 'INFANCIA', FALSE, 'HIBRIDA_DIGITAL', '2026-02-10', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MP-POB-03', 'MP103', 'csh.mp.lgtbi', 'mesa-diversidad-lgtbiq', 'Mesa Poblacional LGTBIQ+', 'POBLACIONAL',
     v_loc2, 'Estadio Jaime Morón', ST_SetSRID(ST_MakePoint(-75.4983, 10.3995), 4326),
     v_dim_pol, 'LGTBIQ', FALSE, 'HIBRIDA_DIGITAL', '2026-02-18', '8:30 am - 12:00 m', 100, 'PROGRAMADA'),

    ('MP-POB-04', 'MP104', 'csh.mp.discapacidad', 'mesa-personas-con-discapacidad', 'Mesa Poblacional de Personas con Discapacidad y Cuidadores', 'POBLACIONAL',
     v_loc2, 'Estadio Jaime Morón', ST_SetSRID(ST_MakePoint(-75.4983, 10.3995), 4326),
     v_dim_salud, 'DISCAPACIDAD', FALSE, 'HIBRIDA_DIGITAL', '2026-02-18', '8:30 am - 12:00 m', 120, 'PROGRAMADA'),

    ('MP-POB-05', 'MP105', 'csh.mp.juventud', 'mesa-juventudes', 'Mesa Poblacional de Juventudes', 'POBLACIONAL',
     v_loc1, 'Universidad del Sinú (Sede Pie de la Popa)', ST_SetSRID(ST_MakePoint(-75.5320, 10.4190), 4326),
     v_dim_econ, 'JUVENTUD', FALSE, 'HIBRIDA_DIGITAL', '2026-02-11', '2:30 pm - 5:00 pm', 200, 'PROGRAMADA'),

    ('MP-POB-06', 'MP106', 'csh.mp.mujeres', 'mesa-mujeres-genero', 'Mesa Poblacional de Mujeres y Equidad de Género', 'POBLACIONAL',
     v_loc1, 'Universidad de Cartagena, Claustro San Agustín, Aula Máxima', ST_SetSRID(ST_MakePoint(-75.5495, 10.4240), 4326),
     v_dim_pers, 'MUJERES', FALSE, 'HIBRIDA_DIGITAL', '2026-02-11', '2:30 pm - 5:00 pm', 250, 'PROGRAMADA'),

    ('MP-POB-07', 'MP107', 'csh.mp.victimas', 'mesa-victimas-conflicto', 'Mesa Poblacional de Víctimas del Conflicto Armado (Ley 1448)', 'POBLACIONAL',
     v_loc2, 'Centro de Atención a la Familia - Barrio Bicentenario', ST_SetSRID(ST_MakePoint(-75.4650, 10.4120), 4326),
     v_dim_pers, 'VICTIMAS', FALSE, 'HIBRIDA_DIGITAL', '2026-02-12', '8:30 am - 12:00 m', 200, 'PROGRAMADA'),

    ('MP-ETN-08', 'MP108', 'csh.mp.etnica', 'mesa-etnica-afro-indigena', 'Mesa Étnica: Consejos Comunitarios y Cabildos Indígenas', 'POBLACIONAL',
     v_distrito, 'Complejo de Raquetas de Cartagena', ST_SetSRID(ST_MakePoint(-75.5350, 10.4200), 4326),
     v_dim_pol, 'ETNICO', TRUE, 'HIBRIDA_DIGITAL', '2026-02-12', '2:30 pm - 5:00 pm', 300, 'PROGRAMADA')
    ON CONFLICT (codigo_oficial) DO UPDATE SET
        lugar_nombre = EXCLUDED.lugar_nombre,
        coordenadas = EXCLUDED.coordenadas;

    -- ========================================================================
    -- BLOQUE 4: MESAS SECTORIALES (MS)
    -- ========================================================================
    INSERT INTO mesas_trabajo.mesas (
        codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug, nombre, tipo_mesa,
        territorio_id, lugar_nombre, coordenadas, dimension_principal_id, enfoque_poblacional,
        es_consulta_previa, modalidad, fecha, horario, aforo_presencial, estado
    ) VALUES
    ('MS-SEC-01', 'MS101', 'csh.ms.cultura', 'mesa-cultura-patrimonio', 'Mesa Sectorial de Cultura y Patrimonio Histórico', 'SECTORIAL',
     v_distrito, 'Teatro Adolfo Mejía - Salón Foyer', ST_SetSRID(ST_MakePoint(-75.5510, 10.4248), 4326),
     v_dim_com, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-16', '8:30 am - 12:00 m', 120, 'PROGRAMADA'),

    ('MS-SEC-02', 'MS102', 'csh.ms.deporte', 'mesa-deporte-recreacion', 'Mesa Sectorial de Deporte y Recreación Comunitaria', 'SECTORIAL',
     v_loc2, 'Coliseo Napoleón Perea - Salón Cartagena de Indias', ST_SetSRID(ST_MakePoint(-75.5050, 10.4010), 4326),
     v_dim_salud, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-16', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MS-SEC-03', 'MS103', 'csh.ms.salud', 'mesa-salud-seguridad-social', 'Mesa Sectorial de Salud Pública y Red Hospitalaria', 'SECTORIAL',
     v_distrito, 'Alcaldía de Cartagena - Salón Vicente Martínez', ST_SetSRID(ST_MakePoint(-75.5490, 10.4230), 4326),
     v_dim_salud, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-15', '8:30 am - 12:00 m', 100, 'PROGRAMADA'),

    ('MS-SEC-04', 'MS104', 'csh.ms.educacion', 'mesa-educacion-calidad', 'Mesa Sectorial de Educación y Cobertura', 'SECTORIAL',
     v_loc1, 'CASD Manuela Beltrán', ST_SetSRID(ST_MakePoint(-75.5390, 10.4210), 4326),
     v_dim_econ, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-16', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MS-SEC-05', 'MS105', 'csh.ms.movilidad', 'mesa-movilidad-espacio-publico', 'Mesa Sectorial de Movilidad, Transporte y Espacio Público', 'SECTORIAL',
     v_distrito, 'SENA Plaza de la Aduana', ST_SetSRID(ST_MakePoint(-75.5489, 10.4225), 4326),
     v_dim_com, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-16', '2:30 pm - 5:00 pm', 150, 'PROGRAMADA'),

    ('MS-SEC-06', 'MS106', 'csh.ms.servicios_publicos', 'mesa-servicios-publicos-vivienda', 'Mesa Sectorial de Servicios Públicos, Infraestructura y Vivienda Digna', 'SECTORIAL',
     v_loc1, 'Sociedad de Ingenieros y Arquitectos de Bolívar', ST_SetSRID(ST_MakePoint(-75.5410, 10.4180), 4326),
     v_dim_amb, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-16', '2:30 pm - 5:00 pm', 120, 'PROGRAMADA'),

    ('MS-SEC-07', 'MS107', 'csh.ms.seguridad', 'mesa-seguridad-convivencia', 'Mesa Sectorial de Seguridad Integral y Convivencia Ciudadana', 'SECTORIAL',
     v_distrito, 'SENA Plaza de la Aduana', ST_SetSRID(ST_MakePoint(-75.5489, 10.4225), 4326),
     v_dim_pers, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-17', '2:30 pm - 5:00 pm', 250, 'PROGRAMADA'),

    ('MS-SEC-08', 'MS108', 'csh.ms.medio_ambiente', 'mesa-medio-ambiente-cienaga', 'Mesa Sectorial de Medio Ambiente, Ciénaga de la Virgen y Gestión del Riesgo', 'SECTORIAL',
     v_distrito, 'SENA Plaza de la Aduana', ST_SetSRID(ST_MakePoint(-75.5489, 10.4225), 4326),
     v_dim_amb, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-17', '8:30 am - 12:00 m', 200, 'PROGRAMADA'),

    ('MS-SEC-09', 'MS109', 'csh.ms.desarrollo_economico', 'mesa-desarrollo-turismo-empleo', 'Mesa Sectorial de Desarrollo Económico, Turismo Sostenible y Competitividad', 'SECTORIAL',
     v_distrito, 'Cámara de Comercio de Cartagena - Sede Centro', ST_SetSRID(ST_MakePoint(-75.5480, 10.4245), 4326),
     v_dim_econ, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-17', '8:00 am - 1:00 pm', 180, 'PROGRAMADA'),

    ('MS-SEC-10', 'MS110', 'csh.ms.transparencia', 'mesa-transparencia-anticorrupcion', 'Mesa Sectorial de Transparencia, Veeduría y Cultura Ciudadana', 'SECTORIAL',
     v_distrito, 'SENA Plaza de la Aduana', ST_SetSRID(ST_MakePoint(-75.5489, 10.4225), 4326),
     v_dim_pol, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-19', '8:30 am - 12:00 m', 150, 'PROGRAMADA'),

    ('MS-SEC-11', 'MS111', 'csh.ms.paz', 'mesa-construccion-de-paz', 'Mesa Sectorial de Construcción de Paz y Reconciliación', 'SECTORIAL',
     v_loc1, 'Instalaciones de la Agencia para la Reincorporación y Normalización (Cra 19 N 24A-93, Manga)', ST_SetSRID(ST_MakePoint(-75.5370, 10.4130), 4326),
     v_dim_pol, 'GENERAL', FALSE, 'HIBRIDA_DIGITAL', '2026-02-19', '2:30 pm - 5:00 pm', 120, 'PROGRAMADA')
    ON CONFLICT (codigo_oficial) DO UPDATE SET
        lugar_nombre = EXCLUDED.lugar_nombre,
        coordenadas = EXCLUDED.coordenadas;

    RAISE NOTICE '¡Éxito! 26 Mesas de Co-creación creadas y georreferenciadas en mesas_trabajo.mesas.';
END $$;
