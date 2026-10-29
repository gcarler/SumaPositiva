# Encargo 259: Vista Tipo Gantt para Plan de Comunicaciones (`/plataforma/comunicaciones`)

**Fecha:** 28 de octubre de 2026  
**Responsable:** Freebuff (`=freebuff:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulo:** `src/features/comunicaciones`  
**Entregable:** `bridge/259_entrega_freebuff_gantt_comunicaciones.md`

---

## 1. Requerimiento del Usuario

> *"me gustaria que comunicaciones tuviera una vista tipo gantt, esta fase diagnostico iniciò hoy y termina el 31 de diciembre"*

---

## 2. Especificación Técnica y Funcional

### A. Ventana Temporal de la Fase de Diagnóstico
- **Fecha de Inicio:** `2026-10-28` (Hoy).
- **Fecha de Cierre:** `2026-12-31` (Cierre oficial de la Fase de Diagnóstico).
- **Duración Total:** 65 días (~9 semanas).

### B. Integración en `comunicaciones-view.tsx`
1. **Tercera pestaña de vista en `Tabs`:**
   ```tsx
   type VistaProyecto = "cronograma" | "kanban" | "gantt";
   ```
   - Añadir `TabsTrigger value="gantt"` con icono representativo (e.g. `CalendarRange` de `lucide-react`) y etiqueta `"Diagrama de Gantt"`.
2. **Actualización de Tarjetas Métricas Superiores:**
   - Ajustar la tarjeta de Hito Inicial a: **"Inicio Diagnóstico: 28 Octubre (Hoy)"**.
   - Ajustar la tarjeta de Cierre a: **"Cierre Diagnóstico: 31 Diciembre (Entrega Oficial)"**.

### C. Componente / Vista Gantt (`GanttCronograma`)
1. **Eje Temporal y Encabezado:**
   - Visualización de la escala temporal: Octubre (28–31), Noviembre (1–30), Diciembre (1–31).
   - Columnas o marcas por semanas/quincenas.
   - Línea indicadora vertical destacada de **"Hoy" (28 de Octubre)** con etiqueta visual accesible.
2. **Filas de Tareas y Barras Temporales:**
   - Listado de tareas (respetando filtros activos de etapa, búsqueda y estado).
   - Columna izquierda fija o legible: Código (`TC-01`), Título, Responsable y `Badge` de estado.
   - Columna derecha: Grid temporal donde cada tarea proyecta una barra horizontal calculada proporcionalmente:
     ```ts
     // Porcentaje de inicio y ancho relativo a la ventana (2026-10-28 a 2026-12-31)
     ```
   - Color semántico de la barra alineado con el estado:
     - `completada`: `bg-success/80 text-success-foreground`
     - `en_progreso`: `bg-info/80 text-info-foreground`
     - `pendiente`: `bg-surface-3 text-text-secondary border border-border`
     - `reprogramada`: `bg-warning/80 text-warning-foreground`
   - Texto visible en o junto a la barra con las fechas (`DD/MM – DD/MM`) o entregable clave (cumpliendo Regla 6: no depender solo del color).
   - Al hacer clic en la barra o en la fila de la tarea, invocar `abrirEdicion(tarea)` para abrir el panel lateral `SidePanel` ya implementado en el Encargo 255.
3. **Contenedor Responsivo:**
   - El grid temporal debe tener contenedor con `overflow-x-auto` para que en pantallas pequeñas se pueda hacer scroll horizontal del cronograma sin que se rompa el layout de la página.

### D. Cumplimiento de Reglas POLIS UI (`docs/kit-ui-rules.md`)
- **Regla 1 & 4:** Reutilizar componentes del kit (`Badge`, `Button`, `SidePanel`, `Tabs`). Cero modales o librerías externas no aprobadas.
- **Regla 2:** Usar exclusivamente tokens semánticos del kit (`tokens.css`, `bg-surface-*`, `text-text-*`, `border-border`, `bg-primary`, `bg-success`, `bg-info`, `bg-warning`). Prohibido usar paletas Tailwind directas (como `bg-blue-500` o `#hex`).
- **Regla 5 & 6:** Accesibilidad conservada: roles ARIA adecuados (`role="region"` con `aria-label="Diagrama de Gantt del cronograma"`), soporte de temas claro y oscuro, y legibilidad en viewport estrecho.

---

## 3. Criterios de Aceptación
1. Pestaña "Diagrama de Gantt" visible y funcional en `/plataforma/comunicaciones`.
2. Las tareas se proyectan con precisión en la escala temporal del 28 de octubre al 31 de diciembre de 2026.
3. Apertura del panel lateral al seleccionar cualquier barra o tarea del Gantt.
4. `bun run check` (`ui:check`, `typecheck`, `eslint`) 100% verde sin errores.
5. Actualizar o extender la historia en `plataforma-interna.stories.tsx` para validar la nueva pestaña Gantt.
6. Informe de entrega registrado en `bridge/259_entrega_freebuff_gantt_comunicaciones.md`.
