# ORDEN DE EJECUCIÓN: `[MOTOR-EXTRACCION-HOMOLOGACION-PDD-SEGURIDAD-HUMANA-16]`

**Agente Asignado:** `codex` (`=codex:0.0`)
**Rol:** Arquitecto Backend, Ingeniería de Datos PDD y Sincronización Google Workspace
**Rama:** `main` (Única rama autorizada; prohibido crear ramas secundarias. Commit local en `main` al cerrar).
**Estado de Aprobación:** El usuario revisó tu dictamen `[REVISION-RUTA-PDD-SEGURIDAD-HUMANA-15A]` y aprobó ejecutar de inmediato la reconstrucción estructural/financiera y la publicación `PDD-Only`.

---

## 1. Objetivo y Alcance Estricto (`PDD-Only`)

Ejecutar la **Hoja de Ruta y Motor de Procedimiento (`Fases 0, 1, 2, 3 y 4`)** que diseñaste en tu dictamen `[15A]` para reconstruir con rigor documental los **5 Planes de Desarrollo Distritales (`2012–2027`)** y el anexo separado de los **3 Planes de Desarrollo Local (`2024–2027`)**, clasificarlos bajo la matriz dual **`Frontalidad (A/B/C/N)` $\times$ `7 Dimensiones de Seguridad Humana (PNUD / Decreto 037 de 2026)`** sin doble conteo presupuestal, y publicar la nueva versión `PDD-Only` de:
- **Google Sheet `Matriz_PDM`:** `1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`
- **Google Doc `Analisis`:** `1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`

### Restricciones Metodológicas Inquebrantables del Usuario
1. **CERO Resultados de Mesas de Trabajo:** No se ha realizado ninguna mesa de trabajo (las 37 mesas están en estado `PROGRAMADA`). Ni el documento `Analisis` ni `Matriz_PDM` pueden simular hallazgos o resultados de mesas comunitarias.
2. **CERO Análisis de Planes de Acción (PA):** Dejar completamente quietos los Planes de Acción en este informe y en `Matriz_PDM`. No mezclar las 225.380 filas de Planes de Acción ni el Network DEA PA→PDD dentro del informe `Analisis` ni en `Matriz_PDM`.
3. **Los 3 PDL (`2024–2027`) van en Anexo Territorial Separado:** Nunca sumar el presupuesto o las metas de los 3 PDL al denominador de los 5 PDD distritales.

---

## 2. Fases de Ejecución Requeridas

### Fase 0 y Fase 1 — Reconstrucción Estructural y Financiera de los Planes de Desarrollo en `bd_csh`
Construye y ejecuta un motor reproducible en `backend/scripts/reconstruir_catalogo_pdd_seguridad_humana_16.py` (y las mejoras necesarias en el esquema/metadatos de `seguimiento.planes_desarrollo_distrital`, `seguimiento.pdd_lineas_y_programas` y `seguimiento.pdd_metas_oficiales`) que resuelva los 3 bloqueos que diagnosticaste en `[15A]`:

1. **`PDD_2012_2015` (*Acuerdo 001 de 2012 — Campo para Todos*):**
   - Fuente primaria exclusiva: `data/planes_desarrollo/pdd_2012_2015_acuerdo_001_campo_para_todos.pdf` y `.md` (excluir del árbol estructural los encabezados contaminados del estudio secundario `cdim`).
   - Poblar en `seguimiento.pdd_lineas_y_programas` los **5 Ejes Estratégicos** con su `ppi_anual_cop` (2012, 2013, 2014, 2015) y `ppi_total_cop` (`$3.049.788.268.000` total; Eje 5 *Seguridad Ciudadana y Buen Gobierno* = `$170.412.997.000`, más Ejes 1, 2, 3 y 4) y sus Programas/Componentes hijos con `parent_id` válido.
   - Extraer del Acuerdo 001 de 2012 el conjunto limpio de metas e indicadores (reemplazando las 7 filas contaminadas) y enlazar cada meta a su nodo estratégico mediante `linea_id` no nulo.
