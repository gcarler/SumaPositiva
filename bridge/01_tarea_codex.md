# ORDEN DE TRABAJO EAF — `[TRIADA-BACKEND-INGESTA-MASIVA-03]`

- **Para:** `codex` (Desarrollador Backend / Arquitectura)
- **De:** `agy` (Coordinador General / Auditor Forense EAF)
- **Prioridad:** CRÍTICA — FOCO 100% EN BACKEND DE PROCESAMIENTO MASIVO DE PLANES DE ACCIÓN (`2016–2026`), PLAN DE DESARROLLO (`PDD`) E INVERSIÓN (`POAI/BPIM`)
- **Rama:** `main` (Política Zero-Push: solo commits locales, nunca `git push`)
- **Inviolabilidad de `bd_csh`:** PROHIBIDO truncar o alterar los registros canónicos existentes (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).

---

## 1. Contexto y Mandato Directo del Usuario

El usuario fue explícito:
> *«no me interesa tanto el forntend como el backend.... necesito que el pueda procesar toda esa cantidad de plaes de acción»*

En `[TRIADA-BACKEND-01]` dejaste una base en memoria sobre JSON (`HojaExcelEntrada`), pero el backend hoy **NO procesa archivos binarios reales (`.xlsx`, `.xls`, `.csv`, `.zip` con decenas de libros Excel de múltiples vigencias y secretarías)**, ni escanea encabezados desplazados por membretes/logos institucionales (filas 1 a 15 combinadas), ni clasifica automáticamente las hojas de un mismo libro hacia los **3 motores (Plan de Desarrollo, Plan de Acción y Ejecución Presupuestal)**, ni persiste en PostgreSQL los lotes masivos para consulta interanual `2016–2026`.

Ya instalé `openpyxl==3.1.5` y `xlrd==2.0.2` tanto en `/root/polis/venv` como en `backend/pyproject.toml`.

---

## 2. Inventario Real Extraído de `https://www.cartagena.gov.co/Transparencia/Planeación?categoria=52`

Del rastreo completo de las 7 páginas históricas de Transparencia de la Alcaldía de Cartagena (`2016–2026`), el motor debe soportar y catalogar explícitamente la estructura real publicada:

1. **Vigencias `2016–2019` (`PA_MONOHOJA_2016_2019`):**
   - Libros `.xls` (BIFF8 legacy) o `.xlsx` de **1 sola hoja útil por entidad**, con membrete institucional en las primeras 4–10 filas (celdas combinadas: *"ALCALDÍA MAYOR DE CARTAGENA DE INDIAS — PLAN DE ACCIÓN..."*) y una única tabla plana donde conviven meta, indicador, actividad, programación anual y presupuesto.
2. **Vigencias `2020–2023` (`PA_HIBRIDO_2020_2023` — *"Salvemos Juntos a Cartagena"*):**
   - Nodos reales como `/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2020` (**40 archivos `.xls` y `.xlsx`** ajustados) y `2021–2023`.
   - Libros multihoja donde las pestañas se dividen por **pilares del PDD** (*"Cartagena Incluyente"*, *"Cartagena Resiliente"*, *"Cartagena Contingente"*, *"Cartagena Transparente"*) y el avance se reporta por trimestres (`T1`–`T4` o `I Trimestre`–`IV Trimestre`).
