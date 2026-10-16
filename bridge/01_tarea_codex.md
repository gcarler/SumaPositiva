# ORDEN DE EJECUCIÓN: `[SISTEMA-MULTIAGENTE-ABSORCION-INTEGRAL-PDD-17]`

**Agente Asignado:** `codex` (`=codex:0.0`)
**Rol:** Arquitecto del Sistema Multi-Agente Backend de Planeación y Diagnóstico de Seguridad Humana
**Rama:** `main` (Única rama autorizada. **Cero Frontend:** no tocar `src/**`).

---

## 1. Directriz Expresa del Usuario

> *"es que no me interasa el forntend en estos momentos, necesito es un motor -sistema multigante- que pueda absorver y procesar toda la data que tenemos de lso planes de desarrollo para po der genrar un diagnostico de los planes de desarrollo en materia de seguridad humana."*

### Por qué la corrida anterior (`[16]`) aún no absorbió toda la data de los PDD:
1. **`PDD 2012–2015` (`pdd_2012_2015_acuerdo_001_campo_para_todos.pdf` — 161 páginas):**
   - Antes, el archivo `.md` estaba truncado a `77 KB`, por lo que solo se habían extraído `7` compromisos de la visión y el PPI de 2012 quedó con **`A = $0` y `B = $0` (`100%` en `C`)**.
   - **Ahora:** Ya extrajimos las **161 páginas completas (`365.872` caracteres)** en `/root/polis/data/planes_desarrollo/pdd_2012_2015_acuerdo_001_campo_para_todos.md` (y también se está generando `/root/polis/data/planes_desarrollo/estructurado_pdd_2012_2015.json`). Allí están **todos los 5 Ejes, todas las Políticas, todos los Programas y Subprogramas, sus metas de resultado y de producto y la tabla del PPI por Ejes y Programas**.
2. **`PDD 2013–2015` (`pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf` — 199 páginas):**
   - En `[16]` el PPI de `2013–2015` quedó con **`A = $0` y `B = $0` (`100%` en `C`)** porque solo había `4` objetivos y `7` programas sin montos desglosados en BD.
   - **Ahora:** En las páginas `172–195` del PDF (`pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf` y `.md`, más `/root/polis/data/planes_desarrollo/estructurado_pdd_2013_2015.json`) está la **tabla completa del Plan Plurianual de Inversiones 2014–2015 desglosada por Objetivo Estratégico, Estrategia, Programa y Subprograma** (en miles de pesos), y en las páginas `35–171` están **todas las matrices de Metas de Resultado y Metas de Producto por Programa y Subprograma**.
3. **`PDD 2016–2019` (`pdd_2016_2019_acuerdo_006_primero_la_gente.pdf` — 363 páginas):**
   - Antes, `pdd_2016_2019_acuerdo_006_primero_la_gente.md` solo tenía OCR de las páginas `1–24` y `340–363` (`70 KB`), por lo que en BD solo había `3` objetivos estratégicos y **`0` metas cuantificadas**.
   - **Ahora:** Se acaba de ejecutar el **OCR integral de las 363 páginas completas en español (`tesseract -l spa`)** sobre `pdd_2016_2019_acuerdo_006_primero_la_gente.md`, donde están todas las Líneas Estratégicas, Programas, Indicadores de Resultado, Indicadores de Producto, Líneas Base y Metas del cuatrienio 2016–2019.
4. **`PDD 2020–2023` (`pdd_2020_2023_salvemos_juntos_cartagena.pdf` — 370 páginas):**
   - Tiene las matrices completas de los 4 Pilares, 21 Líneas, 87 Programas, metas de resultado/producto y tablas financieras plurianuales por programa (también consolidándose en `/root/polis/data/planes_desarrollo/estructurado_pdd_2020_2023.json`).

---

## 2. Arquitectura Requerida: Sistema Multi-Agente de Absorción y Diagnóstico PDD (`backend/app/modules/compromisos/motor_multiagente_pdd.py`)