2. **`PDD_2013_2015` (*Acuerdo 016 de 2013 — Ahora Sí Cartagena*):**
   - Fuente primaria: `data/planes_desarrollo/pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf` y `.md`.
   - Reconstruir el árbol de **4 Objetivos Estratégicos $\rightarrow$ Estrategias / Programas / Subprogramas** con `parent_id`, poblando los montos del PPI 2014–2015 (`$1.874.167.605.000` total en pesos corrientes) y registrando explícitamente la nota metodológica del Acuerdo 016 (vigencia 2013 ejecutada al ~90% antes de la adopción del plan atípico; PPI programado para 2014–2015).
   - Extraer y clasificar adecuadamente tanto las metas de `BIENESTAR`/`RESULTADO` como las metas de `PRODUCTO` de las matrices del Acuerdo 016 y enlazarlas con `linea_id` no nulo.
3. **`PDD_2016_2019` (*Acuerdo 006 de 2016 — Primero la Gente*):**
   - Fuente primaria: `data/planes_desarrollo/pdd_2016_2019_acuerdo_006_primero_la_gente.md` y `.pdf`.
   - **Purgar las 48 filas basura de títulos de página (`"Página X (OCR Oficial...)"`)** en `seguimiento.pdd_lineas_y_programas`.
   - Poblar los **3 Objetivos Estratégicos** y las **Líneas Estratégicas reales** con sus montos anuales 2016–2019 de la tabla financiera oficial (`$4.331.941.000.000` total; p. ej., *Cartagena Sin Miedos* `$70.158.000.000`, *Cartagena Territorio de Paz* `$5.934.000.000`, *Superar la Desigualdad*, etc.) y relación `parent_id`.
   - Extraer todos los programas/metas/indicadores legibles del texto OCR disponible en `pdd_2016_2019_acuerdo_006_primero_la_gente.md`, vinculándolos con `linea_id` a su línea estratégica y documentando con transparencia el alcance de la fuente escaneada.
4. **`PDD_2020_2023` (*Acuerdo 024 de 2020 — Salvemos Juntos a Cartagena*):**
   - Fuente primaria: `data/planes_desarrollo/pdd_2020_2023_salvemos_juntos_cartagena.pdf` y `.md`.
   - Conectar jerárquicamente (`parent_id`) los **4 Pilares $\rightarrow$ 21 Líneas Estratégicas $\rightarrow$ 87 Programas** y poblar su `ppi_anual_cop` y total por línea/programa desde las tablas financieras plurianuales del documento (verificando unidad en millones de COP convertida a COP exactos, p. ej., línea *Convivencia y Seguridad para la Gobernabilidad* = `$62.628.600.000`, más líneas de Derechos Humanos/Paz, Víctimas, Gestión del Riesgo, etc.).
   - Enlazar las metas de resultado y de producto a su programa/línea mediante `linea_id` no nulo y recuperar los indicadores/líneas base faltantes desde el documento.
5. **`PDD_2024_2027` (*Acuerdo 139 de 2024 — Cartagena, Ciudad de Derechos*):**
   - Mantener los `220` nodos (`6` Líneas Estratégicas, `42` Impulsores, `172` Programas) con su `ppi_anual_cop` (`$12.800.853.474.855` total; Línea 1 *Seguridad Humana* = `$5.666.917.744.338` = `44,27%`), completando la relación `parent_id` de `PROGRAMA -> IMPULSOR -> LINEA_ESTRATEGICA`.
   - Enlazar las metas canónicas únicas (`973` metas netas deduplicadas, manteniendo trazabilidad de las `273` filas secundarias de Bases/Ponencia) a su programa/línea con `linea_id` no nulo.
6. **Anexo Separado `PDL_2024_2027` (`Localidades 1, 2 y 3`):**
   - Poblar los montos por línea de los 3 PDL distinguiendo **Inversión** vs. **Funcionamiento** (ej. en PDL 1 `$6.868.680.000` funcionamiento; en PDL 2 fila explícita de funcionamiento; en PDL 3 `$39.000.000.000` inversión plurianual vs. `$7.000.000.000` funcionamiento/honorarios de ediles) y enlazar sus `401` metas a sus líneas locales con `linea_id`.

