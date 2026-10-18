# Orden de Trabajo EAF (`=agy:0.0`) para `agy2` (`=agy2:0.0`) — Fase `[27B]` (100% BACKEND)

**Estado de `[26B]`:** **APROBADO** en `/root/polis/bridge/03_dictamen_revision.md` (`6 passed in 1.63s`, `ruff` limpio).

**RESTRICCIÓN ABSOLUTA DE ALCANCE:**
- **100% BACKEND (`backend/app/modules/compromisos/pdt_persistencia_pg.py`, `backend/tests/test_pdt_persistencia_pg.py`, `knowledge-base/13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md`, `knowledge-base/14_MODELO_HOSHIN_KANRI_MATRIZ_X_PDT_GBR.md`).**
- **PROHIBIDO TOCAR `src/**` (Frontend) bajo ninguna circunstancia.**
- **PROHIBIDO TOCAR `router.py`, `schemas.py`, `agentes_inteligentes_pdd.py`, `pdd_dea_service.py`, `test_pdt_ai_evaluator.py` o `test_agentes_inteligentes_pdd.py`** (esos archivos están asignados en paralelo a `codex` en la Fase `[26A]`).

---

## Objetivo de la Fase `[27B]` (`agy2`)
1. **Enriquecer la Persistencia PostgreSQL (`backend/app/modules/compromisos/pdt_persistencia_pg.py` y `backend/tests/test_pdt_persistencia_pg.py`):**
   - Actualizar `_construir_resumen_ejecutivo(run_data: dict[str, Any]) -> dict[str, Any]` en `pdt_persistencia_pg.py` para persistir dentro del `JSONB` `resumen_ejecutivo` de `seguimiento.pdt_ai_evaluaciones`:
     - **Trazabilidad Reproducible (`H11`):** `version_metodologica` y `fingerprint_fuentes_sha256` extraídos de `run_data`.
     - **Atribución ISRI (`H1`):** `total_indicadores_isri_sin_atribucion` (conteo de series críticas `ISRI > 0.40` sin entidad ejecutora atribuida).
     - **Resumen Hoshin Kanri (`Marco FAIR` + `PDCA`):** Invocar de forma resiliente `construir_matriz_x_hoshin_kanri_pdt(datos_evaluador=run_data)` desde `.pdt_hoshin_kanri` para almacenar `hoshin_kanri_fair` (`fair_global_index`, `focus_score`, `alignment_score`, `integration_score`, `review_score`, `rojos_contencion_pdca`, `sesiones_catchball_activas`).
     - **Resumen Revisión 10D (`7 Revisores`):** Invocar de forma resiliente `construir_matriz_revision_por_meta_pdt(limit=25)` desde `.pdt_revision_por_meta` (o con `datos_entrada` cuando aplique) para almacenar `revision_10d_resumen` (`version_regla`, `total_metas_plan`, `con_contradicciones`, `con_brecha_informacion`, `con_ceros_observados`, `total_hallazgos_estructurados`).
   - Añadir al menos 2 nuevas pruebas en `backend/tests/test_pdt_persistencia_pg.py` que verifiquen que `resumen_ejecutivo` en PostgreSQL incluye `version_metodologica`, `fingerprint_fuentes_sha256`, `hoshin_kanri_fair` y `revision_10d_resumen`.

2. **Actualizar la Doctrina Canónica (`knowledge-base/13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md` y `knowledge-base/14_MODELO_HOSHIN_KANRI_MATRIZ_X_PDT_GBR.md`):**
   - Documentar los nuevos endpoints (`GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/hoshin-kanri/especificacion`, `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/hoshin-kanri/matriz-x`, `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta`), la Matriz Auditable de 10 Dimensiones, los 7 Roles Revisores Especializados y el cierre de los hallazgos `H1–H12` de `revision_motores_18_10_2026.md`.

3. **Verificación y Reporte:**
   - Pasar `ruff check` y `pytest backend/tests/test_pdt_persistencia_pg.py -q`.
   - Escribir `/root/polis/bridge/02_resultado_agy2.md` y notificar a `=agy:0.0`:
     `tmux send-keys -t =agy:0.0 "AGY2 LISTO [27B]: Persistencia PG enriquecida (H11 + Hoshin Kanri FAIR + Revision 10D) y doctrina KB 13/14 actualizadas y probadas. Solicito auditoria EAF." Enter`
