# Tarea Activa — Fase `[32A]` (`codex` — `=codex:0.0`)

- **Fecha:** 2026-10-19
- **Coordinador EAF:** `agy` (`=agy:0.0`)
- **Alcance:** **100% BACKEND (`PROHIBIDO tocar src/**`, `pdt_conciliador_vinculos_pa_triada.py` o `poblar_vinculos_meta_pa_triada.py`).**

---

## 1. Archivos Autorizados para `codex` en `[32A]`
1. `backend/app/modules/compromisos/pdt_revision_por_meta.py`
2. `backend/app/modules/compromisos/pdt_informe_integral_spd.py`
3. `backend/tests/test_pdt_revision_por_meta.py`
4. `backend/tests/test_pdt_ai_evaluator.py`
5. `bridge/02_resultado_codex.md`

*(PROHIBIDO modificar `src/**`, `pdt_conciliador_vinculos_pa_triada.py` o `poblar_vinculos_meta_pa_triada.py`, que pertenecen a `agy2` en `[32B]`).*

---

## 2. Especificación Técnica Detallada

### 2.1 Normalización Resiliente de Llaves OCR y Soporte de los 8 Planes en `backend/app/modules/compromisos/pdt_revision_por_meta.py`
En `seguimiento.pdd_metas_oficiales.datos_oficiales`, el OCR de los PDFs guardó los atributos bajo llaves heterogéneas o partidas por saltos de línea según el plan:
1. **Responsable (`dependencia_responsable`):**
   - Buscar primero en `datos_oficiales.get("_canonico_normalizado", {}).get("responsable_canonico")`, y luego en `datos_oficiales` insensible a mayúsculas/acentos/espacios internos (`key_norm = re.sub(r"\s+", "", k).lower()`):
     - Cualquier llave que contenga `"responsab"`, `"entidad"`, `"secretaria"`, `"dependencia"`, `"concurrencia"`.
     - En `PDL_1_2024_2027`: `datos_oficiales.get("columna_9")` (`"LHCN"` -> `"Alcaldía Local 1 — Histórica y del Caribe Norte (LHCN)"`), o si `codigo_plan == "PDL_1_2024_2027"` y no hay otra dependencia, `"Alcaldía Local 1 — Histórica y del Caribe Norte"`.
     - En `PDL_2_2024_2027`: `"Concurrencia"` o `"Alcaldía Local 2 — De la Virgen y Turística"`.
     - En `PDL_3_2024_2027`: `"RESPONSABLE"` (si dice `"Industrial y de la"` / `"Bahía"` o está vacío, normalizar a `"Alcaldía Local 3 — Industrial y de la Bahía"`).
     - Si aún no aparece en `datos_oficiales`, rescatar `dependencia_responsable` desde `seguimiento.pdd_vinculos_meta_pa_triada` o inferirla de `linea_nombre` / `nombre_meta` cuando mencione una Secretaría/Ente oficial de Cartagena.
2. **Línea Base (`linea_base` y valor numérico):**
   - Buscar en `datos_oficiales.get("_canonico_normalizado", {}).get("linea_base_texto")` o cualquier llave de `datos_oficiales` cuya forma sin espacios/acentos contenga `"lineabase"` (`"Línea base"`, `"Línea Base Año 2023"`, `"Linea Base Año 2023"`, `"línea Base Año 2023"`, `"LINEA BASE"`) o en `PDL_1_2024_2027` la llave `"columna_2"`.
   - Extraer el primer valor numérico de cadenas como `"0 Fuente: Secretaría de Hacienda 2023"` (`-> 0.0`, preservando el cero observado!) o `"0.78 homicidios por cada 100 mil habitantes..."` (`-> 0.78`) o `"1183 casos..."` (`-> 1183.0`). Si dice `"ND"`, `"N/D"`, `"N.A."` o `"Sin línea base"`, conservar el texto documental como `linea_base_documental = "ND (Sin línea base histórica)"` y el número como `None`.
