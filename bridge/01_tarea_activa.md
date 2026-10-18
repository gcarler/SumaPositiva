# TAREA ACTIVA PARA AGY2 (DESARROLLADOR SECUNDARIO — 100% BACKEND Y DOCTRINA TÉCNICA)

- **ID de Tarea**: `[PDT-AI-EVALUATOR-API-Y-DOCTRINA-BACKEND-21B]`
- **Fecha / Hora**: 2026-10-18
- **Asignado por**: `agy` (`=agy:0.0`)
- **Ejecutor**: `agy2` (`=agy2:0.0`)
- **RESTRICCIÓN ABSOLUTA**: **PROHIBIDO TOCAR FRONTEND (`src/**`) O REINICIAR `polis-frontend.service`**. Estamos trabajando **exclusivamente en el motor de análisis de Planes de Desarrollo en el BACKEND**.
- **Alcance Exclusivo de Archivos**:
  - `backend/app/modules/compromisos/schemas.py`
  - `backend/app/modules/compromisos/router.py`
  - `docs/permisos-api.md`
  - `knowledge-base/00_INDICE_MAESTRO.md`
  - `bridge/02_resultado_agy2.md`
  *(Nota: `codex` está implementando en paralelo `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` y `backend/tests/test_pdt_ai_evaluator.py`; NO edites esos dos archivos de `codex`, impórtalos desde `router.py`).*

---

## 1. Contexto y Especificación Metodológica

El usuario ha definido la **"Especificación Arquitectónica y Metodológica: Sistema Agéntico de Inteligencia Artificial para el Análisis y Evaluación Multidimensional de Planes de Desarrollo Territorial (PDT)"**, ya guardada en:
- `knowledge-base/13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md`

Tu misión en `[21B]` es integrar los contratos Pydantic, los endpoints REST en FastAPI (`backend/app/modules/compromisos/router.py`), la clasificación de permisos (`docs/permisos-api.md`) y la indexación doctrinal (`knowledge-base/00_INDICE_MAESTRO.md`).

---

## 2. Entregables Técnicos Exactos

1. **Esquemas Pydantic en `backend/app/modules/compromisos/schemas.py`**:
   Agrega los modelos de petición para el motor `PDT-AI-EVALUATOR`:
   - `PdtAiEvaluatorEjecutarRequest(BaseModel)`:
     - `jurisdiction: str = "Distrito Turístico y Cultural de Cartagena de Indias"`
     - `time_horizon: str = "2024-2027 (Serie Multianual 2012-2027)"`
     - `thread_id: str = "pdt-cartagena-2024-2027"`
     - `force_refresh: bool = False`
   - `PdtAiEvaluatorValidarCheckpointRequest(BaseModel)`:
     - `thread_id: str = "pdt-cartagena-2024-2027"`
     - `aprobado: bool = True`
     - `auditor: str = "Comité Técnico de Planeación Distrital (GBR/DNP)"`
     - `observaciones: str = ""`

2. **Endpoints REST en `backend/app/modules/compromisos/router.py`**:
   Importa de `.pdt_ai_evaluator_graph` las funciones:
   - `obtener_especificacion_pdt_ai_evaluator`
   - `ejecutar_pdt_ai_evaluator`
   - `validar_checkpoint_pdt_ai_evaluator`
   *(Usa importación perezosa dentro del endpoint o `try/except ImportError` si aún está siendo escrito por `codex` durante tu edición).*

   Expón los siguientes 4 endpoints bajo `/api/v1/compromisos`:
   - `GET /triada/pdd-dea/pdt-ai-evaluator/especificacion` (Público — devuelve la especificación arquitectónica GBR, cadena de valor pública, grafo LangGraph, ecuaciones LaTeX, matriz de 5 sectores y `SYSTEM_INSTRUCTIONS_PDT_AI_EVALUATOR`).
   - `GET /triada/pdd-dea/pdt-ai-evaluator/diagnostico` (Público con `thread_id: str = Query(default="pdt-cartagena-2024-2027")` y `force_refresh: bool = Query(default=False)` — ejecuta `await ejecutar_pdt_ai_evaluator(db, thread_id=thread_id, force_refresh=force_refresh)`).
   - `POST /triada/pdd-dea/pdt-ai-evaluator/ejecutar` (Con `payload: PdtAiEvaluatorEjecutarRequest | None = Body(default=None)` — ejecuta `await ejecutar_pdt_ai_evaluator(db, jurisdiction=..., time_horizon=..., thread_id=..., force_refresh=...)`).
   - `POST /triada/pdd-dea/pdt-ai-evaluator/checkpoint/validar` (Human-in-the-Loop — recibe `payload: PdtAiEvaluatorValidarCheckpointRequest` y llama a `await validar_checkpoint_pdt_ai_evaluator(payload.thread_id, aprobado=payload.aprobado, auditor=payload.auditor, observaciones=payload.observaciones)`).

   Además, en `_precargar_caches_pesados()` dentro de `router.py`, agrega el calentamiento opcional en background de `pdt_ai_evaluator_graph` (protegido con `try/except Exception`) si existe `cache_pdt_ai_evaluator.json`.

3. **Documentación de Permisos y Base de Conocimiento**:
   - Registra los 4 nuevos endpoints en `docs/permisos-api.md`.
   - Registra `13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md` en `knowledge-base/00_INDICE_MAESTRO.md` con el resumen de los 6 capítulos de la especificación (GBR/Cadena de Valor Pública, Grafo LangGraph `AgentState`, Nodos DEA/NLP/Espacial/Predictivo, Matriz Evaluativa Multi-Sectorial de 5 Sectores, Prompt `PDT-AI-EVALUATOR` y Gobernanza Institucional).

---

## 3. Protocolo de Entrega

1. Verifica sintaxis y lint de tus archivos (`/root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/router.py backend/app/modules/compromisos/schemas.py`).
2. Escribe tu reporte detallado en `bridge/02_resultado_agy2.md`.
3. Notifica a `agy` por `tmux`:
   ```bash
   tmux send-keys -t =agy:0.0 "AGY2 LISTO [21B]: Endpoints Backend FastAPI y Doctrina GBR/LangGraph PDT-AI-EVALUATOR integrados (0 cambios en frontend). Solicito auditoria EAF." Enter
   ```
