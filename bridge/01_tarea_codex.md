# Tarea Activa — Fase `[31A]` (`codex` — `=codex:0.0`)

- **Fecha:** 2026-10-18
- **Coordinador EAF:** `agy` (`=agy:0.0`)
- **Alcance:** **100% BACKEND (`PROHIBIDO tocar src/**`, `pdt_dea_4niveles_cartagena.py` o `test_pdt_dea_4niveles_cartagena.py`).**

---

## 1. Archivos Autorizados para `codex` en `[31A]`
1. `backend/app/modules/compromisos/pdt_informe_integral_spd.py` *(NUEVO)*
2. `backend/app/modules/compromisos/router.py`
3. `backend/app/modules/compromisos/schemas.py`
4. `docs/permisos-api.md`
5. `backend/tests/test_pdt_ai_evaluator.py`
6. `bridge/02_resultado_codex.md`

*(PROHIBIDO modificar `src/**`, `pdt_dea_4niveles_cartagena.py` o `test_pdt_dea_4niveles_cartagena.py`, que pertenecen a `agy2` en `[31B]`).*

---

## 2. Especificación Técnica Detallada

### 2.1 Nuevo Módulo `backend/app/modules/compromisos/pdt_informe_integral_spd.py`
Crear el consolidador auditable para la Secretaría de Planeación Distrital (`SPD`) y el Consejo de Gobierno de Cartagena:
- Función principal (síncrona o asíncrona compatible con el router):
  ```python
  async def generar_informe_integral_spd_cartagena(
      plan_codigo: str = "PDD_2024_2027",
      orientacion_dea: str = "input",
      incluir_exportables: bool = True,
      db: AsyncSession | None = None,
  ) -> dict[str, Any]:
  ```
- Debe ensamblar en un único corte verificable:
  1. **`encabezado_institucional`**:
     - `entidad`: `"Alcaldía Mayor de Cartagena de Indias — Secretaría de Planeación Distrital (SPD)"`
     - `plan_codigo`: `plan_codigo`
     - `orientacion_dea`: `orientacion_dea`
     - `version_metodologica`: `"PDT-AI-EVALUATOR-SPD-v2026.10"`
     - `generado_en`: timestamp ISO-8601 UTC
     - `fingerprint_corte_sha256`: hash `SHA-256` hexadecimal determinista calculado sobre los resúmenes cuantitativos del corte (`sintesis_hoshin_kanri_y_pdl`, `sintesis_revision_10d_y_vinculos_pa`, `sintesis_dea_4_niveles_y_fuentes`, `tablero_alcalde_alertas_desperdicio`, `tabla_armonizacion_presupuestal_spd`).
  2. **`sintesis_hoshin_kanri_y_pdl`**:
     - Invoca `generar_matriz_x_hoshin_kanri(plan_codigo=plan_codigo)` de `pdt_hoshin_kanri.py`.
     - Extrae `evaluacion_fair`, conteo de los 4 cuadrantes de la Matriz X, resumen de `bowling_chart_pdca` y `articulacion_distrital_local_pdl` (`3` planes locales `PDL_1..3_2024_2027`, `401` metas locales, `15` UCGs).
  3. **`sintesis_revision_10d_y_vinculos_pa`**:
     - Invoca `evaluar_metas_10_dimensiones(plan_codigo=plan_codigo, limit=50)` de `pdt_revision_por_meta.py` y `listar_dictamenes_hallazgos_pg(db, plan_codigo=plan_codigo, limit=25)` de `pdt_persistencia_pg.py`.
     - Reporta `total_metas_evaluadas`, `resumen_dimensiones`, `resumen_vinculos_pa_triada`, conteo de hallazgos por los 7 revisores y estado de dictámenes/subsanaciones (`seguimiento.pdt_ai_hallazgos_revision`).
  4. **`sintesis_dea_4_niveles_y_fuentes`**:
     - Invoca `obtener_dea_cartagena_4_niveles(orientacion=orientacion_dea, db=db)` y `obtener_tablero_alcalde_y_armonizacion_dea(orientacion=orientacion_dea, db=db)` de `pdd_dea_service.py`.
     - Resume las 4 fronteras homogéneas de Cartagena (`nivel_1_territorial_localidades_ucg`, `nivel_2_institucional_secretarias`, `nivel_3_operativo_ieo_ese`, `nivel_4_temporal_inter_cuatrienial`), incluyendo el conteo de DMUs evaluadas por nivel, la invarianza/separación de fronteras y (si está presente en el payload de Nivel 1/2) la desagregación por fuentes de financiación (`SGR`, `Crédito Público`, `SGP`, `ICLD`).
  5. **`tablero_alcalde_alertas_desperdicio`**:
     - Lista todas las unidades recalificadas a `"ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"` (alto avance físico nominal con $\theta_{\text{BCC}} \le 0.70$) y el total de sobrecosto/holgura presupuestal $S^-$ detectada en COP.
  6. **`tabla_armonizacion_presupuestal_spd`**:
     - Lista las recomendaciones de armonización presupuestal emparejando cada unidad ineficiente ($\theta_{\text{BCC}} < 1.0$) con sus **Benchmarks Oficiales ($\theta_{\text{BCC}} = 1.0$)** y el `presupuesto_total_reasignable_cop`.
  7. **`exportables_auditables`** (cuando `incluir_exportables=True`):
     - `markdown_ejecutivo`: Informe Markdown estructurado con encabezados, tablas Markdown de Hoshin Kanri, 10 Dimensiones, 4 Fronteras DEA, Alertas de Desperdicio del Tablero Alcalde y Tabla de Armonización Presupuestal, más la huella `fingerprint_corte_sha256`.
     - `csv_armonizacion_y_alertas`: String CSV con encabezados `nivel,dmu,calificacion_nominal,calificacion_recalificada_dea,theta_ccr,theta_bcc,eficiencia_escala_se,holgura_presupuestal_s_minus_cop,benchmarks_referencia` y una fila por cada unidad del Tablero Alcalde / Armonización.

