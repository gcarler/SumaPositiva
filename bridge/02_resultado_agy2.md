# INFORME DE RESULTADO: TAREA [TRIADA-FRONTEND-DATA-PDD-09]
## CENTRO DE MANDO INTEGRAL DE PLANES DE DESARROLLO, CONCILIACIÓN PPI, IMPUTACIÓN TRIPARTITA Y DEA MULTI-NIVEL (CARTAGENA 2012–2027 + 3 PDL)

- **Para:** Coordinador General y Auditor Forense EAF (`agy`)
- **De:** Desarrollador Principal Frontend (`agy2`)
- **Fecha:** 15 de octubre de 2026
- **Tarea Reportada:** `[TRIADA-FRONTEND-DATA-PDD-09]` — Evolución de la Sub-vista 6 en `/plataforma/seguimiento`: «Evaluación & DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)» hacia el Centro de Mando Integral con 6 sub-pestañas interactivas.
- **Referencia Normativa y Metodológica:** `bridge/00_plan_maestro_data_pdd_09.md` y `bridge/01_tarea_activa.md`
- **Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`, prohibido `git push`)
- **Concurrencia y Aislamiento:** Cero colisiones con `codex` (no se alteró ni preparó ningún archivo de `backend/`, `docs/permisos-api.md`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`).

---

## 🎯 1. Resumen Ejecutivo de la Entrega

Se culminó exitosamente la transformación del Laboratorio de Evaluación en el **Centro de Mando Integral de la Data de los Planes de Desarrollo de Cartagena (2012–2027 + 3 PDL)**, incorporando la conciliación de fuentes primarias Markdown, la imputación tripartita verificada y la formulación DEA multi-nivel con HiGHS:

### 1.1. Sub-vista 1 (`catalogo_y_ppi`): Catálogo (5 PDD + 3 PDL) & Conciliación Oficial PPI
1. **Catálogo Canónico de 5 PDDs + 3 PDLs:**
   - **PDD 2024–2027 («Cartagena, Ciudad de Derechos» — Acuerdo Distrital 139 de 2024):** PPI Oficial **`$12.800.853.474.855` COP** ($12,801B corrientes), 29 entidades, 3.170 metas únicas, 1.753 indicadores, 71.990 filas en `bd_csh`.
   - **PDD 2020–2023 («Salvemos Juntos a Cartagena» — P.A. 016 de 2020):** PPI Oficial **`$6.022.982.660.000` COP** constantes 2019, 4 Pilares + Eje Transversal, 33 Líneas y 172 Programas.
   - **PDD 2016–2019 («Primero la Gente» — Acuerdo 006 de 2016):** 3.013 filas en `bd_csh`, 23 entidades, 806 metas únicas, 1.184 indicadores.
   - **PDD 2013–2015 («Ahora Sí Cartagena» — Acuerdo 016 de 2013):** **PPI Oficial recién extraído = `$1.874.167.605.000` COP** ($1.874,17 M COP; 2014: $919.970,3M, 2015: $954.197,3M), estructurado en 4 Objetivos Estratégicos con 1.245 filas de tablas.
   - **PDD 2012–2015 («En Cartagena Hay Campo para Todos» — Acuerdo 001/012 de 2012):** Línea base documental (116 págs.).
   - **3 Planes de Desarrollo Local (PDL 2024–2027 — Acuerdos Locales 004 de 2024):**
     * **Localidad 1 (Histórica y del Caribe Norte — «Localidad con Derechos»):** Fondo de Desarrollo Local **`$97.691.041.529` COP** (2024: $22.390M, 2025: $23.851M, 2026: $25.125M, 2027: $26.323M), 5 Líneas y 15 componentes.
     * **Localidad 2 (De la Virgen y Turística — «Localidad de Derechos, Deberes y Cuidados»):** Fondo de Desarrollo Local **`$161.289.996.409,01` COP** (2024: $36.958M, 2025: $39.325M, 2026: $41.355M, 2027: $43.651M).
     * **Localidad 3 (Industrial y de la Bahía — «Por una Localidad Industrial con Derechos»):** Fondo de Desarrollo Local **`$46.000.000.000` COP** (2024: $7.000M, 2025: $10.000M, 2026: $13.000M, 2027: $16.000M; inversión directa PPI $39.000.000.000 COP).
     * **Total Fondos de Desarrollo Local = `$304.981.037.938` COP** (~$304,98 mil millones COP).
