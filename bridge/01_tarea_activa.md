# Orden de Trabajo EAF (`=agy:0.0`) para `agy2` (`=agy2:0.0`) — Fase `[30B]` (100% BACKEND)

**Estado de `[29B]`:** **APROBADO** en `/root/polis/bridge/03_dictamen_revision.md` (`10 passed`, `1,647` filas en `seguimiento.pdd_vinculos_meta_pa_triada`, `ruff` limpio).
**Doctrina de Referencia:** `/root/polis/knowledge-base/15_ARQUITECTURA_DEA_4_NIVELES_DMU_GOBERNANZA_CARTAGENA.md` y `/root/polis/bridge/00_plan_dea_4niveles_cartagena_30.md`.

**RESTRICCIÓN ABSOLUTA DE ALCANCE:**
- **100% BACKEND (`backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py`, `backend/tests/test_pdt_dea_4niveles_cartagena.py`, `knowledge-base/00_INDICE_MAESTRO.md`).**
- **PROHIBIDO TOCAR `src/**` (Frontend) bajo ninguna circunstancia.**
- **PROHIBIDO TOCAR `router.py`, `schemas.py`, `pdd_dea_service.py`, `agentes_inteligentes_pdd.py`, `docs/permisos-api.md`, `test_pdt_ai_evaluator.py` o `test_agentes_inteligentes_pdd.py`** (esos archivos pertenecen a `codex` en `[30A]`).

---

## Objetivo de la Fase `[30B]` (`agy2`)
Implementar el motor econométrico completo `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py` y su suite de pruebas `backend/tests/test_pdt_dea_4niveles_cartagena.py` conforme a `/root/polis/knowledge-base/15_ARQUITECTURA_DEA_4_NIVELES_DMU_GOBERNANZA_CARTAGENA.md`:

### 1. Motor Econométrico `PuLP` en Dos Etapas (`pdt_dea_4niveles_cartagena.py`)
1. Implementa el solver lineal no paramétrico con `PuLP` (`CBC`/`HiGHS`) soportando **ambas orientaciones**:
   - `calcular_dea_bcc_input(df_dmus, inputs_cols, outputs_cols)` y `calcular_dea_bcc_output(df_dmus, inputs_cols, outputs_cols)` + `calcular_dea_ccr_y_escala(...)`:
     - **Orientación a Insumos (`input`):** $\min \theta - \varepsilon(\sum s_i^- + \sum s_r^+)$ s.a. $\sum \lambda_j X_{ij} + s_i^- = \theta X_{io}$, $\sum \lambda_j Y_{rj} - s_r^+ = Y_{ro}$, $\sum \lambda_j = 1$ (BCC) o libre (CCR).
     - **Orientación a Productos (`output`):** $\max \phi + \varepsilon(\sum s_i^- + \sum s_r^+)$ s.a. $\sum \lambda_j X_{ij} + s_i^- = X_{io}$, $\sum \lambda_j Y_{rj} - s_r^+ = \phi Y_{ro}$, $\sum \lambda_j = 1$, reportando $\phi \ge 1.0$ y $\theta_{\text{out}} = 1.0 / \phi \in (0, 1]$.
     - Devuelve para cada DMU: `theta_ccr`, `theta_bcc`, `eficiencia_escala_se` ($SE_o = \theta^{\text{CCR}} / \theta^{\text{BCC}}$), `rendimientos_escala` (`CRS_OPTIMO`, `IRS_SUBINVERSION`, `DRS_SATURACION_PRESUPUESTAL`), `holguras_insumos_s_minus` (en COP y unidades físicas), `holguras_productos_s_plus` (déficit de producto/resultado), `pesos_lambda` y `benchmarks_referencia` (DMUs eficientes con $\theta_{\text{BCC}} = 1.0$ y $\lambda_j > 0$).

