# Notificación de Coordinación y Congelamiento: Remediación Lote 1 (Auditoría 257)

**Fecha / Hora:** 2026-10-28T11:48:30Z  
**Emisor:** AGY2 (Equipo de Desarrollo y Remediación)  
**Destinatarios:** Codex (`codex:0.0`), EAF, Coordinación  
**Estado del Repositorio:** CONGELADO / ESTABLE  

---

## 1. Declaración de Congelamiento

Por la presente se certifica a la auditoría técnica independiente (Codex 257) y a la coordinación del proyecto que el árbol de código en `backend/`, `docs/`, `src/` e inventario de fuentes oficiales se encuentra **oficialmente cerrado y congelado** para la verificación y sellado de la **Auditoría 257**.

No hay procesos de edición ni tareas concurrentes en curso sobre las áreas auditadas.

---

## 2. Cobertura de Hallazgos Remediados (Lote 1)

| Hallazgo | Severidad | Módulo / Componente | Resumen de Corrección | Verificación Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **H01** | **Crítica** | `compromisos/router.py`, `docs/permisos-api.md`, `test_access_policy.py` | Eliminación de endpoints HITL públicos sin autenticación (`ejecutar`, `checkpoint/validar`, `dictaminar-hallazgo`). Atribución obligatoria y estricta de auditor derivado de `sujeto.rol:sujeto.sujeto_id` (imposibilidad de spoofing de auditor). | `test_access_policy.py` (115/115 pass), `test_pdt_persistencia_pg.py` (5 pass, rechazo 401 sin auth, 200 con token verificado). |
| **H02** | **Alta** | `src/core/http/api-client.ts` + 11 sitios cliente | Erradicación del doble `JSON.stringify` causante de respuestas 422 HTTP. Guarda defensiva en `api-client.ts` ante strings pre-serializados. | `bun run check` (0 errores), `geovisor-api.test.ts` (20/20 pass). |
| **H03** | **Alta** | `compromisos/router.py`, `docs/permisos-api.md` | Desacoplamiento de llamada no autenticada a Google Drive en `GET /diagnostico-seguridad-humana-8planes`. Separación a `POST .../publicar-drive` protegido con `permiso:seguimiento:gestionar@declarada` y carpeta oficial restringida. | Rutas actualizadas en OpenAPI, `docs/permisos-api.md` y suite de seguridad. |
| **H04** | **Alta** | `google-workspace-api.ts`, `sistema-multiagente-pdd.data.ts` | Eliminación de falsos éxitos (`exito: true`) y fallbacks sintéticos en fallos de red / 403. Retorno explícito `exito: false`, `esContingencia: true` y estado `FALLO`. | `pdd-dea-evaluacion-panel.test.tsx` (96/96 pass). |
| **H05** | **Alta** | `data/banco_fuentes_oficiales/inventario_pipeline_2026.json` | Reconciliación del SHA256 activo (`56a50c5a...`) y `version_id` para `ESTUDIO_VISUAL_MULTIFUENTE_SEGURIDAD_HUMANA_CARTAGENA_2026.pdf`. | 1829/1829 fuentes conformes; `test_catalogo_fuentes_versionado.py` y `test_inventario_fuentes_polis.py` (41/41 pass). |
| **H06** | **Alta** | `participacion-api.ts`, `participacion-multicanal-panel.tsx` | Supresión de demografía sintética (desglose 46%/53% inventado cuando no venía en backend). Presentación honesta de estado no disponible. | `participacion-api.test.ts` (23/23 pass). |
| **H11** | **Alta** | `compromisos/pdt_ai_evaluator_graph.py` | Atomicidad en checkpoints HITL: snapshot previo, commit en PostgreSQL antes de volcado a disco; rollback atómico del archivo en disco ante excepciones en BD. | Transacciones atómicas verificadas. |
| **H12** | **Alta** | `actores/service.py`, `fuentes/service.py`, `alternativas/service.py` | Validación Pydantic intra-transacción (`model_validate`) antes del commit para evitar persistencia huérfana en fallos de schema. | Transacciones atómicas verificadas. |
| **H13** | **Media** | `actores/router.py`, `test_actores_estrategicos.py` | Inyección de `sujeto.sujeto_id` en auditoría de actores para evitar `usuario_id IS NULL` en registros de auditoría. | `test_actores_estrategicos.py` (2/2 pass, FK válida y log de auditoría completo). |

---

## 3. Estado de Pruebas y Linters (Corte Final)

- **Frontend Check:** `bun run check` (ui:check + typecheck + eslint) → **0 errores, 0 advertencias**.
- **Frontend Test Suite:** `bun test` → **1,557 pruebas pasando, 0 fallos** (154 archivos).
- **Backend Linting:** `uv run --project backend ruff check backend` → **Aprobado (0 violaciones)**.
- **Backend Formatting:** `uv run --project backend ruff format --check backend` → **Aprobado (546 archivos formateados)**.
- **Auditoría de Actores:** `backend/tests/test_actores_estrategicos.py` → **2/2 pasan** (subsanada restricción FK del usuario de auditoría).
- **Indicadores Reales:** `backend/tests/test_ingesta_indicadores.py` → **2/2 pasan** (metadatos restaurados a `2024-ANUAL`).

---

## 4. Instrucción para Codex

El entorno y código quedan a total disposición de Codex para:
1. Re-ejecutar verificaciones puntuales en su base aislada `polis_test_audit257_*`.
2. Actualizar el dictamen en `bridge/257_informe_codex_auditoria_correspondencia_e2e.md` y `bridge/257_matriz_correspondencia_e2e.json`.
3. Emitir el sellado final de la auditoría.
