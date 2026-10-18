# ORDEN DE EJECUCIÓN: `[OPTIMIZACION-MOTORES-PDD-19A]`

**Agente Asignado:** `codex` (`=codex:0.0`)
**Rol:** Arquitecto Backend de Rendimiento y Motores de Planeación PDD/PDL
**Coordinador y Auditor Forense EAF:** `agy` (`=agy:0.0`)
**Rama:** `main` (Única rama autorizada. Política **Zero-Push**: commit local únicamente).
**Ámbito Exclusivo:** `backend/app/modules/compromisos/**`, `backend/tests/**`, `data/planes_desarrollo/**` y `bridge/02_entrega_codex.md`.
**Aislamiento Estricto:** **PROHIBIDO tocar `src/**`**.

---

## 1. Diagnóstico de Rendimiento Detectado en Vivo

Al perfilar en vivo los **7 motores de análisis de Planes de Desarrollo** en `http://127.0.0.1:8000`, encontramos 3 cuellos de botella tras el crecimiento de la BD a `4.236` metas PDD, `1.573` nodos y `7.640+` registros de la tríada:

1. **`PddDeaService._state()` y `CACHE_V11` en `/tmp` (`pdd_dea_service.py` línea 53):**
   - `CACHE_V11 = Path("/tmp/polis_pdd_dea_cache_v11.json")` se borra en cada reinicio del servidor.
   - En frío, `PddDeaService._state()` tarda **`30.68 s`**, provocando que la primera llamada a `GET /api/v1/compromisos/triada/pdd-dea/resumen-ejecutivo` sufra timeout (`> 30 s`). Una vez en caché, tarda `0.00 s`.
2. **`InteligenciaTriadaService._snapshot()` y `resumen_ejecutivo()` sin caché en disco (`inteligencia_triada_service.py`):**
   - `_CACHE` y `_RESULTS` viven solo en RAM por worker. En frío tras reiniciar `uvicorn`, `_snapshot()` tarda `13.38 s` y la suma de `patologias_dnp` (`1.43 s`) + `continuidad_gobiernos` (`4.20 s`) + `radar_transparencia` (`1.91 s`) + `alineacion_territorial` (`5.30 s`) + `simulador_cierre` (`0.38 s`) lleva `GET /api/v1/compromisos/triada/inteligencia/resumen-ejecutivo` a **`26.60 s`** por worker.
3. **Payload de `14,77 MB` en `GET /api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo` (`pdd_dea_service.py` línea 1115):**
   - `comparativo_seguridad_humana_pdd_only()` devuelve en cada petición HTTP los arreglos completos `nodos` (`1.573` objetos completos) y `metas` (`4.637` objetos completos) tanto en la raíz como dentro de cada plan, generando un JSON de **`14,77 MB`** (`1.13 s` de serialización en cada llamada, sin usar `_cached`/`_store`), y además en cada elemento de `planes_pdd` no incluye el conteo directo `metas_pdd_unicas` ni `nodos_por_frontalidad`.

---

## 2. Entregables Técnicos Obligatorios

### Entregable 1 — Caché Durable de `PddDeaService` fuera de `/tmp` (`pdd_dea_service.py`)
1. Mover `CACHE_V11` de `/tmp/polis_pdd_dea_cache_v11.json` a una ruta durable en el proyecto:
   `BASE_DIR / "cache_pdd_dea_v11.json"` (con fallback seguro a `/tmp` solo si ocurriera `OSError`).
2. Asegurar que todos los endpoints de `pdd-dea` (`catalogo_y_conciliacion_ppi`, `cumplimiento_metas`, `frontera_dea_pdd`, `econometria_comparada_pdd`, `explorador_programas_y_seguridad_humana`, `laboratorio_prescriptivo_pdd` y `resumen_ejecutivo`) queden pre-calculados y almacenados en `BASE_DIR / "cache_pdd_dea_v11.json"`, de modo que tras cualquier reinicio de `polis-backend.service`, la primera petición a cualquiera de ellos responda en **`< 100 ms`**.

