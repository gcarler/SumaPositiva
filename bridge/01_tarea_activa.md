# TAREA ACTIVA PARA `agy2`: `[GEO-CLEAN-DRIVE-01]`
## LIMPIEZA INTEGRAL DE DATOS ANTIGUOS DEL GEOVISOR Y VISUALIZACIÓN EXCLUSIVA DE LAS CAPAS GEOJSON DEL DRIVE (`Hurto_Motocicletas`, `Hurto_Residencias`, `Hurto_Comerciantes` 2018–2026)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Prioridad:** CRÍTICA — EJECUCIÓN INMEDIATA

---

## 1. Contexto y Solicitud del Usuario

El usuario revisó el Geovisor y solicitó explícitamente:
> *"Creo que hay que limpiar el geovisor de los datos antiguos que tenía publicado ahí para poder dejar limpio lo que traemos del GeoJson, no sé si limpias todo primeramente al 100% y luego incorporas la información que te compartí en el Drive para el geovisor. Igual te vuelvo a compartir el link del Drive https://drive.google.com/drive/folders/1z704iQPAyEp__BZPsUhBiny4ikOyJMk4 — asignarle esta tarea a AGY2"*

### Diagnóstico de los datos antiguos que hoy ensucian el Geovisor (`/geovisor` y `/plataforma/geovisor`)
En este momento, aunque ya están ingeridos los **3 archivos GeoJSON del Drive** (`Hurto_Motocicletas.geojson`: 2.520 features / 4.683 casos; `Hurto_Residencias.geojson`: 3.853 features / 5.044 casos; `Hurto_Comerciantes.geojson`: 5.907 features / 8.515 casos → **12.280 features y 18.242 casos totales**, con los 2 polígonos reproyectados `ID_POLIG=1` Perímetro Urbano `75,28 km²` e `ID_POLIG=2` Zona Rural e Insular `597,38 km²`), el Geovisor sigue mostrando por encima y alrededor **datos simulados antiguos**:
1. **En el mapa (`use-mapa.ts`, `mapa-cartagena.tsx`, `geovisor-view.tsx`):**
   - Se pintan por defecto (`localidades: true`, `corregimientos: true`, `barrios: true`, `puntos: true`) los 4 polígonos rectangulares simulados de `GEOJSON_TERRITORIOS` (`territorios.geojson.ts`) coloreados con cifras ficticias de `ESTADISTICAS_TERRITORIOS` (`estadisticas.data.ts`: `ISH: 62/100`, `Homicidios: 42.9`, `Alertas SAT: 8`), los `217` barrios catastrales en azul, los círculos de `Puntos de Alerta SAT` simulados y los pines de mesas.
   - Arriba a la izquierda del mapa aparece un buscador viejo de `"Busca un territorio o barrio · Todas las localidades (205 barrios)"` y abajo del mapa aparece una tira de botones de localidades/corregimientos antiguos (`Localidad 1`, `Localidad 2`, `Localidad 3`, `La Boquilla`, `Tierrabomba`, `Barú`, `Pasacaballos`, `Bayunca`).
2. **En la barra superior (`GeovisorTopShelf` — `geovisor-top-shelf.tsx`):**
   - Muestra selectores viejos (`Variable: Índice de Seguridad Humana (/100)`, `Alertas SAT/CIPRAT`, `Tasa de Homicidios`, `Alertas ESCNNA`) y 4 KPIs antiguos simulados (`Ciudadanos Participando: 8.420`, `Aportes Radicados: 0`, `Alertas SAT Activas: 54`, `ISH Promedio Distrital: 58 / 100`).
3. **En el panel izquierdo (`GeovisorControles` — `geovisor-controles.tsx`):**
   - Muestra arriba los checkboxes antiguos (`Localidades (3)`, `Corregimientos e Islas`, `Barrios Catastrales (217)`, `Puntos de Alerta SAT`, `Isócronas`) y abajo la leyenda antigua de `Índice de Seguridad Humana /100 (Min: 43, Max: 62)`.
4. **En los paneles acoplados (`geovisor-layout-store.ts`):**
   - Carga por defecto pestañas antiguas (`mesas`, `ficha`, `territorio` con `GeovisorBiSidebar` de ISH simulado, `datagrid` de mesas y `graficos` de radar simulado).

