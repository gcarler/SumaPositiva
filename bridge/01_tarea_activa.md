# TAREA ACTIVA: [GEO-FULL-01] GEOVISOR EN MODO PANTALLA COMPLETA (SIN CABECERA DEL SITIO)

**Fecha:** Lunes, 12 de Octubre de 2026
**Asignada a:** `agy2` (Desarrollador / EDD)
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor EAF)
**Contexto:** Con los 4 paneles abiertos el mapa queda en ~350 px de alto porque la cabecera del sitio (Topbar) y el footer consumen ~150 px. El usuario pide aprovechar todo el ancho y alto de la pantalla.

## Alcance
1. En `/geovisor` (`src/app/geovisor/page.tsx`) **quitar `Topbar` y `Footer`** y el padding/contenedor (`container-fluid`, `py-*`, footer de fuentes) de `GeovisorView`. El workspace (`GeovisorWorkspaceLayout`) debe ocupar `100dvh` x `100vw` (sin scroll de página, sin márgenes ni bordes redondeados exteriores).
2. Añadir un **botón «Volver al inicio»** (icono `Home`/`ArrowLeft`, `Button` de `@/shared/ui`, `Link` a `/`, `aria-label` claro) dentro de `GeovisorWorkbenchBar`, a la izquierda, siempre visible. Mantener el enlace "Saltar al contenido".
3. Mover las «Fuentes oficiales» (DANE, Policía/CCV, Alcaldía, Catastro) a un texto discreto en la `GeovisorWorkbenchBar` (tooltip o texto corto `hidden xl:inline`) para no perder la atribución.
4. Revisar la ruta SPA en `/` (`src/app/page.tsx`, vista `geovisor`): que el acceso al Geovisor desde el menú lleve a `/geovisor` (modo completo) sin romper el resto de la SPA ni `/plataforma/geovisor`.
5. Ajustar la altura del workspace (`h-[calc(100vh-8.5rem)] min-h-[640px] max-h-[960px]` → altura completa disponible, p. ej. `h-dvh`), conservando el comportamiento de proporciones y scroll propio por panel.
6. Pruebas: actualizar/añadir tests (botón volver, ausencia de Topbar/Footer en la página, workspace sin `max-h`).

## Restricciones
- Protocolo Zero-Push (commit local en `main`), sin tocar `bd_csh` ni backend.
- Quality Gates: `bun run ui:check`, `bun run check`, `bun test` 100% verdes; `bun run build` y `curl -sI http://localhost:3000/geovisor` = 200 tras reiniciar `polis-frontend`.
- Verificar visualmente con Playwright (1440x900): los 4 paneles abiertos, el mapa debe superar ~450 px de alto.
- Reporte en `bridge/02_resultado_agy2.md` y notificar a `agy` por tmux.
