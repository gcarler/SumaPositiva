# ENCARGO 320: REDISEÑO Y ELEVADA ELABORACIÓN EDITORIAL DE DOCUMENTOS OFICIALES DESCARGABLES (ESTILO GOOGLE DOCS)

**Para:** Subagente `agy2` (tmux `agy2:0`)  
**De:** Antigravity Principal  
**Fecha:** 2026-11-09  
**Referencia:** Petición expresa del usuario: *"los docuemtnos que permite descargar la plataforma parecen hechos con IA les fatla mayor nivel de elaboración, debes usar los esstilos de google doc, asignale esa tarea a agy2"*

---

## 1. Diagnóstico y Objetivo del Encargo

El usuario ha revisado los documentos descargables generados por la plataforma (especialmente el **Acta Oficial en PDF de las Mesas de Trabajo**) y ha emitido una directriz perentoria:
1. **Parecen hechos con IA y carecen de elaboración:** los documentos actuales presentan textos resumidos o esquemáticos tipo plantilla genérica, poca riqueza estructural, tablas básicas con bordes oscuros pesados y una apariencia sintética de borrador automático en lugar de un documento público solemne, técnico y exhaustivo.
2. **Debe adoptar los Estilos de Google Docs:** jerarquía visual limpia, márgenes equilibrados (1 pulgada / 2.54 cm), tipografía ejecutiva con espaciado 1.25–1.3, títulos en tonos gris neutro/azul institucional sobrio, tablas ejecutivas con fondos suaves (`#F3F4F6` / `#EFF6FF`) y líneas de división finas (`0.5 pt`, `#E5E7EB`), callouts laterales y encabezados/pies de página con numeración formal.
3. **Mayor nivel de elaboración y rigor metodológico:** los documentos deben reflejar la profundidad real de una relatoría territorial distrital (Ley 1757 de 2015, Decreto 1070/2021 de Cartagena, 7 Dimensiones de Seguridad Humana ONU, Árbol de Problemas y Soluciones completo, Matriz de Compromisos trazable con responsables e indicadores, y fe pública con SHA-256 y QR).

---

## 2. Archivos y Componentes Implicados