Debes construir un **Sistema Multi-Agente de Backend real y modular** en `backend/app/modules/compromisos/motor_multiagente_pdd.py` (invocable tanto por CLI `backend/scripts/ejecutar_sistema_multiagente_pdd_17.py` como por API `POST /api/v1/compromisos/triada/pdd-dea/ejecutar-sistema-multiagente` y `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente`) compuesto por **5 Agentes Especializados con estado compartido, bitácora de auditoría por agente y puertas de validación**:

### Agente 1 — `AgenteAbsorcionDocumentalPDD` (Ingesta Profunda PDF / OCR / Tablas)
- Absorbe el **100% de las páginas y tablas** de los 8 planes en `/root/polis/data/planes_desarrollo/` (usando `pymupdf`, `pdfplumber`, los `.md` completos —incluyendo las 161 páginas de 2012 y las 363 páginas OCR de 2016— y los archivos `estructurado_pdd_*.json` si están presentes en `data/planes_desarrollo/`).
- Extrae para **los 5 PDD (`2012–2015`, `2013–2015`, `2016–2019`, `2020–2023`, `2024–2027`)** y los **3 PDL (`2024–2027`)**:
  - En **`PDD 2012–2015`**: Los 5 Ejes Estratégicos, todas sus Políticas, **todos sus Programas y Subprogramas** (más de 30 programas y 80 subprogramas en las págs. 25–145 del Acuerdo 001), **todas las metas de resultado y de producto** (más de 150 metas cuantificadas con indicador, línea base y meta 2015) y el PPI por Eje/Programa.
  - En **`PDD 2013–2015`**: Los 4 Objetivos Estratégicos, **todas sus Estrategias, Programas y Subprogramas**, el **PPI 2014–2015 desglosado por Estrategia/Programa/Subprograma** de las tablas financieras del Acuerdo 016, y **todas las metas de resultado y de producto** vinculadas a su programa/subprograma.
  - En **`PDD 2016–2019`**: Los 3 Objetivos Estratégicos, las Líneas Estratégicas, **los Programas extraídos del OCR completo de 363 páginas**, el PPI anual 2016–2019 por línea y **todas las metas de resultado y de producto cuantificadas** presentes en las matrices de las páginas 25–339 del Acuerdo 006 de 2016.
  - En **`PDD 2020–2023`**: Los 4 Pilares, 21 Líneas, 87 Programas con su PPI plurianual por línea/programa y todas sus metas de resultado y producto con indicadores completos.
  - En **`PDD 2024–2027`**: Las 6 Líneas Estratégicas, 42 Impulsores, 172 Programas con su PPI plurianual y las 973 metas canónicas únicas enlazadas a su programa.

### Agente 2 — `AgenteReconstructorJerarquicoMGA` (Árbol Programático y Auditoría MGA-DNP)
- Construye y persiste en `seguimiento.pdd_lineas_y_programas` y `seguimiento.pdd_metas_oficiales` el árbol completo (`Plan → Eje/Objetivo/Pilar → Línea/Estrategia → Programa → Subprograma → Meta Resultado → Meta Producto`) con `parent_id` y `linea_id` 100% poblados (`0` huérfanas, `0` títulos de página).
- Audita cada meta contra la doctrina del **Banco de Conocimiento MGA-DNP** (`Resultado/Bienestar` vs. `Producto`, filtro `CREMA`, presencia de Indicador, Unidad, Línea Base y Meta Cuatrienio), calculando el **Índice de Rigor y Profundidad Estratégica MGA** de cada Plan de Desarrollo.
- Ejecuta la **Puerta de Calidad A**.

