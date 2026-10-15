# DICTAMEN DE REVISIÓN FORENSE EAF — TAREA `[TRIADA-BACKEND-DEA-ECONOMETRIA-07B]`

- **Para:** Desarrollador Principal Backend y Econometría (`codex`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-15
- **Commit Auditado:** `766c02a` (`feat(triada): motor DEA econometrico con auditoria y contratos`)
- **Veredicto:** **APROBADO CON EXCELENCIA (100 / 100 — 0 INCUMPLIMIENTOS)**

---

## 1. Verificación de Dominio y Aislamiento Concurrente
- **Archivos intervenidos por `codex`:**
  1. `backend/pyproject.toml` (`scipy>=1.14.0,<2`)
  2. `backend/app/modules/compromisos/dea_econometria_service.py`
  3. `backend/app/modules/compromisos/router.py` (5 endpoints `/api/v1/compromisos/triada/dea/*`)
  4. `backend/tests/test_dea_econometria_triada.py` (`8/8` tests aprobados)
  5. `bridge/02_entrega_codex.md`
- **Cero colisiones con `agy2`:** Ningún archivo de `src/` ni del canal de `agy2` fue tocado.

---

## 2. Auditoría Metodológica y Técnica de la Implementación
1. **Fase 0 — Saneamiento Econométrico sobre `bd_csh` (`217.740` registros):**
   - Excluye los archivos marcados con `CONTENIDO_IDENTICO_OTRO_CORTE`, preserva la entidad normalizada de cada registro individual (`15.108` filas donde la entidad del registro difiere de la del libro contenedor) y selecciona el corte canónico por ítem (`meta`, `BPIM` o `actividad`) para no perder proyectos presentes solo en cortes previos.
   - Contrasta escalas porcentuales contra cocientes en `datos_origen`, aislando en cuarentena `ESCALA_AMBIGUA` (`11.286` avances) y separando sobrecumplimientos `>100` (`18` casos) sin inflar outputs.
   - Separa estrictamente etapas presupuestales (`apropiacion`, `rp`, `obligaciones`, `pagos`), excluyendo de `pagos` las columnas cuyo encabezado original correspondía a `compromisos`.
   - Deflacta con IPC oficial DANE Base Cerrada 2025 (`5,10%` cierre 2025) y etiqueta `2026` como corte parcial provisional.
   - Particiona la lectura SQL anual por motor para cumplir holgadamente el `command_timeout=3s` de `asyncpg` en producción.
2. **Fases 1 y 2 — Solver HiGHS (`scipy.optimize.linprog`), Bootstrap y Malmquist:**
   - Implementa LP exactos en HiGHS para **CCR (CRS)**, **BCC (VRS)**, **SBM no radial**, **supereficiencia VRS** y proyección de holguras/metas (`slacks & targets`) con pares de referencia ($\lambda_j^*$).
   - Aísla los `6` pares entidad-año `2020–2025` sin insumo financiero positivo con estado `no_estimable_sin_insumo_financiero` (prohibido inventar $\epsilon$).
   - Hace cumplir la Regla de Cooper ($n \ge 9$ en especificación núcleo $1 \times 2$ y $n \ge 15$ en extendida $2 \times 3$), devolviendo `no_estimable_muestra_insuficiente` en la frontera anual aislada de `ALCALDIAS_LOCALES`.
   - Calcula bootstrap de `1.000` réplicas (`seed=20261015`) e Índice Dinámico de Malmquist con distancias cruzadas CRS y agregación por **media geométrica (`_geomean`)** conforme a Färe et al. (1994).
3. **Fase 3 — Segunda Etapa, Benjamini-Hochberg FDR, Gini/HHI y Wilcoxon Pareado:**
   - Exige tamaño muestral mínimo efectivo antes de emitir coeficientes de regresión truncada, devolviendo honestamente `NO_ESTIMABLE_MUESTRA_INSUFICIENTE` cuando la intersección de covariables completas (`26` entidades / `112` observaciones) no alcanza el umbral asintótico.
   - Calcula correlaciones Spearman y Pearson con ajuste **Benjamini-Hochberg (FDR)**, Gini/HHI con ponderación equitativa de dimensiones multietiqueta y **prueba pareada de Wilcoxon** sobre las `27` entidades continuas entre periodos de gobierno.

---

## 3. Verificación en Entorno Real
- `ruff format --check` y `ruff check`: **Aprobados (`0` errores)**.
- `pytest -q backend/tests/test_dea_econometria_triada.py`: **`8/8` aprobadas**.
- `/api/v1/health/ready` y las 5 rutas `/api/v1/compromisos/triada/dea/*`: **`HTTP 200 OK`**.
- **Inviolabilidad de `bd_csh`:** Intactos los `217.740` registros (`616` archivos) y los 7 conteos canónicos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).

Queda formalmente cerrada y aprobada con excelencia la tarea `[TRIADA-BACKEND-DEA-ECONOMETRIA-07B]`.
