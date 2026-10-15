# INFORME DE RESULTADO: TAREA [TRIADA-FRONTEND-DEA-PDD-08]
## LABORATORIO DE EVALUACIÓN DE CUMPLIMIENTO DE METAS, CONCILIACIÓN DEL PLAN PLURIANUAL DE INVERSIONES (PPI) Y DEA / ECONOMETRÍA DE LOS PLANES DE DESARROLLO DE CARTAGENA (2012–2027)

- **Para:** Coordinador General y Auditor Forense EAF (`agy`)
- **De:** Desarrollador Principal Frontend (`agy2`)
- **Fecha:** 15 de octubre de 2026
- **Tarea Reportada:** `[TRIADA-FRONTEND-DEA-PDD-08]` Implementación de la Sub-vista 6 en `/plataforma/seguimiento`: «6. Evaluación & DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)»
- **Referencia Normativa y Metodológica:** `bridge/00_plan_maestro_dea_planes_desarrollo_08.md` y `bridge/01_tarea_activa.md`
- **Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`, prohibido `git push`)
- **Concurrencia:** Cero colisiones con `codex` (no se alteró ni preparó ningún archivo de `backend/`, `docs/permisos-api.md`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`).

---

## 🎯 1. Resumen Ejecutivo de la Entrega

Se completó de manera íntegra y verificada la construcción de la **Sub-vista 6: «6. Evaluación & DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)»** en la Triada de Motores (`/plataforma/seguimiento`), estructurada en 4 sub-paneles interactivos respaldados por dataset semilla auditado y 5 clientes API resilientes con fallback local inmediato:

### 1.1. Sub-vista 1 (`catalogo_y_ppi`): Catálogo Histórico (2012–2027) y Conciliación Oficial del Plan Plurianual de Inversiones (PPI)
1. **Catálogo de 5 Planes Distritales + 3 Planes Locales:**
   - **PDD 2024–2027 «Cartagena, Ciudad de Derechos»** (*Acuerdo Distrital 139 del 29 de mayo de 2024*, 549 págs., 71.990 filas en `bd_csh`, 29 entidades, 3.170 metas únicas, 1.753 indicadores, 641 BPIM): **PPI Oficial = $12,801 Billones COP** ($12,57B ordinarios + $227,8M SGR).
   - **PDD 2020–2023 «Salvemos Juntos a Cartagena»** (*P.A. 016 / Acuerdo de mayo de 2020*, 370 págs., 24.421 filas en `bd_csh`, 27 entidades, 1.832 metas, 1.137 indicadores): **PPI Oficial = $6,023 Billones COP** (4 Pilares + Eje Transversal, 33 Líneas y 172 Programas).
   - **PDD 2016–2019 «Primero la Gente»** (*Acuerdo 006 de 2016*, 363 págs., 3.013 filas en `bd_csh`, 23 entidades, 806 metas, 1.184 indicadores).
   - **PDD 2013–2015 «Ahora Sí Cartagena»** (Acuerdo 016 de 2013, 199 págs.) y **PDD 2012–2015 «Campo para Todos»** (Acuerdo 001/012 de 2012, 116 págs.).
   - **3 Planes de Desarrollo Local (PDL 2024–2027):** Localidades 1 Histórica ($48.200M FDL), 2 De la Virgen ($52.400M FDL) y 3 Industrial ($49.800M FDL).
2. **Tabla Oficial del Plan Plurianual de Inversiones (PPI Anual):**
   - Desglose 2020–2027 en pesos corrientes y constantes Base Cerrada 2025 (IPC DANE 2012–2025, inflación 2025 = 5.10%).
   - Desglose de fuentes: Recursos Ordinarios vs. Regalías SGR Directas y Regalías SGR Educación Superior.
3. **Conciliación PPI vs. Matrices Excel (`bd_csh`):**
   - Comparación por vigencia con cálculo explícito del factor de calibración por sobrerreporte de duplicados (factor 0.82x para 2024–2027; factor 0.80x para 2020–2023).

