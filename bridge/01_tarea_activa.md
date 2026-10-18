# Orden de Trabajo EAF — Fase [24B] (`agy2`)

- **Agente Asignado:** `agy2` (`=agy2:0.0`)
- **Auditor EAF:** `agy` (`=agy:0.0`)
- **Trabajo en Paralelo con:** `codex` (`[24A]`, propietario de `agentes_inteligentes_pdd.py`, `pdd_dea_service.py`, `test_agentes_inteligentes_pdd.py`, `test_pdd_dea_triada.py`).
- **RESTRICCIÓN ABSOLUTA DE ALCANCE:**
  - **100% BACKEND (`backend/app/modules/compromisos/pdt_persistencia_pg.py`, `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py`, `backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `backend/tests/test_pdt_persistencia_pg.py`, `docs/permisos-api.md`, `bridge/`).**
  - **PROHIBIDO tocar cualquier archivo en `src/**` (Frontend) y PROHIBIDO tocar `agentes_inteligentes_pdd.py`, `pdd_dea_service.py`, `test_agentes_inteligentes_pdd.py` o `test_pdd_dea_triada.py` (asignados a `codex`).**

---

## 1. Objetivo de la Fase [24B]: Persistencia Transaccional en PostgreSQL (`bd_csh`) para Corridas y Auditoría `Human-in-the-Loop`

1. **Crear el módulo `backend/app/modules/compromisos/pdt_persistencia_pg.py`:**
   - Gestiona de forma idempotente (`CREATE TABLE IF NOT EXISTS`) dos tablas transaccionales en el esquema `seguimiento` de PostgreSQL (`bd_csh`):
     1. `seguimiento.pdt_ai_evaluaciones`:
        - `id UUID PRIMARY KEY`
        - `thread_id VARCHAR(120) UNIQUE NOT NULL`
        - `jurisdiction VARCHAR(255) NOT NULL`
        - `time_horizon VARCHAR(64) NOT NULL`
        - `total_budget NUMERIC(20, 2) NOT NULL`
        - `total_dmus INTEGER NOT NULL`
        - `pares_malmquist INTEGER NOT NULL`
        - `alertas_mission_creep INTEGER NOT NULL`
        - `trampas_territoriales INTEGER NOT NULL`
        - `series_alto_riesgo_isri INTEGER NOT NULL`
        - `estado_checkpointer VARCHAR(80) NOT NULL`
        - `is_valid_human BOOLEAN NOT NULL DEFAULT FALSE`
        - `sha256_payload VARCHAR(64) NOT NULL`
        - `payload_resumen JSONB NOT NULL`
        - `creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()`
        - `actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     2. `seguimiento.pdt_ai_checkpoints_hitl`:
        - `id UUID PRIMARY KEY`
        - `thread_id VARCHAR(120) NOT NULL`
        - `estado_checkpointer VARCHAR(80) NOT NULL`
        - `aprobado BOOLEAN`
        - `auditor VARCHAR(160)`
        - `observaciones TEXT`
        - `patrones_criticos JSONB NOT NULL DEFAULT '[]'::jsonb`
        - `recomendaciones JSONB NOT NULL DEFAULT '[]'::jsonb`
        - `sha256_checkpoint VARCHAR(64) NOT NULL`
        - `registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Implementar funciones asíncronas:
     - `asegurar_tablas_pdt_ai_pg(db: AsyncSession | None = None) -> None`
     - `guardar_evaluacion_pdt_pg(payload: dict[str, Any], db: AsyncSession | None = None) -> dict[str, Any]`
     - `registrar_checkpoint_hitl_pdt_pg(thread_id: str, estado: str, aprobado: bool | None, auditor: str | None, observaciones: str | None, patrones_criticos: list[ Any ], recomendaciones: list[ Any ], db: AsyncSession | None = None) -> dict[str, Any]`
     - `obtener_historial_auditoria_pdt_pg(db: AsyncSession | None = None, thread_id: str | None = None, limit: int = 50) -> dict[str, Any]`
   - Incluir una función de sincronización inicial (`sincronizar_cache_y_checkpoints_a_pg`) y ejecutarla contra `bd_csh` para que las corridas actuales de `data/planes_desarrollo/cache_pdt_ai_evaluator.json` y `data/planes_desarrollo/checkpoints_pdt_ai_evaluator.json` queden persistidas en `seguimiento.pdt_ai_evaluaciones` y `seguimiento.pdt_ai_checkpoints_hitl`.

2. **Integrar con `pdt_ai_evaluator_graph.py`, `router.py` y `schemas.py`:**
   - En `ejecutar_pdt_ai_evaluator` y `validar_checkpoint_pdt_ai_evaluator` de `pdt_ai_evaluator_graph.py`, invocar de forma segura (`try/except` no bloqueante si se ejecuta en un test sin BD) `guardar_evaluacion_pdt_pg` y `registrar_checkpoint_hitl_pdt_pg`.
   - En `router.py` y `schemas.py`, exponer:
     - `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/historial-auditoria` (con query params opcionales `thread_id: str | None = None`, `limit: int = 50`).
   - Documentar la ruta en `docs/permisos-api.md`.

3. **Pruebas y Calidad:**
   - Crear `backend/tests/test_pdt_persistencia_pg.py` verificando la creación de tablas, inserción/actualización de evaluaciones y checkpoints HITL en `bd_csh`, verificación de hashes `SHA-256` y respuesta del endpoint `/historial-auditoria`.
   - Ejecutar `/root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/pdt_persistencia_pg.py backend/app/modules/compromisos/pdt_ai_evaluator_graph.py backend/app/modules/compromisos/router.py backend/app/modules/compromisos/schemas.py backend/tests/test_pdt_persistencia_pg.py` y `/root/polis/backend/.venv/bin/pytest backend/tests/test_pdt_persistencia_pg.py backend/tests/test_pdt_ai_evaluator.py -q`.
   - Documentar el reporte en `bridge/02_resultado_agy2.md` y notificar a `agy:0.0`:
     ```bash
     tmux send-keys -t =agy:0.0 "AGY2 LISTO [24B]: Persistencia PostgreSQL (seguimiento.pdt_ai_evaluaciones + pdt_ai_checkpoints_hitl) y endpoint /historial-auditoria completados y probados. Solicito auditoria EAF." Enter
     ```
