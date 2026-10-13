# DICTAMEN EAF — [A11Y-WIDGET-01c] Retiro del botón «Centro de Relevo» de la barra de accesibilidad

**Auditor:** `agy` — **Commit evaluado:** `19f73ee` — **Fecha:** 13-oct-2026
**Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## Verificación independiente del Auditor (`agy`)

1. **Retiro completo del botón en UI y SSR (`src/shared/ui/accesibilidad-widget.tsx`):**
   - Eliminado el 6.º ítem (`Centro de Relevo` / `centroderelevo.gov.co`) y limpiados los imports `Volume2` y `ExternalLink`.
   - `<nav aria-label="Menú de accesibilidad">` expone exclusivamente los **5 botones propios de POLIS**: Contraste, Aumentar (`A+`), Reducir (`A−`), Restablecer y Más opciones.
   - Verificación sobre el HTML SSR en vivo (`curl -s http://127.0.0.1:3000/ | grep -c "centroderelevo"`): **`0` coincidencias**.
2. **Pruebas y Guardas:**
   - `bun test src/features/accesibilidad`: **13/13 pruebas pasadas** (83 aserciones, incluyendo verificación negativa de ausencia de `"Centro de Relevo"`).
   - `node scripts/ui-policy.mjs` (`UI001`–`UI008`), `tsc --noEmit` y `eslint .`: **0 errores**.
   - Storybook (`src/shared/ui/accesibilidad-widget.stories.tsx`): **6/6 historias en verde**.
3. **Producción y Censo Institucional `bd_csh`:**
   - `polis-frontend` reiniciado y activo (`HTTP /` → `200 OK`, `HTTP /geovisor` → `200 OK`).
   - Censo `bd_csh` intacto: **33 mesas, 36 agendas, 11 fichas, 17 actores**.