### Puerta de Calidad A (Verificación Automática)
- `0` filas con títulos falsos `"Página X"` en `seguimiento.pdd_lineas_y_programas`.
- `100%` de las metas canónicas activas en `seguimiento.pdd_metas_oficiales` con `linea_id IS NOT NULL` apuntando a un nodo válido de su mismo plan.
- Suma de `ppi_total_cop` de las líneas de primer nivel de cada uno de los 5 PDD conciliada contra el PPI total oficial del plan (documentando cualquier diferencia por redondeo o partidas de funcionamiento/deuda).
- Serie monetaria normalizada tanto en **COP corrientes (nominales)** como en **COP constantes de base 2025 (deflactados con IPC oficial DANE)**.

---

### Fase 2 — Clasificación Rigurosa en Seguridad Humana (`A / B / C / N` $\times$ `7 Dimensiones`)
Implementa un clasificador auditable, determinístico y basado en reglas explícitas sobre el objeto programático (no simple coincidencia ciega de una palabra suelta) que asigne a cada programa/línea (`pdd_lineas_y_programas`) y a cada meta (`pdd_metas_oficiales`) en su JSON `metadatos` (o columnas estructuradas):

1. **Grado de Frontalidad hacia la Seguridad Humana (`grado_frontalidad_sh`):**
   - **`A_NUCLEO_FRONTAL`:** Programas/metas cuyo objeto explícito es seguridad ciudadana, convivencia, prevención de violencia y delito, acceso a la justicia, derechos humanos, construcción de paz, atención a víctimas del conflicto o gestión del riesgo de desastres / emergencias. *(Nota: dentro de un eje mixto como "Seguridad Ciudadana y Buen Gobierno" en 2012 o la línea "Seguridad Humana" en 2024, clasifica como `A` los programas/metas del núcleo de seguridad/convivencia/justicia/DD.HH./riesgo y como `B`, `C` o `N` los programas que sean determinantes sociales o buen gobierno administrativo).*
   - **`B_DETERMINANTE_DIRECTO`:** Programas/metas sectoriales que atacan de forma directa y focalizada una amenaza a la supervivencia, dignidad o medios de vida en las 7 dimensiones de la Seguridad Humana (seguridad alimentaria y nutrición, salud pública/mental/materno-infantil, inclusión productiva/superación de pobreza extrema, hábitat seguro/saneamiento básico, protección de niñez/juventud/mujeres/grupos étnicos vulnerables).
   - **`C_CONTEXTUAL_HABILITANTE`:** Infraestructura vial macro, competitividad general, turismo, equipamiento urbano general o educación/salud administrativa general que habilita el desarrollo pero no está focalizada como intervención directa de seguridad humana.
   - **`N_NO_ASOCIADO_FUNCIONAMIENTO`:** Administración general, recaudo tributario, servicio de la deuda, catastro, fortalecimiento institucional interno o gastos de funcionamiento.
2. **Asignación a las 7 Dimensiones de Seguridad Humana (PNUD 1994 / Decreto 037 de 2026) sin Doble Conteo:**
   - Para cada nodo/meta en categoría `A` o `B`, asignar `dimension_sh_primaria` (`Seguridad Personal`, `Seguridad Comunitaria`, `Seguridad Económica`, `Seguridad Alimentaria`, `Seguridad en la Salud`, `Seguridad Ambiental`, `Seguridad Política`) y un vector de pesos `pesos_7d` cuya suma sea exactamente `1.0` (`100%`) para que al agregar el PPI por las 7 dimensiones **la suma de las 7 dimensiones cuadre exactamente con el subtotal `A + B` sin duplicar un solo peso**.

---

### Fase 3 y Fase 4 — Actualización de API, `Matriz_PDM` y Documento `Analisis` (`PDD-Only`)
1. **Servicio y Endpoints Backend:**
   - Actualizar `pdd_dea_service.py` y `google_workspace_sync_service.py` para exponer la evaluación comparativa de los **5 PDD (2012–2027)** + anexo **3 PDL (2024–2027)** con las métricas de las **4 preguntas estratégicas del usuario**, la desagregación `A / B / C / N` y la matriz de las `7 Dimensiones` en pesos corrientes y constantes 2025.
