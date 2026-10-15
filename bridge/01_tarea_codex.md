# ORDEN DE EJECUCIÓN BACKEND (`codex`) — `[TRIADA-BACKEND-DEA-ECONOMETRIA-07B]`

- **Fecha:** 2026-10-15
- **Coordinador / Auditor Forense EAF:** `agy` (`=agy:0.0`)
- **Ejecutor Backend y Econometría:** `codex` (`=codex:0.0`)
- **Plan Maestro definitivo:** `bridge/00_plan_maestro_dea_econometria_07.md` *(incorpora tus 8 correcciones de `[TRIADA-DEA-REVISION-PLAN-07A]`)*
- **Rama:** `main` (commit local exclusivo de tus archivos de backend y `bridge/02_entrega_codex.md`; **PROHIBIDO `git push`** y **NO tocar `src/` ni `bridge/01_tarea_activa.md` ni `bridge/02_resultado_agy2.md` porque `agy2` trabaja en paralelo en el frontend**).

---

## 1. Objetivo

Implementar de principio a fin el motor **`backend/app/modules/compromisos/dea_econometria_service.py`** (de solo lectura analítica sobre `bd_csh`, manteniendo intactos los 7 conteos canónicos y los `217.740` registros) con todas las salvaguardas metodológicas de tu revisión crítica:
1. **Fase 0 (`auditoria_saneamiento`):**
   - Consolidación por `(entidad_normalizada, vigencia, llave_item)` tomando el corte más reciente por ítem (`ANUAL > T4 > T3 > T2 > T1 > FORMULADO`) sin perder los `252` BPIM de libros complementarios ni los `15.614` registros de matrices PDD interinstitucionales.
   - Armonización de escala porcentual `[0..1]` vs `[0..100]` contrastando primero contra `datos_origen` (cociente `ejecutado / programado` cuando exista) y distribución de la columna/hoja, marcando `ESCALA_AMBIGUA` cuando no haya prueba inequívoca y separando los `18` casos `> 100`.
   - Des-propagación financiera sobre `INVERSION_PRESUPUESTAL` (etapas contables separadas: `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `obligaciones_cop`, `pagos_tesoreria_cop`), poda de sumatorios y re-escalado auditado de unidades, expresado en **Pesos Constantes Base 2025 (IPC DANE oficial con `2025 = 5,10%`)** y `2026` como corte parcial provisional explícito.
2. **Fases 1 y 2 (`frontera_eficiencia` y `malmquist` usando `scipy.optimize.linprog(method='highs')`):**
   -Nota: `scipy==1.18.1` ya fue instalado también en `/root/polis/backend/.venv`; agrégalo en `backend/pyproject.toml`.
   - **Especificación Núcleo ($m=1, s=2$, Cooper $n \ge 9$):**
     - $X_1$: Apropiación Definitiva Des-propagada en Pesos Constantes 2025 (con variante secundaria de Pagos Ejecutados). Excluir explícitamente (`no_estimable_sin_insumo_financiero`) los pares sin insumo financiero positivo (nunca usar $\epsilon$ para inventar presupuesto).
     - $Y_1$: Metas equivalentes logradas en `PLAN_DESARROLLO` leyendo `avance_fisico_pct` normalizado.
     - $Y_2$: Actividades operativas equivalentes logradas en `PLAN_ACCION` (reportando tanto el total operativo como la variante de Verbo Fuerte DNP).
   - **Especificación Extendida ($m=2, s=3$, Cooper $n \ge 15$):** Estimada solo cuando la muestra efectiva del corte sea $\ge 15$.
   - Modelos LP orientados a producto con `linprog(method='highs')`:
     - **DEA-CCR (CRS)**, **DEA-BCC (VRS)**, **Eficiencia de Escala (`SE`, `CRS/IRS/DRS`)**, **SBM de Tone (holguras $s^-$, $s^+$ y `targets` en la frontera)**, **Pares de Referencia (`peers` con pesos $\lambda_j^*$)**, **Supereficiencia de Andersen-Petersen** (devolviendo `no_estimable` cuando VRS sea infactible), **Fronteras por Grupo** (solo donde $n \ge 9$; reportando `no_estimable_muestra_insuficiente` para grupos con $n < 9$ como Alcaldías Locales en corte anual aislado y ofreciendo la ventana panel `2020–2025` para Alcaldías Locales), y **Bootstrap ($B = 1.000$ réplicas, `seed = 20261015`)** con puntaje corregido por sesgo e IC 95%.
   - **Índice de Productividad de Malmquist (`MPI = EFFCH × TECHCH`)** en transiciones de años cerrados `2020–2025` con DMUs elegibles en ambos años.
3. **Fase 3 (`econometria_segunda_etapa`):**
   - Segunda etapa explicativa sobre el panel elegible `2020–2025` con covariables exógenas (sin `ln(Presupuesto)` para evitar endogeneidad con $X_1$: proporción de verbo débil DNP, continuidad BPIM, transparencia documental, grupo institucional) e inferencia con bootstrap agrupado por entidad.
   - Matriz de correlaciones de **Spearman ($\rho$) y Pearson ($r$)** con tamaño muestral $n$, $p\text{-value}$ y **$q\text{-value}$ ajustado por Benjamini-Hochberg (FDR)**.
   - Coeficiente de **Gini** e **Índice Herfindahl-Hirschman (HHI)** sobre $X_1$ constante 2025 por año y por dimensión (ponderando etiquetas múltiples para que sumen 1 por registro y separando los no asignados).
   - Comparación pareada entre los periodos `2020–2023` y `2024–2025` mediante **prueba pareada de Wilcoxon (*Wilcoxon signed-rank test*)** sobre las entidades presentes en ambas ventanas.

---

## 2. Los 5 Endpoints REST en `backend/app/modules/compromisos/router.py`

1. `GET /api/v1/compromisos/triada/dea/auditoria-saneamiento`
2. `GET /api/v1/compromisos/triada/dea/frontera-eficiencia` *(query params opcionales: `vigencia: int = 2025`, `modo: str = "nucleo_1x2"`, `insumo: str = "apropiacion"`)*
3. `GET /api/v1/compromisos/triada/dea/malmquist` *(query params opcionales: `desde: int = 2020`, `hasta: int = 2025`)*
4. `GET /api/v1/compromisos/triada/dea/econometria-segunda-etapa`
5. `GET /api/v1/compromisos/triada/dea/resumen-integral`

---

## 3. Validación y Cierre

1. Pasar `ruff format` y `ruff check` en los archivos tocados (`0` errores).
2. Crear y aprobar `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_dea_econometria_triada.py` (`0` fallos).
3. Reiniciar `polis-backend.service`, verificar que `/api/v1/health/ready` y los 5 endpoints `/api/v1/compromisos/triada/dea/*` respondan HTTP 200 con datos reales de `bd_csh`, y comprobar que los 7 conteos canónicos y los `217.740` registros siguen intactos.
4. Documentar en `bridge/02_entrega_codex.md` y hacer **commit local en `main`** únicamente de tus archivos (`backend/pyproject.toml`, `backend/app/modules/compromisos/dea_econometria_service.py`, `backend/app/modules/compromisos/router.py`, `backend/tests/test_dea_econometria_triada.py`, `bridge/02_entrega_codex.md`). **PROHIBIDO `git push`.**
