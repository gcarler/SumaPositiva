# ORDEN MAESTRA CONJUNTA `[TRIADA-CIERRE-INTEGRAL-GOOGLE-WORKSPACE-13]`
## Cierre Integral de Planes de Desarrollo (PDD/PDL), Planes de Acción (PA DNP) y Sincronización Nativa con Google Sheets y Google Docs (`PSHC`)

- **Coordinador General y Auditor Forense (EAF):** `agy`
- **Agentes ejecutores:**
  - `codex` (Desarrollador Principal Backend / PostGIS / Econometría / Google Workspace API) → `bridge/01_tarea_codex.md`
  - `agy2` (Desarrollador Principal Frontend Next.js 16 / React 19 / TypeScript) → `bridge/01_tarea_activa.md`
- **Fecha:** 2026-10-15
- **Estado:** DESPACHADA EN PARALELO

---

## 1. Objetivos Estratégicos de la Misión

Cerrar las **4 brechas finales** para culminar al 100% el análisis forense y operativo de los Planes de Desarrollo y los Planes de Acción en `bd_csh`, y habilitar la **sincronización nativa con Google Sheets (`application/vnd.google-apps.spreadsheet`) y Google Docs (`application/vnd.google-apps.document`)** en la carpeta `PSHC` (`1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6` / subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH` `1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe`) usando la Service Account `/root/polis/backend/.secrets/gdrive-service-account.json` (`polis-pshc@polis-511719.iam.gserviceaccount.com`):

1. **Pilar 1 — Extracción e Ingesta de los 78 Archivos PDF de Planes de Acción (`formato_no_excel` en `catalogo_drive_1383.json`):**
   - Descargar (si no están en caché local) y extraer mediante `pypdf`/`pdfplumber` las tablas e indicadores de los **78 PDFs** del catálogo Drive (`Planes de Acción 2018` de DATT, Distriseguridad, Secretaría del Interior, Escuela de Gobierno, IPCC, Participación, IDER y los `Informes Técnicos de Planes de Acción 2025` a corte junio 30 de 2025).
   - Ingerir sus registros normalizados en `seguimiento.archivos_plan_ingeridos` y `seguimiento.registros_triada_normalizados` (`motor_destino = 'PLAN_ACCION'`), cerrando el vacío documental de PDFs.

2. **Pilar 2 — Deduplicación Canónica y Resolución Semántica de Metas en `seguimiento.pdd_metas_oficiales` (`2.078` filas):**
   - En `PDD_2024_2027` existen `273` filas marcadas como `DUPLICADA_ENTRE_FUENTES_PDD` (porque provienen tanto del Anexo del Acuerdo 927 como de la matriz de seguimiento) y `274` filas en `CANDIDATO_BAJA_CONFIANZA` en los 8 planes.
   - Ejecutar un segundo pase determinístico de emparejamiento semántico asistido (normalización de indicadores MGA, diccionario de siglas de las 29 entidades distritales y similitud de tokens) que:
     - Marque explícitamente en `datos_oficiales->'_auditoria_forense'` el campo booleano `es_meta_unica_canonica` (`true` para la fila principal y `false` para las `273` duplicadas, conservando `meta_canonica_id` apuntando a la principal) para exponer tanto el **universo bruto (`2.078` filas)** como el **universo neto deduplicado (`1.805` metas únicas)** sin diluir los porcentajes de cobertura física.
     - Promueva a `VINCULADA_ALTA_CONFIANZA` (o clasifique con subtipo auditado `CANDIDATO_VALIDADO_ENTIDAD` vs `SIN_ACTIVIDAD_PA_EQUIVALENTE`) las `274` metas de baja confianza.

3. **Pilar 3 — Población Real del Motor Operativo de Planes de Acción DNP (`seguimiento.actividades_plan_accion`):**
   - Actualmente `seguimiento.actividades_plan_accion` tiene solo `12` filas semilla, mientras que `seguimiento.registros_triada_normalizados` tiene `63.341` filas de `PLAN_ACCION` (`35.100` en `2024_2027` de las **29 entidades distritales**).
   - Crear un script/servicio idempotente y migración/actualización que consolide y pueble en `seguimiento.actividades_plan_accion` al menos **las actividades estratégicas reales 2024–2027 de las 29 entidades distritales** (preservando las 12 semilla `PA-2026-*` y agregando las actividades reales agrupadas/seleccionadas con mayor presupuesto y relevancia por entidad, vigencia `2024`, `2025` y `2026`, código BPIM, avances T1–T4, verbo infinitivo evaluado con la regla DNP, monto programado/ejecutado y vínculo a los 10 compromisos `compromisos_pas` y las 6 líneas estratégicas `LE-01..LE-06`).
   - De este modo, el endpoint `/api/v1/compromisos/plan-accion` y `/api/v1/compromisos/plan-accion/resumen` (y la pestaña **Motor Plan de Acción DNP** en frontend) mostrarán la ejecución real multimillonaria de las **29 entidades del Distrito** en lugar de solo 12 filas de ejemplo.

4. **Pilar 4 — Sincronizador Nativo Google Workspace (`Google Sheets API v4` + `Google Docs API v1` + `Google Drive API v3`) hacia `PSHC`:**
   - Implementar el servicio `backend/app/modules/compromisos/google_workspace_sync_service.py` y los endpoints:
     - `GET /api/v1/compromisos/triada/google-workspace/estado`: consulta en vivo la carpeta `PSHC` (`1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6`) y su subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH` (`1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe`), lista los **Google Sheets** (`application/vnd.google-apps.spreadsheet`) y **Google Docs** (`application/vnd.google-apps.document`) existentes, e informa el estado de sincronización.
     - `POST /api/v1/compromisos/triada/google-workspace/sincronizar`:
       - Si existen hojas de cálculo (`Google Sheets`) o documentos (`Google Docs`) dentro de `PSHC` / `00_EXPEDIENTE_OFICIAL_POLIS_CSH` (o si cuenta con token OAuth de usuario / archivos compartidos en la carpeta), los toma, los renombra/organiza y escribe en ellos mediante **Google Sheets API v4 (`spreadsheets.batchUpdate` / `values.batchUpdate`)** y **Google Docs API v1 (`documents.batchUpdate`)**:
         1. **Google Sheet 1 — `[POLIS] 01_MATRIZ_MAESTRA_PLANES_DESARROLLO_2012_2027`**:
            - Pestaña `1_Resumen_8_Planes_PPI`: los 8 planes (`5 PDD + 3 PDL`), PPI oficial corriente y constante 2025, metas brutas, metas únicas deduplicadas, cobertura física y financiera.
            - Pestaña `2_Serie_Anual_2012_2027`: las 16 vigencias ininterrumpidas con deflactores IPC DANE.
            - Pestaña `3_Frontera_DEA_y_Malmquist`: las 29 entidades evaluadas con CCR, BCC, Network DEA Bi-Etapa (E1 Operativa PA vs E2 Estratégica PDD), estado de ilusión burocrática y metas Pareto.
            - Pestaña `4_Justicia_Territorial_37_Mesas`: las 3 Localidades y Zona Rural/Insular con población DANE (`1.065.570` hab.), las **37 mesas oficiales (incluyendo los 15 corregimientos)** y los `12.280` hurtos.
         2. **Google Sheet 2 — `[POLIS] 02_MATRIZ_MAESTRA_PLANES_ACCION_DNP_29_ENTIDADES`**:
            - Pestaña `1_Consolidado_Entidades_PA`: resumen por cada una de las 29 entidades distritales (archivos ingeridos, actividades, verbos fuertes vs débiles DNP, avance físico T1–T4, apropiación, RPC, obligaciones y pagos).
            - Pestaña `2_Actividades_Motor_DNP`: listado detallado de `seguimiento.actividades_plan_accion` con código, entidad, compromiso PAS, BPIM, verbo infinitivo, T1–T4 y semáforo.
            - Pestaña `3_Censo_37_Mesas_15_Corregimientos`: catálogo oficial de las 37 mesas (`MT`, `MR` de los 15 corregimientos, `MP`, `MS`) + Plenaria `pc-001`.
         3. **Google Doc 1 — `[POLIS] 03_INFORME_FORENSE_Y_PLIEGOS_CONTROL_POLITICO`**:
            - Documento nativo de Google Docs estructurado con encabezados (`HEADING_1`, `HEADING_2`), síntesis ejecutiva de los 8 Planes de Desarrollo y 29 Planes de Acción, dictamen Network DEA y los Pliegos Oficiales de Control Político (Ley 136/1994 y Ley 1551/2012) con sello SHA-256.
       - Nota clave sobre cuota de Service Account en Google Drive personal: cuando la Service Account intenta hacer `files.create` de un archivo nuevo en una carpeta personal de Google Drive y recibe `403 storageQuotaExceeded`, el servicio debe:
         1) Reutilizar automáticamente cualquier `Google Sheet` o `Google Doc` que el usuario haya creado dentro de `PSHC` o `00_EXPEDIENTE_OFICIAL_POLIS_CSH` (asignándole el título oficial y poblando todas sus pestañas/secciones), **y/o**
         2) Soportar credenciales OAuth2 de usuario si existen en `/root/polis/backend/.secrets/gdrive-oauth-token.json`, devolviendo un mensaje claro con los enlaces directos `webViewLink` de cada Google Sheet y Google Doc sincronizado.
