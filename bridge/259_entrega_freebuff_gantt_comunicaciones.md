# 259 · Entrega — Vista Tipo Gantt en Comunicaciones (Fase de Diagnóstico)

**Fecha:** 28 de octubre de 2026 · **Responsable:** Freebuff (Buffy, `freebuff:0.0`)
**Encargo:** `bridge/259_tarea_freebuff_gantt_comunicaciones.md` (coordina `agy:0.0`)
**Módulo:** `src/features/comunicaciones`

## Requerimiento

Vista tipo Gantt para `/plataforma/comunicaciones`: la Fase de Diagnóstico inició
el 28 de octubre de 2026 y cierra el 31 de diciembre de 2026 (65 días ≈ 9 semanas).

## Qué se implementó

1. **Pestaña «Diagrama de Gantt»** (`comunicaciones-view.tsx`):
   - `VistaProyecto = "cronograma" | "kanban" | "gantt"` con `TabsTrigger` e icono `CalendarRange`.
   - El filtro de estado ahora también se muestra en Gantt (la vista respeta etapa, búsqueda y estado, igual que las otras dos vistas).
2. **Nuevo componente `src/features/comunicaciones/views/gantt-cronograma.tsx`**:
   - **Escala temporal fija 2026-10-28 → 2026-12-31 (65 días)**: encabezado de meses con ancho proporcional (Octubre 28–31 · Noviembre 1–30 · Diciembre 1–31) y regla de marcas por semanas/quincenas (28 Oct, 31 Oct, 15 Nov, 30 Nov, 15 Dic, 31 Dic) alineada por porcentaje exacto respecto a la ventana.
   - **Indicador de «Hoy» (28 de octubre)**: línea vertical discontinua continua a lo largo de toda la columna temporal (`border-primary`), con rótulo accesible y **texto visible** «Hoy: 28 oct»; la primera fila expone `aria-label` completo del indicador, las filas restantes lo marcan decorativo.
   - **Filas de tareas**: tarea izquierda fija de 224 px con código, `Badge` de estado y responsable; carril temporal con retícula quincenal y **barra proporcional** calculada por porcentaje sobre la ventana (`recortar` ajusta inicio/fin a los bordes; tareas anteriores a la fase o posteriores al cierre se proyectan recortadas en el borde correspondiente y su etiqueta conserva el rango real DD/MM – DD/MM).
   - **Interacción**: clic en la barra **o** en la fila abre el `SidePanel` del editor (`tarea-comunicacion-editor`, Encargo 255); ambas zonas son `Button` del kit con `aria-label` completo (código, título, rango ISO, estado).
   - **Barras semánticas (tokens del kit, Regla 2, cero paletas literales)**: `completada` → `bg-success/80`, `en_progreso` → `bg-info/80`, `reprogramada` → `bg-warning/80` (texto `text-text-inverse` mapeado en `@theme`), `pendiente` → `bg-surface-3 border border-border`.
   - **Regla 6**: el estado never depende solo del color — Badge textual por fila, fechas DD/MM-DD/MM en la barra y leyenda textual debajo del diagrama.
   - **Contenedor responsivo**: `overflow-x-auto` con ancho mínimo de 680 px para mantener la legibilidad de 65 días en móvil sin desbordes de página.
3. **Tarjetas métricas actualizadas**: «Inicio Diagnóstico · 28 Octubre · (Hoy)» y «Cierre Diagnóstico · 31 Diciembre · Entrega Oficial» (antes 15 Oct / 15 Dic).

## Cumplimiento del kit UI

- Kit `Button` y `Badge` en toda la pieza (cero controles nativos, guardia UI001 verde); `CalendarRange` solo como icono con `aria-hidden`.
- Sin `Sheet`/`Dialog` nuevos: el panel sigue siendo el `SidePanel` registrado en `panel-registry.tsx` (Regla 4 / UI005).
- Colores exclusivamente por tokens semánticos y clases del kit (Regla 2 / UI003).
- Capas: la vista importa desde su `features/comunicaciones` y `shared/ui` (UI004).

## Verificación (resultados reales)

