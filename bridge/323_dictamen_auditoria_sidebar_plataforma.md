# DICTAMEN DE AUDITORÍA DE CALIDAD (EAF) — ENCARGO 323: SIDEBAR INSTITUCIONAL EXPANDIBLE, REDIMENSIONABLE Y JERÁRQUICO EN `/plataforma`

- **Auditor:** Coordinación General Antigravity (Equipo de Auditoría Forense — EAF)
- **Ejecutor Auditado:** Subagente `agy2`
- **Fecha:** 2026-11-10
- **Resultado del Dictamen:** **CONFORME CON MEJORAS QUIRÚRGICAS DE AUDITORÍA APLICADAS**

---

## 1. Verificación de Requerimientos Funcionales y Arquitectónicos

| Criterio Auditado | Estado | Evidencia Técnica |
|---|---|---|
| **1. Delimitación estricta a `/plataforma/*`** | **APROBADO** | El sidebar vive exclusivamente dentro de [`PlataformaShell`](file:///root/polis/src/features/plataforma/components/plataforma-shell.tsx) y [`PlataformaSidebar`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx) para funcionarios acreditados (`puedeEntrar(sesion)`). El portal público (`/`) permanece 100% libre de sidebars. |
| **2. Árbol completo de 16 módulos y submódulos con RBAC** | **APROBADO** | [`acceso.ts`](file:///root/polis/src/features/plataforma/models/acceso.ts) agrupa los 16 módulos en 4 secciones (`Conducción Estratégica`, `Deliberación y Formulación`, `Ejecución y Comunicación`, `Administración y Gobernanza`) y filtra cada submódulo con `submodulosPermitidos(sesion, modulo)` según `panelPermitido` y `puedeEditar`. |
| **3. Redimensionamiento por arrastre, teclado y doble clic (`200px`–`420px`)** | **APROBADO** | Tirador `role="separator"` (`cursor-col-resize`, `aria-valuemin="200"`, `aria-valuemax="420"`) con *snap-to-collapse* (`< 140px`), *drag-to-expand* (`>= 180px`), doble clic a `272px` y soporte de teclado (`ArrowLeft`/`ArrowRight`/`Home`/`End`/`Enter`). |
| **4. Minimización a solo iconos (`lg:w-16`) o iconos + textos** | **APROBADO** | Botón de alternancia (`PanelLeftClose` / `PanelLeftOpen`) y persistencia en `localStorage` vía [`configuracion-store.ts`](file:///root/polis/src/features/plataforma/state/configuracion-store.ts). |
| **5. Buscador en tiempo real de módulos y submódulos** | **APROBADO** | Filtro instantáneo (`Buscar módulo o submódulo...`) con auto-expansión de ramas coincidentes. |
| **6. Sincronización bidireccional con vistas internas y cola post-navegación de paneles** | **APROBADO** | Conectado en [`seguimiento-view.tsx`](file:///root/polis/src/features/seguimiento/views/seguimiento-view.tsx), [`diagnostico-view.tsx`](file:///root/polis/src/features/diagnostico/views/diagnostico-view.tsx), [`alternativas-view.tsx`](file:///root/polis/src/features/alternativas/views/alternativas-view.tsx), [`contenido-view.tsx`](file:///root/polis/src/features/plataforma/views/contenido-view.tsx), [`mesas-view.tsx`](file:///root/polis/src/features/plataforma/views/mesas-view.tsx), [`configuracion-view.tsx`](file:///root/polis/src/features/plataforma/views/configuracion-view.tsx) y [`panel-dispatcher.ts`](file:///root/polis/src/features/plataforma/services/panel-dispatcher.ts). |

---

## 2. Hallazgos Detectados y Subsanados durante la Auditoría de Calidad

Durante la revisión línea por línea del código entregado por `agy2`, se identificaron y corrigieron de inmediato **4 hallazgos de calidad en tiempo de ejecución**:

1. **EAF-323-01 — Resaltado activo en submódulos de tipo `coleccion` (`proyectos` y `comunicaciones`):**
   - *Hallazgo:* En [`plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx), `calcularSubmoduloActivo` solo evaluaba `case "subvista":`, dejando en `false` los submódulos `"Portafolio en tarjetas"`, `"Matriz tabular BPIN"`, `"Tablero de campañas"` y `"Cronograma de campo"`.
   - *Corrección aplicada:* Se suscribió `PlataformaSidebar` a `useCollectionPreferences((s) => s.views)` y se implementó `case "coleccion":` en `calcularSubmoduloActivo`, reflejando en vivo el modo activo (`"tarjetas"` vs `"lista"`).
2. **EAF-323-02 — Contratos estrictos de `ValidacionCausalPanel` y `TareaComunicacionPanel` en `abrirPanelSeguro`:**
   - *Hallazgo:* En [`panel-dispatcher.ts`](file:///root/polis/src/features/plataforma/services/panel-dispatcher.ts), los paneles `"validacion-mga"` y `"tarea-comunicacion-editor"` caían en el `default:` sin props, cuando `ValidacionCausalPanel` requiere `props.resultado` y `TareaComunicacionPanel` requiere `{ tarea, ordenSugerido, onGuardada }`.
   - *Corrección aplicada:* Se añadieron casos explícitos en [`panel-dispatcher.ts`](file:///root/polis/src/features/plataforma/services/panel-dispatcher.ts) que inyectan payloads válidos por defecto conformes a [`panel-contracts.d.ts`](file:///root/polis/src/app/_composition/panel-contracts.d.ts).
3. **EAF-323-03 — Closure obsoleto (`stale closure`) de `sidebarColapsado` durante un mismo gesto de arrastre:**
   - *Hallazgo:* En `iniciarArrastre` de [`plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx), `handlePointerMove` leía `sidebarColapsado` desde el closure de React al iniciar `pointerdown`, impidiendo colapsar (`< 140px`) y volver a expandir (`>= 180px`) dentro de un mismo arrastre continuo sin soltar el botón del ratón.
   - *Corrección aplicada:* `handlePointerMove` consulta `useConfiguracionPlataformaStore.getState().sidebarColapsado` en tiempo real en cada frame del puntero.
4. **EAF-323-04 — Protección de ancho `100%` en viewports móviles/tablet (`< 1024px`):**
   - *Hallazgo:* Aplicar `style={{ width: `${sidebarAncho}px` }}` con un simple flag `mounted` habría fijado el ancho en píxeles también en pantallas `< 1024px` donde el `<aside>` actúa como barra superior móvil.
   - *Corrección aplicada:* Se reemplazó `mounted` por `esDesktop` mediante `window.matchMedia("(min-width: 1024px)")`, aplicando el ancho personalizado exclusivamente en escritorio (`lg:`).

---

## 3. Resultados de Quality Gates Post-Auditoría

- **`node scripts/ui-policy.mjs`:** `0` violaciones (`POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos`).
- **`bun run typecheck` (`tsc --noEmit`):** `0` errores.
- **`npx eslint` (archivos modificados):** `0` errores, `0` warnings.
- **`bun test src/features/plataforma/`:** `88 passed, 0 fail` (incluyendo los 15 tests de `plataforma-acceso-delimitacion.test.tsx`, 39 de `acceso.test.ts` y 11 de `configuracion-store.test.ts`).
