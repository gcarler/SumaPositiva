# TAREA BACKEND: `[TRIADA-BACKEND-LAB-PDD-11B]`
## IMPLEMENTACIÓN DEL LABORATORIO PRESCRIPTIVO PDD: 8/8 PLANES CON METAS OCR, GRAFO DE PROVENIENCIA Y ORFANDAD, NETWORK DEA BI-ETAPA, SIMULADOR INVERSE DEA PARETO, POBLACIÓN DANE EN TERRITORIOS Y RESPUESTAS PRE-SERIALIZADAS (`< 25 ms`)

- **Para:** Desarrollador Principal Backend y Econometría (`codex`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 15 de octubre de 2026
- **Plan Maestro de Referencia:** `bridge/00_plan_lab_prescriptivo_pdd_11b.md`
- **Política Git:** **Zero-Push Estricta** (Solo commit local en `main`). No tocar ningún archivo dentro de `src/`.

---

## 1. Alcance Exacto a Implementar por `codex`

### 1.1. `backend/scripts/sincronizar_catalogo_pdd.py`
1. **Extracción OCR de metas/indicadores para `PDD_2012_2015` y `PDD_2016_2019`:**
   - Añadir un extractor de bloques OCR para `pdd_2012_2015_acuerdo_001_campo_para_todos.md` y `pdd_2016_2019_acuerdo_006_primero_la_gente.md` (y fallback determinístico curado de las metas emblemáticas de sus 5 Ejes / 3 Objetivos y 8 Líneas Estratégicas si el texto OCR de alguna tabla está fragmentado) de modo que **los 8 planes (`5 PDD + 3 PDL`) tengan metas reales (> 0) en `seguimiento.pdd_metas_oficiales`**.
2. **Deduplicación `Bases vs. Ponencia` en `PDD_2024_2027` y Descomposición Forense de Orfandad + Taxonomía MGA:**
   - En el emparejamiento de `seguimiento.pdd_metas_oficiales`, persistir dentro de `datos_oficiales["_auditoria_forense"]` y `datos_oficiales["_vinculo_triada"]`:
     - `estado_cobertura`: una de las 6 categorías (`VINCULADA_ALTA_CONFIANZA`, `CANDIDATO_BAJA_CONFIANZA`, `DUPLICADA_ENTRE_FUENTES_PDD`, `SIN_CORPUS_HISTORICO`, `SIN_CODIGO_O_ENTIDAD`, `SIN_REPORTE_EN_CORPUS_CUBIERTO`).
     - `taxonomia_mga`: una de las 4 categorías (`RESULTADO_IMPACTO`, `PRODUCTO_CUANTIFICABLE`, `GESTION_PROCESO_BLANDO`, `REVISION_HUMANA`).
3. **Denominadores Demográficos Oficiales en `geodatos.territorios`:**
   - En `sincronizar_catalogo_pdd.py`, poblar de forma idempotente `poblacion_estimada` en `geodatos.territorios` cuando sea `NULL` para el Distrito de Cartagena (`1065570`) y las 3 Localidades (`Localidad 1`: `412580`, `Localidad 2`: `348190`, `Localidad 3`: `304800`) y asignar población estimada a los 5 barrios / 3 corregimientos / 3 zonas insulares del catálogo sin modificar sus geometrías ni IDs.

### 1.2. `backend/app/modules/compromisos/pdd_dea_service.py` y `router.py`
1. **Nuevo método `laboratorio_prescriptivo_pdd()` y ruta pública `GET /api/v1/compromisos/triada/pdd-dea/laboratorio-prescriptivo`:**
   - Registrar la ruta en `backend/app/modules/compromisos/router.py` y en `docs/permisos-api.md` (para que `test_access_policy.py` pase al 100%).
   - El payload de `laboratorio_prescriptivo_pdd()` (y su resumen en `resumen_ejecutivo()`) debe incluir:
     - `auditoria_metas_8_planes`: conteo de metas por cada uno de los 8 planes (todos con `total_metas > 0`), desglose por las 6 categorías de `estado_cobertura` y por las 4 categorías de `taxonomia_mga` (`indice_rigor_mga_por_plan`).
     - `network_dea_bi_etapa`: evaluación por entidad con `score_etapa1_operativa_pa`, `score_etapa2_estrategica_pdd`, `score_global_red`, `brecha_ilusion_burocratica`, `clasificacion_red` (`ALTA_EFECTIVIDAD_INTEGRAL`, `ILUSION_BUROCRATICA`, `REZAGO_OPERATIVO`, `NO_ESTIMABLE`) y `estabilidad_ranking` (`rango_cuartiles`, `estado_estabilidad`: `ESTABLE` / `MODERADO` / `VOLATIL`).
     - `simulador_inverse_dea_pareto`: escenarios para `flexibilidad_pct` en `[5, 10, 15]` con `presupuesto_reasignable_cop`, `ganancia_potencial_cumplimiento_pp`, `asignaciones_por_linea`, `ledger_restricciones` y `advertencia_no_causal`.
     - `justicia_territorial_pdl`: tabla de las 3 Localidades con `poblacion_dane`, `ppi_corriente_cop`, `ppi_constante_2025_cop`, `inversion_per_capita_cop`, `mesas_ciudadanas`, `mesas_por_100k_hab`, comparativo descriptivo de `zonas_hurtos` (`n=2`: Urbano vs. Rural/Insular) y `compuerta_moran`: `{"estado": "NO_ESTIMABLE_N_MENOR_30", "n_poligonos_delito": 2, "n_localidades": 3, "minimo_requerido": 30}`.
     - `pliegos_control_politico`: lista de pliegos automáticos de hallazgos por entidad con `entidad`, `nivel_alerta`, `metas_sin_reporte`, `brecha_network_dea`, `hallazgos_clave`, `preguntas_control_politico` y `hash_evidencia_sha256`.
2. **Optimización de Latencia `< 25 ms` con Bytes Pre-Serializados (`Response` + `ETag`):**
   - Guardar en `/tmp/polis_pdd_dea_cache_v11.json` los 7 payloads del módulo PDD-DEA y mantener en memoria un diccionario `_RAW_JSON_BYTES: dict[str, tuple[bytes, str]]` (bytes UTF-8 pre-serializados + `ETag` SHA-256) cargado al importar el módulo (`_read_disk_cache()`).
   - En `router.py`, permitir que las rutas `/api/v1/compromisos/triada/pdd-dea/*` devuelvan directamente `Response(content=raw_bytes, media_type="application/json", headers={"ETag": etag, "X-Polis-Cache": "HIT-V11"})` (y `304 Not Modified` si coincide `If-None-Match`), logrando **`< 25 ms` reales incluso en los payloads de 2 MB**.

### 1.3. Pruebas y Verificación
- Ampliar `backend/tests/test_pdd_dea_triada.py` con al menos 5 pruebas nuevas que verifiquen:
  1. Que los 8 planes tienen metas en `auditoria_metas_8_planes` y las 6 categorías de `estado_cobertura` + 4 de `taxonomia_mga`.
  2. Que `network_dea_bi_etapa` cumple $0 < \theta_1, \theta_2 \le 1$ y detecta `ILUSION_BUROCRATICA` e incluye `estabilidad_ranking`.
  3. Que `simulador_inverse_dea_pareto` conserva balance presupuestal ($\sum \Delta X = 0$) para `5%`, `10%` y `15%`.
  4. Que `justicia_territorial_pdl` incluye `poblacion_dane > 0`, `inversion_per_capita_cop > 0` y `compuerta_moran.estado == "NO_ESTIMABLE_N_MENOR_30"`.
  5. Que las 7 rutas `/api/v1/compromisos/triada/pdd-dea/*` responden `HTTP 200` en `< 25 ms` con header `ETag`.
- Ejecutar `sincronizar_catalogo_pdd.py` y `warm_pdd_cache()`, reiniciar `polis-backend.service`, validar las 7 rutas en vivo, documentar al final de `bridge/02_entrega_codex.md` y hacer **commit local en `main`**.
