# Entrega Codex — PDT-NODOS-DEA-PULP-NLP-SKLEARN-ORQUESTACION-22A

## Cambios

- Actualizado `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py`:
  - DEA CCR/BCC formula LP con comparación PuLP contra SciPy/HiGHS, verificación de equivalencia, holguras de insumos/productos, suma de lambdas BCC y clasificación de escala.
  - Bootstrap suavizado con reflexión en la frontera de eficiencia, Silverman bandwidth, corrección de sesgo e intervalos del 95% por DMU y agregado (1,000 réplicas).
  - Índice Malmquist entre períodos consecutivos con cuatro distancias cruzadas CRS y descomposición Pech BCC / Techch.
  - Pipeline TF-IDF (1,2) + TruncatedSVD + HDBSCAN, c-TF-IDF de clusters y sectores, y cosine similarity en bloques de 128 metas con alertas bajo 0.45.
  - ARIMA de `statsmodels`, GeoDataFrame de GeoPandas y enriquecimiento opcional desde `pdt_nodos_espacial_predictivo.py` para análisis espacial, series y matriz GBR; mantiene el cálculo local cuando no está disponible.
- Actualizado `backend/tests/test_pdt_ai_evaluator.py` para verificar clustering, BCC/CCR, holguras, bootstrap, Malmquist, ARIMA, coseno y c-TF-IDF.

## Verificación

- `uv run --project backend ruff check backend/app/modules/compromisos/pdt_ai_evaluator_graph.py backend/tests/test_pdt_ai_evaluator.py` — correcto.
- `uv run --project backend pytest backend/tests/test_pdt_ai_evaluator.py -q` — 7 passed.

## Nota del entorno

El entorno tiene PuLP 4.0.1, que ya no expone `PULP_CBC_CMD`, y no tiene CBC ejecutable ni `highspy`. El código construye el modelo PuLP y trata de usar CBC/COIN cuando estén disponibles; en este entorno informa el respaldo de SciPy/HiGHS y compara sus puntuaciones. El bootstrap sigue el suavizado/reflexión solicitado sobre scores DEA y etiqueta su estimación como aproximada, pues no vuelve a estimar la frontera dentro de cada réplica. El helper paralelo `pdt_nodos_espacial_predictivo.py` se importa en tiempo de ejecución y no se editó.
