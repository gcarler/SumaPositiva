# ENCARGO 288: Ingesta Masiva, Descarga y Conversión a Markdown (AnyDoc) de Fuentes Oficiales de Planeación Distrital

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-03
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Fuentes Objetivas:**
  1. `https://planeacion.cartagena.gov.co/instructivo` (Instructivos metodológicos y guías)
  2. `https://planeacion.cartagena.gov.co/pp-documentos` (Documentos técnicos, diagnósticos y matrices)
  3. `https://planeacion.cartagena.gov.co/politicas-publicas` (Normativa, decretos y tablero de seguimiento)
- **Directorio de Ingesta:** `data/banco_fuentes_oficiales/planeacion_distrital/`

---

## 1. Alcance y Objetivos

Descargar de manera íntegra, estructurada y verificable todos los activos documentales publicados por la Secretaría de Planeación Distrital de Cartagena en sus portales de políticas públicas, para alimentar el **Banco de Conocimiento de POLIS**:

1. **Instructivos y Guías Técnicas:** Manuales de formulación, Ficha de Estructuración de Política Pública, hojas de vida de indicadores y guías metodológicas CONPES.
2. **Documentos Técnicos de Soporte (DTS):** Diagnósticos, documentos de formulación y planes de acción de las políticas públicas distritales publicadas en `/pp-documentos`.
3. **Normativa Distrital:** Acuerdos Distritales del Concejo, Decretos Distritales de adopción y actos reglamentarios del CONPES D. T. y C.
4. **Tablero de Seguimiento:** Matrices de avance, indicadores y reportes de monitoreo sectorial.

---

## 2. Instrucciones Técnicas para `agy2`

### A. Adquisición y Descarga
- Resolver los enlaces directos a los archivos (.pdf, .docx, .xlsx, .pptx) alojados en los servidores de la Alcaldía, Google Drive o repositorios asociados.
- Descargar los archivos originales sin alteración en el directorio:
  `data/banco_fuentes_oficiales/planeacion_distrital/originales/`
- Manejar con cuidado las restricciones de red o protecciones Cloudflare utilizando agentes HTTP adecuados, extracción de enlaces directos o navegadores headless si es necesario.

### B. Conversión Masiva a Markdown con `anydoc`
- Conforme a la habilidad oficial `convert-documents-to-markdown`:
  ```bash
  npx -y @firecrawl/anydoc <ruta_archivo_original> -o <ruta_salida.md>
  ```
- Almacenar los documentos procesados en:
  `data/banco_fuentes_oficiales/planeacion_distrital/markdown/`
- Para matrices o hojas de cálculo (.xlsx), preservar la estructura tabular de indicadores y metas.

### C. Catálogo de Linaje y Trazabilidad (Auditoría Forense)
- Generar un inventario consolidado en `data/banco_fuentes_oficiales/planeacion_distrital/catalogo_planeacion.json` y su versión legible en Markdown:
  - Nombre del documento.
  - URL de origen.
  - Tipo / Sector (Instructivo, DTS, Normativa, Seguimiento).
  - Política pública asociada.
  - Tamaño en bytes y hash SHA-256 de los originales y de los Markdown convertidos.

---

## 3. Entregables Esperados

1. Informe de cierre en `bridge/288_entrega_agy2_descarga_ingesta_anydoc_planeacion.md`.
2. Repositorio de originales y Markdown convertidos en `data/banco_fuentes_oficiales/planeacion_distrital/`.
3. Catálogo y matriz de trazabilidad de los documentos procesados.
4. **Sin commit ni push.** Notificar a la Coordinación General (`agy:0.0`) al concluir.