### 2.2 Nuevo Endpoint en `router.py`, Esquema en `schemas.py` y Registro en `docs/permisos-api.md`
- En `backend/app/modules/compromisos/router.py`:
  - `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/informe-integral-spd`
  - Query params: `plan_codigo: str = Query("PDD_2024_2027")`, `orientacion_dea: str = Query("input")`, `incluir_exportables: bool = Query(True)`.
- En `backend/app/modules/compromisos/schemas.py`:
  - `PdtAiInformeIntegralSpdResponse` (`extra="allow"`).
- En `docs/permisos-api.md`:
  - Registrar `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/informe-integral-spd` como ruta `Pública`.

### 2.3 Pruebas en `backend/tests/test_pdt_ai_evaluator.py`
- Añadir prueba `test_pdt_ai_evaluator_informe_integral_spd_endpoint` verificando:
  - `HTTP 200` en `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/informe-integral-spd?orientacion_dea=input&incluir_exportables=true`.
  - Presencia de `encabezado_institucional.fingerprint_corte_sha256` (longitud 64 hex), `sintesis_hoshin_kanri_y_pdl`, `sintesis_revision_10d_y_vinculos_pa`, `sintesis_dea_4_niveles_y_fuentes`, `tablero_alcalde_alertas_desperdicio`, `tabla_armonizacion_presupuestal_spd`, `exportables_auditables.markdown_ejecutivo` y `exportables_auditables.csv_armonizacion_y_alertas`.

---

## 3. Verificación y Reporte
1. Ejecutar:
   ```bash
   cd /root/polis/backend && ./.venv/bin/ruff check app/modules/compromisos/pdt_informe_integral_spd.py app/modules/compromisos/router.py app/modules/compromisos/schemas.py tests/test_pdt_ai_evaluator.py
   cd /root/polis/backend && ./.venv/bin/pytest tests/test_pdt_ai_evaluator.py tests/test_access_policy.py -q
   ```
   *(IMPORTANTE: NO ejecutes `./.venv/bin/pytest -q` sobre todo el repositorio completo; ejecuta únicamente los archivos de prueba indicados arriba).*
2. Escribir reporte en `/root/polis/bridge/02_resultado_codex.md`.
3. Notificar a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [31A]: Informe Ejecutivo Consolidado SPD (/informe-integral-spd) con Markdown/CSV auditable y SHA-256 completado y probado. Solicito auditoria EAF." Enter
   ```
