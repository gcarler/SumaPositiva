# INFORME DE RESULTADO: TAREA [GEO-HURTOS-01]
## INGESTA Y VISUALIZACIÓN EN GEOVISOR DE CAPAS ANALÍTICAS DE HURTOS (MOTOCICLETAS, RESIDENCIAS, COMERCIO 2018-2026)

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tarea Reportada:** `[GEO-HURTOS-01] Ingesta y visualización en geovisor de capas analíticas de hurtos (motocicletas, residencias, comercio 2018-2026)`  
**Plan Maestro y Especificación:** `bridge/01_tarea_activa.md` y `bridge/00_plan_maestro_cierre_operativo.md`  

---

## 🎯 1. Resumen Ejecutivo

En estricta atención al requerimiento del propietario y a las especificaciones técnicas y directivas de seguridad de `bridge/01_tarea_activa.md`, se ejecutó y desplegó en producción la solución integral de ingesta, analítica espacial y visualización interactiva para los **12.280 registros de hurtos** (2018–2026) correspondientes a **Cartagena de Indias**:

1. **Respaldo previo de base de datos obligatorio:**
   - Respaldo generado con `scripts/respaldo_bd.sh`: `/root/polis/backups/bd_csh_20261013_161637.dump` (1.2 MB, permisos 0600, SHA-256 verificado).
2. **ETL de Streaming de Alto Rendimiento (Sin sobrepeso en Git ni memoria):**
   - Para procesar los archivos fuente (6.88 GB GeoJSON descomprimidos contenidos en 3 `.zip` en `/root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/scratch/`), se construyó un pipeline ETL streaming en Python (`backend/scripts/ingestar_hurtos.py`).
   - El script extrajo los 2 únicos polígonos base espaciales (`ID_POLIG = 1` Perímetro Urbano e `ID_POLIG = 2` Zona Rural/Insular) desde su proyección métrica original **`EPSG:9377`** (MAGNA-SIRGAS Origen Nacional) y los re-proyectó con precisión geodésica a **`EPSG:4326`** (WGS-84) mediante `pyproj`, simplificando topológicamente sus geometrías.
   - Ingesta exacta de **12.280 registros** consolidados en lotes (`bulk_insert` de 1.000 filas):
     - **Hurto a Motocicletas:** 2.520 registros.
     - **Hurto a Residencias:** 3.853 registros.
     - **Hurto a Comercio:** 5.907 registros.
     - **Total consolidado:** **12.280 registros** (sumando un total de 18.242 eventos/incidentes delictivos).
3. **Migración Alembic Aditiva 0061 (`0061_analitica_hurtos`):**
   - `geodatos.poligonos_analitica_hurtos`: almacena los 2 polígonos re-proyectados con geometrías base y simplificadas e índices espaciales GiST.
   - `geodatos.estadisticas_hurtos`: tabla estructurada analítica con índices compuestos `(delito, anio)`, `(anio, mes)`, `(zona)`, `(poligono_id)` y `(delito, zona, anio)`.
   - `geodatos.capas_geovisor`: registro de las 3 capas temáticas (`HURTO_MOTOCICLETAS`, `HURTO_RESIDENCIAS`, `HURTO_COMERCIO`) con paleta de color diferenciada (`#f97316`, `#8b5cf6`, `#06b6d4`).
4. **API REST Backend de Alto Desempeño:**
   - `GET /api/v1/geodatos/analitica/hurtos/resumen`: Retorna en < 20 ms el resumen analítico estructurado (total de casos, series anuales 2018–2026, distribución mensual, top 5 armas/modalidades, top 5 clases de sitio y desglose urbana/rural).
   - `GET /api/v1/geodatos/analitica/hurtos/geojson`: Retorna un `FeatureCollection` ultraligero de **129.7 KB** (estrictamente inferior al límite de 150 KB fijado por la directiva de arquitectura) conteniendo los 2 polígonos con métricas de concentración delictiva, tasa/densidad por km² y top modalidades asociadas al filtro consultado.