### 1.2. Sub-vista 2 (`cumplimiento_metas`): Semáforo de Metas PDD, Línea 1 «Seguridad Humana» y 19 Macroproyectos
1. **Semáforo Integral y Selector de Plan:**
   - 3.170 metas del PDD 2024–2027 auditadas: 67.98% en ruta (≥ 75%), 23.99% alerta media (40–74.9%), 8.03% rezago crítico (< 40%) y 10.35% metas huérfanas sin avance físico reportado.
2. **Foco en Línea 1 «Seguridad Humana» (Acuerdo 139):**
   - 892 metas PDD y $3,456 Billones COP (27% del PPI cuatrienal) evaluadas en sus 5 Componentes Impulsores:
     * *4.1 Seguridad Ciudadana y Orden Público* (Distriseguridad / Interior, 184 metas, 74.2% avance)
     * *4.2 Construcción de Paz, DD.HH. y Convivencia* (Interior, 142 metas, 68.5% avance)
     * *4.3 Salud Pública y Aseguramiento* (DADIS, 268 metas, 78.4% avance)
     * *4.4 Grupos de Especial Protección* (Participación Social, 176 metas, 69.8% avance)
     * *4.5 Pobreza Extrema y Soberanía Alimentaria* (PES, 122 metas, 65.4% avance)
3. **Seguimiento a los 19 Macroproyectos Estratégicos:**
   - Malecón del Mar, Drenajes Pluviales, Parque Distrital Ciénaga de la Virgen, Terminación Vía Perimetral, Distrito Creativo, Nueva Cárcel Distrital, Puente Benjamín Herrera / Angola, etc.

### 1.3. Sub-vista 3 (`frontera_dea_pdd`): Frontera Eficiente DEA de Planes de Desarrollo (`CCR · BCC · SBM · Slacks & Targets`)
1. **Selectores Dinámicos:**
   - Selector de Plan de Desarrollo evaluado (`PDD 2024–2027`, `PDD 2020–2023`, `PDD 2016–2019`).
   - Selector de Insumo $X_1$: `PPI Conciliado (Acuerdo Distrital)` vs. `Presupuesto Reportado en Matrices`.
2. **Dominio A (Entidades Ejecutoras):**
   - Ranking DEA con Insumo $X_1$ (MCOP constantes 2025), Output $Y_1$ (Metas PDD cumplidas equivalentes), Output $Y_2$ (Indicadores eficaces $\ge 75\%$), $\theta_{\text{CCR}}$, $\theta_{\text{BCC}}$, $SE$, Retornos a Escala (`CRS/IRS/DRS`), $\theta_{\text{SBM}}$, Bootstrap e IC 95%.
   - **Modal de Holguras y Metas Objetivo PDD (`Slacks & Targets`):** Prescribe exactamente las metas PDD adicionales ($s_1^+$), indicadores eficaces ($s_2^+$) y ajuste presupuestal ($s_1^-$) requeridos para tocar la frontera envolvente, mostrando los pares referentes ($\lambda_j^*$).
3. **Dominio B (Líneas Estratégicas):**
   - Eficiencia relativa de las 6 Líneas del Acuerdo 139 convirtiendo recursos del PPI en metas cumplidas.

### 1.4. Sub-vista 4 (`econometria_comparada_pdd`): Malmquist Inter-Planes (2016–2027), FDR, Gini/HHI y Wilcoxon
1. **Índice de Productividad de Malmquist Inter-Gobiernos:**
   - Descomposición $\text{MPI} = \text{EFFCH} \times \text{TECHCH}$: ganancia de productividad del 4.2% entre 2016 y 2020, 5.8% entre 2020 y 2024, y 5.0% anual acumulado en el sexenio extendido 2016–2027.
2. **Matriz de Correlaciones con Control FDR Benjamini–Hochberg ($q\text{-value}$):**
   - Coeficientes Spearman y Pearson con garantía $q \ge p$ y significancia estadística al 5% para PPI vs. Metas ($r=0.712, \rho=0.684, p < 0.001$), articulación con Plan de Acción y proyectos BPIM.
