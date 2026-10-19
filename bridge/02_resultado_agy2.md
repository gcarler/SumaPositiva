# Resultado de Ejecución — Fase `[33B]` (`agy2`, 100% Backend)

## 1. Resumen Ejecutivo
Se ejecutó íntegramente la **Fase `[33B]` (`100% Backend`)**:
1. **Motor Canónico `SisPT-DNP` y Plan de Acción Territorial (`backend/app/modules/compromisos/pdt_sispt_dnp_evaluador.py`):**
   - `determinar_tipologia_indicador_sispt`: clasifica cada meta/indicador en las **4 tipologías oficiales de `https://sispt.dnp.gov.co/`**:
     - `INCREMENTO_ACUMULATIVO_FLUJO` ($E = (L_t / M_t) \times 100$)
     - `INCREMENTO_NO_ACUMULATIVO_CAPACIDAD` ($E = ((L_t - LB) / (M_t - LB)) \times 100$, o $(L_t / M_t) \times 100$)
     - `REDUCCION_BRECHA` ($E = ((LB - L_t) / (LB - M_t)) \times 100$)
     - `MANTENIMIENTO_STOCK` ($E = (L_t / M_t) \times 100$)
   - `calcular_eficacia_indicador_sispt`: aplica la fórmula exacta `SisPT`, la **Regla `SISPT-R2` de truncamiento anti-compensación al `100%`** ($E_{\text{SisPT}} = \min(\max(E_{\text{bruta}}, 0), 100)$), cuantifica `sobrecumplimiento_exceso_pct` y `alerta_subestimacion_meta_sispt` (`> 120%`), preserva estrictamente los ceros observados (`0.0` frente a `None`) y clasifica en los **5 rangos oficiales del semáforo `MDM`** (`SOBRESALIENTE` `>=85%`, `SATISFACTORIO` `70-<85%`, `MEDIO` `60-<70%`, `BAJO` `40-<60%`, `CRITICO` `<40%`).
   - `clasificar_meta_y_actividad_plan_accion_dnp`: clasifica en las **3 clases de metas del Plan de Acción DNP** (`META_DE_PRODUCTO`, `META_DE_GESTION`, `META_ADMINISTRATIVA`), las **4 tipologías oficiales de actividades** (`ACTIVIDAD_NORMATIVA`, `ACTIVIDAD_ADMINISTRATIVA`, `ACTIVIDAD_DE_GESTION`, `ACTIVIDAD_LOGISTICA`) y las **3 bolsas de financiación** (`INVERSION`, `FUNCIONAMIENTO`, `RECURSOS_DE_GESTION`).
   - `evaluar_interoperabilidad_sispt_cuipo_piip_meta`: audita las reglas `SISPT-R1` a `SISPT-R5` (`Plan Indicativo ↔ Plan de Acción ↔ CUIPO ↔ PIIP`), detectando `DESFASE_CUIPO_SIN_AVANCE_PIIP` (`CUIPO >= 75%` y `SisPT < 40%`), `AVANCE_FISICO_SIN_SOPORTE_CUIPO` (`SisPT >= 80%` en `META_DE_PRODUCTO` sin soporte presupuestal `CUIPO`) y `COHERENTE_SISPT_CUIPO_PIIP`.
   - `evaluar_universo_sispt_dnp_bd_csh`: evalúa contra PostgreSQL `bd_csh` las **`4,637` metas oficiales** de los 8 planes (`2012–2027`: `PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027`).
2. **Suite de Pruebas (`backend/tests/test_pdt_sispt_dnp_evaluador.py`):**
   - 6 pruebas unitarias y de integración real con `bd_csh` verificando las 4 fórmulas `SisPT`, el truncamiento al `100%`, el semáforo `MDM`, la clasificación del Plan de Acción, las alertas `CUIPO`/`PIIP` y el universo completo de `4,637` metas en los 8 planes.

## 2. Verificación Técnica (`ruff` y `pytest`)
- `ruff check app/modules/compromisos/pdt_sispt_dnp_evaluador.py tests/test_pdt_sispt_dnp_evaluador.py` -> `All checks passed!`
- `pytest tests/test_pdt_sispt_dnp_evaluador.py -q` -> `6 passed in 1.74s`

## 3. Cumplimiento de Restricciones de Alcance
- No se tocó `src/**`, `pdt_revision_por_meta.py`, `pdt_informe_integral_spd.py`, `router.py`, `schemas.py` ni `access_policy.py`.