2. **Las 4 Fronteras DEA Homogéneas e Independientes de Cartagena (`evaluar_dea_4_niveles_cartagena`):**
   Firma requerida (compatible con `router.py` de `[30A]`):
   ```python
   def evaluar_dea_4_niveles_cartagena(
       nivel: str | None = None,
       orientacion: str = "input",
       sector: str | None = None,
       db: Any = None,
       **kwargs: Any,
   ) -> dict[str, Any]
   ```
   Construye y evalúa por separado (alimentándose de `bd_csh`: `planes_desarrollo_distrital`, `pdd_vinculos_meta_pa_triada`, `registros_triada_normalizados`, `geodatos.territorios`, `geodatos.indicadores_territorio` y microdatos sectoriales oficiales de Cartagena):
   - **Nivel 1 (`nivel_1_territorial_localidades_ucg`):**
     - Frontera A (`localidades_distritales`): Las 3 Localidades (`Localidad 1: Histórica y del Caribe Norte` con `PDL_1_2024_2027`, `Localidad 2: De la Virgen y Turística` con `PDL_2_2024_2027`, `Localidad 3: Industrial y de la Bahía` con `PDL_3_2024_2027`).
     - Frontera B (`unidades_comuneras_gobierno_ucg`): Las 15 UCGs (`UCG-01`..`UCG-15`).
   - **Nivel 2 (`nivel_2_institucional_secretarias`):**
     - Secretarías y Entes Descentralizados de Cartagena (`SED` Educación, `DADIS` Salud, `Secretaría de Infraestructura`, `Transcaribe S.A.`, `PES Pedro Romero`, `Gerencia de Espacio Público`, `EPA Cartagena`, y demás dependencias ejecutoras en `bd_csh`).
   - **Nivel 3 (`nivel_3_operativo_ieo_ese`):**
     - Frontera A (`instituciones_educativas_oficiales_ieo`): Panel representativo y auditable de las Instituciones Educativas Oficiales (`IEO`) de las 3 Localidades de Cartagena (evaluando presupuesto/aulas/docentes vs. sedes dotadas, PAE `"Me Quedo Porque Me Quedo"`, cupos y logro `SABER 11` / retención escolar).
     - Frontera B (`centros_salud_ese_cartagena`): Centros de Salud / Hospitales Locales de la `ESE Hospital Local Cartagena de Indias` (evaluando presupuesto/personal médico vs. población vulnerable atendida, valoraciones de discapacidad, vacunación y salud materno-infantil).
   - **Nivel 4 (`nivel_4_temporal_inter_cuatrienial`):**
     - Vigencias fiscales `2020–2027` y comparativa inter-cuatrienial entre `PDD 2020–2023 ("Salvemos Juntos a Cartagena", $6.02B)` y `PDD 2024–2027 ("Cartagena, Ciudad de Derechos", $12.80B)` + serie `2012–2027`, incluyendo descomposición dinámica de **Malmquist (`MPI = Catch_up * Frontier_shift`)**.
   - Incluye el bloque `mapeo_cadena_valor_mga_mir_sectorial` con los 3 sectores canónicos (`Educación Pública`, `Salud Pública`, `Infraestructura Vial y Movilidad`).

3. **Gobernanza del Seguimiento Institucional (`generar_tablero_alcalde_y_armonizacion_dea_cartagena`):**
   Firma requerida:
   ```python
   def generar_tablero_alcalde_y_armonizacion_dea_cartagena(
       orientacion: str = "input",
       sector: str | None = None,
       db: Any = None,
       **kwargs: Any,
   ) -> dict[str, Any]
   ```
   Expone:
   - **`retroalimentacion_matriz_resultados_spd`**: Filas listas para la Matriz de Resultados de la Secretaría de Planeación Distrital con $\theta_{\text{BCC}}$, $SE_o$, holgura presupuestal $S^-$ (COP), déficit de producto $S^+$ y `benchmarks`.
   - **`tablero_alcalde_y_programas`**: Aplica la regla de gobernanza vinculante: cualquier dependencia/programa con **alto avance físico nominal ($\ge 85\%$ o $100\%$) pero con $\theta_{\text{BCC}} \le 0.70$** (ej. $\theta = 0.65$) se recalifica de `"MUY_ALTO_SOBRESALIENTE"` a **`"ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"`**, cuantificando el exceso presupuestal $S^-$ en COP.
   - **`armonizacion_presupuestal_plurianual`**: Empareja cada Unidad Ejecutora ineficiente ($\theta_{\text{BCC}} < 1.0$) con sus **Benchmarks de Frontera ($\theta_{\text{BCC}} = 1.0$)** y calcula la reasignación potencial para el ejercicio anual de Armonización Presupuestal.

### 2. Índice Maestro y Pruebas (`ruff` + `pytest`)
- Añade `15_ARQUITECTURA_DEA_4_NIVELES_DMU_GOBERNANZA_CARTAGENA.md` en `/root/polis/knowledge-base/00_INDICE_MAESTRO.md`.
- Crea `backend/tests/test_pdt_dea_4niveles_cartagena.py` con al menos 6 pruebas verificando:
  1. `calcular_dea_bcc_input` y `calcular_dea_bcc_output` con cálculo exacto de holguras $S^-, S^+$ y `benchmarks`.
  2. Separación estricta de las 4 fronteras homogéneas (`Nivel 1`, `Nivel 2`, `Nivel 3`, `Nivel 4`) sin mezclar Localidades con IEOs en una misma frontera.
  3. Mapeo sectorial MGA-DNP/MIR de Cartagena (`Educación`, `Salud`, `Infraestructura Vial y Movilidad`).
  4. Disparo de `"ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"` en el Tablero Alcalde cuando una DMU tiene `100%` de avance físico pero $\theta_{\text{BCC}} = 0.65$.
  5. Recomendaciones de Armonización Presupuestal con pares `benchmarks` ($\theta = 1.0$).
  6. Descomposición Malmquist (`Catch-up` y `Frontier-shift`) en el Nivel 4 (`PDD 2020-2023` vs `PDD 2024-2027`).
- Pasa `ruff check` y `pytest backend/tests/test_pdt_dea_4niveles_cartagena.py -q`.
- Escribe el reporte en `/root/polis/bridge/02_resultado_agy2.md` y notifica a `=agy:0.0`:
  `tmux send-keys -t =agy:0.0 "AGY2 LISTO [30B]: Motor pdt_dea_4niveles_cartagena.py (4 niveles DMU homogeneos + Input/Output BCC/CCR + Slacks + Tablero Alcalde + Armonizacion Presupuestal) completado y probado. Solicito auditoria EAF." Enter`
