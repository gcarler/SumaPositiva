# Encargo 271 — Entrega FREEBUFF: vista de Trazabilidad con diagrama UML del ciclo de vida de la política pública

**Fecha:** 29 de octubre de 2026
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Encargado a:** Freebuff (`=freebuff:0.0`)
**Estado:** COMPLETADO — esperando auditoría de calidad de `agy:0.0` antes del commit (orden del usuario: **NO hacer commit**)

---

## 1. Alcance ejecutado

| Archivo | Acción | Contenido |
| --- | --- | --- |
| `src/app/trazabilidad/page.tsx` | **Crear** | Server Component con metadata SEO y estructura de página institucional que integra el diagrama interactivo. |
| `src/app/trazabilidad/diagrama-trazabilidad.tsx` | **Crear** | Componente cliente con el diagrama UML interactivo de 3 vistas conmutables. |
| `src/shared/layout/footer.tsx` | **Modificar** | `Trazabilidad (en preparación)` pasa a `<Link href="/trazabilidad">Trazabilidad</Link>` con los estilos institucionales del kit conservados. |

Sin commits ni push. Los archivos quedan en el working tree para revisión de calidad antes del commit autorizado.

---

## 2. Contenido metodológico del diagrama UML

Se implementó el ciclo completo de principio a fin de una política pública articulado con el andamiaje del DNP y el caso Cartagena de Indias.

### A. Carriles de actores (swimlanes UML)

Grid de 5 carriles × 5 fases, con conectores verticales entre actividades de cada carril:

1. **Ciudadanía y comunidades territoriales:** 35 mesas (3 localidades urbanas + zona rural e insular), radicación multicanal (WhatsApp Inbox, plataforma, formularios, actas), veedurías y control social (Ley 1757/2015).
2. **Equipo técnico distrital (Planeación, DADIS, Interior):** diagnóstico participativo y árbol de problemas, banco de alternativas con evaluación MGA, estructura de las 28 líneas estratégicas (LE) bajo las 7 Dimensiones, banco de proyectos BPIM e interpretación del avance.
3. **Nivel político-normativo (Alcaldía y Concejo):** encargo del proceso (Decreto 037/2026), deliberación en Consejo de Gobierno, decisión de viabilidad (rombo: **Sí → adopción vinculante / No → devolución a Fase 2**), adopción y recalibración.
4. **Entidades ejecutoras y operadores:** fichas plurianuales con FONSET/SGP/SGR/Recursos Propios, matriz plurianual, ejecución con JAC, supervisión física/financiera.
5. **Órganos de control y monitoreo (Personería, Contraloría, POLIS):** salvaguardas de datos, auditoría de la deliberación, control de adopción (Ley 1474/2011), geovisor en tiempo real y dictámenes con bucle de retorno.

Se incluyen dos tarjetas complementarias: **rombos de decisión** (viabilidad fiscal en Fase 3, caminos Sí/No) y **bucle de retroalimentación** (Fase 5 → Fase 1 o 2).

### B. Las 5 fases metodológicas (matriz detallada)

Cada fase tiene ficha desplegable accesible con: **Objetivo, Actores clave, Entradas, Procesos, Salidas/Entregables, Marco legal aplicable y Módulo POLIS asociado**:

1. Alistamiento y diagnóstico territorial participativo (Terridata, DANE, actas; despojo de metadatos EXIF/GPS y Habeas Data; árbol de problemas).
2. Formulación y deliberación de alternativas (banco de alternativas, ponderación costo-beneficio, 28 líneas bajo 7 Dimensiones).
3. Adopción y Plan de Acción e Inversión (armonización presupuestal, Decreto Distrital 037/2026, matriz plurianual FONSET/MPI, banco BPIM).
4. Implementación, contratación y ejecución territorial (licitaciones transparentes, convenios solidarios con JAC, brigadas y programas sociales).
5. Seguimiento, auditoría social y rendición de cuentas (avance ponderado, evaluación de impacto, semáforos, decisiones de recalibración).

Marco legal citado por fase: Decreto 037/2026, Acuerdo 139/2024, Ley 1757/2015, Ley 1712/2014, Ley 1581/2012, Ley 2294/2022, Ley 1474/2011, Ley 2175/2021, Ley 1417/2010 (JAC) y Ley 1414/2010 (contraloría social).

### C. Ciclo de vida del dato ciudadano (Data Lineage)

