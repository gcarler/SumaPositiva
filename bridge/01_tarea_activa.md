# TAREA ACTIVA PARA `agy2`: [GEO-GESTOR-01]
## PINTADO POR DEFECTO DE CAPAS GEOJSON Y HERRAMIENTA FRONTEND DE GESTIÓN, PROCESAMIENTO, EXPLORACIÓN TABULAR E IMPORTACIÓN DE ARCHIVOS GEOJSON EN EL GEOVISOR

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Prioridad:** P0 — Visibilidad inmediata de los GeoJSON de Hurtos en el mapa y construcción del Gestor, Procesador y Explorador de Datos GeoJSON en el frontend del Geovisor (`/geovisor` y `/plataforma/geovisor`).

---

## 🎯 CONTEXTO Y PROBLEMA REPORTADO POR EL PROPIETARIO

El propietario compartió la carpeta de Google Drive con los 3 archivos GeoJSON (`Hurto_Motocicletas.geojson`, `Hurto_Residencias.geojson`, `Hurto_Comerciantes.geojson` — **12.280 registros / 18.242 eventos** de 2018 a 2026) con el objetivo de:
1. **Verlos pintados en el Geovisor**, y
2. **Contar con una herramienta a nivel del frontend dentro del Geovisor que permita gestionar, procesar, filtrar, cruzar y manejar toda la información contenida en los GeoJSON** (así como incorporar/cargar capas GeoJSON desde la interfaz).

Actualmente existen **4 brechas** por las cuales el propietario no ve los GeoJSON ni puede procesarlos como una herramienta completa:
1. **Capas GeoJSON apagadas al abrir `/geovisor`:** En `src/features/geovisor/views/geovisor-view.tsx` (líneas 63–65), `hurtoMotocicletas`, `hurtoResidencias` y `hurtoComercio` inician en `false`, por lo que al abrir el Geovisor no se pinta ninguna capa de los GeoJSON en el mapa.
2. **Pestaña `"hurtos"` ausente del layout por defecto del Geovisor:** En `src/features/geovisor/state/geovisor-layout-store.ts` (líneas 35–47), `DEFAULT_DOCK_TABS.bottom` solo tiene `["datagrid", "graficos"]` y **no incluye `"hurtos"`**. Además, como el store persiste en `localStorage` bajo `"polis-geovisor-layout-v2"`, el navegador nunca muestra la pestaña de Hurtos/GeoJSON por defecto.
3. **Falta de un Procesador y Gestor de Datos GeoJSON en el Frontend (`GeovisorHurtosPanel`):** Actualmente `GeovisorHurtosPanel` (`src/features/geovisor/components/geovisor-hurtos-panel.tsx`) solo muestra tarjetas KPI y barras simples, pero **no permite**:
   - Explorar los **12.280 registros** de los GeoJSON en una tabla paginada y buscable.
   - Filtrar y cruzar dinámicamente por todas las dimensiones del GeoJSON (**Delito**, **Año**, **Mes**, **Día de la semana**, **Modalidad / Armas-Medios**, **Clase de Sitio**, **Zona Urbana/Rural**).
   - Agrupar / hacer tabla dinámica (Pivot) por cualquiera de esas columnas y **exportar los datos procesados en CSV o GeoJSON**.
   - **Gestionar las capas GeoJSON o cargar/incorporar un archivo `.geojson` / `.json` desde el navegador** para pintarlo en el mapa e inspeccionar sus atributos.
4. **Vista administrativa `/plataforma/geovisor` desconectada:** `src/features/plataforma/views/geovisor-view.tsx` muestra una vista vieja que solo lista 4 territorios y no permite gestionar las capas GeoJSON ni abrir el Workbench analítico.

---

## 🛠️ ESPECIFICACIÓN TÉCNICA PASO A PASO

### 1. Visibilidad por Defecto en el Mapa y en el Dock del Geovisor (`geovisor-layout-store.ts` y `geovisor-view.tsx`)

1. **En `src/features/geovisor/state/geovisor-layout-store.ts`:**
   - En `DEFAULT_DOCK_TABS` (líneas 35–40), incluye `"hurtos"` en el panel inferior (`bottom: ["hurtos", "datagrid", "graficos"]`) para que la pestaña **«Hurtos / GeoJSON»** aparezca siempre visible en el dock inferior.
   - En la función `merge` del middleware `persist` (o actualizando la versión/hidratación en `sanitizeDockTabs`), asegúrate de que si el estado persistido en `localStorage` no contiene `"hurtos"` en ningún panel (`!findViewDock(tabs, "hurtos")`), se inserte automáticamente `"hurtos"` al inicio de `tabs.bottom`. *(Cuidado: verifica que los tests unitarios existentes en `src/features/geovisor/state/geovisor-layout-store.tabs.test.ts` sigan pasando al 100% o ajústalos coherentemente).*
