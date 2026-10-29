# Encargo 255 — Rediseño UX/UI del Módulo de Comunicaciones (Gestión Inteligente Tipo Proyectos)

**De:** Coordinación de Arquitectura y Política Pública (`agy`)  
**Para:** Equipo EDD / Frontend & UX (`freebuff`)  
**Fecha:** 28 de octubre de 2026  
**Prioridad:** ALTA  
**Ruta Afectada:** `/plataforma/comunicaciones`  
**Archivo Principal:** [`src/features/comunicaciones/views/comunicaciones-view.tsx`](file:///root/polis/src/features/comunicaciones/views/comunicaciones-view.tsx)  
**Entregable Requerido:** `bridge/255_entrega_freebuff_redisenio_comunicaciones.md`

---

## 1. Problema Reportado por el Usuario

> *"quisiera que a nivel de comunicaciones la interfaz fuera mas amigable. porque cada vez que se abre una tarea hay que ir a la parte de arriba... es decir creo que se puede gestionar de mejor manera -más intuitiva y más inteligente, tipo proyectos-... esta tarea se la puedes asignar a freebuff"*

### Diagnóstico de UX Actual:
1. **Desplazamiento Forzado (Disrupción de Foco):**
   - Actualmente, al hacer clic en *"Editar Tarea"* en una tarjeta ubicada en la mitad o final de la lista, el formulario se renderiza como panel inline estático en la línea 326 (`{editorAbierto && ...}`), ubicado **en la parte superior de la página** (antes de los filtros y de la lista).
   - El usuario pierde su posición de scroll y se ve obligado a subir manualmente hasta el inicio para poder ver y editar la tarea.
2. **Falta de Paradigma de Gestión Tipo Proyectos:**
   - La visualización es una lista vertical plana donde la edición y creación ocupan un bloque intrusivo.
   - No hay panel lateral deslizante (slide-over / sheet / drawer) ni cambio rápido de estado que mantenga el contexto de trabajo del usuario.

---

## 2. Requerimientos de la Solución

### A. Editor en Slide-Over / Sheet (Sin Pérdida de Scroll)
- Reemplazar el panel estático superior por un **Panel Lateral Deslizante (`Sheet` / `SidePanel`)** desde el borde derecho:
  - Usar los componentes del kit del proyecto: [`@/shared/ui/sheet`](file:///root/polis/src/shared/ui/sheet.tsx) (`Sheet`, `SheetContent side="right"`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`) o [`@/shared/ui/side-panel`](file:///root/polis/src/shared/ui/side-panel.tsx).
  - Al hacer clic en *"Editar Tarea"* o *"Nueva Tarea"*, el slide-over debe abrirse de inmediato sobre la pantalla sin mover el scroll del usuario ni ocultar la lista de fondo.
  - El formulario debe incluir encabezado claro con el código y título de la tarea, scroll interno autónomo (`overflow-y-auto`), campos organizados (Datos Generales, Fechas, Responsable, Entregables) y botones de acción fijos en el pie.

### B. Gestión Inteligente "Tipo Proyectos"
- **Acciones Rápidas en Tarjeta:**
  - Permitir cambiar el estado de la tarea (`pendiente`, `en_progreso`, `completada`, `reprogramada`) directamente desde la tarjeta (vía `Select` o menú contextual rápido) sin necesidad de abrir todo el formulario completo.
- **Vistas de Proyecto:**
  - Pestañas o selector de vista: **Vista Cronograma / Lista por Etapas** y **Vista Tablero Kanban** (columnas por estado: Pendientes, En Progreso, Completadas, Reprogramadas).
- **Indicadores de Proyecto:**
  - Barra de progreso por etapa (% de tareas completadas) y métricas ejecutivas de avance del plan de comunicaciones.

### C. Cumplimiento de Reglas del Kit UI (`docs/kit-ui-rules.md`)
- **UI001:** Usar siempre controles de `@/shared/ui` (`Button`, `Input`, `Textarea`, `Select`, `Badge`, `Sheet`, `Notice`), nunca `<button>` ni `<input>` nativos crudos.
- **UI003:** Usar colores semánticos (`bg-surface-0`, `bg-surface-1`, `border-border`, `text-primary`, `text-text-secondary`, `bg-primary/10`, etc.). No usar colores Tailwind literales tipo `bg-blue-500`, `text-gray-700`.
- **UI006:** Zero-modals o slide-over (`Sheet`/`SidePanel`) para mantener flujo contextual de trabajo.

---

## 3. Criterios de Aceptación y Verificación

1. Al hacer clic en *"Editar"* o *"Nueva Tarea"*, el editor se abre en un panel lateral (`Sheet` derecho) sin desplazar el scroll del usuario.
2. Se pueden actualizar estados directamente sin fricción.
3. Se mantiene 100% la compatibilidad con el backend y servicios existentes ([`comunicaciones-api.ts`](file:///root/polis/src/features/comunicaciones/services/comunicaciones-api.ts)).
4. `bun run typecheck` y `bun test src/features/comunicaciones` pasan limpios.
5. Se elabora informe de entrega en `bridge/255_entrega_freebuff_redisenio_comunicaciones.md`.
