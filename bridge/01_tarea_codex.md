# Tarea Activa — Fase `[34A]` (`codex`, 100% Backend)

## Contexto y Restricciones Estrictas
- Lee `/root/polis/bridge/00_plan_diagnostico_pshc_google_doc_34.md`.
- **100% Backend**. **PROHIBIDO tocar `src/**`** o `pdt_diagnostico_seguridad_humana_8planes.py` / `test_pdt_diagnostico_seguridad_humana_8planes.py` (esos archivos los crea `agy2` en `[34B]`).
- No ejecutes `pytest` sobre todo el repositorio; ejecuta únicamente las suites de los módulos modificados (`tests/test_pdt_ai_evaluator.py`, `tests/test_access_policy.py`).

## Entregables Obligatorios (`[34A]`)

### 1. Crear `backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`
Implementa el generador y publicador del documento **"EVALUACIÓN MULTIDIMENSIONAL DE LA SEGURIDAD HUMANA EN 8 PLANES DE DESARROLLO DE CARTAGENA"**:

1. `generar_paquete_diagnostico_pshc_google_doc(codigo_plan: str = "TODOS") -> dict[str, Any]`:
   - Importa de forma resiliente (`try/except ImportError` con fallback determinista completo de las `4,637` metas y 8 planes) `construir_diagnostico_seguridad_humana_8planes(codigo_plan)` desde `app.modules.compromisos.pdt_diagnostico_seguridad_humana_8planes`.
   - Construye el documento completo con las **6 grandes secciones (Capítulos I a VI)** solicitadas por el usuario:
     - `I. RESUMEN EJECUTIVO Y TABLERO DE MANDOS (EXECUTIVE DASHBOARD)` (con el diagrama ASCII de arquitectura y la tabla de semáforos de las 7 dimensiones).
     - `II. MARCO TEÓRICO, NORMATIVO Y METODOLÓGICO` (ONU 66/290, Amartya Sen, Ley 2294/2022, ODS 1/2/3/5/8/10/16, cadena MGA/SisPT/MIR/CUIPO/PIIP, `anydoc`/`Docling` y NLP/BERTopic).
     - `III. DIAGNÓSTICO MACRO: DEL UNIVERSO DE 4.637 METAS AL NÚCLEO DE SEGURIDAD HUMANA` (`3.1 Caracterización del Universo de Metas en los 8 Planes` y `3.2 Embudo Analítico de Clasificación — Data Funnel Analytics` con diagrama del embudo y tabla por cada uno de los 8 planes).
     - `IV. DIAGNÓSTICO MICRO-SECTORIAL: ANÁLISIS DE LAS METAS EN LAS 7 DIMENSIONES DE LA SEGURIDAD HUMANA` (`4.1 Seguridad Económica`, `4.2 Seguridad Alimentaria`, `4.3 Seguridad en Salud`, `4.4 Seguridad Ambiental`, `4.5 Seguridad Personal`, `4.6 Seguridad Comunitaria, Cultural y Étnica`, `4.7 Seguridad Política e Institucional`, con tablas dinámicas de metas reales, líneas base, metas cuatrienio, presupuesto `CUIPO` y eficacia `SisPT`).
     - `V. ANÁLISIS AVANZADO DE EFICIENCIA, ESPACIO Y TENDENCIAS (ECONOMETRÍA & AI)` (`5.1 DEA-BCC VRS y Holguras Slacks`, `5.2 Econometría Espacial LISA Hotspots/Coldspots y Trampas de Vulnerabilidad en 3 Localidades y 15 UCGs`, `5.3 Proyección de Alcanzabilidad ARIMA e Índice de Riesgo ISRI 2024–2027`).
     - `VI. CONCLUSIONES, BRECHAS CRÍTICAS Y RECOMENDACIONES ESTRATÉGICAS` (Brechas de continuidad entre los 8 planes, desconexión Producto vs Resultado, y Hoja de Ruta para Plan Indicativo y Plan de Acción Distrital).
   - Genera **3 formatos listos para exportación y publicación en Google Drive**:
     1. `"html_google_doc"`: HTML completo maquetado siguiendo **exactamente la Guía Práctica de Formato y Estilo en Google Docs**:
        - Título del Documento: `font-family: 'Montserrat', Arial, sans-serif; font-size: 24pt; font-weight: bold; color: #0B2545;`
        - `H1`: `font-size: 16pt; font-weight: bold; color: #134074;`
        - `H2`: `font-size: 13pt; font-weight: bold; color: #8DA9C4;`
        - Cuerpo de texto: `font-family: 'Roboto', Calibri, Arial, sans-serif; font-size: 10.5pt; line-height: 1.15; margin-bottom: 6pt; color: #1E293B;`
        - **Cajas de Destacado (Callout Boxes)**: tablas `1x1` (`width: 100%; border-collapse: collapse; margin: 12pt 0;`) con celda `background-color: #F4F6F8; border-left: 4.5pt solid #134074; border-top: none; border-right: none; border-bottom: none; padding: 10pt 14pt;` para Resúmenes Ejecutivos, Alertas del Agente de IA y Fórmulas Econométricas.
        - **Tablas Dinámicas de Metas**: encabezados `background-color: #0B2545; color: #FFFFFF; font-weight: bold; padding: 8pt;` y filas alternadas `#FFFFFF` y `#FAFAFA`.
     2. `"markdown_ejecutivo"`: versión completa en GitHub-Flavored Markdown con los diagramas ASCII, cajas de alerta y todas las tablas de los Capítulos I a VI.
     3. `"csv_embudo_y_7_dimensiones"`: CSV tabular con las métricas por plan y por dimensión para vincular gráficos en Google Sheets.
   - Incluye `"huella_verificacion_sha256"` (64 caracteres hexadecimales).