2. **En `src/features/geovisor/views/geovisor-view.tsx`:**
   - Inicializa `delitoHurto` en `"TODOS"` (o `"hurto_motocicletas"`) y activa por defecto en `capas`:
     ```ts
     hurtoMotocicletas: true,
     hurtoResidencias: false,
     hurtoComercio: false,
     ```
     y `delitoHurto` en `"hurto_motocicletas"`, de modo que apenas el usuario abra el Geovisor, el mapa de Cartagena **pinte de inmediato la capa GeoJSON** y el usuario pueda alternar entre Motocicletas, Residencias, Comercio o Consolidado desde el control de capas o desde el Gestor GeoJSON.
   - Además, pasa a `<GeovisorHurtosPanel>` un callback `onCargarGeojsonPersonalizado?: (geojson: FeatureCollection, nombreCapa: string, color: string) => void` (o manéjalo con estado compartido) para que las capas GeoJSON cargadas/gestionadas desde el panel también se pinten en `MapaCartagena`.

---

### 2. Nuevo Endpoint Backend de Exploración Tabular y Procesamiento (Pivot) de los GeoJSON (`backend/app/modules/geodatos/router.py`)

En `backend/app/modules/geodatos/router.py`, agrega un nuevo endpoint de consulta y procesamiento analítico sobre `geodatos.estadisticas_hurtos`:

- **Ruta:** `GET /api/v1/geodatos/analitica/hurtos/registros`
- **Parámetros query opcionales:**
  - `delito: str | None = None` (usa `_normalizar_delito`)
  - `anio: int | None = None`
  - `mes: str | None = None`
  - `zona: str | None = None` (`URBANA` | `RURAL`)
  - `armas_medios: str | None = None`
  - `clase_sitio: str | None = None`
  - `dia_semana: str | None = None`
  - `busqueda: str | None = None` (filtra con `ILIKE` sobre `delito`, `armas_medios`, `clase_sitio`, `mes`, `dia_semana`)
  - `agrupar_por: str = Query("armas_medios", pattern="^(delito|anio|mes|zona|armas_medios|clase_sitio|dia_semana)$")`
  - `limit: int = Query(50, ge=1, le=500)`
  - `offset: int = Query(0, ge=0)`
- **Respuesta JSON estructurada:**
  - `total_registros: int` (total de filas en `estadisticas_hurtos` que cumplen el filtro).
  - `total_incidentes: int` (`SUM(cantidad)` de las filas que cumplen el filtro).
  - `limit: int`, `offset: int`.
  - `registros: list[dict]` con `id`, `delito`, `anio`, `mes`, `dia_semana`, `zona`, `poligono_id`, `armas_medios`, `clase_sitio`, `cantidad`.
  - `agrupacion: list[dict]` (resultado de agrupar las filas filtradas por la columna `agrupar_por`, ordenado por `incidentes DESC`, con `{ "categoria": str, "registros": int, "incidentes": int, "porcentaje": float }`).
  - `catalogos: dict` con las listas de valores únicos disponibles en la tabla para los selectores del frontend (`meses`, `dias_semana`, `top_armas_medios`, `top_clases_sitio`).
- Agrega en `src/features/geovisor/services/hurtos-api.ts` la función tipada `explorarRegistrosHurtos(params)` y sus interfaces TypeScript (`ExploradorHurtosResponse`, `RegistroHurtoItem`, `AgrupacionHurtoItem`, `ParametrosExploradorHurtos`), con fallback resiliente en caso de modo offline/test.

---

### 3. Transformación de `GeovisorHurtosPanel` en el «Gestor, Procesador y Analizador GeoJSON» (`src/features/geovisor/components/geovisor-hurtos-panel.tsx`)

Enriquece `GeovisorHurtosPanel` manteniendo compatibilidad total con sus props y tests actuales (`data-testid="geovisor-hurtos-panel"`), incorporando una barra de **3 sub-vistas / modos de trabajo** claramente visibles:

1. **Modo 1: «Resumen y Gráficos» (Vista inicial):**
   - Mantiene los selectores de Delito, Año y Zona, las 4 tarjetas KPI, la serie anual 2018–2026, la serie mensual y los rankings Top 5 de Armas/Modalidades y Clases de Sitio.
   - Añade botones rápidos de pintado en mapa (**«Pintar en Mapa: Motocicletas»**, **«Pintar: Residencias»**, **«Pintar: Comercio»**, **«Pintar: Consolidado»**) para que con un solo clic se active y resalte la capa GeoJSON en el lienzo central.

