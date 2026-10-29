# Informe de Entrega — Encargo 255 (Rediseño UX/UI Comunicaciones)
**Fecha:** 28 de octubre de 2026
**Módulo:** `src/features/comunicaciones` / ruta `/plataforma/comunicaciones`
**Responsable:** Freebuff (EDD — Frontend & UX)
**Estado:** ✅ IMPLEMENTADO, VERIFICADO Y ENTREGADO
**Encargo:** [`255_tarea_freebuff_redisenio_ux_comunicaciones.md`](file:///root/polis/bridge/255_tarea_freebuff_redisenio_ux_comunicaciones.md)

---

## 1. Problema reportado y diagnóstico

El usuario reportó que al editar una tarea en Comunicaciones, la interfaz obligaba a subir al tope de la página: el editor se abría como bloque inline estático en la parte superior de la vista (`{editorAbierto && ...}` antes de filtros y listado), rompiendo el scroll y el foco de trabajo.

**Diagnóstico confirmado en el código:** la vista `comunicaciones-view.tsx` renderizaba el editor como `section` inline; además usaba `alert()` nativo para errores de cambio rápido de estado y solo existía una lista plana sin paradigma de gestión tipo proyectos.

---

## 2. Solución implementada

### A. Editor en panel lateral Zero-Modals (regla 4 del kit) — sin pérdida de scroll
- **Nuevo panel** `src/features/comunicaciones/panels/tarea-comunicacion-panel.tsx` con `PanelShell` + `SidePanel`, montado en la pila global de paneles (`PanelHost`): apertura deslizante desde el borde derecho, overlay con retorno del foco, Escape para cerrar, Tab confinado y fondo inactivo — todo heredado del estándar del kit.
- El formulario conserva los grupos del encargo: **Datos Generales** (código, estado, título, etapa, territorio), **Fechas** (inicio, culminación, responsable, orden) y **Entregables** (descripción, entregables verificables), con encabezado que muestra código/título y `Badge` del estado vigente, scroll interno autónomo del panel y **acciones fijas en el pie** (Cancelar / Guardar Tarea y Fechas).
- **Decisión documentada:** el encargo sugería `Sheet` o `SidePanel`. Se eligió `SidePanel` vía `PanelShell`, porque `docs/kit-ui-rules.md` (regla 4, chequeada por UI005) prohíbe a las features importar `Sheet`/`Dialog` para flujos nuevos; ambas opciones son válidas en el encargo y `SidePanel` cumple el criterio de aceptación funcional (slide-over derecho sin mover el scroll).
- **Eliminado** el bloque inline del editor y todos sus estados duplicados de la vista.

### B. Registro del panel en el sistema tipado (torre de composición)
| Archivo | Cambio |
| --- | --- |
| `src/app/_composition/panel-contracts.d.ts` | Contrato `"tarea-comunicacion-editor"`: `{ tarea: TareaComunicacion \| null; ordenSugerido: number; onGuardada(t): void }` |
| `src/app/_composition/panel-registry.tsx` | Componente con carga diferida (`dynamic`, `ssr: false`) + entrada `"tarea-comunicacion-editor"` con ancho `min(clamp(640px, 44vw, 920px), 100vw)` |
| `src/features/plataforma/models/acceso.ts` | `panelPermitido`: `tarea-comunicacion-editor` → `puedeEditar(sesion, "comunicaciones")` (roles con edición: `autoridad_distrital`, `administrador_identidades`; auditores y catalogadores quedan excluidos) |

La integración con la lista se hace por `onGuardada` (reemplazo/sumado ordenado en el estado padre), sin tocar la API ni el backend.

### C. Gestión inteligente tipo proyectos
1. **Cambios rápidos en tarjeta:** `Select` de estado (`pendiente`, `en_progreso`, `completada`, `reprogramada`) y botón "✓ Marcar lista"/"Reabrir" en cada tarjeta; se deshabilitan solo mientras ese cambio está en vuelo y confirman con toast (`sonner`), reemplazando el `alert()` nativo.
2. **Vistas de proyecto:** pestañas del kit `Tabs` — «Cronograma / Lista por Etapas» (listado agrupado por etapa con contador por grupo) y «Tablero Kanban» (columnas por estado con orden canónico `ESTATES_ORDER`, tarjetas compactas con código, título, etapa abreviada, fecha, responsable, `Select` de estado y edición).
3. **Indicadores:** barra de **avance global** (`progressbar` ARIA con etiqueta, valor y rangos) con la línea «N de M actividades completadas (P%)», y **barras de progreso por etapa** (% de completadas por etapa) accesibles y con texto (no solo color), visibles en ambas vistas.

### D. Calidad y accesibilidad
- Colores solo semánticos (`bg-surface-*`, `border-border`, `text-primary/secondary`, `text-info/success/warning`, `bg-primary/10`); estados con texto siempre visible.
- Etiquetas asociadas por `htmlFor`/IDs de `"useId"`, `aria-label` en los `Select` de cambio rápido, `progressbar` con `aria-valuenow/min/max`, sin desbordamiento horizontal (columnas kanban: 1 → 2 → 4 columnas responsivas).
- Mensajes de éxito por `toast.success` y errores por `toast.error` (Sonner, sistema de notificaciones del producto).

---

## 3. Historia y verificación interactiva
- **Nueva historia** `ComunicacionesGestion` en `src/app/_stories/plataforma-interna.stories.tsx` con mock de la API de comunicaciones (GET/POST/PUT/DELETE de `/api/v1/comunicaciones/tareas`):
  1. Lista cargada **sin editor inline** (el foco permanece en la posición del usuario);
  2. métricas: `progressbar` global visible y texto «1 de 3 actividades completadas (33%)»;
  3. Tablero Kanban muestra las tareas por estado;
  4. «Editar tarea TC-02» abre el **dialog del panel lateral** (`role="dialog"`) en `PanelHost` y Escape lo cierra sin perder la lista;
  5. «✓ Marcar lista» actualiza el estado vía PUT y la métrica recalcula a «2 de 3 actividades completadas (67%)» sin abrir formulario.

---

## 4. Archivos modificados / creados
| Archivo | Tipo |
| --- | --- |
| `src/features/comunicaciones/views/comunicaciones-view.tsx` | Rediseñada (editor eliminado; tabs, kanban, métricas, toasts) |
| `src/features/comunicaciones/panels/tarea-comunicacion-panel.tsx` | **Nueva** (editor en panel lateral) |
| `src/features/comunicaciones/models/tarea-comunicacion.ts` | Agrega `ESTATES_ORDER` (orden canónico del kanban) |
| `src/app/_composition/panel-contracts.d.ts` / `panel-registry.tsx` | Registro tipado del panel |
| `src/features/plataforma/models/acceso.ts` | Permiso del panel nuevo |
| `src/app/_stories/plataforma-interna.stories.tsx` | Historia con mock y prueba interactiva |

**Intocados:** `comunicaciones-api.ts` y su test (100% compatibilidad con el backend), backend, textos normativos.

---

## 5. Verificación (comandos y resultados reales)
| Verificación | Resultado |
| --- | --- |
| `bun run typecheck` (`tsc --noEmit`) | ✅ Limpio |
| `bun test src/features/comunicaciones` | ✅ **10 pass / 0 fail** (26 aserciones) |
| ESLint sobre los archivos del encargo (comunicaciones + registro de paneles + composición + historias) | ✅ Limpio |
| `bunx vitest run --project storybook src/app/_stories/plataforma-interna.stories.tsx` (Chromium) | ✅ **25 passed / 25** — incluye `Comunicaciones Gestion` (1,0 s) |
| `bun run ui:check` (guardas POLIS UI) | ✅ **0 incumplimientos en los archivos de este encargo** |

**Nota de línea base:** `bun run check` completo termina en fallo por **14 incumplimientos preexistentes** (UI003 × 12, UI001 × 2) en `src/features/geovisor/components/` (`geovisor-controles.tsx`, `geovisor-multifuente-panel.tsx`, `geovisor-workbench-bar.tsx`) y en `src/features/geovisor/panels/geovisor-multifuente-panel.tsx`, trabajo ajeno a este encargo (Geovisor/Encargo 249). No se tocaron (regla «Conservar cambios ajenos»). TypeScript y ESLint íntegros por separado; el `typecheck` del criterio de aceptación pasa limpio.

---

## 6. Criterios de aceptación del encargo (cotejo)
1. ✅ Editar/Nueva Tarea abre el editor en panel lateral derecho sin desplazar el scroll.
2. ✅ Estados actualizables sin fricción desde la tarjeta y columnas del kanban.
3. ✅ 100% compatibilidad con el backend y `comunicaciones-api.ts` (sin cambios).
4. ✅ `bun run typecheck` y `bun test src/features/comunicaciones` pasan limpios; pruebas de historias 25/25.
5. ✅ Informe de entrega en este documento.
