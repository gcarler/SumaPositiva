# Revisión UI — 13/10/2026

**Alcance:** sistema de diseño (`src/shared/design-system`), biblioteca de
componentes (`src/shared/ui`), Storybook (`.storybook`, `src/app/_stories`) y
consolidación de los resultados de auditoría forense (EAF) pertinentes a frontend.

**Método:** skill `polis-ui-review` + reglas de `docs/kit-ui-rules.md`; guardas
automáticas ejecutadas en esta revisión en local (Linux, Bun/Node, Chromium
headless) con registro del estado de salida de cada comando, más inspección
manual de componentes, historias y hallazgos con archivo/línea.

**Revisión Git evaluada:** `main` @ `8069f3e`.

---

## 1. Resumen ejecutivo

| Verificación | Resultado |
| --- | --- |
| Guardas del kit (`bun run ui:check` — UI001–UI008) | ✅ Conforme, 0 incidencias |
| Pruebas del validador (`bun run ui:policy:test`) | ✅ 8/8 |
| TypeScript + ESLint (`bun run check`) | ✅ 0 errores |
| Build frontend (`bun run build`) | ✅ Exitoso |
| Build Storybook (`bun run storybook:build`) | ✅ Exitoso |
| Historias en Chromium (`bun run ui:test`) | ❌ **8/206 fallan** (2 archivos; §5) |

**Conclusión:** no se detectó ninguna violación de las reglas estructurales del
kit (capas, fuente única de tokens, reutilización de primitivos, inventario,
patrón de paneles): las guardas estáticas pasan al 100 %. Los defectos están en
la evidencia dinámica (axe y Testing Library) y quedan trazados a 4 causas
raíz, todas reproducidas y con corrección concreta (§5 y §8).

---

## 2. Sistema de diseño (tokens y fundaciones)

Evaluación de `src/shared/design-system/tokens.css` y `styles.css`:

- **Temas claro/oscuro completos:** superficies, texto, bordes, estados
  (`success`, `warning`, `danger`, `info`), acento `ember` y rol
  `role-authority` definidos en ambos temas con `oklch`.
- **Una fuente de tokens:** los literales están confinados a `tokens.css` en las
  ubicaciones permitidas (marca Google, series de gráficos, colores de
  territorio y categorías de reporte). La guarda UI003 no encuentra paletas
  Tailwind, colores arbitrarios ni literales por pantalla.
- **Escalas compartidas:** espaciado (`--space-1..16`), alturas de controles
  (36/44/48 px), radios, duraciones (`--duration-*`) y curvas
  (`--ease-standard`), coherentes con `docs/design-system.md`.
- **Capas de paneles:** `--layer-dropdown: 100` mantiene `SelectContent` sobre
  la pila de `PanelHost`; el resguardo y la historia `SelectEnPanelApilado`
  siguen presentes como exige el kit.
- **Compatibilidad shadcn:** los alias (`--primary`, `--muted`,
  `--destructive`, `--sidebar-*`…) mapean a semánticos de POLIS; no existen
  paletas paralelas.
- **Movimiento:** el decorador global de Storybook usa
  `MotionConfig reducedMotion="user"`.

**Observación:** el único defecto de contraste reproducido se origina en un uso
de `opacity-75` sobre `--text-tertiary` a 10 px (ver [F1]); es un problema del
componente consumidor, no de los tokens. Tras corregirlo, reevaluar.

---

## 3. Biblioteca de componentes (`src/shared/ui`)

- **Inventario:** 57 entradas en `catalog.ts` (55 `ready` + 2
  `compatibility`: `toast`/`toaster`, exento protocolizado). El conteo
  coincide con la validación de inventario de `ui:check` (UI006): sin
  duplicados ni registros falsos.
- **Historias directas:** Button 14, catálogo 46, FormField 6, Patterns 12,
  SidePanel 5 y Fundaciones 7 historias de kits; cumple la guarda UI007
  (cada componente `ready` importado por al menos una historia).
