# Orden Maestra de Cierre Total de Precisión — `[TRIADA-PDD-CIERRE-TOTAL-10]`

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense EAF:** `agy`
- **Agentes ejecutores:** `codex` (Backend / Base de Datos `bd_csh` / Emparejamiento Semántico / Warmup) y `agy2` (Frontend / Serie Plurianual Completa `2012–2027` sin vacíos).

---

## 1. Nuevos Datos Extraídos por OCR de los Acuerdos Escaneados (`2012–2015` y `2016–2019`)

Ya fueron generados con `tesseract 5.5.0` (`-l spa`) y `pdftoppm` los dos documentos Markdown que faltaban en `/root/polis/data/planes_desarrollo/`:
1. **`pdd_2012_2015_acuerdo_001_campo_para_todos.md` (`75.565` bytes — Acuerdo 001 del 4 de julio de 2012, págs. 155–157):**
   - **Plan Plurianual de Inversiones 2012–2015:** **`$3.049.788.268.000` COP** (`$3.049.788.268 miles` de pesos corrientes):
     - `2012`: `$718.910.382.000` COP
     - `2013`: `$712.219.309.000` COP
     - `2014`: `$787.872.147.000` COP
     - `2015`: `$830.786.430.000` COP
   - **Desglose por los 5 Ejes Oficiales (Página 157):**
     1. `Eje 1. Transversal: Atención a Grupos de Población Diferenciada y por Ciclo Vital`: **`$196.661.713.000` COP** (`2012: $25.243.330.000`, `2013: $41.023.555.000`, `2014: $52.239.485.000`, `2015: $78.155.342.000`).
     2. `Eje 2. Desarrollo Humano`: **`$2.068.532.775.000` COP** (`2012: $519.320.179.000`, `2013: $499.986.467.000`, `2014: $514.945.047.000`, `2015: $534.281.082.000`).
     3. `Eje 3. Desarrollo Económico Incluyente`: **`$179.995.114.000` COP** (`2012: $43.230.907.000`, `2013: $46.138.449.000`, `2014: $48.033.167.000`, `2015: $42.592.591.000`).
     4. `Eje 4. Hábitat, Infraestructura y Sustentabilidad`: **`$434.185.669.000` COP** (`2012: $97.109.185.000`, `2013: $85.464.284.000`, `2014: $119.510.851.000`, `2015: $132.101.349.000`).
     5. `Eje 5. Seguridad Ciudadana y Buen Gobierno`: **`$170.412.997.000` COP** (`2012: $34.006.782.000`, `2013: $39.606.553.000`, `2014: $53.143.596.000`, `2015: $43.656.066.000`).

2. **`pdd_2016_2019_acuerdo_006_primero_la_gente.md` (`70.066` bytes — Acuerdo 006 del 13 de junio de 2016, Tabla 209 pág. 357):**
   - **Plan Plurianual de Inversiones 2016–2019:** **`$4.331.941.000.000` COP** (`$4.331.941 millones` de pesos corrientes):
     - `2016`: `$976.114.000.000` COP
     - `2017`: `$1.033.268.000.000` COP
     - `2018`: `$1.115.477.000.000` COP
     - `2019`: `$1.207.081.000.000` COP
   - **Desglose por los 3 Objetivos Estratégicos Oficiales y sus Líneas Estratégicas (Tabla 209 pág. 357 y págs. 342–357):**
     1. `Objetivo Estratégico 1: Superar la Desigualdad`: **`$3.183.163.000.000` COP (`73%`)** (`Educación para la Gente del Siglo XXI`, `Por una Cartagena con Equidad en Salud`, `Cartagena Ciudad para Invertir`, `Primero la Gente: Infancia, Jóvenes, Mujeres, Adulto Mayor, Cultura y Deporte`).
     2. `Objetivo Estratégico 2: Adaptar el Territorio para la Gente`: **`$852.631.000.000` COP (`20%`)** (`Gestión del Riesgo y Medio Ambiente $101.908 M`, `Desarrollo Urbano, Infraestructura Vial, Espacio Público y Vivienda $750.723 M`).
     3. `Objetivo Estratégico 3: Construir Ciudadanía y Fortalecimiento Institucional`: **`$296.147.000.000` COP (`7%`)** (`Cartagena Sin Miedos $70.158 M`, `Cartagena Territorio de Paz $5.934 M`, `Gestión Pública Local Transparente $10.508 M`, `Participación y Fortalecimiento a la Descentralización $188.639 M`, `Finanzas Sanas y Robustas $17.488 M`).

Con esto, **los 8 Planes (`5 PDD 2012–2027` + `3 PDL 2024–2027`) tienen el 100% de su Plan Plurianual de Inversiones (PPI) oficial extraído de fuente primaria (`ppi_estado = "OFICIAL_EXTRAIDO"` en los 8 planes)**.

---

## 2. Los 4 Cierres Técnicos Obligatorios

### A. `codex` — `[TRIADA-BACKEND-CIERRE-TOTAL-10]`
1. **Actualizar `backend/scripts/sincronizar_catalogo_pdd.py` y `backend/app/modules/compromisos/pdd_dea_service.py` con el 100% de los PPI extraídos por OCR (`PDD_2012_2015` y `PDD_2016_2019`):**
   - Incorporar `PDD_2012_2015` (`$3.049.788.268.000` COP y sus 5 Ejes) y `PDD_2016_2019` (`$4.331.941.000.000` COP y sus 3 Objetivos + Líneas) desde `pdd_2012_2015_acuerdo_001_campo_para_todos.md` y `pdd_2016_2019_acuerdo_006_primero_la_gente.md`.
   - Ningún plan debe quedar con `ppi_total_corriente_cop = null` ni `ppi_estado = "NO_EXTRAIDO_DE_FUENTE_DIGITAL"`: los **8 planes (`5 PDD + 3 PDL`) deben tener `ppi_estado = "OFICIAL_EXTRAIDO"`** y su conversión a pesos constantes 2025.
