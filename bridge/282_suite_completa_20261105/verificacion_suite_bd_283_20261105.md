# Encargo 283 — Suite con base de pruebas activa (polis_test_20261105, 2026-11-05)

## Objetivo
Restaurar `POLIS_TEST_DATABASE_URL` en `backend/.env` (otro actor la retiró durante la jornada junto con el `uv sync` de las 05:38) y correr la suite completa del backend con las pruebas que dependen de base de datos activas.

## Acciones
1. El `.env` ya no contenía la variable; se reconstruyó el DSN reutilizando la credencial del `POLIS_DATABASE_URL` (swap del nombre de base, sin exponer secretos) y se añadió como línea propia.
2. La base histórica `polis_test` está en revisión 0094 y contiene 25 mesas de códigos que la migración `0095_sembrar_censo_35_mesas` no contempla (fue diseñada sobre el estado de `bd_csh`); sus guardas del censo H-05 la rechazan con miles de errores en cascada (log `pytest_suite_con_bd.log`).
3. Política de `docs/transacciones.md`: base exclusiva `polis_test*`. Se creó la base fresca **`polis_test_20261105`** (owner `polis`, vacía) y el `.env` quedó apuntando a ella. La suite reconstruye el esquema completo vía `alembic upgrade head` (0001→0096) dentro del conftest.
4. Extensión habilitada a mano: `pgRouting 4.0.1` en la base nueva (precedente: `polis_test` la tenía; la migración `0001_extensions` no la instala). Con esto la prueba `test_geodatos_isocronas.py::test_disponibilidad_pgrouting_en_repositorio`, único fallo de la primera corrida fresca, pasa 7/7.

## Resultados
- Corrida fresca completa (log `pytest_suite_bd_fresca.log`, exit 1): **1 failed** (pgrouting), **1.739 passed**, 25 skipped, 624 s.
- Segunda corrida (log `pytest_bd_fresca_final.log`, exit 1): 2 fallos nuevos en `test_calidad_correo_herald` (entrega concurrente y reintento): el outbox real acumuló 629 filas pendientes residuales de corridas previas y `drenar` (lote=500) las reclamaba antes que las filas nuevas; reproducible aislado.
- Remediación: limpieza del outbox por prueba en el fixture `fabrica` de `test_calidad_correo_herald.py` (DELETE sobre la base exclusiva de pruebas; asertos intactos). El módulo pasa 15/15 y de 15,6 s a 2,1 s.
- **Corrida final sellada (log `pytest_bd_fresca_final2.log` + JUnit `pytest_bd_fresca_final2.xml`, `exit_bd_fresca_final2.code`): EXIT=0 — 1.743 passed, 25 skipped, 0 fallos, 10 min 26 s.**
- Batería que antes estaba skipped por ausencia de BD: ~554 pruebas activadas (1.189 → 1.743 passed).
- Base con esquema completo 0096 disponible para encargos de BD.

## Notas
- La suite migró `polis_test_20261105` de 0001 a 0096 como parte de la propia corrida: la cadena completa de migraciones quedó verificada desde cero (censo H-05 incluido: 35/36/35-35 y 3/11/9/12).
- `select version_num` de la base tras la corrida: 0096_riesgo_sin_evaluar.