- **Independencia de capas:** sin imports de `features`/`core`/`app` en
  `shared/ui` (guarda UI004, incluidos relativos y dinámicos). Radix, Vaul y
  cmdk permanecen encapsulados en `shared/ui` (UI002).
- **Patrón de producto:** `SidePanel` mediante `PanelShell`/`PanelHost`; sin
  aparición de overlays de compatibilidad (`Dialog`, `Drawer`, `Sheet`) en
  flujos nuevos de features (guarda UI005).

---

## 4. Storybook

- `main.ts`: historias de `src/shared/**` y `src/app/**`; addons `docs`,
  `addon-a11y`, `addon-vitest`; Tailwind vía `viteFinal`. Build exitoso.
- `preview.tsx`: `a11y: { test: "error" }` activo (no rebajado), selector
  global de tema Claro/Oscuro con `forcedTheme`, `MotionConfig
  reducedMotion="user"`, `lang="es"` y fondo institucional en las pantallas.
- **Volumen:** 206 historias en 16 archivos (83 del kit y 116 de pantallas
  reales en `src/app/_stories/`, más Fundaciones/MDX).

---

## 5. Ejecución de historias con axe (`bun run ui:test`)

**Comando:** `bun run ui:test` — **exit 1**: 198 aprobadas, **8 fallidas** en
16 archivos (2 afectados); reproducido en dos corridas consecutivas. Las 4
causas, con la traza capturada en el log completo de la corrida durante esta
revisión:

### F1 (1 historia, 7 elementos) — Contraste 4,06:1 en metadatos de pestañas (axe `color-contrast`)

- **Historia:** `plataforma-interna › Configuracion`.
- **Archivo:** `src/features/plataforma/components/gestor-heros-plataforma.tsx:264`
  — `<span class="font-mono text-[10px] opacity-75 truncate">/explorar</span>` en
  la numeración interna de 7 pestañas (`role="tab"`).
- **Evidencia:** «insufficient color contrast of 4.06 (foreground `#7f7e7a`,
  background `#ffffff`, font size 10 px)… Expected contrast ratio of 4.5:1»
  (WCAG 1.4.3, nivel AA).
- **Causa:** `--text-tertiary` en claro compone `#7f7e7a` (ya débil) y el
  `opacity-75` atenúa de nuevo el resultado rompiendo el 4,5:1.
- **Corrección:** quitar `opacity-75` de ese span y usar
  `text-[var(--text-secondary)]` (o calibrar un token de metadatos ≥ 4,5:1 en
  ambos temas); re-ejecutar `ui:test`.

### F2 (3 historias) — Aserciones síncronas sobre contenido asíncrono (Testing Library)

- **Historias:** `plataforma-interna › Usuarios`, `› Testimonios`,
  `› Testimonios Oscuro`.
- **Error:** `TestingLibraryElementError: Unable to find an accessible element
  with the role "heading" and name "Moderación de Testimonios"` (y equivalente
  en Usuarios), con los `roles` listados.
- **Archivos:** `src/app/_stories/plataforma-interna.stories.tsx:261` (ya con
  `UsuariosGestionView`), `:326`/`:332` (Testimonios y variante Oscura).
- **Causa:** las vistas muestran skeletons mientras el mock REST (fetch
  simulado vía `window.fetch`) resuelve, pero la historia usa
  `c.getByRole("heading", …)` inmediato sin `findBy*` ni `waitFor`.
- **Corrección:** convertir a `await c.findByRole(...)` (o `waitFor` sobre
  `getByRole`) y restaurar los mocks en `afterEach` para que la variante
  Oscura no herede estado de la historia previa.

### F3 (3 historias) — Landmarks banner duplicado/anidado (axe)

- **Historias:** `plataforma-pantallas › Explorar`, `› Sin Resultados`,
  `› Mesas`.
- **Evidencia (2 infracciones por historia):**
  1. `landmark-banner-is-top-level` — un `<header role="banner"
     aria-label="Líneas Estratégicas y Gobernanza Distrital"
     class="…rounded-2xl…">` contenido dentro de otro landmark.
  2. `landmark-no-duplicate-banner` — un segundo `<header class="sticky
     top-0 z-40 …">` en el mismo documento.
