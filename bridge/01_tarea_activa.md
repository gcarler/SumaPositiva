# TAREA ACTIVA PARA AGY2 (DESARROLLADOR BACKEND — ECONOMETRÍA ESPACIAL Y SERIES TEMPORALES)

- **ID de Tarea**: `[PDT-NODOS-ESPACIAL-Y-PREDICTIVO-PROFUNDO-22B]`
- **Fecha / Hora**: 2026-10-18T04:51:00Z
- **Asignado por**: `agy` (`=agy:0.0`)
- **Ejecutor**: `agy2` (`=agy2:0.0`)
- **RESTRICCIÓN ABSOLUTA**: **PROHIBIDO TOCAR FRONTEND (`src/**`)**. Todo el trabajo es 100 % en el motor de análisis de Planes de Desarrollo en el **BACKEND**.
- **Alcance Exclusivo de Archivos**:
  - `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py` (**CREAR**)
  - `backend/tests/test_pdt_nodos_espacial_predictivo.py` (**CREAR**)
  - `bridge/02_resultado_agy2.md` (**ACTUALIZAR**)
  *(NO edites `pdt_ai_evaluator_graph.py` ni `test_pdt_ai_evaluator.py`, ya que `codex` trabaja en ellos en paralelo en `[22A]` e importará tu módulo `pdt_nodos_espacial_predictivo.py`).*

---

## 1. Contexto y Paquetes Científicos Disponibles en `/root/polis/backend/.venv`

En `/root/polis/backend/.venv` ya están instalados:
- `pandas==3.0.6`, `geopandas==1.2.0`, `shapely>=2.1.2`, `pyproj>=3.8.0`
- `statsmodels==0.15.0`, `scikit-learn==1.9.1`, `scipy>=1.14.0`, `pulp==4.0.1`, `numpy`

Tu objetivo es construir el módulo especializado `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py` que implementa con rigor econométrico y estadístico los **Módulos 3, 4 y la Matriz Evaluativa Multi-Sectorial (Sección 4)** de `knowledge-base/13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md`.

---

## 2. Especificación Técnica de `pdt_nodos_espacial_predictivo.py`

Debes exportar tres funciones públicas con firmas limpias y deterministas:

### A. `ejecutar_econometria_espacial_pdt(territory_records: list[dict[str, Any]], unidades_ineficientes_dea: list[str] | None = None, permutations: int = 999) -> dict[str, Any]`
1. **Construcción de `geopandas.GeoDataFrame` (`gdf_spatial`)**:
   - Toma `territory_records` (provenientes de `geodatos.territorios` en PostGIS) y, si hay menos de 20 unidades, enriquece el GeoDataFrame con las Unidades Comuneras de Gobierno (UCG) / Barrios de `knowledge-base/barrios_cartagena.json` (solo cuando `territory_records` proviene del corpus real de Cartagena, manteniendo comportamiento exacto sobre listas sintéticas en tests).
   - Construye geometrías con `shapely.geometry.Point(lon, lat)` en `CRS="EPSG:4326"` y proyecta a `EPSG:3116` (MAGNA-SIRGAS Colombia) para cálculo métrico exacto de distancias en metros/kilómetros.
2. **Matrices de Pesos Espaciales ($W$)**:
   - **Contigüidad Queen sobre teselación/buffers territoriales ($W_{\text{Queen}}$)** y **$k$-Vecinos Más Cercanos ($W_{k\text{-NN}}, k=\min(4, N-1)$)** estandarizadas por fila ($\sum_j w_{ij} = 1$).
3. **Índice Global $I$ de Moran e Índice de Moran Bivariado**:
   - Calcula exactamente:
     $$I = \frac{N}{S_0} \frac{\sum_{i=1}^N \sum_{j=1}^N w_{ij} (y_i - \bar{y})(y_j - \bar{y})}{\sum_{i=1}^N (y_i - \bar{y})^2}$$
   - Ejecuta prueba de permutación Monte Carlo (`permutations=999`, semilla fija `20261018`) y reporta `moran_global_i`, `valor_esperado_e_i = -1/(N-1)`, `z_score`, `p_valor_permutacion` y confirmación de patrón no aleatorio si $p < 0.05$.
4. **Indicadores Locales de Asociación Espacial (LISA $I_i$)**:
   - Calcula para cada unidad territorial:
     $$I_i = \frac{(y_i - \bar{y})}{m_2} \sum_{j=1}^N w_{ij} (y_j - \bar{y}), \quad m_2 = \frac{1}{N}\sum_{i=1}^N (y_i - \bar{y})^2$$
   - Clasifica cada territorio en los **4 cuadrantes del Diagrama de Dispersión de Moran**:
     - `Alto-Alto (Hotspots)`
     - `Bajo-Bajo (Coldspots)`
     - `Alto-Bajo (Outlier espacial)`
     - `Bajo-Alto (Outlier espacial)`
     (tanto con significancia estricta $p < 0.05$ como el cuadrante estructural `cuadrante_moran` para cartografía completa).
   - Cruza `unidades_ineficientes_dea` con los `Bajo-Bajo (Coldspots)` para detectar **"Trampas Territoriales de Gestión Pública"**.