---

## 2. Especificación Técnica de la Limpieza Integral (`[GEO-CLEAN-DRIVE-01]`)

### Paso 1: Limpieza del Lienzo Cartográfico (`geovisor-view.tsx`, `use-mapa.ts`, `mapa-cartagena.tsx`)
1. **En `src/features/geovisor/views/geovisor-view.tsx`:**
   - Inicializar `capas` con todas las capas antiguas **desactivadas (`false`)** y las capas GeoJSON del Drive **activas**:
     ```ts
     const [capas, setCapas] = useState<CapasConfig>({
       localidades: false,
       corregimientos: false,
       barrios: false,
       puntos: false,
       etiquetas: true,
       isocronas: false,
       hurtoMotocicletas: true,
       hurtoResidencias: true,
       hurtoComercio: true,
     });
     ```
   - Permitir que cuando las 3 capas GeoJSON estén activas (o cuando `delitoHurto === null` / `"TODOS"`), `use-mapa.ts` consulte `obtenerPoligonosHurtosGeojson({ delito: undefined, anio: anioHurto ?? undefined })` mostrando el **Consolidado de los 3 GeoJSON del Drive (18.242 casos / 12.280 registros)**, y cuando se seleccione un delito específico (`HURTO MOTOCICLETA`, `HURTO RESIDENCIAS`, `HURTO COMERCIO`), filtre el GeoJSON correspondiente.
   - Pasar `modoGeojsonDrive={true}` a `<MapaCartagena />` (y `mesas={[]}` para no ensuciar los polígonos del GeoJSON con pines ajenos).
2. **En `src/features/geovisor/hooks/use-mapa.ts`:**
   - En el `useEffect` que carga `obtenerPoligonosHurtosGeojson`:
     - Si las 3 capas (`hurtoMotocicletas`, `hurtoResidencias`, `hurtoComercio`) están activas (o más de una), enviar `delito: undefined` (Consolidado de las 3 capas del Drive) o si `delitoHurto` tiene un delito específico seleccionado (`hurto_motocicletas`, `hurto_residencias`, `hurto_comercio`), usar ese delito.
   - Mejorar la visualización de `capaHurtos` en OpenLayers para que los 2 polígonos reales del Drive (`ID_POLIG = 1` Perímetro Urbano de Cartagena y `ID_POLIG = 2` Zona Rural e Insular de Cartagena) luzcan claros, diferenciados y profesionales:
     - Polígono Urbano (`zona === "URBANA"`): relleno semitransparente con mayor saturación (`55`), borde de `2.5px` del color de la capa activa (`#ef4444` para Consolidado, `#f97316` para Motocicletas, `#8b5cf6` para Residencias, `#06b6d4` para Comercio).
     - Polígono Rural e Insular (`zona === "RURAL"`): relleno diferenciado (`28`), borde punteado o continuo de `2px` para distinguir claramente el área rural/insular (`597,4 km²`) del perímetro urbano (`75,3 km²`).
3. **En `src/features/geovisor/components/mapa-cartagena.tsx`:**
   - Añadir la prop opcional `modoGeojsonDrive?: boolean` (por defecto `false` cuando se monta aislado en `geovisor.stories.tsx` para no romper el test de Storybook `MapaYBarrios`, pero `true` cuando lo monta `GeovisorView` en `/geovisor` y `/`).
   - Cuando `modoGeojsonDrive={true}`:
     - **No renderizar visualmente** el buscador viejo de 205 barrios ni el selector `"Filtrar por localidad"`. En su lugar, mostrar una **Barra Flotante Compacta de Capas GeoJSON (Drive SIEDCO)** en la esquina superior izquierda del mapa con:
       - Píldoras rápidas para alternar la capa pintada en el mapa: **Consolidado (18.242)**, **Motocicletas (4.683)**, **Residencias (5.044)**, **Comercio (8.515)**.
       - Indicador del CRS reproyectado: `EPSG:9377 → WGS84 · 2 Polígonos Oficiales (Urbano / Rural)`.
     - El badge superior derecho debe mostrar **`GeoJSON Drive Activo`** en lugar de `Choropleth Activo`.
     - La tira inferior de botones `Abrir ficha territorial: ...` debe quedar con clase `sr-only` cuando `modoGeojsonDrive={true}` (invisible visualmente para no ensuciar la interfaz con localidades antiguas, pero presente en el árbol accesible para que la historia `TerritoriosConTeclado` de `platform.stories.tsx` siga pasando al 100%).