### Agente 3 — `AgenteTaxonomoSeguridadHumana` (Frontalidad `A/B/C/N` $\times$ `7 Dimensiones PNUD / Decreto 037`)
- Evalúa cada línea, programa, subprograma y meta de **los 5 PDD (incluyendo 2012–2015 y 2013–2015)** bajo la rúbrica de dos ejes:
  - **Grado de Frontalidad (`A` Núcleo Frontal, `B` Determinante Multidimensional Directo, `C` Contextual/Habilitante, `N` No Asociado/Funcionamiento)**.
  - **Prohibido dejar `2012–2015` o `2013–2015` con `A = 0` y `B = 0`:** En `2012–2015` y `2013–2015`, los programas y subprogramas de seguridad ciudadana, convivencia, justicia, derechos humanos, víctimas y gestión del riesgo se clasifican en `A`, y los programas de superación de pobreza, nutrición/seguridad alimentaria, salud pública, hábitat vulnerable y protección de grupos vulnerables se clasifican en `B` (y si en 2012 el PPI solo está desglosado a nivel de Eje o Política/Programa, asigna los montos de los programas o pondera el PPI de cada Eje según la composición programática verificada de sus programas/metas `A`, `B`, `C`, `N`, documentando explícitamente la regla de atribución para que los 5 PDD sean financieramente comparables).
  - Asigna el vector `pesos_7d` en las **7 Dimensiones de Seguridad Humana (`Personal`, `Comunitaria`, `Económica`, `Alimentaria`, `Salud`, `Ambiental`, `Política`)** sumando exactamente `1.00` (`100%`) por cada unidad `A/B`.

### Agente 4 — `AgenteFinancieroPPI` (Conciliación Plurianual, Deflactación DANE 2025 y Cero Doble Conteo)
- Evita cualquier doble conteo padre-hijo (solo suma nodos hoja con presupuesto o pondera desde el padre cuando los hijos no desglosan monto).
- Convierte todas las cifras a **COP corrientes** y a **COP constantes de base 2025 (IPC oficial DANE)**.
- Ejecuta la **Puerta de Calidad B**: verifica matemáticamente que para cada uno de los 5 PDD:
  $$\text{PPI}_A + \text{PPI}_B + \text{PPI}_C + \text{PPI}_N = \text{PPI Total Oficial}$$
  $$\sum_{d=1}^{7} \text{PPI}_{\text{Dimensión } d} = \text{PPI}_A + \text{PPI}_B$$

### Agente 5 — `AgenteEstrategaDiagnosticoPDD` (Síntesis Comparativa de las 4 Preguntas y Publicación Viva)
- Genera el dictamen comparativo integral de los **5 Planes de Desarrollo (2012–2027)** respondiendo con datos completos las **4 preguntas del usuario**:
  1. *¿Qué contemplaba cada Plan de Desarrollo?* (arquitectura completa absorbida de los 5 PDD, programas y metas reales de los 5 periodos).
  2. *¿Cuál fue la apuesta a nivel de Metas y a nivel Financiero/Presupuestal hacia la Seguridad Humana en cada uno de los 5 PDD?* (comparativa real de los 5 planes en `A`, `B`, `C`, `N` y en las `7 Dimensiones`).
  3. *¿Qué Plan de Desarrollo fue más frontal y cuál fue más estratégico en clave de Seguridad Humana?* (comparando Frontalidad Nominal, Frontalidad de Núcleo Duro `A`, Apuesta Ampliada `A+B` y Profundidad de Cadena Estratégica MGA).
  4. *¿Cómo ha sido el abordaje de los problemas de la Seguridad Humana desde la Planeación Estratégica entre 2012 y 2027?*
- Actualiza en vivo **`Matriz_PDM`** (`1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`) y el Google Doc **`Analisis`** (`1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`) con las nuevas cifras completas de los 5 PDD, las 6 gráficas PNG regeneradas a 300 DPI y la trazabilidad de los 5 agentes del motor.

---

## 3. Verificación y Cierre
1. Ejecuta el pipeline completo de los 5 agentes (`ejecutar_sistema_multiagente_pdd_17.py`), verifica que `bd_csh`, `Matriz_PDM` y `Analisis` reflejen las metas y programas extraídos de **los 5 PDD completos (incluyendo 2012, 2013 y 2016)** y que ningún PDD tenga `A=0` ni `B=0`.
2. Ejecuta `ruff check` y `pytest` sobre el nuevo motor multi-agente.
3. Reinicia `polis-backend.service`, registra el reporte en `bridge/02_entrega_codex.md` y haz commit local en `main`.
