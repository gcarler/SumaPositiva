# DICTAMEN EAF — [UI-REMED-01] Remediación UI/Storybook (F1–F4) y Cierre O1 Accesibilidad

**Auditor:** `agy` — **Commit evaluado:** `4de846a` — **Fecha:** 13-oct-2026
**Dictamen:** ✅ **APROBADO SIN RESERVAS (PRODUCCIÓN Y STORYBOOK 100 % EN VERDE)**

---

## 1. Verificación independiente por hallazgo (F1–F4 + O1)

1. **F1 — Contraste WCAG 1.4.3 (`color-contrast`) en pestañas de héroes (`src/features/plataforma/components/gestor-heros-plataforma.tsx:264`):**
   - **Verificado:** Sustitución de `opacity-75` por `text-[var(--text-secondary)]` en el `<span>` de ruta de las 7 pestañas (`role="tab"`).
   - **Resultado:** La historia `plataforma-interna › Configuracion` aprueba `axe-core` en Chromium headless (807 ms, 0 violaciones).
2. **F2 — Aserciones asíncronas y aislamiento de mocks (`src/app/_stories/plataforma-interna.stories.tsx`):**
   - **Verificado:** Uso de `findByRole` / `findByText` en `Usuarios`, `Testimonios` y `TestimoniosOscuro`; mock completo de `identidadApi` (8 cuentas demo con `Ana Pérez`, `crearUsuario`, `editarUsuario`, `roles`, `ambitosUsuario`) y restauración limpia con `structuredClone(cuentasBase)` en el retorno de `beforeEach`.
   - **Resultado:** Las 23 historias de `plataforma-interna.stories.tsx` pasan al 100 % (`Usuarios` 1.408 ms, `Testimonios` y `TestimoniosOscuro` 301 ms).
3. **F3 — Eliminación de landmark `banner` duplicado/anidado (`src/features/politicas/components/hero-page-banner.tsx` y `.test.tsx`):**
   - **Verificado:** El contenedor del héroe embebido migró de `<header role="banner">` a `<section aria-label={titulo}>`, garantizando un único landmark `banner` de nivel superior en el documento.
   - **Resultado:** 8/8 pruebas unitarias en `hero-page-banner.test.tsx` en verde y 0 violaciones `landmark-banner-is-top-level` / `landmark-no-duplicate-banner` en `platform › Explorar`, `› Sin Resultados` y `› Mesas`.
4. **F4 — Mock determinista de `POST /api/v1/mesas` (`src/app/_stories/platform.stories.tsx`):**
   - **Verificado:** Interceptación de `POST /api/v1/mesas` con respuesta HTTP `201` y eco de entidad con `id` generado en `CrearMesaCompleta`, respetando la regla 8 del kit UI sin alterar `mesa-editor-panel.tsx`.
   - **Resultado:** Las 24 historias de `platform.stories.tsx` pasan al 100 % (`Crear Mesa Completa` en 2.190 ms).
5. **O1 — Solapamiento cosmético en barra lateral de accesibilidad (`src/shared/ui/accesibilidad-widget.tsx`):**
   - **Verificado:** Las clases de expansión horizontal (`hover:w-[196px] focus-within:w-[196px] focus-visible:w-[196px]`) y opacidad de etiqueta quedan condicionadas a `!isOpen`, con jerarquía explícita `z-20` en `#panel-mas-opciones-a11y` frente a `z-10` en `<nav>`.
   - **Resultado:** 6/6 pruebas unitarias en `accesibilidad-widget.test.tsx`, 6/6 historias en `accesibilidad-widget.stories.tsx` y captura `a11y-subpanel-mas-opciones.png` verificada visualmente sin solapamiento.
6. **Documentación y Trazabilidad (`Revision_ui_13102026.md` y `docs/plan-remediacion-ui-13102026.md`):**
   - **Verificado:** Sección `§9. Resultados de la remediación ejecutada — antes/después` incorporada en `Revision_ui_13102026.md` con la comparativa completa.

---

## 2. Certificación Independiente de Guardas, Servicios y Base de Datos

- **Guardas estáticas (`bun run check`):** `ui-policy.mjs` (`UI001`–`UI008`), `tsc --noEmit` y `eslint .` → **0 errores**.
- **Storybook + Axe-Core (`vitest --project=storybook`):** **53/53 historias verificadas en los 3 archivos auditados** (y **212/212** en la suite global de 17 archivos) con **0 violaciones WCAG**.
- **Suite unitaria (`bun test`):** **547/547 pruebas pasadas** en 63 suites (aislamiento SSR en `accesibilidad-store.test.ts` verificado).
- **Producción:** `polis-frontend` activo; `GET /` → `HTTP 200 OK`, `GET /geovisor` → `HTTP 200 OK`; árbol Git limpio (`git status -s` vacío).
- **Censo `bd_csh` intacto:** **33 mesas, 36 agendas, 11 fichas, 17 actores, 12.280 filas de hurtos**.
