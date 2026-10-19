# Tarea Activa — Fase `[33A]` (`codex`, 100% Backend)

## Contexto y Restricciones Estrictas
- Lee `/root/polis/bridge/00_plan_sispt_dnp_33.md` y `/root/polis/knowledge-base/16_ESTRUCTURA_SISPT_DNP_PDT_INDICADORES_PLAN_ACCION_SEGUIMIENTO.md`.
- **100% Backend**. **PROHIBIDO tocar `src/**`** o `pdt_sispt_dnp_evaluador.py` / `test_pdt_sispt_dnp_evaluador.py` (esos archivos los crea `agy2` en `[33B]`).
- No ejecutes `pytest` sobre todo el repositorio; ejecuta únicamente las suites de los módulos modificados (`tests/test_pdt_revision_por_meta.py`, `tests/test_pdt_ai_evaluator.py`, `tests/test_access_policy.py`).

## Entregables Obligatorios (`[33A]`)

### 1. Integrar evaluación `SisPT` (`https://sispt.dnp.gov.co/`) en `backend/app/modules/compromisos/pdt_revision_por_meta.py`
- Importa de forma resiliente (`try/except ImportError` con fallback local determinista) las funciones de `app.modules.compromisos.pdt_sispt_dnp_evaluador` (`determinar_tipologia_indicador_sispt`, `calcular_eficacia_indicador_sispt`, `clasificar_meta_y_actividad_plan_accion_dnp`, `evaluar_interoperabilidad_sispt_cuipo_piip_meta`).
- En cada meta auditada (`metas_auditadas` / `matriz_metas`), añade el bloque `"evaluacion_sispt_dnp"` con:
  - `"tipologia_indicador_sispt"` (`"INCREMENTO_ACUMULATIVO_FLUJO"`, `"INCREMENTO_NO_ACUMULATIVO_CAPACIDAD"`, `"REDUCCION_BRECHA"`, `"MANTENIMIENTO_STOCK"`)
  - `"eficacia_bruta_pct"` (`float | None`)
  - `"eficacia_truncada_sispt_pct"` (`float | None`, acotada a `[0.0, 100.0]` según regla `SISPT-R2`)
  - `"sobrecumplimiento_exceso_pct"` (`float`)
  - `"rango_desempeno_sispt_mdm"` (`"SOBRESALIENTE"`, `"SATISFACTORIO"`, `"MEDIO"`, `"BAJO"`, `"CRITICO"`, `"SIN_MEDICION"`)
  - `"clase_meta_pa_dnp"` (`"META_DE_PRODUCTO"`, `"META_DE_GESTION"`, `"META_ADMINISTRATIVA"`)
  - `"bolsa_financiacion_pa_dnp"` (`"INVERSION"`, `"FUNCIONAMIENTO"`, `"RECURSOS_DE_GESTION"`)
  - `"conteo_actividades_por_tipo_dnp"` (`ACTIVIDAD_NORMATIVA`, `ACTIVIDAD_ADMINISTRATIVA`, `ACTIVIDAD_DE_GESTION`, `ACTIVIDAD_LOGISTICA`)
  - `"estado_coherencia_cuipo_piip"` (`"COHERENTE_SISPT_CUIPO_PIIP"`, `"DESFASE_CUIPO_SIN_AVANCE_PIIP"`, `"AVANCE_FISICO_SIN_SOPORTE_CUIPO"`, `"SIN_MEDICION_OBSERVADA"`)
- En el resumen global de `revisar_metas_pdd_integral`, añade `"resumen_sispt_dnp"` con los conteos por tipología `SisPT`, eficacia media bruta vs truncada al `100%`, distribución del semáforo `MDM`, distribución de clases de meta del Plan de Acción y alertas `CUIPO`/`PIIP`.

### 2. Exponer endpoint `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/sispt-dnp-seguimiento` e integrar en `pdt_informe_integral_spd.py`
1. En `backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `backend/app/core/security/access_policy.py` y `docs/permisos-api.md`:
   - Añade el endpoint público `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/sispt-dnp-seguimiento` (parámetro opcional `codigo_plan: str = Query(default="TODOS")`), que invoca `evaluar_universo_sispt_dnp_bd_csh(codigo_plan)` de `pdt_sispt_dnp_evaluador` (con fallback determinista si aún no está disponible) y devuelve las métricas `SisPT` de los 8 planes (`4,637` metas).
2. En `backend/app/modules/compromisos/pdt_informe_integral_spd.py`:
   - Añade el bloque `"sintesis_sispt_dnp_cuipo_piip"` al informe integral de la SPD, inclúyelo en el cálculo de la huella SHA-256 y agrega una sección en el exportable Markdown con el resumen de eficacia `SisPT` truncada al `100%`, las 4 tipologías de indicadores y la coherencia `CUIPO` + `PIIP`.

### 3. Actualizar Pruebas (`test_pdt_revision_por_meta.py`, `test_pdt_ai_evaluator.py`, `test_access_policy.py`)
- Verifica que cada meta en `revisar_metas_pdd_integral` incluya `evaluacion_sispt_dnp` y que el resumen incluya `resumen_sispt_dnp`.
- Verifica que `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/sispt-dnp-seguimiento` responda `HTTP 200` y que `/informe-integral-spd` incluya `sintesis_sispt_dnp_cuipo_piip`.

## Verificación y Cierre
1. Ejecuta `./.venv/bin/ruff check app/modules/compromisos/pdt_revision_por_meta.py app/modules/compromisos/pdt_informe_integral_spd.py app/modules/compromisos/router.py app/modules/compromisos/schemas.py app/core/security/access_policy.py tests/test_pdt_revision_por_meta.py tests/test_pdt_ai_evaluator.py tests/test_access_policy.py`.
2. Ejecuta `./.venv/bin/pytest tests/test_pdt_revision_por_meta.py tests/test_pdt_ai_evaluator.py tests/test_access_policy.py -q`.
3. Documenta en `/root/polis/bridge/02_resultado_codex.md`.
4. Notifica al coordinador:
   `tmux send-keys -t =agy:0.0 "CODEX LISTO [33A]: Integracion SisPT DNP (4 formulas + truncamiento 100% + 4 tipos actividades PA + CUIPO/PIIP + endpoint /sispt-dnp-seguimiento) completada y probada. Solicito auditoria EAF." Enter`
