# Encargo 268 — Entrega FREEBUFF: "Marco legal", "Contacto" y Footer

**Fecha:** 29 de octubre de 2026
**Solicitante:** Usuario administrador general
**Coordinador:** Antigravity (`agy:0.0`)
**Estado:** Completado con validaciones aprobadas

---

## 1. Alcance ejecutado

| Archivo | Acción | Contenido |
| --- | --- | --- |
| `src/app/marco-legal/page.tsx` | **Crear** | Página institucional del marco legal. |
| `src/app/contacto/page.tsx` | **Crear** | Página institucional de contacto y canales (Server Component con metadata; el formulario vive en su hijo cliente). |
| `src/app/contacto/buzon-contacto.tsx` | **Crear** | Formulario de contacto ("use client") con estado, validación y confirmación accesible. |
| `src/shared/layout/footer.tsx` | **Modificar** | `Marco legal` y `Contacto` pasan de spans "(en preparación)" a enlaces `/marco-legal` y `/contacto`; queda solo `Trazabilidad` con la etiqueta "(en preparación)". |

No se tocaron `.next`, el `public/` desplegado ni el proceso `polis-frontend.service` (instruction de deployment de Codex respetada). Sin commits ni push.

## 2. Implementación

### A. Marco legal (`src/app/marco-legal/page.tsx`)