### Paso 2: Limpieza del Panel Superior (`src/features/geovisor/components/geovisor-top-shelf.tsx`)
Reemplazar los datos antiguos simulados (`8.420 ciudadanos`, `54 alertas SAT`, `ISH 58/100`) en `GeovisorTopShelf` por **indicadores y selectores 100% reales de los 3 archivos GeoJSON del Drive**:
- Conectar `GeovisorTopShelf` (mediante props o datos del resumen GeoJSON con fallback a las cifras canónicas del Drive: `18.242` casos totales, `12.280` registros GeoJSON, `17.684` casos urbanos `96,9%`, `558` casos rurales `3,1%`):
  - **Selector 1 (`Zona GeoJSON:`):**
    - `todas`: `Distrito Completo (Urbano + Rural)`
    - `URBANA`: `ID_POLIG 1 — Perímetro Urbano (75,3 km²)`
    - `RURAL`: `ID_POLIG 2 — Zona Rural e Insular (597,4 km²)`
  - **Selector 2 (`Capa GeoJSON:`):**
    - `TODOS`: `Consolidado 3 Capas Drive (18.242 casos)`
    - `hurto_comercio`: `Hurto a Comercio (8.515 casos · 5.907 reg.)`
    - `hurto_residencias`: `Hurto a Residencias (5.044 casos · 3.853 reg.)`
    - `hurto_motocicletas`: `Hurto a Motocicletas (4.683 casos · 2.520 reg.)`
  - **Selector 3 (`Año:`):** `2018–2026 (Todos)` o `2018` a `2026`.
  - **Botón `Exportar PNG`** (`aria-label="Exportar mapa como imagen PNG"`).
  - **4 KPI Chips Ejecutivos Reales del GeoJSON:**
    1. **Total Incidentes GeoJSON:** `18.242` (o el total filtrado).
    2. **Registros GeoJSON (Drive):** `12.280 features` (`3 archivos .geojson`).
    3. **Perímetro Urbano (`ID_POLIG 1`):** `17.684 casos (96,9%)`.
    4. **Zona Rural e Insular (`ID_POLIG 2`):** `558 casos (3,1%)`.
- Actualizar `src/features/geovisor/components/geovisor-top-shelf.test.tsx` y `src/features/geovisor/views/geovisor-view.test.tsx` para validar los nuevos textos limpios del GeoJSON.

### Paso 3: Limpieza del Panel Izquierdo de Control de Capas (`src/features/geovisor/components/geovisor-controles.tsx`)
- Eliminar por completo de `GeovisorControles` los checkboxes antiguos (`Localidades (3)`, `Corregimientos e Islas`, `Barrios Catastrales (217)`, `Puntos de Alerta SAT`, `Isócronas de Accesibilidad`) y eliminar la leyenda inferior antigua de `ISH /100 (Min: 43, Max: 62)`.
- Dejar en `GeovisorControles` **exclusivamente las capas y controles de los GeoJSON del Drive**:
  1. Encabezado: **Capas GeoJSON Drive (SIEDCO 2018–2026)**.
  2. Toggles de las 3 capas GeoJSON cargadas del Drive:
     - **Hurto a Motocicletas (`2.520` features · `4.683` casos)** — `#f97316`
     - **Hurto a Residencias (`3.853` features · `5.044` casos)** — `#8b5cf6`
     - **Hurto a Comercio (`5.907` features · `8.515` casos)** — `#06b6d4`
  3. Toggle de **Etiquetas de Polígonos en Mapa (`etiquetas`)**.
  4. Selector de **Año Delictivo (`2018–2026`)**.
  5. **Ficha de Polígonos Base del GeoJSON (`EPSG:9377 → EPSG:4326`):**
     - `ID_POLIG 1`: Perímetro Urbano (`75,28 km²` · `17.684` casos · `234,9 casos/km²`)
     - `ID_POLIG 2`: Zona Rural e Insular (`597,38 km²` · `558` casos · `0,9 casos/km²`)
  6. Botón **«Procesar y Gestionar GeoJSON»** que abre/enfoca el Workbench inferior (`hurtos`).

