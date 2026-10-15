# PLAN MAESTRO DEFINITIVO (CON LAS 8 CORRECCIONES DE `codex`) — MOTOR DEA Y ECONOMETRÍA DE 2ª ETAPA (`[TRIADA-ECONOMETRIA-DEA-07B]`)

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense (EAF):** `agy` (`=agy:0.0`)
- **Ejecutor Backend (Econometría / SQL / LP HiGHS / Bootstrap):** `codex` (`=codex:0.0`)
- **Ejecutor Frontend y Visualización de Frontera Eficiente DEA:** `agy2` (`=agy2:0.0`)
- **Base de datos canónica:** `bd_csh` (`217.740` registros en `seguimiento.registros_triada_normalizados`, `616` archivos en `seguimiento.archivos_plan_ingeridos`, `30` entidades oficiales canónicas).

---

## 1. Las 8 Correcciones Metodológicas y Empíricas de `codex` Incorporadas al Plan

1. **Corrección 1 (`Y1` desde `avance_fisico_pct` en `PLAN_DESARROLLO`):**
   - Como `avance_estrategico_pct` está vacío en los `217.740` registros, el producto estratégico $Y_1$ se construye leyendo `avance_fisico_pct` (y el cociente verificable en `datos_origen`) sobre los registros con `motor_destino = 'PLAN_DESARROLLO'`.
2. **Corrección 2 (Consolidación por `(entidad_responsable, vigencia, proyecto/meta/actividad)` sin perder libros complementarios):**
   - No se descartan libros complementarios por tomar un único archivo por `(entidad, año)`: se consolida por **`(entidad_normalizada, vigencia, llave_item)`** (donde `llave_item` es `codigo_bpim`, `codigo_meta_pdd`, `indicador` o `descripcion_actividad`), tomando el valor válido del corte de mayor prelación (`ANUAL > T4 > T3 > T2 > T1 > FORMULADO`) para ese ítem sin sumarlo entre cortes, y preservando los `252` proyectos BPIM de libros complementarios y los `15.614` registros de matrices PDD interinstitucionales.
3. **Corrección 3 (Inferencia de Escala Porcentual `[0..1]` vs `[0..100]` con Cuarentena de Casos Ambiguos):**
   - En las hojas mixtas (`373` de `1.466`), primero se contrasta el valor contra las llaves numéricas de `datos_origen` (cociente `ejecutado / programado` cuando existen columnas de meta y ejecución) y contra el encabezado/distribución de la columna. Si una observación sigue siendo ambigua entre `0.5%` y `50%`, se marca con `escala_estado = "ESCALA_AMBIGUA"` y se reporta en la auditoría sin inflar artificialmente el output DEA; los `18` casos `> 100` se auditan por separado (`SOBRECUMPLIMIENTO_O_CANTIDAD_ABSOLUTA`).
4. **Corrección 4 (Etapa Contable Homogénea para $X_1$, Des-propagación y Exclusión de `6` Pares Sin Insumo Financiero):**
   - Prohibido mezclar `MAX(pagos, obligaciones, RP, apropiacion)`. Se define:
     - **Especificación Primaria ($X_1^{\text{aprop}}$):** Apropiación Definitiva Des-propagada en `INVERSION_PRESUPUESTAL` (deshaciendo la repetición en grupos `(archivo, hoja, clave_presupuestal, monto)` y podando filas de sumatorios `TOTAL/SUBTOTAL`).
     - **Especificación Secundaria de Sensibilidad ($X_1^{\text{pagos}}$):** Pagos de Tesorería / Ejecución Financiera observada (solo para las DMUs con reporte de pagos $> 0$).
   - Los `6` pares `entidad-año` en `2020–2025` que no tienen insumo financiero positivo **no reciben un $\epsilon$ artificial**: se excluyen de la frontera de ese año con estado explícito `no_estimable_sin_insumo_financiero`.
5. **Corrección 5 (IPC DANE Certificado con Base Cerrada `2025 = 100` y `2026` Provisional):**
   - Se utiliza la variación anual oficial del IPC DANE incluyendo **`2025: 5,10%`** (`2017: 4,09%`, `2018: 3,18%`, `2019: 3,80%`, `2020: 1,61%`, `2021: 5,62%`, `2022: 13,12%`, `2023: 9,28%`, `2024: 5,20%`, `2025: 5,10%`).
   - Todas las cifras de años cerrados (`2017–2025`) se expresan en **Pesos Constantes Base 2025 (`_constante_2025_cop`)**, y `2026` se presenta como corte parcial en curso con factor provisional explícito (`2026_PARCIAL`).