Vista 3 con 10 pasos numerados y prefijo de radicado único por etapa, de punta a punta: `R-0001` (aporte en mesa de Pozón o Barú) → `INB-0001-2026` (inbox durable WhatsApp/web) → `DIAG-0001` (árbol de problemas geocodificado) → `ALT-0001` (alternativa MGA) → `LE-03` (línea estratégica con meta) → `PPI-2026-LE03-01` (matriz plurianual} → `BPIM-2026-045` (proyecto/contrato} → `EJEC-0001` (ejecución} → `GV-EJEC-0001` (geovisor/semáforo} → rendición de cuentas y recalibración (vuelta a Fase 1 o 2).

---

## 3. Experiencia de usuario e implementación

- **Patrón de proveedor Tabs/Accordion del kit:** se usó `Tabs` y `Accordion` de `src/shared/ui` (Radix) con `data-[state=active]` y tokens semánticos; sin botones crudos ni overlays (regla UI001 del kit POLIS).
- **Paleta 100% tokens:** `var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`, `var(--info)`, `var(--success)`. Sin Tailwind literal ni colores arbitrarios (regla UI003).
- **Iconografía Lucide:** `Workflow`, `ClipboardList`, `Recycle`, `FileCheck2`, `Landmark`, `ScrollText`, `ArrowDown`.
- **Responsive:** contenedor `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12`; el swimlane se ve completo en escritorio y admite desplazamiento horizontal controlado (`overflow-x-auto` con `min-w-[1080px]`) en móvil; la ficha de fases y la línea de vida del dato fluyen en single column.
- **Accesibilidad:** Tabs nativa radial (roles + teclado ← →), Accordion accesible (`aria-expanded`, `aria-controls`), iconos `aria-hidden` con etiqueta visible complementaria (no depende solo de color), foco visible heredado del kit.
- **Server/cliente correcto:** `page.tsx` (Server) con metadata y `diagrama-trazabilidad.tsx` (client) — separación en cumplimiento del patrón de la plataforma (`/marco-legal` y `/contacto`).

---

## 4. Validaciones ejecutadas (encargo §5)

| # | Validación | Comando | Resultado |
| --- | --- | --- | --- |
| 1 | UI-policy / guardas | `node scripts/ui-policy.mjs` (via `bun run ui:check`) | **0 incumplimientos** ("controles, tokens, capas, inventario, historias y política a11y correctos"). Correcciones previas aplicadas: 2 usos crudos de `<button>` → refactor a `Tabs`/`Accordion` del kit. |
| 2 | TypeScript | `bun run typecheck` (`tsc --noEmit`) | **Exit 0** (se corrigió un error de key en la matriz de la ficha durante el ciclo de verificación). |
| 3 | ESLint | `bunx eslint` sobre los 3 archivos nuevos y modificados | **0 errores, 0 warnings** (`ESLINT_EXIT=0`). |
| 4 | Compilación aislada | `POLIS_NEXT_DIST_DIR=.build-test-271 bun run build` | **Exit 0**; verificado que `/trazabilidad` prerenderizó (`server/app/trazabilidad.html`). **Directorio `.build-test-271` eliminado tras validar.** `.next` (build de producción activo de `polis-frontend.service`) **no fue tocado.** |
| 5 | No commit | `git status` | Working tree solo con los 3 archivos nuevos/modificados: ` M src/shared/layout/footer.tsx`, `?? src/app/trazabilidad/`. Sin commits ni push. |

> Nota sobre el lint global (`bun run lint`): falla por errores pre-existentes y ajenos en `src/features/geovisor/components/mapa-cartagena.tsx` (trabajo concurrente no commiteado de otra tarea, GEO-UX-SCROLL-01). No fue creado ni corregido por esta entrega y no afecta a los archivos propios (ESLint directo sobre ellos pasa limpio).

---

## 5. Delimitaciones declaradas (límites de la entrega)

1. **Sin backend nuevo:** la vista es informativa institucional; los códigos de radicado del data lineage son ilustrativos del prefijo del inbox y actos administrativos, no consultan la base (eso pertenece a Dashboard de seguimiento / módulos de seguimiento ya existentes en el producto).
2. **El `lint` global** queda pendiente de cierre por el trabajo concurrente de geovisor (afecta `bun run check` completo, no las validaciones del §4).
3. **Commit bloqueado por diseño:** según la orden del encargo y del usuario, Freebuff **no ejecutó commits**; se espera la auditoría de calidad de `agy:0.0` antes del paso a commit.

---

## 6. Enlaces de contexto

- Tarea de origen: `bridge/271_tarea_freebuff_trazabilidad_uml_politica_publica.md`
- Footer: `src/shared/layout/footer.tsx`
- Página: `src/app/trazabilidad/page.tsx`
- Diagrama UML: `src/app/trazabilidad/diagrama-trazabilidad.tsx`
