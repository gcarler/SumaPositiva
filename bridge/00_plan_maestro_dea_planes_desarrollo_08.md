# PLAN MAESTRO `[TRIADA-DEA-PLANES-DESARROLLO-08]`
## EVALUACIÓN DE CUMPLIMIENTO DE METAS, CONCILIACIÓN DEL PLAN PLURIANUAL DE INVERSIONES (PPI) Y ANÁLISIS DEA / ECONOMÉTRICO DE LOS PLANES DE DESARROLLO DE CARTAGENA (2012–2027)

- **Coordinador General y Auditor Forense EAF:** `agy`
- **Desarrollador Principal Backend y Econometría (`=codex:0.0`):** `codex`
- **Desarrollador Principal Frontend (`=agy2:0.0`):** `agy2`
- **Fecha:** 15 de octubre de 2026
- **Fuentes Primarias:**
  1. Documentos normativos oficiales descargados y convertidos a Markdown en `/root/polis/data/planes_desarrollo/` (`11` PDFs / Markdowns de los 5 Planes de Desarrollo Distritales `2012–2027` y los 3 Planes de Desarrollo Local `2024–2027`).
  2. Base de datos canónica `bd_csh` (`seguimiento.registros_triada_normalizados`: `217.740` registros totales, de los cuales **`99.424` registros** corresponden directamente a `motor_destino = 'PLAN_DESARROLLO'` entre `2017` y `2027`).

---

## 1. Marco Histórico y Normativo de los 5 Planes de Desarrollo + 3 Planes Locales

| Código Plan | Periodo | Nombre Oficial del Plan de Desarrollo | Norma de Adopción | Archivos Fuente en `/root/polis/data/planes_desarrollo/` | Registros en `bd_csh` (`PLAN_DESARROLLO`) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`PDD_2012_2015`** | `2012–2015` | *«En Cartagena Hay Campo para Todos»* | Acuerdo Distrital 001 / 012 de 2012 | `pdd_2012_2015_campo_para_todos_cdim.md` (`116` págs.), `pdd_2012_2015_acuerdo_001_campo_para_todos.pdf` | Línea base histórica documental |
| **`PDD_2013_2015`** | `2013–2015` | *«Ahora Sí Cartagena»* | Acuerdo Distrital 016 del 26 de dic. de 2013 | `pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf` (`199` págs.) | Línea base histórica documental |
| **`PDD_2016_2019`** | `2016–2019` | *«Primero la Gente para una Cartagena Sostenible y Competitiva»* | Acuerdo Distrital 006 del 13 de junio de 2016 | `pdd_2016_2019_acuerdo_006_primero_la_gente.pdf` (`363` págs.) | **`3.013` filas** (`23` entidades, `806` metas PDD, `1.184` indicadores) |
| **`PDD_2020_2023`** | `2020–2023` | *«Salvemos Juntos a Cartagena, Por una Cartagena Libre y Resiliente»* | P.A. 016 / Acuerdo Distrital de mayo de 2020 | `pdd_2020_2023_salvemos_juntos_cartagena.md` (`370` págs.) | **`24.421` filas** (`27` entidades, `1.832` metas PDD, `1.137` indicadores, `460` BPIM) |
| **`PDD_2024_2027`** | `2024–2027` | *«Cartagena, Ciudad de Derechos»* | Acuerdo Distrital 139 del 29 de mayo de 2024 | `pdd_2024_2027_bases_tecnicas.md` (`491` págs.), `pdd_2024_2027_ponencia_2do_debate_pa013.md` (`549` págs.), `pdd_2024_2027_acuerdo_139_oficial.pdf` | **`71.990` filas** (`29` entidades, `3.170` metas PDD, `1.753` indicadores, `641` BPIM) |
| **`PDL_2024_2027`** | `2024–2027` | *Planes de Desarrollo Local (Localidades 1, 2 y 3)* | Acuerdos Locales 2024 | `pdl_2024_2027_localidad_1_historica.md`, `pdl_2024_2027_localidad_2_virgen_turistica.md`, `pdl_2024_2027_localidad_3_industrial_bahia.md` | Integrados en las `3` Alcaldías Locales |

---

## 2. Arquitectura Analítica y Econométrica (Fases 0 a 4)

