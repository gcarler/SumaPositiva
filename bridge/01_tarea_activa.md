# Tarea Activa — Fase `[32B]` (`agy2` — `=agy2:0.0`)

- **Fecha:** 2026-10-19
- **Coordinador EAF:** `agy` (`=agy:0.0`)
- **Alcance:** **100% BACKEND y PostgreSQL `bd_csh` (`PROHIBIDO tocar src/**`, `pdt_revision_por_meta.py`, `pdt_informe_integral_spd.py` o `router.py`).**

---

## 1. Archivos Autorizados para `agy2` en `[32B]`
1. `backend/app/modules/compromisos/pdt_normalizador_canonico_metas.py` *(NUEVO)*
2. `backend/app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py`
3. `backend/scripts/poblar_vinculos_meta_pa_triada.py`
4. `backend/tests/test_pdt_normalizador_y_vinculos_8planes.py` *(NUEVO)*
5. `bridge/02_resultado_agy2.md`

*(PROHIBIDO modificar `src/**`, `pdt_revision_por_meta.py`, `pdt_informe_integral_spd.py`, `test_pdt_revision_por_meta.py` o `test_pdt_ai_evaluator.py`, que pertenecen a `codex` en `[32A]`).*

---

## 2. Especificación Técnica Detallada

### 2.1 Nuevo Módulo `backend/app/modules/compromisos/pdt_normalizador_canonico_metas.py`
Crear un normalizador determinista y ejecutarlo sobre las **`4,637` filas** de `seguimiento.pdd_metas_oficiales` en `bd_csh` (cubriendo los 8 planes: `PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027`):

1. **Normalización de llaves OCR en `datos_oficiales`:**
   - **Responsable (`responsable_canonico`):**
     - Rescatar de `"Responsable"`, `"Responsabl e"`, `"Responsab le"`, `"RESPONSABLE"`, `"responsable"`, `"entidad_responsable"`, `"Concurrencia"`.
     - En `PDL_1_2024_2027`: mapear `"columna_9": "LHCN"` (o vacío) a `"Alcaldía Local 1 — Histórica y del Caribe Norte (LHCN)"`.
     - En `PDL_2_2024_2027`: si `"Concurrencia"` está presente, usarla; si está vacío, usar `"Alcaldía Local 2 — De la Virgen y Turística"`.
     - En `PDL_3_2024_2027`: si `"RESPONSABLE"` dice fragmentos OCR como `"Industrial y de la"`, `"Bahía"` o está vacío, normalizar a `"Alcaldía Local 3 — Industrial y de la Bahía"`.
     - En `PDD_*`: si la fila no trae llave explícita de responsable en `datos_oficiales`, buscar primero en el registro vinculado de `seguimiento.registros_triada_normalizados.entidad_normalizada` (usando `datos_oficiales->'_vinculo_triada'->>'registro_triada_id'`) o inferir la Secretaría/Ente oficial desde `linea_nombre` / `nombre` / `indicador`.
   - **Línea Base (`linea_base_texto` y `linea_base_numerica`):**
     - Rescatar de `"Línea base"`, `"Línea Base Año 2023"`, `"Linea Base Año 2023"`, `"línea Base Año 2023"`, `"LINEA BASE"`, `"linea_base"`, o `"columna_2"` en `PDL_1_2024_2027`.
     - Extraer el número inicial (`"0 Fuente: Secretaría de Hacienda 2023" -> 0.0`, `"0.78 homicidios..." -> 0.78`, `"1183 casos..." -> 1183.0`). Si es `"ND"` / `"N/D"` / vacío, `linea_base_numerica = None`.
   - **Meta Cuatrienio (`meta_cuatrienio_texto` y `meta_cuatrienio_numerica`):**
     - Rescatar de `"Meta del cuatrienio"`, `"Meta del"`, `"Meta Cuatrienio"`, `"META DEL CUATRENIO"`, `"META DEL CUATRENI O"`, `"META DEL"`, `"meta_cuatrienio"`, o `"columna_4"` en `PDL_1_2024_2027`.
     - Extraer el valor numérico tanto de paréntesis (`"cuatro (4)" -> 4.0`, `"cien (100)" -> 100.0`), como de decimales con coma (`"0,4" -> 0.4`), miles con punto (`"25.265" -> 25265.0`) y números en palabras en español (`"uno".."mil"`).
   - **Unidad de Medida (`unidad_medida_canonica`):**
     - Rescatar de columna `unidad_medida`, llave `"Unidad de medida"`, `"unidad_medida"`, o inferir del texto del `indicador` / `nombre` (`"Porcentaje (%)"`, `"Tasa"`, `"Kilómetros (km)"`, `"Hectáreas (ha)"`, `"Índice / Puntaje"`, `"Número / Unidades"`).
   - **Código de Meta (`codigo_meta_canonico`):**
     - Si la columna `codigo` está vacía o nula en `seguimiento.pdd_metas_oficiales`, poblarla determinísticamente como `f"M-{fila_fuente:04d}"` (o secuencial por plan) para que ninguna de las `4,637` metas tenga `codigo = ''` o `NULL`.
