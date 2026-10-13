# TAREA ACTIVA: [A11Y-WIDGET-01c] RETIRAR BOTÓN DE CENTRO DE RELEVO DE LA BARRA DE ACCESIBILIDAD

**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (`bd_csh` intacta 33/36/11/17, verificar servicios y HTTP 200, commits locales por ruta explícita, nunca `git push`).

## Solicitud del propietario
> *"quita el boton de: 'centro de relevo' quitalo porque no tiene nada y no carga nada"*

## Alcance Técnico
1. **`src/shared/ui/accesibilidad-widget.tsx`:**
   - Eliminar por completo el 6.º ítem de la barra lateral (`Centro de Relevo` / `https://centroderelevo.gov.co/`) y limpiar los imports en desuso (`Volume2`, `ExternalLink`).
   - La barra lateral debe quedar únicamente con los **5 botones propios de POLIS**:
     1. Contraste
     2. Aumentar (`A+`)
     3. Reducir (`A−`)
     4. Restablecer
     5. Más opciones
2. **Pruebas y Storybook (`src/features/accesibilidad/accesibilidad-widget.test.tsx`, `src/shared/ui/accesibilidad-widget.stories.tsx`):**
   - Actualizar las pruebas unitarias e historias de Storybook que verifiquen la presencia del enlace a Centro de Relevo, asegurando que validen que ya no existe en la barra.
3. **Verificación y Despliegue:**
   - Ejecutar `bun test src/features/accesibilidad`, `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`) y `bunx vitest run --project=storybook src/shared/ui/accesibilidad-widget.stories.tsx`.
   - Ejecutar `bun run build`, reiniciar `polis-frontend`, verificar `HTTP 200` en `/` y `/geovisor`, hacer commit local por ruta y reportar en `bridge/02_resultado_agy2.md`.