### Entregable 2 — Caché Durable en Disco para `InteligenciaTriadaService` (`inteligencia_triada_service.py`)
1. Añadir persistencia en disco en `BASE_DIR / "cache_inteligencia_triada_6m.json"` para las respuestas por defecto de `InteligenciaTriadaService` (`patologias_dnp`, `continuidad_gobiernos`, `radar_transparencia`, `alineacion_territorial`, `simulador_cierre` y `resumen_ejecutivo`), cargándola automáticamente en memoria al iniciar o al primer acceso de cada worker de `uvicorn`.
2. Pre-calentar y guardar `BASE_DIR / "cache_inteligencia_triada_6m.json"` para que `GET /api/v1/compromisos/triada/inteligencia/resumen-ejecutivo` responda en **`< 100 ms`** incluso recién reiniciado `polis-backend.service`.

### Entregable 3 — Optimización y Compactación de `seguridad-humana-comparativo` (`pdd_dea_service.py` y `router.py`)
1. En `comparativo_seguridad_humana_pdd_only(self, *, incluir_detalle: bool = True)` y en la ruta HTTP `GET /api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo`:
   - Agregar en la ruta HTTP el query param `incluir_detalle: bool = Query(False, description="Incluir arreglos crudos de nodos y metas")` (nota: en el método Python `comparativo_seguridad_humana_pdd_only(self, *, incluir_detalle: bool = True)` mantén el default `True` cuando se llama directamente desde Python/tests/GoogleWorkspaceSyncService para preservar 100% compatibilidad hacia atrás con `test_pdd_seguridad_humana_16.py`, pero desde el endpoint HTTP en `router.py` pasa `incluir_detalle=incluir_detalle` cuyo default de Query sea `False`).
   - En cada plan de `planes_pdd`, incluir siempre los conteos resumidos explícitos: `nodos_total`, `total_nodos`, `metas_pdd`, `total_metas`, `metas_pdd_unicas`, `nodos_por_frontalidad` (`{"A": ..., "B": ..., "C": ..., "N": ...}`) y `porcentaje_a_b_sobre_ppi`.
   - Cuando `incluir_detalle=False`, omitir los arreglos pesados `nodos` y `metas` (tanto en el nivel raíz como dentro de cada plan de `planes_pdd` y `anexo_pdl`) y cachear la respuesta con `_cached`/`_store` + `pre_serialized_response`, reduciendo el tamaño HTTP por defecto de `14,77 MB` a **`< 150 KB`** y la latencia a **`< 50 ms`**.
   - Cuando `incluir_detalle=True`, devolver el payload completo con `nodos` y `metas`.

### Entregable 4 — Pruebas, Precalentamiento y Notificación
1. Añadir pruebas en `backend/tests/test_motor_multiagente_pdd.py` verificando:
   - Que `GET /api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo` (default `incluir_detalle=false`) responde HTTP 200, pesa `< 300 KB` y cada plan en `planes_pdd` trae `nodos_total`, `metas_pdd_unicas`, `nodos_por_frontalidad` y `porcentaje_a_b_sobre_ppi`.
   - Que `GET /api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo?incluir_detalle=true` incluye las listas completas `nodos` y `metas`.
2. Ejecutar y aprobar:
   - `/root/polis/backend/.venv/bin/ruff check` sobre los archivos modificados.
   - `/root/polis/backend/.venv/bin/pytest backend/tests/test_motor_multiagente_pdd.py backend/tests/test_pdd_seguridad_humana_16.py backend/tests/test_pdd_dea_triada.py backend/tests/test_access_policy.py`
3. Generar/actualizar los archivos de caché durables en `data/planes_desarrollo/`, reiniciar `polis-backend.service` y comprobar con `curl` que los **7 endpoints** responden HTTP 200 en **`< 0.25 s`** cada uno.
4. Registrar la entrega en `bridge/02_entrega_codex.md`, hacer commit local en `main` (sin `git push`) y notificar por `tmux` a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [19A]: Optimizacion y cache durable de los 7 motores PDD completada (<200ms). Solicito auditoria EAF." Enter
   ```
