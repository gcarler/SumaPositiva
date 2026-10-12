# DICTAMEN EAF — [CIERRE-01] Integración de la migración 0023_asistencia_multicanal

**Auditor:** `agy` — **Desarrollador:** `agy2` — **Commit evaluado:** `22421e1` — **Fecha:** 12-oct-2026
**Dictamen:** ✅ APROBADO CON OBSERVACIONES MENORES

## Verificado de forma independiente
- Árbol de trabajo limpio; cabeza única de Alembic (`0057_comentario_pas`); `alembic check`: sin operaciones pendientes.
- Backend: **492 pruebas pasan** (290 s). Frontend: 500 (reporte de agy2; sin cambios de frontend).
- Censo `bd_csh` intacto: 33 mesas, 36 agendas, 11 fichas, 17 actores.
- La migración 0023 ya no altera permisos de `auditor_forense` (se eliminó la mutación espuria del `downgrade`); el modelo `EscenarioEspecial` está registrado y probado.

## Observaciones (a corregir en CIERRE-02, sin bloquear)
1. `test_lineaje_alembic_0023_linear_y_cabeza_unica` fija la cabeza en `"0057_comentario_pas"`: se romperá con la próxima migración. Debe comprobar solo cabeza única y que 0023 esté encadenada.
2. `test_migracion_0023_no_modifica_permisos_auditor_forense` es una búsqueda de texto sobre el archivo; mejor un test que ejecute upgrade/downgrade en base aislada y compare permisos del rol.
3. El cambio real fue mínimo (solo `downgrade`); `docs/plan-trabajo.md` describe «registrado» y «0022 -> 0023 -> 0024» como logros de este commit, cuando ya existían. Ajustar el texto para no sobrerrepresentar el alcance.

## Autorización
Se autoriza **CIERRE-02**. Recordatorio: no aplicar nada en producción ni tocar `bd_csh`, SMTP real ni cuentas existentes; solo runbook, scripts y pruebas en base aislada.
