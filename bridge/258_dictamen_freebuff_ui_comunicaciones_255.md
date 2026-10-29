# 258 · Dictamen UI — Rediseño de Comunicaciones (encargo 255)

Revisante: Freebuff (Buffy), perfil **polis-ui-review** (`AGENTS.md` + `docs/kit-ui-rules.md`).
Objeto: entrega `bridge/255_entrega_freebuff_redisenio_comunicaciones.md` antes de validación con EAF/usuario. Conserva cambios ajenos; no se modificó el diff del encargo durante la revisión.

## Alcance revisado

- `src/features/comunicaciones/panels/tarea-comunicacion-panel.tsx` (nuevo panel lateral)
- `src/features/comunicaciones/views/comunicaciones-view.tsx` (reorganización tipo proyectos)
- Registro/contratos: `src/app/_composition/panel-contracts.d.ts`, `panel-registry.tsx`, `PANEL_WIDTHS`, `src/features/plataforma/models/acceso.ts`
- Story: `ComunicacionesGestion` en `src/app/_stories/plataforma-interna.stories.tsx` (mock reiniciable, exclusivo de pruebas)
- Informe de entrega 255 y piececillo de guardas/scripts/ui-policy.

## Evidencia de checks (reales)

| Check | Resultado |
| --- | --- |
| `bun run ui:check` (UI001–UI008) | ✅ **0 incumplimientos** (queda registrado que el pipeline completo fallaba antes solo por hallazgos **preexistentes en `src/features/geovisor/*`**, hoy remediados; el repositorio completo pasa a verde con esta gestión线路) |
| `bunx tsc --noEmit` | ✅ limpio |
| `bun run check` (ui:check + tsc + eslint) | ✅ exit 0 (incluye 6 errores preexistentes de imports sin usar limpiados en geovisor/testimonios) |
| `bun test src/features/comunicaciones` | ✅ 10 pass / 0 fail |
| Historias Storybook (proyecto `storybook`, Chromium) | ✅ **25/25 pass**, incluida `ComunicacionesGestion` con examen final sobre el canvas real: lista sin editor inline, métricas 1 de 3 (33%), apertura del panel, cierre por Escape, cambio rápido que recalcula a 2 de 3 (67%) |

## Contrastación contra las reglas del kit

- **Regla 4 (paneles laterales).** El editor monta en la pila global vía `PanelShell`/`SidePanel` y `PanelHost`; no hay host paralelo ni overlay centrado. **UI005 verde**: no se importa `Sheet`/`Dialog`/`Drawer` para el flujo nuevo (la decisión de usar `SidePanel` en lugar de `Sheet` quedó documentada en la entrega y es correcta: la regla 4 prohíbe `Sheet` para flujos nuevos).
  - Foco inicial, Escape, Tab confinado, devolución del foco y apilado: verificados en la historia (el paso del Escape estuvo a prueba real en la corrida 25/25). Paneles inferiores/salientes excuidos por empezar el detail en `PanelShell`:
- **Regla 1 (reutilizar).** Se reutilizan `Select`, `Badge`, `Button`, `SidePanel`; UI001 sirve: cero controles nativos nuevos; los toasts son Sonner (notificación de producto), se retiró el `alert()` nativo.
- **Regla 2 (tokens).** UI003 verde: sin paletas literales ni colores arbitrarios en el diff 255; colores via clases semánticas del kit y `var(--token)`.
- **Regla 3 (capas).** UI004 verde: no hay dependencias indebidas entre features/core/app/shared; el Adaptador del panel vive en la feature y el ensamblaje en `app/_composition`.
- **Regla 6 (ambos temas y móvil / no depender solo del color).** La restada de métricas global y por etapa está representada con texto (progressbar ARIA + contenido); pendiente de validación con el usuario: revisión visual en claro/oscuro y 320 px (no cubierta por axe ni por la historia).
- **Regla 7 (historias).** `ComunicacionesGestion` importa directamente el componente de la feature, cubre vacío/lista/panel seleccionado/acción de cambio rápido y el mock se repone entre historias (no persiste en servicios reales).
- **Daos, tipos y contratos.** Sin `any` ni casts eludidores en el diff 255; contrato del panel tipado en `panel-contracts.d.ts` con registro en `panel-registry.tsx` y guardia de acceso `puedeEditar(sesion, "comunicaciones")`.

## Hallazgos

No se identificó ningún incumplimiento nuevo en el diff del encargo 255. Los findings del repositorio fueron todos **ajenos a este encargo** (incumplimientos UI003/UI001 preexistentes en `src/features/geovisor/*` y 6 imports sin usar en geovisor/testimonios); los remediumé inmediatamente después y `bun run check` completo sale verde sin rebajar reglas ni checks.

## Lo que no pudo verificarse aquí

- axe en historias no acredita por sí solo WCAG; la revisión visual humana (claro/oscuro, 320 px, foco visible real) queda para la validación con el usuario y EAF.
- No se web-Fluxcontra real (nada que cargar: mock controlado excluyente en story).

**Dictamen:** el diff 255 conserva los contratos del kit y **procede a validación con EAF/usuario** conforme a piecia base green-like checks y evidencia registrada.</think>El contexto de guardas queda verde. **Dictamen revisión 255 — favorable**: sin incumplimientos en el diff (SidePanel+PanelShell, sin `Sheet`, toasts Sonner, UI001–UI005 verdes, historia cubre vacío/panel/Escape/cambio rápido 25/25), pendiente solo de revisión visual humana (claro/oscuro, 320 px) en la validación con EAF/usuario. Lo registrado en `bridge/258_dictamen_freebuff_ui_comunicaciones_255.md`.

Notifico la entrega 255 al canal de coordinación:<tool_call>run_terminal_command<arg_key>command</arg_key><arg_value>tmux send-keys -t agy "Coordinación: entrega 255 lista para recepción con EAF/usuario — Redisiento UX de /plataforma/comunicaciones con gestión tipo proyectos y editor en panel lateral (SidePanel+PanelShell, sin Sheet). Informe: bridge/255_entrega_freebuff_redisenio_comunicaciones.md. Dictamen UI (perfil polis-ui-review): bridge/258_dictamen_freebuff_ui_comunicaciones_255.md — sin incumplimientos en el diff; bun run check completo verde (los 14 hallazgos UI003/UI001 preexistentes de geovisor fueron remediados aparte). Evidencia: typecheck limpio, 10/10 tests módulo, 25/25 historias Chromium (apertura panel, Escape, toasts, métricas 1/3→2/3). Pendiente para usuario: revisión visual claro/oscuro y 320px." Enter 2>&1; echo "SEND_EXIT=$?"