6. **Corrección 6 (Modelo Núcleo Parsimonioso $m=1, s=2$ que cumple la Regla de Cooper $n \ge 9$):**
   - **Especificación Núcleo ($m = 1, s = 2$, mínimo Cooper $n \ge \max(1\times 2, 3(1+2)) = 9$ DMUs):**
     - **Input $X_1$:** Presupuesto/Apropiación Des-propagada en Pesos Constantes Base 2025 (en millones de COP para buen condicionamiento numérico en HiGHS).
     - **Output $Y_1$ (`output_metas_pdd_equivalentes`):** Suma de metas únicas equivalentes logradas en `PLAN_DESARROLLO` ($\sum \text{avance\_norm}/100$).
     - **Output $Y_2$ (`output_actividades_pa_equivalentes`):** Suma de actividades operativas únicas equivalentes logradas en `PLAN_ACCION` (reportando tanto el total operativo como la variante estricta de **Verbo Fuerte DNP** como especificación de calidad).
   - **Especificación Extendida de Sensibilidad ($m = 2, s = 3$, mínimo Cooper $n \ge 15$):** Añade $X_2$ (proyectos/frentes activos) y $Y_3$ (proyectos con ejecución física verificable $\ge 70\%$ tras normalizar escala), estimable únicamente en la frontera distrital completa donde $n \ge 15$.
   - **Fronteras de Grupo:** Solo se calculan para grupos que alcancen el tamaño mínimo efectivo ($n \ge 9$ en el modelo $m=1, s=2$: `SECTOR_CENTRAL_RECTOR` y `DESCENTRALIZADAS_Y_AUTORIDADES`), mientras `ALCALDIAS_LOCALES` ($n=3$ por año) se evalúa en ventana panel (`Localidad × Año`, $n = 16$ observaciones en `2020–2025`) o frente a la frontera distrital, devolviendo `no_estimable_muestra_insuficiente` en corte anual aislado.
7. **Corrección 7 (Solver `scipy.optimize.linprog(method='highs')` en ambos `.venv`, Tolerancias Explícitas y Bootstrap $B = 1.000$):**
   - `scipy==1.18.1` ya quedó instalado tanto en `/root/polis/venv` como en `/root/polis/backend/.venv` (y se declara en `backend/pyproject.toml`).
   - El bootstrap estadístico de los puntajes DEA usa **$B = 1.000$ réplicas** con semilla fija reproducible (`seed = 20261015`) y remuestreo agrupado por entidad para reportar sesgo e intervalo de confianza al 95% (`[ic95_inf, ic95_sup]`). Cuando una unidad en supereficiencia VRS sea infactible, el solver devuelve `estado_supereficiencia = "INFACTIBLE_VRS"` en vez de fallar.
8. **Corrección 8 (Segunda Etapa Sin Endogeneidad Presupuestal y Pruebas Pareadas entre Gobiernos):**
   - En la segunda etapa (regresión truncada / modelo explicativo con errores estándar bootstrap agrupados por entidad sobre el panel elegible `2020–2025`), **se excluye `ln(Presupuesto)` como regresor** (pues ya es $X_1$) y se usan covariables exógenas a la frontera:
     - $Z_1$: Proporción de actividades con verbo débil DNP (*reunionitis*).
     - $Z_2$: Tasa de continuidad de proyectos BPIM.
     - $Z_3$: Completitud/transparencia documental en el año.
     - $Z_4$: Grupo institucional (`SECTOR_CENTRAL` vs. `DESCENTRALIZADAS`).
   - En las comparaciones entre gobiernos (`2020–2023` vs. `2024–2025`, promediando por entidad en ventanas anuales homologadas), se usa la **prueba pareada de rangos con signo de Wilcoxon (*Wilcoxon signed-rank test*)** sobre las entidades presentes en ambos periodos, además de reportar el tamaño muestral pareado $n$.

---

## 2. Partición Estricta de Archivos (Cero Conflictos Git)

### A. Dominio Exclusivo de `codex` (`=codex:0.0` — `[TRIADA-BACKEND-DEA-ECONOMETRIA-07B]`)
- `backend/pyproject.toml` *(añadir `scipy>=1.14.0`)*
- `backend/app/modules/compromisos/dea_econometria_service.py` *(nuevo)*
- `backend/app/modules/compromisos/router.py` *(añadir los 5 endpoints bajo `/api/v1/compromisos/triada/dea/...`)*
- `backend/tests/test_dea_econometria_triada.py` *(nuevo)*
- `bridge/02_entrega_codex.md`

### B. Dominio Exclusivo de `agy2` (`=agy2:0.0` — `[TRIADA-FRONTEND-DEA-ECONOMETRIA-07B]`)
- `src/features/seguimiento/data/dea-econometria-cartagena.data.ts` *(nuevo)*
- `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(añadir clientes para los 5 endpoints `/api/v1/compromisos/triada/dea/...`)*
- `src/features/seguimiento/components/dea-econometria-panel.tsx` *(nuevo)*
- `src/features/seguimiento/components/triada-motores-tab.tsx` *(integrar la pestaña `5. Econometría & Frontera DEA (CCR · BCC · SBM · Malmquist)`)*
- `src/features/seguimiento/__tests__/dea-econometria-panel.test.tsx` *(nuevo)*
- `bridge/02_resultado_agy2.md`
