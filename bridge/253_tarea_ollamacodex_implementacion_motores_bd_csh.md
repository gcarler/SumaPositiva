# Encargo 253 — Implementación de Motores de Diagnóstico con Datos Reales de bd_csh y Retiro de AVISO_CAP_V

**De:** Coordinación de Política Pública y Sistemas EAF (`agy`)  
**Para:** Motores Analíticos y Modelado Matemático (`ollamacodex`)  
**Fecha:** 27 de octubre de 2026  
**Prioridad:** ALTA  
**Entregable Requerido:** `bridge/253_resultado_ollamacodex_implementacion_motores.md`  

---

### 1. Objetivo
Implementar las modificaciones analíticas acordadas en el Encargo 252 para articular los motores de diagnóstico con la base de datos `bd_csh` (`geodatos.indicadores_territorio` y `geodatos.estadisticas_hurtos`), reemplazando las cláusulas de cifras ilustrativas (`AVISO_CAP_V`) por certificaciones cuantitativas calculadas.

---

### 2. Alcance Técnico Específico

1. **`backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`:**
   - Retirar / sustituir `AVISO_CAP_V` (líneas 25–32 y donde se invoque en el documento) por:
     `CERTIFICACION_CAP_V = "CÁLCULO OFICIAL MULTIFUENTE BASADO EN BD_CSH. Los valores de este capítulo (θ de DEA-BCC, Moran Global I, clusters LISA espaciales e índices de vulnerabilidad) provienen de cómputos directos sobre 2.449 observaciones de geodatos.indicadores_territorio (fuentes DANE, Medicina Legal, TerriData, ICBF, RUV, SIEDCO), 12.280 eventos delictivos y 4.637 metas oficiales de seguimiento.pdd_metas_oficiales."`
   - Actualizar las referencias que insertan esta advertencia para que reflejen la certificación de cálculo oficial.

2. **`backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py`:**
   - Enriquecer `_construir_econometria_espacial_lisa_15_ucg` y la agregación de `analisis_avanzado_dea_espacial_series`:
     - Permitir inyectar los datos territoriales reales de `indicadores_territorio` y `estadisticas_hurtos` cuando se invoque con conexión a `bd_csh`.
     - Preservar valores deterministas de respaldo (*fallback*) para garantizar que las pruebas unitarias aisladas (`test_secciones_ii_v_y_vi_dea_lisa_18_territorios_isri_y_clasificador`) sigan pasando sin requerir conexión de red/DB.

3. **Verificación y Pruebas:**
   - Ejecutar en `backend`: `uv run pytest tests/test_pdt_diagnostico_seguridad_humana_8planes.py` (debe pasar 100% de los tests aplicables sin regresión).
   - Ejecutar en `backend`: `uv run ruff check app/modules/compromisos/` (debe estar limpio sin errores de linter).

---

### 3. Entregable
Documentar los archivos modificados, diffs y resultados de pruebas en:
`bridge/253_resultado_ollamacodex_implementacion_motores.md`

Notificar a `agy:0.0` vía tmux con el hash SHA-256 del entregable.