Server Component estático, tokens semánticos (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`), sin imágenes, sin framer-motion y con `Footer` común. Cinco secciones ancladas (`#constitucional`, `#nacional`, `#distrital`, `#internacional`, `#salvaguardas`) con navegación de anclaje interna:

- **Constitucional:** Art. 1, 2, 74, 103 y 209 de la Constitución de 1991 con su lectura participativa y de acceso a la información.
- **Nacional:** Ley Estatutaria 1757/2015 (participación y control social), Ley 1712/2014 (transparencia, máxima divulgación y datos abiertos), Ley Estatutaria 1581/2012 + Decreto 1377/2013 (Habeas Data, tratamiento ético, despojo de metadatos EXIF/GPS, anonimización, salvaguardas a líderes), Ley 2294/2022 (PND "Colombia Potencia Mundial de la Vida", Seguridad Humana y Justicia Social).
- **Distrital:** Acuerdo Distrital 139/2024 (Plan de Desarrollo "Cartagena, Ciudad de Derechos" 2024–2027, Línea Estratégica 1: Seguridad Humana) y Decreto Distrital 037/2026 (PSHC, formulación participativa en 35 mesas territoriales).
- **Internacional:** Resolución ONU 66/290 de 2012 (miedo, necesidad y dignidad), informe PNUD 1994 (7 dimensiones), Agenda 2030 y ODS 1, 2, 3, 5, 8, 10, 11, 13 y 16.
- **Salvaguardas:** confidencialidad, protección integral de víctimas y líderes, y acción sin daño.

### B. Contacto (`src/app/contacto/page.tsx` + `src/app/contacto/buzon-contacto.tsx`)

- **Entidad convocante:** Alcaldía Mayor de Cartagena de Indias — Secretaría del Interior y Convivencia Ciudadana / Secretaría de Planeación Distrital. Sede Plaza de la Aduana, Calle de la Inquisición #30-31 (Centro Histórico). Horario Lun–Vie 8:00–12:00 y 14:00–17:00. Correo/PQRSD `seguridadhumana@cartagena.gov.co` (mailto activo).
- **Mesas territoriales:** tarjeta orientadora para las **35 mesas** en 3 localidades urbanas y la zona rural e insular.
- **Buzón ciudadano** (componente cliente): campos de nombre completo, contacto (correo/teléfono), territorio/localidad (con sugerencias nativas via `datalist` para los territorios), tipo de mensaje (`Select` del kit: consulta / aporte metodológico / solicitud institucional) y cuerpo del mensaje (`Textarea`). Validación por campo, errores con `FormField.error` (IDs de asociación `aria-describedby`/`aria-invalid`), confirmación de éxito con `role="status"` + `aria-live="polite"` y "Enviar otro mensaje" para repetir intentos.

**Nota de alcance:** el buzón conserva el mensaje solo en la memoria visual del navegador y no lo envía a un endpoint; está pendiente de definición operativa (backend institucional de PQRSD o correo formal de la Secretaría). Se explicita en la UI que los datos se tratan bajo la Ley 1581/2012 y no se publican.

### C. Footer

Se conservan intactos los estilos `label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline` para los dos enlaces nuevos; solo `Trazabilidad` conserva la etiqueta "(en preparación)" y el resto de la estructura (Modo Barrio, Datos abiertos, marca, copyright) no se tocó.

## 3. Restricción de despliegue de Codex y validaciones ejecutadas

Restricción aceptada: **no se ejecutó `bun run build` sobre `.next`** (proceso activo del Frontend de producción).

| Validación | Comando | Resultado |
| --- | --- | --- |
| UI-policy / guardas | `bun run ui:check` (dentro de `bun run check`) | **Correcto** ("controles, tokens, capas, inventario, historias y política a11y correctos"). |
| TypeScript | `bun run typecheck` (`tsc --noEmit`) | **Exit 0**. |
| ESLint archivos propios | `bunx eslint` sobre los 4 archivos | **0 errores**. |
| ESLint proyecto completo | `bun run lint` (dentro de `bun run check`) | **Falló — no por este encargo**: 2 errores `no-unused-vars` (`ExternalLink`, `Building2`) en `src/features/geovisor/components/mapa-cartagena.tsx`, con **118 insertions sin commitear** de otro agente (commit base `55956bc` "GEO-UX-SCROLL-01"). No se tocó para no interferir el trabajo concurrente. |
| Build aislado | `POLIS_NEXT_DIST_DIR=.build-test-268 bun run build` | **Exit 0**, sin tocar `.next`; `/marco-legal` y `/contacto` prerenderizados (`server/app/marco-legal.html`, `server/app/contacto.html`). Artefacto **eliminado** tras validar. |

> Nota: la primera corrida de build con `POLIS_NEXT_DIST_DIR=/tmp/...` falló porque `scripts/build-polis.mjs` exige distDir **relativo** al checkout (línea 68). La segunda corrida usó `POLIS_NEXT_DIST_DIR=.build-test-268` (relativo, fuera de `.next`).

### No ejecutados (justificación limite / fuera de alcance)

- **`bun run ui:test` y `storybook:build`:** esta entrega no crea ni modifica componentes en `src/shared/ui`, solo consume los existentes (`FormField`, `Input`, `Textarea`, `Select`, `Button`, `Footer`); las historias y su política axe no se afectan. Ya corregidos en evidencia el resto de checks para el alcance de la petición.
- **`bun run build` sin aislamiento (`.next` real):** prohibido por la instrucción de Codex mientras `polis-frontend.service` sirve `.next` en caliente.

## 4. Diferido / conocido

1. **Buzón sin backend:** hasta definir el sistema institucional de PQRSD (o endpoint backend autorizado), el envío es local; se declara en la UI y en el comentario del componente.
2. **`lint` global:** los 2 errores de `geovisor/mapa-cartagena.tsx` no fueron creados ni corregidos por esta entrega; no afectan al bundle propuesto (`/marco-legal`, `/contacto`, `footer.tsx`, `buzon-contacto.tsx`) y se espera que el agente de geovisor los cierre al terminar su trabajo.
3. **Build aislado** usó `.build-test-268` relativo porque el wrapper `build-polis.mjs` rechaza distDir absolutos (documentado arriba), no por elección de layout de archivos.

## 5. Estado del working tree al cierre

```
 M src/shared/layout/footer.tsx
?? src/app/contacto/
?? src/app/marco-legal/
```

Sin commits ni push; listo para revisión de Antigravity y/o integración de Codex.
