# ORDEN DE EJECUCIÓN FRONTEND (`agy2`) — `[TRIADA-FRONTEND-DEA-ECONOMETRIA-07B]`

- **Fecha:** 2026-10-15
- **Coordinador / Auditor Forense EAF:** `agy` (`=agy:0.0`)
- **Ejecutor Frontend y Visualización Econométrica:** `agy2` (`=agy2:0.0`)
- **Plan Maestro definitivo:** `bridge/00_plan_maestro_dea_econometria_07.md` *(con las 8 correcciones metodológicas de la revisión crítica)*
- **Rama:** `main` (commit local exclusivo de tus archivos en `src/features/seguimiento/` y `bridge/02_resultado_agy2.md`; **PROHIBIDO `git push`** y **NO tocar `backend/` ni `bridge/01_tarea_codex.md` ni `bridge/02_entrega_codex.md` porque `codex` trabaja en paralelo en el backend**).

---

## 1. Objetivo

Construir e integrar en el Frontend de POLIS (`/plataforma/seguimiento`) el **Laboratorio de Econometría y Frontera Eficiente DEA (`DeaEconometriaPanel`)** conectado a los 5 nuevos endpoints del backend (`/api/v1/compromisos/triada/dea/...`) y respaldado por un dataset semilla auditado en `src/features/seguimiento/data/dea-econometria-cartagena.data.ts` que refleje rigurosamente las 8 correcciones metodológicas sobre `bd_csh`.

---

## 2. Archivos de tu Dominio Exclusivo

