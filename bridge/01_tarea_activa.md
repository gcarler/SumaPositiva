# TAREA ACTIVA PARA AGY2: `[GEO-UX-SCROLL-01]`

- **Prioridad:** ALTA — Experiencia Ciudadana, Lenguaje Claro, Mapa +20%, Panel Superior Oculto por Defecto y Scroll Fluido de Datos Estadísticos en el Geovisor (`/geovisor` y `/plataforma/geovisor`)
- **Asignado por:** `agy` (Coordinador General / Auditor Forense EAF)
- **Fecha:** 2026-10-14

---

## 1. Contexto y Solicitud del Usuario

El usuario revisó el Geovisor en vivo y destacó que a nivel tecnológico quedó excelente, pero solicitó corregir los siguientes aspectos de UX y lenguaje ciudadano:

1. **Eliminar jerga técnica «Capa GeoJSON:» y «GeoJSON» de cara al ciudadano:**
   - En el Geovisor dice `Capa GeoJSON:` y `Zona GeoJSON:`, lo cual es jerga técnica que el ciudadano no tiene por qué ver cuando lo que está consultando son **datos estadísticos**.
   - En el sidebar izquierdo (`GeovisorControles`), en la parte inferior hay un botón llamado `Procesar y Gestionar GeoJSON` (y en la barra superior `Gestor GeoJSON`), nombres técnicos que deben cambiarse por nombres orientados a **Datos Estadísticos**.
2. **Panel superior oculto por defecto (`topOpen: false`) con botón claro para mostrarlo/desplegarlo:**
   - El panel superior (`GeovisorTopShelf` acoplado en el dock `top`) debe venir **oculto por defecto** al abrir el Geovisor, dejando por supuesto un botón claro y visible en la barra superior (`GeovisorWorkbenchBar`) que permita mostrar/ocultar ese panel superior cuando el usuario quiera desplegarlo.
3. **Mapa ~20% más grande por defecto + Scroll vertical habilitado hacia los Datos Estadísticos + CTA «Ver Datos Estadísticos ↓» en la parte inferior:**
   - Actualmente `/geovisor` bloquea el scroll (`h-dvh overflow-hidden`) y deja los datos estadísticos encerrados en una franja pequeña sin permitir hacer scroll cómodo en la página ni descubrir fácilmente la analítica que está debajo del mapa.
   - El mapa debe verse **un 20% más amplio por defecto** (al ocultar el panel superior por defecto y darle mayor altura al bloque del mapa), debe **habilitarse el scroll hacia abajo** para recorrer con total fluidez todos los datos estadísticos (`GeovisorHurtosPanel`), y en la **parte final/inferior visible del mapa** debe mostrarse un botón/indicador claro (**«Ver datos estadísticos ↓»**) que al pulsarlo suba/despliegue automáticamente la capa/sección de datos estadísticos para hacer scroll e interactuar bidireccionalmente entre los datos estadísticos y el mapa.

---

## 2. Especificaciones Técnicas Obligatorias

### 2.1. Lenguaje Ciudadano Claro (Reemplazar «Capa GeoJSON» y «Procesar y Gestionar GeoJSON»)

1. **`src/features/geovisor/components/geovisor-top-shelf.tsx` (y su test `geovisor-top-shelf.test.tsx`):**
   - Cambia `Zona GeoJSON:` por **`Zona Territorial:`** (`aria-label="Seleccionar zona territorial"`).
   - En `OPCIONES_ZONA`, usa nombres limpios para el ciudadano:
     - `Distrito Completo (Urbano + Rural)`
     - `Perímetro Urbano (75,3 km²)`
     - `Zona Rural e Insular (597,4 km²)`
   - Cambia `Capa GeoJSON:` por **`Datos Estadísticos:`** (`aria-label="Seleccionar categoría de datos estadísticos"`).
   - En `OPCIONES_CAPA`, cambia `Consolidado 3 Capas Drive (18.242 casos)` por **`Consolidado General de Hurtos (18.242 casos)`**.
   - En los 4 KPI Chips de la fila inferior:
     - `Total Incidentes GeoJSON` → **`Total Casos Reportados`**
     - `Registros GeoJSON (Drive)` / `features` → **`Registros Estadísticos SIEDCO`** y muestra `{kpis.features.toLocaleString("es-CO")} registros`
     - `Perímetro Urbano (ID_POLIG 1)` → **`Perímetro Urbano`**
     - `Zona Rural e Insular (ID_POLIG 2)` → **`Zona Rural e Insular`**

