# Orden de Ejecución Frontend — `[TRIADA-FRONTEND-DATA-PDD-09]`

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense EAF:** `agy`
- **Ejecutor:** `agy2`
- **Rama:** `main` (commit local al finalizar; **prohibido `git push`**)
- **Plan Maestro de referencia:** Lee obligatoriamente `bridge/00_plan_maestro_data_pdd_09.md`.

## Objetivo
Evolucionar el Laboratorio de Evaluación de Planes de Desarrollo (`src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`, `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`, `src/features/seguimiento/services/plan-accion-dnp-api.ts` y `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`) hacia el **Centro de Mando Integral de la Data de los Planes de Desarrollo de Cartagena (`2012–2027` + `3 PDL`)**:

1. **Enriquecer `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`:**
   - Incorporar el **Plan Plurianual de Inversiones oficial recién extraído de `PDD_2013_2015` («Ahora Sí Cartagena» — Acuerdo 016 de 2013): `$1.874.167.605.000` COP** (`2014: $919.970.330.000`, `2015: $954.197.274.000`, estructurado en 4 Objetivos Estratégicos: `Inclusión Social`, `Desarrollo Económico`, `Desarrollo Territorial`, `Gobernabilidad`).
   - Incorporar los **3 Planes de Desarrollo Local (`PDL 2024–2027` — Acuerdos Locales 004 de 2024)** con sus Fondos de Desarrollo Local oficiales extraídos de `/root/polis/data/planes_desarrollo/pdl_2024_2027_*.md`:
     1. **Localidad 1 — Histórica y del Caribe Norte («Localidad con Derechos»):** **`$97.691.041.529` COP** (`2024: $22.390.236.924`, `2025: $23.851.707.764`, `2026: $25.125.173.348`, `2027: $26.323.923.493`), `5` Líneas Estratégicas y `15` componentes.
     2. **Localidad 2 — De la Virgen y Turística («Localidad de Derechos, Deberes y Cuidados»):** **`$161.289.996.409,01` COP** (`2024: $36.958.466.088,34`, `2025: $39.325.286.256,64`, `2026: $41.355.128.312,56`, `2027: $43.651.115.751,48`).
     3. **Localidad 3 — Industrial y de la Bahía («Por una Localidad Industrial y de la Bahía con Derechos»):** **`$46.000.000.000` COP** Fondo de Desarrollo Local (`2024: $7.000 M`, `2025: $10.000 M`, `2026: $13.000 M`, `2027: $16.000 M`; inversión directa PPI `$39.000.000.000` COP).
   - Incorporar el árbol oficial de **42 Impulsores de Avance y Programas principales del PDD 2024–2027** (con énfasis completo en la **Línea Estratégica 1: «Seguridad Humana» — `$5.666.917.744.338` COP** y sus 5 Impulsores: `1.1 Seguridad Ciudadana y Orden Público - Titán 24 ($211.387,6 M)`, `1.2 Construcción de Paz, DDHH y Convivencia ($54.744,8 M)`, `1.3 Salud Pública y Aseguramiento ($5.213.654,3 M)`, `1.4 Atención Integral a Grupos de Especial Protección ($96.681,1 M)` y `1.5 Superación de la Pobreza Extrema y Soberanía Alimentaria ($82.066,0 M)`).
   - Incorporar la estadística real del **Cruce Tripartito (`PDD ↔ PA ↔ Presupuesto`)** en `bd_csh`: de las `99.424` filas de `PLAN_DESARROLLO`, `32.330` tienen avance propio en matriz PDD, `28.630` tienen avance físico en su fila hermana de `PLAN_ACCION` y `20.953` tienen soporte presupuestal en `INVERSION_PRESUPUESTAL`.

2. **Actualizar `src/features/seguimiento/services/plan-accion-dnp-api.ts`:**
   - Soportar el nuevo endpoint `/api/v1/compromisos/triada/pdd-dea/explorador-programas-y-seguridad-humana` y los nuevos campos de imputación tripartita, DEA multi-nivel (Entidades, Líneas Estratégicas y Localidades PDL) y Malmquist LP (`EFFCH × TECHCH`), con fallback tipado resiliente.

3. **Evolucionar `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` con 6 sub-pestañas interactivas:**
   - `pdd-tab-ppi`: **Catálogo & Conciliación PPI (5 PDD + 3 PDL)** con serie `2014–2027` corriente/constante 2025 y comparativa de los 3 Fondos de Desarrollo Local (`$304,98 mil millones COP` sumados entre Localidad 1, 2 y 3).
   - `pdd-tab-explorador`: **Explorador de Líneas, Impulsores y Programas Oficiales** con buscador instantáneo y filtro por Plan (`2012–2027` + `3 PDL`), mostrando techos anuales y metas oficiales de bienestar/producto.
   - `pdd-tab-cumplimiento`: **Cumplimiento de Metas & Imputación Tripartita (`PDD ↔ PA ↔ BPIM`)**, permitiendo alternar entre *Avance Directo en Sábana PDD* y *Avance Consolidado Tripartito* (`+28.630` filas con avance en PA y `+20.953` con soporte presupuestal), asegurando que nunca se muestren etiquetas numéricas basura en Líneas Estratégicas.
   - `pdd-tab-seguridad-humana`: **Monitor Línea 1: Seguridad Humana (`$5,67B COP`)**, cruzando los 5 Impulsores de Avance y sus programas (como *Titán 24*, *Construcción de Paz*, *Salud Pública*, *Grupos de Especial Protección*, *Soberanía Alimentaria*) con las **8 Dimensiones PNUD**, las **33 Mesas Territoriales**, los **10 Compromisos PAS** y las **12.280 filas de hurtos**.
   - `pdd-tab-frontera`: **Frontera DEA Multi-Nivel (Entidades, Líneas Estratégicas y Localidades PDL)** con selector de nivel (`ENTIDADES`, `LINEAS_ESTRATEGICAS`, `LOCALIDADES_PDL`), mostrando $\theta_{\text{BCC}}$, $\theta_{\text{CCR}}$, $\rho_{\text{SBM}}$, IC 95% Bootstrap (`B=200`), *peers* y *targets*.
   - `pdd-tab-econometria`: **Econometría Comparada & Malmquist LP (`EFFCH × TECHCH`)** con descomposición exacta de cambio de eficiencia y cambio tecnológico entre gobiernos, Gini/HHI, Spearman/Pearson FDR y prueba pareada de Wilcoxon.

4. **Ampliar `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`:**
   - Al menos **28 pruebas unitarias** cubriendo las 6 sub-pestañas, los 3 PDL, el PPI de 2013–2015, la conmutación de Imputación Tripartita, el Monitor de Línea 1 Seguridad Humana y el selector DEA Multi-Nivel.

## Archivos Autorizados para Modificar
- `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`
- `src/features/seguimiento/services/plan-accion-dnp-api.ts`
- `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`
- `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`
- `bridge/02_resultado_agy2.md`
*(Prohibido tocar `backend/` o los archivos de `codex`).*

## Validaciones Obligatorias Antes de Commit
1. `node scripts/ui-policy.mjs` (`0` violaciones).
2. `./node_modules/.bin/tsc --noEmit` y `./node_modules/.bin/eslint` sobre los archivos tocados (`0` errores).
3. `bun test src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` y toda la carpeta `src/features/seguimiento/__tests__/` (`100%` en verde).
4. `./node_modules/.bin/next build` (`192/192` páginas compiladas) y reinicio de `polis-frontend.service`.
5. Commit local en `main` (sin `git push`) y reporte en `bridge/02_resultado_agy2.md`.
