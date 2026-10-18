# Entrega Codex — Fase [23A] PDT-AI-EVALUATOR

## Cambios realizados

- `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py`
  - La consulta territorial incorpora `ST_AsGeoJSON(ST_SimplifyPreserveTopology(...))`; GeoPandas reconstruye polígonos reales en EPSG:4326 y mantiene el punto de centroide como respaldo.
  - El estado DEA/Malmquist añade DMUs anuales desde `planes_desarrollo_distrital.ppi_anual_cop` y, cuando ese desglose no existe, suma asignaciones anuales de nodos hoja en `pdd_lineas_y_programas` para evitar contar a la vez padres e hijos.
  - La procedencia queda explícita como `apropiacion_definitiva_cop` o `ppi_oficial_desagregado_pdd`. Los montos PPI se usan solo en vigencias sin apropiaciones observadas positivas; se identifica el plan y se etiqueta el conteo de líneas como proxy estructural, no como producto ejecutado.
  - Alertas de coherencia NLP conservan la dependencia responsable para que el dictamen pueda vincularlas.
- `backend/app/modules/compromisos/pdt_dictamen_ejecutivo.py`: genera el pliego por dependencia, síntesis de sectores GBR, recomendaciones trazables e informe Markdown.
- `backend/app/modules/compromisos/router.py` y `schemas.py`: exponen y tipan `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/dictamen-ejecutivo`, con filtros opcionales `dependencia`, `sector` y `force_refresh`.
- `docs/permisos-api.md`: documenta la ruta.
- `backend/tests/test_pdt_dictamen_ejecutivo.py`: cubre años 2012–2027, prioridad de apropiaciones observadas, geometría GeoJSON, dictamen por filtros e integración de la ruta.

## Verificación

- Ruff sobre los módulos y pruebas de esta fase: correcto (`All checks passed`).
- Pytest solicitado: `11 passed` (`tests/test_pdt_ai_evaluator.py` y `tests/test_pdt_dictamen_ejecutivo.py`).
- Ruff completo desde `backend/` detecta 729 hallazgos en el repositorio (principalmente imports y líneas largas en numerosos archivos). Los archivos de esta entrega pasan al ejecutarlo de forma dirigida.

## Alcance

No se modificó `src/**`, `pdt_nodos_espacial_predictivo.py` ni `test_pdt_nodos_espacial_predictivo.py`. No se hizo commit ni push.