2. **Emparejamiento Semántico + Entidad + Indicador para `seguimiento.pdd_metas_oficiales`:**
   - En `sincronizar_catalogo_pdd.py`, además del cruce por código exacto, implementa un emparejador determinístico por `(plan/periodo, entidad_normalizada, tokens significativos de indicador/meta)` contra `seguimiento.registros_triada_normalizados` para elevar drásticamente las metas oficiales vinculadas con ejecución en `bd_csh` (guardando el `registro_triada_id` o metadato de enlace y el tipo de emparejamiento: `CODIGO_EXACTO`, `INDICADOR_ENTIDAD` o `SEMANTICO_LINEA`).
3. **Normalización 100% Canónica de `linea_estrategica` en `cumplimiento-metas` y `frontera_por_linea_estrategica`:**
   - Prohibido devolver nombres de columnas (`"# DE VIVIENDAS ENTREGADAS"`, `"2018 Junio"`, `"FORMATO PLAN ACCION"`, `"PLAN ACCION IPCC 2019"`) como si fueran Líneas Estratégicas.
   - Clasifica cada fila de `PLAN_DESARROLLO` en una de las **Líneas Estratégicas Canónicas de su Plan** (las 6 Líneas/Capítulos de `2024–2027`, los 4 Pilares / Líneas de `2020–2023`, las Líneas/Objetivos de `2016–2019`) mediante un clasificador léxico determinístico sobre `linea_estrategica`, `datos_origen`, `indicador`, `descripcion_actividad` y `entidad_normalizada`. Si una fila no contiene ninguna pista temática ni entidad sectorial, agrúpala bajo `"Línea Transversal / Fortalecimiento Institucional"` del respectivo plan, para que `lineas_estrategicas` y `frontera_por_linea_estrategica` muestren únicamente las Líneas Oficiales del Acuerdo.
4. **Precalentamiento Automático (Warmup) y Caché Persistente en Disco (`/tmp/polis_pdd_dea_cache_v10.json`):**
   - Para que las 6 rutas `/api/v1/compromisos/triada/pdd-dea/*` respondan en **`< 50 ms` incluso tras reiniciar workers**, guarda y carga el resultado precalculado en un archivo de caché local versionado (`/tmp/polis_pdd_dea_cache_v10.json`, además de `_RESULT` en memoria) y genera ese archivo desde `sincronizar_catalogo_pdd.py` (o al primer cálculo) para que ambos workers de `uvicorn` sirvan las 6 rutas en `< 50 ms` desde el primer request.

### B. `agy2` — `[TRIADA-FRONTEND-CIERRE-TOTAL-10]`
1. **Actualizar `src/features/seguimiento/data/pdd-dea-cartagena.data.ts` y `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`:**
   - Incorporar los **techos oficiales recién extraídos por OCR** para que los **5 Planes Distritales (`2012–2027`) y 3 Planes Locales (`PDL 2024–2027`) tengan el 100% de sus cifras PPI oficiales (`OFICIAL_EXTRAIDO`)**:
     - `PDD_2012_2015` («Campo para Todos» — Acuerdo 001/2012): **`$3.049.788.268.000` COP** (`2012: $718.910,38 M`, `2013: $712.219,31 M`, `2014: $787.872,15 M`, `2015: $830.786,43 M`) y sus **5 Ejes Oficiales** (`Eje 1 Población Diferenciada $196.661,71 M`, `Eje 2 Desarrollo Humano $2.068.532,78 M`, `Eje 3 Desarrollo Económico $179.995,11 M`, `Eje 4 Hábitat e Infraestructura $434.185,67 M`, `Eje 5 Seguridad Ciudadana y Buen Gobierno $170.413,00 M`).
     - `PDD_2016_2019` («Primero la Gente» — Acuerdo 006/2016, Tabla 209): **`$4.331.941.000.000` COP** (`2016: $976.114 M`, `2017: $1.033.268 M`, `2018: $1.115.477 M`, `2019: $1.207.081 M`) y sus **3 Objetivos Estratégicos** (`1. Superar la Desigualdad $3.183.163 M [73%]`, `2. Adaptar el Territorio para la Gente $852.631 M [20%]`, `3. Construir Ciudadanía y Fortalecimiento Institucional $296.147 M [7%]`).
   - Actualizar la **conciliación histórica de `PDD_2016_2019`**: ahora que tenemos el techo oficial de `$4,3319 billones COP` frente a los `$4,6034 billones COP` reconstruidos en `bd_csh`, el factor de sobredimensionamiento de `2016–2019` es **`1,06x` (`+6,27%`)**, completando la serie histórica de conciliación `2012–2027`.
   - Mostrar en el **Explorador de Líneas y Metas Oficiales** el indicador de **Emparejamiento Semántico (`Metas del Acuerdo vinculadas con ejecución en bd_csh`)** y las Líneas Estratégicas 100% canónicas de los 5 PDD y 3 PDL.
2. **Actualizar `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`:**
   - Añadir pruebas que verifiquen explícitamente el PPI OCR de `PDD_2012_2015` (`$3.049.788.268.000` COP) y `PDD_2016_2019` (`$4.331.941.000.000` COP), que los 8 planes tengan `ppi_estado === 'OFICIAL_EXTRAIDO'` y que las Líneas Estratégicas sean 100% canónicas (`>= 35` tests en verde).