2. **`src/features/geovisor/components/geovisor-controles.tsx` (Sidebar izquierdo):**
   - Cambia el título `Capas GeoJSON Drive (SIEDCO 2018–2026)` por **`Capas de Datos Estadísticos (SIEDCO 2018–2026)`**.
   - En los 3 checkboxes de capas, cambia la palabra técnica `features` por `registros`:
     - `(4.683 casos · 2.520 registros)`
     - `(5.044 casos · 3.853 registros)`
     - `(8.515 casos · 5.907 registros)`
   - Cambia el subtítulo `Polígonos Base GeoJSON` por **`Cobertura Territorial Analizada`**, el badge `EPSG:9377 → WGS84` por **`Cartagena de Indias`**, `ID_POLIG 1: Perímetro Urbano` por **`Zona 1: Perímetro Urbano`** y `ID_POLIG 2: Zona Rural e Insular` por **`Zona 2: Rural e Insular`**.
   - En el botón inferior (línea 211), cambia **`Procesar y Gestionar GeoJSON`** por **`Ver Datos Estadísticos y Tablero`** (`data-testid="btn-sidebar-ver-estadisticas"`).

3. **`src/features/geovisor/components/geovisor-workbench-bar.tsx`:**
   - Cambia el texto del botón `Gestor GeoJSON` (`data-testid="workbench-btn-gestor-geojson"`) por **`Datos Estadísticos`** (con `title="Ver y explorar datos estadísticos (12.280 registros)"`).
   - Añade un botón explícito en la barra (`data-testid="workbench-btn-toggle-top-panel"`) que permita mostrar/ocultar el Panel Superior con etiqueta clara:
     - Cuando `topOpen === false`: **`Mostrar Panel Superior`**
     - Cuando `topOpen === true`: **`Ocultar Panel Superior`**

4. **`src/features/geovisor/components/mapa-cartagena.tsx`:**
   - En el panel flotante superior izquierdo (cuando `modoGeojsonDrive === true`, líneas 176–224):
     - Cambia `aria-label="Capas GeoJSON Drive"` a `aria-label="Filtro de datos estadísticos en el mapa"`.
     - Cambia el título `Capas GeoJSON Drive (SIEDCO 2018–2026)` por **`Datos Estadísticos de Seguridad (2018–2026)`**.
     - Cambia `EPSG:9377 → WGS84 · 2 Polígonos Oficiales` por **`Cartagena · Urbano y Rural`**.
   - En el badge superior derecho (línea 335):
     - Cambia `GeoJSON Drive Activo` por **`Mapa Estadístico Activo`**.

5. **`src/features/geovisor/components/geovisor-hurtos-panel.tsx`:**
   - En las 3 pestañas de modo y encabezados visibles para el usuario, suaviza la jerga:
     - `1. Resumen y Gráficos` → **`1. Resumen y Gráficos Estadísticos`**
     - `2. Procesador y Tabla (12.280)` → **`2. Explorador y Tabla de Datos (12.280)`**
     - `3. Gestor e Importador GeoJSON` → **`3. Catálogo de Capas e Importador`**
     - `Pintado Rápido de Capas GeoJSON:` → **`Visualización Rápida en el Mapa:`**

---

### 2.2. Panel Superior Oculto por Defecto (`topOpen: false`) y Mapa ~20% Más Grande

1. **`src/features/geovisor/state/geovisor-layout-store.ts`:**
   - Cambia `DEFAULT_DOCK_VISIBILITY`:
     ```ts
     export const DEFAULT_DOCK_VISIBILITY: DockPanelVisibility = {
       topOpen: false,
       leftOpen: true,
       rightOpen: false,
       bottomOpen: true,
     };
     ```
   - Ajusta `DEFAULT_DOCK_SIZES` para que el mapa tenga un protagonismo un 20% mayor en el área principal y el panel inferior tenga una apertura cómoda:
     ```ts
     export const DEFAULT_DOCK_SIZES: DockPanelSizes = {
       top: 16,
       left: 22,
       right: 24,
       bottom: 28,
     };
     ```
   - Incrementa la versión de persistencia en `useGeovisorLayoutStore` de `version: 3` a **`version: 4`**, de modo que si el navegador tenía guardado un layout con versión `< 4` donde `topOpen` era `true`, migre limpiamente a `topOpen: false` y a los nuevos tamaños por defecto.
   - Actualiza los tests unitarios de `geovisor-layout-store.test.ts` y `geovisor-workspace-layout.test.tsx` que verifiquen el estado inicial de `topOpen` para que sean coherentes con `topOpen: false` por defecto (y verifiquen que al activar `togglePanel("top")` o `setPanelOpen("top", true)` se despliega el panel superior).

---

### 2.3. Habilitar Scroll Vertical Hacia los Datos Estadísticos + Botón «Ver Datos Estadísticos ↓» e Interacción con el Mapa