### Fase 0: Extracción del Plan Plurianual de Inversiones (PPI), Estandarización y Deflactación (`2012–2027`)
1. **Tablas Oficiales del Plan Plurianual de Inversiones (PPI):**
   - **PDD 2024–2027 («Cartagena, Ciudad de Derechos» — Acuerdo 139/2024, cap. 11 de `pdd_2024_2027_bases_tecnicas.md`):**
     - **Total Cuatrienio PPI Oficial:** **`$12.800.853.474.855` COP** (`$12,80 Billones` corrientes):
       - **2024:** `$3.270.509.322.394` COP (`$3,217B` recursos distritales/ICLD/SGP + `$47,74 mil M` SGR Directas + `$5,81 mil M` SGR Educación Superior).
       - **2025:** `$2.953.975.540.173` COP (`$2,893B` sin SGR + `$60,92 mil M` SGR Directas).
       - **2026:** `$3.194.140.433.906` COP (`$3,122B` sin SGR + `$70,30 mil M` SGR Directas + `$1,74 mil M` SGR Ed. Sup.).
       - **2027:** `$3.382.228.178.382` COP (`$3,341B` sin SGR + `$39,73 mil M` SGR Directas + `$1,62 mil M` SGR Ed. Sup.).
     - Desglosado en **5 Líneas Estratégicas + Capítulo Étnico + 19 Macroproyectos**:
       1. `Línea 1: Seguridad Humana` (`Seguridad Ciudadana y Orden Público`, `Construcción de Paz, DD.HH. y Convivencia`, `Salud Pública y Aseguramiento`, `Grupos de Especial Protección`, `Superación de la Pobreza Extrema y Soberanía Alimentaria`).
       2. `Línea 2: Vida Digna` (`Educación`, `Servicios Básicos`, `Vivienda Digna y Hábitat`, `Arte, Cultura y Patrimonio`, `Deporte y Recreación`, `Infancia, Adolescencia y Familia`).
       3. `Línea 3: Desarrollo Económico Equitativo` (`Competitividad e Innovación`, `Diversificación Económica`, `Trabajo Decente`, `Economía Popular`, `Turismo Sostenible`, `Desarrollo Agropecuario`, `Abastecimiento`).
       4. `Línea 4: Ciudad Conectada y Sostenible` (`Ordenamiento y Espacio Público`, `Control Urbanístico`, `Cartagena Amigable con el Ambiente`, `Adaptación al Clima`, `Ciudad Histórica`, `Infraestructura y Movilidad`, `Ordenamiento Alrededor del Agua`, `Integración Regional`).
       5. `Línea 5: Innovación Pública y Participación Ciudadana` (`Transparencia y Gobierno Abierto`, `Fortalecimiento Institucional`, `Finanzas Públicas`, `Cultura Ciudadana`, `Participación y Acción Comunal`, `Sistema de Planeación Distrital`).
       6. `Capítulo 6: Pueblos y Comunidades Étnicas`.
   - **PDD 2020–2023 («Salvemos Juntos a Cartagena» — Título II, Art. 16 de `pdd_2020_2023_salvemos_juntos_cartagena.md`):**
     - **Total Cuatrienio PPI Oficial:** **`$6.022.982,6 millones` COP** (`$6,023 Billones` constantes de dic-2019), desglosado en **4 Pilares (`Cartagena Resiliente`, `Cartagena Incluyente`, `Cartagena Contingente`, `Cartagena Transparente`) + 1 Eje Transversal, 33 Líneas Estratégicas y 172 Programas**.
2. **Deflactación IPC DANE Base Cerrada 2025 = 100 (`2012–2025`):**
   - Serie IPC anual oficial DANE extendida desde `2012` hasta `2025` (`2012: 2,44%`, `2013: 1,94%`, `2014: 3,66%`, `2015: 6,77%`, `2016: 5,75%`, `2017: 4,09%`, `2018: 3,18%`, `2019: 3,80%`, `2020: 1,61%`, `2021: 5,62%`, `2022: 13,12%`, `2023: 9,28%`, `2024: 5,20%`, `2025: 5,10%`).
3. **Conciliación Presupuestal PPI vs. `bd_csh`:**
   - Comparar por vigencia (`2020..2025`) el techo oficial del Plan Plurianual de Inversiones (PPI) frente a la suma reconstruida en `bd_csh`, calculando el **Factor de Sobrerreporte / Subreporte Documental** y ofreciendo un selector de insumo DEA: **`X1_CONCILIADO_PPI` (calibrado al techo oficial del Acuerdo Distrital)** vs. **`X1_REPORTADO_MATRICES`**.

---

### Fase 1: Evaluación de Cumplimiento Normativo de Metas PDD (`Acuerdo` vs. `Ejecución Real`)
Sobre los `99.424` registros de `motor_destino = 'PLAN_DESARROLLO'` en `bd_csh` (consolidados por corte canónico por ítem y limpiando escalas ambiguas):
1. **Tablero de Cumplimiento por Plan de Desarrollo (`2016–2019`, `2020–2023`, `2024–2027`):**
   - Total de metas únicas (`codigo_meta_pdd` / `indicador`), metas con avance verificado, metas en ruta (`>= 75%`), metas en alerta media (`40%–74,9%`), metas en rezago crítico (`< 40%`) y metas huérfanas sin avance numérico.
