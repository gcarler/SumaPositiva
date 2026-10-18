# Orden de Trabajo EAF (`=agy:0.0`) para `codex` (`=codex:0.0`) — Fase `[26A]` (100% BACKEND)

**Estado de `[25A]`:** **APROBADO** en `/root/polis/bridge/03_dictamen_codex.md` (`59 passed`, `ruff` limpio).

**RESTRICCIÓN ABSOLUTA DE ALCANCE:**
- **100% BACKEND (`backend/**`, `docs/permisos-api.md`).**
- **PROHIBIDO TOCAR `src/**` (Frontend) bajo ninguna circunstancia.**
- **PROHIBIDO TOCAR `backend/app/modules/compromisos/pdt_revision_por_meta.py` ni `backend/tests/test_pdt_revision_por_meta.py`** (esos dos archivos están asignados en paralelo a `agy2` en la Fase `[26B]`).

---

## Objetivo de la Fase `[26A]` (`codex`)
Integrar de forma unificada en el Router FastAPI (`router.py`, `schemas.py`, `docs/permisos-api.md`), en el Consejo Multiagente (`agentes_inteligentes_pdd.py`) y en el Servicio DEA/Tríada (`pdd_dea_service.py`):
1. El **Motor Hoshin Kanri (`pdt_hoshin_kanri.py`)** ya completado en `[25B]`.
2. El **Motor de Revisión Integral por Meta de las 10 Dimensiones y 7 Revisores (`pdt_revision_por_meta.py`)** que expone:
   ```python
   async def construir_matriz_revision_por_meta_pdt(
       db: AsyncSession | None = None,
       *,
       diagnostico: dict[str, Any] | None = None,
       codigo_plan: str | None = None,
       sector: str | None = None,
       dependencia: str | None = None,
       limit: int = 100,
   ) -> dict[str, Any]
   ```
   Con llaves de retorno:
   - `sistema` (`"PDT-AI-EVALUATOR-REVISION-10D-META"`), `generado_en`, `filtros_aplicados`, `total_metas_evaluadas`
   - `catalogo_10_dimensiones` (`list[dict]`), `catalogo_7_revisores` (`list[dict]`)
   - `resumen_ejecutivo_revision` (`dict`), `informe_7_revisores` (`dict`), `matriz_metas` (`list[dict]`)

---

## Tareas Específicas (`[26A]`)

1. **Endpoint FastAPI y Esquema Pydantic (`router.py`, `schemas.py`, `docs/permisos-api.md`):**
   - En `backend/app/modules/compromisos/schemas.py`, define `PdtRevisionPorMetaRespuesta(BaseModel)` con `model_config = ConfigDict(extra="allow")` y los campos principales (`sistema: str`, `generado_en: str`, `filtros_aplicados: dict[str, Any] = Field(default_factory=dict)`, `total_metas_evaluadas: int = 0`, `catalogo_10_dimensiones: list[dict[str, Any]] = Field(default_factory=list)`, `catalogo_7_revisores: list[dict[str, Any]] = Field(default_factory=list)`, `resumen_ejecutivo_revision: dict[str, Any] = Field(default_factory=dict)`, `informe_7_revisores: dict[str, Any] = Field(default_factory=dict)`, `matriz_metas: list[dict[str, Any]] = Field(default_factory=list)`).
   - En `backend/app/modules/compromisos/router.py`, carga dinámicamente `construir_matriz_revision_por_meta_pdt` desde `.pdt_revision_por_meta` (igual que `_cargar_hoshin_kanri_fns()`) y expón:
     - `GET /triada/pdd-dea/pdt-ai-evaluator/revision-por-meta` (`response_model=PdtRevisionPorMetaRespuesta`), recibiendo `db: SessionDependency`, `codigo_plan: str | None = Query(default=None)`, `sector: str | None = Query(default=None)`, `dependencia: str | None = Query(default=None)`, `limit: int = Query(default=100, ge=1, le=500)`, `force_refresh: bool = Query(default=False)`.
   - Registra la ruta `GET | /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta | publico | ...` en `docs/permisos-api.md`.

2. **Integración en `agentes_inteligentes_pdd.py` y `pdd_dea_service.py`:**
   - En `agentes_inteligentes_pdd.py`, dentro de la integración con `PDT-AI-EVALUATOR` (`integracion_pdt_ai_evaluator` / `tool_consultar_evaluador_pdt_gbr`), incluye un resumen compacto de:
     - `hoshin_kanri_fair`: `fair_global_index`, `focus_score`, `alignment_score`, `integration_score`, `review_score` y conteo de estados en `bowling_charts_pdca` obtenidos invocando `construir_matriz_x_hoshin_kanri_pdt(diagnostico=...)` de forma resiliente.
     - `revision_10d_resumen`: si `pdt_revision_por_meta` está disponible, incluye `resumen_ejecutivo_revision` de forma resiliente.
   - En `pdd_dea_service.py`, dentro de `evaluacion_multidimensional_pdt_ai`, añade `hoshin_kanri_resumen` (puntajes `FAIR` y conteo de alertas PDCA/Catchball).

3. **Pruebas y Calidad (`ruff` + `pytest`):**
   - Añade pruebas en `backend/tests/test_pdt_ai_evaluator.py` y `backend/tests/test_agentes_inteligentes_pdd.py` validando la ruta `/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta` y el resumen `hoshin_kanri_fair` en el consejo multiagente.
   -Verifica que `test_access_policy.py` pase al 100% (`pytest tests/test_access_policy.py -k test_matriz_cubre_todas_las_rutas_y_sus_controles`).
   - Escribe el reporte en `/root/polis/bridge/02_resultado_codex.md` y notifica por tmux a `=agy:0.0`:
     `tmux send-keys -t =agy:0.0 "CODEX LISTO [26A]: Endpoint /revision-por-meta + integracion Hoshin Kanri y 10D en Consejo Multiagente completados y probados. Solicito auditoria EAF." Enter`
