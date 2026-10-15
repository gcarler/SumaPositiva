# TAREA ACTIVA PARA `codex`: `[TRIADA-BACKEND-CIERRE-GOOGLE-WORKSPACE-13]`

- **De:** `agy` (Coordinador General y Auditor Forense EAF)
- **Para:** `codex` (Desarrollador Principal Backend / PostGIS / Econometría / Google Workspace API)
- **Fecha:** 2026-10-15
- **Prioridad:** CRÍTICA INMEDIATA
- **Referencia:** `bridge/00_plan_cierre_integral_google_workspace_13.md`

---

## 1. Objetivo de la Misión

Ejecutar en el backend y en `bd_csh` los **4 pilares de cierre definitivo** del análisis de Planes de Desarrollo (PDD/PDL), Planes de Acción (PA DNP) y el conector nativo con **Google Sheets (`application/vnd.google-apps.spreadsheet`) y Google Docs (`application/vnd.google-apps.document`)** sobre la carpeta `PSHC` (`1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6` y subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH` `1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe`) usando `/root/polis/backend/.secrets/gdrive-service-account.json`.

---

## 2. Entregables Técnicos Exactos

### 2.1 Pilar 1: Ingesta de los 78 Archivos PDF de Planes de Acción (`formato_no_excel`)
1. En `data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json` hay **78 entradas** con `estado_descarga == "formato_no_excel"` (son PDFs de Planes de Acción 2018 e Informes Técnicos de Planes de Acción 2025 a corte junio 30 de 2025).
2. Crear y ejecutar un script idempotente `backend/scripts/ingestar_pdfs_planes_accion_drive.py` que:
   - Descargue de Google Drive (o lea desde caché local en `data/planes_accion/drive_sector_seguridad/archivos_pdf/`) los PDFs únicos por `sha256` (usando `https://drive.google.com/uc?export=download&id=<id>` o la API v3 con `/root/polis/backend/.secrets/gdrive-service-account.json`).
   - Extraiga mediante `pypdf` / `pdfplumber` las líneas, actividades, metas, indicadores y avances porcentuales de cada PDF.
   - Registre cada PDF único en `seguimiento.archivos_plan_ingeridos` (`formato_extension = '.pdf'`, `perfil_detectado = 'PDF_PLAN_ACCION_OFICIAL'`) y sus filas extraídas en `seguimiento.registros_triada_normalizados` (`motor_destino = 'PLAN_ACCION'`), asociándolas a su `entidad_normalizada`, `vigencia` (`2018` o `2025`), `periodo_gobierno` (`ANTES_2020` o `2024_2027`) y `dimensiones_seguridad_humana`.

### 2.2 Pilar 2: Deduplicación Canónica y Segundo Pase Semántico en `seguimiento.pdd_metas_oficiales` (`2.078` filas)
1. En `seguimiento.pdd_metas_oficiales`:
   - Marcar en `datos_oficiales->'_auditoria_forense'` los campos:
     - `es_meta_unica_canonica`: `true` para las `1.805` metas únicas (`2.078 - 273` duplicadas en `PDD_2024_2027`) y `false` para las `273` filas con `estado_cobertura == 'DUPLICADA_ENTRE_FUENTES_PDD'`.
     - Mejorar el emparejamiento de las `274` metas en `CANDIDATO_BAJA_CONFIANZA` cruzándolas también con los nuevos registros extraídos de los PDFs y con las actividades por entidad/línea, promoviendo a `VINCULADA_ALTA_CONFIANZA` aquellas con coincidencia verificada de entidad + indicador/meta, y documentando en `resumen_ejecutivo` / `cobertura_8_planes` de `pdd_dea_service.py`:
       - `metas_totales_brutas`: `2078`
       - `metas_unicas_deduplicadas`: `1805`
       - `cobertura_sobre_metas_unicas_pct`: porcentaje calculado sobre el universo deduplicado (`1.805` metas netas).

### 2.3 Pilar 3: Población Real del Motor Operativo de Planes de Acción DNP (`seguimiento.actividades_plan_accion`)
1. Actualmente `seguimiento.actividades_plan_accion` tiene solo `12` filas semilla (`PA-2026-*`), pero `seguimiento.registros_triada_normalizados` tiene miles de filas reales de `PLAN_ACCION` en `2024_2027` para las **29 entidades distritales**.
2. Crear un script/migración `backend/scripts/poblar_motor_plan_accion_real.py` (y ejecutarlo en `bd_csh`) que:
   - Mantenga intactas las `12` filas semilla (`PA-2026-*`) para no romper ningún test existente.
   - Seleccione e inserte (`ON CONFLICT (codigo) DO UPDATE`) desde `seguimiento.registros_triada_normalizados` (`motor_destino = 'PLAN_ACCION'`) un conjunto representativo y curado de **al menos 120 a 250 actividades reales** cubriendo **todas las 29 entidades distritales** en las vigencias `2024`, `2025` y `2026`:
     - Mapeando cada entidad a su línea estratégica (`LE-01` a `LE-06`) y compromiso PAS (`PAS-SEC-01`, `PAS-JUV-02`, `PAS-SEG-03`, `PAS-ALUM-04`, `PAS-AMB-05`, `PAS-POL-06`, `PAS-CUID-07`, `PAS-DES-08`, `PAS-BAZ-09`, `PAS-ETN-10`).
     - Poniendo `codigo` determinístico (`PA-REAL-2024-001`, `PA-REAL-2025-001`, etc.), `entidad_responsable` real, `codigo_bpim` real (o `'BPIM-INST-' || codigo` cuando sea actividad de funcionamiento), `verbo_infinitivo` extraído de la actividad real, `avance_t1..t4`, `porcentaje_avance_fisico` (`0..100`), `monto_programado_cop` (`apropiacion_definitiva_cop`) y `monto_ejecutado_cop` (`COALESCE(pagos_tesoreria_cop, obligaciones_cop, compromisos_rp_cop, 0)`), y en `metadatos` el `registro_triada_id` y `archivo_id` para trazabilidad forense 100% verificable.

### 2.4 Pilar 4: Servicio y Endpoints de Sincronización Nativa con Google Sheets y Google Docs (`PSHC`)
1. Crear `backend/app/modules/compromisos/google_workspace_sync_service.py`:
   - Usa la cuenta de servicio `/root/polis/backend/.secrets/gdrive-service-account.json` (`polis-pshc@polis-511719.iam.gserviceaccount.com`) con scopes `drive`, `spreadsheets` y `documents` (firmando el JWT RS256 con `cryptography`, que ya está instalado en `.venv`).
   - Carpeta raíz `PSHC`: `1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6`.
   - Subcarpeta oficial: `1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe` (`00_EXPEDIENTE_OFICIAL_POLIS_CSH`).
   - Implementar dos operaciones públicas:
     - **`obtener_estado_workspace()` (`GET /api/v1/compromisos/triada/google-workspace/estado`)**:
       - Lista todos los archivos presentes en `PSHC` y en `00_EXPEDIENTE_OFICIAL_POLIS_CSH`.
       - Clasifica cuántos `Google Sheets` (`application/vnd.google-apps.spreadsheet`) y cuántos `Google Docs` (`application/vnd.google-apps.document`) hay disponibles para sincronización nativa, sus nombres, IDs y `webViewLink`.
       - Devuelve `conectado: true`, `service_account_email: "polis-pshc@polis-511719.iam.gserviceaccount.com"`, `carpeta_pshc_id`, `subcarpeta_expediente_id`, `archivos_nativos_detectados`, `ultimo_resultado_sincronizacion` y `instrucciones_plantillas` (indicando cuántos Sheets/Docs adicionales en blanco puede crear el usuario si desea más documentos nativos, dado que las Service Accounts en Mi Unidad personal requieren reutilizar archivos creados por el propietario de la carpeta o un token OAuth de usuario).
     - **`sincronizar_workspace()` (`POST /api/v1/compromisos/triada/google-workspace/sincronizar`)**:
       - Busca los `Google Sheets` y `Google Docs` existentes dentro de `00_EXPEDIENTE_OFICIAL_POLIS_CSH` o `PSHC` (o los crea si hay token OAuth de usuario en `/root/polis/backend/.secrets/gdrive-oauth-token.json`).
       - Si encuentra al menos **1 Google Sheet**, lo renombra (si tenía título genérico) y crea/actualiza sus pestañas nativas mediante `https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate` y `values:batchUpdate`:
         - Pestaña `1_Resumen_8_Planes_PDD`: tabla de los 8 planes de desarrollo (`2012–2027`), PPI oficial corriente y constante, metas brutas (`2.078`), metas únicas (`1.805`) y cobertura.
         - Pestaña `2_Serie_Anual_2012_2027`: las 16 vigencias anuales continuas.
         - Pestaña `3_Network_DEA_29_Entidades`: ranking de las 29 entidades con eficiencia operativa PA (`E1`), eficiencia estratégica PDD (`E2`), estado de ilusión burocrática y frontera de Pareto.
         - Pestaña `4_Planes_Accion_DNP`: resumen por las 29 entidades en `seguimiento.actividades_plan_accion` y `registros_triada_normalizados` (incluyendo los 78 PDFs recién ingeridos).
         - Pestaña `5_Censo_37_Mesas_15_Corregimientos`: las 37 mesas oficiales (`3` de localidad, `15` de corregimientos `MR-01..MR-15`, `8` poblacionales, `11` sectoriales + Plenaria `pc-001`).
         - Si hay un **segundo o tercer Google Sheet**, distribuye en el Sheet 2 la matriz detallada de Planes de Acción DNP y en el Sheet 3 las 37 Mesas de Trabajo.
       - Si encuentra al menos **1 Google Doc**, lo renombra a `[POLIS] Informe Forense Integral PDD, Planes de Acción y Pliegos de Control Político` y escribe el informe estructurado completo mediante `https://docs.googleapis.com/v1/documents/{documentId}:batchUpdate`.
       - Guarda el estado de la última sincronización en `/tmp/polis_google_workspace_sync_state.json`.
2. Registrar las dos rutas (`GET /triada/google-workspace/estado` y `POST /triada/google-workspace/sincronizar`) en `backend/app/modules/compromisos/router.py` y en `backend/app/core/access_Catalog` / `docs/permisos-api.md` (con acceso público de lectura en `GET` o autenticado/público consistente con las demás rutas de `/compromisos/triada/*` para que `test_access_policy.py` pase al 100%).

---

## 3. Reglas de Coordinación y Entrega

1. **Aislamiento de Archivos:**
   - Tu ámbito es `backend/**` y `docs/permisos-api.md`. **NO modifiques `src/**`** (ámbito de `agy2`).
2. **Validación Obligatoria:**
   - Regenerar `/tmp/polis_pdd_dea_cache_v11.json` tras actualizar `pdd_metas_oficiales`, `actividades_plan_accion` y los 78 PDFs.
   - Ejecutar `pytest` en `backend/tests/test_access_policy.py`, `backend/tests/test_pdd_dea_triada.py`, `backend/tests/test_plan_accion_dnp.py` (o tests de compromisos) y agregar pruebas unitarias para `google-workspace/estado`.
   - Reiniciar `polis-backend.service`.
3. **Commit y Reporte:**
   - Hacer commit local sin push: `feat(triada-workspace): ingesta 78 PDFs PA, deduplicacion metas PDD, motor PA 29 entidades y sync nativo Google Docs/Sheets [TRIADA-BACKEND-CIERRE-GOOGLE-WORKSPACE-13]`.
   - Escribir tu reporte en `bridge/02_entrega_codex.md`.

---
## 4. IDs EXACTOS DE LOS DOCUMENTOS NATIVOS YA CREADOS POR EL USUARIO EN `00_EXPEDIENTE_OFICIAL_POLIS_CSH`
El usuario ya creó los 3 documentos nativos dentro de `00_EXPEDIENTE_OFICIAL_POLIS_CSH` (`1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe`) y nuestra Service Account (`polis-pshc@polis-511719.iam.gserviceaccount.com`) ya tiene acceso completo de lectura/escritura sobre ellos:

1. **Google Sheet PDD / PDM (`Matriz_PDM`):**
   - `spreadsheetId`: `"1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4"`
   - `webViewLink`: `"https://docs.google.com/spreadsheets/d/1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4/edit"`
   - **Qué debes escribir en este Google Sheet cuando se ejecute `sincronizar_workspace()`:**
     - Pestaña `1_Resumen_8_Planes_PPI`: Los 8 planes (`5 PDD + 3 PDL`), PPI oficial corriente y constante 2025, metas brutas (`2.078`), metas únicas deduplicadas (`1.805`) y cobertura física/financiera.
     - Pestaña `2_Serie_Anual_2012_2027`: Las 16 vigencias anuales continuas (2012–2027).
     - Pestaña `3_Network_DEA_29_Entidades`: Ranking de las 29 entidades con CCR, BCC, Network DEA Bi-Etapa (`E1` PA vs `E2` PDD), ilusión burocrática y frontera de Pareto.
     - Pestaña `4_Justicia_Territorial_37_Mesas`: Desglose DANE (`1.065.570` hab.), las 37 mesas oficiales y los `12.280` hurtos.

2. **Google Sheet Planes de Acción y Mesas (`Matriz_Plan_de_accion`):**
   - `spreadsheetId`: `"1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM"`
   - `webViewLink`: `"https://docs.google.com/spreadsheets/d/1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM/edit"`
   - **Qué debes escribir en este Google Sheet cuando se ejecute `sincronizar_workspace()`:**
     - Pestaña `1_Consolidado_29_Entidades_PA`: Resumen por cada una de las 29 entidades distritales en `PLAN_ACCION` (archivos Excel + los 78 PDFs ingeridos, actividades, verbos fuertes/débiles DNP, avance físico y ejecución financiera).
     - Pestaña `2_Motor_Plan_Accion_DNP`: Todas las actividades de `seguimiento.actividades_plan_accion` (las 12 semilla + las actividades reales de las 29 entidades).
     - Pestaña `3_Censo_37_Mesas_15_Corregimientos`: Las 37 mesas canónicas (incluyendo las 15 mesas de corregimientos `MR-01..MR-15`) + Plenaria `pc-001`.

3. **Google Doc Informe Forense y Pliegos (`Analisis`):**
   - `documentId`: `"1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE"`
   - `webViewLink`: `"https://docs.google.com/document/d/1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE/edit"`
   - **Qué debes escribir en este Google Doc cuando se ejecute `sincronizar_workspace()`:**
     - Limpiar el contenido previo (si tiene más de 2 caracteres) e insertar el Informe Forense Integral estructurado de los 8 Planes de Desarrollo (2012–2027), el análisis de los Planes de Acción de las 29 entidades (incluyendo los 78 PDFs), el censo de las 37 mesas (15 corregimientos) y los Pliegos Oficiales de Control Político con sello SHA-256.

¡Ejecuta también `sincronizar_workspace()` al finalizar para dejar los 3 documentos nativos (`Matriz_PDM`, `Matriz_Plan_de_accion` y `Analisis`) poblados en vivo en Google Drive!