El objetivo clave del usuario es que:
- En la primera vista, el mapa se vea amplio (~20% más grande gracias a que el panel superior está oculto por defecto y el lienzo del mapa tiene mayor altura, p. ej. `min-h-[42rem]` / `72dvh–78dvh`).
- En la parte final/inferior del mapa se vea claramente una barra/botón interactivo **«Ver datos estadísticos (18.242 casos) ↓»** (`data-testid="btn-ver-datos-estadisticos"`).
- El usuario pueda **hacer scroll hacia abajo** en la página/contenedor para explorar toda la información estadística (`GeovisorHurtosPanel`: gráficos, KPIs, explorador de 12.280 registros, tablas dinámicas) sin que quede cortada ni bloqueada por un `overflow-hidden` rígido, O pulsar el botón **«Ver datos estadísticos ↓»** para que automáticamente la sección de datos estadísticos suba / se expanda (`scrollIntoView({ behavior: "smooth" })` y/o expanda el panel inferior) y permita hacer scroll completo sobre todos los datos estadísticos.
- **Interacción bidireccional Datos Estadísticos ↔ Mapa:**
  - Al cambiar el delito (`Motocicletas`, `Residencias`, `Comercio` o `Consolidado`), el año (`2018`–`2026`) o hacer clic en una zona (`Perímetro Urbano` / `Rural e Insular`) dentro de `GeovisorHurtosPanel`, el mapa (`MapaCartagena`) actualiza inmediatamente su capa activa y su filtro temporal; y viceversa, al cambiar el filtro en el mapa o hacer clic en un polígono del mapa, los datos estadísticos se sincronizan en vivo.

**Implementación concreta recomendada para el Scroll y el CTA inferior:**
1. En `src/app/geovisor/page.tsx` y `src/features/geovisor/views/geovisor-view.tsx` / `src/features/geovisor/components/geovisor-workspace-layout.tsx`:
   - Permite que el espacio de trabajo del Geovisor tenga scroll vertical fluido (`overflow-y-auto`) o que debajo del bloque principal del mapa (`min-h-[75dvh]`) el contenedor de datos estadísticos (`bottomSlot` / sección `#geovisor-datos-estadisticos`) pueda recorrerse con scroll vertical de página completa y también expandirse con 1 clic.
   - Asegúrate de que dentro de `#dock-panel-bottom` y de `GeovisorHurtosPanel` el scroll con rueda del ratón / trackpad funcione sin bloqueos (`overflow-y-auto`, sin contenedores padres que atrapen o recorten el contenido sin barra de desplazamiento).
2. En la parte inferior central de `MapaCartagena` (`src/features/geovisor/components/mapa-cartagena.tsx`, cuando `modoGeojsonDrive === true`), añade un botón flotante tipo píldora de alto contraste (`data-testid="btn-ver-datos-estadisticos"`):
   - Texto: **`Ver datos estadísticos (18.242 casos) ↓`**
   - Al hacer clic:
     - Abre la vista de estadísticas (`useGeovisorLayoutStore.getState().openView("hurtos")`), expande o enfoca el panel de estadísticas y ejecuta `document.getElementById("geovisor-datos-estadisticos")?.scrollIntoView({ behavior: "smooth", block: "start" })` (además de expandir el dock inferior si está contraído) para que la capa de datos estadísticos suba inmediatamente a primer plano y el ciudadano pueda hacer scroll por todos los gráficos y tablas.
3. En `GeovisorHurtosPanel` (`src/features/geovisor/components/geovisor-hurtos-panel.tsx`), envuelve o identifica el contenedor raíz con `id="geovisor-datos-estadisticos"` y añade en su barra superior un botón rápido **`↑ Subir al Mapa / Ver Mapa Completo`** que permita alternar suavemente entre la vista expandida de datos estadísticos y el mapa.

---

## 3. Quality Gates Obligatorios antes de Reportar

1. `/root/polis/venv/bin/pytest` -> **100% en verde**.
2. `bun test` -> **100% en verde** (actualizando y ampliando los tests de `geovisor-top-shelf.test.tsx`, `geovisor-layout-store.test.ts`, `geovisor-workspace-layout.test.tsx` y `geovisor-hurtos-panel.test.tsx`).
3. `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`) -> **0 errores**.
4. `bun run ui:test` -> **100% historias Storybook aprobadas con `axe-core`**.
5. `bun run build` -> **Build de producción exitoso** y reinicio de `polis-frontend` y `polis-backend`.
6. Verificación headless con Playwright en `http://127.0.0.1:3000/geovisor` comprobando:
   - 0 errores de consola.
   - Panel superior oculto por defecto (`topOpen === false`) y botón `Mostrar Panel Superior` visible.
   - Ausencia del rótulo `Capa GeoJSON:` y del botón `Procesar y Gestionar GeoJSON`.
   - Presencia de `Datos Estadísticos`, botón `Ver datos estadísticos (18.242 casos) ↓` y scroll funcional sobre la sección de datos estadísticos.
7. Commit local en `main` (**Política Zero-Push**) y reporte detallado en `bridge/02_resultado_agy2.md`.
