# Plan de remediación UI — 13/10/2026

Origen: `Revision_ui_13102026.md` (§5, hallazgos F1–F4). Ejecución por `agy2`;
auditoría: `agy`. Los 8 fallos de `bun run ui:test` se agrupan en 4 causas.

Archivos prohibidos por trabajo paralelo (no tocar): `backend/app/modules/geodatos/*`,
`backend/alembic/*`, `src/features/geovisor/*`.

| Orden | Hallazgo | Archivo | Corrección | Verificación |
| --- | --- | --- | --- | --- |
| 1 | F1 — Contraste 4,06:1 (axe `color-contrast`, WCAG 1.4.3) en metadatos de pestañas héroes | `src/features/plataforma/components/gestor-heros-plataforma.tsx:264` | Quitar `opacity-75` del span y usar `text-[var(--text-secondary)]` | Historia `plataforma-interna › Configuracion` verde en `bun run ui:test` |
| 2 | F2 — Aserciones síncronas sobre contenido asíncrono (3 historias: Usuarios, Testimonios, Testimonios Oscuro) | `src/app/_stories/plataforma-interna.stories.tsx:269,326,332` + mock `identidadApi.usuarios` | `findByRole`/`findByText` en las primeras vistas del play; alinear la expectativa de la vista actual («cuentas registradas») con datos mock suficientes (8 cuentas de demo, incluir Ana Pérez); conservar la restauración de mocks en el cleanup del `beforeEach` | Las 3 historias verdes; sin timeouts |
| 3 | F3 — Banner duplicado/anidado (axe `landmark-banner-is-top-level`, `landmark-no-duplicate-banner`) en las vistas con héroe embebido | `src/features/politicas/components/hero-page-banner.tsx` (`<header role="banner">`) + su prueba | Cambiar el héroe embebido a `<section aria-label>` (región, no banner): un solo banner por documento (el del shell). Actualizar la prueba de semántica para exigir la nueva regla (cambio justificado del test: la aserción anterior codificaba el comportamiento violatorio) | Historias `platform › Explorar`, `› Sin Resultados`, `› Mesas` verdes (sin violaciones axe) |
| 4 | F4 — Historia `Crear Mesa Completa` contra API real sin mock (regla 8 del kit) | `src/app/_stories/platform.stories.tsx` (mock `window.fetch` del meta) | Añadir manejo de `POST /api/v1/mesas` que ecosée el cuerpo con `id` generado y 201; NO se cambia `mesa-editor-panel.tsx` ni su comportamiento real | Historia `platform › Crear Mesa Completa` verde: store recibe la mesa y se abre el panel de la mesa creada |

Verificación global tras 1–4 (meta 206/206):

```bash
bun run ui:test   # 206/206
bun run check     # ui:check + tsc --noEmit + eslint
bun test          # unitarios frontend
```

Reglas: sin cambios a `ui-policy.mjs` ni `a11y: { test: "error" }`; sin `git add -A`
(commit por rutas explícitas); sin push, restarts ni despliegues. Resultados y
evolución se registran al final en `Revision_ui_13102026.md` (§9 bits antes/después).
