# Orden de Trabajo EAF — Fase [23B] (`agy2`)

- **Agente Asignado:** `agy2` (`=agy2:0.0`)
- **Auditor EAF:** `agy` (`=agy:0.0`)
- **Trabajo en Paralelo con:** `codex` (`[23A]`, propietario de `pdt_dictamen_ejecutivo.py`, `pdt_ai_evaluator_graph.py`, `router.py`, `schemas.py`, `test_pdt_dictamen_ejecutivo.py`).
- **RESTRICCIÓN ABSOLUTA DE ALCANCE:**
  - **100% BACKEND (`backend/scripts/poblar_geodatos_territorios_pdt.py`, `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py`, `backend/tests/test_pdt_nodos_espacial_predictivo.py`, `bridge/`).**
  - **PROHIBIDO tocar cualquier archivo en `src/**` (Frontend) y PROHIBIDO tocar los archivos de `codex` (`pdt_ai_evaluator_graph.py`, `router.py`, `schemas.py`).**

---

## 1. Objetivo de la Fase [23B]

1. **Poblar Polígonos Oficiales de las 15 UCGs en `geodatos.territorios` y Poblar `geodatos.indicadores_territorio` en PostGIS (`bd_csh`):**
   - Actualmente `geodatos.territorios` tiene 15 filas con `ST_MultiPolygon` (`DISTRITO-CTG`, `LOC-1`, `LOC-2`, `LOC-3`, corregimientos, islas y 5 barrios), pero faltan las **15 Unidades Comuneras de Gobierno (`UCG-01` a `UCG-15`)** como registros en `geodatos.territorios`, y la tabla `geodatos.indicadores_territorio` tiene **`0` filas**.
   - Crear y ejecutar el script idempotente `backend/scripts/poblar_geodatos_territorios_pdt.py` que:
     1. Lea las 15 UCGs de `knowledge-base/barrios_cartagena.json` y construya para cada `UCG-01`..`UCG-15` su geometría poligonal `ST_MultiPolygon` (`EPSG:4326`) mediante teselación de Voronoi acotada e intersectada (`ST_Intersection`) con el polígono real de su Localidad padre (`LOC-1`, `LOC-2`, `LOC-3`) en `geodatos.territorios`, haciendo `INSERT ... ON CONFLICT (codigo) DO UPDATE` en `geodatos.territorios` con `tipo_territorio = 'ucg'`, `geometria`, `centroide = ST_Centroid(geometria)` y `poblacion_estimada`.
     2. Calcule y pueble de forma idempotente en `geodatos.indicadores_territorio` (para todos los 29 territorios sub-distritales de `geodatos.territorios` donde `tipo_territorio <> 'distrito'`) **4 indicadores oficiales auditables**:
        - `IND_DENSIDAD_PROGRAMATICA_PDT` (`nombre_indicador`: `"Densidad de Articulación Territorial PDT/PDL y Mesas"`, `unidad_medida`: `"puntaje_evidencia"`)
        - `IND_INVERSION_PER_CAPITA_PDT_COP` (`nombre_indicador`: `"Inversión Pública Territorial Estimada per Cápita"`, `unidad_medida`: `"COP_per_capita"`)
        - `IND_AVANCE_FISICO_TERRITORIAL_PCT` (`nombre_indicador`: `"Avance Físico Ponderado de Metas Territoriales"`, `unidad_medida`: `"porcentaje"`)
        - `IND_REZAGO_ESTRUCTURAL_IPM` (`nombre_indicador`: `"Índice de Rezago Estructural y Presión Social Territorial"`, `unidad_medida`: `"indice_0_100"`)
     3. Ejecuta el script contra `bd_csh` y verifica que `SELECT COUNT(*) FROM geodatos.territorios WHERE tipo_territorio <> 'distrito'` sea `>= 29` con `ST_MultiPolygon` y `SELECT COUNT(*) FROM geodatos.indicadores_territorio` sea `>= 116` (`29 x 4`).

2. **Actualizar `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py` para Geometrías Poligonales Reales PostGIS y Contigüidad `Queen` Exacta:**
   - En `_build_spatial_geodataframe` y `ejecutar_econometria_espacial_pdt`:
     - Si los registros de entrada traen `geojson_geom` (o consultando/reconstruyendo los polígonos reales de `geodatos.territorios`), utiliza los polígonos reales `MultiPolygon`/`Polygon` de PostGIS antes de recurrir al Voronoi sintético.
     - Calcula la matriz de contigüidad espacial $W_{\text{Queen}}$ mediante intersección topológica de bordes/vértices de polígonos proyectados en `EPSG:3116` (`touches` / `intersects` con tolerancia métrica de `15m` para canales/cuerpos de agua de Cartagena) además de $W_{k\text{-NN}}$, y expone el resumen comparativo de los 4 indicadores territoriales (`indicadores_evaluados_multidimensional`).

3. **Pruebas y Calidad:**
   - Ampliar `backend/tests/test_pdt_nodos_espacial_predictivo.py` verificando el soporte de `geojson_geom` poligonal, los 4 indicadores territoriales en `bd_csh` y la contigüidad `Queen` poligonal.
   - Ejecutar `/root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py backend/scripts/poblar_geodatos_territorios_pdt.py backend/tests/test_pdt_nodos_espacial_predictivo.py` y `/root/polis/backend/.venv/bin/pytest backend/tests/test_pdt_nodos_espacial_predictivo.py -q`.
   - Documentar el reporte en `bridge/02_resultado_agy2.md` y notificar a `agy:0.0`:
     ```bash
     tmux send-keys -t =agy:0.0 "AGY2 LISTO [23B]: Poligonos PostGIS (30 territorios ST_MultiPolygon + 116 indicadores_territorio) y Contiguidad Queen exacta en pdt_nodos_espacial_predictivo.py completados y probados. Solicito auditoria EAF." Enter
     ```
