# Orden de Ejecución Backend — `[TRIADA-BACKEND-CIERRE-TOTAL-10]`

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense EAF:** `agy`
- **Ejecutor:** `codex`
- **Rama:** `main` (commit local al finalizar; **prohibido `git push`**)
- **Plan Maestro de referencia:** Lee obligatoriamente `bridge/00_plan_cierre_total_pdd_10.md`.

## Objetivo
Cerrar los 4 puntos técnicos pendientes en `backend/scripts/sincronizar_catalogo_pdd.py`, `backend/app/modules/compromisos/pdd_dea_service.py` y `backend/tests/test_pdd_dea_triada.py`:

1. **100% de los 8 Planes (`5 PDD + 3 PDL`) con PPI Oficial Extraído (`OFICIAL_EXTRAIDO`):**
   - Ya existen en `/root/polis/data/planes_desarrollo/` los nuevos archivos generados por OCR:
     - `pdd_2012_2015_acuerdo_001_campo_para_todos.md`: PPI oficial **`$3.049.788.268.000` COP** (`2012: $718.910.382.000`, `2013: $712.219.309.000`, `2014: $787.872.147.000`, `2015: $830.786.430.000`) y sus **5 Ejes Oficiales** (`Eje 1: $196.661.713.000`, `Eje 2: $2.068.532.775.000`, `Eje 3: $179.995.114.000`, `Eje 4: $434.185.669.000`, `Eje 5: $170.412.997.000`).
     - `pdd_2016_2019_acuerdo_006_primero_la_gente.md`: PPI oficial **`$4.331.941.000.000` COP** (`2016: $976.114.000.000`, `2017: $1.033.268.000.000`, `2018: $1.115.477.000.000`, `2019: $1.207.081.000.000`) y sus **3 Objetivos Estratégicos + Líneas** (`Objetivo 1 Superar la Desigualdad: $3.183.163.000.000`, `Objetivo 2 Adaptar el Territorio para la Gente: $852.631.000.000`, `Objetivo 3 Construir Ciudadanía y Fortalecimiento Institucional: $296.147.000.000`).
   - Actualiza `sincronizar_catalogo_pdd.py` y `pdd_dea_service.py` para que **los 8 planes (`PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027`) tengan `ppi_total_corriente_cop > 0`, `ppi_total_constante_2025_cop > 0` y `ppi_estado = "OFICIAL_EXTRAIDO"`**, y ejecuta `sincronizar_catalogo_pdd.py` contra `bd_csh`.

2. **Emparejamiento Semántico + Entidad + Indicador para `seguimiento.pdd_metas_oficiales`:**
   - En `sincronizar_catalogo_pdd.py`, además del cruce por código exacto (`49` metas), implementa un emparejador determinístico que cruce cada meta oficial de `pdd_metas_oficiales` contra las filas de `seguimiento.registros_triada_normalizados` (`motor_destino = 'PLAN_DESARROLLO'`) del mismo periodo de gobierno usando coincidencia de `entidad_responsable` y/o similitud de tokens significativos (`>= 2` palabras clave compartidas entre `indicador`/`meta_cuatrienio` y `indicador`/`descripcion_actividad`), o asignando la fila representativa de la entidad/línea, guardando en `metadatos` de `pdd_metas_oficiales` el método de vínculo (`CODIGO_EXACTO`, `INDICADOR_ENTIDAD`, `SEMANTICO_PROGRAMA`) y actualizando `registro_triada_id` cuando exista coincidencia verificada. Expón el conteo desglosado en `/explorador-programas-y-seguridad-humana`.

3. **Normalización 100% Canónica de `linea_estrategica` en `cumplimiento-metas` y `frontera_por_linea_estrategica`:**
   - Prohibido devolver nombres de columnas o cortes (`"# DE VIVIENDAS ENTREGADAS"`, `"2018 Junio"`, `"FORMATO PLAN ACCION"`, `"PLAN ACCION IPCC 2019"`, `"1. ESTRATEGICO"`, `"1. Talento Humano"`) como nombre de Línea Estratégica.
   - Toda fila de `PLAN_DESARROLLO` debe clasificarse determinísticamente en una de las **Líneas Estratégicas Canónicas Oficiales de su Plan**:
     - `PDD_2024_2027`: `1. Seguridad Humana`, `2. Vida Digna`, `3. Desarrollo Económico Equitativo`, `4. Ciudad Conectada y Sostenible`, `5. Innovación Pública y Participación Ciudadana`, `6. Capítulo de los Pueblos y Comunidades Étnicas`.
     - `PDD_2020_2023`: `Pilar 1: Cartagena Resiliente`, `Pilar 2: Cartagena Incluyente`, `Pilar 3: Cartagena Contingente`, `Pilar 4: Cartagena Transparente`, `Eje Transversal: Finanzas y Gobernanza` (o sus líneas estratégicas canónicas).
     - `PDD_2016_2019`: `1. Educación para la Gente del Siglo XXI`, `2. Por una Cartagena con Equidad en Salud`, `3. Cartagena Ciudad para Invertir`, `4. Primero la Gente (Inclusión, Cultura y Deporte)`, `5. Gestión del Riesgo y Medio Ambiente`, `6. Desarrollo Urbano, Movilidad y Vivienda`, `7. Cartagena Sin Miedos y Territorio de Paz`, `8. Gestión Pública Transparente y Finanzas Sanas`.
   - Usa palabras clave del texto (`linea_estrategica`, `datos_origen`, `indicador`, `descripcion_actividad`) y el sector de `entidad_normalizada` (ej. `DADIS` -> Salud/Seguridad Humana; `Secretaría de Educación` -> Educación/Vida Digna; `Corvivienda` -> Vivienda/Vida Digna o Desarrollo Urbano; `Distriseguridad`/`Interior` -> Seguridad Humana / Cartagena Sin Miedos; `Hacienda`/`Planeación`/`General` -> Innovación Pública / Transparente / Finanzas Sanas) para que **ninguna fila quede fuera de las Líneas Oficiales del Acuerdo**.

4. **Precalentamiento Automático en Disco (`/tmp/polis_pdd_dea_cache_v10.json`) para Latencia `< 50 ms` en Ambos Workers:**
   - En `pdd_dea_service.py`, añade lectura/escritura de caché en `/tmp/polis_pdd_dea_cache_v10.json` respaldando `_RESULT` en memoria. Al final de `sincronizar_catalogo_pdd.py`, precalcula y escribe `/tmp/polis_pdd_dea_cache_v10.json` con los payloads de las 6 rutas (`plan=TODOS`), de modo que al reiniciar `polis-backend.service` cualquiera de los workers sirva las 6 rutas `/api/v1/compromisos/triada/pdd-dea/*` en **`< 50 ms`** desde la primera petición.

## Archivos Autorizados
- `backend/scripts/sincronizar_catalogo_pdd.py`
- `backend/app/modules/compromisos/pdd_dea_service.py`
- `backend/tests/test_pdd_dea_triada.py`
- `bridge/02_entrega_codex.md`
*(Prohibido tocar `src/` o hacer `git push`).*
