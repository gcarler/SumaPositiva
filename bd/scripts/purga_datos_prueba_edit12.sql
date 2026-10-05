-- SCRIPT DE PURGA DE DATOS DE PRUEBA — TAREA EDIT-12
-- AUTORIZADA POR EL USUARIO Y VALIDADA EN TRANSACCIÓN CON ROLLBACK PREVIO

BEGIN;

  -- 1. Purgar 227 propuestas ciudadanas de prueba (cascada automática a 130 apoyos)
  DELETE FROM participacion_ciudadana.propuestas_ciudadanas
  WHERE creado_en::date = '2026-10-01';

  -- 2. Purgar 122 instrumentos sintéticos (cascada automática a 302 nodos hijos)
  DELETE FROM motor_instrumentos.instrumentos
  WHERE NOT (id::text LIKE '01a0f682-524%') 
    AND creado_en::date = '2026-10-01';

  -- 3. Purgar 12 asignaciones presupuestales duplicadas (preservando las 2 originales)
  WITH filas_a_mantener AS (
      SELECT (array_agg(id ORDER BY creado_en ASC))[1] AS id_a_preservar
      FROM presupuesto.asignaciones_presupuestales
      GROUP BY fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion
  )
  DELETE FROM presupuesto.asignaciones_presupuestales
  WHERE id NOT IN (SELECT id_a_preservar FROM filas_a_mantener);

COMMIT;
