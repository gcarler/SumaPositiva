# ORDEN DE TAREA FRONTEND: `[TRIADA-FRONTEND-DEA-PDD-08]`
## LABORATORIO DE EVALUACIÓN DE CUMPLIMIENTO DE METAS, CONCILIACIÓN DEL PLAN PLURIANUAL DE INVERSIONES (PPI) Y DEA / ECONOMETRÍA DE LOS PLANES DE DESARROLLO DE CARTAGENA (2012–2027)

- **Para:** Desarrollador Principal Frontend (`agy2`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-15
- **Referencia:** `bridge/00_plan_maestro_dea_planes_desarrollo_08.md`
- **Rama:** `main` (**Política Zero-Push Estricta**: solo commit local, prohibido `git push`)

---

## 1. Objetivo de la Tarea

Construir e integrar en `/plataforma/seguimiento` la **Sub-vista 6 (`tab-nav-pdd-dea`): «6. Evaluación & DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)»** mediante el componente `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`, respaldado por el dataset semilla auditado `src/features/seguimiento/data/pdd-dea-cartagena.data.ts` y los 5 clientes tipados en `src/features/seguimiento/services/plan-accion-dnp-api.ts` conectados a `/api/v1/compromisos/triada/pdd-dea/*`.

---

## 2. Estructura de los 4 Sub-paneles Interactivos de `PddDeaEvaluacionPanel`

### Sub-vista 1 (`catalogo_y_ppi`): Catálogo Histórico (`2012–2027`) y Conciliación Oficial del Plan Plurianual de Inversiones (PPI)
1. **Tarjetas de los 5 Planes de Desarrollo Distritales + 3 Planes Locales:**
   - **PDD 2024–2027: «Cartagena, Ciudad de Derechos»** (*Acuerdo Distrital 139 del 29 de mayo de 2024*): `71.990` filas en `bd_csh`, `29` entidades, `3.170` metas PDD únicas, `1.753` indicadores, **Plan Plurianual de Inversiones (PPI) Oficial = `$12,801 Billones` COP** (`2024: $3,271B`, `2025: $2,954B`, `2026: $3,194B`, `2027: $3,382B`).
   - **PDD 2020–2023: «Salvemos Juntos a Cartagena»** (*P.A. 016 / Acuerdo de mayo de 2020*): `24.421` filas en `bd_csh`, `27` entidades, `1.832` metas PDD únicas, `1.137` indicadores, **PPI Oficial = `$6,023 Billones` COP** (4 Pilares: *Resiliente, Incluyente, Contingente, Transparente* + Eje Transversal, `33` Líneas Estratégicas y `172` Programas).
   - **PDD 2016–2019: «Primero la Gente para una Cartagena Sostenible y Competitiva»** (*Acuerdo 006 del 13 de junio de 2016*): `3.013` filas en `bd_csh`, `23` entidades, `806` metas PDD únicas, `1.184` indicadores.
   - **PDD 2013–2015: «Ahora Sí Cartagena»** (*Acuerdo 016 del 26 de dic. de 2013*, `199` págs.) y **PDD 2012–2015: «Campo para Todos»** (*Acuerdo 001/012 de 2012*, `161` págs.).
   - **3 Planes de Desarrollo Local 2024–2027:** *Localidad 1 Histórica y del Caribe Norte*, *Localidad 2 De la Virgen y Turística* y *Localidad 3 Industrial y de la Bahía*.
2. **Tabla Oficial del Plan Plurianual de Inversiones (PPI) y Conciliación con `bd_csh`:**
   - Desglose anual `2020–2027` en pesos corrientes y en **Pesos Constantes Base Cerrada 2025 (IPC DANE `2012–2025`)**.
   - Comparación por Línea Estratégica (`Seguridad Humana`, `Vida Digna`, `Desarrollo Económico Equitativo`, `Ciudad Conectada y Sostenible`, `Innovación Pública y Participación Ciudadana`, `Capítulo Étnico`) y separación entre recursos ordinarios (`$12,57B` en 2024–2027) y Regalías SGR (`$227,8 mil M`).
   - Tabla de **Conciliación PPI vs. Matrices Excel (`bd_csh`)** que muestra el factor de calibración por sobrerreporte de filas repetidas.

### Sub-vista 2 (`cumplimiento_metas`): Semáforo de Metas PDD, Línea Estratégica 1 («Seguridad Humana») y 19 Macroproyectos
1. **Selector de Plan de Desarrollo (`PDD_2024_2027`, `PDD_2020_2023`, `PDD_2016_2019`, `TODOS`) y Filtro de Línea Estratégica / Entidad:**
   - Indicadores de cabecera: Metas únicas formuladas, Metas con seguimiento activo, **Metas Huérfanas (sin avance reportado)**, Avance Físico Promedio (`%`), Metas Cumplidas o en Ruta (`>= 75%`), Alerta Media (`40%–74,9%`) y Rezago Crítico (`< 40%`).
2. **Foco Especial en Línea Estratégica 1: «Seguridad Humana» (Acuerdo 139 de 2024):**
   - Evaluación detallada de sus **5 Componentes Impulsores de Avance**:
     1. *4.1 Seguridad Ciudadana y Orden Público*
     2. *4.2 Construcción de Paz, Derechos Humanos y Convivencia*
     3. *4.3 Salud Pública y Aseguramiento*
     4. *4.4 Atención Integral a Grupos de Especial Protección*
     5. *4.5 Superación de la Pobreza Extrema y Soberanía Alimentaria*
