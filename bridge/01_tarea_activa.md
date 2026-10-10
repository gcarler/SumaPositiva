# TAREA ACTIVA: [DOC-PDF-ACTAS-01] EXPORTADOR OFICIAL DE ACTAS COMUNITARIAS EN PDF FOLIADO CON MEMBRETE DISTRITAL, CÓDIGO QR Y SELLO CRIPTOGRÁFICO SHA-256

**Fecha:** 2026-10-10  
**Fase:** FASE 1 — Supervivencia Operativa y Cierre Jurídico Documental  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / OPERATIVA (Fe Pública, Validez Jurídica Distrital y Radicación Ciudadana)

---

## 🎯 1. Justificación y Alcance del Requerimiento

La plataforma POLIS cuenta con sellado criptográfico inmutable SHA-256 para las actas de mesas comunitarias (`POST /api/v1/mesas/{mesa_id}/acta/cerrar`). Sin embargo, en el ejercicio de la administración pública y el control social en Cartagena de Indias, los facilitadores territoriales, secretarios de despacho, líderes comunales y veedurías ciudadanas requieren un **documento físico o digital oficial radicable** (PDF con membrete, folio único, firmas y código QR escaneable).

Sin este documento exportable, el acta queda confinada a un registro JSON en una base de datos que la comunidad y los órganos de control (Personería, Contraloría) no pueden anexar a expedientes administrativos ni radicar en ventanilla distrital.

---

## 📋 2. Especificación Técnica de la Tarea

### A. Backend (`backend/app/modules/mesas/`)
1. **Endpoint de Generación de PDF Oficial**:
   - `GET /api/v1/mesas/{mesa_id}/acta/pdf`
   - Retorna `application/pdf` con encabezados `Content-Disposition: inline; filename="Acta_{codigo_oficial}_{fecha}.pdf"`.
   - Utilizar ReportLab (instalando `reportlab` en el entorno virtual de backend) o generación de maquetación HTML $\rightarrow$ PDF limpia, vectorial y de alto rendimiento.
2. **Estructura Documental del Acta PDF**:
   - **Encabezado Institucional:** Escudo o membrete del Distrito de Cartagena de Indias, Alcaldía Mayor, y lema del Plan de Desarrollo *"Cartagena Ciudad de Derechos 2024-2027"*.
   - **Identificación Formal:** Número de Folio único (`ACTA-MT-{codigo_oficial}-{anio}`), fecha y hora de emisión.
   - **Ficha Técnica de la Mesa:** Nombre oficial de la mesa territorial, localidad, barrio/corregimiento, lugar de realización (sincronizado con la remediación FIX-EDIT-MESA-01), horario, facilitador responsable y entidad convocante.
   - **Quórum y Registro:** Total de participantes verificados en lista de asistencia, modalidad (presencial/mixta) y estado del acta (Cerrada / Concertada).
   - **Cuerpo Deliberativo y Acuerdos:**
     - Resumen ejecutivo de la deliberación comunitaria.
     - Tabla estructurada de Acuerdos Concertados (Compromiso, Entidad Responsable, Plazo estimado o meta).
   - **Pie de Seguridad y Cierre Forense:**
     - Hash SHA-256 oficial en tipografía monoespaciada legible.
     - Código QR dinámico que al ser escaneado con la cámara de un smartphone abre la URL de validación pública de la plataforma (`https://seguridadhumanaintegral.org/asistencia/{mesa_id}`).
     - Cuadro de firmas para el Facilitador Distrital y Relator Comunitario.

### B. Frontend (`src/features/mesas/`)
1. **Servicio API en `mesas-api.ts`**:
   - Función `descargarActaPdf(mesaId: string): Promise<Blob>` para consumir `GET /mesas/{mesa_id}/acta/pdf`.
2. **Integración en `MesaActaPanel` (`mesa-acta-panel.tsx`)**:
   - Botón institucional `Button` con icono de documento/descarga: *"Descargar Acta Oficial en PDF"*.
   - Habilitado tanto en modo lectura cuando el acta está concertada/cerrada, como en vista previa.
   - Manejo de descarga fluida en navegador con nombre de archivo canónico.
3. **Botón en Tarjeta de Mesa / Detalle (`MesaPanel`)**:
   - Acceso directo a la descarga del acta oficial si la mesa cuenta con acta cerrada.

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación BPIN:** No alterar referencias a BPIN.
2. **Cero Acrónimos Ajenos:** Cero mención a DNP, MGA o SINERGIA.
3. **UI-Policy Estricta:** Uso exclusivo de componentes `@/shared/ui/`. Cero `<button>` o `<input>` nativos en JSX.
4. **Fidelidad Criptográfica:** El hash SHA-256 impreso en el PDF debe coincidir bit a bit con el calculado y sellado en `mesas_trabajo.actas_comunitarias.sha256_acta`.
5. **Protocolo Zero-Push:** Commits locales en `main`.

---

## 🧪 4. Quality Gates y Criterios de Aceptación

1. `bun run check`: 0 errores TypeScript, 0 advertencias ESLint, UI Policy aprobada.
2. `bun test src/features/mesas`: Suite completa de pruebas de mesas pasando al 100%.
3. `pytest`: Pruebas de endpoint backend pasando con generación de PDF válida.
4. `bun run build`: Compilación limpia Turbopack.
5. Verificación visual del PDF generado: Márgenes, paginación, legibilidad de acuerdos, escudo/membrete y escaneabilidad del código QR.
6. Informe técnico en `bridge/02_resultado_agy2.md` y commit atómico local en `main`.
