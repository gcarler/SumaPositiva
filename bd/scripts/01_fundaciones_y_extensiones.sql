-- =============================================================================
-- POLIS: Base de Datos bd_csh (Cartagena Seguridad Humana)
-- Script 01: Extensiones, Esquemas y Función Generadora de UUIDv7
-- =============================================================================

-- 1. Extensiones Oficiales Requeridas
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Creación de Esquemas en Español Estricto
CREATE SCHEMA IF NOT EXISTS motor_politicas;
CREATE SCHEMA IF NOT EXISTS geodatos;
CREATE SCHEMA IF NOT EXISTS participacion_ciudadana;
CREATE SCHEMA IF NOT EXISTS mesas_trabajo;
CREATE SCHEMA IF NOT EXISTS motor_instrumentos;
CREATE SCHEMA IF NOT EXISTS grafo_entidades;
CREATE SCHEMA IF NOT EXISTS auditoria;

COMMENT ON SCHEMA motor_politicas IS 'Dominio de políticas públicas, fases, 7 dimensiones de seguridad humana y líneas estratégicas';
COMMENT ON SCHEMA geodatos IS 'Dominio territorial y geoespacial del Distrito de Cartagena (PostGIS EPSG:4326), indicadores y capas';
COMMENT ON SCHEMA participacion_ciudadana IS 'Dominio de participación ciudadana: propuestas, alertas comunitarias, observaciones e interacciones';
COMMENT ON SCHEMA mesas_trabajo IS 'Dominio de mesas de trabajo deliberativas y submesas jerárquicas mediante ltree, actas y asistentes';
COMMENT ON SCHEMA motor_instrumentos IS 'Dominio de instrumentos polimórficos: árboles de problemas/soluciones, DOFA y encuestas tipo FormBuilder';
COMMENT ON SCHEMA grafo_entidades IS 'Dominio de acoplamiento universal: relaciones polimórficas entre cualquier entidad del sistema';
COMMENT ON SCHEMA auditoria IS 'Dominio de trazabilidad inmutable de eventos, cambios y accesos de servidores públicos';

-- 3. Función Generadora de UUIDv7 (RFC 9562)
-- Genera identificadores UUID versión 7 ordenados cronológicamente por milisegundos
-- para máxima eficiencia de indexación B-Tree en inserciones masivas.
CREATE OR REPLACE FUNCTION generar_uuid_v7()
RETURNS uuid
AS $$
DECLARE
  v_time timestamp with time zone := clock_timestamp();
  v_epoch bigint;
  v_bytes bytea;
BEGIN
  -- Epoch Unix en milisegundos (48 bits)
  v_epoch := (extract(epoch from v_time) * 1000)::bigint;

  -- 16 bytes pseudoaleatorios criptográficamente seguros
  v_bytes := gen_random_bytes(16);

  -- Escribir timestamp en los primeros 6 bytes (big-endian)
  v_bytes := set_byte(v_bytes, 0, (v_epoch >> 40 & 255)::int);
  v_bytes := set_byte(v_bytes, 1, (v_epoch >> 32 & 255)::int);
  v_bytes := set_byte(v_bytes, 2, (v_epoch >> 24 & 255)::int);
  v_bytes := set_byte(v_bytes, 3, (v_epoch >> 16 & 255)::int);
  v_bytes := set_byte(v_bytes, 4, (v_epoch >> 8 & 255)::int);
  v_bytes := set_byte(v_bytes, 5, (v_epoch & 255)::int);

  -- Fijar versión 7 (0b0111 = 0x70) en el byte 6 (nibble más significativo)
  v_bytes := set_byte(v_bytes, 6, ((get_byte(v_bytes, 6) & 15) | 112)::int);

  -- Fijar variante RFC 9562 / 4122 (0b10xxxxxx = 0x80) en el byte 8
  v_bytes := set_byte(v_bytes, 8, ((get_byte(v_bytes, 8) & 63) | 128)::int);

  RETURN encode(v_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION generar_uuid_v7() IS 'Generador de claves primarias UUIDv7 ordenadas temporalmente en milisegundos (RFC 9562)';

-- 4. Función de Disparador para Actualización Automática de Marcas Temporales
CREATE OR REPLACE FUNCTION actualizar_marca_temporal()
RETURNS trigger
AS $$
BEGIN
  NEW.actualizado_en = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_marca_temporal() IS 'Disparador para actualizar automáticamente la columna actualizado_en en modificaciones';