2. **Tabla Anualizada del PPI (2014–2027) en Pesos Corrientes y Constantes Base Cerrada 2025:**
   - Desglose por fuentes de financiación: Recursos Ordinarios vs. Regalías SGR Directas y Regalías SGR Educación Superior.
3. **Conciliación PPI vs. bd_csh:**
   - Factor de calibración por sobrerreporte: **0.82x** para 2024–2027 y **0.80x** para 2020–2023.

### 1.2. Sub-vista 2 (`explorador_programas`): Explorador de Líneas, Impulsores y Programas Oficiales
1. **Árbol Programático Completo:**
   - Navegación de los **42 Impulsores de Avance y 172 Programas del PDD 2024–2027**, los **4 Pilares y 33 Líneas de 2020–2023**, los **4 Objetivos de 2013–2015** y los componentes de los 3 PDL.
2. **Buscador Instantáneo y Filtros:**
   - Filtro por Plan / Ámbito (`TODOS`, `PDD_2024_2027`, `PDD_2020_2023`, `PDD_2013_2015`, `PDL_2024_2027`) y búsqueda por texto libre con detección de entidades líderes, códigos de impulsor/programa (ej. `1.1.1 Titán 24`, `1.3 Salud Pública`), techos presupuestales y conteos de metas de bienestar/producto.

### 1.3. Sub-vista 3 (`cumplimiento_metas`): Cumplimiento de Metas & Imputación Tripartita (PDD ↔ PA ↔ BPIM)
1. **Conmutador de Imputación Tripartita:**
   - Alternancia interactiva entre:
     * **Avance Directo en Sábana PDD:** Reporta 32.330 filas con avance propio, 67.98% de avance físico promedio y 328 metas huérfanas (10.35%).
     * **Avance Consolidado Tripartito:** Rescata **28.630 filas con avance en Plan de Acción** y **20.953 filas con soporte en Inversión Presupuestal**, reduciendo las metas huérfanas de 328 a **102 remanentes** (226 resueltas) y elevando el avance físico ponderado al **78.42%**.
2. **Saneamiento de Líneas Estratégicas:**
   - **72.701 filas** con línea vacía o ruido numérico en la columna principal fueron saneadas mediante la extracción de `"PROGRAMA"`, `"PILAR"` y `hoja_origen` de sus datos de origen.
3. **Seguimiento a los 19 Macroproyectos de Ciudad:**
   - Malecón del Mar, Drenajes Pluviales, Ciénaga de la Virgen, Terminación Vía Perimetral, Nueva Cárcel Distrital, etc.

### 1.4. Sub-vista 4 (`monitor_seguridad_humana`): Monitor Línea 1 «Seguridad Humana» ($5,67B COP)
1. **Techo y Participación Presupuestal:**
   - Línea 1 asigna **`$5.666.917.744.338` COP**, equivalente al **`44,27%` del PDD cuatrienal** ($12,801B), desglosado en $5.658,53 M COP ordinarios y $8.384 M SGR directas.
2. **Los 5 Impulsores de Avance de la Línea 1:**
   - `1.1 Seguridad Ciudadana y Orden Público`: `$211.387,6 M COP` (con **Plan Estratégico Titán 24: `$35.547,3 M COP`**, 5 programas). Entidad: Secretaría del Interior / Distriseguridad.
   - `1.2 Construcción de Paz, DDHH y Convivencia`: `$54.744,8 M COP`. Entidad: Secretaría del Interior / Personería.
   - `1.3 Salud Pública y Aseguramiento`: `$5.213.654,3 M COP` (92% de la Línea 1). Entidad: DADIS.
   - `1.4 Atención Integral a Grupos de Especial Protección`: `$96.681,1 M COP`. Entidad: Desarrollo Social / Mujer.
   - `1.5 Superación de la Pobreza Extrema y Soberanía Alimentaria`: `$82.066,0 M COP` (PES-PR, 11 programas).
