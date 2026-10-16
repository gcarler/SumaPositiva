# ORDEN MAESTRA `[TRIADA-GOOGLE-WORKSPACE-PRO-14]`
## Transformación de los 3 Archivos Nativos de Google (`Matriz_PDM`, `Matriz_Plan_de_accion`, `Analisis`) en un Expediente Técnico de Diagnóstico Completo con Gráficos Nativos, Tablas Exhaustivas y Documento Técnico Ilustrado

- **Coordinador General y Auditor Forense (EAF):** `agy`
- **Ejecutor Principal:** `codex` (Desarrollador Principal Backend / Econometría / Google Workspace API v4 & v1)
- **Fecha:** 2026-10-15
- **Prioridad:** MÁXIMA INMEDIATA

---

## 1. Diagnóstico del Rechazo del Usuario (Por qué la versión anterior fue insuficiente)

El usuario revisó los 3 documentos en Google Drive y señaló con toda razón:
> *"esos tres archivos no tienen la información que se necesita..... esta incompleta, sin graficas sin nada que lo convierta en un verdadero documento tecnico de diagnostico"*

**Causas técnicas identificadas en `google_workspace_sync_service.py` (versión anterior):**
1. **`Matriz_PDM` (`1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`)** solo tenía 4 pestañas resumidas de pocas filas (8 filas en la pestaña 1, 16 en la pestaña 2, 29 en la pestaña 3), **no incluía las `2.078` metas oficiales completas del PDD**, **no incluía las `75` líneas estratégicas y programas presupuestales**, **no tenía formato numérico de moneda/porcentaje ni colores condicionales**, y **tenía `0` gráficos nativos de Google Sheets (`addChart`)**.
2. **`Matriz_Plan_de_accion` (`1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM`)** solo tenía 3 pestañas con `181` filas del motor y las 29 entidades resumidas, **dejando por fuera el desglose por vigencia/trimestre/dimensión PNUD**, **el inventario auditado de los 78 PDFs (`49` binarios únicos)**, **la matriz amplia de actividades reales extraídas de `seguimiento.registros_triada_normalizados` (`PLAN_ACCION`)**, y **tenía `0` gráficos nativos de Google Sheets (`addChart`)**.
3. **`Analisis` (`1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`)** era un volcado de texto plano (`insertText`) de ~50 líneas sin un solo estilo de título (`HEADING_1`, `HEADING_2`), **sin una sola tabla nativa (`insertTable`)**, **sin una sola gráfica estadística embebida (`insertInlineImage`)** y sin análisis técnico profundo capítulo por capítulo.

---

## 2. Especificación Técnica Obligatoria para los 3 Documentos Nativos

### A. Google Sheet 1 — `Matriz_PDM` (`1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`)
Debe contener **7 pestañas exhaustivas, formateadas (encabezados azul oscuro, filas cebradas/auto-dimensionadas, formato moneda `$#,##0` y porcentaje `0.00%`) y con 4 Gráficos Nativos de Google Sheets (`addChart` / `EmbeddedChart`)**:

1. **Pestaña `0_Dashboard_Ejecutivo_PDD` (con 4 Gráficos Nativos de Google Sheets):**
   - Tabla de KPIs Macro del Cuatrienio y Serie Histórica 2012–2027.
   - **Gráfico Nativo 1 (`COLUMN` chart via `addChart`):** *Comparativo PPI Oficial Corriente vs. Constante 2025 (Millones COP) en los 8 Planes de Desarrollo (2012–2027)* (anclado en `A18` o `H2`).
   - **Gráfico Nativo 2 (`LINE` / `AREA` chart via `addChart`):** *Evolución Anual Ininterrumpida de la Inversión Pública en Cartagena (2012–2027) — 16 Vigencias*.
   - **Gráfico Nativo 3 (`BAR` stacked chart via `addChart`):** *Descomposición Forense de las 2.078 Metas PDD por Plan y Categoría de Cobertura (`Vinculada Alta Confianza`, `Candidato Baja Confianza`, `Sin Reporte en Corpus`, `Duplicada Entre Fuentes`, `Sin Corpus Histórico`)*.
   - **Gráfico Nativo 4 (`COLUMN` / `COMBO` chart via `addChart`):** *Top Entidades en Network DEA Bi-Etapa: Eficiencia Operativa PA (`E1`) vs. Eficiencia Estratégica PDD (`E2`) y Brecha de Ilusión Burocrática*.