3. **Desigualdad Presupuestal (Gini y HHI):**
   - Reducción de la desigualdad presupuestal de Líneas desde Gini 0.582 (2016–2019) a 0.512 (2024–2027), reflejando mayor equilibrio social.
4. **Prueba Pareada No Paramétrica de Wilcoxon:**
   - Contraste pareado sobre las mismas entidades entre 2020–2023 y 2024–2027 ($W=54.5, Z=-2.89, p=0.0038 < 0.01$), confirmando cambio estructural positivo estadísticamente significativo.

---

## 🧪 2. Resultados de los Quality Gates Obligatorios

| Control de Calidad | Comando Ejecutado | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Política de UI** | `node scripts/ui-policy.mjs` | **SUPERADO** | 0 violaciones; modal con `bg-overlay`, tokens semánticos y componentes `@/shared/ui/*`. |
| **Verificación de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **SUPERADO** | 0 errores de compilación TypeScript. |
| **Linter Oficial** | `bun run lint` (`eslint .`) | **SUPERADO** | 0 errores y 0 advertencias de ESLint en todo el proyecto. |
| **Pruebas de la Tarea** | `bun test .../pdd-dea-evaluacion-panel.test.tsx` | **SUPERADO** | 22 pruebas pasadas (0 fallas, 457 aserciones). |
| **Pruebas de Seguimiento** | `bun test src/features/seguimiento/` | **SUPERADO** | 151 pruebas pasadas (0 fallas, 1.898 aserciones). |
| **Compilación de Producción** | `bun run build` (`next build`) | **SUPERADO** | Compilación exitosa Turbopack en 8.5s (192 páginas estáticas SSG/ISR). |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **ACTIVO** | Proceso PID 959285 activo respondiendo HTTP 200 OK. |

---

## 📂 3. Archivos Entregados en el Entorno Frontend (`agy2`)

1. `src/features/seguimiento/data/pdd-dea-cartagena.data.ts` *(nuevo, 1.645 líneas)*: Tipos canónicos, datasets oficiales de los 5 PDDs y 3 PDLs, PPI anual y por líneas, matriz de calibración `bd_csh`, serie IPC DANE Base 2025, DMUs DEA Entidades y Líneas, Malmquist, FDR, Gini/HHI, Wilcoxon y 5 getters locales resilientes.
2. `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(modificado)*: Re-exportación de interfaces y datasets, y 5 funciones cliente API tipadas (`obtenerCatalogoYConciliacionPpiApi`, `obtenerCumplimientoMetasPddApi`, `obtenerFronteraDeaPddApi`, `obtenerEconometriaComparadaPddApi`, `obtenerResumenEjecutivoPddDeaApi`) conectadas a `/api/v1/compromisos/triada/pdd-dea/*` con fallback automático.
3. `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` *(nuevo, 1.508 líneas)*: Componente modular con los 4 sub-paneles interactivos, filtros dinámicos, tabla con modal de Slacks & Targets con `bg-overlay` y diseño conforme a tokens institucionales.
4. `src/features/seguimiento/components/triada-motores-tab.tsx` *(modificado)*: Registro del estado `"pdd_dea"`, botón de navegación `tab-nav-pdd-dea` y renderizado condicional de `<PddDeaEvaluacionPanel />`.
5. `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` *(nuevo, 364 líneas)*: Suite de 22 pruebas unitarias, matemáticas, econométricas y de renderizado SSR.
6. `bridge/02_resultado_agy2.md` *(actualizado)*: Informe formal de cierre y entrega técnica.

---

## 🔒 4. Política Zero-Push y Aislamiento de Codex

- **Backend intacto por `agy2`:** No se añadió, modificó ni preparó ningún archivo en `backend/` ni `docs/permisos-api.md`.
- **Cero `git push`:** Todos los cambios se mantienen estrictamente en el repositorio local en la rama `main`.
