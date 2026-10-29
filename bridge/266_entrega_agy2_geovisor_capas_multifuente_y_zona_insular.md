# Entrega Encargo 266: Geovisor — Capas Multifuente en Mapa OpenLayers y Georreferenciación Zona Insular

**Fecha:** 29 de octubre de 2026  
**Responsable:** AGY2 (`agy2:0.0`)  
**Especificación de origen:** [`bridge/266_tarea_agy2_geovisor_capas_multifuente_y_zona_insular.md`](file:///root/polis/bridge/266_tarea_agy2_geovisor_capas_multifuente_y_zona_insular.md)  
**Estado:** COMPLETADO Y VERIFICADO EN PRODUCCIÓN  

---

## 1. Resumen Ejecutivo

Se han implementado y verificado en su totalidad los dos requerimientos del Encargo 266:

1. **Pintado interactivo de Capas Multifuente en OpenLayers:**
   - Se conectó el botón accesible **"Pintar en mapa"** en [`src/features/geovisor/components/geovisor-multifuente-panel.tsx`](file:///root/polis/src/features/geovisor/components/geovisor-multifuente-panel.tsx) con toggle de activación/desactivación.
   - Se añadió el estado global `indicadorMultifuenteActivo` en [`src/features/geovisor/state/geovisor-layout-store.ts`](file:///root/polis/src/features/geovisor/state/geovisor-layout-store.ts).
   - En [`src/features/geovisor/hooks/use-mapa.ts`](file:///root/polis/src/features/geovisor/hooks/use-mapa.ts), se creó la capa vectorial OpenLayers dedicada `capaMultifuenteLayer` (zIndex: 14) con rampa de estilos semánticos basada en `nivel_riesgo` (`critico` rojo/destructivo, `alto` naranja/alerta, `medio` amarillo/ember, `bajo` verde/éxito, azul/primario por defecto).
   - **Regla de Cobertura Territorial:** Si el indicador tiene desagregación por localidad (`LOC-1`, `LOC-2`, `LOC-3`), se proyecta la geometría respectiva; **si no tiene desagregación (indicador distrital o global), se proyecta toda la ciudad de Cartagena de Indias (perímetro urbano de las 3 localidades más la zona rural e insular de `GEOJSON_TERRITORIOS`)**, realizando un encuadre fluido (`fit`) con animación.
   - En [`src/features/geovisor/components/mapa-cartagena.tsx`](file:///root/polis/src/features/geovisor/components/mapa-cartagena.tsx), se incorporó un chip flotante con información de la capa activa y botón de descarte rápido (`[X]`), así como tarjeta interactiva de detalle en `hover` (valor, unidad, año de corte, fuente de datos, nivel de riesgo y CTA para navegar a la ficha del banco).

2. **Corrección de Georreferenciación de la Zona Insular:**
   - Se reubicaron las coordenadas representativas de `rural-insular` desde `[-75.52, 10.4]` (que caían erróneamente en Bocagrande continental) a las coordenadas insulares reales `[-75.64, 10.22]` (Barú / Archipiélago de Nuestra Señora del Rosario / Tierrabomba) en [`src/features/geovisor/data/estadisticas.data.ts`](file:///root/polis/src/features/geovisor/data/estadisticas.data.ts).
   - En [`src/features/geovisor/components/geovisor-bi-sidebar.tsx`](file:///root/polis/src/features/geovisor/components/geovisor-bi-sidebar.tsx), se eliminó el mapeo forzado que asignaba `loc-1` a la zona insular. Ahora se filtran los barrios y corregimientos con `b.ucg === "R"`, visualizando correctamente las islas y corregimientos rurales (Barú, Tierrabomba, Bocachica, Caño del Oro, Punta Arena, etc.).
   - En [`src/features/geovisor/hooks/use-mapa.ts`](file:///root/polis/src/features/geovisor/hooks/use-mapa.ts), la etiqueta y punto de referencia de `CARTAGENA_RURAL` en la capa de hurtos fue actualizada a `[-75.64, 10.22]`, evitando solapamientos sobre la península de Bocagrande.

---

## 2. Archivos Modificados

- [`src/features/geovisor/data/estadisticas.data.ts`](file:///root/polis/src/features/geovisor/data/estadisticas.data.ts):
  - Actualización de coordenadas centroidales de `rural-insular` a `[-75.64, 10.22]`.
- [`src/features/geovisor/components/geovisor-bi-sidebar.tsx`](file:///root/polis/src/features/geovisor/components/geovisor-bi-sidebar.tsx):
  - Desacople de `rural-insular` de `loc-1`; filtrado por `ucg === "R"` para preservar corregimientos e islas.
- [`src/features/geovisor/state/geovisor-layout-store.ts`](file:///root/polis/src/features/geovisor/state/geovisor-layout-store.ts):
  - Inclusión de `indicadorMultifuenteActivo` y método `setIndicadorMultifuenteActivo`.
- [`src/features/geovisor/hooks/use-mapa.ts`](file:///root/polis/src/features/geovisor/hooks/use-mapa.ts):
  - VectorLayer y VectorSource OpenLayers para capa multifuente.
  - Lógica de proyección condicional: localidad específica o perímetro urbano + rural completo si es distrital.
  - Corrección de etiqueta `CARTAGENA_RURAL` a `[-75.64, 10.22]`.
  - Detección de hover multifuente con extracción de atributos.
- [`src/features/geovisor/components/geovisor-multifuente-panel.tsx`](file:///root/polis/src/features/geovisor/components/geovisor-multifuente-panel.tsx):
  - Botón "Pintar en mapa" / "Pintado en mapa" con variant `ember` / `outline` cumpliendo normativa semántica POLIS UI.
- [`src/features/geovisor/components/mapa-cartagena.tsx`](file:///root/polis/src/features/geovisor/components/mapa-cartagena.tsx):
  - Chip flotante indicador de capa activa con botón para retirar del mapa.
  - Tooltip hover interactivo para inspección de indicador multifuente.

---

## 3. Pruebas y Verificaciones

1. **Reglas de UI, TypeScript y ESLint (`bun run check`):**
   - `ui:check`: 0 infracciones. Tokens semánticos respetados (sin paletas literales de Tailwind).
   - `tsc --noEmit`: 0 errores.
   - `eslint .`: 0 advertencias o errores.
   - Resultado: **EXIT CODE 0**.

2. **Suite de Pruebas Automatizadas (`bun test src/features/geovisor/`):**
   - **154 pruebas ejecutadas y aprobadas (100% pass, 0 fail)**.

3. **Compilación de Producción (`bun run build`):**
   - Compilación limpia con Next.js 16.3.8 (Turbopack).
   - Generación exitosa de 203 páginas estáticas y dinámicas.
   - Resultado: **EXIT CODE 0**.

4. **Despliegue y Verificación en Vivo:**
   - Servicio reiniciado: `systemctl restart polis-frontend.service`.
   - Estado: `active (running)`.
   - Comprobación HTTP:
     - `http://127.0.0.1:3000/geovisor` -> **HTTP 200 OK**.
     - `http://127.0.0.1:3000/plataforma/geovisor` -> **HTTP 200 OK**.