1. **Generador PDF Principal de Mesas (Backend):**
   - [`backend/app/modules/mesas/acta_pdf.py`](file:///root/polis/backend/app/modules/mesas/acta_pdf.py): Es el motor de generación en ReportLab que produce el binario de las actas oficiales (`GET /api/v1/mesas/{mesa_id}/acta/pdf`).
2. **Servicio y Enrutador de Mesas (Backend):**
   - [`backend/app/modules/mesas/service.py`](file:///root/polis/backend/app/modules/mesas/service.py): Método `obtener_acta_pdf`, hidratación de datos completos desde `mesa.metadatos` (árbol de problemas, árbol de soluciones, logística, compromisos, relatoría, participantes).
3. **Paneles Frontend de Visualización y Descarga:**
   - [`src/features/mesas/panels/mesa-acta-panel.tsx`](file:///root/polis/src/features/mesas/panels/mesa-acta-panel.tsx): Vista previa del acta y botón de descarga.
   - [`src/features/mesas/panels/mesa-panel.tsx`](file:///root/polis/src/features/mesas/panels/mesa-panel.tsx): Botones de exportación de PDF, CSV y relatoría.
   - [`src/features/mesas/components/matriz-arbol-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-arbol-relatoria.tsx): Exportación documental y de datos estructurados.

---

## 3. Especificación Técnica de Estilos Google Docs para ReportLab

Debes calibrar los estilos de ReportLab en `acta_pdf.py` para replicar el formato editorial estándar de un **Google Doc ejecutivo de alta calidad**:

### A. Tipografía y Jerarquía
- **Document Title (Título del Acta):** 20–22 pt Bold, color `#1F2937` (gris carbón profesional, no negro puro), centrado o alineado con espacio posterior de 10 pt.
- **Subtitle / Membrete:** 9–10 pt Regular/Bold, color `#4B5563`, espaciado fino, encabezado formal de la República de Colombia y Alcaldía Mayor de Cartagena.
- **Heading 1 (Secciones Principales):** 13–14 pt Bold, color `#1E3A8A` (azul institucional sobrio) o `#0F172A`, con línea divisoria sutil (`HRFlowable`, grosor 0.5–0.75 pt, color `#E2E8F0`), espacio antes 14 pt, espacio después 6 pt.
- **Heading 2 (Subsecciones):** 11 pt Bold, color `#334155`, espacio antes 10 pt, espacio después 4 pt.
- **Normal / Body Text:** 9 pt Regular, interlineado 12.5 pt (leading 1.35), color `#1F2937`, justificado o alineado a la izquierda.
- **Tablas:** Texto de celdas 8 pt Regular, color `#374151`, encabezados de columna 8 pt Bold `#111827`.

### B. Tablas Estilo Google Docs
- Fondo de encabezado: `#F8FAFC` o `#F1F5F9` (gris suave) o `#EFF6FF` (azul suave), nunca colores saturados o negros invasivos.
- Bordes de tabla: Cuadrícula tenue con líneas interiores de `0.5 pt` en `#E2E8F0` o `#CBD5E1`.
- Padding de celdas: `TOPPADDING=4`, `BOTTOMPADDING=4`, `LEFTPADDING=6`, `RIGHTPADDING=6`.
- Alternancia de filas: blanco puro `#FFFFFF` y gris neutro ultra suave `#FBFCFD`.

### C. Cajas de Resaltado (Callout Boxes)
- Marcos destacados para el Problema Central, Objetivo Central o Fe Pública:
  - Fondo: `#F8FAFC` (neutro) o `#F0FDF4` (acuerdos).
  - Borde izquierdo acentuado: 2.5 pt en color `#0284C7` (azul cívico) o `#16A34A` (verde compromiso).
  - Resto de bordes sutiles en `#E2E8F0`.

### D. Encabezado y Pie de Página de Doble Pasada
- Márgenes de página: `leftMargin=2.0*cm`, `rightMargin=2.0*cm`, `topMargin=2.0*cm`, `bottomMargin=2.0*cm`.
- Encabezado corriente: Tenue en páginas 2 en adelante (`#94A3B8`, 7.5 pt): *"POLIS — Acta Oficial de Concertación Territorial · Folio {folio}"*.
- Pie de página: Línea divisoria de `0.5 pt` en `#E2E8F0`, fe pública y trazabilidad a la izquierda, *"Página X de Y"* a la derecha.

---

## 4. Estructuración y Exhaustividad del Contenido (Cero Textos Genéricos)

El documento debe extraer e integrar **todo el trabajo real diligenciado en la mesa** (proveniente de PostgreSQL / `mesa.metadatos`), organizándolo en un expediente articulado de **múltiples páginas estructuradas**:

1. **Encabezado Institucional Distrital:**
   - República de Colombia · Departamento de Bolívar · Alcaldía Mayor de Cartagena de Indias.
   - Secretaría del Interior y Convivencia Ciudadana · Secretaría de Planeación Distrital.
   - Plan Distrital "Cartagena Ciudad de Derechos 2024–2027" · Sistema POLIS.

2. **Ficha Técnica Integral de la Mesa:**
   - Folio oficial, código territorial, nombre de la mesa territorial.
   - Localidad, Unidad Comunera de Gobierno (UCG) o Corregimiento, barrio, dirección exacta y coordenadas geográficas WGS84.
   - Fecha de realización, franja horaria, modalidad (presencial/mixta).
   - Facilitador(a) institucional acreditado(a), relator(a) designado(a).
   - Padrón oficial de asistencia y verificación de quórum deliberativo.

3. **Marco Normativo y Justificación Metodológica:**
   - Preámbulo legal formal bajo la Ley Estatutaria 1757 de 2015 (Participación Democrática), Decreto Distrital 1070 de 2021 y las 7 Dimensiones de Seguridad Humana de la ONU.

4. **Metodología y Modalidad de Participación:**
   - Explicación del modelo de gobernanza territorial implementado: asamblea deliberativa, submesas de trabajo temáticas y mecanismo de aleatorización/minipúblico para vocerías cívicas imparciales.

5. **Matriz de Diagnóstico Territorial — Árbol de Problemas:**
   - **Problema Central:** Redacción completa concertada, destacada en callout box.
   - **Tabla Causal Exhaustiva:**
     - Nivel (Causa Raíz / Causa Directa / Causa Secundaria).
     - Descripción textual detallada.
     - Dimensión ONU asociada (Personal, Comunitaria, Económica, Ambiental, Alimentaria, Salud, Política).
     - Entidad Distrital competente para su mitigación.
   - **Efectos e Impactos Territoriales:** Consecuencias documentadas sobre la convivencia, niñez y calidad de vida del territorio.

6. **Estructura Programática y de Transformación — Árbol de Soluciones:**
   - **Objetivo Central:** Meta transformadora concertada con la comunidad.
   - **Tabla de Medios y Acciones:** Medios de primer nivel, acciones operativas territorializadas y fines últimos de sostenibilidad.

7. **Matriz Vinculante de Acuerdos y Compromisos Institucionales:**
   - Tabla formal con:
     1. `#`
     2. `Acción o Compromiso Concertado`
     3. `Entidad Distrital / Sector Responsable`
     4. `Plazo de Ejecución y Vigencia Presupuestal`
     5. `Indicador de Cumplimiento Verificable`
     6. `Líder Comunitario / Veeduría Ciudadana Custodia`

8. **Síntesis Ejecutiva de la Relatoría Comunitaria:**
   - Transcripción y consolidación de los debates, intervenciones ciudadanas destacadas y conclusiones de los relatores de cada submesa.

9. **Logística y Recursos de la Sesión:**
   - Breve constancia técnica de los equipamientos, materiales e insumos territoriales desplegados.

10. **Certificación de Fe Pública, Trazabilidad Digital y Sello Criptográfico:**
    - Código hash SHA-256 determinista del acta oficial.
    - Código QR dinámico de alta resolución para validación inmediata por cualquier ciudadano en el portal web.
    - Cláusula de inmutabilidad y custodia digital.

11. **Bloque Solemne de Firmas:**
    - Líneas de firma con nombres, cargos, documento de identidad/organización para:
      - Facilitador(a) Institucional (Distrito de Cartagena).
      - Relator(a) Oficial de la Mesa Territorial.
      - Vocero(a) de la Veeduría Ciudadana / Control Social.
      - Delegado(a) Comunitario(a) o JAC.

---

## 5. Reglas Inquebrantables de Ejecución

1. **NO modificar el esquema de base de datos `bd_csh`:** Utilizar las columnas existentes (`mesas`, `mesas.metadatos`, `mesas_actas`). No ejecutar migraciones Alembic.
2. **NO realizar `git commit` ni `git push` directamente.**
3. **Calidad y Gates:**
   - Probar la generación del PDF con la suite de pruebas: `backend/tests/test_actas_pdf.py` o tests de mesas en backend y `bun test src/features/mesas`.
   - Validar que el PDF se genera con 0 errores de ReportLab.
   - Mantener TypeScript y ESLint 100% limpios en el frontend (`bun run check`).
4. **Verificación Visual:**
   - Generar un PDF de prueba de una mesa real (ej. `01a0f5fe-86df-717b-a4d0-5b6605bdf993`) y guardarlo como evidencia.

---

## 6. Entregable Esperado

1. Código implementado en `backend/app/modules/mesas/acta_pdf.py` y `backend/app/modules/mesas/service.py` (y frontend asociado si requiere enriquecimiento de visualización).
2. Informe de entrega formal en `bridge/320_entrega_agy2_estilos_google_docs_descargables.md`.
3. Actualización de `bridge/01_tarea_activa.md` marcando el estado de la tarea.
