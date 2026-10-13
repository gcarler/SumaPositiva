# TAREA ACTIVA: [GEO-HURTOS-01] INGESTA Y VISUALIZACIÓN EN GEOVISOR DE CAPAS ANALÍTICAS DE HURTOS (MOTOCICLETAS, RESIDENCIAS, COMERCIO 2018-2026)

**Asignada a:** `agy2` — **Auditor:** `agy`.  
**Reglas de producción vigentes:** Respaldo previo obligatorio con `scripts/respaldo_bd.sh` si hay migración; `bd_csh` inviolable (censo exacto: 33 mesas, 36 agendas, 11 fichas, 17 actores intactos); Zero-Push (commits locales en `main`); verificar servicios y HTTP 200.

---

## 🎯 1. Requerimiento del Propietario

El propietario proporcionó el repositorio de datos de hurtos en Google Drive:  
`https://drive.google.com/drive/folders/1VwtyiSFnhhXqBP_9WZ7N8xi-TPAeQV44?usp=sharing`  
y solicitó incorporar estos datos analíticos en el Geovisor de POLIS.

---

## 📂 2. Archivos Locales Descargados e Inspeccionados por `agy`

Para evitar problemas de cuotas o lentitud con Google Drive, `agy` ya descargó y verificó la integridad de los 3 archivos en el directorio local:
`/root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/scratch/`

1. **`Hurto_Motocicletas.zip`** (441 MB zip → `Hurto_Motocicletas/Hurto_Motocicletas.geojson`, 1.41 GB, **2.520 registros**).
2. **`Hurto_Residencias.zip`** (681 MB zip → `Hurto_Residencias/Hurto_Residencias.geojson`, 2.18 GB, **3.853 registros**).
3. **`Hurto_Comerciantes.zip`** (1.03 GB zip → `Hurto_Comerciantes/Hurto_Comerciantes.geojson`, 3.30 GB, **5.907 registros**).  
**Total exacto consolidado:** **12.280 registros** de eventos delictivos de Cartagena entre **2018 y 2026** (desglose mensual, armas/medios, clase de sitio, día de la semana y cantidad).

---

## ⚠️ 3. Alerta Técnica Crítica de Rendimiento y Arquitectura (Auditoría EAF)

- **Causa del sobrepeso (6.88 GB GeoJSON uncompressed):** Cada uno de los 12.280 registros duplica la geometría MultiPolygon completa de alta densidad.
- **Estructura real:** En los tres archivos solo existen **2 polígonos espaciales base**:
  - `ID_POLIG = 1`: **Perímetro Urbano** de Cartagena (`layer: "PERIMETRO_URBANO"`).
  - `ID_POLIG = 2`: **Zona Rural** de Cartagena (`layer: "CARTAGENA"`).
- **Sistema de Coordenadas:** Los datos vienen en **`EPSG:9377`** (MAGNA-SIRGAS Origen Nacional de Colombia, coordenadas métricas tipo `4651297, 2596923`), **NO** en WGS-84 (`EPSG:4326`).
- **DIRECTIVA DE SEGURIDAD Y RENDIMIENTO:** **PROHIBIDO** servir archivos GeoJSON de cientos de MB al navegador o incluir binarios pesados en el árbol de Git. Debe implementarse un pipeline ETL eficiente que extraiga las 2 geometrías base re-proyectadas a WGS84 (`EPSG:4326`) y persista las 12.280 series analíticas en base de datos.

---

## 🛠️ 4. Alcance y Especificación de Implementación

### 4.1. ETL y Persistencia en Base de Datos (Backend)
1. **Respaldo previo:** Ejecutar respaldo antes de aplicar la migración:
   ```bash
   bash scripts/respaldo_bd.sh
   ```
