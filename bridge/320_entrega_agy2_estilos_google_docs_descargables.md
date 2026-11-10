# INFORME DE ENTREGA — ENCARGO 320: REDISEÑO Y ELEVADA ELABORACIÓN EDITORIAL DE DOCUMENTOS OFICIALES DESCARGABLES (ESTILO GOOGLE DOCS)

**Para:** Antigravity Principal / Usuario  
**De:** Subagente `agy2`  
**Fecha:** 2026-11-09  
**Referencia:** [`bridge/320_tarea_agy2_estilos_google_docs_descargables.md`](file:///root/polis/bridge/320_tarea_agy2_estilos_google_docs_descargables.md) — *Directriz: erradicar apariencia de hecho con IA y adoptar rigurosamente los estilos editoriales de Google Docs en el Acta Oficial PDF de Mesas de Trabajo.*

---

## 1. Diagnóstico y Objetivo del Encargo

En respuesta a la directriz perentoria del usuario (*"los documentos que permite descargar la plataforma parecen hechos con IA les falta mayor nivel de elaboración, debes usar los estilos de google doc"*), se llevó a cabo un rediseño integral de fondo y forma sobre el generador de documentos oficiales en PDF de las Mesas de Trabajo:
- Archivo principal intervenido: [`backend/app/modules/mesas/acta_pdf.py`](file:///root/polis/backend/app/modules/mesas/acta_pdf.py).
- Suite de pruebas y verificación documental: [`backend/tests/test_acta_pdf.py`](file:///root/polis/backend/tests/test_acta_pdf.py).
- Muestra generada de evidencia real: [`data/Acta_Oficial_Mesa_01a0f5fe_GoogleDocs.pdf`](file:///root/polis/data/Acta_Oficial_Mesa_01a0f5fe_GoogleDocs.pdf).

Se erradicaron completamente los textos esquemáticos, las tablas oscuras pesadas y las plantillas genéricas. En su lugar, el acta se transformó en un **expediente público distrital solemne de 3 páginas equilibradas**, construido con la jerarquía tipográfica, márgenes y estilos editoriales propios de un **Google Doc ejecutivo de alta calidad**, articulando todo el trabajo territorial real diligenciado en la plataforma POLIS.

---

## 2. Aplicación Rigurosa de Estilos Google Docs

### 2.1 Tipografía y Jerarquía Visual
- **Márgenes de Página:** Calibrados a `2.0 cm` (superior, inferior, izquierdo y derecho), generando un ancho de cuadrícula útil de `17.59 cm` en formato Carta (`letter`).
- **Encabezado y Título:**
  - Membrete Institucional: 8 pt Bold `#4B5563` centrado (*República de Colombia · Departamento de Bolívar · Alcaldía Mayor de Cartagena*).
  - Título Institucional: 12.5 pt Bold `#0F172A` (*Alcaldía Mayor de Cartagena de Indias*).
  - Título Principal del Documento: 14 pt Bold `#1E3A8A` (azul institucional sobrio) con línea divisoria sutil de 1.2 pt.
  - Subtítulo de Política Pública: 9 pt Bold `#0F172A` (*Política Pública Distrital de Seguridad Humana Integral 2026–2036*).
- **Secciones Principales (Heading 1):** 11 pt Bold `#1E3A8A` con línea divisoria tenue inferior (`HRFlowable` de 0.5 pt en `#E2E8F0`), espacio anterior de 10 pt y posterior de 3 pt.
- **Subsecciones (Heading 2):** 9.5 pt Bold `#334155`, espacio anterior de 6 pt y posterior de 2 pt.
- **Cuerpo de Texto (Body):** 8.5 pt Regular con interlineado de 12 pt (leading 1.41) en `#1F2937`, con alineación justificada o izquierda limpia.

### 2.2 Tablas Ejecutivas Estilo Google Docs
- **Encabezados de Tabla:** Fondo suave `#F1F5F9` o `#F8FAFC` (Slate 50/100), texto en 8 pt Bold `#0F172A`. Se eliminaron los fondos oscuros pesados.
- **Líneas y Bordes:** Cuadrícula tenue con líneas interiores de `0.5 pt` en color `#E2E8F0` y recuadro perimetral de `0.75 pt` en `#CBD5E1`.
- **Alternancia de Filas:** Blanco puro `#FFFFFF` y gris neutro suave `#FBFCFD`.
- **Padding:** `TOPPADDING=3.5`, `BOTTOMPADDING=3.5`, `LEFTPADDING=5`, `RIGHTPADDING=5` para un espaciado aireado y legible.

### 2.3 Cajas de Resaltado (Callout Boxes)
Se diseñó un constructor modular de Callouts (`_crear_callout_box`):
- **Problema Central:** Fondo `#F8FAFC`, borde perimetral tenue `#E2E8F0` y **borde izquierdo acentuado de 3.0 pt en color `#0284C7` (Azul Cívico)**.
- **Objetivo Central:** Fondo `#F0FDF4`, borde perimetral `#DCFCE7` y **borde izquierdo acentuado de 3.0 pt en color `#16A34A` (Verde Transformación)**.

### 2.4 Encabezado Corriente y Pie de Página de Doble Pasada
- Motor `ActaNumberedCanvas`:
  - **Páginas 2 en adelante:** Encabezado corriente superior tenue en `#64748B` (7.5 pt):  
    *«POLIS — Acta Oficial de Concertación y Deliberación Territorial»* (izquierda) · *«Folio: {folio_oficial}»* (derecha), con línea divisoria de 0.5 pt en `#E2E8F0`.
  - **Todas las páginas:** Pie de página formal con línea divisoria de 0.5 pt en `#E2E8F0`, leyenda institucional a la izquierda y paginación exacta de dos pasadas a la derecha (*«Página X de Y»*).

---

## 3. Estructuración y Contenido Territorial Exhaustivo (11 Secciones)

El acta integra de manera articulada la información técnica y comunitaria real:

1. **Encabezado Institucional Distrital:** Membrete formal de la República de Colombia, Alcaldía Mayor de Cartagena, Secretarías del Interior y Planeación, y Plan Distrital "Cartagena Ciudad de Derechos 2024–2027".
2. **Ficha Técnica Integral y Quórum:** Folio oficial, estado del acta, código oficial, shortcode ciudadano, nombre de la mesa, territorio/localidad, UCG, barrio, dirección exacta, coordenadas WGS84, fecha en español, horario, facilitador institucional, relator oficial, padrón de asistencia y certificación de quórum deliberativo verificado.
3. **Marco Normativo y Fundamento Jurídico Vinculante:** Preámbulo legal completo: Artículos 1 y 103 de la Constitución Política, **Ley Estatutaria 1757 de 2015**, estándar de **devolución motivada de la Sentencia C-150 de 2015**, **Decreto Distrital 1070 de 2021** y las **7 Dimensiones de Seguridad Humana de la ONU (Res. 66/290)**.
4. **Metodología de Concertación y Gobernanza:** Descripción de las 4 fases de coconstrucción democrática (Plenaria de apertura, submesas con papelógrafo de marco lógico, minipúblico con aleatorización de vocerías ciudadanas y plenaria de formalización).
5. **Diagnóstico Territorial Concertado — Árbol de Problemas:**
   - **Problema Central:** Destacado en Callout Box con acento azul (`#0284C7`).
   - **Tabla Causal Exhaustiva:** 4 columnas (`Nivel Causal`, `Descripción del Factor Causal`, `Dimensión ONU`, `Entidad Competente`) desglosando causas directas y causas raíz.
   - **Tabla de Efectos:** Nivel de impacto y consecuencias sobre el territorio y la población.
6. **Estructura Programática de Transformación — Árbol de Soluciones:**
   - **Objetivo Central Transformador:** Destacado en Callout Box con acento verde (`#16A34A`).
   - **Tabla de Medios y Acciones:** Jerarquía de medios de primer nivel, acciones operativas y dependencias ejecutoras.
7. **Matriz Vinculante de Compromisos Institucionales y Ciudadanos:**
   - Tabla formal de 6 columnas:
     1. `#` (código del compromiso, ej. `COMP-01`).
     2. `Compromiso / Acción Concertada`.
     3. `Entidad Responsable`.
     4. `Plazo / Vigencia`.
     5. `Indicador Verificable`.
     6. `Veeduría Custodia`.
8. **Memoria Técnica y Síntesis de la Relatoría Comunitaria:** Síntesis articulada de las deliberaciones, intervenciones comunitarias, acuerdos de convivencia y notas de campo.
9. **Dispositivo Logístico y Garantías de Participación:** Constancia de equipamiento, rotafolios de marco lógico, hidratación, bioseguridad y accesibilidad universal.
10. **Certificación de Integridad Digital y Fe Pública:**
    - Declaración de fe pública administrativa bajo la Sentencia C-150 de 2015.
    - Sello criptográfico determinista **SHA-256 de 64 caracteres** en tipografía Courier-Bold.
    - Sello temporal UTC y entidad custodia (Alcaldía Mayor de Cartagena).
    - **Código QR dinámico de alta resolución** (PNG nítido generado en memoria) con enlace HTTPS de validación inmediata.
11. **Bloque Solemne de Suscripción y Cuadro de Firmas (4 Firmantes):**
    - Facilitador(a) Institucional (Alcaldía Mayor de Cartagena).
    - Relator(a) Oficial de la Mesa (Secretaría de Planeación Distrital).
    - Representante Comunitario(a) / JAC / JAL.
    - Vocero(a) de la Veeduría Ciudadana Territorial (Ley 1757 de 2015).

---

## 4. Evidencia de Pruebas y Verificación

### 4.1 Suite de Pruebas en Backend (`pytest`)
Se ejecutó la suite de pruebas unitarias e integración en [`backend/tests/test_acta_pdf.py`](file:///root/polis/backend/tests/test_acta_pdf.py):
```bash
$ uv run pytest tests/test_acta_pdf.py -k test_generar_acta_pdf -v
============================= test session starts ==============================
tests/test_acta_pdf.py::test_generar_acta_pdf_unitario_con_qr PASSED     [ 50%]
tests/test_acta_pdf.py::test_generar_acta_pdf_estilos_google_docs_exhaustivo PASSED [100%]
======================= 2 passed, 3 deselected in 9.01s ========================
```
- Valida la generación vectorial con ReportLab, la presencia de QR, la extracción de metadatos de árboles y compromisos, y la verificación íntegra del texto extraído vía `pdftotext`.

### 4.2 Verificación del Archivo PDF Generado (`pdfinfo` y `pdftotext`)
Generado con datos reales en [`data/Acta_Oficial_Mesa_01a0f5fe_GoogleDocs.pdf`](file:///root/polis/data/Acta_Oficial_Mesa_01a0f5fe_GoogleDocs.pdf):
```
Title:           (anonymous)
Producer:        ReportLab PDF Library - (opensource)
Pages:           3
Page size:       612 x 792 pts (letter)
File size:       14733 bytes
PDF version:     1.4
```
- Exactamente **3 páginas perfectamente balanceadas**.
- Cero desbordamientos de página, cero solapamientos de texto y formato de fecha 100% en español (*«24 de septiembre de 2026»*).

### 4.3 Pruebas Frontend de Mesas (`bun test`)
```bash
$ bun test src/features/mesas
 168 pass
 0 fail
 666 expect() calls
Ran 168 tests across 14 files. [4.93s]
```

### 4.4 Quality Gates del Repositorio (`bun run check`)
```bash
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```
- `ui-policy`: **0 infracciones**.
- TypeScript (`tsc --noEmit`): **0 errores**.
- Linter (`eslint .`): **0 errores, 0 advertencias**.

---

## 5. Salvaguardas de Entorno
- Base de datos `bd_csh` intacta (congelada en migración 0096).
- Cero commits de git (`git commit`) y cero operaciones de push (`git push`).
- Archivos listos para revisión y congelación.
