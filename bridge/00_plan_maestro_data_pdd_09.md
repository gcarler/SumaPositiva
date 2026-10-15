# Orden Maestra de Ejecución Integral — `[TRIADA-DATA-PLANES-DESARROLLO-09]`

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense EAF:** `agy`
- **Agentes ejecutores:**
  - `codex` (Backend, Migración `0065`, Extracción Estructurada de los 8 Documentos Markdown de PDD/PDL, Reconciliación Semántica de las `99.424` filas, Cruce Tripartito `PDD ↔ PA ↔ Presupuesto`, Monitor Línea 1 «Seguridad Humana» y DEA Multi-Nivel + Malmquist LP Exacto).
  - `agy2` (Frontend: Evolución de la Sub-vista 6 `pdd-dea-evaluacion-panel.tsx` y `pdd-dea-cartagena.data.ts` hacia el **Centro de Mando Integral de la Data de los Planes de Desarrollo de Cartagena `2012–2027` + `3 PDL`**).

---

## 1. Hallazgos Forenses Exactos Descubiertos en el Corpus (`/root/polis/data/planes_desarrollo/` y `bd_csh`)

1. **Plan Plurianual de Inversiones (PPI) Oficial Extraído de las Fuentes Primarias:**
   - **PDD 2024–2027 («Cartagena, Ciudad de Derechos» — Acuerdo 139 de 2024):**
     - **Total General Cuatrienio:** **`$12.800.853.474.855` COP** (`2024: $3.270.509.322.394`, `2025: $2.953.975.540.173`, `2026: $3.194.140.433.906`, `2027: $3.382.228.178.382`).
     - **6 Líneas Estratégicas / Capítulos (Sin SGR: `$12.572.994.085.883` + Con SGR: `$218.690.297.000` + Art. 40 Ed. Superior: `$9.169.091.971`):**
       1. `1. SEGURIDAD HUMANA`: Sin SGR `$5.658.533.744.338` + SGR `$8.384.000.000` = **`$5.666.917.744.338` COP** (`44,27%` del PDD), con **5 Impulsores de Avance**:
          - `1.1 Seguridad Ciudadana y Orden Público`: `$211.387.596.585` (`5` programas, incluido `1.1.1 Plan Estratégico de Seguridad Integral Titán 24` con `$35.547.291.975`).
          - `1.2 Construcción de Paz, Derechos Humanos y Convivencia`: `$54.744.805.590`.
          - `1.3 Salud Pública y Aseguramiento`: `$5.213.654.256.557`.
          - `1.4 Atención Integral a Grupos de Especial Protección`: `$96.681.079.891`.
          - `1.5 Superación de la Pobreza Extrema y Soberanía Alimentaria`: `$82.066.005.715` (`11` programas).
       2. `2. VIDA DIGNA`: Sin SGR `$5.140.489.012.112` + SGR `$89.546.961.000` + Art. 40 `$9.169.091.971` = **`$5.239.205.065.083` COP** (`40,93%` del PDD), con **6 Impulsores de Avance** (`Educación`, `Acceso a Servicios Básicos`, `Vivienda Digna y Hábitat`, `Arte, Cultura y Patrimonio`, `Deporte y Recreación`, `Infancia, Adolescencia y Familia`).
       3. `3. DESARROLLO ECONÓMICO EQUITATIVO`: **`$160.681.628.121` COP** (`7` Impulsores de Avance).
       4. `4. CIUDAD CONECTADA Y SOSTENIBLE`: Sin SGR `$1.272.491.099.447` + SGR `$120.759.336.000` = **`$1.393.250.435.447` COP** (`8` Impulsores de Avance).
       5. `5. INNOVACIÓN PÚBLICA Y PARTICIPACIÓN CIUDADANA`: **`$318.697.457.903` COP** (`6` Impulsores de Avance).
       6. `6. CAPÍTULO DE LOS PUEBLOS Y COMUNIDADES ÉTNICAS`: **`$22.101.143.962` COP** (`2` Impulsores de Avance).
     - En total, el PPI 2024–2027 en `pdd_2024_2027_bases_tecnicas.md` contiene **`42` filas de Impulsores de Avance** y **`172` filas de Programas**, además de **`3.342` filas de tablas de indicadores de bienestar y producto** en `pdd_2024_2027_ponencia_2do_debate_pa013.md`.
   - **PDD 2020–2023 («Salvemos Juntos a Cartagena» — P.A. 016 de 2020):**
     - **Total General Cuatrienio:** **`$6.022.982,66 millones` COP constantes de diciembre de 2019** (`$6.022.982.660.000` COP: `2020: $1.437.205,7 M`, `2021: $1.473.130,5 M`, `2022: $1.528.216,6 M`, `2023: $1.584.429,7 M`), estructurado en **4 Pilares (`Cartagena Resiliente`, `Cartagena Incluyente`, `Cartagena Contingente`, `Cartagena Transparente`) + Eje Transversal**, **33 Líneas Estratégicas** y **172 Programas** (`2.025` filas de tablas en `pdd_2020_2023_salvemos_juntos_cartagena.md`).
   - **PDD 2016–2019 («Primero la Gente para una Cartagena Sostenible y Competitiva» — Acuerdo 006 de 2016):**
     - Representado en `bd_csh` por **`3.013` filas** (`23` entidades, `806` metas únicas, `1.184` indicadores) y líneas estratégicas oficiales (`Por una Cartagena con Equidad en Salud`, `Cartagena Sin Miedos`, `Cartagena Ciudad para Invertir`, `Finanzas Sanas y Robustas`, `Educación para la Gente del Siglo XXI`, `Cartagena Territorio de Paz`, `Desarrollo Urbano para la Competitividad`).
   - **PDD 2013–2015 («Ahora Sí Cartagena» — Acuerdo 016 del 26 de diciembre de 2013):**
     - **Total General PPI (2014–2015):** **`$1.874.167.605` miles de COP = `$1.874.167.605.000` COP** (`2014: $919.970.330 miles`, `2015: $954.197.274 miles`), estructurado en **4 Objetivos Estratégicos (`Inclusión Social`, `Desarrollo Económico`, `Desarrollo Territorial`, `Gobernabilidad`)**, con **`1.245` filas de tablas** de metas de resultado y producto en `pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md`.
   - **PDD 2012–2015 («Campo para Todos» — Acuerdo 001/012 de 2012):**
     - Documentado en `pdd_2012_2015_campo_para_todos_cdim.md` (`116` págs.) y `pdd_2012_2015_acuerdo_001_campo_para_todos.pdf` (`161` págs.).
   - **Los 3 Planes de Desarrollo Local (`PDL 2024–2027` — Acuerdos Locales 004 de 2024):**
     1. **Localidad 1 — Histórica y del Caribe Norte (`pdl_2024_2027_localidad_1_historica.md`):** Acuerdo Local 004 del 31-oct-2024 («Localidad con Derechos»), Fondo de Desarrollo Local **`$97.691.041.529` COP** (`2024: $22.390.236.924`, `2025: $23.851.707.764`, `2026: $25.125.173.348`, `2027: $26.323.923.493`), `5` Líneas Estratégicas y `15` componentes (`326` filas de tablas).
     2. **Localidad 2 — De la Virgen y Turística (`pdl_2024_2027_localidad_2_virgen_turistica.md`):** Acuerdo Local 004 del 13-sep-2024 («Localidad de Derechos, Deberes y Cuidados»), Fondo de Desarrollo Local **`$161.289.996.409,01` COP** (`2024: $36.958.466.088,34`, `2025: $39.325.286.256,64`, `2026: $41.355.128.312,56`, `2027: $43.651.115.751,48`), `189` filas de tablas.
     3. **Localidad 3 — Industrial y de la Bahía (`pdl_2024_2027_localidad_3_industrial_bahia.md`):** Acuerdo Local 004 de 2024 («Por una Localidad Industrial y de la Bahía con Derechos»), Fondo de Desarrollo Local **`$46.000.000.000` COP** (`2024: $7.000 M`, `2025: $10.000 M`, `2026: $13.000 M`, `2027: $16.000 M`; inversión directa PPI `$39.000.000.000` COP), `408` filas de tablas.

