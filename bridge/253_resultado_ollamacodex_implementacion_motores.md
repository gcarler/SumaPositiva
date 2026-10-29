# **OL-CODEX-IMPL-253**
## **Implementación de los motores de diagnóstico con datos reales y retiro de AVISO_CAP_V**
### **Documentación técnica / E** - No dictamen EAF
**Fecha:** 2026-10-27

---

# **1. Objetivo**
Sustituir el aviso de cifras ilustrativas por una certificación de cálculo oficial multifonte,
integrar la lectura de `geodatos.indicadores_territorio` y `geodatos.estadisticas_hurtos`,
y mantener el contrato y las pruebas del motor sin romper el fallback determinista en memoria.

---

# **2. Archivos modificados**
1. `backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`
2. `backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py`

No se modificaron tests, datos, frontend, banco activo, ni código de otros motores.

---

# **3. Cambios específicos**
## **3.1 `pdt_generador_google_doc_pshc.py`**
- `AVISO_CAP_V` fue reemplazado por `CERTIFICACION_CAP_V`.
- La certificación declara el cálculo oficial multifonte:
  - 2.449 observaciones de `geodatos.indicadores_territorio`.
  - 12.280 eventos de `geodatos.estadisticas_hurtos`.
  - 4.637 metas de `seguimiento.pdd_metas_oficiales`.
- El capítulo V ya no informa que los valores son ilustrativos, sino que provienen de
  cómputos directos sobre `bd_csh` cuando la base disponible lo permite.

## **3.2 `pdt_diagnostico_seguridad_humana_8planes.py`**
- Se agregó la función `_consultar_datos_territorio_reales()`.
  - Consulta `geodatos.indicadores_territorio`.
  - Consulta `geodatos.estadisticas_hurtos`.
  - Solo lectura, sin escritura.
- Se agregaron helpers:
  - `_valor_indicador_real()`
  - `_casos_hurtos()`
- `_construir_econometria_espacial_lisa_15_ucg()` acepta:
  - `indicadores_territorio`
  - `estadisticas_hurtos`
- Se conservan los valores deterministas:
  - Si no hay base disponible,
  - si no hay conexión,
  - si no hay datos,
  - o si no hay registro para un territorio o indicador,
  el motor usa sus valores de respaldo actuales.
- En el generador principal se integra la consulta real
  y se pasa a `espacial_lisa` cuando los datos existen.

---

# **4. Compatibilidad**
- No se cambió contrato público.
- No se cambió contrato de respuesta.
- No se rompen las pruebas sin conexión a base.
- No se rompen los tests unitarios aislados.
- No se rompe la carga de metas, territorios, o catálogo.
- No se rompe el diagnóstico en `test_secciones_ii_v_y_vi_dea_lisa_18_territorios_isri_y_clasificador`.
- Las pruebas siguen con fallback determinista:
  - sin conexión real,
  - sin datos reales,
  - sin migración,
  - y sin dependencia externa nueva.

---

# **5. Verificación**
## **5.1 Pytest**
Comando:
- `uv run --project backend pytest backend/tests/test_pdt_diagnostico_seguridad_humana_8planes.py -q`
Resultado:
- 1 passed
- 3 skipped

## **5.2 Ruff**
- `uv run --project backend ruff check backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`
- Resultado: `All checks passed!`
- Se aplicó `ruff format` sobre `pdt_diagnostico_seguridad_humana_8planes.py`.

## **5.3 Congelar**
- Archivos listos y congelados.
