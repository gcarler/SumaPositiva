# DICTAMEN EAF — Cierre [GEO-HURTOS-01] (R1/R2) y Entrega [A11Y-WIDGET-01b]

**Auditor:** `agy` — **Commits evaluados:** `e887439` (`[GEO-HURTOS-01]`) y `75a0a66` (`[A11Y-WIDGET-01b]`) — **Fecha:** 13-oct-2026
**Dictamen Global:** ✅ **APROBADO (PRODUCCIÓN CERTIFICADA)**

---

## 1. Cierre de Reservas `[GEO-HURTOS-01]` (Commit `e887439`) — ✅ APROBADO SIN RESERVAS

### Verificación independiente del Auditor (`agy`)
- **R1 — Guarda de política de acceso (`docs/permisos-api.md`):**
  - Endpoints `GET /api/v1/geodatos/analitica/hurtos/resumen` y `GET /api/v1/geodatos/analitica/hurtos/geojson` registrados con control `publico` y justificación documental.
  - Ejecución independiente de `uv run pytest tests/test_access_policy.py tests/test_geodatos_analitica_hurtos.py`: **104/104 pruebas pasadas** (27.26 s). Suite integral de backend certificada en **527/527 pruebas pasadas**.
- **R2 — Limpieza de caracteres corruptos (`U+FFFD` / `chr(65533)`):**
  - Respaldo previo verificado en `/root/polis/backups/bd_csh_20261013_170430.dump` (`SHA-256: 598c53a4606e8f60f6477c42736b02db9f54fd73c44130aa919d75406e5bf478`).
  - Normalización transaccional aplicada tanto en `clase_sitio` (319 filas) como en `dia_semana` (3.573 filas: `sáb.`, `mié.`), e incorporada de forma permanente en `REEMPLAZOS_TEXTO` dentro de `backend/scripts/ingestar_hurtos.py`.
  - Consulta SQL independiente en `bd_csh`:
    `SELECT count(*) FROM geodatos.estadisticas_hurtos WHERE clase_sitio LIKE '%' || chr(65533) || '%' OR armas_medios LIKE '%' || chr(65533) || '%' OR dia_semana LIKE '%' || chr(65533) || '%' OR delito LIKE '%' || chr(65533) || '%' OR mes LIKE '%' || chr(65533) || '%';` → **`0` filas corruptas** sobre `12.280` filas (`18.242` casos).

---

## 2. Barra Lateral de Accesibilidad `[A11Y-WIDGET-01b]` (Commit `75a0a66`) — ✅ APROBADO

### Verificación independiente del Auditor (`agy`)
- **Fidelidad al patrón Función Pública / GOV.CO:**
  - Contenedor `<nav aria-label="Menú de accesibilidad">` fijo en el borde derecho (`top-1/2 right-0 -translate-y-1/2 w-[52px] rounded-l-xl`).
  - Seis ítems apilados (`52px × 48px`) con pastilla de ícono (`26px × 26px`) y expansión lateral suave a `196px` en `:hover`, `:focus-within` y `:focus-visible` (instantánea con `prefers-reduced-motion` o `data-a11y-reduced-motion="true"`).
  - Acciones directas a un clic: **Contraste** (`aria-pressed`), **Aumentar (`A+`)**, **Reducir (`A−`)**, **Restablecer**, **Más opciones** (`aria-expanded`, cierra con `Escape` y clic externo devolviendo foco al disparador) y enlace oficial a **Centro de Relevo** (`https://centroderelevo.gov.co/`).
  - En `/geovisor`, se inicia colapsado en una pestaña mínima compacta (`w-7 h-14`) para no obstruir los paneles acoplados del SIG, permitiendo desplegar y volver a colapsar la barra.
  - Excluido de rutas privadas `/plataforma`.
- **Guardas de Diseño, Tipado y Pruebas:**
  - `node scripts/ui-policy.mjs` (`UI001`–`UI006`): **APROBADO** (0 colores arbitrarios, Zero-Modals respetado, registrado en `catalog.ts` con historia Storybook y política `a11y: "error"`).
  - `bun test src/features/accesibilidad`: **13/13 pruebas pasadas** (82 aserciones).
  - `bunx tsc --noEmit` y `bun run lint`: **0 errores**.
  - Auditoría E2E Playwright + `@axe-core/playwright`: **14/14 pasos aprobados** y **0 violaciones WCAG AA/AAA** en modo normal y alto contraste; sin desbordamiento horizontal en `320px` ni `375px`.
- **Producción y Censo Institucional `bd_csh`:**
  - `HTTP /` → `200 OK` (expone `aria-label="Menú de accesibilidad"` en SSR) y `HTTP /geovisor` → `200 OK`.
  - Censo `bd_csh` intacto: **33 mesas, 36 agendas, 11 fichas, 17 actores**.

### Observación cosmética menor (no bloqueante)
- **O1 — Solapamiento al mantener foco/hover sobre «Más opciones» con el subpanel abierto:** En `src/shared/ui/accesibilidad-widget.tsx` (visible en la captura `a11y-subpanel-mas-opciones.png`), cuando `isOpen === true` y el botón «Más opciones» conserva el foco o el cursor, su expansión a `w-[196px]` se dibuja por encima del borde derecho del subpanel `#panel-mas-opciones-a11y` (`right-[60px]`). En un próximo ajuste cosmético se recomienda suprimir la expansión horizontal de los botones de la barra cuando `isOpen` esté activo (o elevar el `z-index` del subpanel a `z-20`).
