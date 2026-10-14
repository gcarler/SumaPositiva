# ORDEN DE TRABAJO EAF — `[TRIADA-BACKEND-DRIVE-8DIM-04]`

- **Para:** `codex` (Desarrollador Backend / Arquitectura)
- **De:** `agy` (Coordinador General / Auditor Forense EAF)
- **Prioridad:** CRÍTICA — DESCARGA E INGESTA MASIVA EN BACKEND DE LA CARPETA GOOGLE DRIVE DEL USUARIO (`1.383` ARCHIVOS / `8` DIMENSIONES DE SEGURIDAD HUMANA + `3` PERIODOS DE GOBIERNO `2018–2026`)
- **Rama:** `main` (Política Zero-Push: solo commits locales, nunca `git push`)
- **Inviolabilidad de `bd_csh`:** PROHIBIDO truncar o alterar los registros canónicos existentes (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).

---

## 1. Contexto y Mandato Directo del Usuario

El usuario nos acaba de entregar la carpeta maestra de Google Drive con todos los Planes de Acción organizados por las **8 Dimensiones de Seguridad Humana** y por **Periodos de Gobierno**:
- **URL Drive:** `https://drive.google.com/drive/folders/12B61xeQC9rQNxImItMTVBqHFx2F5Cl9e?usp=drive_link`
- **Mensaje del usuario:** *«en esta carpeta estan los ples de acción https://drive.google.com/drive/folders/12B61xeQC9rQNxImItMTVBqHFx2F5Cl9e?usp=drive_link Carpetas con planes por dimensión»*

Ya rastreé las **129 subcarpetas** y los **1.383 archivos** de esa carpeta de Google Drive y dejé el inventario completo listo en **`/tmp/drive_inventory.json`** (cópialo y versiona el catálogo limpio en `/root/polis/data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json`).

### Estructura real descubierta en `/tmp/drive_inventory.json` (`1.383` entradas en `129` carpetas):
1. **Las 8 Carpetas por Dimensión de Seguridad Humana (`824` archivos):**
   - `1. Seguridad Personal` (`89` archivos)
   - `2. Seguridad Comunitaria` (`140` archivos)
   - `3. Seguridad Económica` (`157` archivos)
   - `4. Seguridad Alimentaria` (`80` archivos)
   - `5. Seguridad Sanitaria` (`68` archivos)
   - `6. Seguridad Ambiental` (`88` archivos)
   - `7. Seguridad Política` (`109` archivos)
   - `8. Crisis` (`93` archivos)
2. **Las 3 Carpetas por Periodo de Gobierno (`559` archivos):**
   - `Periodo Antes de 2020` (`61` archivos: `2018` y `2019`, formulados y seguimiento)
   - `Periodo 2020 - 2023` (`249` archivos: `2020`, `2021`, `2022`, `2023` por cortes trimestrales/anuales + PDF del PDD 2020–2023)
   - `Periodo 2024 - 2027` (`249` archivos: `2024`, `2025`, `2026` por cortes trimestrales `1. Enero - Marzo`, `2. Abril - Junio`, `3. Julio - Septiembre`, `4. Octubre - Diciembre` + PDF del PDD 2024–2027)
3. **Relación crucial entre Dimensiones y Periodos (Deduplicación Inteligente con Múltiples Etiquetas de Dimensión):**
   - Un mismo libro Excel (por ejemplo, `PLAN DE ACCION 2020 DISTRISEGURIDAD - AJUSTADO.xls` o los planes de `DADIS`, `DATT`, `SEC-INTERIOR`, `EPA`, `IDER`, `CORVIVIENDA`, `PES-PR`, etc.) aparece ubicado en **una o varias carpetas de las 8 Dimensiones** (`1. Seguridad Personal`, `7. Seguridad Política`, `8. Crisis`, etc.) y además en su carpeta de **Periodo (`Periodo Antes de 2020`, `Periodo 2020 - 2023`, `Periodo 2024 - 2027`)**.
   - Todos los archivos tienen descarga directa HTTP 200 sin autenticación mediante `https://drive.google.com/uc?export=download&id=<file_id>`.

---

## 2. Alcance Técnico Obligatorio en el Backend

### A. Descargador Concurrente e Inteligente desde Google Drive + Ingesta con Dimensiones de Seguridad Humana
1. **Conservar y enriquecer Metadatos de Dimensión y Periodo:**
   - Cuando un libro binario (`.xlsx`, `.xls`, `.csv`) se descarga o se ingiere desde una estructura de carpetas por dimensión o desde el catálogo de Google Drive:
     - Agrupa las entradas del inventario de Drive (`/tmp/drive_inventory.json`) o las rutas relativas de carpeta para que **cada libro único (por contenido binario `SHA-256` o por nombre canónico + vigencia + corte)** conserve:
       - `dimensiones_seguridad_humana`: lista ordenada de todas las dimensiones a las que pertenece según las carpetas donde está clasificado (ej. `["1. Seguridad Personal", "7. Seguridad Política", "8. Crisis"]`).
       - `periodo_gobierno`: `"ANTES_2020"` (`2016–2019`), `"2020_2023"`, o `"2024_2027"`.
       - `rutas_drive`: lista de las rutas de carpetas en Drive donde aparece e IDs de Drive (`drive_file_ids`).
   - Guarda estos campos en `ArchivoPlanIngerido.metadatos` y en `RegistroTriadaNormalizado.datos_origen` (o clave dedicada dentro de `datos_origen["_dimensiones_seguridad"]`), de modo que el backend pueda **filtrar, agregar y cruzar los 3 motores por cualquiera de las 8 Dimensiones de Seguridad Humana** (`1. Seguridad Personal` .. `8. Crisis`) y por **Periodo de Gobierno** (`2018–2019`, `2020–2023`, `2024–2027`).