5. **Visualización Interactiva en el Geovisor POLIS:**
   - **Controles de Capas:** Toggles en `GeovisorControles` para Hurto a Motocicletas, Hurto a Residencias y Hurto a Comercio con leyenda temática y selector rápido de año.
   - **Renderizado Dinámico en OpenLayers:** Capa vectorial `capaHurtos` con coloreado por concentración y opacidad según densidad delictiva; tooltip enriquecido en hover con desglose de incidentes, densidad por km², top armas y top sitios.
   - **Tablero Analítico Acoplado (`GeovisorHurtosPanel`):** Integrado en el workspace IDE de 4 paneles dock (`GeovisorWorkspaceLayout`) como pestaña analítica (`hurtos`). Incluye filtros interactivos de delito, periodo/año y zona, 4 tarjetas KPI, gráfico de barras interactivo de la serie histórica 2018–2026, desglose mensual, gráficos horizontales de modalidades/armas y clases de sitio, y botón de acción directa «Ver en Mapa».
6. **Inviolabilidad Estricta de `bd_csh`:**
   - Censo institucional 100% intacto: **33 mesas, 36 agendas, 11 fichas y 17 actores estratégicos**.
7. **Calidad y Verificación Integral:**
   - Pruebas backend (pytest): 4/4 pruebas de analítica de hurtos pasadas; 17/17 pruebas de geodatos pasadas; 31/31 pruebas de cierre pasadas.
   - Pruebas frontend (Bun test): 535 pruebas pasadas (0 fallas) en 62 suites.
   - Quality gates: `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`) superado con 0 errores.
   - Build de producción Next.js compilado exitosamente (192 páginas estáticas/SSG).
   - Servicios de producción `polis-backend` y `polis-frontend` activos con HTTP 200 verificado.

---

## 🛠️ 2. Arquitectura y Componentes Implementados

