# ENCARGO 324: AJUSTE DE FIDELIDAD FIGMA EN `PlataformaSidebar` — ALINEACIÓN IZQUIERDA DEL MENÚ NIVEL 2 Y BOTÓN CHEVRON DE EXPANDIR/COLAPSAR

- **Destinatario:** Subagente `agy2` (tmux `agy2:0`)
- **Emisor:** Coordinación General Antigravity (Auditoría EAF)
- **Fecha:** 2026-11-10 · **Estado:** ASIGNADO EN EJECUCIÓN
- **Referencia del Usuario:**
  > *"tengo dos temas que resolverl del sidebar que el puede asignar a agy2. el primero es que el menú nivel 2 no deria estar centrado. deberia estar alinado a la izquierda, entiendo que no debería estar alineado al mimo nivel del nivel 1. pero no puede etar centrado se ve muy feo eso asípor eso te di el link de ejemplo (https://www.figma.com/es-la/comunidad/file/1239525598886080843/sidebar) lo sengo que es que la ocpión para expandier el sidebar no me gstaron me gustó más la opción de la iamgen que te compartí parece un chevron.... pro revisa y ajusta esos dos detalles de la plataforma"*

---

## 1. Diagnóstico Técnico Exacto de los 2 Ajustes Solicitados

### Ajuste 1: El Menú Nivel 2 (Submódulos) se ve centrado en lugar de alineado a la izquierda
- **Causa raíz:** En [`src/shared/ui/button.tsx`](file:///root/polis/src/shared/ui/button.tsx#L8), `buttonVariants` incluye `justify-center` en su clase base (`"inline-flex shrink-0 items-center justify-center gap-2 ..."`).
- En [`src/features/plataforma/components/plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx#L671-L694), los botones de los submódulos (Nivel 2) usan `<Button variant="unstyled" size="unstyled" className="flex items-center gap-2 w-full text-left ...">` **sin incluir `justify-start`**. Como resultado, `justify-center` de `buttonVariants` centra horizontalmente el icono y el texto de cada submódulo dentro del botón.
- **Solución obligatoria en `plataforma-sidebar.tsx`:**
  1. En el contenedor de la rama de submódulos (Nivel 2): usar una guía vertical limpia indentada respecto al Nivel 1 (`ml-4 pl-2.5 border-l border-[var(--border)] space-y-0.5 my-1 flex flex-col items-stretch`).
  2. En cada `<Button>` de submódulo (Nivel 2): agregar explícitamente **`justify-start text-left`** (`className="flex items-center justify-start gap-2.5 w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors ..."`), garantizando que el icono y la etiqueta queden 100% alineados a la izquierda sobre el mismo eje vertical (con sangría respecto al Nivel 1, jamás centrados).

### Ajuste 2: Botón de Colapsar / Expandir el Sidebar tipo Chevron (Estilo Figma Community `1239525598886080843/sidebar`)
- **Causa raíz:** Actualmente se usaron los iconos `PanelLeftClose` / `PanelLeftOpen` dentro de la cabecera (y duplicado en `PlataformaHeader`), y cuando el sidebar se colapsa a iconos (`sidebarColapsado === true`), la cabecera apila verticalmente el logo y el botón (`lg:flex-col`).
- En el diseño de referencia de Figma Community (`https://www.figma.com/es-la/comunidad/file/1239525598886080843/sidebar`), el botón para contraer/expandir el sidebar es un **botón circular con icono Chevron (`ChevronLeft` cuando está expandido, `ChevronRight` cuando está colapsado a iconos)** ubicado sobre el borde derecho de la cabecera del sidebar (`-right-3 top-5`).
- **Solución obligatoria en `plataforma-sidebar.tsx` y `plataforma-header.tsx`:**
  1. En [`plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx):
     - En el `<aside>`, cambiar `lg:overflow-y-auto` por `lg:overflow-visible` (el scroll vertical ya lo maneja `<nav id="navegacion-interna" className="... flex-1 overflow-y-auto">`), para que el botón circular en el borde derecho no sea recortado.
     - Reemplazar el botón `PanelLeftClose` / `PanelLeftOpen` del sidebar por el botón circular estilo Figma con **`ChevronLeft` / `ChevronRight`**:
       - Posicionado sobre el borde derecho superior del sidebar en desktop:
         `className="hidden lg:inline-flex absolute -right-3 top-5 z-30 size-6 p-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] shadow-xs hover:bg-[var(--brand-polis-blue)] hover:text-[var(--text-inverse)] hover:border-[var(--brand-polis-blue)] transition-all"`
       - Conservar los atributos accesibles exactos para compatibilidad con las pruebas unitarias:
         `aria-label={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}`
         `title={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}`
       - Cuando `sidebarColapsado === false`, renderiza `<ChevronLeft className="size-3.5" />`.
       - Cuando `sidebarColapsado === true`, renderiza `<ChevronRight className="size-3.5" />`.
     - En la cabecera del `<aside>`, cuando `sidebarColapsado === true`, centrar limpiamente el isotipo (`lg:justify-center p-3`) sin apilar un segundo botón debajo del logo.
  2. En [`plataforma-header.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-header.tsx):
     - Actualizar también el icono del botón de colapsar/expandir para usar `ChevronLeft` / `ChevronRight` (en lugar de `PanelLeftClose` / `PanelLeftOpen`), conservando su `aria-label={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}` para mantener el contrato de `plataforma-acceso-delimitacion.test.tsx`.

### Ajuste 3: Rediseño Ejecutivo ("Pro") del Hover y Estado Activo al Seleccionar una Opción (Nivel 1 y Nivel 2)
- **Referencia del Usuario:**
  > *"y uno ultimo que tampoco me gusta el hoover no se ve pro. crea e iplementa otro... peroname pero ese hoover del sidebar cuando escogo una opción no me gusta"*
- **Causa raíz:** Usar `border-l-4` sobre un contenedor `rounded-xl` genera una curva gruesa deformada en la esquina izquierda, y `bg-[var(--surface-2)]` sobre `bg-[var(--surface-1)]` luce plano y sin contraste institucional.
- **Solución obligatoria en [`plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx):**
  1. **Eliminar `border-l-4`** en todos los ítems del sidebar (tanto expandidos como colapsados).
  2. **Nivel 1 (Módulos Padre) — Estado Activo y Hover Pro:**
     - Contenedor base: `group relative flex items-center justify-between rounded-lg py-1.5 px-2.5 text-xs font-medium transition-all duration-150 ease-out`
     - **Estado Activo (`activo === true`):**
       - Fondo tintado institucional con anillo interior sutil y barra indicadora vertical tipo píldora en el borde izquierdo:
         `bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] font-semibold shadow-2xs ring-1 ring-inset ring-[var(--brand-polis-blue)]/20 dark:ring-[var(--brand-polis-sky)]/25 before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-[var(--brand-polis-blue)] dark:before:bg-[var(--brand-polis-sky)]`
     - **Estado Inactivo + Hover (`activo === false`):**
       - Transición suave con tinte sutil institucional y realce de icono:
         `text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-polis-blue)]/[0.06] dark:hover:bg-[var(--surface-2)] hover:ring-1 hover:ring-inset hover:ring-[var(--border-strong)]/50`
     - **Icono del módulo (`<Icono />`):**
       - Cuando `activo`: `text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]`
       - Cuando inactivo: `text-[var(--text-tertiary)] group-hover:text-[var(--brand-polis-blue)] dark:group-hover:text-[var(--brand-polis-sky)] transition-colors`
  3. **Nivel 2 (Submódulos) — Estado Activo y Hover con Indicador sobre la Línea de Árbol (Estilo Figma):**
     - Contenedor de rama: `ml-4 pl-3 border-l border-[var(--border-strong)]/60 space-y-0.5 my-1 flex flex-col items-stretch`
     - Botón de cada submódulo:
       `group/sub relative flex items-center justify-start gap-2.5 w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ease-out`
     - **Cuando el submódulo está Activo (`esSubActivo === true`):**
       - Resalta el segmento correspondiente de la línea vertical del árbol (`before:-left-[13px]`) y aplica píldora tintada:
         `bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] font-semibold ring-1 ring-inset ring-[var(--brand-polis-blue)]/15 dark:ring-[var(--brand-polis-sky)]/20 before:content-[''] before:absolute before:-left-[13px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[var(--brand-polis-blue)] dark:before:bg-[var(--brand-polis-sky)]`
     - **Cuando el submódulo está en Hover (`esSubActivo === false`):**
       - Micro-interacción limpia con indicador en la línea de árbol y tinte suave:
         `text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-polis-blue)]/[0.06] dark:hover:bg-[var(--surface-2)]/80 before:content-[''] before:absolute before:-left-[13px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-transparent hover:before:bg-[var(--brand-polis-blue)]/50 dark:hover:before:bg-[var(--brand-polis-sky)]/50`
     - **Icono del submódulo (`<SubIcono />`):**
       - Cuando `esSubActivo`: `text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]`
       - Cuando inactivo: `text-[var(--text-tertiary)] group-hover/sub:text-[var(--brand-polis-blue)] dark:group-hover/sub:text-[var(--brand-polis-sky)] transition-colors`
  4. **Modo Colapsado a Solo Iconos (`sidebarColapsado === true`):**
     - Reemplazar `border-l-4` por el mismo estilo ejecutivo con indicador lateral `before:`:
       - Activo: `relative bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] ring-1 ring-inset ring-[var(--brand-polis-blue)]/20 shadow-2xs before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[var(--brand-polis-blue)] dark:before:bg-[var(--brand-polis-sky)]`
       - Hover: `relative text-[var(--text-secondary)] hover:text-[var(--brand-polis-blue)] dark:hover:text-[var(--brand-polis-sky)] hover:bg-[var(--brand-polis-blue)]/[0.06] dark:hover:bg-[var(--surface-2)]`

---

## 2. Pruebas y Controles de Calidad Requeridos

1. En [`src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx):
   - Verificar que todas las pruebas actuales sigan pasando.
   - Agregar una verificación explícita de que los submódulos (Nivel 2) incluyan la clase `justify-start` y `text-left` (nunca centrados) y que el botón de colapsar/expandir utilice el estilo circular con chevron (`-right-3`).
2. Ejecutar y pasar al 100%:
   - `node scripts/ui-policy.mjs`
   - `bun run typecheck`
   - `npx eslint src/features/plataforma/`
   - `bun test src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx`
3. Documentar la entrega en `/root/polis/bridge/324_entrega_agy2_ajustes_figma_sidebar_nivel2_y_chevron.md`.