3. **Vigencias `2024–2026` (`PA_MULTIHOJA_2024_2026` — *"Cartagena, Ciudad de Derechos"*):**
   - Nodos reales:
     - `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-2024-formulado` (**21 archivos `.xlsx`**)
     - `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2025`
     - `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026` (**23 archivos `.xlsx` y `.xls`** como `DADIS.xls`, `SECRETARÍA DE PLANEACION.xlsx`, `SECRETARIA DE HACIENDA.xlsx`, `SEC_EDUCACION.xlsx`, `INFRAESTRUCTURA.xlsx`, `DISTRISEGURIDAD.xlsx`, `DATT.xlsx`, `EPA.xlsx`, `IDER.xlsx`, `IPCC.xlsx`, `CORVIVIENDA.xlsx`, `TRANSCARIBE.xlsx`, `OAGR.xlsx`, `PES-PR.xlsx`, `ESPACIO PUBLICO`, `VALORIZACION`, `TURISMO`, `ESCUELA DE GOBIERNO`, `IDACCC`, `SPDS - UMATA`, `UMAYOR`, `SICC`, `SECRETARIA GENERAL`).
     - Cortes trimestrales reales: `seguimientos-planes-accion-corte-31-marzo-2026` y `seguimientos-planes-accion-corte-30-junio-2026` (**24 archivos `.xlsx`**, incluyendo `Matriz de seguimiento PDD 2024 - 2027.xlsx` + 22 archivos por dependencia como `Consolidado Plan de Acción 2026 II TRIMESTRE - SEPLANEACION.xlsx`, `Consolidado Plan de Acción 2026 II TRIMESTRE - SEHACIENDA.xlsx`, `Consolidado Plan de Acción 2026 II TRIMESTRE - DADIS.xlsx`, etc.).

---

## 3. Alcance Técnico Obligatorio en el Backend

### A. Lector Binario Polimórfico y Procesador de Lotes (`backend/app/modules/compromisos/ingesta_masiva_excel.py`)
Construye un módulo industrial en Python capaz de recibir:
1. **Un archivo binario individual** (`.xlsx`, `.xls`, `.csv`) o
2. **Un archivo `.zip` masivo** (con decenas o cientos de archivos `.xlsx`/`.xls`/`.csv` organizados o no en subcarpetas por año/entidad) o
3. **Una ruta de directorio local dentro del workspace** (p. ej. `/root/polis/data/planes_accion`) para procesar lotes completos en bloque.

El motor de lectura binaria debe implementar:
- **Apertura real de binarios:**
  - `.xlsx` con `openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True, read_only=True)`
  - `.xls` (formato antiguo 97-2003, como `DADIS.xls` o los planes de 2016–2020) con `xlrd.open_workbook(file_contents=raw_bytes)`
  - `.csv` con autodetección de codificación (`utf-8-sig`, `latin-1`) y delimitador (`,`, `;`, `\t`)
  - `.zip` iterando recursivamente cada miembro `.xlsx`/`.xls`/`.csv` válido (ignorando `__MACOSX` o temporales `~$`), con protección anti-Zip-Bomb (límite razonable de archivos y bytes descomprimidos).
- **Escáner Heurístico de Fila de Encabezados (`Header Row Finder`):**
  - En los Excel reales de la Alcaldía de Cartagena, la fila 1 **casi nunca** es el encabezado de la tabla (suele haber entre 3 y 15 filas superiores con el escudo de Cartagena, nombre de la secretaría, código de formato SIG, fecha de versión y celdas combinadas).
  - Para cada hoja del libro, escanea las primeras `25` filas no vacías y puntúa cada fila según cuántas celdas coinciden con el diccionario ampliado de sinónimos de los 3 motores (`SINONIMOS_COLUMNAS`). Selecciona automáticamente la fila con mayor puntaje como **fila de encabezados real** y extrae las filas de datos a partir de la fila siguiente, descartando filas vacías, subtotales o pies de firma.
- **Inferencia Automática de Metadatos Institucionales:**
  - Extrae y normaliza la **Entidad/Dependencia** (tanto del nombre del archivo, p. ej. `Consolidado Plan de Acción 2026 II TRIMESTRE - SEPLANEACION.xlsx` -> `"Secretaría de Planeación"`, como de celdas de membrete o columna `Dependencia`/`Entidad`, mapeando siglas como `DADIS`, `DATT`, `EPA`, `IDER`, `IPCC`, `OAGR`, `PES-PR`, `SEHACIENDA`, `SEPLANEACION`, `SEC_EDUCACION`, `SPDS - UMATA`, `IDACCC`, `UMAYOR`, `SICC` al nombre canónico oficial).
  - Extrae la **Vigencia (`2016`–`2027`)** y el **Corte Trimestral (`FORMULADO`, `T1`, `T2`, `T3`, `T4`, `ANUAL`)** desde el nombre del archivo, ruta de carpeta del `.zip` o contenido de la hoja.