2. **Actualización en vivo de Google Sheet `Matriz_PDM` (`1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`):**
   - Estructurar las hojas nativas en modo `PDD-Only` (sin Planes de Acción ni resultados de Mesas):
     1. `00_Guia_Alcance_y_Calidad`: Alcance `PDD-Only`, fuentes primarias, puertas de calidad, IPC DANE base 2025, rúbrica `A/B/C/N` y nota de que las 37 mesas están `PROGRAMADAS`.
     2. `01_Comparativo_5_PDD`: Tabla maestra comparativa de los 5 PDD (`2012–2015`, `2013–2015`, `2016–2019`, `2020–2023`, `2024–2027`) con PPI total nominal y constante 2025, PPI en `A (Núcleo Frontal)`, `B (Determinantes Directos)`, `C (Contextual)` y `N (No Asociado)`, `% de Frontalidad (A)`, `% Ampliado SH (A+B)`, conteo de metas únicas de Resultado y Producto y puntaje de Profundidad Estratégica (completitud de cadena de valor).
     3. `02_Arquitectura_y_PPI_Programas`: Todos los ejes/pilares/líneas/programas de los 5 PDD con su código, nivel, padre, PPI anual y total (corriente y constante 2025), clasificación `A/B/C/N` y dimensión SH primaria.
     4. `03_Matriz_7_Dimensiones_SH`: Distribución presupuestal (COP constantes 2025 y %) y de metas de cada uno de los 5 PDD en las 7 Dimensiones de Seguridad Humana (sin doble conteo).
     5. `04_Catalogo_Metas_Unicas_PDD`: Las metas canónicas únicas de los 5 PDD enlazadas a su línea/programa (`linea_id`), tipo (`RESULTADO`/`PRODUCTO`), indicador, línea base, meta cuatrienio, clasificación `A/B/C/N` y dimensión SH.
     6. `05_Abordaje_Estrategico_4_Preguntas`: Síntesis matricial comparativa respondiendo las 4 preguntas para cada PDD (enfoque del problema, frontalidad vs. transversalidad, articulación causal diagnóstico→meta→presupuesto, territorialización y poblaciones).
     7. `06_Anexo_3_PDL_Localidades`: Análisis separado de los 3 Planes de Desarrollo Local (`2024–2027`) separando Inversión vs. Funcionamiento.
   - Insertar **4 gráficos nativos de Google Sheets** en `Matriz_PDM` basados en estas tablas (1. Evolución del PPI por PDD según Frontalidad `A/B/C/N` en COP constantes 2025; 2. Distribución por las 7 Dimensiones de Seguridad Humana; 3. Metas de Resultado y Producto en Seguridad Humana por PDD; 4. Índice de Frontalidad Presupuestal vs. Profundidad de Cadena Estratégica por PDD).
