# Resultado de Ejecución — Fase `[31B]` (`agy2`, 100% Backend)

## 1. Resumen Ejecutivo
Se ejecutó íntegramente la **Fase `[31B]` (`100% Backend`)**:
1. **Poblamiento censal en PostgreSQL (`bd_csh`, esquema `seguimiento`)**:
   - Se creó y ejecutó el script idempotente `backend/scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py`.
   - `seguimiento.pdd_dmu_ieo_oficiales`: **`105` filas** (`IEO-001` a `IEO-105`), cubriendo el universo completo de Instituciones Educativas Oficiales de Cartagena distribuidas en `LOC-1..3` y `UCG-01..15`.
   - `seguimiento.pdd_dmu_ese_centros_salud`: **`43` filas** (`ESE-001` a `ESE-043`), cubriendo la red pública completa de la `ESE Hospital Local Cartagena de Indias` (`HOSPITAL_LOCAL`, `CAP_24H`, `CAP_12H`, `PUESTO_SALUD_RURAL_INSULAR`).
   - `seguimiento.pdd_fuentes_financiacion_dmu`: **`27` filas** (`3 Localidades` + `15 UCGs` + `9 Secretarías/Entes Descentralizados`), con la desagregación auditada de insumos presupuestales ($X$) en `sgr_regalias_cop`, `credito_publico_cop`, `sgp_transferencias_cop`, `icld_recursos_propios_cop`, `cofinanciacion_nacion_cop` y `total_fuentes_cop`.
2. **Conexión en `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py`**:
   - `_consultar_insumos_bd_csh` (y alias `_extraer_insumos_bd_cartagena`) extrae desde `bd_csh` los `105` registros de `seguimiento.pdd_dmu_ieo_oficiales`, los `43` registros de `seguimiento.pdd_dmu_ese_centros_salud` y los `27` registros de `seguimiento.pdd_fuentes_financiacion_dmu` (con fallback determinista si la BD no está disponible).
   - `_construir_nivel_3_operativo` ejecuta el solver DEA en dos etapas (`PuLP` + `HiGHS`) sobre las **`105` IEO oficiales** en la Subfrontera A (`instituciones_educativas_oficiales_ieo`) y sobre los **`43` Centros/Hospitales ESE** en la Subfrontera B (`centros_salud_ese_cartagena`), exponiendo `padron_censal_bd_csh` (`ieo_evaluadas_en_frontera = 105`, `centros_ese_evaluados_en_frontera = 43`).
   - `_construir_nivel_1_territorial` y `_construir_nivel_2_institucional` inyectan en cada DMU `desagregacion_fuentes_financiacion` y `holgura_s_minus_por_fuente_cop` (con suma exacta igual a `holgura_presupuestal_s_minus_cop`), además del consolidado `resumen_fuentes_financiacion_y_holguras` en Nivel 1, Nivel 2 y la raíz de `evaluar_dea_4_niveles_cartagena`.
3. **Suite de Pruebas (`backend/tests/test_pdt_dea_4niveles_cartagena.py`)**:
   - Ampliada a **8 tests** incorporando `test_nivel_3_padron_censal_105_ieo_y_43_ese_en_bd_csh` y `test_desagregacion_fuentes_financiacion_sgr_credito_y_holguras_por_fuente`.

## 2. Verificación Técnica (`bd_csh`, `ruff` y `pytest`)
- **Poblamiento en `bd_csh`**:
  ```json
  {
    "base_datos": "bd_csh",
    "esquema": "seguimiento",
    "tablas_pobladas": {
      "seguimiento.pdd_dmu_ieo_oficiales": 105,
      "seguimiento.pdd_dmu_ese_centros_salud": 43,
      "seguimiento.pdd_fuentes_financiacion_dmu": 27
    }
  }
  ```
- **Ruff**:
  `ruff check app/modules/compromisos/pdt_dea_4niveles_cartagena.py scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py tests/test_pdt_dea_4niveles_cartagena.py` -> `All checks passed!`
- **Pytest**:
  `pytest tests/test_pdt_dea_4niveles_cartagena.py -q` -> `8 passed in 6.98s`

## 3. Cumplimiento de Restricciones de Alcance
- No se tocó `src/**`, `router.py`, `schemas.py`, `pdt_informe_integral_spd.py` ni `test_pdt_ai_evaluator.py`.