- **Enrutamiento de cada Hoja y Fila hacia los 3 Motores (`Motor Clasificador Tripartito`):**
  Cada hoja útil del libro se clasifica y alimenta automáticamente uno o varios de los 3 motores:
  1. **Motor 1 — Plan de Desarrollo (`MOTOR_PLAN_DESARROLLO`):** Hojas tipo `Matriz de seguimiento PDD`, `Plan Indicativo`, `Metas Producto PDD`, `Líneas Estratégicas`. Extrae `codigo_meta_pdd`, `linea_estrategica`, `programa`, `indicador`, `linea_base`, `meta_cuatrienio`, `avance_estrategico_pct`, `codigo_bpim`.
  2. **Motor 2 — Plan de Acción (`MOTOR_PLAN_ACCION`):** Hojas tipo `Plan de Acción`, `Seguimiento Trimestral`, pilares `Cartagena Resiliente/Incluyente/...`, o monohoja `2016–2019`. Extrae `codigo_meta_pdd`, `codigo_bpim`, `descripcion_actividad`, evaluación lingüística DNP (`verbo_fuerte_dnp`, `verbo_detectado`), `meta_programada_anual`, `meta_ejecutada_anual`, `avance_t1..t4`, `avance_operativo_fisico_pct`, `presupuesto_apropiado`, `presupuesto_ejecutado`.
  3. **Motor 3 — Inversión y Ejecución Presupuestal (`MOTOR_INVERSION_PRESUPUESTAL`):** Hojas tipo `Ejecución Presupuestal`, `POAI`, `Proyectos de Inversión`, `Ficha EBI / BPIM`. Extrae `codigo_bpim`, `proyecto_nombre`, `fuente_financiacion`, `apropiacion_inicial_cop`, `apropiacion_definitiva_cop`, `cdp_cop`, `compromisos_rp_cop`, `obligaciones_cop`, `pagos_tesoreria_cop`.
  - *(Nota crucial: en formatos `PA_MONOHOJA_2016_2019` o consolidados donde una misma fila trae meta PDD + actividad PA + presupuesto apropiado/ejecutado, esa fila puede alimentar simultáneamente la lectura operativa del Motor 2 y la lectura financiera/estratégica para que el cruce de las 3 lecturas funcione de extremo a extremo).*

### B. Persistencia en PostgreSQL — Migración Alembic `0063_motor_ingesta_masiva_triada.py` y Modelos SQLAlchemy
Crea la migración `backend/alembic/versions/0063_motor_ingesta_masiva_triada.py` (con `down_revision = "0062_motor_plan_accion_dnp"`) y registra los modelos en `backend/app/modules/compromisos/models.py`:
1. Tabla `seguimiento.lotes_ingesta_planes` (`LoteIngestaPlan`):
   - `id` (UUID PK), `codigo_lote` (String único), `origen` (`UPLOAD_ARCHIVO`, `UPLOAD_ZIP_MASIVO`, `DIRECTORIO_LOCAL`, `SEMILLA_TRANSPARENCIA`), `total_archivos` (int), `archivos_exitosos` (int), `archivos_con_error` (int), `total_hojas_procesadas` (int), `total_registros_normalizados` (int), `resumen_motores` (JSONB), `creado_en` (DateTime).
