# TAREA ACTIVA PARA CODEX (DESARROLLADOR PRINCIPAL BACKEND — DEA PULP / SIMAR-WILSON + NLP SKLEARN HDBSCAN)

- **ID de Tarea**: `[PDT-NODOS-DEA-PULP-NLP-SKLEARN-ORQUESTACION-22A]`
- **Fecha / Hora**: 2026-10-18T04:51:30Z
- **Asignado por**: `agy` (`=agy:0.0`)
- **Ejecutor**: `codex` (`=codex:0.0`)
- **RESTRICCIÓN ABSOLUTA**: **PROHIBIDO TOCAR FRONTEND (`src/**`)**.
- **Alcance Exclusivo de Archivos**:
  - `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` (**ACTUALIZAR**)
  - `backend/tests/test_pdt_ai_evaluator.py` (**ACTUALIZAR**)
  - `bridge/02_resultado_codex.md` (**ACTUALIZAR**)
  *(Nota: `agy2` está creando en paralelo `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py` y `backend/tests/test_pdt_nodos_espacial_predictivo.py`; NO edites los archivos de `agy2`, impórtalos con `try/except ImportError` desde `pdt_ai_evaluator_graph.py` si están listos).*

---

## 1. Nuevas Librerías Instaladas en `/root/polis/backend/.venv`

Acabamos de instalar en `/root/polis/backend/.venv`:
- `pulp==4.0.1`
- `scikit-learn==1.9.1` (`TfidfVectorizer`, `TruncatedSVD`, `HDBSCAN`, `cosine_similarity`)
- `statsmodels==0.15.0`
- `pandas==3.0.6`
- `geopandas==1.2.0`

Debes actualizar `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py` para eliminar los mensajes de `"NO_DISPONIBLE"` / `"no están instalados"` y reemplazarlos por ejecución matemática e instrumental real usando `PuLP`, `scikit-learn`, `pandas`, `geopandas` y `statsmodels`.

---

## 2. Mejoras Técnicas Obligatorias en `pdt_ai_evaluator_graph.py`

1. **Módulo 1 — Nodo DEA (`_dea_node`) con `PuLP` + `scipy.optimize` + Simar-Wilson Smoothed Bootstrap ($B=1000$) + Malmquist 4-LP**:
   - Implementa el solver DEA CCR ($\theta_o^{\text{CCR}}$) y BCC ($\theta_o^{\text{BCC}}$ con $\sum_{j=1}^n \lambda_j = 1$) soportando tanto `pulp` (`LpProblem`, `LpMinimize`, `PULP_CBC_CMD(msg=False)`) como vectorización rápida con `scipy.optimize.linprog(method="highs")`, verificando equivalencia exacta y extrayendo **holguras de insumos y productos (*input/output slacks*)**.
   - **Bootstrap Suavizado Simar-Wilson ($B=1000$)**: Implementa el método de reflexión de Silverman en la frontera $\theta = 1.0$ (`2.0 - scores` reflejados con kernel gaussiano $h = 1.06 \hat{\sigma} n^{-1/5}$, truncado y reescalado en $(0, 1]$) para estimar por cada DMU y para el agregado:
     - Eficiencia corregida por sesgo $\hat{\theta}_o^* = 2\hat{\theta}_o - \bar{\theta}_o^{\text{boot}}$
     - Sesgo estimado $\widehat{\text{bias}}(\hat{\theta}_o)$
     - Intervalo de confianza al $95\%$ $[\text{IC}_{2.5\%}, \text{IC}_{97.5\%}]$.
   - **Índice de Productividad de Malmquist (MPI)**: Descomposición formal en **Cambio en Eficiencia Pura ($\text{Pech}$)** y **Cambio Técnico ($\text{Techch}$)**:
     $$\text{MPI}_o^{t, t+1} = \text{Pech} \times \text{Techch}$$
     evaluando las distancias cruzadas entre los periodos consecutivos $t$ y $t+1$.

2. **Módulo 2 — Nodo NLP (`_nlp_node`) con `scikit-learn` (`TfidfVectorizer` + `TruncatedSVD` + `HDBSCAN` + $c\text{-TF-IDF}$ + `cosine_similarity`)**:
   - Elimina `"estado": "NO_DISPONIBLE"` en `clustering_topologico`:
     - Vectoriza el corpus de metas estratégicas ($O_k$) y actividades operativas ($A_m$) con `TfidfVectorizer(ngram_range=(1, 2), max_features=4096)` y proyecta embeddings densos con `TruncatedSVD(n_components=min(64, n_features - 1), random_state=42)` (`estado = "COMPLETADO"`).
     - Ejecuta reducción y agrupamiento denso topológico con aislamiento de ruido mediante `sklearn.cluster.HDBSCAN(min_cluster_size=5, copy=True)` (con fallback automático para corpus sintéticos pequeños $< 10$ documentos en tests unitarios).
     - Calcula la ponderación **$c\text{-TF-IDF}$** exacta:
       $$W_{x, c} = \text{tf}_{x, c} \times \log \left( 1 + \frac{A}{f_x} \right)$$
       tanto por **cluster descubierto por HDBSCAN** como por cada uno de los **5 sectores prioritarios**.
     - Calcula la **Matriz de Similaridad Coseno** $\text{Similaridad Coseno}(O_k, A_m) = \frac{e(O_k) \cdot e(A_m)}{\|e(O_k)\| \|e(A_m)\|}$ de forma vectorizada en bloques/candidatos rápidos (`< 1.5s` sobre los `4,637` objetivos), disparando alerta `"Desalineación Estratégica / Mission Creep"` para valores $< 0.45$.

3. **Integración con `pdt_nodos_espacial_predictivo.py` (creado por `agy2`)**:
   - En `_spatial_node` y `_predictive_node` (y en `_public_result`), intenta importar `ejecutar_econometria_espacial_pdt`, `ejecutar_analitica_predictiva_pdt` y `evaluar_matriz_multisectorial_gbr` desde `.pdt_nodos_espacial_predictivo` (con fallback a la implementación interna si aún no está disponible o si se invoca aisladamente) para enriquecer `spatial_lisa`, `time_series_forecast` (`ARIMA/VAR` con `statsmodels`) y `evaluacion_multisectorial`.

---

## 3. Pruebas y Entrega

1. Actualiza `backend/tests/test_pdt_ai_evaluator.py` verificando que:
   - `clustering_topologico["estado"] == "COMPLETADO"` (con `HDBSCAN` y `TruncatedSVD`).
   - `dea_scores` incluye `slacks`, `bias_corrected` Simar-Wilson ($B=1000$) y `Malmquist`.
   - Todas las pruebas existentes siguen pasando (`pytest backend/tests/test_pdt_ai_evaluator.py -q`).
2. Corre `ruff check backend/app/modules/compromisos/pdt_ai_evaluator_graph.py backend/tests/test_pdt_ai_evaluator.py`.
3. Escribe tu reporte en `bridge/02_resultado_codex.md` y notifica a `=agy:0.0` por `tmux`:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [22A]: Nodos DEA (PuLP + Simar-Wilson B=1000 + Malmquist) y NLP (TruncatedSVD + HDBSCAN + c-TF-IDF + Coseno) actualizados y probados. Solicito auditoria EAF." Enter
   ```
