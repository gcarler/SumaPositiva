# TAREA ACTIVA: [GEO-DOCK-02] MODULARIZACIÓN Y ENSAMBLE DE LOS 4 PANELES ACOPLADOS
## REINGENIERÍA GEOVISOR STUDIO DE POLIS — FASE 2

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 2 del Plan Maestro (`bridge/00_plan_maestro_geovisor_docking.md`)  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / USABILIDAD, ARQUITECTURA SIG Y EXPERIENCIA DE USUARIO  

---

## 🎯 1. Objetivos y Alcance de la Tarea

Modularizar, construir y ensamblar los 4 paneles acoplados (*dock panels*) en el espacio de trabajo del Geovisor:

1. **Panel Superior — Top Shelf (`src/features/geovisor/components/geovisor-top-shelf.tsx`):**
   * Unificar los controles de contexto territorial (selector de localidad/territorio, selector de variable ISH), los 4 chips de KPIs ejecutivos, botón de exportación PNG y los **`GeovisorDockControls`** en una barra superior unificada, compacta y profesional.
   * Totalmente adaptada al slot superior de `GeovisorWorkspaceLayout`.

2. **Panel Izquierdo — Explorador & Directorio (`src/features/geovisor/components/geovisor-left-dock.tsx`):**
   * Sistema de pestañas compactas (Tabs):
     * Pestaña 1: **"Capas & Leyenda"**: Integrar `GeovisorControles` (conmutadores de capas vectoriales: localidades, corregimientos, barrios, puntos, etiquetas, isócronas, y leyenda cromática de variable).
     * Pestaña 2: **"Directorio de Mesas"**: Lista navegable de las 33 mesas de diálogo social con buscador reactivo de texto, filtro por estado (realizada/programada) y botón interactivo **"Ubicar en Mapa"** por cada mesa.

3. **Panel Derecho — Inspector SIG & Ficha Técnica (`src/features/geovisor/components/geovisor-right-dock.tsx`):**
   * Sistema de pestañas compactas (Tabs):
     * Pestaña 1: **"Ficha de Mesa"**: Cuando una mesa está seleccionada, despliega su ficha completa (código, territorio, fecha, asistentes/aforo con barra de porcentaje, acuerdos comunitarios y enlace a actas). Si no hay mesa activa, muestra estado vacío explicativo.
     * Pestaña 2: **"Territorio & BI"**: Integrar el panel analítico territorial (`GeovisorBiSidebar`: nivel de criticidad, ranking territorial respecto a la media distrital y desglose de dimensiones).

4. **Panel Inferior — Consola de Datos & Gráficos (`src/features/geovisor/components/geovisor-bottom-dock.tsx`):**
   * Sistema de pestañas compactas (Tabs):
     * Pestaña 1: **"DataGrid de Mesas"**: Tabla estructurada con las 33 mesas, paginación compacta, ordenamiento por columnas (Fecha, Territorio, Asistentes, Estado), botón de exportación CSV y botón de localización en el mapa.
     * Pestaña 2: **"Gráficos Estadísticos"**: Integrar `GeovisorCharts` (Recharts de evolución temporal, radar de seguridad humana y comparativas territoriales).

5. **Ensamble en `geovisor-view.tsx`:**
   * Integrar `GeovisorWorkspaceLayout` alimentando sus 5 slots: `topSlot`, `leftSlot`, `centerSlot` (con `MapaCartagena`), `rightSlot` y `bottomSlot`.
   * Preservar todas las props y estados reactivos existentes (`territorioId`, `variableMapa`, `mesaIdSeleccionada`, `capas`, etc.).

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Pruebas Unitarias** | Pruebas de los nuevos componentes dock | 100% pasando |
| **Suite Completa Frontend** | `bun test` | Todas las pruebas pasando sin regresiones |
| **Inviolabilidad `bd_csh`** | No alterar BD | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |

---

## 📦 3. Entregables y Procedimiento

1. Implementar `geovisor-top-shelf.tsx`.
2. Implementar `geovisor-left-dock.tsx`.
3. Implementar `geovisor-right-dock.tsx`.
4. Implementar `geovisor-bottom-dock.tsx`.
5. Refactorizar y ensamblar `geovisor-view.tsx`.
6. Crear pruebas unitarias para los docks.
7. Ejecutar Quality Gates (`bun run ui:check`, `bun run check`, `bun test`).
8. Formalizar commit atómico local en `main`: `feat(geovisor): modularizar y ensamblar los 4 paneles dock acoplados GEO-DOCK-02`.
9. Reportar culminación en `bridge/02_resultado_agy2.md` y enviar notificación a `agy` en `%0`.