3. **Meta Cuatrienio (`meta_cuatrienio` y `meta_cuatrienio_numerica`):**
   - Buscar en `datos_oficiales.get("_canonico_normalizado", {}).get("meta_cuatrienio_texto")` o cualquier llave cuya forma normalizada contenga `"metadelcuat"` o `"metacuatr"` o `"metadel"` (`"Meta del cuatrienio"`, `"Meta Cuatrienio"`, `"META DEL CUATRENIO"`, `"META DEL CUATRENI O"`, `"Meta del"`, `"META DEL"`), o en `PDL_1_2024_2027` la llave `"columna_4"` (y `"columna_3"` como referencia distrital).
   - Parser numérico robusto:
     - Si el texto contiene un número entre paréntesis como `"Implementar cuatro (4) estrategias"` o `"Asistir cien (100) empresas"`, extraer `4.0` o `100.0`.
     - Si contiene dígitos con coma decimal (`"0,4"` -> `0.4`) o separador de miles (`"1.059.626"` -> `1059626.0`, `"25.265"` -> `25265.0`), convertirlo correctamente.
     - Si contiene palabras numéricas en español sin dígitos (`"uno"`, `"dos"`, `"tres"`, `"cuatro"`, `"cinco"`, `"seis"`, `"siete"`, `"ocho"`, `"nueve"`, `"diez"`, `"doce"`, `"quince"`, `"veinte"`, `"treinta"`, `"cincuenta"`, `"cien"`, `"ciento"`), mapear a su float correspondiente.
4. **Unidad de Medida (`unidad_medida`):**
   - Buscar en la columna `unidad_medida`, en `datos_oficiales.get("_canonico_normalizado", {}).get("unidad_medida_canonica")`, en cualquier llave de `datos_oficiales` que contenga `"unidad"`, o inferirla determinísticamente del texto del `indicador` / `meta_cuatrienio`:
     - `"%"` o `"porcentaje"` -> `"Porcentaje (%)"`
     - `"tasa"` -> `"Tasa"`
     - `"kilómetro"` / `"km"` -> `"Kilómetros (km)"`
     - `"hectárea"` / `"ha"` -> `"Hectáreas (ha)"`
     - `"índice"` / `"puntaje"` -> `"Índice / Puntaje"`
     - `"número"` / `"cantidad"` / plural de sustantivos o meta cuantitativa -> `"Número / Unidades"`
5. **Soporte Multi-Plan (`8 Planes` + `"TODOS"`):**
   - Permitir que `codigo_plan` en `pdt_revision_por_meta.py` reciba cualquiera de los 8 planes (`PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027`) o `"TODOS"` (evaluando sobre el universo de `4,637` metas).

### 2.2 Censo de los 8 Planes en `backend/app/modules/compromisos/pdt_informe_integral_spd.py`
- Añadir en `generar_informe_integral_spd_cartagena` la sección **`cobertura_historica_8_planes_2012_2027`** consultando desde `bd_csh` (con fallback determinista) el resumen de los **8 planes oficiales** (`codigo_plan`, `periodo`, `tipo_plan`, `total_metas`, `total_vinculos_pa_triada`, `ppi_total_corriente_cop`) y el gran total (`total_planes_oficiales: 8`, `total_metas_historicas_y_locales: 4637`).
- Incluir una tabla resumen de `cobertura_historica_8_planes_2012_2027` dentro de `exportables_auditables.markdown_ejecutivo`.

### 2.3 Pruebas en `test_pdt_revision_por_meta.py` y `test_pdt_ai_evaluator.py`
- En `backend/tests/test_pdt_revision_por_meta.py`:
  - Añadir prueba que verifique la revisión de metas sobre `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027` y `PDD_2020_2023`, comprobando que las llaves OCR (`"Responsabl e"`, `"Meta del cuatrienio"`, `"columna_4"`, `"Línea Base Año 2023"`, `"LINEA BASE"`) se normalicen sin producir `SIN_ATRIBUCION` ni `unidad_medida == "BRECHA_DE_INFORMACION"`.
- En `backend/tests/test_pdt_ai_evaluator.py`:
  - Verificar que `/informe-integral-spd` incluya `cobertura_historica_8_planes_2012_2027` con los 8 planes (`total_metas_historicas_y_locales >= 4637`).

---

## 3. Verificación y Reporte
1. Ejecutar únicamente:
   ```bash
   cd /root/polis/backend && ./.venv/bin/ruff check app/modules/compromisos/pdt_revision_por_meta.py app/modules/compromisos/pdt_informe_integral_spd.py tests/test_pdt_revision_por_meta.py tests/test_pdt_ai_evaluator.py
   cd /root/polis/backend && ./.venv/bin/pytest tests/test_pdt_revision_por_meta.py tests/test_pdt_ai_evaluator.py -q
   ```
   *(IMPORTANTE: NO ejecutes `pytest -q` sobre todo el repositorio completo).*
2. Escribir reporte en `/root/polis/bridge/02_resultado_codex.md`.
3. Notificar a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [32A]: Extractor OCR resiliente para los 8 planes (4637 metas) en pdt_revision_por_meta.py + cobertura_historica_8_planes en pdt_informe_integral_spd.py completados y probados. Solicito auditoria EAF." Enter
   ```