2. **Pestaña `1_Resumen_8_Planes_PPI`:**
   - Los 8 planes (`5 PDD + 3 PDL`) con: Código, Nombre Oficial, Acuerdo/Acto Administrativo, Alcalde/Autoridad, Periodo, PPI Corriente (COP y MCOP), Factor Deflactor IPC DANE, PPI Constante 2025 (COP y MCOP), Reportado en Matrices BD, Brecha de Sobrerreporte, Total Líneas/Programas, Metas Brutas, Metas Duplicadas, Metas Únicas Canónicas, Metas Vinculadas Alta Confianza, Candidatas Baja Confianza, Sin Reporte en Corpus, Sin Corpus Histórico, % Cobertura sobre Metas Únicas y Fila de Totales / Promedios.
3. **Pestaña `2_Serie_Anual_2012_2027`:**
   - Las 16 vigencias anuales (`2012` a `2027`) con: Vigencia, Plan Vigente, PPI Programado Corriente COP, PPI Constante 2025 COP, Registros Plan de Desarrollo en `bd_csh`, Registros Plan de Acción en `bd_csh`, Registros Inversión Presupuestal en `bd_csh`, Apropiación Definitiva Consolidada COP, Obligaciones/Pagos Consolidados COP, % Ejecución Financiera y Avance Físico Promedio %.
4. **Pestaña `3_Lineas_y_Programas_75`:**
   - Todas las filas de `seguimiento.pdd_lineas_y_programas` (las ~75 líneas estratégicas y programas de los 8 planes) con código de plan, nivel, código de línea/programa, nombre, presupuesto corriente, presupuesto constante 2025, participación % dentro del plan y número de metas asociadas.
5. **Pestaña `4_Network_DEA_y_Pareto_29_Entidades`:**
   - Las **29 entidades distritales** con todas las métricas econométricas del laboratorio: Grupo Institucional, `E1` Eficiencia Operativa PA, `E2` Eficiencia Estratégica PDD, `CCR` Estratégico, `BCC` Estratégico, Eficiencia de Escala (`SE`), Rendimientos a Escala (`RTS`), Score Global Network DEA, Brecha de Ilusión Burocrática (`E1 - E2`), Clasificación de Red, Media Bootstrap DEA, IC 95% Inferior/Superior, Índice de Malmquist Inter-Plan (`EC`, `TC`, `MI`), Simulador Inverse DEA Pareto (`-5%`, `-10%`, `-15%` o ganancia de metas), Rigidez Legal y Fuentes Financieras.
6. **Pestaña `5_Matriz_Completa_2078_Metas_PDD`:**
   - **Las `2.078` filas completas de `seguimiento.pdd_metas_oficiales`** con: ID, Código Plan, Código Meta, Tipo Meta, Línea Estratégica, Nombre de la Meta, Indicador Oficial, Unidad de Medida, Línea Base, Meta Cuatrienio, Entidad Responsable, Es Meta Única Canónica (`SÍ`/`NO`), Estado de Cobertura Forense, Taxonomía MGA/DNP, Método de Emparejamiento, Score de Emparejamiento, ID Registro Tríada Vinculado y Fuente Documental.
7. **Pestaña `6_Justicia_Territorial_y_37_Mesas`:**
   - Tabla 1: Desglose de Justicia Territorial por Localidad (`Localidad 1`, `Localidad 2`, `Localidad 3`, `Zona Rural e Insular`) con población DANE (`1.065.570` hab.), inversión PDL/PPI per cápita, hurtos (`12.280` casos), tasa por 100.000 hab., mesas ciudadanas y nota de Moran's I.
   - Tabla 2: Censo completo de las **37 Mesas Oficiales (con los 15 corregimientos)** + Plenaria `pc-001`.