2. Tabla `seguimiento.archivos_plan_ingeridos` (`ArchivoPlanIngerido`):
   - `id` (UUID PK), `lote_id` (FK a `lotes_ingesta_planes.id`), `nombre_archivo` (String), `formato_extension` (`xlsx`, `xls`, `csv`), `hash_sha256` (String indexado para idempotencia/deduplicación), `perfil_detectado` (`PA_MONOHOJA_2016_2019`, `PA_HIBRIDO_2020_2023`, `PA_MULTIHOJA_2024_2026`, `MATRIZ_PDD_2024_2027`, `EJECUCION_PRESUPUESTAL_HACIENDA`, `PA_CANONICO_DNP_POLIS`), `confianza_deteccion` (Numeric), `vigencia` (int), `corte_periodo` (String), `entidad_normalizada` (String indexado), `hojas_analizadas` (JSONB), `mapeo_columnas` (JSONB), `filas_extraidas` (int), `metadatos` (JSONB), `creado_en` (DateTime).
3. Tabla `seguimiento.registros_triada_normalizados` (`RegistroTriadaNormalizado`):
   - `id` (UUID PK), `archivo_id` (FK a `archivos_plan_ingeridos.id` ON DELETE CASCADE), `lote_id` (FK a `lotes_ingesta_planes.id` ON DELETE CASCADE), `motor_destino` (`PLAN_DESARROLLO`, `PLAN_ACCION`, `INVERSION_PRESUPUESTAL`, indexado), `vigencia` (int indexado), `corte_periodo` (String), `entidad_normalizada` (String indexado), `linea_estrategica` (String), `codigo_meta_pdd` (String indexado), `codigo_bpim` (String indexado), `indicador` (Text), `descripcion_actividad` (Text), `verbo_fuerte_dnp` (Boolean), `verbo_detectado` (String), `meta_programada_anual` (Numeric), `meta_ejecutada_anual` (Numeric), `avance_t1` (Numeric), `avance_t2` (Numeric), `avance_t3` (Numeric), `avance_t4` (Numeric), `avance_fisico_pct` (Numeric), `avance_estrategico_pct` (Numeric), `apropiacion_definitiva_cop` (Numeric), `cdp_cop` (Numeric), `compromisos_rp_cop` (Numeric), `obligaciones_cop` (Numeric), `pagos_tesoreria_cop` (Numeric), `hoja_origen` (String), `fila_origen_num` (int), `datos_origen` (JSONB), `creado_en` (DateTime).
4. **Corpus Real Multiformato en Disco (`/root/polis/data/planes_accion/muestras_reales_cartagena/`):**
   - Crea un generador determinístico y ejecútalo para dejar en `/root/polis/data/planes_accion/muestras_reales_cartagena/` (y/o sembrar en la migración `0063`) un lote realista de libros binarios `.xlsx` y `.xls` que reproduzcan fielmente los formatos reales de la Alcaldía de Cartagena a través de una década (`2016` monohoja con membrete desplazado, `2020` híbrido por pilares, `2024` formulado, `2026` multihoja de varias secretarías como `DADIS`, `SEPLANEACION`, `SEHACIENDA`, `DISTRISEGURIDAD`, `INFRAESTRUCTURA`, más `Matriz_Seguimiento_PDD_2024_2027.xlsx` y `Ejecucion_Presupuestal_Agosto_2026.xlsx`), de modo que la base de datos `bd_csh` quede precargada con decenas de registros normalizados de los 3 motores y el procesador de directorio/ZIP pueda demostrarse en vivo con archivos binarios reales.

### C. Nuevos Endpoints Backend de Ingesta Masiva y Consulta Consolidada (`backend/app/modules/compromisos/router.py`)
Agrega y documenta los siguientes endpoints (y regístralos en `docs/permisos-api.md` y `backend/tests/test_access_policy.py`):
1. `POST /api/v1/compromisos/triada/ingerir-archivos` (Protegido con `requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada")` y `verificar_escritura_fase("FASE_3_PLAN_ACCION", ...)`):
   - Acepta `multipart/form-data` con múltiples archivos (`files: list[UploadFile]`) que pueden ser `.xlsx`, `.xls`, `.csv` o un archivo `.zip` con decenas de libros Excel.
   - Parámetros opcionales de formulario/query: `vigencia_por_defecto: int | None`, `corte_por_defecto: str | None`, `persistir: bool = True`.
   - Procesa todos los libros en lote, detecta formato y fila de encabezado de cada hoja, normaliza las filas hacia los 3 motores, persiste en PostgreSQL (con deduplicación o actualización limpia por `hash_sha256` si se re-sube el mismo archivo), ejecuta automáticamente el **Cruce de las 3 Lecturas** sobre los datos ingeridos y devuelve el diagnóstico completo del lote (`codigo_lote`, archivos procesados, hojas clasificadas por motor, conteo de registros en cada motor, comparativa interanual `2016–2026` y semáforos de coherencia tripartita).