2. **Actualización en PostgreSQL (`seguimiento.pdd_metas_oficiales`):**
   - Actualizar las **`4,637` filas** de `seguimiento.pdd_metas_oficiales` poblando:
     - Columna `codigo` (cuando estaba vacía) y columna `unidad_medida` (con `unidad_medida_canonica`).
     - En `datos_oficiales` (mediante `jsonb_set` / merge): inyectar las llaves planas estandarizadas `"responsable"`, `"linea_base"`, `"linea_base_numerica"`, `"meta_cuatrienio"`, `"meta_cuatrienio_numerica"`, `"unidad_medida"`, más el sub-objeto `"_canonico_normalizado"`.

### 2.2 Expansión de `seguimiento.pdd_vinculos_meta_pa_triada` a las `4,637` Metas (8 Planes) y Cruce Hermano de los 3 Motores (`225,380` filas)
Actualizar `backend/app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py` y `backend/scripts/poblar_vinculos_meta_pa_triada.py`:
1. **Cobertura de los 8 Planes (`4,637` filas exactas en `seguimiento.pdd_vinculos_meta_pa_triada`):**
   - Conciliar los **8 planes**: `PDD_2012_2015` (`469`), `PDD_2013_2015` (`676`), `PDD_2016_2019` (`898`), `PDD_2020_2023` (`947`), `PDD_2024_2027` (`1,246`), `PDL_1_2024_2027` (`110`), `PDL_2_2024_2027` (`89`) y `PDL_3_2024_2027` (`202`) -> **`4,637` filas totales**.
2. **Rescate del `_vinculo_triada` preexistente y Cruce Hermano entre los 3 Motores de `registros_triada_normalizados` (`225,380` filas):**
   - Cuando una meta tiene `datos_oficiales->'_vinculo_triada'->>'registro_triada_id'` (presente en `803` metas de `PDD_2016_2019`, `876` de `PDD_2020_2023`, `881` de `PDD_2024_2027` y `228` de `PDL_1..3`), usar ese registro como ancla primaria.
   - **Cruce Hermano de Motores (`PLAN_DESARROLLO` + `PLAN_ACCION` + `INVERSION_PRESUPUESTAL`):**
     - Si el registro primario en `registros_triada_normalizados` tiene `apropiacion_definitiva_cop IS NULL` (porque proviene del motor `PLAN_DESARROLLO`), buscar en el índice de `registros_triada_normalizados` del mismo `periodo_gobierno` (`ANTES_2020`, `2020_2023`, `2024_2027`) y misma `entidad_normalizada` (o programa/indicador compatible) las filas hermanas de `motor_destino IN ('INVERSION_PRESUPUESTAL', 'PLAN_ACCION')` con cifras presupuestales y físicas observadas (`apropiacion_definitiva_cop`, `compromisos_rp_cop`, `obligaciones_cop`, `pagos_tesoreria_cop`, `meta_programada_anual`, `meta_ejecutada_anual`, `avance_fisico_pct`), registrando en `evidencia_cruce.cruce_hermano_motores = True`.
     - Preservar estrictamente los ceros observados (`0.0` vs `None`).

### 2.3 Nuevo Archivo de Pruebas `backend/tests/test_pdt_normalizador_y_vinculos_8planes.py`
Crear al menos **5 pruebas** que verifiquen contra `bd_csh` y funciones del módulo:
1. Que `seguimiento.pdd_metas_oficiales` tenga las **`4,637` metas** con `codigo` no vacío, `unidad_medida` no vacía y `datos_oficiales->'_canonico_normalizado'` poblado en los 8 planes.
2. Que el parser numérico de metas extraiga exactamente `"Implementar cuatro (4) estrategias"` -> `4.0`, `"Asistir cien (100) empresas"` -> `100.0`, `"0 Fuente: Secretaría de Hacienda 2023"` -> `0.0` y `"Disminuir a 0,4 la tasa"` -> `0.4`.
3. Que `seguimiento.pdd_vinculos_meta_pa_triada` contenga exactamente las **`4,637` filas** distribuidas en los **8 planes** (`PDD_2012_2015` a `PDL_3_2024_2027`).
4. Que el cruce hermano de los 3 motores eleve significativamente las metas con `apropiacion_definitiva_cop IS NOT NULL` y `avance_fisico_pct IS NOT NULL` en `PDD_2024_2027` y `PDD_2020_2023`.
5. Que los ceros observados (`ceros_observados_preservados = True`) sigan preservados sin confundirse con `None`.

---

## 3. Verificación y Reporte
1. Ejecutar el script de normalización + poblamiento y las pruebas:
   ```bash
   cd /root/polis/backend && ./.venv/bin/python scripts/poblar_vinculos_meta_pa_triada.py
   cd /root/polis/backend && ./.venv/bin/ruff check app/modules/compromisos/pdt_normalizador_canonico_metas.py app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py scripts/poblar_vinculos_meta_pa_triada.py tests/test_pdt_normalizador_y_vinculos_8planes.py
   cd /root/polis/backend && ./.venv/bin/pytest tests/test_pdt_normalizador_y_vinculos_8planes.py -q
   ```
2. Escribir reporte en `/root/polis/bridge/02_resultado_agy2.md`.
3. Notificar a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "AGY2 LISTO [32B]: Normalizacion canonica OCR de las 4637 metas (8 planes) en pdd_metas_oficiales + 4637 vinculos en pdd_vinculos_meta_pa_triada con cruce hermano de 3 motores completados y probados. Solicito auditoria EAF." Enter
   ```