### B. `ejecutar_analitica_predictiva_pdt(normalized_records: list[dict[str, Any]], time_horizon: str = "2024-2027", isri_threshold: float = 0.40) -> dict[str, Any]`
1. **Modelado de Series Temporales con `statsmodels` (`ARIMA` y `VAR`)**:
   - Agrupa las series históricas de indicadores de resultado (`avance_estrategico_pct` / `avance_fisico_pct`) por indicador y por entidad ejecutora a lo largo de las vigencias disponibles (`2017–2026`).
   - Para cada serie con $\ge 4$ observaciones y varianza positiva, ajusta `statsmodels.tsa.arima.model.ARIMA(endog, order=(1, 0, 0))` (con fallback seguro a `statsmodels.api.OLS` si la serie es corta o colineal) para proyectar el valor esperado $\hat{Y}_{t=\text{final}}$ y su error estándar predictivo $\hat{\sigma}_{t=\text{final}}$ al cierre del cuatrienio ($2027$).
   - Ajusta además un modelo multivariado macro-sectorial (`statsmodels.tsa.vector_ar.var_model.VAR` o matriz de covarianza dinámica inter-sectorial) sobre las trayectorias anuales de los **5 sectores prioritarios** (`Educación Pública`, `Salud Pública`, `Infraestructura Vial`, `Desarrollo Agrícola`, `Medio Ambiente`).
2. **Prueba de Ruptura Estructural de Chow (`Chow Test`)**:
   - Evalúa si la entrada en vigor del PDT (`break_year = 2024`) generó un cambio estructural significativo en la pendiente/intercepto de la serie:
     $$F = \frac{(\text{RSS}_{\text{pooled}} - (\text{RSS}_1 + \text{RSS}_2)) / k}{(\text{RSS}_1 + \text{RSS}_2) / (N_1 + N_2 - 2k)}$$
   - Reporta `estadistico_f`, `p_valor`, `grados_libertad` y `ruptura_estructural_significativa` ($p < 0.05$).
3. **Índice de Riesgo de Incumplimiento ($\text{ISRI}$)**:
   - Calcula:
     $$\text{ISRI} = 1 - P(Y_{t=\text{final}} \ge \text{Meta}_{\text{cuatrienio}})$$
   - Si $\text{ISRI} > 0.40$, activa la bandera `"Alto Riesgo de Incumplimiento"`.

### C. `evaluar_matriz_multisectorial_gbr(goal_records: list[dict[str, Any]], activity_records: list[dict[str, Any]], normalized_records: list[dict[str, Any]], dea_scores: dict[str, Any] | None = None, nlp_coherence: dict[str, Any] | None = None, spatial_lisa: dict[str, Any] | None = None, time_series_forecast: dict[str, Any] | None = None) -> list[dict[str, Any]]`
- Construye la evaluación cuantitativa completa de los **5 sectores de la Sección 4**:
  1. `Educación Pública` (MIR: cobertura neta, deserción intra-anual, logro escolar; cruce con DEA CCR/BCC y Malmquist).
  2. `Salud Pública` (MIR: mortalidad infantil/materna, vacunación, tiempos de atención; cruce con LISA / Moran Local).
  3. `Infraestructura Vial` (MIR: km de vías intervenidas, accesibilidad; cruce con NLP / Similaridad Coseno).
  4. `Desarrollo Agrícola` (MIR: rendimiento por hectárea, asistencia técnica; cruce con Índice de Malmquist Techch/Pech).
  5. `Medio Ambiente` (MIR: deforestación, mitigación $\text{CO}_2$, saneamiento; cruce con ARIMA/VAR, Chow e ISRI).
- Incluye para cada sector: metas PDD asociadas, actividades del Plan de Acción, presupuesto apropiado y ejecutado en COP, hallazgos de su nodo principal y recomendación vinculante de reasignación presupuestal.

---

## 3. Pruebas y Entrega

1. Crea `backend/tests/test_pdt_nodos_espacial_predictivo.py` con al menos 6 pruebas que verifiquen:
   - `ejecutar_econometria_espacial_pdt` con `GeoPandas` (`moran_global_i`, `lisa`, cuadrantes `Hotspots`/`Coldspots`/`Outliers` y `trampas_territoriales_gestion_publica`).
   - `ejecutar_analitica_predictiva_pdt` con `statsmodels` (`ARIMA`, `VAR` macro-sectorial, `Chow Test` e `ISRI > 0.40`).
   - `evaluar_matriz_multisectorial_gbr` para los 5 sectores prioritarios.
2. Ejecuta:
   ```bash
   /root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py backend/tests/test_pdt_nodos_espacial_predictivo.py
   /root/polis/backend/.venv/bin/pytest backend/tests/test_pdt_nodos_espacial_predictivo.py -q
   ```
3. Documenta tu entrega en `bridge/02_resultado_agy2.md` y notifica a `=agy:0.0` por `tmux`:
   ```bash
   tmux send-keys -t =agy:0.0 "AGY2 LISTO [22B]: Modulo pdt_nodos_espacial_predictivo.py (GeoPandas Queen/k-NN Moran/LISA + statsmodels ARIMA/VAR/Chow/ISRI + Matriz 5 Sectores GBR) completado y probado. Solicito auditoria EAF." Enter
   ```
