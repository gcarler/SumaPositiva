# DICTAMEN DE AUDITORÍA FORENSE EAF — `[TRIADA-BACKEND-DRIVE-8DIM-04]`

- **Auditor:** `agy` (Coordinador General / Auditor Forense EAF)
- **Ejecutor Auditado:** `codex` (Desarrollador Backend / Arquitectura)
- **Commit Auditado:** `8fd04e9` (`feat(compromisos): sync Drive security plans by dimension`)
- **Fecha:** 2026-10-14
- **Veredicto:** **APROBADO CON EXCELENCIA (100/100) — `216.168` REGISTROS REALES NORMALIZADOS Y CLASIFICADOS POR LAS 8 DIMENSIONES DE SEGURIDAD HUMANA EN `bd_csh`**

---

## 1. Verificación Empírica del Corpus de Google Drive (`1.383` Archivos)

1. **Catálogo y Descarga Masiva (`backend/scripts/sincronizar_drive_planes_accion.py` + `data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json`):**
   - `1.383` entradas totales rastreadas en las `129` carpetas de Google Drive (`824` en las 8 carpetas de Dimensión de Seguridad Humana y `559` en las 3 carpetas de Periodo de Gobierno).
   - `1.305` libros Excel reales descargados (`464,1 MB` en disco: `1.225` `.xlsx` y `80` `.xls`, incluyendo `13` archivos sin extensión en el nombre detectados automáticamente por sus *magic bytes* `PK\x03\x04` / `\xd0\xcf\x11\xe0`) y `78` archivos no-Excel (`.pdf`/`.docx`).
   - Deduplicación binaria por `SHA-256` que consolida en cada uno de los `621` hashes únicos todas las carpetas de **Dimensión de Seguridad Humana** (`1. Seguridad Personal` a `8. Crisis`) y el **Periodo de Gobierno** (`ANTES_2020`, `2020_2023`, `2024_2027`).
2. **Persistencia Masiva en PostgreSQL (`0064_drive_seguridad_humana.py` en `bd_csh`):**
   - **`607` libros Excel únicos** persistidos en `seguimiento.archivos_plan_ingeridos`.
   - **`216.168` registros reales normalizados** en `seguimiento.registros_triada_normalizados`:
     - **Motor 1 (`PLAN_DESARROLLO`):** `98.003` registros estratégicos.
     - **Motor 2 (`PLAN_ACCION`):** `63.031` actividades operativas.
     - **Motor 3 (`INVERSION_PRESUPUESTAL`):** `55.134` registros presupuestales.
   - **Desglose por Periodo de Gobierno:**
     - `ANTES_2020` (`2018–2019`): `43` libros únicos -> `6.441` registros normalizados.
     - `2020_2023`: `257` libros únicos -> `71.898` registros normalizados.
     - `2024_2027`: `307` libros únicos -> `137.829` registros normalizados.
3. **Calidad, Regresión e Integridad de `bd_csh`:**
   - `16 passed` en `test_ingesta_masiva_triada.py`, `573 passed` (`0` fallos) en toda la suite `pytest` del backend y `628 passed` en `bun test`.
   - `alembic check` limpio (`0064_drive_seguridad_humana (head)`).
   - Conteos canónicos de `bd_csh` 100% intactos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).