2. **Descubrimiento Clave del Cruce Tripartito en `bd_csh` (`PLAN_DESARROLLO` $\leftrightarrow$ `PLAN_ACCION` $\leftrightarrow$ `INVERSION_PRESUPUESTAL`):**
   - De las `99.424` filas de `PLAN_DESARROLLO`, **`32.330` filas tienen avance propio** en la matriz PDD, pero **`28.630` filas tienen avance físico en su fila hermana de `PLAN_ACCION`** y **`20.953` filas tienen apropiación definitiva positiva en su fila hermana de `INVERSION_PRESUPUESTAL`** (compartiendo `entidad_normalizada`, `vigencia` y `codigo_bpim | codigo_meta_pdd`).
   - Además, **`72.701` filas de `PLAN_DESARROLLO`** tienen `linea_estrategica` vacía en la columna principal, pero en su JSONB `datos_origen` contienen llaves explícitas como `"PROGRAMA"`, `"PILAR"`, `"LINEA ESTRATEGICA"` o `"OBJETIVO"`, o pertenecen a una hoja (`hoja_origen`) que nombra el Pilar (`INCLUYENTE`, `RESILIENTE`, `CONTINGENTE`, `TRANSPARENTE`).

---

## 2. Asignación de Trabajo por Agente

### A. `codex` — `[TRIADA-BACKEND-DATA-PDD-09]`
1. **Migración Alembic `0065_catalogo_planes_desarrollo` y poblado canónico en `bd_csh`:**
   - Crear la migración `backend/alembic/versions/0065_catalogo_planes_desarrollo.py` (head anterior: `0064_drive_seguridad_humana`) con 3 tablas nuevas en el esquema `seguimiento`:
     1. `seguimiento.planes_desarrollo_distrital` (los 5 PDD `2012–2027` + los 3 PDL `2024–2027`, con su PPI oficial anual y total corriente y constante 2025, incluyendo el PPI de `$1.874.167.605.000` COP de `PDD_2013_2015` y los 3 Fondos de Desarrollo Local: `$97.691.041.529`, `$161.289.996.409,01` y `$46.000.000.000`).
     2. `seguimiento.pdd_lineas_y_programas` (jerarquía extraída automáticamente de los Markdown en `/root/polis/data/planes_desarrollo/*.md`: las Líneas Estratégicas, los `42` Impulsores de Avance y los `172` Programas de `2024–2027`, los Pilares/Líneas/Programas de `2020–2023`, los Objetivos/Programas de `2013–2015`, las Líneas de `2016–2019` y las Líneas de los 3 PDL).
     3. `seguimiento.pdd_metas_oficiales` (metas de resultado/bienestar y de producto extraídas de las tablas de `pdd_2024_2027_ponencia_2do_debate_pa013.md`, `pdd_2024_2027_bases_tecnicas.md`, `pdd_2020_2023_salvemos_juntos_cartagena.md`, `pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md` y los 3 PDL).
   - Aplicar `alembic upgrade head` tanto en `bd_csh` como en `polis_test`.
