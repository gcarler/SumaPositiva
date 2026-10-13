# TAREA ACTIVA: [UI-REMED-01] CULMINACIÓN DE REMEDIACIÓN UI/STORYBOOK (F1–F4 DE FREEBUFF) + AJUSTE O1 ACCESIBILIDAD

**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (`bd_csh` intacta 33/36/11/17, verificar servicios y HTTP 200, commits locales por ruta explícita, nunca `git push`, sin relajar `ui-policy.mjs` ni `a11y: { test: "error" }`).

## Contexto
`freebuff` elaboró el informe de auditoría `Revision_ui_13102026.md` y el plan `docs/plan-remediacion-ui-13102026.md`, dejando avanzados en el árbol de trabajo (sin commitear) los cambios para resolver los 4 hallazgos (**F1 a F4**) que hacían fallar 8 historias en `bun run ui:test`. Su sesión terminó antes de ejecutar la verificación final y el commit.

Tu misión es **retomar, revisar, completar y certificar** esos cambios de `freebuff` junto con la observación cosmética **O1** del dictamen `bridge/03_dictamen_revision.md`.

## Alcance Técnico

### 1. Remediación UI / Storybook F1–F4 (revisar y culminar el avance en el working tree)
1. **F1 — Contraste WCAG 1.4.3 (`color-contrast`) en pestañas de héroes (`src/features/plataforma/components/gestor-heros-plataforma.tsx`):**
   - Quitar `opacity-75` del `<span>` de ruta (`/explorar`, etc.) y usar `text-[var(--text-secondary)]` para superar el ratio 4.5:1 en la historia `plataforma-interna › Configuracion`.
2. **F2 — Aserciones asíncronas y aislamiento de mocks (`src/app/_stories/plataforma-interna.stories.tsx`):**
   - Usar `findByRole` / `findByText` en las historias `Usuarios`, `Testimonios` y `Testimonios Oscuro`, asegurar mock completo de `identidadApi.usuarios` y restaurar mocks limpiamente entre historias.
3. **F3 — Landmark `banner` duplicado/anidado (`src/features/politicas/components/hero-page-banner.tsx` y `.test.tsx`):**
   - Usar `<section aria-label={...}>` en lugar de `<header role="banner">` para que el documento tenga un único landmark `banner` de nivel superior (el del shell), y actualizar su prueba unitaria `hero-page-banner.test.tsx`.
4. **F4 — Mock de `POST /api/v1/mesas` en Storybook (`src/app/_stories/platform.stories.tsx`):**
   - Responder `201` con el cuerpo creado en el mock `window.fetch` del meta para que la historia `Crear Mesa Completa` sea 100 % determinista sin tocar `mesa-editor-panel.tsx`.

### 2. Subsanación de Observación Cosmética O1 (`src/shared/ui/accesibilidad-widget.tsx`)
- Cuando el subpanel `#panel-mas-opciones-a11y` está abierto (`isOpen === true`), evitar que los botones de la barra lateral (`<nav>`) se expandan horizontalmente a `196px` por encima del borde derecho del subpanel al conservar el foco o recibir `:hover` (p. ej. aplicando las clases de expansión `hover:w-[196px] focus-within:w-[196px] focus-visible:w-[196px]` solo cuando `!isOpen`, y asegurando que `#panel-mas-opciones-a11y` tenga `z-20` frente a `z-10` en `<nav>`).

## Verificación y Entrega Requerida
1. Ejecutar y dejar 100 % en verde:
   - `bun run ui:test` (todas las historias de Storybook + axe-core en Chromium headless: **0 fallos**).
   - `bun run check` (`ui:check` + `tsc --noEmit` + `eslint .`).
   - `bun test` (suite completa de pruebas unitarias frontend).
2. Documentar en `Revision_ui_13102026.md` una sección final (`§9. Resultados de la remediación ejecutada — antes/después`) con los conteos exactos de `bun run ui:test`, `bun test` y `bun run check`.
3. Ejecutar `bun run build`, reiniciar `polis-frontend`, verificar `HTTP 200` en `/` y `/geovisor`, confirmar censo `bd_csh` intacto (33/36/11/17), hacer commit local en `main` incluyendo los archivos de esta tarea (`Revision_ui_13102026.md`, `docs/plan-remediacion-ui-13102026.md` y los archivos de código/pruebas modificados) y registrar el informe en `bridge/02_resultado_agy2.md`.