- **Archivo origen del dato:** `src/features/politicas/data/hero-pages.data.ts:179`
  (`titulo: "Líneas Estratégicas y Gobernanza Distrital"`); el `<header>` lo
  emite el componente héroe que consume esa data (PageHeader de héroes).
- **Corrección:** en la presentación embebida de héroes usar `<div>` o
  `<section>` (no `<header>`) cuando el elemento no es banner de página, y
  garantizar un único banner por documento en el shell de plataforma.

### F4 (1 historia) — «Crear Mesa Completa» depende de la API real sin mock

- **Historia:** `plataforma-pantallas › Crear Mesa Completa`
  (`src/app/_stories/platform.stories.tsx`).
- **Error:** `AssertionError: expected false to be true` en
  `expect(useMesasStore.getState().mesas.some(m => m.nombre === "Mesa de
  convivencia barrial")).toBe(true)`.
- **Causa:** `src/features/mesas/panels/mesa-editor-panel.tsx:463-479` — la
  creación llama primero `crearMesaRemota()` (fetch HTTP a `/api/v1/mesas`);
  en Storybook no hay backend (ni mock de esa ruta), la promesa falla en
  `toast.error` y el store nunca registra la mesa.
- **Consecuencia:** incumplimiento de la regla 8 del kit («los mocks de
  pantallas… no escriben a servicios reales») y pérdida de cobertura de la
  creación de mesas desde la integración de la API persistente.
- **Corrección:** mockear `/api/v1/mesas` (o `crearMesaRemota`) en la
  historia respondiendo `id`/`codigoOficial`, y conservar la aserción del
  store sobre la respuesta mockeada.

---

## 6. Consolidado de resultados de auditoría forense (EAF)

### 6.1 Dictamen de identidad (12-oct-2026)

- **APROBADO CON RESERVAS** (`docs/plan-trabajo.md`, fila 12-oct-2026;
  expediente: `bridge/expediente_eaf_identidad.md`), con estas evidencias:
  flujo en navegador real, servicios FastAPI, sesiones reales y tokens Google
  (`navegador.json`, `servicios.json`, `identidad-real.json`,
  `google-frontend.json`).
- **Hallazgo abierto:** ausencia de **Content-Security-Policy** (severidad
  **ALTA**): el token de sesión vive en `sessionStorage` por pestaña y su
  seguridad dependía de una CSP estricta.

### 6.2 Mitigación CIERRE-04 (12-oct-2026) — `bridge/informe_seguridad_movil_cierre04.md`

- **CSP implementada** (Enforce/Report-Only conmutable) en `next.config.ts`,
  `backend/app/main.py` y artefacto de Nginx `docs/nginx-csp-polis.conf`;
  cabeceras endurecidas (`X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`)
  y CORS de producción estricto (solo HTTPS, sin localhost).
- **Zero-Política respected:** Nginx **no recargado** (se entregan comandos y
  artefactos bajo autorización); `bd_csh` intacta (33 mesas / 36 agendas /
  11 fichas / 17 actores).
- **Responsive (Playwright):** 21/21 PASS en 320/375/414 px sobre 7 rutas
  críticas, sin desbordes ni violaciones CSP; correcto uso de `device-width`
  tras subsanarse el `viewport` de `src/app/layout.tsx`
  (hallazgo detectado y corregido en la pasada).
- **Rendimiento `/geovisor`:** DCL 101 ms, Load 211 ms, canvas
  OpenLayers 100 % inicializado (3 corridas).
- **Dependencias:** `pip-audit` backend 0 vulnerabilidades; `bun audit` 0
  críticas en runtime, 8 avisos residuales confinados a dev/build clasificados
  1 a 1.

### 6.3 Dictamen MESA-UBIC-01 (13-oct-2026) — `bridge/03_dictamen_revision.md`

- **APROBADO SIN RESERVAS** (commit `00751f3`): ubicación de mesa por
  mapa/URL/coordenadas + geovisor. Frontend auditado por EAF: `ui:check`
  conforme, `tsc --noEmit` 0 errores, ESLint 0, **Bun: 529 pruebas pasando**
  (59 suites), E2E Playwright 6/6 en 1440 px y 375 px sin desbordes, y
  salvaguarda SSRF para URLs acortadas (no se resuelven en backend).