2. **Descarga Masiva e Ingesta Real del Corpus de Google Drive en `bd_csh`:**
   - Crea un script/servicio reproducible (`backend/scripts/sincronizar_drive_planes_accion.py`) que tome `/root/polis/data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json` (copiado de `/tmp/drive_inventory.json`):
     - Descargue con concurrencia controlada (`asyncio` / `ThreadPoolExecutor` con reintentos) los libros Excel (`.xlsx`, `.xls`) únicos del Drive hacia `/root/polis/data/planes_accion/drive_sector_seguridad/archivos/` (excluyendo este directorio pesado de binarios de Git con `.gitignore` para no inflar el repositorio con cientos de megabytes, pero **dejando versionado el catálogo JSON completo de los 1.383 archivos con sus IDs, rutas, dimensiones y hashes SHA-256**).
     - Nota sobre archivos sin extensión explícita en el nombre pero etiquetados `Microsoft Excel` en `raw_label`: hay 6 archivos en Drive cuyo nombre termina en `... Microsoft` sin `.xlsx` (ej. `... junio 2025 Microsoft`); detéctalos por magic bytes (`PK\x03\x04` -> `.xlsx`, `\xd0\xcf\x11\xe0` -> `.xls`) al descargarlos para que el motor los procese sin perder ni uno solo.
     - Ejecute la ingesta masiva en PostgreSQL (`bd_csh`) bajo el origen `GOOGLE_DRIVE_SECTOR_SEGURIDAD`, persistiendo todos los libros descargados, sus hojas, sus decenas/cientos de miles de registros normalizados en los **3 motores (`PLAN_DESARROLLO`, `PLAN_ACCION`, `INVERSION_PRESUPUESTAL`)** y su asociación con las **8 Dimensiones de Seguridad Humana**.
     - *(Si algún archivo puntual de Drive está corrupto de origen o es un PDF, regístralo honestamente en el resumen del lote sin abortar la ingesta de los demás libros).*

### B. Ampliación de Endpoints y Analítica por Dimensión de Seguridad Humana (`backend/app/modules/compromisos/`)
1. **Ampliar `GET /api/v1/compromisos/triada/comparativa-interanual` y `GET /api/v1/compromisos/triada/lotes`:**
   - Añade el parámetro opcional `dimension: str | None = Query(None, max_length=120)` y `periodo: str | None = Query(None, max_length=40)` para poder filtrar los archivos, las series `2018–2026` y los cruces de los 3 motores por cualquiera de las **8 Dimensiones de Seguridad Humana** (p. ej. `1. Seguridad Personal`, `2. Seguridad Comunitaria`, `3. Seguridad Económica`, `4. Seguridad Alimentaria`, `5. Seguridad Sanitaria`, `6. Seguridad Ambiental`, `7. Seguridad Política`, `8. Crisis`).
2. **Nuevo bloque en `GET /api/v1/compromisos/triada/resumen` (y/o `GET /api/v1/compromisos/triada/dimensiones`):**
   - Devuelve el **Resumen por las 8 Dimensiones de Seguridad Humana y los 3 Periodos (`Antes de 2020`, `2020–2023`, `2024–2027`)**:
     - Cuántos archivos del Drive y cuántos registros normalizados (en `PLAN_DESARROLLO`, `PLAN_ACCION` e `INVERSION_PRESUPUESTAL`) tiene cada una de las 8 dimensiones (`1. Seguridad Personal` a `8. Crisis`).
     - Qué entidades/secretarías participan en cada dimensión y cuál es su cobertura interanual (`2018` a `2026`).
3. **Soporte automático de carpetas por dimensión en `POST /api/v1/compromisos/triada/ingerir-directorio` e `ingerir-archivos`:**
   - Si el archivo proviene de una subcarpeta o ruta dentro de un `.zip` que mencione alguna de las 8 dimensiones (`Seguridad Personal`, `Seguridad Comunitaria`, `Seguridad Económica`, `Seguridad Alimentaria`, `Seguridad Sanitaria`, `Seguridad Ambiental`, `Seguridad Política`, `Crisis`), el parser `ingesta_masiva_excel.py` debe inferir y asignar automáticamente esa dimensión en los metadatos del archivo y de sus filas normalizadas.

---

## 3. Pruebas Automatizadas y Quality Gates

1. Añade pruebas en `backend/tests/test_ingesta_masiva_triada.py` que verifiquen:
   - Inferencia automática de las **8 Dimensiones de Seguridad Humana** y de los **3 Periodos de Gobierno** desde las rutas de carpetas (tanto en `.zip` con carpetas por dimensión como en el catálogo de Google Drive).
   - Detección por *magic bytes* (`PK\x03\x04` para `.xlsx` y `\xd0\xcf\x11\xe0` para `.xls`) cuando el nombre del archivo en Drive no trae extensión `.xlsx`/`.xls`.
   - Filtrado por `dimension` y `periodo` en `GET /api/v1/compromisos/triada/comparativa-interanual` y conteo por las 8 dimensiones en `GET /api/v1/compromisos/triada/resumen`.
2. Ejecuta la sincronización e ingesta real contra `bd_csh`, reinicia `polis-backend.service`, verifica que los 7 conteos canónicos de `bd_csh` sigan intactos, corre `ruff check`, `pytest` y `bun test`, haz commit local en `main` y reporta las cifras exactas en `bridge/02_entrega_codex.md`.