2. **Desglose por Línea Estratégica / Pilar y Foco en «Seguridad Humana» (`Acuerdo 139 de 2024`):**
   - Evaluación detallada de las 5 Líneas Estratégicas de `2024–2027`, los 4 Pilares de `2020–2023` y los Ejes de `2016–2019`.
   - Auditoría de los **3 Planes de Desarrollo Local (`Localidad 1 Histórica`, `Localidad 2 Virgen y Turística`, `Localidad 3 Industrial y de la Bahía`)**.

---

### Fase 2: DEA de los Planes de Desarrollo (`CCR · BCC · SBM · Bootstrap · Malmquist Inter-Planes`)
Usando `scipy.optimize.linprog(method='highs')`, evaluamos la eficiencia técnica y de escala en **dos dominios complementarios**:

1. **Dominio A — DEA por Entidad Ejecutora del Plan de Desarrollo (Comparado por Cuatrienio PDD: `2016–2019`, `2020–2023`, `2024–2025`):**
   - **DMUs:** Las secretarías y entidades descentralizadas responsables de metas del Plan de Desarrollo ($n \ge 18$ por Plan, cumpliendo ampliamente la Regla de Cooper $n \ge 9$ para $m=1, s=2$).
   - **Input $X_1$:** Presupuesto del Plan de Desarrollo en Pesos Constantes 2025 (con soporte para `X1_CONCILIADO_PPI` calibrado al techo del Acuerdo y `X1_REPORTADO`).
   - **Output $Y_1$ (Metas PDD Equivalentes Cumplidas):** $\sum (\text{avance\_meta\_pdd}_{k} / 100)$ de las metas únicas a cargo de la entidad en el Plan.
   - **Output $Y_2$ (Indicadores PDD en Meta Eficaz $\ge 75\%$):** Volumen de indicadores únicos del Plan de Desarrollo donde la entidad alcanza cumplimiento eficaz ($\ge 75\%$).
   - **Salidas del Solver HiGHS:** $\theta_{\text{CCR}}$, $\theta_{\text{BCC}}$, Eficiencia de Escala ($SE$), Retornos a Escala (`CRS/IRS/DRS`), $\theta_{\text{SBM}}$, Bootstrap corregido con IC 95%, Pares referentes ($\lambda_j^*$) y **Holguras y Metas Objetivo (`Slacks & Targets`) de cuántas metas PDD adicionales debe cumplir la entidad**.
2. **Dominio B — DEA Programático por Línea Estratégica / Componente Impulsor del PDD:**
   - Evalúa la eficiencia relativa de conversión de recursos del PPI en metas PDD cumplidas entre las Líneas Estratégicas / Componentes Impulsores de los Planes de Desarrollo.
3. **Índice de Productividad de Malmquist Inter-Planes (`PDD 2016–2019` $\rightarrow$ `PDD 2020–2023` $\rightarrow$ `PDD 2024–2027`):**
   - Mide con media geométrica ($\text{MPI} = \text{EFFCH} \times \text{TECHCH}$) qué entidades mejoraron su capacidad estructural de cumplir metas del Plan de Desarrollo entre un gobierno y el siguiente.

---

### Fase 3: Econometría de Planes de Desarrollo (Correlaciones FDR, Gini/HHI del PPI y Cambio Estructural)
1. **Matriz de Correlaciones Spearman ($\rho$) y Pearson ($r$) con Ajuste FDR Benjamini–Hochberg ($q\text{-value}$):**
   - Evalúa la relación entre: Asignación PPI ($X_1$), Metas PDD Cumplidas ($Y_1$), Indicadores en Meta ($Y_2$), Articulación con Plan de Acción anual, Continuidad de Proyectos BPIM y Eficiencia DEA del PDD ($\theta_{\text{BCC}}$).
2. **Desigualdad y Priorización Presupuestal en los Planes de Desarrollo (Gini y HHI):**
   - Coeficiente de Gini e Índice Herfindahl-Hirschman (HHI) de la distribución del Plan Plurianual de Inversiones (PPI) entre Líneas Estratégicas y entre las 7 Dimensiones de Seguridad Humana a través de los Planes (`2012–2027`).
3. **Prueba Pareada de Wilcoxon / Friedman entre Planes de Desarrollo (`2016–2019` vs. `2020–2023` vs. `2024–2027`):**
   - Contrasta sobre las mismas entidades continuas si la eficiencia de ejecución de metas del Plan de Desarrollo cambió significativamente entre *Primero la Gente*, *Salvemos Juntos a Cartagena* y *Cartagena, Ciudad de Derechos*.

---

### Fase 4: Contrato API Backend (`/api/v1/compromisos/triada/pdd-dea/*`) y Sub-vista 6 Frontend

