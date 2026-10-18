# Resultado de Ejecución — AGY2 (`=agy2:0.0`) — Fase `[23B]`

- **ID de Tarea**: `Fase [23B]` (`Polígonos PostGIS UCGs + Indicadores Territoriales + Contigüidad Queen Exacta`)
- **Fecha / Hora UTC**: `2026-10-18T15:46:00Z`
- **Agente Ejecutor**: `agy2` (`=agy2:0.0`)
- **Estado**: **COMPLETADO — LISTO PARA AUDITORÍA EAF (`=agy:0.0`)**

---

## 1. Archivos Creados / Actualizados (Aislamiento Estricto Cumplido)

1. `backend/scripts/poblar_geodatos_territorios_pdt.py` (**CREADO Y EJECUTADO**)
   - Lee las **15 Unidades Comuneras de Gobierno (`UCG-01`..`UCG-15`)** desde `knowledge-base/barrios_cartagena.json` y construye para cada UCG su geometría poligonal `ST_MultiPolygon` (`EPSG:4326`) mediante teselación de Voronoi acotada e intersectada (`ST_Intersection`) con el polígono real de su Localidad padre (`LOC-1`, `LOC-2`, `LOC-3`) en `geodatos.territorios`.
   - Realiza `INSERT ... ON CONFLICT (codigo) DO UPDATE` en `geodatos.territorios` con `tipo_territorio = 'ucg'`, `geometria` (`ST_MultiPolygon`), `centroide = ST_PointOnSurface(geometria)`, `poblacion_estimada` y `estrato_predominante`.
   - Calcula y puebla idempotentemente en `geodatos.indicadores_territorio` (para los **29 territorios sub-distritales** donde `tipo_territorio <> 'distrito'`) los **4 indicadores oficiales auditables** (`29 x 4 = 116` filas):
     - `IND_DENSIDAD_PROGRAMATICA_PDT` (`"Densidad de Articulación Territorial PDT/PDL y Mesas"`, `"puntaje_evidencia"`)
     - `IND_INVERSION_PER_CAPITA_PDT_COP` (`"Inversión Pública Territorial Estimada per Cápita"`, `"COP_per_capita"`)
     - `IND_AVANCE_FISICO_TERRITORIAL_PCT` (`"Avance Físico Ponderado de Metas Territoriales"`, `"porcentaje"`)
     - `IND_REZAGO_ESTRUCTURAL_IPM` (`"Índice de Rezago Estructural y Presión Social Territorial"`, `"indice_0_100"`)
   - Resultado verificado en `bd_csh`:
     ```json
     {
       "territorios_sub_distritales": 29,
       "total_ucgs": 15,
       "total_multipolygon": 30,
       "total_indicadores_territorio": 116,
       "indicadores_upserted": 116
     }
     ```

2. `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py` (**ACTUALIZADO**)
   - `_parse_postgis_polygon` y `_build_spatial_geodataframe`: priorizan los polígonos reales `MultiPolygon`/`Polygon` de PostGIS (`geojson_geom` / `wkt_geom`), proyectándolos a `EPSG:3116` (MAGNA-SIRGAS Colombia) antes de recurrir al Voronoi sintético.
   - `_build_queen_weights_from_gdf`: calcula la matriz de contigüidad espacial $W_{\text{Queen}}$ mediante intersección topológica de bordes/vértices de polígonos proyectados en `EPSG:3116` (`touches` / `intersects` + tolerancia métrica de `15.0m` para canales/cuerpos de agua internos de Cartagena), estandarizada por fila.
   - `ejecutar_econometria_espacial_pdt`: reporta `poligonos_reales_postgis`, `tolerancia_queen_canales_m`, `moran_global_queen_i`, `moran_global_knn_i`, `vecinos_queen` por unidad LISA y el resumen comparativo de los 4 indicadores territoriales en `indicadores_evaluados_multidimensional`.

3. `backend/tests/test_pdt_nodos_espacial_predictivo.py` (**ACTUALIZADO**)
   - Ampliado a **8 pruebas**, incluyendo `test_econometria_espacial_geojson_geom_poligonal_queen_exacta` y `test_postgis_bd_csh_29_territorios_multipolygon_y_116_indicadores`.

> **Verificación de Aislamiento**: Cero archivos tocados en `src/**` (frontend), ni en `pdt_ai_evaluator_graph.py`, `router.py` o `schemas.py`.

---

## 2. Evidencia de Verificación (`ruff` y `pytest`)

```text
$ /root/polis/backend/.venv/bin/ruff check backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py backend/scripts/poblar_geodatos_territorios_pdt.py backend/tests/test_pdt_nodos_espacial_predictivo.py
All checks passed!

$ /root/polis/backend/.venv/bin/pytest backend/tests/test_pdt_nodos_espacial_predictivo.py -q
........                                                                 [100%]
8 passed in 4.90s
```
