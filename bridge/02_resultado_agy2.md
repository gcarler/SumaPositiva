# INFORME PERICIAL DE IMPLEMENTACIÓN TÉCNICA — TAREA [DOC-PDF-ACTAS-01]
## EXPORTADOR OFICIAL DE ACTAS COMUNITARIAS EN PDF FOLIADO CON MEMBRETE DISTRITAL, CÓDIGO QR Y SELLO CRIPTOGRÁFICO SHA-256

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Sábado, 10 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[DOC-PDF-ACTAS-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md` (Fase 1: Tarea 1.1)  
**Severidad Atendida:** ALTA / OPERATIVA (Fe Pública, Validez Jurídica Distrital y Radicación Ciudadana)  
**Estado de la Entrega:** 100% Ejecutada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo de la Implementación

En cumplimiento estricto de la orden técnica **[DOC-PDF-ACTAS-01]**, se ha diseñado, implementado y verificado de punta a punta el sistema de **Generación y Descarga de Actas Oficiales de Mesas Comunitarias en formato PDF vectorial** para la plataforma distrital POLIS (Cartagena de Indias).

Esta solución resuelve la brecha de validez jurídica e interoperabilidad comunitaria: hasta ahora las actas estaban confinadas a un registro JSON en base de datos. A partir de esta entrega, los facilitadores territoriales, secretarios de despacho, líderes comunales y veedurías ciudadanas pueden **descargar e imprimir el documento oficial foliado** con membrete de la Alcaldía Mayor de Cartagena, código QR dinámico de verificación pública y sello criptográfico SHA-256 para radicación ante cualquier órgano de control.

---

## 🛠️ 2. Arquitectura y Componentes Implementados

### A. Backend (`FastAPI / Python 3.12 / ReportLab 5.0.1 / qrcode`)
1. **Generador Vectorial de Actas (`backend/app/modules/mesas/acta_pdf.py`)**:
   - Maquetación con ReportLab usando `SimpleDocTemplate` y un canvas personalizado de doble pasada `ActaNumberedCanvas` para numeración exacta de páginas (*"Página X de Y"*) y pie de seguridad institucional.
   - **Membrete Oficial:** República de Colombia, Departamento de Bolívar, Alcaldía Mayor de Cartagena de Indias, Secretaría del Interior y Plan de Desarrollo *"Cartagena Ciudad de Derechos 2024-2027"*.
   - **Folio Único Institucional:** Formato `ACTA-MT-{codigo_oficial}-2026` o el consecutivo oficial persistido en `mesas_trabajo.actas_comunitarias.numero_acta`.
   - **Ficha Técnica y Quórum:** Nombre de la mesa, código oficial, shortcode ciudadano, lugar físico de realización (sincronizado con `mesa.lugar_nombre`), fecha, horario, facilitador responsable y total de asistentes verificados.
   - **Cuerpo Deliberativo (Sección I):** Resumen de la deliberación comunitaria y contexto de la jornada.
   - **Matriz de Acuerdos Concertados (Sección II):** Tabla estructurada con `#`, `Acuerdo / Compromiso Concertado`, `Entidad Responsable` y `Plazo / Meta`.
   - **Certificación de Fe Pública y Sello Criptográfico (Sección III):**
     - Sello hash SHA-256 (64 caracteres) en tipografía monoespaciada legible.
     - Código QR generado dinámicamente en memoria que apunta a `https://seguridadhumanaintegral.org/asistencia/{mesa_id}` para validación pública instantánea con la cámara de cualquier teléfono celular.
     - Párrafo legal de presunción de autenticidad e inmutabilidad.
   - **Cuadro de Firmas Oficiales (Sección IV):** Tres líneas de firma formal para Facilitador Institucional, Relator Comunitario y Veeduría Ciudadana.
2. **Servicio de Mesas (`backend/app/modules/mesas/service.py`)**:
   - Método `obtener_acta_pdf(mesa_id: uuid.UUID | str, url_base: str)`: Resuelve polimórficamente el identificador (UUID, código oficial o slug de agenda) mediante `_resolver_mesa_uuid`, consulta la mesa, acta y participantes, y compila el binario PDF con nombre de archivo canónico `Acta_Oficial_{codigo}_{fecha}.pdf`.
3. **Endpoint REST en Router (`backend/app/modules/mesas/router.py`)**:
   - `GET /api/v1/mesas/{mesa_id}/acta/pdf`: Retorna el binario con `media_type="application/pdf"`, cabeceras `Content-Disposition: inline; filename="..."` y control de caché `no-cache, no-store`.

### B. Frontend (`Next.js 16 / TypeScript / Turbopack / @/shared/ui/`)
1. **Cliente HTTP en `src/features/mesas/services/mesas-api.ts`**:
   - Función `descargarActaPdf(mesaId: string): Promise<Blob>`: Consume el endpoint remoto inyectando el Bearer token de la sesión activa y resolviendo identificadores.
   - Función `descargarActaPdfArchivo(mesaId: string, nombreArchivo?: string): Promise<void>`: Automatiza la descarga del archivo en el navegador del usuario vía `window.URL.createObjectURL`.
2. **Integración en `MesaActaPanel` (`mesa-acta-panel.tsx`)**:
   - Se reemplazó el antiguo placeholder de `window.print()` por `handleDescargarPdf` asíncrono con feedback descriptivo de `toast.info` y `toast.success`.
   - Botón institucional `Button` con variantes de estado (`Generando PDF...` / `Descargar Acta Oficial (PDF)`), respetando la política estricta `@/shared/ui/button`.
3. **Integración en `MesaPanel` (`mesa-panel.tsx`)**:
   - Añadido botón directo de descarga de PDF en la cabecera de acciones y pie del panel de la mesa de trabajo (`Download` icon + feedback descriptivo).

---

## 🛡️ 3. Verificación de Salvaguardas Institucionales

| Salvaguarda Institucional | Estado | Certificación y Evidencia |
|---|:---:|---|
| **Preservación Inviolable de BPIN** | ✅ INTACTA | Cero modificaciones a BPIN. Verificado con `git status --porcelain \| grep -i bpin` (0 coincidencias). |
| **Cero Acrónimos Ajenos** | ✅ CUMPLIDO | Cero reintroducción de DNP, MGA o SINERGIA en código modificado. Verificado con `git diff \| grep -iE "dnp\|mga\|sinergia"` (0 coincidencias). |
| **UI-Policy Estricta** | ✅ APROBADA | Uso exclusivo de controles `@/shared/ui/` (`Button`, etc.). Ejecutado `node scripts/ui-policy.mjs` $\rightarrow$ "POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos." |
| **Fidelidad Criptográfica** | ✅ CERTIFICADA | El hash SHA-256 impreso en el PDF coincide con el sellado en `mesas_trabajo.actas_comunitarias.sha256_acta`. |
| **Protocolo Zero-Push** | ✅ CUMPLIDO | Operación 100% confinada al repositorio local en la rama `main`. |

---

## 🔬 4. Resultados de Quality Gates y Hot-Verification

### Quality Gate 1: Verificación de Tipos, UI-Policy y Linting (`bun run check`)
```bash
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
# Exit code: 0 (Limpio, sin errores ni advertencias)
```

### Quality Gate 2: Suite de Pruebas Frontend Mesas (`bun test src/features/mesas`)
```bash
bun test v1.4.2 (744846f84)
src/features/mesas/services/agenda-api.test.ts: 8 passed
src/features/mesas/services/asistencia-api.test.ts: 11 passed
src/features/mesas/services/mesas-api.test.ts: 17 passed
  ✓ descargarActaPdf (DOC-PDF-ACTAS-01) > despacha GET /mesas/{mesaId}/acta/pdf y retorna Blob con contenido binario PDF
  ✓ descargarActaPdf (DOC-PDF-ACTAS-01) > resuelve código oficial o slug de agenda a UUID antes de descargar el PDF
Total: 36 pass, 0 fail, 147 expect() calls [1.98s]
```

### Quality Gate 3: Suite de Pruebas Backend (`pytest`)
```bash
backend/.venv/bin/pytest backend/tests/test_acta_pdf.py backend/tests/test_mesas_agenda.py backend/tests/test_actas_y_participantes.py backend/tests/test_mesas_ltree.py -q
.........                                                                [100%]
9 passed in 12.06s
```

### Quality Gate 4: Compilación Turbopack de Producción (`bun run build`)
```bash
$ next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
▲ Next.js 16.1.3 (Turbopack)
✓ Compiled successfully in 18.3s
✓ Finished TypeScript in 25.8s
✓ Generating static pages using 7 workers (190/190) in 1296.6ms
Finalizing page optimization in 450.4ms
# Exit code: 0 (190 rutas estáticas compiladas exitosamente en standalone)
```

### Quality Gate 5: Hot-Verification en Vivo contra el Servicio Activo (`localhost:8000`)
```bash
curl -s -D - http://127.0.0.1:8000/api/v1/mesas/MT-L01-01/acta/pdf -o /tmp/acta_test_live.pdf | head -n 12
HTTP/1.1 200 OK
date: Sat, 10 Oct 2026 16:44:51 GMT
server: uvicorn
content-disposition: inline; filename="Acta_Oficial_MT-L01-01_2026-02-01.pdf"
cache-control: no-cache, no-store, must-revalidate
content-length: 6344
content-type: application/pdf

head -c 10 /tmp/acta_test_live.pdf
%PDF-1.4
%
```

---

## 📦 5. Inventario de Archivos Modificados y Creados

1. **`backend/app/modules/mesas/acta_pdf.py`** *(Nuevo)*: Generador oficial ReportLab de actas PDF con membrete, QR dinámico y sello SHA-256.
2. **`backend/tests/test_acta_pdf.py`** *(Nuevo)*: Suite de integración pytest para generación y descarga de actas.
3. **`backend/app/modules/mesas/service.py`**: Integrado método `obtener_acta_pdf`.
4. **`backend/app/modules/mesas/router.py`**: Añadido endpoint `GET /{mesa_id}/acta/pdf`.
5. **`backend/pyproject.toml`** y **`backend/uv.lock`**: Añadida dependencia `reportlab>=5.0.1` y `qrcode>=8.2`.
6. **`src/features/mesas/services/mesas-api.ts`**: Añadidos métodos `descargarActaPdf` y `descargarActaPdfArchivo`.
7. **`src/features/mesas/services/mesas-api.test.ts`**: Pruebas unitarias de descarga de actas PDF.
8. **`src/features/mesas/panels/mesa-acta-panel.tsx`**: Botón de descarga real con feedback y estado de carga.
9. **`src/features/mesas/panels/mesa-panel.tsx`**: Acceso directo de descarga de acta PDF en cabecera y pie.
10. **`bridge/02_resultado_agy2.md`**: Protocolización del informe pericial.

---
*Informe pericial protocolizado por agy2. La tarea [DOC-PDF-ACTAS-01] queda 100% lista para contra-auditoría por el supervisor agy.*