#### 4.1. Los 5 Endpoints Backend (`codex` en `backend/app/modules/compromisos/pdd_dea_service.py` y `router.py`)
1. `GET /api/v1/compromisos/triada/pdd-dea/catalogo-y-conciliacion-ppi`
   - Catálogo normativo de los 5 Planes de Desarrollo (`2012–2027`) y 3 Planes Locales, tablas oficiales del Plan Plurianual de Inversiones (PPI) en pesos corrientes y constantes Base 2025, y conciliación frente a `bd_csh`.
2. `GET /api/v1/compromisos/triada/pdd-dea/cumplimiento-metas?plan=PDD_2024_2027|PDD_2020_2023|PDD_2016_2019|TODOS`
   - Semáforo de cumplimiento físico de metas e indicadores por Plan de Desarrollo, Línea Estratégica / Pilar, Componente Impulsor (con foco en *Línea 1: Seguridad Humana*) y Entidad, incluyendo detección de metas huérfanas.
3. `GET /api/v1/compromisos/triada/pdd-dea/frontera-dea-pdd?plan=PDD_2024_2027|PDD_2020_2023|PDD_2016_2019&insumo=conciliado_ppi|reportado`
   - Frontera DEA (`CCR`, `BCC`, `SBM`, `Bootstrap`, `Slacks & Targets`, `Peers`) de las entidades ejecutoras del Plan de Desarrollo y de sus Líneas Estratégicas / Componentes.
4. `GET /api/v1/compromisos/triada/pdd-dea/econometria-comparada-pdd`
   - Índice de Malmquist Inter-Planes (`2016–2019` $\rightarrow$ `2020–2023` $\rightarrow$ `2024–2027`), correlaciones FDR Benjamini-Hochberg, Gini/HHI del PPI y prueba pareada de Wilcoxon entre Planes de Desarrollo.
5. `GET /api/v1/compromisos/triada/pdd-dea/resumen-ejecutivo`
   - Consolidado integral de un solo llamado con caché `_RESULT` (`TTL = 3600s`).

#### 4.2. Sub-vista 6 en Frontend (`agy2` en `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`)
Integrada en `triada-motores-tab.tsx` como botón `tab-nav-pdd-dea`: **«6. Evaluación & DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)»**, con 4 sub-paneles interactivos:
1. **Catálogo Histórico (`2012–2027`) y Conciliación Oficial del Plan Plurianual de Inversiones (PPI):** Comparativa de los 5 Planes Distritales + 3 Planes Locales, tabla oficial del PPI (`$6,02B` en `2020–2023` y `$12,80B` en `2024–2027`) y brecha de conciliación frente a los Excels de seguimiento.
2. **Semáforo de Metas PDD y Foco en Línea Estratégica 1 («Seguridad Humana»):** Cumplimiento de las `3.170` metas de `2024–2027`, `1.832` metas de `2020–2023` y `806` metas de `2016–2019`, filtro por Línea Estratégica, detección de metas huérfanas y estado de los 19 Macroproyectos y 3 Localidades.
3. **Frontera DEA de Planes de Desarrollo (`CCR · BCC · SBM · Slacks & Targets`):** Selector de Plan de Desarrollo (`2024–2027`, `2020–2023`, `2016–2019`) y de Insumo (`PPI Conciliado` vs. `Reportado`), ranking de entidades según su eficiencia cumpliendo el PDD y modal de holguras de metas PDD.
4. **Malmquist Inter-Gobiernos y Econometría Comparada (`2012–2027`):** Productividad de Malmquist entre Planes de Desarrollo, correlaciones con ajuste FDR, Gini/HHI por Línea Estratégica y prueba pareada de Wilcoxon entre gobiernos.

---

## 3. Partición Estricta de Archivos (Cero Colisiones Concurrentes)

- **`codex` (`[TRIADA-BACKEND-DEA-PDD-08]`):**
  - `backend/app/modules/compromisos/pdd_dea_service.py` *(nuevo)*
  - `backend/app/modules/compromisos/router.py` *(modificado — añade las 5 rutas `/triada/pdd-dea/*`)*
  - `backend/tests/test_pdd_dea_triada.py` *(nuevo)*
  - `docs/permisos-api.md` *(modificado — registra las 5 rutas nuevas)*
  - `bridge/02_entrega_codex.md` *(actualizado)*
- **`agy2` (`[TRIADA-FRONTEND-DEA-PDD-08]`):**
  - `src/features/seguimiento/data/pdd-dea-cartagena.data.ts` *(nuevo)*
  - `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(modificado — añade tipos y 5 clientes `/triada/pdd-dea/*` con fallback local)*
  - `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` *(nuevo)*
  - `src/features/seguimiento/components/triada-motores-tab.tsx` *(modificado — añade Sub-vista 6 `tab-nav-pdd-dea`)*
  - `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` *(nuevo)*
  - `bridge/02_resultado_agy2.md` *(actualizado)*
