# Plan Maestro Sprint `[33A]` + `[33B]`: Motor `SisPT` del DNP (`https://sispt.dnp.gov.co/`) — Formulación PDT, 4 Fórmulas de Eficacia con Truncamiento al `100%`, 4 Tipos de Actividades del Plan de Acción e Interoperabilidad `CUIPO` + `PIIP` (`100% Backend`)

## 1. Objetivo
Integrar en el motor backend de **POLIS** (`backend/app/modules/compromisos/`) toda la metodología oficial de **`https://sispt.dnp.gov.co/` (`SisPT` — DNP)** y del **Instructivo Oficial del Plan de Acción del DNP/MHCP** ([`16_ESTRUCTURA_SISPT_DNP_PDT_INDICADORES_PLAN_ACCION_SEGUIMIENTO.md`](file:///root/polis/knowledge-base/16_ESTRUCTURA_SISPT_DNP_PDT_INDICADORES_PLAN_ACCION_SEGUIMIENTO.md)):
1. **Las 4 Fórmulas Matemáticas Exactas de Eficacia `SisPT`**:
   - `INCREMENTO_ACUMULATIVO_FLUJO` ($E = (\sum L_t / \sum M_t) \times 100$)
   - `INCREMENTO_NO_ACUMULATIVO_CAPACIDAD` ($E = ((L_t - LB) / (M_t - LB)) \times 100$, o $(L_t / M_t) \times 100$ si $M_t \le LB$ o $LB$ no numérico)
   - `REDUCCION_BRECHA` ($E = ((LB - L_t) / (LB - M_t)) \times 100$)
   - `MANTENIMIENTO_STOCK` ($E = (L_t / M_t) \times 100$)
2. **Truncamiento Anti-Compensación al `100%` (`SISPT-R2`) y Semáforo `MDM`**:
   - $E_{\text{SisPT}, i} = \min(\max(E_{\text{bruta}, i}, 0.0), 100.0)$.
   - Cuantificación del `sesgo_compensacion_sobrecumplimiento_pct` ($E_{\text{bruta}} - E_{\text{SisPT}}$) y rangos oficiales `MDM` (`SOBRESALIENTE` `>=85%`, `SATISFACTORIO` `70-<85%`, `MEDIO` `60-<70%`, `BAJO` `40-<60%`, `CRITICO` `<40%`).
3. **Clasificación Oficial del Plan de Acción DNP (Kit Financiero / SisPT)**:
   - 3 clases de metas (`META_DE_PRODUCTO`, `META_DE_GESTION`, `META_ADMINISTRATIVA`).
   - 4 tipos de actividades (`ACTIVIDAD_NORMATIVA`, `ACTIVIDAD_ADMINISTRATIVA`, `ACTIVIDAD_DE_GESTION`, `ACTIVIDAD_LOGISTICA`).
   - 3 bolsas de financiación (`INVERSION`, `FUNCIONAMIENTO`, `RECURSOS_DE_GESTION`).
4. **Interoperabilidad `Plan Indicativo ↔ Plan de Acción ↔ CUIPO ↔ PIIP`**:
   - Detección de `DESFASE_CUIPO_SIN_AVANCE_PIIP` (ejecución financiera `CUIPO` `>= 75%` y eficacia `SisPT` `< 40%`), `AVANCE_FISICO_SIN_SOPORTE_CUIPO` (eficacia `SisPT` `>= 80%` en `META_DE_PRODUCTO` sin respaldo presupuestal `CUIPO`), y `COHERENTE_SISPT_CUIPO_PIIP`.

## 2. División de Trabajo Sin Colisiones (`100% Backend`, `0% Frontend`)
- **`agy2` (`=agy2:0.0`) — Fase `[33B]`**:
  - Archivos exclusivos:
    - `backend/app/modules/compromisos/pdt_sispt_dnp_evaluador.py` (nuevo)
    - `backend/tests/test_pdt_sispt_dnp_evaluador.py` (nuevo)
- **`codex` (`=codex:0.0`) — Fase `[33A]`**:
  - Archivos exclusivos:
    - `backend/app/modules/compromisos/pdt_revision_por_meta.py`
    - `backend/app/modules/compromisos/pdt_informe_integral_spd.py`
    - `backend/app/modules/compromisos/router.py`
    - `backend/app/modules/compromisos/schemas.py`
    - `backend/app/core/security/access_policy.py`
    - `docs/permisos-api.md`
    - `backend/tests/test_pdt_revision_por_meta.py`
    - `backend/tests/test_pdt_ai_evaluator.py`
    - `backend/tests/test_access_policy.py`
