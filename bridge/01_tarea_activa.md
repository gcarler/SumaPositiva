# TAREA ACTIVA: [A11Y-WIDGET-01] WIDGET DE ACCESIBILIDAD PARA LA PÁGINA PÚBLICA (TAMAÑO DE TEXTO, COLOR, CONTRASTE)

**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (cambios por pasos, verificar servicios y HTTP 200, `bd_csh` intacta 33/36/11/17, commits locales por ruta, nunca `git push`, sin `git add .`).
**Coordinación:** `freebuff` trabaja en `src/app/_stories/*`, `src/features/plataforma/components/gestor-heros-plataforma.tsx` y `src/features/politicas/components/hero-page-banner*`. No los toques.

## Pedido del propietario
Un widget de accesibilidad para el sitio público: tamaño de fuente, colores y contraste, que el visitante controla y que se recuerda entre visitas.

## Estado actual (verificado por `agy`)
- Tema claro/oscuro con `next-themes` (`src/app/layout.tsx`, `ThemeToggle` en `src/app/_components/topbar.tsx`). Tokens en `src/shared/design-system/tokens.css` (`:root` y `.dark`, oklch).
- No existe escala de texto, modo de alto contraste ni otras preferencias.

## Alcance (v1)
Ubicación: componente nuevo `src/features/accesibilidad/` (widget + store + pruebas), montado en el layout de las rutas públicas (`/`, `/geovisor`, `/barrio`, `/f`, `/asistencia` y demás públicas). No en `/plataforma` en esta versión.

Controles:
1. **Tamaño de texto:** 4 pasos (100 %, 125 %, 150 %, 200 %) mediante la raíz `html`, y que el diseño siga en `rem`. Botones A− / A+ y restablecer.
2. **Contraste:** Normal / **Alto contraste** (texto ≥ 7:1 AAA, bordes y foco visibles ≥ 3:1, definido como tokens bajo `[data-a11y-contrast="alto"]` en `tokens.css` para claro y oscuro; sin colores literales por pantalla, guarda UI003).
3. **Color:** tema Claro/Oscuro (reutiliza `next-themes`) y **escala de grises**. No prometas «modo daltónico» con filtros aproximados; si lo incluyes, que sea una paleta de estados con símbolos/etiquetas que no dependan solo del color y documenta el alcance.
4. **Lectura:** espaciado de líneas y de letras (normal/amplio), **subrayar enlaces**, **reducir movimiento** (además de respetar `prefers-reduced-motion`).
5. **Restablecer todo** con un botón.

Comportamiento:
- Persistencia en `localStorage` (clave versionada, solo preferencias, sin datos personales ni cookies). Valores inválidos se ignoran.
- Respetar preferencias del sistema como valor inicial (`prefers-contrast`, `prefers-reduced-motion`, `prefers-color-scheme`) hasta que el visitante elija.
- Aplicar las preferencias al cargar sin parpadeo **sin añadir `'unsafe-inline'` ni relajar la CSP** (está en Report-Only; no la modifiques). Si necesitas un script temprano, usa nonce/hash compatible o aplica en un efecto de cliente y documenta el compromiso.
- Botón flotante (≥ 44 px) con `aria-label` «Accesibilidad», que abre un panel (usa los primitivos existentes de `shared/ui`; Zero-Modals: sin diálogo bloqueante). Teclado completo, `Esc` cierra y devuelve el foco, `aria-pressed`/`role` correctos, anuncios con `aria-live` al cambiar.
- No debe tapar el contenido ni los controles del geovisor; en 320 px no genera scroll horizontal. Con texto al 200 % no hay pérdida de contenido ni solapes (WCAG 1.4.4 y 1.4.10) en `/` y `/geovisor`.
- El mapa del geovisor no se altera (solo la interfaz alrededor).

## Calidad
- Alta del componente en `catalog.ts` (inventario UI006), historia en Storybook con axe en estado normal, alto contraste, oscuro y 200 % (`a11y.test: "error"` sin rebajar), `bun run ui:check`, `tsc`, `eslint`.
- Pruebas unitarias del store (valores por defecto, persistencia, valores corruptos, reset, preferencias del sistema) y del componente.
- Playwright (1440 y 375 px): abrir con teclado, cambiar cada control, recargar y verificar persistencia, axe sin violaciones de contraste en `/` y `/geovisor` en alto contraste y oscuro.
- Despliega (build + reinicio de `polis-frontend`) y verifica HTTP 200. Reporta en `bridge/02_resultado_agy2.md` con capturas y espera dictamen.
