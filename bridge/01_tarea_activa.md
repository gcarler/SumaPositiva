# TAREA ACTIVA: [GEO-DOCK-03] ENLACE E INTERACCIÓN BIDIRECCIONAL DE DATOS
## REINGENIERÍA GEOVISOR STUDIO DE POLIS — FASE 3

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 3 del Plan Maestro (`bridge/00_plan_maestro_geovisor_docking.md`)  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / USABILIDAD, NAVEGACIÓN SIG Y EXPERIENCIA DE USUARIO  

---

## 🎯 1. Objetivos y Alcance de la Tarea

Implementar el enlace e interacción bidireccional completa entre los 4 paneles acoplados y el lienzo cartográfico OpenLayers:

1. **Flujo de Navegación Cartográfica "¿Dónde queda la mesa?":**
   * En `src/features/geovisor/hooks/use-mapa.ts`:
     * Incorporar un `useEffect` dedicado que reaccione al cambio de `mesaSeleccionadaId`.
     * Al detectar una mesa seleccionada válida con coordenadas de referencia (`longitud_referencia`, `latitud_referencia`), ejecutar una animación fluida de vuelo:
       ```ts
       mapaRef.current.getView().animate({
         center: fromLonLat([mesa.longitud_referencia, mesa.latitud_referencia]),
         zoom: 15.5,
         duration: 600,
       });
       ```
     * Reforzar el estilo del punto vectorial de la mesa seleccionada en `capaMesas` para que destaque inmediatamente con un halo o borde de alto contraste (`COLORES_MAPA.heatHigh` o borde dorado `var(--ember)` y radio ampliado), haciéndola inequívocamente reconocible sobre el mapa.
   * Conectar el evento de clic nativo sobre puntos de mesa en el mapa (`map.on("click")`) para que seleccione la mesa (`onSelectMesa(feature.get("id"))`), lo que a su vez desplegará de forma reactiva la Ficha Técnica en el panel derecho.

2. **Sincronización Bidireccional Cruzada:**
   * **Desde el Panel Izquierdo (`geovisor-left-dock.tsx`):**
     * Al pulsar el botón "Ubicar en Mapa" o hacer clic sobre una mesa del directorio, se centra el mapa con animación en la coordenada, se resalta el punto y se abre el panel derecho con la ficha de la mesa.
   * **Desde el Panel Inferior (`geovisor-bottom-dock.tsx`):**
     * Al pulsar "Ubicar en Mapa" o seleccionar una fila en el DataGrid de mesas, se ejecuta el mismo vuelo cartográfico y apertura del inspector derecho.
   * **Desde el Panel Superior (`geovisor-top-shelf.tsx`):**
     * La selección de ámbito territorial (Localidad 1, 2, 3, Rural-Insular, Todas) y variable analítica ISH sincroniza simultáneamente la coropleta del mapa, los micro-chips de KPIs, los filtros del directorio y los gráficos analíticos de la consola inferior.

3. **Adaptabilidad Fluida al Arrastre de Divisores (Resize en Vivo):**
   * Verificar que el `ResizeObserver` de OpenLayers responda a 60 fps durante el redimensionamiento manual con los handles de `react-resizable-panels`, sin saltos visuales ni recortes de mapa.

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Pruebas de Vuelo y Foco** | `bun test src/features/geovisor/` | Pruebas de navegación cartográfica y selección de mesas pasando |
| **Suite Completa Frontend** | `bun test` | Todas las pruebas pasando sin regresiones |
| **Inviolabilidad `bd_csh`** | No alterar BD | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |

---

## 📦 3. Entregables y Procedimiento

1. Actualizar `src/features/geovisor/hooks/use-mapa.ts` con la animación de vuelo centrada en mesa y el estilo de foco de alta visibilidad.
2. Afinar la reactividad de clics sobre features de mesas en el mapa OpenLayers.
3. Crear pruebas unitarias específicas que certifiquen el flujo de foco y animación ante selección de mesa.
4. Ejecutar Quality Gates (`bun run ui:check`, `bun run check`, `bun test`).
5. Formalizar commit atómico local en `main`: `feat(geovisor): implementar enlace bidireccional navegacion de mesas y mapa GEO-DOCK-03`.
6. Reportar culminación en `bridge/02_resultado_agy2.md` y enviar notificación a `agy` en `%0`.