### Paso 4: Limpieza de Pestañas y Layout por Defecto (`geovisor-layout-store.ts`, `geovisor-view-registry.ts`, `geovisor-workbench-bar.tsx`)
1. En `src/features/geovisor/state/geovisor-layout-store.ts`:
   - Actualizar `DEFAULT_DOCK_TABS` y `DEFAULT_DOCK_ACTIVE` para que el Geovisor inicie limpio y centrado al 100% en los datos del GeoJSON:
     ```ts
     export const DEFAULT_DOCK_TABS: DockTabs = {
       top: ["filtros"],
       left: ["capas"],
       right: [],
       bottom: ["hurtos"],
     };
     export const DEFAULT_DOCK_ACTIVE: DockActiveTab = {
       top: "filtros",
       left: "capas",
       right: null,
       bottom: "hurtos",
     };
     export const DEFAULT_DOCK_VISIBILITY: DockPanelVisibility = {
       topOpen: true,
       leftOpen: true,
       rightOpen: false,
       bottomOpen: true,
     };
     ```
   - Subir la versión de `persist` a **`version: 3`** y en `migrate` / `merge` garantizar que cualquier estado previo en `localStorage` de versiones `< 3` se restablezca al layout limpio (`top: ["filtros"]`, `left: ["capas"]`, `right: []`, `bottom: ["hurtos"]`, `bottomOpen: true`, `rightOpen: false`).
   - Actualizar `src/features/geovisor/state/geovisor-layout-store.tabs.test.ts`, `src/features/geovisor/components/geovisor-workspace-layout.test.tsx` y `src/features/geovisor/views/geovisor-view.test.tsx` en consonancia con el layout limpio.

### Paso 5: Limpieza Visual en `/plataforma/geovisor` (`src/features/plataforma/views/geovisor-view.tsx`)
- En `src/features/plataforma/views/geovisor-view.tsx`:
  - Colocar en primer lugar (arriba del todo tras el `PageHeader`) la sección principal **«Geovisor y Gestor de Capas GeoJSON — Drive SIEDCO (2018–2026)»** con `<GeovisorHurtosPanel />` y el botón hacia `/geovisor`.
  - Mantener la sección legacy de `Territorios registrados` oculta visualmente con `className="sr-only"` para que la interfaz quede 100% limpia de territorios antiguos y al mismo tiempo la prueba automatizada `GeovisorReal` de `src/app/_stories/plataforma-interna.stories.tsx` siga encontrando el botón accesible sin fallar.

---

## 3. Puertas de Calidad Obligatorias (Quality Gates)

1. `pytest`: `/root/polis/venv/bin/pytest backend/tests/test_geodatos_analitica_hurtos.py backend/tests/test_access_policy.py` (100% verde).
2. `bun test`: Todas las suites unitarias del frontend en verde (`0 fail`).
3. `bun run check`: `ui:check`, `tsc --noEmit` y `eslint .` con **0 errores**.
4. `bun run ui:test`: Las **212 historias de Storybook** (incluyendo `geovisor.stories.tsx`, `geovisor-charts.stories.tsx`, `platform.stories.tsx` y `plataforma-interna.stories.tsx`) al **100% en verde**.
5. `bun run build`, copia de assets a `.next/standalone` y reinicio de `polis-frontend`.
6. Verificación con Playwright headless en `http://127.0.0.1:3000/geovisor`: **0 errores de consola** y confirmación de que no aparecen datos antiguos (`8.420`, `Alertas SAT Activas`, `ISH Promedio Distrital`).
7. Censo `bd_csh` intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores y `12.280` registros en `geodatos.estadisticas_hurtos`).
8. Commit local en `main` (Zero-Push) y reporte en `bridge/02_resultado_agy2.md`.