2. **Saneamiento y Reconciliación de las `99.424` filas de `PLAN_DESARROLLO` + Cruce Tripartito (`PDD ↔ PA ↔ Presupuesto`):**
   - En `backend/app/modules/compromisos/pdd_dea_service.py` (y script reproducible `backend/scripts/sincronizar_catalogo_pdd.py`):
     - Normalizar las etiquetas de `linea_estrategica` a las Líneas Estratégicas canónicas de cada plan (eliminando valores numéricos ruidosos como `'0.5522'` o `'0.82'` y rescatando `"PROGRAMA"`, `"PILAR"`, `"LINEA ESTRATEGICA"` y `hoja_origen` desde `datos_origen` cuando `linea_estrategica` esté vacía).
     - Implementar la **Imputación Tripartita Verificada (`PDD ↔ PA ↔ INVERSION`)** por `(entidad_normalizada, vigencia, codigo_bpim | codigo_meta_pdd)`, reportando en `cumplimiento-metas` tanto el avance directo en matriz PDD como el **avance consolidado tripartito** (`avance_consolidado_tripartito_pct`, `metas_con_avance_en_pa`, `metas_con_soporte_presupuestal`, reduciendo las metas huérfanas y mostrando el desglose por origen).
3. **Motor Línea 1 «Seguridad Humana» (`PDD 2024–2027`) + DEA Multi-Nivel (Entidades, Líneas Estratégicas y Localidades PDL) + Malmquist LP Exacto:**
   - Ampliar `pdd_dea_service.py` y `router.py` (manteniendo compatibilidad total con los 5 endpoints actuales `/api/v1/compromisos/triada/pdd-dea/*` y añadiendo `/api/v1/compromisos/triada/pdd-dea/explorador-programas-y-seguridad-humana`):
     - **DEA Multi-Nivel:**
       1. `frontera_por_entidad` (con bootstrap de `B=200` réplicas rápidas e IC 95%).
       2. `frontera_por_linea_estrategica` (eficiencia relativa de las Líneas Estratégicas e Impulsores de Avance al transformar su PPI en avance físico).
       3. `frontera_pdl_localidades` (comparativa DEA y financiera de los 3 Planes de Desarrollo Local `2024–2027`: `Localidad 1 Histórica $97,69 mil M`, `Localidad 2 Virgen y Turística $161,29 mil M`, `Localidad 3 Industrial y de la Bahía $46,00 mil M`).
     - **Malmquist LP Inter-Planes (`EFFCH × TECHCH`):** calcular distancias direccionales CRS mediante programación lineal HiGHS entre `PDD_2016_2019 -> PDD_2020_2023` y `PDD_2020_2023 -> PDD_2024_2027` sobre las entidades comunes, descomponiendo `mpi_global = effch_global * techch_global`.
     - **Trazabilidad Especial Línea 1 «Seguridad Humana» (`$5,667 billones COP`):** desglose de sus 5 Impulsores de Avance y 26 Programas cruzados con las **8 Dimensiones PNUD**, las **33 Mesas Territoriales**, los **10 Compromisos PAS** y las **12.280 filas de hurtos**.