| Check | Resultado |
| --- | --- |
| `bun run check` (ui:check + typecheck + eslint) | ✅ exit 0 completo |
| Historia `ComunicacionesGestion` ampliada (Chromium) | ✅ **25/25 pass** con examen nuevo: pestaña visiblemente activa, región accesible «Diagrama de Gantt del cronograma», encabezado de fase «28 Octubre – 31 Diciembre 2026», rótulo «Hoy: 28 oct», barra `TC-02` con `aria-label` exacto de rango/estado, texto de barra «15/10 – 15/10», y clic en fila que abre el dialog del SidePanel y vuelve por Escape |
| Tests del módulo (`bun test src/features/comunicaciones`) | ✅ 10 pass / 0 fail |
| API y backend | ✅ intactos: el Gantt consume el mismo estado local ya cargado por `listarTareasComunicacion`; sin cambios de contrato |

## Notas de revisión EAF/usuario

- El indicador «Hoy» está fijado por especificación al 28 de octubre (inicio de la fase); es el punto 0% de la escala y por eso se sitúa junto al borde izquierdo.
- Pendiente de validación humana: revisión visual en claro/oscuro y 320 px (axe no acredita por sí solo WCAG).

## Seguimiento (28-oct, misma sesión)

1. **Tareas demo dentro de la ventana**: el mock de Storybook ahora incluye `TC-04 «Mesas territoriales de Bahía e Industrial»` (2026-11-01 → 2026-11-07, pendiente), espejo realista de la semilla TC-13 — la historia valida su **barra proporcional completa** en-rango y el rango visible «01/11 – 07/11». Datos de demostración separados de la persistencia (las fechas de la primera versión del mock, 6–16 oct, se conservan intactas: la proyección recortada en el borde izquierdo sigue demostrando ese caso).
2. **En la app con base provisionada** no cambia nada: la migración idempotente `0051_modulo_tareas_comunicacion` ya sembró TC-01…TC-18 con actividades hasta el 15-dic (TC-13…TC-17 dentro de la ventana); el Gantt las proyecta con el mismo estado local ya cargado por la API.
3. **Re-verificación real de esta ronda**:
   - Historia `ComunicacionesGestion` en Chromium: **25/25 pass** (incluye la proyección en-rango de TC-04).
   - `bun run check` (ui:check + typecheck + eslint): ✅ exit 0 completo.

**Nota para coordinación (`agy:0.0`):** entrega 259 más seguimiento listos para recepción EAF; el canal de notificación a coordinación es externo a este entorno — el informe y el historial de checks son la evidencia oficial.

## Revisión visual ejecutada (28-oct, cierra el pendiente humano)

La revisión visual en claro/oscuro y 320 px — pendiente humano de la sección anterior — se ejecutó automáticamente contra la **aplicación real** (historia `ComunicacionesGestion` servida desde `storybook:build` estático, única fuente del componente, Regla 8; sin harness paralelo).

**Metodología** (`bridge/259_evidencia_visual/`, Playwright/Chromium headless): matriz 2 temas × 4 anchos (1440/768/375/320), contrastando la pestaña activa, rótulo «Hoy: 28 oct», región accesible, desbordes de página (scrollWidth vs clientWidth), scroll contenido del carril (min-w 680 px), apertura del `SidePanel` por clic en fila TC-04 a 1440 y 320, y rastro de errores de consola. Espera de quietud frente al `play()` de la historia (el PanelHost se abre/cierra durante la interacción grabada). Evidencia: 12 capturas + `resultado.json`.

**Hallazgos y correcciones (2, re-verificados):**

1. **Desborde horizontal de página a ≤768 px (Regla 6)** — era real y preexistía a esta entrega: la `TabsList` de 544 px en una sola línea (375/320) y la fila tablist+filtros sin `flex-wrap` (768) empujaban el documento a 560 px/780 px. Corregido en `comunicaciones-view.tsx`: envoltorio `overflow-x-auto` en la lista de pestañas (scroll contenido, no en la página, la clase `dark` se inyectó tras el montaje de la historia (Storybook reescribe `<html class>` al cargar y una inyección temprana no surte efecto). A 320 px el panel lateral del editor es legible y usable. Sin errores de consola en ningún caso.

**Resultados finales: 44/44 PASS** (`resultado.json`), con `bun run check` verde (exit 0) e historias en Chromium 25/25 tras las correcciones.

**Alcance y límites**: la revisión cubre el módulo de comunicaciones con datos demo del mock de la historia en 2 temas × 4 anchos; no es una certificación WCAG y no cubre lectores de pantalla, zoom 200–400 %, ni otros módulos. El vínculo «Saltar al contenido» visible en algunas capturas pertenece al shell de Storybook, no al módulo; en la app solo aparece al navegar por teclado. Capturas conservadas en `bridge/259_evidencia_visual/` como evidencia.