2. **Modo 2: «Procesador y Tabla de Datos GeoJSON (12.280 registros)»:**
   - Conectado a `explorarRegistrosHurtos` (`GET /api/v1/geodatos/analitica/hurtos/registros`).
   - **Barra avanzada de procesamiento y filtrado:**
     - Selectores adicionales por **Mes**, **Día de la semana**, **Modalidad / Arma-Medio**, **Clase de Sitio**, **Buscador de texto** y selector **«Agrupar y Procesar por»** (*Modalidad/Arma*, *Clase de Sitio*, *Día de la Semana*, *Mes*, *Año*, *Delito*, *Zona*).
   - **Vista de Tabla Dinámica (Pivot) + Tabla Paginada de Registros GeoJSON:**
     - Muestra el resultado del procesamiento agrupado (Categoría, N° Registros GeoJSON, Total Incidentes, % Participación con barra visual).
     - Muestra la tabla detallada de registros GeoJSON con paginación (*Anterior / Siguiente*, mostrando `offset + 1` a `offset + registros.length` de `total_registros`).
   - **Botones de Exportación en Frontend:**
     - **«Exportar CSV Procesado»**: descarga un archivo `.csv` con los datos procesados/filtrados.
     - **«Exportar GeoJSON Filtrado»**: descarga el `.geojson` filtrado desde `obtenerPoligonosHurtosGeojson`.

3. **Modo 3: «Gestor de Capas e Importador GeoJSON»:**
   - **Catálogo de Capas GeoJSON Oficiales (Drive SIEDCO):**
     - Muestra las 3 capas GeoJSON incorporadas en la plataforma (*Hurto a Motocicletas — 2.520 features*, *Hurto a Residencias — 3.853 features*, *Hurto a Comercio — 5.907 features*, proyección original `EPSG:9377` → `EPSG:4326`) con su estado (Activa / Inactiva), botón para **Activar en Mapa** y botón para **Procesar Datos**.
   - **Importador / Procesador de Archivos `.geojson` / `.json` en el Navegador:**
     - Permite al usuario seleccionar o arrastrar un archivo `.geojson` o `.json` local.
     - Procesa el JSON en cliente: cuenta el número de `features`, detecta el tipo de geometría (`Polygon`, `MultiPolygon`, `Point`, `LineString`), extrae automáticamente la lista de propiedades/columnas del GeoJSON y calcula un resumen de sus atributos.
     - Permite **Pintar la capa importada en el mapa OpenLayers** (con selector de color) o **Inspeccionar su tabla de atributos** directamente en el panel.

---

### 4. Actualización del Geovisor Administrativo en `/plataforma/geovisor` (`src/features/plataforma/views/geovisor-view.tsx`)

En `src/features/plataforma/views/geovisor-view.tsx`:
- Conservando los elementos que verifican las pruebas existentes (el `PageHeader` *"Geovisor administrativo"*, la sección *"Territorios registrados"* y `MapaApi`), incorpora debajo (o en una sección integrada en la misma vista) el módulo **«Capas GeoJSON e Inteligencia Delictiva SIEDCO (2018–2026)»** que embeba `<GeovisorHurtosPanel />` y un enlace directo `<Button asChild><Link href="/geovisor">Abrir Workbench Geovisor Pantalla Completa</Link></Button>`. Así, cuando el propietario entre por `/plataforma/geovisor`, también tendrá a la vista toda la herramienta de gestión y procesamiento de los GeoJSON.

---

## 🧪 CRITERIOS DE ACEPTACIÓN Y VERIFICACIÓN OBLIGATORIA

1. **Pruebas Backend (`pytest`):**
   - Añadir prueba en `backend/tests/test_geodatos_analitica_hurtos.py` para `GET /api/v1/geodatos/analitica/hurtos/registros` verificando filtrado combinado, paginación, agrupación dinámica (`agrupar_por`) y catálogos.
2. **Pruebas Frontend (`bun test`):**
   - Actualizar/ampliar `src/features/geovisor/components/geovisor-hurtos-panel.test.tsx` y `src/features/geovisor/services/hurtos-api.test.ts` para verificar los 3 modos (*Resumen y Gráficos*, *Procesador y Tabla de Datos GeoJSON*, *Gestor e Importador GeoJSON*).
   - Verificar que `src/features/geovisor/state/geovisor-layout-store.tabs.test.ts` pase al 100% con `"hurtos"` integrado en el dock inferior.
3. **Quality Gates en 0 errores:**
   - `bun run check` (`bun run ui:check`, `tsc --noEmit`, `eslint .` — 0 errores; **cuidado con Zero-Colors**: usa variables CSS `var(--...)` y componentes de `@/shared/ui/`, nunca colores hexadecimales o clases Tailwind prohibidas fuera de los archivos permitidos).
   - `bun run ui:test` (212/212 historias Storybook pasando con `axe-core`).
   - `bun run build` (192 rutas compiladas).
4. **Servicios y Censo `bd_csh`:**
   - Reiniciar `polis-backend` y `polis-frontend`.
   - Verificar `GET http://127.0.0.1:8000/api/v1/geodatos/analitica/hurtos/registros?limit=5`, `GET http://127.0.0.1:3000/geovisor` y `GET http://127.0.0.1:3000/plataforma/geovisor` en `HTTP 200 OK`.
   - Censo `bd_csh` intacto: **33 mesas, 36 agendas, 11 fichas, 17 actores, 12.280 filas de hurtos**.
   - Commit local en `main` (Zero-Push) y reporte en `bridge/02_resultado_agy2.md`.
