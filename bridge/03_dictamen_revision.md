# Dictamen de Auditoría EAF — Fase [22B] (`agy2`)

- **Agente Auditado:** `agy2` (`=agy2:0.0`)
- **Auditor EAF:** `agy` (`=agy:0.0`)
- **Fase:** `[22B]` — Econometría Espacial (`GeoPandas` + `Shapely` Voronoi/Queen/$k$-NN + Moran Global/Bivariado + LISA) y Analítica Predictiva (`statsmodels` `ARIMA`/`VAR`/`Chow`/`ISRI` + Matriz Evaluativa Multi-Sectorial GBR de 5 Sectores) en `pdt_nodos_espacial_predictivo.py`
- **Alcance:** 100% Backend (`backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py`, `backend/tests/test_pdt_nodos_espacial_predictivo.py`) — **0 cambios en Frontend (`src/**`)**.
- **Veredicto:** **APROBADO (100% Cumplimiento Doctrinal y Matemático)**

---

## 1. Verificación de Entregables y Puertas de Calidad

1. **Econometría Espacial (`ejecutar_econometria_espacial_pdt`):**
   - Construcción de `GeoDataFrame` real en `EPSG:4326` y proyección métrica `EPSG:3116` (MAGNA-SIRGAS Colombia) con teselación de polígonos Voronoi acotados (`shapely.ops.voronoi_diagram`) sobre **29 unidades territoriales auditables** de Cartagena (14 territorios sub-distritales con geometría en `bd_csh` + 15 Unidades Comuneras de Gobierno de `barrios_cartagena.json` vinculadas a la matriz territorial del Plan de Desarrollo).
   - Matrices de pesos espaciales estocásticas por fila ($W_{\text{Queen}}$ por contigüidad topológica de polígonos y $W_{k\text{-NN}}$ con $k=4$).
   - **Moran Global ($I = 0.08826$, $Z = 1.1585$, $p = 0.1460$)**, **Moran Bivariado ($I_{XY} = -0.17435$, $p = 0.0360$)** entre inversión per cápita y rezago estructural, e **Indicadores Locales de Asociación Espacial (LISA)** con $999$ permutaciones Monte Carlo.
   - Detección de Coldspots (`Localidad 3: Industrial y de la Bahía`, `Pasacaballos`, `UCG 13 (Localidad 3)`) y cruce con unidades DEA ineficientes para identificar **43 `"Trampas Territoriales de Gestión Pública"`**.
2. **Analítica Predictiva e Índice ISRI (`ejecutar_analitica_predictiva_pdt`):**
   - Evaluación de **3.131 series longitudinales** y estimación completa de **968 series multianuales** ($n \ge 3$ vigencias) mediante `statsmodels.tsa.arima.model.ARIMA` y `OLS` log-lineal, además de **modelo macro-sectorial multivariado `VAR(1)` (`statsmodels.tsa.api.VAR`)** sobre las trayectorias anuales de los 5 sectores GBR (`2017–2026`).
   - **Prueba de Ruptura Estructural de Chow (`anio_ruptura = 2024`)** con estadístico $F$ exacto y $p$-valor de Fisher-Snedecor.
   - **Índice Sintético de Riesgo de Incumplimiento ($\text{ISRI}_k = \sum \omega_j (1 - P(\hat{Y}_{k,T} \ge \text{Meta}_{k,T}))$)** identificando **696 series en Alto Riesgo ($\text{ISRI} > 0.40$)** y **8 patrones compuestos críticos**.
3. **Matriz Evaluativa Multi-Sectorial GBR (`evaluar_matriz_multisectorial_gbr`):**
   - Cobertura completa de los 5 sectores prioritarios (**Educación Pública, Salud Pública, Infraestructura Vial, Desarrollo Agrícola y Medio Ambiente**) con insumos presupuestales reales de `bd_csh`, metas de producto/resultado, clasificación programática MGA/SisPT y recomendaciones prescriptivas de reasignación presupuestaria.
4. **Calidad y Pruebas:**
   - `ruff check`: `All checks passed!`
   - `pytest`: `16 passed`