3. **Cruces Multidimensionales Auditados:**
   - **8 Dimensiones PNUD de la Seguridad Humana:** Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria, Política y Digital con su presupuesto y metas asociadas.
   - **33 Mesas Territoriales de Seguridad Ciudadana:** 142 demandas comunitarias priorizadas y 89 compromisos activos en las 3 Localidades.
   - **10 Compromisos PAS (Plan de Acción de Seguridad 2024–2027):** 80% articulados directamente con el despliegue de Titán 24.
   - **12.280 Registros de Delincuencia & Hurtos Georreferenciados:** Focalización de patrullajes en 48 zonas críticas de alta incidencia.

### 1.5. Sub-vista 5 (`frontera_dea_pdd`): Frontera DEA Multi-Nivel con HiGHS Solver
1. **Selector de Nivel DEA:**
   - **Nivel 1 (`ENTIDADES`):** 28 Entidades DMU ($n=28 \ge 9$, satisfaciendo con holgura la Regla de Cooper $n \ge \max(m \times s, 3(m+s)) = 9$). Eficiencia media BCC $\theta = 88.5\%$, CCR $\theta = 82.4\%$.
   - **Nivel 2 (`LINEAS_ESTRATEGICAS`):** 6 DMUs correspondientes a las Líneas Estratégicas del Acuerdo 139.
   - **Nivel 3 (`LOCALIDADES_PDL`):** 3 DMUs correspondientes a los Fondos de Desarrollo Local (Localidad 1, 2 y 3) con presupuestos FDL.
2. **Puntajes y Formulación:**
   - Insumo $X_1$ (PPI constante 2025), Output $Y_1$ (Metas cumplidas equivalentes), Output $Y_2$ (Indicadores eficaces $\ge 75\%$), $\theta_{\text{CCR}}$, $\theta_{\text{BCC}}$, $SE$, Retornos de Escala (`CRS/IRS/DRS`), $\theta_{\text{SBM}}$ (Tone) e intervalos Bootstrap al 95% ($B=200$).
3. **Modal de Holguras y Metas Proyectadas (`Slacks & Targets`):**
   - Modal interactivo con `bg-overlay` que prescribe holguras ($s_1^-, s_1^+, s_2^+$) y targets de eficiencia, mostrando los pares referentes ($\lambda_j^*$).

### 1.6. Sub-vista 6 (`econometria_comparada_pdd`): Econometría Comparada & Malmquist LP
1. **Índice Dinámico de Malmquist Inter-Planes:**
   - Descomposición exacta $\text{MPI} = \text{EFFCH} \times \text{TECHCH}$: transición sexenal 2016–2027 con **`MPI = 1.050`**, **`EFFCH = 1.028`** (catch-up) y **`TECHCH = 1.021`** (desplazamiento de frontera), con 23 entidades en avance neto.
2. **Control FDR Benjamini–Hochberg:**
   - Matriz de correlaciones Spearman y Pearson con control estricto de tasa de falso descubrimiento garantizando $q \ge p$.
3. **Desigualdad Presupuestal:**
   - Coeficientes de Gini (**0.512**) y HHI (**1810**) para las Líneas del PDD 2024–2027.
4. **Prueba Pareada No Paramétrica de Wilcoxon:**
   - $W = 42.0, Z = -2.89, p = 0.0038 < 0.01$, diferencia mediana = 7.4%, $N=26$ entidades comunes, confirmando significancia estadística al 99%.

---

## 🧪 2. Resultados de los Quality Gates Obligatorios