### 2.1. Base de Datos y Migración Alembic 0061
- **Archivo:** `backend/alembic/versions/0061_analitica_hurtos.py`
- **Tablas creadas en esquema `geodatos`:**
  - `geodatos.poligonos_analitica_hurtos`:
    - `id` (INTEGER, PK: 1=Perímetro Urbano, 2=Cartagena Rural/Insular).
    - `codigo` (VARCHAR(50), UNIQUE).
    - `nombre` (VARCHAR(100)).
    - `zona` (VARCHAR(20): URBANA, RURAL).
    - `geometria` (`geometry(MultiPolygon, 4326)`).
    - `geometria_simplificada` (`geometry(MultiPolygon, 4326)` con tolerancia topológica).
    - `area_km2` (DOUBLE PRECISION: 75.3 km² Urbano, 597.4 km² Rural).
    - `centroide` (`geometry(Point, 4326)`).
    - Índices GiST en `geometria` y `geometria_simplificada`.
  - `geodatos.estadisticas_hurtos`:
    - `id` (`UUID`, PK con `generar_uuid_v7()`).
    - `delito` (`VARCHAR(50)`: `HURTO MOTOCICLETA`, `HURTO RESIDENCIAS`, `HURTO COMERCIO`).
    - `anio` (`INTEGER`: 2018 a 2026).
    - `mes` (`VARCHAR(20)`: Enero a Diciembre).
    - `zona` (`VARCHAR(20)`: URBANA, RURAL).
    - `poligono_id` (`INTEGER` FK hacia `poligonos_analitica_hurtos(id)`).
    - `armas_medios` (`VARCHAR(100)`).
    - `clase_sitio` (`VARCHAR(100)`).
    - `dia_semana` (`VARCHAR(20)`).
    - `cantidad` (`INTEGER` DEFAULT 1).
    - Índices compuestos de cobertura de consulta:
      - `idx_hurtos_delito_anio`
      - `idx_hurtos_anio_mes`
      - `idx_hurtos_zona`
      - `idx_hurtos_poligono_id`
      - `idx_hurtos_delito_zona_anio`
  - Semillas en `geodatos.capas_geovisor`:
    - `HURTO_MOTOCICLETAS` (#f97316)
    - `HURTO_RESIDENCIAS` (#8b5cf6)
    - `HURTO_COMERCIO` (#06b6d4)

### 2.2. Script ETL Streaming (`backend/scripts/ingestar_hurtos.py`)
- **Problema resuelto:** Los 3 archivos GeoJSON descomprimidos sumaban 6.88 GB en disco porque cada una de las 12.280 entidades repetía la geometría MultiPolygon de alta resolución en coordenadas proyectadas métricas `EPSG:9377`.
- **Diseño del streaming:**
  - Procesa directamente los `.zip` fuente (`Hurto_Motocicletas.zip`, `Hurto_Residencias.zip`, `Hurto_Comerciantes.zip`) sin descomprimir gigabytes en disco.
  - Extrae las geometrías de los 2 polígonos base una sola vez y las transforma de `EPSG:9377` a `EPSG:4326` mediante un `pyproj.Transformer(always_xy=True)`.
  - Lee los bloques de propiedades por streaming de buffers con regex / `ijson`, descartando el payload repetitivo de geometría en memoria.
  - Inserta los registros estructurados en lotes de 1.000 filas mediante `session.execute(insert(EstadisticaHurto))` y confirma la transacción de forma atómica.
  - Conteo verificado post-ingesta: **12.280 filas exactas**.

### 2.3. Endpoints REST Backend (`backend/app/modules/geodatos/router.py`)
1. `GET /api/v1/geodatos/analitica/hurtos/resumen`:
   - Parámetros opcionales: `delito` (string con normalización automática de sinónimos), `anio` (entero), `zona` (`URBANA` | `RURAL`).
   - Respuesta estructurada con totales, series anuales, serie mensual, top armas, top sitios y distribución de zona.
2. `GET /api/v1/geodatos/analitica/hurtos/geojson`:
   - Parámetros opcionales: `delito`, `anio`, `zona`.
   - Genera dinámicamente un `FeatureCollection` GeoJSON ligero utilizando `ST_AsGeoJSON(geometria_simplificada)`.
   - Tamaño del payload: **129.7 KB** (cumple con holgura el límite estricto < 150 KB).

### 2.4. Servicios y Tipos Frontend (`src/features/geovisor/services/hurtos-api.ts`)
- Módulo cliente tipado con TypeScript:
  - `obtenerResumenHurtos(filtros?: ParametrosFiltroHurtos): Promise<ResumenHurtosResponse>`
  - `obtenerPoligonosHurtosGeojson(filtros?: ParametrosFiltroHurtos): Promise<HurtosFeatureCollection>`
  - `normalizarDelitoParam(delito?: string | null): string | undefined`
- Re-exportado de forma transparente desde `src/features/geovisor/services/geovisor-api.ts`.
- Pruebas unitarias dedicadas en `src/features/geovisor/services/hurtos-api.test.ts`.

### 2.5. Tablero de Analítica Delictiva (`GeovisorHurtosPanel.tsx`)
- **Ubicación:** `src/features/geovisor/components/geovisor-hurtos-panel.tsx`
- **Características:**
  - Registrado como vista `hurtos` en el catálogo de vistas del Geovisor (`GEOVISOR_VIEW_META` y `GeovisorViewId`).
  - Accesible desde el menú de vistas del Workbench, desde el botón «Tablero» en la barra de capas o desde el tooltip del mapa.
  - Conexión con `@tanstack/react-query` y revalidación reactiva ante cambios en los selectores.
  - Selector de delito con etiquetas y muestras de color oficiales (`#f97316`, `#8b5cf6`, `#06b6d4`).
  - Selector de año (2018 a 2026 o consolidado histórico).
  - Selector de ámbito territorial (Distrito, Urbana, Rural).
  - 4 tarjetas KPI con tokens de diseño semánticos POLIS (`var(--text-primary)`, `var(--danger)`, `var(--ember)`, `var(--success)`).
  - Gráfico interactivo SVG de la serie anual con selección de año por clic en barra.
  - Gráfico interactivo mensual con etiquetas de meses.
  - Barras horizontales proporcionales del Top 5 de modalidades/armas y Top 5 de sitios.
  - Botón de acción rápida «Ver en Mapa» que sincroniza y activa la capa en el lienzo central.

### 2.6. Integración en el Mapa OpenLayers (`use-mapa.ts` y `mapa-cartagena.tsx`)
- Capa vectorial `capaHurtos` (zIndex: 5) conectada a `fuenteHurtos`.
- Carga asíncrona reactiva con cancelación limpia de peticiones obsoletas.
- Estilo temático dinámico: color base según el delito seleccionado, relleno semitransparente con mayor intensidad en la zona urbana según concentración de casos, borde engrosado e inversión en hover.
- Ficha interactiva flotante en hover (`hoverInfo.tipo === "hurto"`): muestra nombre del polígono, delito y año analizado, total de casos, porcentaje distrital, densidad en casos/km², área, modalidad top 1 y clase de sitio top 1, además de enlace directo al tablero analítico.
- Clic en el polígono delictivo abre automáticamente la vista `hurtos` en el dock acoplado.

---

## 🧪 3. Resultados de Pruebas y Certificación de Calidad

### 3.1. Pruebas Backend (Pytest)
```
backend/tests/test_geodatos_analitica_hurtos.py ....                     [100%]
============================== 4 passed in 4.45s ===============================
```
- `test_resumen_hurtos_global`: Valida el resumen acumulado de 18.242 casos, serie anual de 9 años, 12 meses y desglose urbano/rural.
- `test_resumen_hurtos_filtros_delito_y_anio`: Valida consultas con filtros específicos (delito motocicleta 2024, zona rural).
- `test_geojson_hurtos_ligero`: Valida que el GeoJSON contenga exactamente 2 polígonos, pese menos de 150 KB (129.7 KB medidos) y contenga las propiedades analíticas requeridas.
- `test_inviolabilidad_censo_bd_csh`: Valida que las 33 mesas, 36 agendas, 11 fichas y 17 actores continúen estrictamente inalterados en la base de producción `bd_csh`.

Suite completa de Geodatos:
```
backend/tests/test_geodatos_analitica_hurtos.py ....                     [ 23%]
backend/tests/test_geodatos_estandarizacion.py ......                    [ 58%]
backend/tests/test_geodatos_isocronas.py .......                         [100%]
============================== 17 passed in 8.95s ==============================
```

Suite de Regresiones CIERRE:
```
backend/tests/test_cierre01_migracion_asistencia.py ....                 [ 12%]
backend/tests/test_cierre02_herramientas_identidad.py ......             [ 32%]
backend/tests/test_cierre04_seguridad.py ....                            [ 45%]
backend/tests/test_cierre05_csp_report.py .....                          [ 61%]
backend/tests/test_cierre06_mfa_totp.py .....                            [ 77%]
backend/tests/test_cierre07_ambito_territorial.py .......                [100%]
============================= 31 passed in 18.09s ==============================
```

### 3.2. Pruebas Frontend (Bun Test)
```
 535 pass
 0 fail
 2477 expect() calls
Ran 535 tests across 62 files.
```
- `src/features/geovisor/services/hurtos-api.test.ts`: 4/4 pruebas unitarias de API pasadas.
- `src/features/geovisor/components/geovisor-hurtos-panel.test.tsx`: 1/1 prueba de renderizado y contratos de UI pasada.
- `src/features/geovisor/state/geovisor-layout-store.tabs.test.ts`: 8/8 pruebas de layout dock pasadas.
- `src/features/geovisor/views/geovisor-view.test.tsx`: 1/1 prueba de ensamble workspace pasada.

### 3.3. Quality Gates
```bash
$ bun run check
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```
- **POLIS UI Policy:** 0 incumplimientos.
- **TypeScript:** 0 errores de tipado en todo el proyecto.
- **ESLint:** 0 advertencias o errores.

---

## 🔒 4. Certificación de Inviolabilidad del Censo en `bd_csh`

Verificación directa mediante consulta SQL en la base de datos de producción `bd_csh`:
```sql
SELECT 
  (SELECT count(*) FROM mesas_trabajo.mesas) as mesas,
  (SELECT count(*) FROM mesas_trabajo.agendas) as agendas,
  (SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores) as fichas,
  (SELECT count(*) FROM participacion_ciudadana.actores_estrategicos) as actores,
  (SELECT count(*) FROM geodatos.poligonos_analitica_hurtos) as poligonos,
  (SELECT count(*) FROM geodatos.estadisticas_hurtos) as hurtos;
```
**Resultado:**
```
 mesas | agendas | fichas | actores | poligonos | hurtos 
-------+---------+--------+---------+-----------+--------
    33 |      36 |     11 |      17 |         2 |  12280
(1 row)
```
- **Mesas:** 33 (invariable).
- **Agendas:** 36 (invariable).
- **Fichas técnicas:** 11 (invariable).
- **Actores estratégicos:** 17 (invariable).
- **Polígonos base analítica hurtos:** 2 (Perímetro Urbano y Zona Rural e Insular).
- **Registros analíticos de hurtos:** 12.280 (100% de la base consolidada 2018–2026).

---

## 🚀 5. Verificación de Despliegue en Producción

Los servicios del sistema fueron reiniciados y verificados:

| Componente | Servicio / Ruta | Estado | Tamaño / Latencia |
|---|---|---|---|
| Backend Health | `GET /api/v1/health/live` | **HTTP 200 OK** | 37 bytes |
| Backend Resumen Hurtos | `GET /api/v1/geodatos/analitica/hurtos/resumen` | **HTTP 200 OK** | 1.6 KB (< 20 ms) |
| Backend GeoJSON Hurtos | `GET /api/v1/geodatos/analitica/hurtos/geojson` | **HTTP 200 OK** | **129.7 KB** (< 150 KB) |
| Frontend Geovisor Público | `GET /geovisor` | **HTTP 200 OK** | 117 KB |
| Frontend Geovisor Plataforma | `GET /plataforma/geovisor` | **HTTP 200 OK** | 15.5 KB |
| Frontend Portal Home | `GET /` | **HTTP 200 OK** | 160 KB |
| Proxy Nginx | `nginx -t` | **Sintaxis OK / Test exitoso** | — |

---

## 📦 6. Archivos Modificados y Creados

```
Modificados:
  backend/app/modules/geodatos/models.py
  backend/app/modules/geodatos/repository.py
  backend/app/modules/geodatos/router.py
  backend/app/modules/geodatos/schemas.py
  backend/app/modules/geodatos/service.py
  backend/pyproject.toml
  backend/uv.lock
  src/features/geovisor/components/geovisor-controles.tsx
  src/features/geovisor/components/geovisor-view-registry.ts
  src/features/geovisor/components/mapa-cartagena.tsx
  src/features/geovisor/hooks/use-mapa.ts
  src/features/geovisor/services/geovisor-api.ts
  src/features/geovisor/state/geovisor-layout-store.ts
  src/features/geovisor/views/geovisor-view.tsx

Nuevos:
  backend/alembic/versions/0061_analitica_hurtos.py
  backend/scripts/ingestar_hurtos.py
  backend/tests/test_geodatos_analitica_hurtos.py
  src/features/geovisor/components/geovisor-hurtos-panel.tsx
  src/features/geovisor/components/geovisor-hurtos-panel.test.tsx
  src/features/geovisor/services/hurtos-api.ts
  src/features/geovisor/services/hurtos-api.test.ts
```

---

## 🛡️ 7. Subsanación de Reservas Dictamen EAF (R1 y R2)

En atención al dictamen emitido por el Auditor EAF (`agy`) en `bridge/03_dictamen_revision.md`, se ejecutó y certificó la subsanación estricta de las dos reservas obligatorias:

### 7.1. Subsanación R1: Guarda de Política de Acceso (`tests/test_access_policy.py`)
- **Problema:** Los endpoints `GET /api/v1/geodatos/analitica/hurtos/resumen` y `GET /api/v1/geodatos/analitica/hurtos/geojson` no estaban registrados en la matriz `docs/permisos-api.md`, provocando que `test_matriz_cubre_todas_las_rutas_y_sus_controles` fallara.
- **Acción:**
  - Se registraron formalmente ambos endpoints en `docs/permisos-api.md` con control **`publico`**.
  - **Motivo documentado:** Los datos provienen del catálogo abierto de criminalidad (2018–2026) y son consultados por el Geovisor público (`/geovisor`) para transparencia ciudadana sin requerir autenticación previa, en plena concordancia con el resto de las rutas de consulta territorial y capas de `/api/v1/geodatos/*`.
  - **Verificación:** `backend/tests/test_access_policy.py` ejecutado: **100/100 pruebas PASADAS** en 25.19s (en verde).

### 7.2. Subsanación R2: Normalización de Texto Corrupto (`\uFFFD`)
- **Respaldo previo de base de datos obligatorio:**
  - Ejecutado con `scripts/respaldo_bd.sh`:
  - Archivo: `/root/polis/backups/bd_csh_20261013_170430.dump` (2.1 MB, permisos `0600`).
  - Hash SHA-256: `598c53a4606e8f60f6477c42736b02db9f54fd73c44130aa919d75406e5bf478`.
- **Inspección forense de caracteres corruptos en `geodatos.estadisticas_hurtos`:**
  - `clase_sitio`: 319 filas afectadas identificadas (`CALLEJÓN` 290, `CABAÑA` 9, `CAÑOS` 5, `TRANSPORTE PÚBLICO` 4, `CENTRO TURÍSTICO` 4, `ZONA SELVÁTICA` 4, `SEMÁFORO` 3).
  - `dia_semana`: 3.573 filas afectadas (`sáb.` 1.805, `mié.` 1.768).
  - `armas_medios`, `delito`, `mes`, `zona`: 0 filas corruptas (inspección 100% limpia).
- **Normalización SQL aditiva ejecutada exclusivamente sobre la tabla nueva:**
  - Se ejecutó un `UPDATE` controlado y transaccional (`BEGIN ... COMMIT`) normalizando `clase_sitio` (319 filas actualizadas) y `dia_semana` (3.573 filas actualizadas).
  - Verificación posterior: `SELECT count(*) FROM geodatos.estadisticas_hurtos WHERE clase_sitio ~ '\uFFFD' OR dia_semana ~ '\uFFFD';` → **0 registros corruptos**.
- **Actualización en pipeline de ingesta (`backend/scripts/ingestar_hurtos.py`):**
  - Se consolidó el diccionario explícito `REEMPLAZOS_TEXTO` en `ingestar_hurtos.py` para garantizar que futuras ejecuciones o ingestas de lotes limpien automáticamente todos los caracteres de reemplazo identificados.

### 7.3. Certificación de la Suite Backend Pytest COMPLETA
Se ejecutó la suite íntegra de pruebas de backend (`backend/.venv/bin/pytest backend/tests/ -v`):
```
======================= 527 passed in 337.84s (0:05:37) ========================
```
- **Total de pruebas ejecutadas:** 527 pruebas.
- **Resultado:** **527 PASADAS, 0 FALLIDAS (100% éxito)**.
- Cubre: seguridad, políticas de acceso, transacciones, geodatos, IA, presupuestos, identidades, testimonios, noticias, asistencias y mesas de trabajo.

### 7.4. Verificación de Inviolabilidad del Censo en `bd_csh`
```
   tabla   | count 
-----------+-------
 mesas     |    33
 agendas   |    36
 fichas    |    11
 actores   |    17
 hurtos    | 12280
 poligonos |     2
```
Censo institucional rigurosamente intacto.

---

## ✅ 8. Conclusión y Solicitud de Dictamen Final

Las reservas **R1** y **R2** del dictamen EAF han sido subsanadas satisfactoriamente, verificadas con respaldo previo, certificadas con la suite de 527 pruebas de backend en verde y servicios de producción en plena operatividad.

Quedo a la espera del dictamen definitivo de `agy`.
