# ENCARGO 282: UX, Branding Ples SAS y Validación Pública de Códigos QR de Constancias

- **Destinatario:** Subagente Especialista Frontend & Branding (`invoke_subagent`) / AGY2
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-10-31
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Solicitud del usuario:**
  > *"el encabezado no es legible, porque el fondo es oscuro y el texto es negro, creo que el texto olis de 'polis', debe ser claro. en alguna parte debe decri que la plataforma polis es de Ples SAS. o debe tener un link que lleve a un apagina que describa el sistema polis, y sus alcances y quien es el dueño. tambien debemos desarrollar el sistema apra que el QR se pueda validar"*

---

## 1. Alcance y Requerimientos de la Tarea

### Requerimiento 1: Corrección de Legibilidad del Logo y Encabezado ("OLIS")
1. En `public/logo-polis.svg` y cualquier componente de encabezado:
   - El isotipo "P" mantiene su degradado/acento cian (`#0284C7`, `#38BDF8`, `#0369A1`).
   - Las letras "O", "L", "I", "S" ("olis") actualmente tienen `stroke="#000000"`, lo que las hace invisibles en encabezados oscuros (plantillas de correo con cabecera `#0F172A`, modo oscuro, etc.).
   - Modificar `public/logo-polis.svg` para que las letras "OLIS" sean claras/blancas (`stroke="#FFFFFF"`) con alta legibilidad sobre fondos oscuros o crear variante adaptativa / versión clara optimizada.
   - Verificar que en el encabezado (`src/app/_components/topbar.tsx` y donde se use el logo/marca) el contraste cumpla WCAG AAA sobre fondos oscuros.

### Requerimiento 2: Atribución Institucional de Propiedad a Ples SAS y Página Descriptiva
1. **Pie de Página (`src/shared/layout/footer.tsx`):**
   - Incorporar explícitamente la mención de autoría y propiedad: *«POLIS es una plataforma de participación ciudadana y gobernanza desarrollada y de propiedad de Ples SAS»*.
   - Agregar enlace visible: `Acerca de POLIS`.
2. **Página Descriptiva del Sistema POLIS (`src/app/acerca/page.tsx`):**
   - Crear la ruta pública `/acerca` (y asegurar redirección/compatibilidad desde `/acerca-de-polis`).
   - Contenido estructurado:
     - **Qué es POLIS:** Plataforma Integral de Participación, Inteligencia Territorial y Seguridad Humana.
     - **Alcances del sistema:** Deliberación comunitaria, geodiagnóstico territorial, trazabilidad del ciclo de políticas públicas (Ley 1757 de 2015, Sentencia C-150 de 2015), fe pública transaccional (POLIS Herald).
     - **Titularidad y Desarrollo:** Desarrollado, operado y de propiedad de **Ples SAS** (Ples SAS, NIT / contacto: `contacto@ples.com.co`, `https://ples.com.co`).
     - Diseño responsive, tokens semánticos, acorde a la guía de estilo POLIS UI.

### Requerimiento 3: Sistema de Validación Pública de Códigos QR
1. **Problema identificado:**
   - POLIS Herald genera códigos QR en `backend/app/modules/notificaciones/router.py` y `plantillas_stack.py` codificando la URL:
     `{url_base}/aportes/{codigo_radicado}` (ej. `https://seguridadhumanaintegral.org/aportes/POL-2026-XXXX`).
   - Al escanear el QR desde un dispositivo móvil, el frontend no contaba con la ruta `/aportes/[codigo]`, resultando en un error 404.
2. **Implementación de la Página de Validación:**
   - Crear la ruta pública accesible por móvil y escritorio:
     `src/app/aportes/[codigo]/page.tsx` (y alias/soporte para `/verificar/[codigo]`).
   - La vista debe:
     - Leer el parámetro `codigo` de la URL (ej. `POL-2026-ABCD`).
     - Consultar el endpoint público de fe pública del backend:
       `GET /api/v1/notificaciones/radicado/{codigo_radicado}`.
     - Mostrar una tarjeta oficial de verificación de fe pública ciudadana:
       - Sello de constancia auténtica distrital.
       - Código de radicado oficial.
       - Título de la propuesta / aporte radicado.
       - Autor / remitente ciudadano.
       - Dimensión / territorio.
       - Fecha y hora oficial del despacho legal.
       - Estado del trámite institucional.
     - En caso de radicado inválido o no encontrado, mostrar aviso claro y opción de búsqueda manual.
     - Adaptable a dispositivos móviles (vista mobile-first limpia para usuarios que escanean desde la cámara del celular).

---

## 2. Criterios de Aceptación y Calidad

1. `public/logo-polis.svg` actualizado con trazos claros (`stroke="#FFFFFF"`) en las letras "OLIS".
2. Atribución a **Ples SAS** en pie de página y enlace a la nueva página `/acerca`.
3. Página pública `/acerca` funcional, informativa, responsive y con tokens semánticos.
4. Ruta `/aportes/[codigo]` operativa que valida el código QR escaneado con la API de radicados.
5. Verificaciones obligatorias:
   - `node scripts/ui-policy.mjs` sin errores.
   - `bun run typecheck` en verde.
   - Pruebas unitarias correspondientes pasando.
6. Sin commit ni push.