---

### B. Google Sheet 2 — `Matriz_Plan_de_accion` (`1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM`)
Debe contener **7 pestañas exhaustivas y 4 Gráficos Nativos de Google Sheets (`addChart`)**:

1. **Pestaña `0_Dashboard_Ejecutivo_PA` (con 4 Gráficos Nativos de Google Sheets):**
   - Tabla de KPIs Globales del Corpus de Planes de Acción (`1.383` archivos en catálogo Drive: `1.305` libros Excel + `78` PDFs = `665` binarios únicos ingeridos en `bd_csh`, `69.908` registros de `PLAN_ACCION`, `29` entidades distritales).
   - **Gráfico Nativo 1 (`BAR` chart via `addChart`):** *Avance Físico Promedio (%) vs. % Ejecución Presupuestal por las 29 Entidades Distritales*.
   - **Gráfico Nativo 2 (`COLUMN` stacked chart via `addChart`):** *Auditoría Morfológica DNP por Entidad: Actividades con Verbos Fuertes (Producto Entregable) vs. Verbos Débiles (Gestión/Proceso)*.
   - **Gráfico Nativo 3 (`PIE` / `DOUGHNUT` chart via `addChart`):** *Distribución de Registros y Presupuesto de Planes de Acción por las 7 Dimensiones PNUD de Seguridad Humana*.
   - **Gráfico Nativo 4 (`COLUMN` chart via `addChart`):** *Evolución de Registros y Ejecución de Planes de Acción por Vigencia (`2016–2026`)*.
2. **Pestaña `1_Consolidado_29_Entidades_PA`:**
   - Las **29 entidades distritales** cruzando tanto el corpus masivo (`seguimiento.registros_triada_normalizados` donde `motor_destino = 'PLAN_ACCION'`) como el Motor Operativo DNP (`seguimiento.actividades_plan_accion`): Archivos Excel Ingeridos, Archivos PDF Ingeridos, Total Filas Normalizadas PA, Actividades Curadas en Motor DNP, Proyectos BPIM Únicos, Verbos Fuertes DNP, Verbos Débiles DNP, % Rigor Sintáctico DNP, Avance Físico T1, T2, T3, T4, Avance Físico Global %, Apropiación Definitiva COP, CDP COP, Compromisos RPC COP, Obligaciones COP, Pagos Tesorería COP y % Ejecución Financiera.
3. **Pestaña `2_Dimensiones_PNUD_y_Vigencias`:**
   - Tabla A: Desglose de Planes de Acción por cada una de las **7 Dimensiones de Seguridad Humana ONU** (Personal, Comunitaria, Económica, Alimentaria, Salud, Ambiental, Política) + Institucional.
   - Tabla B: Desglose de Planes de Acción por Vigencia (`2016` a `2026`) y Periodo de Gobierno (`ANTES_2020`, `2020_2023`, `2024_2027`).
4. **Pestaña `3_Motor_Plan_Accion_DNP_181`:**
   - Las `181` actividades de `seguimiento.actividades_plan_accion` con todas sus 22 columnas, clasificación de verbo DNP (`FUERTE` / `DÉBIL`), brecha físico-financiera y semáforo (`CUMPLIDA`, `EN_RIESGO`, `REZAGO_CRITICO`).
5. **Pestaña `4_Registros_Triada_PA_Top1500`:**
   - Muestra exhaustiva de las **1.500 filas principales de `seguimiento.registros_triada_normalizados` (`motor_destino = 'PLAN_ACCION'`)** priorizadas por presupuesto y completitud de avance físico en las 29 entidades, con: Vigencia, Corte, Entidad, Línea Estratégica, Código Meta PDD, Código BPIM, Indicador, Descripción de Actividad, Verbo Detectado, Verbo Fuerte DNP, Meta Programada, Meta Ejecutada, T1, T2, T3, T4, Avance Físico %, Apropiación COP, CDP COP, RPC COP, Obligaciones COP, Pagos COP, Hoja Origen y Fila Origen.