### 6.4 Reauditorías históricas (`bridge/reauditorias/`)

Presentes como material referencial: `reauditoria_E1..E5`,
`recomendaciones_T6.1_sidebar.md`, `informe_remediacion_seguridad_ejecutada.md`,
`blueprint_hardening_seguridad.md`. **Estado:** no se reinspeccionaron en esta
pasada; el material reciente (12–13-oct, §6.1–§6.3) es el vigente. Los
dictámenes históricos no garantizan estado actual, según
`docs/equipo_agentes_desarrollo.md`.

---

## 7. Lo que se probó y lo que no (límites)

**Ejecutado y verificado en esta revisión (con exit status):**

- `bun run ui:check` → exit 0.
- `bun run check` (`ui:check` + `tsc --noEmit` + `eslint .`) → exit 0.
- `bun run ui:policy:test` → exit 0 (8/8).
- `bun run ui:test` → **exit 1** (8 fallos reproducidos en 2 corridas; §5).
- `bun run build` → exit 0. `bun run storybook:build` → exit 0.

**No ejecutado / fuera de alcance:**

- `bun test` (unitarios) y suite backend: no afectados por los fallos de UI; no
  se modificó código en esta revisión (solo el presente informe).
- Revisión con lectores de pantalla y dispositivos reales: axe no acredita WCAG
  ni sustituye revisión con usuari@s (regla explícita del kit).
- Producción (systemd/Nginx/CSP activos): esta revisión es local sobre el árbol
  Git; no tocó servidor ni base.

---

## 8. Prioridades de remediación propuestas

| # | Hallazgo | Severidad | Archivo/línea | Corrección propuesta |
| --- | --- | --- | --- | --- |
| 1 | Contraste 4,06:1 en metadatos de pestañas (axe, WCAG 1.4.3) | **Alta** (bloquea `ui:test` verde en CI) | `features/plataforma/components/gestor-heros-plataforma.tsx:264` | Quitar `opacity-75`, usar `--text-secondary`; re-ejecutar `ui:test` |
| 2 | Historias asíncronas con `getByRole` inmediato | **Media** | `app/_stories/plataforma-interna.stories.tsx:261,326,332` | `findByRole`/`waitFor` + restauración de mocks en `afterEach` |
| 3 | Banner duplicado/anidado en vistas de héroes | **Media** | `features/politicas/data/hero-pages.data.ts:179` + renderizador de héroes y shell | Un único banner por documento; `div`/`section` en el héroe embebido |
| 4 | Historia «Crear Mesa Completa» contra API real sin mock (regla 8) | **Media** | `features/mesas/panels/mesa-editor-panel.tsx:463-479` + `platform.stories.tsx` | Mock de `/api/v1/mesas` (o modo demo) y aserción sobre el store |
| 5 | Recarga de Nginx con CSP pendiente de autorización (operativa) | **Baja** (abierta en CIERRE-04) | `docs/nginx-csp-polis.conf` | `nginx -t` + recarga diferida cuando el auditor autorice |

Tras aplicar 1–4, re-ejecutar `bun run ui:test`, `bun run check` y
`bun run build`, y dejar la suite de historias en verde antes de dictamen EAF.

---

## 9. Resultados de la remediación ejecutada — antes/después (`[UI-REMED-01]`)

Concluidas las correcciones **F1–F4** (avanzadas por `freebuff` y culminadas por `agy2`) y la subsanación de la observación cosmética **O1** del dictamen EAF (`src/shared/ui/accesibilidad-widget.tsx`), se ejecutó la batería completa de validación automatizada en local:

### 9.1 Comparativa antes / después

