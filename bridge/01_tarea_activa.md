# TAREA ACTIVA PARA `agy2`: `[TRIADA-FRONTEND-CIERRE-GOOGLE-WORKSPACE-13]`

- **De:** `agy` (Coordinador General y Auditor Forense EAF)
- **Para:** `agy2` (Desarrollador Principal Frontend Next.js 16 / React 19 / TypeScript)
- **Fecha:** 2026-10-15
- **Prioridad:** CRÍTICA INMEDIATA
- **Referencia:** `bridge/00_plan_cierre_integral_google_workspace_13.md`

---

## 1. Objetivo de la Misión

Actualizar el frontend de `/plataforma/seguimiento` para reflejar el **cierre integral de los Planes de Desarrollo y Planes de Acción** y agregar el **Panel de Sincronización Nativa con Google Workspace (`Google Sheets` y `Google Docs`)** conectado a la carpeta `PSHC` (`https://drive.google.com/drive/folders/1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6` y subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH` `https://drive.google.com/drive/folders/1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe`).

---

## 2. Entregables Técnicos Exactos (`src/**`)

### 2.1 Cliente y Tipos para Google Workspace Nativo + Métricas Deduplicadas
1. En `src/features/seguimiento/services/compromisos-api.ts` (o en `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`):
   - Agregar las funciones de servicio que consumen los nuevos endpoints del backend (con fallback resiliente si el backend está recargando):
     - `obtenerEstadoGoogleWorkspace()`: `GET /api/v1/compromisos/triada/google-workspace/estado`
     - `sincronizarGoogleWorkspace()`: `POST /api/v1/compromisos/triada/google-workspace/sincronizar`
   - Agregar en los datos/tipos de `pdd-dea-cartagena.data.ts` los campos de deduplicación canónica y cobertura PDF:
     - `metas_totales_brutas: 2078`, `metas_unicas_deduplicadas: 1805` (`273` duplicadas consolidadas en PDD 2024–2027), `pdfs_planes_accion_ingeridos: 78`.

### 2.2 Panel Interactivo de Sincronización Nativa Google Sheets & Google Docs en `pdd-dea-evaluacion-panel.tsx`
En la sub-pestaña 7 (**`Laboratorio Prescriptivo y Control Fiscal`**, `data-testid="pdd-tab-laboratorio-prescriptivo"`) y/o en la cabecera de exportación del panel:
1. Agregar una tarjeta destacada **"Sincronización Nativa con Google Workspace — Carpeta Oficial `PSHC` (`Google Sheets` + `Google Docs`)"** (`data-testid="google-workspace-sync-card"`):
   - Mostrar el estado de conexión en vivo con la cuenta de servicio `polis-pshc@polis-511719.iam.gserviceaccount.com` y enlaces directos a:
     - Carpeta raíz `PSHC`: `https://drive.google.com/drive/folders/1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6`
     - Subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH`: `https://drive.google.com/drive/folders/1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe`
   - Mostrar la lista de **Archivos Nativos de Google (`Google Sheets` y `Google Docs`)** detectados en la carpeta con su enlace directo para abrirlos en Google Drive (`webViewLink`), y el botón **"Sincronizar ahora con Google Sheets y Google Docs"** (`data-testid="btn-sync-google-workspace"`), que invoca `POST /api/v1/compromisos/triada/google-workspace/sincronizar` y actualiza en pantalla las pestañas y secciones sincronizadas.
   - Mostrar también la tarjeta de resumen de cierre documental:
     - **Universo PDD 2012–2027:** `2.078` metas brutas → **`1.805` metas únicas deduplicadas** (`273` duplicadas inter-fuente consolidadas).
     - **Universo Planes de Acción (Tríada + Motor DNP):** `1.305` libros Excel + **`78` informes PDF/DOCX (`2018` y `2025`)** procesados = `1.383/1.383` documentos del catálogo Drive cubiertos al 100%, alimentando las **29 entidades distritales** y las **37 mesas oficiales (con los 15 corregimientos)**.

### 2.3 Mejora del Panel `Motor Plan de Acción DNP` (`src/features/seguimiento/components/motor-plan-accion-panel.tsx` o vista correspondiente)
1. Verificar que el panel del **Motor Plan de Acción DNP** soporte visualizar fluidamente el nuevo volumen de actividades reales de las **29 entidades distritales** que `codex` está poblando en `seguimiento.actividades_plan_accion` (con filtro rápido por Entidad Responsable, Vigencia `2024 / 2025 / 2026` y Compromiso PAS, sin truncar ni desbordar la tabla).

---

## 3. Reglas de Coordinación, Quality Gates y Entrega

1. **Aislamiento de Archivos:**
   - Tu ámbito exclusivo es `src/**`. **NO toques `backend/**` ni `docs/permisos-api.md`**.
2. **Quality Gates Obligatorios:**
   - `node scripts/ui-policy.mjs` → 0 violaciones.
   - `./node_modules/.bin/tsc --noEmit` → 0 errores.
   - `./node_modules/.bin/eslint` sobre los archivos modificados → 0 errores y 0 warnings.
   - `bun test src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` → 100% pass (agregando tests para `google-workspace-sync-card` y métricas de `1.805` metas únicas y `78` PDFs).
   - `./node_modules/.bin/next build` → compilación limpia y reinicio de `polis-frontend.service`.
3. **Commit y Reporte:**
   - Hacer commit local sin push: `feat(seguimiento-workspace): panel sincronizacion nativa Google Sheets/Docs PSHC y cierre documental 1383 archivos [TRIADA-FRONTEND-CIERRE-GOOGLE-WORKSPACE-13]`.
   - Escribir tu reporte en `bridge/02_resultado_agy2.md`.

---
## 4. IDs EXACTOS DE LOS DOCUMENTOS NATIVOS YA CREADOS POR EL USUARIO EN GOOGLE DRIVE
Usa estos 3 documentos reales como valores por defecto / iniciales en `google-workspace-sync-card` para que el usuario vea desde el primer milisegundo sus 3 archivos nativos con enlaces directos:
- **Google Sheet 1 (`Matriz_PDM`):** `https://docs.google.com/spreadsheets/d/1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4/edit` (ID: `1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`)
- **Google Sheet 2 (`Matriz_Plan_de_accion`):** `https://docs.google.com/spreadsheets/d/1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM/edit` (ID: `1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM`)
- **Google Doc 1 (`Analisis`):** `https://docs.google.com/document/d/1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE/edit` (ID: `1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`)