6. **Pestaña `5_Auditoria_78_PDFs_Planes_Accion`:**
   - Las **78 entradas PDF del catálogo Drive** (`49` binarios únicos SHA-256) con: Nombre del Archivo, Ruta en Drive, Vigencia (`2018` / `2025`), Periodo de Gobierno, Entidad Normalizada, Dimensiones de Seguridad Humana, SHA-256, Tamaño Bytes, Filas Extraídas en `bd_csh` y Estado de Ingesta.
7. **Pestaña `6_Censo_37_Mesas_15_Corregimientos`:**
   - El catálogo completo de las **37 mesas oficiales** (`3` de localidad, `15` de corregimientos `MR-01..MR-15`, `8` poblacionales, `11` sectoriales) + Plenaria `pc-001` con agenda ID, código oficial, shortcode ciudadano, nombre, territorio, lugar, fecha, horario, dimensiones ONU, responsable y coordenadas (`lat`, `lng`).

---

### C. Google Doc — `Analisis` (`[POLIS] Documento Técnico de Diagnóstico Forense Integral: Planes de Desarrollo (2012–2027) y Planes de Acción Distritales` — `1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`)
Debe ser un **Documento Técnico de Diagnóstico real, extenso (~35.000 a 60.000 caracteres), con estilos nativos (`TITLE`, `SUBTITLE`, `HEADING_1`, `HEADING_2`, `HEADING_3`), Tablas Nativas Formateadas y 6 Gráficos Estadísticos de Alta Resolución embebidos (`insertInlineImage`)**:

1. **Generación de 6 Gráficos PNG de Alta Resolución (`matplotlib`, `1600x900` px, DPI 180) y exposición vía API pública `GET /api/v1/compromisos/triada/google-workspace/graficas/{nombre_archivo}`**:
   - Como Nginx enruta `/api/` directamente al backend FastAPI en `https://seguridadhumanaintegral.org/api/v1/...`, exponer el endpoint público `GET /api/v1/compromisos/triada/google-workspace/graficas/{chart_name}.png` que sirve los PNG generados en `/tmp/polis_workspace_charts/`:
     1. `fig1_ppi_8_planes.png`: Comparativo PPI Oficial Corriente vs. Constante 2025 en los 8 Planes de Desarrollo (`2012–2027`).
     2. `fig2_serie_anual_2012_2027.png`: Serie histórica anual 2012–2027 de inversión pública y registros auditados en Cartagena.
     3. `fig3_cobertura_metas_pdd.png`: Descomposición forense de las `2.078` metas brutas (`1.805` únicas) por plan y categoría de cobertura MGA/DNP.
     4. `fig4_network_dea_29_entidades.png`: Mapa de Eficiencia Bi-Etapa (`E1 Operativa PA` vs. `E2 Estratégica PDD`) y detector de Ilusión Burocrática en las 29 entidades.
     5. `fig5_planes_accion_ejecucion_y_verbos.png`: Ejecución física/financiera y proporción de Verbos Fuertes vs. Débiles DNP en las 29 entidades distritales.
     6. `fig6_justicia_territorial_37_mesas.png`: Inversión per cápita PDL, distribución de las 37 mesas (15 corregimientos) y concentración de los `12.280` hurtos por localidad.
   - Insertar estas 6 gráficas directamente en el Google Doc usando `{"insertInlineImage": {"location": {"index": ...}, "uri": "https://seguridadhumanaintegral.org/api/v1/compromisos/triada/google-workspace/graficas/figX_....png", "objectSize": {"width": {"magnitude": 460, "unit": "PT"}, "height": {"magnitude": 260, "unit": "PT"}}}}`!