3. **Seguimiento a los 19 Macroproyectos Estratégicos (`2024–2027`) y 3 Planes de Desarrollo Local:**
   - Estado de *Malecón del Mar*, *Plan Maestro de Drenajes Pluviales*, *Parque Distrital Ciénaga de la Virgen*, *Terminación Vía Perimetral*, *Distrito Creativo*, *Nueva Cárcel Distrital*, *Puente Angola*, etc., y avance de las 3 Localidades.

### Sub-vista 3 (`frontera_dea_pdd`): Frontera Eficiente DEA de los Planes de Desarrollo (`CCR · BCC · SBM · Slacks & Targets`)
1. **Selectores Dinámicos:**
   - Plan evaluado (`PDD 2024–2027 Ciudad de Derechos`, `PDD 2020–2023 Salvemos Juntos`, `PDD 2016–2019 Primero la Gente`).
   - Insumo $X_1$: **`PPI Conciliado (Acuerdo Distrital)`** vs. **`Presupuesto Reportado en Matrices`**.
2. **Dos Tablas DEA Interactivas:**
   - **A. Frontera DEA por Entidad Responsable del Plan de Desarrollo ($n = 23\text{–}29$ DMUs, Regla de Cooper cumplida):**
     - Muestra Insumo $X_1^{\text{PPI}}$ (MCOP constantes 2025), Output $Y_1$ (Metas PDD Equivalentes Cumplidas), Output $Y_2$ (Indicadores PDD en Meta Eficaz $\ge 75\%$), $\theta_{\text{CCR}}$, $\theta_{\text{BCC}}$, $SE$, Retornos (`CRS/IRS/DRS`), $\theta_{\text{SBM}}$, Puntaje Bootstrap con IC 95% y Pares de Referencia ($\lambda_j^*$).
     - Botón para abrir el **Modal de Holguras y Metas Objetivo PDD (`Slacks & Targets`)**, prescribiendo cuántas metas PDD adicionales ($s_1^+$) e indicadores eficaces ($s_2^+$) debe cumplir cada entidad para llegar a la frontera.
   - **B. Frontera DEA Programática por Línea Estratégica / Pilar del PDD:**
     - Evalúa qué Líneas Estratégicas convierten con mayor eficiencia su tajada del Plan Plurianual de Inversiones en metas cumplidas.

### Sub-vista 4 (`econometria_comparada_pdd`): Malmquist Inter-Planes (`2016–2027`), Correlaciones FDR, Gini/HHI y Cambio Estructural
1. **Índice Dinámico de Malmquist Entre Planes de Desarrollo (`2016–2019` $\rightarrow$ `2020–2023` $\rightarrow$ `2024–2027`):**
   - Descomposición con media geométrica $\text{MPI} = \text{EFFCH (Catch-up)} \times \text{TECHCH (Desplazamiento)}$ entre gobiernos sucesivos.
2. **Matriz de Correlaciones con Control FDR Benjamini–Hochberg ($q\text{-value}$):**
   - Spearman ($\rho$) y Pearson ($r$) entre asignación PPI ($X_1$), metas PDD cumplidas ($Y_1$), indicadores eficaces ($Y_2$), articulación con Plan de Acción anual y eficiencia DEA del PDD.
3. **Desigualdad Presupuestal del PPI (Gini y HHI por Línea Estratégica y Dimensión SHI) y Prueba Pareada de Wilcoxon / Friedman entre Gobiernos.**

---

## 3. Archivos Permitidos para `agy2` (Cero Colisiones con `codex`)

1. `src/features/seguimiento/data/pdd-dea-cartagena.data.ts` *(nuevo)*
2. `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(modificado — añade tipos y los 5 clientes `/api/v1/compromisos/triada/pdd-dea/*` + getters locales)*
3. `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` *(nuevo)*
4. `src/features/seguimiento/components/triada-motores-tab.tsx` *(modificado — añade botón `tab-nav-pdd-dea` para la Sub-vista 6 y renderiza `<PddDeaEvaluacionPanel />`)*
5. `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` *(nuevo — mínimo 18 tests verificando los 4 bloques, cotas DEA, PPI oficial, Línea Seguridad Humana, Malmquist inter-planes, FDR y renderizado SSR)*
6. `bridge/02_resultado_agy2.md` *(actualizado)*

*(Prohibido tocar `backend/`, `docs/permisos-api.md`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`).*

---

## 4. Quality Gates Obligatorios

1. `node scripts/ui-policy.mjs` (`0` incumplimientos; modales con `bg-overlay`, componentes `@/shared/ui/*`, sin tags nativos prohibidos).
2. `bun run typecheck` (`tsc --noEmit` con `0` errores).
3. `bun run lint` (`eslint` con `0` errores).
4. `bun test src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` y `bun test src/features/seguimiento/` (`100%` pass).
5. `bun run build` y reinicio de `polis-frontend.service`.
6. **Commit local en `main`** (sin `git push`) y reporte en `bridge/02_resultado_agy2.md`.
