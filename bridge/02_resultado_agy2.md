# Resultado de Ejecución — AGY2 (`=agy2:0.0`) — Fase `[24B]`

- **ID de Tarea**: `Fase [24B]` (`Persistencia Transaccional PostgreSQL seguimiento.pdt_ai_evaluaciones + seguimiento.pdt_ai_checkpoints_hitl y Endpoint /historial-auditoria`)
- **Fecha / Hora UTC**: `2026-10-18T16:53:30Z`
- **Agente Ejecutor**: `agy2` (`=agy2:0.0`)
- **Estado**: **COMPLETADO — LISTO PARA AUDITORÍA EAF (`=agy:0.0`)**

---

## 1. Archivos Creados / Actualizados (Aislamiento Estricto Cumplido)

1. `backend/app/modules/compromisos/pdt_persistencia_pg.py` (**CREADO Y EJECUTADO**)
   - Crea y gestiona de forma idempotente en PostgreSQL (`bd_csh`, esquema `seguimiento`) las dos tablas transaccionales:
     - `seguimiento.pdt_ai_evaluaciones` (`id`, `thread_id UNIQUE`, `jurisdiction`, `time_horizon`, `total_budget`, `total_dmus`, `pares_malmquist`, `alertas_mission_creep`, `trampas_territoriales`, `series_alto_riesgo_isri`, `estado_checkpointer`, `is_valid_human`, `sha256_payload`, `payload_resumen JSONB`, `creado_en`, `actualizado_en`).
     - `seguimiento.pdt_ai_checkpoints_hitl` (`id`, `thread_id`, `estado_checkpointer`, `aprobado`, `auditor`, `observaciones`, `patrones_criticos JSONB`, `recomendaciones JSONB`, `sha256_checkpoint`, `registrado_en`).
   - Funciones asíncronas implementadas:
     - `asegurar_tablas_pdt_ai_pg(db: AsyncSession | None = None) -> None`
     - `guardar_evaluacion_pdt_pg(payload: dict[str, Any], db: AsyncSession | None = None) -> dict[str, Any]`
     - `registrar_checkpoint_hitl_pdt_pg(thread_id: str, estado: str, aprobado: bool | None, auditor: str | None, observaciones: str | None, patrones_criticos: list[Any], recomendaciones: list[Any], db: AsyncSession | None = None) -> dict[str, Any]`
     - `obtener_historial_auditoria_pdt_pg(db: AsyncSession | None = None, thread_id: str | None = None, limit: int = 50) -> dict[str, Any]`
     - `sincronizar_cache_y_checkpoints_a_pg(db: AsyncSession | None = None, ...) -> dict[str, Any]`
   - Sincronización inicial ejecutada contra `bd_csh`:
     ```json
     {
       "sincronizacion": {
         "evaluaciones_sincronizadas": 1,
         "checkpoints_sincronizados": 1,
         "cache_path": "/root/polis/data/planes_desarrollo/cache_pdt_ai_evaluator.json",
         "checkpoint_path": "/root/polis/data/planes_desarrollo/checkpoints_pdt_ai_evaluator.json"
       },
       "total_evaluaciones_pg": 1,
       "total_checkpoints_hitl_pg": 1
     }
     ```

2. `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` (**ACTUALIZADO**)
   - Integrada la invocación transaccional segura (`try/except` no bloqueante) de `guardar_evaluacion_pdt_pg` y `registrar_checkpoint_hitl_pdt_pg` en `ejecutar_pdt_ai_evaluator` y `validar_checkpoint_pdt_ai_evaluator`.

3. `backend/app/modules/compromisos/router.py` y `backend/app/modules/compromisos/schemas.py` (**ACTUALIZADOS**)
   - Expuesto el endpoint `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/historial-auditoria` con modelo de respuesta `PdtHistorialAuditoriaRespuesta` y parámetros opcionales `thread_id: str | None = None`, `limit: int = 50`.

4. `docs/permisos-api.md` (**ACTUALIZADO**)
   - Documentada la ruta pública `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/historial-auditoria`.

5. `backend/tests/test_pdt_persistencia_pg.py` (**CREADO**)
   - Verifica la creación de tablas en `bd_csh`, sincronización inicial desde disco, inserción/actualización de evaluaciones y checkpoints HITL con hashes `SHA-256`, y respuesta HTTP 200 del endpoint `/historial-auditoria`.

> **Verificación de Aislamiento**: Cero archivos tocados en `src/**` (frontend), ni en `agentes_inteligentes_pdd.py`, `pdd_dea_service.py`, `test_agentes_inteligentes_pdd.py` o `test_pdd_dea_triada.py`.

---

## 2. Evidencia de Verificación (`ruff` y `pytest`)

```text
$ /root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/pdt_persistencia_pg.py backend/app/modules/compromisos/pdt_ai_evaluator_graph.py backend/app/modules/compromisos/router.py backend/app/modules/compromisos/schemas.py backend/tests/test_pdt_persistencia_pg.py
All checks passed!

$ /root/polis/backend/.venv/bin/pytest backend/tests/test_pdt_persistencia_pg.py backend/tests/test_pdt_ai_evaluator.py -q
..........                                                               [100%]
10 passed in 8.53s
```