2. **Estructura Capitular Completa del Google Doc (`Analisis`):**
   - **Portada Institucional y Ficha Técnica del Diagnóstico** (`TITLE`, `SUBTITLE` y bloque ejecutivo).
   - **Capítulo 1. Resumen Ejecutivo y Hallazgos Estructurales de la Tríada Documental (2012–2027):** Síntesis cuantitativa del corpus (`8` planes, `1.383` documentos en Drive, `665` binarios únicos ingeridos, `225.380` filas normalizadas, `2.078` metas brutas / `1.805` metas únicas PDD, `29` entidades y `37` mesas).
   - **Capítulo 2. Análisis Macroeconómico y Plurianual de los 8 Planes de Desarrollo (2012–2027):** Análisis detallado de cada uno de los 5 PDD (`2012–2015` Campo Elías Terán, `2013–2015` Dionisio Vélez, `2016–2019` Manolo Duque, `2020–2023` William Dau, `2024–2027` Dumek Turbay) y los 3 PDL (`Localidades 1, 2 y 3`), deflactación IPC DANE a precios constantes de 2025, brechas de sobrerreporte + **`fig1_ppi_8_planes.png`** + **`fig2_serie_anual_2012_2027.png`**.
   - **Capítulo 3. Radiografía de la Línea Estratégica 1 «Seguridad Humana» y las 7 Dimensiones PNUD:** Desglose de los `$5,66 billones COP` (`44,27%` del PDD 2024–2027), los 26 programas estratégicos y el peso financiero y programático de cada una de las 7 dimensiones de Seguridad Humana ONU.
   - **Capítulo 4. Auditoría Forense de Metas Oficiales PDD (`2.078` Brutas / `1.805` Únicas) y Rigor Técnico MGA–Sinergia DNP:** Análisis de las 6 categorías de cobertura, duplicidad entre el Acuerdo 927 y las matrices de seguimiento (`273` metas clonadas), análisis de las `274` metas candidatas de baja confianza, evaluación de cadena de valor MGA (`Actividad → Producto → Resultado`) + **`fig3_cobertura_metas_pdd.png`**.
   - **Capítulo 5. Evaluación Econométrica de Frontera: DEA Clásico (CCR/BCC), Índice de Malmquist y Network DEA Bi-Etapa (`Operación PA → Estrategia PDD`):** Formulación matemática, análisis de rendimientos a escala, prueba de estabilidad de ranking (Spearman/Kendall), diagnóstico de las 29 entidades y detección de **Ilusión Burocrática** + **`fig4_network_dea_29_entidades.png`**.
   - **Capítulo 6. Simulador Prescriptivo Inverse DEA / Frontera de Pareto y Ledger de Rigidez Legal:** Escenarios de reasignación suma-cero (`±5%`, `±10%`, `±15%`) y restricciones legales de fuentes de financiación (SGP, SGR, rentas de destinación específica).
   - **Capítulo 7. Diagnóstico Técnico Operativo de los Planes de Acción Distritales (`29` Entidades, `1.305` Excel + `78` PDFs):** Análisis entidad por entidad del avance físico trimestral (`T1–T4`), cadena de ejecución presupuestal (`Apropiación → CDP → RPC → Obligación → Pago`), auditoría morfológica de verbos infinitivos DNP (fuertes vs. débiles) e integración de los 78 PDFs (`2018` y `2025`) + **`fig5_planes_accion_ejecucion_y_verbos.png`**.
   - **Capítulo 8. Justicia Territorial DANE, Geografía del Delito (`12.280` Hurtos) y Despliegue en las 37 Mesas Oficiales (15 Corregimientos):** Análisis espacial por localidad, compuerta metodológica de Moran's I (`N < 30`) y listado completo de las **37 mesas de trabajo (incluyendo las 15 mesas de los corregimientos oficiales de Cartagena `MR-01` a `MR-15`)** + **`fig6_justicia_territorial_37_mesas.png`**.
   - **Capítulo 9. Pliegos Individualizados de Control Político y Cuestionarios Vinculantes por Entidad (Ley 136 de 1994 y Ley 1551 de 2012):** Pliegos completos con hallazgos cuantitativos y preguntas normativas para las entidades del Distrito y sello criptográfico SHA-256 verificable.