2. `POST /api/v1/compromisos/triada/ingerir-directorio` (Protegido con `requerir_permiso("seguimiento:gestionar", nivel_minimo="declarada")`):
   - Permite disparar el procesamiento masivo de todos los archivos `.xlsx`/`.xls`/`.csv`/`.zip` depositados en `/root/polis/data/planes_accion` (o subcarpeta relativa autorizada bajo `/root/polis/data/planes_accion`, validando estrictamente que no haya *path traversal* `..`), ideal para cuando se descargan 50 o 100 planes de acción al servidor y se quieren procesar todos de una sola vez.
3. `GET /api/v1/compromisos/triada/lotes` (Público, transparencia activa):
   - Lista los lotes ingeridos, los archivos `.xlsx`/`.xls` procesados por vigencia (`2016–2026`) y entidad, los perfiles detectados y las métricas de cobertura de los 3 motores desde PostgreSQL.
4. `GET /api/v1/compromisos/triada/comparativa-interanual` (Público, transparencia activa):
   - Devuelve la serie comparativa estandarizada desde PostgreSQL (`seguimiento.registros_triada_normalizados`) filtrable por `entidad`, `linea_estrategica`, `codigo_bpim`, `motor` y rango de `vigencia_desde`/`vigencia_hasta` (`2016–2026`), mostrando cómo evoluciona cada entidad a pesar de que el formato Excel haya cambiado de monohoja (2016) a híbrido (2020) y a multihoja (2024–2026), más el cruce en vivo de las 3 lecturas (Estratégica PDD vs. Operativa Plan de Acción vs. Presupuestal RP/Pagos).
5. **Actualiza `GET /api/v1/compromisos/triada/resumen`:**
   - Para que combine las tablas existentes (`compromisos_pas`, `actividades_plan_accion`) con los registros reales persistidos en `seguimiento.registros_triada_normalizados` y el inventario completo `2018–2026` de Transparencia Cartagena (incluyendo las URLs históricas reales de 2018, 2020, 2024, 2025 y 2026).

---

## 4. Pruebas Automatizadas y Quality Gates Obligatorios

1. En `backend/tests/test_triada_motores.py` (o `backend/tests/test_ingesta_masiva_triada.py`), escribe pruebas exhaustivas que creen en memoria **archivos binarios reales** `.xlsx` (con `openpyxl`), `.xls` (o estructuras equivalentes) y un archivo `.zip` que contenga múltiples libros de distintas épocas (`2016` monohoja con 6 filas de membrete institucional antes del encabezado, `2020` con hojas por pilares, `2026` con múltiples hojas incluyendo `Plan Indicativo`, `Plan de Acción T1-T4` y `Ejecución Presupuestal`), los envíen a `POST /api/v1/compromisos/triada/ingerir-archivos`, verifiquen la detección de encabezados desplazados, la normalización de los 3 motores, la persistencia y el cruce de las 3 lecturas.
2. Aplica la migración `0063` en `bd_csh` (`alembic upgrade head`) y verifica que `bd_csh` conserve intactos todos sus conteos canónicos.
3. Ejecuta:
   - `/root/polis/venv/bin/ruff check backend`
   - `/root/polis/venv/bin/pytest backend/tests/test_triada_motores.py backend/tests/test_access_policy.py`
   - Suite completa de `pytest` y `bun test`.
4. Haz commit local en `main` y escribe tu informe detallado en `bridge/02_entrega_codex.md`.
