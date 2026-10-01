-- =============================================================================
-- POLIS: Base de Datos bd_csh (Cartagena Seguridad Humana)
-- Script 02: Dominio de Políticas Públicas (motor_politicas)
-- =============================================================================

SET search_path TO motor_politicas, public;

-- 1. Tabla: dimensiones_seguridad_humana
-- Las 7 dimensiones canónicas de la Seguridad Humana de la ONU aplicadas al Distrito de Cartagena
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
);

COMMENT ON TABLE motor_politicas.dimensiones_seguridad_humana IS 'Las 7 dimensiones de la Seguridad Humana (ONU/DNP) que estructuran el diagnóstico y metas de Cartagena';
COMMENT ON COLUMN motor_politicas.dimensiones_seguridad_humana.codigo IS 'Identificador textual corto: economica, alimentaria, salud, ambiental, personal, comunitaria, politica';

-- 2. Tabla: fases_politica
-- Motor de fases del ciclo de la política pública con reglas dinámicas en JSONB
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
);

COMMENT ON TABLE motor_politicas.fases_politica IS 'Fases dinámicas del ciclo de vida de la Política Pública de Seguridad Humana de Cartagena';
COMMENT ON COLUMN motor_politicas.fases_politica.reglas_participacion IS 'Reglas de negocio parametrizables para la participación ciudadana en cada fase';

-- 3. Tabla: lineas_estrategicas
-- Ejes de intervención que transforman los problemas identificados en soluciones concretas
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
);

COMMENT ON TABLE motor_politicas.lineas_estrategicas IS 'Líneas estratégicas asociadas a fases, dimensiones de seguridad humana y fuentes de financiación';
COMMENT ON COLUMN motor_politicas.lineas_estrategicas.fuentes_financiacion IS 'Fuentes presupuestales en Colombia: FONSET, SGP, SGR, ICLD, Cooperación';

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_lineas_fase ON motor_politicas.lineas_estrategicas(fase_id);
CREATE INDEX IF NOT EXISTS idx_lineas_dimension ON motor_politicas.lineas_estrategicas(dimension_id);
CREATE INDEX IF NOT EXISTS idx_lineas_metadatos_gin ON motor_politicas.lineas_estrategicas USING GIN (metadatos);

-- Disparadores de actualización temporal
CREATE OR REPLACE TRIGGER trg_actualizar_dimensiones
    BEFORE UPDATE ON motor_politicas.dimensiones_seguridad_humana
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal();

CREATE OR REPLACE TRIGGER trg_actualizar_fases
    BEFORE UPDATE ON motor_politicas.fases_politica
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal();

CREATE OR REPLACE TRIGGER trg_actualizar_lineas
    BEFORE UPDATE ON motor_politicas.lineas_estrategicas
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_marca_temporal();

-- =============================================================================
-- DATOS SEMILLA: 7 Dimensiones de Seguridad Humana y Fases de Cartagena
-- =============================================================================

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
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, color_hex = EXCLUDED.color_hex;

INSERT INTO motor_politicas.fases_politica (orden, codigo, nombre, descripcion, estado, progreso_porcentaje, fecha_inicio, fecha_cierre)
VALUES
    (1, 'FASE_1_DIAGNOSTICO', 'Fase 1: Alistamiento y Diagnóstico Participativo', 'Levantamiento de línea base, geovisor de conflictividad, alertas tempranas SAT y mesas territoriales en las 3 localidades y zona insular.', 'activa', 35.00, '2026-02-01', '2026-06-30'),
    (2, 'FASE_2_FORMULACION', 'Fase 2: Formulación de Alternativas y Líneas Estratégicas', 'Co-creación de árboles de soluciones, recepción de propuestas ciudadanas y concertación de alternativas con actores clave.', 'preparatoria', 0.00, '2026-07-01', '2026-10-31'),
    (3, 'FASE_3_PLAN_ACCION', 'Fase 3: Plan de Acción e Inversión (FONSET / MPI)', 'Costeo de metas cuatrienales, asignación presupuestal del FONSET, regalías OCAD y adopción jurídica mediante Acuerdo Distrital.', 'preparatoria', 0.00, '2026-11-01', '2026-12-31')
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, estado = EXCLUDED.estado;
