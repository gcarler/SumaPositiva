# Orden de Trabajo EAF (`=agy:0.0`) para `codex` (`=codex:0.0`) — Fase `[30A]` (100% BACKEND)

**Estado de `[29A]`:** **APROBADO** en `/root/polis/bridge/03_dictamen_codex.md` (`14 passed`, `test_access_policy` `1 passed`, `ruff` limpio).
**Doctrina de Referencia:** `/root/polis/knowledge-base/15_ARQUITECTURA_DEA_4_NIVELES_DMU_GOBERNANZA_CARTAGENA.md` y `/root/polis/bridge/00_plan_dea_4niveles_cartagena_30.md`.

**RESTRICCIÓN ABSOLUTA DE ALCANCE:**
- **100% BACKEND (`backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `backend/app/modules/compromisos/pdd_dea_service.py`, `backend/app/modules/compromisos/agentes_inteligentes_pdd.py`, `docs/permisos-api.md`, `backend/tests/test_pdt_ai_evaluator.py`, `backend/tests/test_agentes_inteligentes_pdd.py`).**
- **PROHIBIDO TOCAR `src/**` (Frontend) bajo ninguna circunstancia.**
- **PROHIBIDO TOCAR `pdt_dea_4niveles_cartagena.py`, `test_pdt_dea_4niveles_cartagena.py`, `pdt_revision_por_meta.py` o `pdt_conciliador_vinculos_pa_triada.py`** (esos archivos pertenecen a `agy2` en `[29B]`/`[30B]`).

---

## Objetivo de la Fase `[30A]` (`codex`)
Integrar en el Router FastAPI (`router.py`, `schemas.py`, `docs/permisos-api.md`), en `pdd_dea_service.py` y en `agentes_inteligentes_pdd.py` la **Arquitectura DEA Jerárquica de 4 Niveles de DMUs de Cartagena y el Tablero Alcalde / Armonización Presupuestal** (`knowledge-base/15_ARQUITECTURA_DEA_4_NIVELES_DMU_GOBERNANZA_CARTAGENA.md`):

### 1. Contrato Dinámico hacia `.pdt_dea_4niveles_cartagena`
El módulo `.pdt_dea_4niveles_cartagena` (que `agy2` construye en `[30B]`) expone:
- `evaluar_dea_4_niveles_cartagena(nivel: str | None = None, orientacion: str = "input", sector: str | None = None, db: Any = None, **kwargs) -> dict[str, Any]`
- `generar_tablero_alcalde_y_armonizacion_dea_cartagena(orientacion: str = "input", sector: str | None = None, db: Any = None, **kwargs) -> dict[str, Any]`

En `router.py`, `pdd_dea_service.py` y `agentes_inteligentes_pdd.py`, carga `.pdt_dea_4niveles_cartagena` dinámicamente con `importlib.import_module` y proporciona un **fallback determinista completo** (con los 4 niveles: `nivel_1_territorial_localidades_ucg`, `nivel_2_institucional_secretarias`, `nivel_3_operativo_ieo_ese`, `nivel_4_temporal_inter_cuatrienial`, el mapeo sectorial `MGA-DNP`/`MIR` de Educación, Salud e Infraestructura/Transcaribe, la recalificación del Tablero Alcalde para DMUs con `100%` ejecución física y $\theta_{\text{BCC}} \le 0.70$, y los `benchmarks` $\theta=1.0$ para Armonización Presupuestal) en caso de que `.pdt_dea_4niveles_cartagena` aún no esté importable durante la corrida aislada de `[30A]`, y delegando automáticamente al módulo real cuando esté presente.

### 2. Endpoints FastAPI y Esquemas Pydantic (`router.py`, `schemas.py`, `docs/permisos-api.md`)
1. En `backend/app/modules/compromisos/schemas.py`:
   - Define `PdtDea4NivelesCartagenaRespuesta(BaseModel)` y `PdtTableroAlcaldeArmonizacionDeaRespuesta(BaseModel)` con `model_config = ConfigDict(extra="allow")`.
2. En `backend/app/modules/compromisos/router.py`:
   - Expón `GET /triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/4-niveles` (`response_model=PdtDea4NivelesCartagenaRespuesta`), con query params `nivel: str | None = Query(default=None)`, `orientacion: str = Query(default="input")`, `sector: str | None = Query(default=None)`.
   - Expón `GET /triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/tablero-alcalde-armonizacion` (`response_model=PdtTableroAlcaldeArmonizacionDeaRespuesta`), con query params `orientacion: str = Query(default="input")`, `sector: str | None = Query(default=None)`.
3. En `docs/permisos-api.md`:
   - Registra ambas rutas `GET` como `publico` para que `test_matriz_cubre_todas_las_rutas_y_sus_controles` pase al 100%.

### 3. Integración en `pdd_dea_service.py` y `agentes_inteligentes_pdd.py`
- En `pdd_dea_service.py` (`evaluacion_multidimensional_pdt_ai`), agrega `dea_4_niveles_cartagena_resumen` (conteo de DMUs eficientes/ineficientes en los 4 niveles, alertas de falso cumplimiento nominal en el Tablero Alcalde y benchmarks para Armonización Presupuestal).
- En `agentes_inteligentes_pdd.py` (`integracion_pdt_ai_evaluator` / `tool_consultar_evaluador_pdt_gbr`), incluye `dea_4_niveles_cartagena` con el resumen de los 4 niveles y las alertas del Tablero Alcalde.

### 4. Pruebas y Calidad (`ruff` + `pytest`)
- Añade pruebas en `backend/tests/test_pdt_ai_evaluator.py` y `backend/tests/test_agentes_inteligentes_pdd.py` validando ambos endpoints (`/dea-cartagena/4-niveles` con `orientacion=input` y `orientacion=output`, y `/dea-cartagena/tablero-alcalde-armonizacion`) y su presencia en el Consejo Multiagente.
- Verifica `pytest tests/test_access_policy.py -k test_matriz_cubre_todas_las_rutas_y_sus_controles -q`.
- Escribe el reporte en `/root/polis/bridge/02_resultado_codex.md` y notifica por tmux a `=agy:0.0`:
  `tmux send-keys -t =agy:0.0 "CODEX LISTO [30A]: Endpoints /dea-cartagena/4-niveles y /dea-cartagena/tablero-alcalde-armonizacion + integracion en pdd_dea_service y Consejo Multiagente completados y probados. Solicito auditoria EAF." Enter`
