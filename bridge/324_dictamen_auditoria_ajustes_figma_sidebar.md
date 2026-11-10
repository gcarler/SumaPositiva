# DICTAMEN DE AUDITORÍA DE CALIDAD (EAF) — ENCARGO 324: ALINEACIÓN IZQUIERDA DEL MENÚ NIVEL 2, BOTÓN CHEVRON FIGMA Y REDISEÑO PRO DE HOVER/ACTIVO

- **Auditor:** Coordinación General Antigravity (Equipo de Auditoría Forense — EAF)
- **Ejecutor Auditado:** Subagente `agy2` + Pulido Directo EAF
- **Fecha:** 2026-11-10
- **Resultado del Dictamen:** **CONFORME (100% VERIFICADO Y DESPLEGADO)**

---

## 1. Resumen de los 3 Ajustes Implementados y Verificados

1. **Alineación estricta a la izquierda del Menú Nivel 2 (Submódulos):**
   - **Problema original:** [`buttonVariants`](file:///root/polis/src/shared/ui/button.tsx#L8) incluye `justify-center` en su clase base, lo que centraba horizontalmente el icono y la etiqueta dentro de cada `<Button variant="unstyled">` de los submódulos.
   - **Solución verificada:** En [`PlataformaSidebar`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx#L696-L712), cada submódulo aplica `flex items-center justify-start gap-2.5 w-full text-left`, ubicándose sobre una línea guía vertical izquierda con sangría (`ml-4 pl-3 border-l border-[var(--border-strong)]/60`). Todos los ítems del Nivel 2 inician exactamente en la misma coordenada horizontal izquierda (`x`).

2. **Botón circular con Chevron (`ChevronLeft` / `ChevronRight`) para contraer y expandir el Sidebar (Estilo Figma Community):**
   - **Problema original:** El uso de `PanelLeftClose` / `PanelLeftOpen` dentro de la cabecera no correspondía al diseño de referencia de Figma Community (`1239525598886080843/sidebar`).
   - **Solución verificada:** En [`PlataformaSidebar`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx#L481-L495), el botón de contraer/expandir es ahora un botón circular (`rounded-full size-6 border border-[var(--border-strong)] bg-[var(--surface-1)] shadow-xs`) anclado sobre el borde derecho superior del sidebar (`-right-3 top-5 z-30`) con el icono **`ChevronLeft`** (cuando está expandido) y **`ChevronRight`** (cuando está minimizado a iconos), actualizado también en [`PlataformaHeader`](file:///root/polis/src/features/plataforma/components/plataforma-header.tsx#L50-L63).

3. **Nuevo Diseño Ejecutivo ("Pro") de Hover y Estado Activo (Nivel 1 y Nivel 2):**
   - **Problema original:** El borde `border-l-4` sobre `rounded-xl` generaba una esquina izquierda curva deformada y un bloque gris plano.
   - **Solución verificada:**
     - **Nivel 1 (Módulos):** Superficie tipo píldora tintada (`bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15`), anillo interior sutil (`ring-1 ring-inset ring-[var(--brand-polis-blue)]/20`) e indicador vertical flotante tipo cápsula (`before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full`). En *hover*, transición suave `duration-150 ease-out` con tinte `hover:bg-[var(--brand-polis-blue)]/[0.06]` y realce cromático del icono.
     - **Nivel 2 (Submódulos):** En estado activo y en *hover*, se ilumina el segmento correspondiente de la línea vertical del árbol (`before:-left-[13px] before:w-0.5 before:rounded-full`) acompañado de píldora tintada institucional y micro-transición limpia.
