# TAREA ACTIVA: [A11Y-WIDGET-01b] BARRA LATERAL DE ACCESIBILIDAD ESTILO FUNCIÓN PÚBLICA / GOV.CO

**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (cambios por pasos, verificar servicios y HTTP 200, `bd_csh` intacta 33/36/11/17, commits locales por ruta, nunca `git push`, sin `git add .`).

## Referencia visual indicada por el propietario
El propietario pidió seguir el diseño del widget de accesibilidad de Función Pública:
`https://www.funcionpublica.gov.co/web/mipg/resultados-medicion`

## Especificación exacta del patrón Función Pública / GOV.CO (inspeccionada por `agy`)
En `funcionpublica.gov.co`, el widget es una **barra vertical fija adosada al borde derecho de la pantalla** (`<nav aria-label="Menú de accesibilidad">`):
1. **Posición y contenedor:**
   - Fijo en el borde derecho a media altura: `position: fixed; top: 50%; right: 0; transform: translateY(-50%); width: 52px; border-radius: 12px 0 0 12px; padding: 6px 0;`.
   - En `/geovisor` (pantalla completa con paneles acoplados), ocultarlo o permitir colapsarlo a una pestaña mínima para no tapar el panel derecho del geovisor; en el resto de páginas públicas (`/`, `/barrio`, `/f`, `/asistencia`) mostrar la barra lateral completa.
2. **Botones apilados con expansión lateral al pasar el cursor o enfocar (`:hover` / `:focus-within`):**
   - Cada ítem mide `52px × 48px` en reposo y contiene un botón posicionado a la derecha (`right: 0; width: 52px; height: 48px; border-radius: 8px 0 0 8px; overflow: hidden; transition: width 0.25s ease`).
   - Dentro de cada botón hay una pastilla/recuadro con el ícono (`26px × 26px`, fondo contrastado y bordes redondeados `6px`) y a su derecha un `<span>` con el texto (`white-space: nowrap; opacity: 0; transition: opacity 0.2s`).
   - Al hacer `:hover` o `:focus-within`, el botón se expande hacia la izquierda hasta `width: 196px` y el `<span>` pasa a `opacity: 1`.
   - Con `prefers-reduced-motion` o modo movimiento reducido activo, la expansión es instantánea sin animación.
3. **Acciones directas en la barra (un clic sin abrir modal):**
   - **Contraste** (`aria-pressed`): alterna directamente entre contraste normal y Alto Contraste AAA (`[data-a11y-contrast="alto"]`).
   - **Aumentar** (`A+`): sube un paso el tamaño de texto (`100% → 125% → 150% → 200%`), deshabilitado en `200%`. Muestra el porcentaje actual en la etiqueta (`Aumentar (125%)`).
   - **Reducir** (`A−`): baja un paso el tamaño de texto (`200% → 150% → 125% → 100%`), deshabilitado en `100%`.
   - **Restablecer**: restaura todas las preferencias de accesibilidad a sus valores por defecto en un clic.
   - **Más opciones** (`aria-expanded`): despliega a la izquierda de la barra el panel compacto con los controles adicionales ya implementados (Modo claro/oscuro, Escala de grises, Espaciado de líneas y letras, Subrayar enlaces, Reducir movimiento). Cierra con `Esc`.
   - **Centro de Relevo / Signos en Red**: enlace externo oficial (`https://centroderelevo.gov.co/`, `target="_blank" rel="noopener noreferrer"`) como en la barra de Función Pública.
4. **Tokens y guardas POLIS:**
   - Usa únicamente tokens semánticos de `tokens.css` (sin colores hexadecimales ni arbitrarios en el TSX, cumpliendo `UI003`).
   - En modo Alto Contraste, la barra mantiene borde y contraste nítidos sin invertirse ni perder legibilidad.
   - Cumple 320 px / 375 px sin generar `scrollWidth > innerWidth`.

## Verificación requerida
- Actualizar `src/shared/ui/accesibilidad-widget.tsx`, su historia en Storybook y pruebas unitarias/Playwright para reflejar la barra lateral estilo Función Pública / GOV.CO con acciones directas y el subpanel de «Más opciones».
- Verificar `bun run check`, `bun test`, `bun run build`, reiniciar `polis-frontend` y reportar en `bridge/02_resultado_agy2.md`.
