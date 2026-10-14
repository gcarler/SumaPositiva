# DICTAMEN DE AUDITORÍA FORENSE EAF — TAREA [GEO-CLEAN-DRIVE-01]
## LIMPIEZA INTEGRAL DE DATOS ANTIGUOS DEL GEOVISOR Y VISUALIZACIÓN EXCLUSIVA DE LAS CAPAS GEOJSON DEL DRIVE (`Hurto_Motocicletas`, `Hurto_Residencias`, `Hurto_Comerciantes` 2018–2026)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Estado del Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## 1. Verificación Forense de Entregables

1. **Lienzo Cartográfico Limpio (`geovisor-view.tsx`, `use-mapa.ts`, `mapa-cartagena.tsx`):**
   - Desactivadas y retiradas del mapa las capas antiguas simuladas (`localidades: false`, `corregimientos: false`, `barrios: false`, `puntos: false`, `mesas={[]}`).
   - El mapa pinta por defecto el **Consolidado de las 3 capas GeoJSON del Drive (`18.242` casos / `12.280` features)** sobre los 2 polígonos oficiales reproyectados (`EPSG:9377 → WGS84`): `ID_POLIG = 1` (*Perímetro Urbano de Cartagena*, `75,28 km²`) e `ID_POLIG = 2` (*Zona Rural e Insular de Cartagena*, `597,38 km²`).
   - En la esquina superior izquierda del mapa se muestra la **Barra Flotante Compacta de Capas GeoJSON (Drive SIEDCO)** con píldoras rápidas para alternar entre **Consolidado (18.242)**, **Motocicletas (4.683)**, **Residencias (5.044)** y **Comercio (8.515)**.

2. **Barra Superior Limpia (`geovisor-top-shelf.tsx`):**
   - Retirados al 100% los KPIs simulados antiguos (`8.420 ciudadanos`, `54 alertas SAT`, `ISH Promedio 58/100`).
   - Conectados los selectores de **Zona GeoJSON (`ID_POLIG 1 / 2`)**, **Capa GeoJSON** y **Año (`2018–2026`)**, junto con los **4 KPI Chips reales del Drive** (`18.242` incidentes, `12.280` features GeoJSON, `17.684` casos urbanos `96,9%`, `558` casos rurales `3,1%`).

3. **Panel Izquierdo de Capas y Layout Persistido (`geovisor-controles.tsx`, `geovisor-layout-store.ts`):**
   - `GeovisorControles` contiene exclusivamente las 3 capas GeoJSON del Drive, el filtro de año, el switch de etiquetas, la ficha técnica de los 2 polígonos (`ID_POLIG 1` y `ID_POLIG 2`) y el botón hacia el procesador.
   - `useGeovisorLayoutStore` incrementado a `version: 3`, abriendo por defecto únicamente `top: ["filtros"]`, `left: ["capas"]` y `bottom: ["hurtos"]`.

---

## 2. Certificación Independiente de Calidad y Censo

- **Pruebas Backend (`pytest`):** `105 / 105 pasadas`.
- **Pruebas Frontend (`bun test`):** `579 / 579 pasadas` (`73 / 73` en `src/features/geovisor/`).
- **Quality Gates (`bun run check`):** `0 errores`.
- **Storybook (`bun run ui:test`):** `212 / 212 historias pasadas` con `axe-core`.
- **Censo Institucional en `bd_csh`:** Intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores, `12.280` registros de hurtos).