2. **Migración Alembic aditiva:**
   - Crear una tabla estructurada (p. ej. `analitica.estadisticas_hurtos` o en el esquema `geodatos`) con:
     - `id` (UUID o serial PK).
     - `delito` (VARCHAR: `HURTO MOTOCICLETA`, `HURTO RESIDENCIAS`, `HURTO COMERCIO`).
     - `anio` (INTEGER: 2018 a 2026).
     - `mes` (VARCHAR: Enero a Diciembre).
     - `zona` (VARCHAR: `URBANA`, `RURAL`).
     - `poligono_id` (INTEGER: 1 o 2).
     - `armas_medios` (VARCHAR, ej. `ARMA DE FUEGO`, `SIN EMPLEO DE ARMAS`, etc.).
     - `clase_sitio` (VARCHAR, ej. `VIAS PUBLICAS`, `CASAS DE HABITACION`, `LOCAL COMERCIAL`, etc.).
     - `dia_semana` (VARCHAR: `lun.`, `mar.`, etc.).
     - `cantidad` (INTEGER).
   - Crear índices compuestos en `(delito, anio)`, `(anio, mes)`, `(zona)`.
3. **Geometrías Base:**
   - Extraer los 2 polígonos (`ID_POLIG` 1 y 2), transformar de `EPSG:9377` a `EPSG:4326` (WGS-84) mediante PostGIS `ST_Transform(geom, 4326)` o python (`pyproj`/`shapely`), simplificar ligeramente con tolerancia topológica (`ST_SimplifyPreserveTopology`) y almacenarlos en `geodatos.capas_geovisor` o en tabla de geometrías de analítica.
4. **Script de Ingesta:**
   - Crear `backend/scripts/ingestar_hurtos.py` que procese por streaming desde `/root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/scratch/` e inserte los 12.280 registros en lotes (`bulk_insert`).
   - El script debe ser idempotente y verificar el conteo final.
5. **Censo `bd_csh` intacto:** Verificar que las 33 mesas, 36 agendas, 11 fichas y 17 actores continúen intactos.

### 4.2. API REST Backend
1. **Endpoint de Resumen Analítico:**
   - `GET /api/v1/geodatos/analitica/hurtos/resumen`
   - Parámetros query opcionales: `delito`, `anio` (o rango), `zona`.
   - Respuesta:
     - `total_casos`: Total acumulado según filtros.
     - `serie_anual`: Casos por año (2018 a 2026).
     - `serie_mensual`: Distribución mensual para el año seleccionado.
     - `top_armas`: Top 5 modalidades / armas y sus conteos.
     - `top_sitios`: Top 5 clases de sitio y sus conteos.
     - `distribucion_zona`: Conteos y porcentajes Urbana vs Rural.
2. **Endpoint GeoJSON de Capas de Hurtos:**
   - `GET /api/v1/geodatos/analitica/hurtos/geojson`
   - Retorna un `FeatureCollection` ligero (< 150 KB) con los 2 polígonos (Urbano y Rural) en EPSG:4326, adjuntando en `properties` los totales de casos, tasa/densidad y distribución del delito y año consultado.

### 4.3. Visualización en Geovisor (Frontend)
1. **Conexión de Capas e Indicadores:**
   - En `/geovisor` (y `/plataforma/geovisor`), incorporar las nuevas capas temáticas de hurtos:
     - Hurto a Motocicletas.
     - Hurto a Residencias.
     - Hurto a Comercio.
   - Permitir al usuario seleccionar el delito y filtrar por año (2018 a 2026 o total consolidado).
2. **Interactividad en Mapa y Paneles:**
   - El mapa debe colorear los polígonos urbano y rural según la concentración/volumen del delito.
   - Al hacer clic o hover en un polígono, mostrar tooltip / ficha con el resumen de casos, armas principales y sitios.
   - En el panel inferior (dock / charts / KPI bar): conectar las estadísticas del backend para mostrar la serie temporal 2018-2026 real y gráficos de barras o dona con las armas y sitios.

### 4.4. Quality Gates y Despliegue
1. Pruebas backend (pytest) que validen los nuevos endpoints y el servicio de analítica.
2. Pruebas frontend (`bun test`) que validen contratos de API y componentes.
3. Quality gates limpios: `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`).
4. Reconstruir `polis-frontend` si es necesario, reiniciar servicios y verificar HTTP 200 en producción.
5. Reportar en `bridge/02_resultado_agy2.md` con evidencia y esperar dictamen.