2. `publicar_diagnostico_pshc_en_drive(folder_id: str = "1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS", paquete: dict[str, Any] | None = None) -> dict[str, Any]`:
   - Usa la cuenta de servicio `/root/polis/backend/.secrets/gdrive-service-account.json` (`jwt` + `httpx`, con `supportsAllDrives=true` e `includeItemsFromAllDrives=true`) para crear o actualizar de forma idempotente (buscando primero por nombre en `folder_id` para hacer `PATCH` si ya existe o `POST` si no existe) 3 archivos en la carpeta compartida `PSHC_Diagnostico` (`1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS`):
     1. **Google Doc Nativo Editable** (`mimeType = "application/vnd.google-apps.document"`, subiendo el `html_google_doc` con `Content-Type: text/html; charset=UTF-8`):
        - Nombre: `"01_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA_2012_2027"`
     2. **Google Sheet Nativo de Datos para Gráficos** (`mimeType = "application/vnd.google-apps.spreadsheet"`, subiendo el `csv_embudo_y_7_dimensiones` con `Content-Type: text/csv; charset=UTF-8`):
        - Nombre: `"02_DATOS_GRAFICOS_EMBUDO_7_DIMENSIONES_DEA_LISA_ISRI"`
     3. **Respaldo Markdown Auditable** (`mimeType = "text/markdown"`):
        - Nombre: `"03_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA.md"`
   - Devuelve los IDs y `webViewLink` de los 3 archivos creados/actualizados en Google Drive.

### 2. Exponer endpoint `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/diagnostico-seguridad-humana-8planes`
- En `backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `backend/app/core/security/access_policy.py` y `docs/permisos-api.md`:
  - Registra la ruta pública `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/diagnostico-seguridad-humana-8planes` con parámetros `codigo_plan: str = Query(default="TODOS")`, `publicar_drive: bool = Query(default=False)` y `folder_id: str = Query(default="1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS")`.
  - Si `publicar_drive=True`, ejecuta `publicar_diagnostico_pshc_en_drive(folder_id=folder_id, paquete=paquete)` e incluye `"publicacion_google_drive"` en la respuesta.

### 3. Actualizar Pruebas (`test_pdt_ai_evaluator.py` y `test_access_policy.py`)
- Verifica que `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/diagnostico-seguridad-humana-8planes` responda `HTTP 200`, contenga las 6 secciones (Capítulos I a VI), `html_google_doc` con los colores `#0B2545`, `#134074`, `#8DA9C4`, `#F4F6F8` y `#FAFAFA`, `markdown_ejecutivo`, `csv_embudo_y_7_dimensiones` y `huella_verificacion_sha256`, y que la ruta esté registrada como pública en `access_policy.py`.

## Verificación y Cierre
1. Ejecuta `./.venv/bin/ruff check app/modules/compromisos/pdt_generador_google_doc_pshc.py app/modules/compromisos/router.py app/modules/compromisos/schemas.py app/core/security/access_policy.py tests/test_pdt_ai_evaluator.py tests/test_access_policy.py`.
2. Ejecuta `./.venv/bin/pytest tests/test_pdt_ai_evaluator.py tests/test_access_policy.py -q`.
3. Documenta en `/root/polis/bridge/02_resultado_codex.md`.
4. Notifica al coordinador:
   `tmux send-keys -t =agy:0.0 "CODEX LISTO [34A]: Generador Google Doc/Sheet PSHC (6 capitulos + guia de estilo #0B2545/#134074/#F4F6F8 + endpoint /diagnostico-seguridad-humana-8planes + publicador Drive) completado y probado. Solicito auditoria EAF." Enter`
