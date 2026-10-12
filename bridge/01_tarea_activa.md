# TAREA ACTIVA: [GEO-DOCK-01] ARQUITECTURA DE LAYOUT RESIZABLE (VS CODE TILING), STORE ZUSTAND Y CONTROLES DOCK
## REINGENIERÍA GEOVISOR STUDIO DE POLIS — FASE 1

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 1 del Plan Maestro (`bridge/00_plan_maestro_geovisor_docking.md`)  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / USABILIDAD, ARQUITECTURA SIG Y EXPERIENCIA DE USUARIO  

---

## 🎯 1. Objetivos y Alcance de la Tarea

Implementar los cimientos del sistema de acoplamiento de 4 paneles (*tiling docking system* estilo Visual Studio Code) para el Geovisor Territorial de POLIS:

1. **Store Zustand de Layout (`src/features/geovisor/state/geovisor-layout-store.ts`):**
   * Tipado estricto para estado de visibilidad: `topOpen`, `leftOpen`, `rightOpen`, `bottomOpen`.
   * Tamaños porcentuales: `sizes: { top: number, left: number, right: number, bottom: number }`.
   * Valores iniciales por defecto:
     * `topOpen: true` (tamaño ~14%)
     * `leftOpen: true` (tamaño ~24%)
     * `rightOpen: false` (tamaño ~26%, se abre dinámicamente o con toggle)
     * `bottomOpen: false` (tamaño ~30%, se abre dinámicamente o con toggle)
   * Acciones: `togglePanel(panelId)`, `setPanelOpen(panelId, open)`, `setPanelSize(panelId, size)`, `maximizeMap()`, `resetLayout()`.
   * Persistencia en `localStorage` con fallback seguro para SSR (`typeof window === "undefined"`).

2. **Componente de Controles de Layout (`src/features/geovisor/components/geovisor-dock-controls.tsx`):**
   * 4 iconos claramente diferenciados para alternar cada panel:
     * Superior: `PanelTop` (Lucide)
     * Izquierdo: `PanelLeft` (Lucide)
     * Derecho: `PanelRight` (Lucide)
     * Inferior: `PanelBottom` (Lucide)
   * Botón de Maximizar / Restaurar Mapa (`Maximize2` / `Minimize2`).
   * Botón de Restablecer Layout a valores por defecto (`RotateCcw`).
   * Estados visuales con tokens de diseño (`var(--ember)`, `var(--surface-1)`, etc.), bordes sutiles y tooltips o etiquetas accesibles (`aria-label`, `aria-pressed`).

3. **Contenedor Resizable Mosaico (`src/features/geovisor/components/geovisor-workspace-layout.tsx`):**
   * Utilizar los componentes ya existentes en `src/shared/ui/resizable.tsx` (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` de `react-resizable-panels`).
   * Estructura anidada tipo IDE:
     * PanelGroup Vertical externo:
       * Panel Superior (`collapsible`, `minSize={8}`, `maxSize={28}`).
       * Separador horizontal (`ResizableHandle`).
       * PanelGroup Horizontal intermedio:
         * Panel Izquierdo (`collapsible`, `minSize={16}`, `maxSize={45}`).
         * Separador vertical (`ResizableHandle`).
         * Panel Central: Canvas del Mapa OpenLayers (ocupa el resto, elástico y fluido).
         * Separador vertical (`ResizableHandle`).
         * Panel Derecho (`collapsible`, `minSize={18}`, `maxSize={45}`).
       * Separador horizontal (`ResizableHandle`).
       * Panel Inferior (`collapsible`, `minSize={12}`, `maxSize={50}`).
   * Manejo imperativo de ref o sincronización reactiva con `geovisor-layout-store.ts`.
   * Contenedor con altura de estudio definida (`h-[calc(100vh-8.5rem)]` o `min-h-[750px]`) que prevenga scroll general de página y se comporte como una estación de trabajo cartográfica profesional.

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Pruebas Unitarias Store** | Test en `src/features/geovisor/state/geovisor-layout-store.test.ts` | 100% pasando |
| **Suite Completa Frontend** | `bun test` | Todas las pruebas pasando sin regresiones |
| **Inviolabilidad `bd_csh`** | No tocar BD | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |

---

## 📦 3. Entregables y Procedimiento

1. Implementar `geovisor-layout-store.ts` y su suite de pruebas unitarias.
2. Implementar `geovisor-dock-controls.tsx`.
3. Implementar `geovisor-workspace-layout.tsx`.
4. Ejecutar Quality Gates y asegurar cero errores.
5. Formalizar commit atómico local en `main`: `feat(geovisor): implementar arquitectura de layout resizable VS Code y store de paneles GEO-DOCK-01`.
6. Reportar culminación en `bridge/02_resultado_agy2.md` y enviar notificación a `agy` en `%0`.