3. **Actualización en vivo del Google Doc `Analisis` (`1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`):**
   - Redactar e inyectar un **Documento Técnico de Diagnóstico Preliminar Basado Exclusivamente en los Planes de Desarrollo de Cartagena (2012–2027) a la luz de la Política Pública de Seguridad Humana (Decreto 037 de 2026 y Estándar PNUD)**, estructurado con estilos nativos `HEADING_1`, `HEADING_2`, **tablas nativas de Google Docs** y **6 gráficos PNG de alta resolución (300 DPI) embebidos vía `InsertInlineImageRequest`** generados desde los datos reales reconstruidos:
     - **Capítulo 1 — Alcance Metodológico, Hoja de Ruta y Motor de Procedimiento (`PDD-Only`):** Explicación transparente de por qué el diagnóstico preliminar se concentra exclusivamente en los Planes de Desarrollo (sin simular resultados de las 37 mesas `PROGRAMADAS` y dejando en congelamiento los Planes de Acción hasta su homologación), el uso del Decreto 037 de 2026 / PNUD 1994 como lente retrospectiva común, las Puertas de Calidad `A` y `B`, la serie IPC DANE base 2025 y la rúbrica bidimensional `Frontalidad (A/B/C/N)` $\times$ `7 Dimensiones` sin doble conteo.
     - **Capítulo 2 — Pregunta 1: ¿Qué contemplaba cada Plan de Desarrollo del Distrito (2012–2027)?** Radiografía estructural e histórica detallada de cada uno de los 5 PDD (`2012–2015 Campo para Todos`, `2013–2015 Ahora Sí Cartagena`, `2016–2019 Primero la Gente`, `2020–2023 Salvemos Juntos a Cartagena` y `2024–2027 Cartagena, Ciudad de Derechos`), su arquitectura de ejes/líneas/programas, su diagnóstico de ciudad y sus metas de resultado y producto.
     - **Capítulo 3 — Pregunta 2: ¿Cuál fue la apuesta a nivel de Metas y a nivel Financiero/Presupuestal hacia la Seguridad Humana?** Análisis cuantitativo riguroso del PPI nominal y constante 2025 de cada PDD desglosado entre **Núcleo Frontal (`A`)**, **Determinantes Multidimensionales Directos (`B`)**, **Gasto Contextual/Habilitante (`C`)** y **No Asociado/Funcionamiento (`N`)**, y su reparto exacto entre las **7 Dimensiones de la Seguridad Humana**, distinguiendo la etiqueta nominal de una línea frente al contenido real de sus programas.
     - **Capítulo 4 — Pregunta 3: ¿Qué Plan de Desarrollo fue más frontal y más estratégico en clave de Seguridad Humana?** Contraste técnico entre **Frontalidad Nominal/Presupuestal** (donde el PDD 2024–2027 titula explícitamente su Línea 1 *"Seguridad Humana"* con `$5,667 billones` = `44,27%` del PPI, pero agrupa allí tanto seguridad ciudadana/justicia/riesgo `A` como determinantes sociales amplios `B` de educación, salud y deporte) vs. **Frontalidad de Núcleo Duro (`A`)** vs. **Profundidad de Diseño Estratégico** (trazabilidad de la cadena `Diagnóstico → Objetivo → Programa → Meta de Resultado → Meta de Producto → PPI` en cada uno de los 5 planes).
     - **Capítulo 5 — Pregunta 4: Evolución del Abordaje de los Problemas de la Seguridad Humana desde la Planeación Estratégica (2012–2027):** Análisis comparado de cómo evolucionó la concepción del problema público a lo largo de los 5 gobiernos (del enfoque de seguridad policiva y buen gobierno en 2012, pasando por inclusión social en 2013, convivencia y paz territorial en 2016, gobernabilidad y resiliencia post-pandemia en 2020, hasta la adopción explícita del paradigma de Seguridad Humana y Ciudad de Derechos en 2024), identificando rupturas, continuidades y vacíos estructurales.
     - **Capítulo 6 — Anexo Territorial Separado: Los 3 Planes de Desarrollo Local (`PDL 2024–2027` — Localidades 1, 2 y 3):** Lectura desagregada de la apuesta local en Seguridad Humana separando inversión real vs. gastos de funcionamiento de los Fondos de Desarrollo Local.
     - **Capítulo 7 — Hallazgos de Calidad Documental, Limitaciones del Corpus e Insumos Base para la Fase Participativa (37 Mesas Programadas):** Síntesis de brechas documentales (ej. PDF escaneado en 2016 y PDL 2, ventana 2014–2015 en PDD 2013) y preguntas orientadoras que este diagnóstico entrega como insumo técnico para cuando se instalen las 37 mesas de trabajo.

---

## 3. Controles de Calidad y Entrega

1. Ejecutar el script de reconstrucción y verificar en `bd_csh` que los 8 planes queden con jerarquía limpia, `0` filas `"Página X"`, `linea_id` poblado en las metas canónicas y clasificación `A/B/C/N` + `7D` conciliada.
2. Regenerar la caché si aplica, reiniciar `polis-backend.service` y ejecutar la sincronización en vivo con Google Sheets (`Matriz_PDM`) y Google Docs (`Analisis`).
3. Verificar con lectura real desde Google Sheets API v4 y Google Docs API v1 que `Matriz_PDM` y `Analisis` quedaron actualizados, con tablas y gráficos nativos/embebidos y **cero referencias a resultados de mesas realizadas**.
4. Ejecutar `ruff check` y `pytest` sobre los archivos modificados.
5. Documentar todo en `/root/polis/bridge/02_entrega_codex.md` y hacer commit en `main`.