1. `src/features/seguimiento/data/dea-econometria-cartagena.data.ts` *(nuevo — tipos TypeScript y datos semilla auditados de las Fases 0, 1, 2 y 3 con las 8 correcciones: IPC DANE oficial con `2025 = 5,10%` Base 2025, cascada de des-propagación de `$293,8B` brutos a `$2,4B–$6,3B` anuales, auditoría de las `373` hojas mixtas y cuarentena de `ESCALA_AMBIGUA`, modelo núcleo $m=1, s=2$ que cumple Cooper $n \ge 9$, exclusión explícita de los `6` pares `no_estimable_sin_insumo_financiero`, puntajes `CCR`, `BCC`, `SBM de Tone`, `Supereficiencia`, `Bootstrap B=1.000 IC 95%`, `Peers`, `Slacks/Targets`, `Malmquist 2020–2025`, `Segunda Etapa sin endogeneidad presupuestal`, `Spearman/Pearson con FDR Benjamini-Hochberg`, `Gini/HHI` y `Prueba Pareada de Wilcoxon`)*
2. `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(ampliar con los clientes tipados para los 5 endpoints `/api/v1/compromisos/triada/dea/auditoria-saneamiento`, `/frontera-eficiencia`, `/malmquist`, `/econometria-segunda-etapa` y `/resumen-integral`, con fallback local resiliente)*
3. `src/features/seguimiento/components/dea-econometria-panel.tsx` *(nuevo — componente interactivo con las 4 sub-vistas del DEA y la Econometría)*
4. `src/features/seguimiento/components/triada-motores-tab.tsx` *(integrar la Sub-vista 5: `5. Frontera Eficiente DEA & Econometría (CCR · BCC · SBM · Malmquist)` con `data-testid="tab-nav-dea-econometria"`)*
5. `src/features/seguimiento/__tests__/dea-econometria-panel.test.tsx` *(nuevo — suite de pruebas unitarias e integración SSR con `bun test`)*
6. `bridge/02_resultado_agy2.md` *(reporte de entrega)*

---

## 3. Las 4 Sub-vistas Interactivas de `DeaEconometriaPanel`

1. **Sub-vista 1 (`auditoria-saneamiento`): Cascada Forense de Saneamiento Econométrico (Fase 0)**
   - Muestra el embudo de reconciliación financiera paso a paso: Suma bruta (`$293,8B`) $\rightarrow$ Deduplicación inter-motor (`58.719` filas repetidas en varios motores) $\rightarrow$ Consolidación por ítem/corte preservando los `252` BPIM complementarios y las `15.614` filas interinstitucionales $\rightarrow$ Des-propagación de los `1.004` grupos repetidos y poda de sumatorios $\rightarrow$ Deflactación con **IPC Oficial DANE Base Cerrada 2025 (`2025 = 5,10%`)**.
   - Muestra la auditoría de escalas porcentuales (`1.466` combinaciones hoja-motor, `373` mixtas reconciliadas por cociente `ejecutado/programado`, cuarentena de `ESCALA_AMBIGUA` y las `18` filas `> 100`).
2. **Sub-vista 2 (`frontera-eficiencia`): Frontera de Eficiencia DEA (`CCR · BCC · SBM · Bootstrap IC 95%`)**
   - Selector de vigencia (`2020..2025` + `2026_PARCIAL`), especificación (`Núcleo m=1, s=2 [Cooper n≥9]` vs. `Extendida m=2, s=3 [Cooper n≥15]`) e insumo (`Apropiación Constante 2025` vs. `Pagos Ejecutados`).
   - Tabla y visualización de las DMUs elegibles mostrando: $\theta_{\text{CCR}}$, $\theta_{\text{BCC}}$, Eficiencia de Escala (`CRS / IRS / DRS`), $\theta_{\text{SBM}}$, Supereficiencia Andersen-Petersen, Puntaje Bootstrap Corregido por Sesgo ($B=1.000$) con **Intervalo de Confianza al 95% (`[ic95_inf, ic95_sup]`)**, **Pares de Referencia (`Peers` $\lambda_j^*$)**, **Holguras y Metas Objetivo en la Frontera (`Slacks & Targets`)**, y sección transparente de **Entidades Excluidas / `no_estimable`** con su motivo exacto (como los `6` pares sin insumo financiero positivo o `Alcaldías Locales` en corte aislado $n=3 < 9$).
3. **Sub-vista 3 (`malmquist`): Productividad Dinámica de Malmquist (`2020–2025`)**
   - Descomposición $\text{MPI} = \text{EFFCH (Catch-up)} \times \text{TECHCH (Desplazamiento de Frontera)}$ por entidad y transición anual, distinguiendo qué secretarías mejoraron gestión interna ($\text{EFFCH} > 1$) y dónde se desplazó la frontera ($\text{TECHCH} > 1$).
4. **Sub-vista 4 (`econometria-segunda-etapa`): Segunda Etapa Econométrica, Correlaciones FDR, Gini/HHI y Wilcoxon Pareado**
   - Resultados del modelo de segunda etapa sobre covariables exógenas (`% Verbo Débil DNP`, `Continuidad BPIM`, `Transparencia Documental`, `Grupo Institucional` — sin endogeneidad presupuestal).
   - Matriz de correlaciones de **Spearman ($\rho$) y Pearson ($r$)** con $n$, $p\text{-value}$ y **$q\text{-value}$ ajustado por Benjamini-Hochberg (FDR)**.
   - Evolución de la desigualdad y concentración presupuestal (**Gini** y **HHI** en Pesos Constantes 2025) y **Prueba Pareada de Wilcoxon** entre los periodos `2020–2023` y `2024–2025`.

---

## 4. Validación y Cierre

1. Ejecutar `node scripts/ui-policy.mjs`, `bun run typecheck`, `bun run lint` y `bun test src/features/seguimiento/` (`0` errores).
2. Ejecutar `bun run build` y reiniciar `polis-frontend.service`.
3. Documentar en `bridge/02_resultado_agy2.md` y hacer **commit local en `main`** incluyendo **únicamente tus archivos en `src/features/seguimiento/` y `bridge/02_resultado_agy2.md`**. **PROHIBIDO `git push`** y prohibido incluir archivos de `backend/`.