### B. `agy2` — `[TRIADA-FRONTEND-DATA-PDD-09]`
1. **Evolucionar `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`, `src/features/seguimiento/services/plan-accion-dnp-api.ts` y `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`:**
   - Incorporar el **PPI recién descubierto de `PDD_2013_2015` (`$1.874.167.605.000` COP)** y los **3 Fondos de Desarrollo Local (`PDL 2024–2027`: Localidad 1 `$97.691.041.529`, Localidad 2 `$161.289.996.409`, Localidad 3 `$46.000.000.000`)**.
   - Añadir en `pdd-dea-evaluacion-panel.tsx` (Sub-vista 6 `Evaluación PDD & DEA 2012-2027`) **6 sub-pestañas interactivas completas**:
     1. **`Catálogo & Conciliación PPI (5 PDD + 3 PDL)`:** Tabla maestra de los 5 Planes Distritales + 3 Planes Locales, curva S anual `2014–2027` en pesos corrientes y constantes 2025, y conciliación de sobre-agregación (`bd_csh` vs. Acuerdo Oficial).
     2. **`Explorador de Líneas, Impulsores y Programas Oficiales`:** Buscador y árbol interactivo de los **42 Impulsores de Avance y 172 Programas del PDD 2024–2027**, los **4 Pilares y 33 Líneas de 2020–2023** y los **4 Objetivos de 2013–2015**, con sus metas oficiales de bienestar/producto.
     3. **`Cumplimiento & Imputación Tripartita (PDD ↔ PA ↔ BPIM)`:** Comparativa visual entre el avance reportado en la sábana PDD y el **avance consolidado tripartito** (rescatando las `28.630` filas con avance en Plan de Acción y las `20.953` con soporte presupuestal), más semáforo por Línea Estratégica canónica limpia (sin etiquetas decimales basura).
     4. **`Monitor Línea 1: Seguridad Humana ($5,67B COP)`:** Tablero dedicado a los **5 Impulsores de Avance de la Línea 1 del Acuerdo 139 de 2024** (`Seguridad Ciudadana y Orden Público - Titán 24`, `Construcción de Paz y DDHH`, `Salud Pública`, `Grupos de Especial Protección`, `Superación de Pobreza Extrema y Soberanía Alimentaria`) cruzados con las **8 Dimensiones PNUD**, las **33 Mesas** y los **10 Compromisos PAS**.
     5. **`Frontera DEA Multi-Nivel (Entidades, Líneas y Localidades PDL)`:** Selector de nivel DEA (`Por Entidad DMU`, `Por Línea Estratégica / Impulsor`, `Por Localidad PDL 1, 2 y 3`), mostrando $\theta_{\text{BCC}}$, $\theta_{\text{CCR}}$, $\rho_{\text{SBM}}$, IC 95% Bootstrap, *peers* y *targets*.
     6. **`Econometría Comparada & Malmquist LP (EFFCH × TECHCH)`:** Descomposición exacta `MPI = EFFCH × TECHCH` entre gobiernos, curva de Lorenz / Gini / HHI, elasticidad Spearman/Pearson con FDR Benjamini-Hochberg y contraste pareado de Wilcoxon.
2. **Suite de Pruebas y Compilación:**
   - Ampliar `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` (mínimo `28` tests unitarios verificando las 6 sub-pestañas, los 3 PDL, el monitor de Línea 1 Seguridad Humana y la imputación tripartita).
   - Pasar `node scripts/ui-policy.mjs`, `tsc --noEmit`, `eslint`, `bun test` y `next build`, reiniciar `polis-frontend.service` y hacer commit local en `main`.