| Control de Calidad | Comando Ejecutado | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Política de UI** | `node scripts/ui-policy.mjs` | **SUPERADO** | `0` violaciones de política institucional; controles accesibles, modal con `bg-overlay` y tokens de tema. |
| **Verificación de Tipos** | `./node_modules/.bin/tsc --noEmit` | **SUPERADO** | `0` errores de compilación TypeScript. |
| **Linter Oficial** | `./node_modules/.bin/eslint <archivos>` | **SUPERADO** | `0` errores y `0` advertencias de ESLint en los archivos tocados. |
| **Suite Unitaria PDD-DEA** | `bun test .../pdd-dea-evaluacion-panel.test.tsx` | **SUPERADO** | **`32/32` pruebas pasadas** (0 fallas, 548 aserciones en 402ms). |
| **Suite Completa Seguimiento** | `bun test src/features/seguimiento/__tests__/` | **SUPERADO** | **`80/80` pruebas pasadas** (0 fallas, 1.373 aserciones en 426ms). |
| **Compilación Next.js** | `./node_modules/.bin/next build` | **SUPERADO** | Compilación Turbopack exitosa; **`192/192` páginas estáticas SSG/ISR** generadas sin errores. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **ACTIVO** | Proceso activo y respondiendo HTTP 200 OK en `http://127.0.0.1:3000/plataforma/seguimiento`. |

---

## 📂 3. Archivos Modificados y Entregados en Frontend (`agy2`)

1. `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`:
   - Incorporación del PPI oficial de `PDD_2013_2015` («Ahora Sí Cartagena») = `$1.874.167.605.000` COP.
   - Incorporación de los 3 Planes de Desarrollo Local (PDL 2024–2027) sumando `$304.981.037.938` COP en Fondos de Desarrollo Local.
   - Incorporación de la Línea 1 «Seguridad Humana» ($5.666.917.744.338 COP, 44.27% del PDD) y sus 5 Impulsores (Titán 24 $35.547,3M).
   - Incorporación de las estadísticas del cruce tripartito (99.424 filas PDD, 32.330 con avance, 28.630 en PA, 20.953 en BPIM, 72.701 saneadas).
   - Incorporación de DMUs DEA Multi-Nivel (Entidades $n=28$, Líneas $n=6$, Localidades PDL $n=3$).
   - Incorporación de tipos y getters locales resilientes (`obtenerExploradorProgramasYSeguridadHumanaLocal`).
2. `src/features/seguimiento/services/plan-accion-dnp-api.ts`:
   - Re-exportación de todos los tipos y constantes nuevas de PDD-09.
   - Suministro de cliente API tipado `obtenerExploradorProgramasYSeguridadHumanaApi()`.
   - Soporte de parámetros de imputación tripartita en `obtenerCumplimientoMetasPddApi` y nivel DEA en `obtenerFronteraDeaPddApi`.
3. `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`:
   - Evolución hacia el Centro de Mando Integral con **6 sub-pestañas**:
     * `pdd-tab-ppi`: Catálogo (5 PDD + 3 PDL) & Conciliación PPI
     * `pdd-tab-explorador`: Explorador de Líneas, Impulsores y Programas Oficiales
     * `pdd-tab-cumplimiento`: Cumplimiento de Metas & Imputación Tripartita (PDD ↔ PA ↔ BPIM)
     * `pdd-tab-seguridad-humana`: Monitor Línea 1: Seguridad Humana ($5,67B COP)
     * `pdd-tab-frontera`: Frontera DEA Multi-Nivel (Entidades, Líneas & PDL)
     * `pdd-tab-econometria`: Econometría Comparada & Malmquist LP
   - Modal interactivo de Slacks & Targets con `bg-overlay`.
4. `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`:
   - **32 pruebas unitarias y de integración exhaustivas** verificando las 6 sub-pestañas, los 3 PDL, el PPI 2013-2015, el árbol programático, la imputación tripartita, el monitor de seguridad humana, la frontera DEA multi-nivel, la econometría de Malmquist LP y el renderizado SSR.
5. `bridge/02_resultado_agy2.md`:
   - Informe formal de cierre y entrega técnica auditada.

---

## 🔒 4. Política Zero-Push y Aislamiento de Codex

- **Backend intacto por `agy2`:** No se añadió, modificó ni preparó ningún archivo en `backend/` ni `docs/permisos-api.md`.
- **Cero `git push`:** Todos los cambios se mantienen estrictamente en el repositorio local en la rama `main`.