| Verificación / Suite | Estado Inicial (Antes) | Estado Final (Después) | Detalle |
| --- | --- | --- | --- |
| `bun run ui:test` (Storybook + `axe-core` en Chromium headless) | ❌ **198 / 206** (8 fallos en 2 archivos) | ✅ **212 / 212** (17 archivos, **0 fallos**, 30.22 s) | Incluye las 206 historias previas + 6 historias nuevas de `accesibilidad-widget.stories.tsx` |
| `bun run ui:check` (`node scripts/ui-policy.mjs`, UI001–UI008) | ✅ Conforme (57 componentes en catálogo) | ✅ Conforme (58 componentes en catálogo, 0 incidencias) | Cero colores arbitrarios, Zero-Modals respetado, `a11y: { test: "error" }` intacto |
| `bun run ui:policy:test` (`node --test scripts/ui-policy.test.mjs`) | ✅ **8 / 8** | ✅ **8 / 8** (0 fallos) | Guardas del validador estático verificadas |
| `bun run check` (`ui:check` + `tsc --noEmit` + `eslint .`) | ✅ **0 errores** | ✅ **0 errores** | Tipado estricto y linter 100 % limpios |
| `bun test` (Suite completa de pruebas unitarias frontend) | ⚠️ No ejecutada en revisión inicial | ✅ **547 / 547** (63 archivos, 2.548 `expect()`, **0 fallos**, 7.00 s) | Mocks de `window`/`document` en `accesibilidad-store.test.ts` aislados en `beforeEach`/`afterEach` |

### 9.2 Trazabilidad de correcciones aplicadas

1. **F1 (`src/features/plataforma/components/gestor-heros-plataforma.tsx:264`):** Se reemplazó `opacity-75` por `text-[var(--text-secondary)]` en el `<span>` de ruta de las pestañas de configuración de héroes, superando el ratio WCAG 1.4.3 AA (≥ 4.5:1) en `plataforma-interna › Configuracion`.
2. **F2 (`src/app/_stories/plataforma-interna.stories.tsx`):** Se migraron las aserciones síncronas (`getByRole` / `getByText`) a consultas asíncronas (`findByRole` / `findByText`) en las historias `Usuarios`, `Testimonios` y `Testimonios Oscuro`, se completó el mock de `identidadApi` (`usuarios` con 8 cuentas demo incluyendo a Ana Pérez, `crearUsuario`, `editarUsuario`, `ambitosUsuario`, `roles`) con restauración limpia en el `return` de `beforeEach`, y se alinearon las etiquetas reales de `UsuarioDetallePanel` (`"Detalles de la cuenta"`, `"Editar rol y datos"`).
3. **F3 (`src/features/politicas/components/hero-page-banner.tsx` y `hero-page-banner.test.tsx`):** Se cambió el contenedor del héroe embebido de `<header role="banner">` a `<section aria-label={titulo}>`, eliminando la duplicación y anidamiento del landmark `banner` en `platform › Explorar`, `› Sin Resultados` y `› Mesas`, y actualizando su prueba unitaria.
4. **F4 (`src/app/_stories/platform.stories.tsx`):** Se incorporó la interceptación determinista de `POST /api/v1/mesas` (respuesta HTTP `201` con eco del payload e `id` generado) en el mock de `window.fetch` y en el `beforeEach` de `CrearMesaCompleta`, poblando coordenadas válidas de Cartagena y verificando la inserción en `useMesasStore` sin alterar `mesa-editor-panel.tsx`.
5. **O1 (`src/shared/ui/accesibilidad-widget.tsx` y `accesibilidad-widget.test.tsx`):** Se condicionó la expansión horizontal de los botones de la barra lateral (`hover:w-[196px] focus-within:w-[196px] focus-visible:w-[196px]`) a `!isOpen` y se estableció jerarquía explícita de capas (`z-20` en `#panel-mas-opciones-a11y` frente a `z-10` en `<nav>`), impidiendo que el botón «Más opciones» se solape sobre el borde derecho del subpanel abierto.

---

*Documento de revisión por EDD (equipo de desarrollo). El implementador no
asume el rol de auditor independiente; el dictamen EAF correspondiente debe
registrarse en `bridge/` con snapshot y evidencia identificable conforme a
`docs/equipo_auditores_forenses.md`.*

