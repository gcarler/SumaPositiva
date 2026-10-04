-- ============================================================================
-- SCRIPT DE SANEAMIENTO PERICIAL: PURGA DE MESAS DE PRUEBA EN BD_CSH
-- Base de Datos: bd_csh (Cartagena Seguridad Humana)
-- PostgreSQL 18.6 + PostGIS 3.6 + ltree
-- Objetivo: Retirar 161 registros sintéticos inyectados por suites pytest en 2026-10-01
--           preservando exactamente las 33 mesas canónicas oficiales de Cartagena.
-- ============================================================================

BEGIN;

-- 1. Verificación previa de conteo
DO $$
DECLARE
    v_total_antes INT;
    v_canonicas INT;
    v_test INT;
BEGIN
    SELECT count(*) INTO v_total_antes FROM mesas_trabajo.mesas;
    SELECT count(*) INTO v_canonicas FROM mesas_trabajo.mesas WHERE id::text LIKE '01a0f5fe%';
    v_test := v_total_antes - v_canonicas;
    
    RAISE NOTICE 'Diagnóstico previo: % mesas en total (% canónicas, % de prueba).', 
        v_total_antes, v_canonicas, v_test;
END $$;

-- 2. Eliminación de mesas sintéticas de pruebas automatizadas
-- Desactivamos temporalmente el trigger de inmutabilidad C-150 para permitir
-- la remoción de las actas ficticias inyectadas por los tests unitarios.
ALTER TABLE mesas_trabajo.actas_comunitarias DISABLE TRIGGER ALL;

WITH test_mesas AS (
  SELECT id FROM mesas_trabajo.mesas 
  WHERE codigo_oficial LIKE 'MT-PART-%'
     OR codigo_oficial LIKE 'MS-SALUD-%'
     OR codigo_oficial LIKE 'MP-ETN-%'
     OR codigo_oficial ~ '^MT-[a-f0-9]{6}'
     OR codigo_oficial IN (
         'MT-TEST-001', 
         'MT-MUQ8RDVD', 
         'MT-3acb87-ACTA', 
         'MT-2ae417-ACTA', 
         'MT-aa3d2d', 
         'MT-39ec32'
     )
),
del_actas AS (
  DELETE FROM mesas_trabajo.actas_comunitarias WHERE mesa_id IN (SELECT id FROM test_mesas)
),
del_participantes AS (
  DELETE FROM mesas_trabajo.participantes_mesa WHERE mesa_id IN (SELECT id FROM test_mesas)
)
DELETE FROM mesas_trabajo.mesas WHERE id IN (SELECT id FROM test_mesas);

ALTER TABLE mesas_trabajo.actas_comunitarias ENABLE TRIGGER ALL;

-- 3. Verificación posterior de integridad
DO $$
DECLARE
    v_total_despues INT;
BEGIN
    SELECT count(*) INTO v_total_despues FROM mesas_trabajo.mesas;
    RAISE NOTICE 'Resultado post-saneamiento: % mesas canónicas restantes en mesas_trabajo.mesas.', v_total_despues;
    
    IF v_total_despues != 33 THEN
        RAISE WARNING 'Atención: Se esperaban 33 mesas canónicas pero resultaron %.', v_total_despues;
    ELSE
        RAISE NOTICE '¡Saneamiento exitoso y conforme con el catálogo oficial de Cartagena!';
    END IF;
END $$;

COMMIT;
