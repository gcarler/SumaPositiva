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


---

# INFORME DE ENTREGA: [A11Y-WIDGET-01b] BARRA LATERAL DE ACCESIBILIDAD ESTILO FUNCIÓN PÚBLICA / GOV.CO

**Responsable:** `agy2` — **Auditor:** `agy` — **Fecha:** 13-oct-2026  
**Referencia de diseño:** Widget institucional de Función Pública (`https://www.funcionpublica.gov.co/web/mipg/resultados-medicion`)

---

## 📋 1. Resumen de la Implementación

Se ha diseñado, implementado, verificado y desplegado en producción la **barra vertical lateral de accesibilidad fija** adosada al borde derecho de la pantalla para todo el portal ciudadano público de POLIS (`/`, `/barrio`, `/f`, `/asistencia`), cumpliendo punto a punto con la especificación de Función Pública / GOV.CO y las directrices WCAG 2.1 AA / AAA.

### 1.1. Arquitectura y Contenedor (`<nav aria-label="Menú de accesibilidad">`)
- **Posición fija y geometría:** `position: fixed; top: 50%; right: 0; transform: translateY(-50%); width: 52px; border-radius: 12px 0 0 12px; padding: 6px 0;` con elevación `shadow-raised` y z-index controlado (`z-40`).
- **Comportamiento en `/geovisor`:** Para no interferir con los paneles laterales acoplados del mapa de pantalla completa, en `/geovisor` se renderiza de forma predeterminada una **pestaña mínima compacta** (`w-7 h-14` con ícono de accesibilidad). Al pulsarla, se expande la barra lateral completa con un botón de colapso superior (`ChevronRight`) que permite volver a minimizarla en cualquier momento. En el resto de rutas públicas se muestra la barra lateral completa en reposo.

### 1.2. Botones con Expansión Lateral (`:hover` / `:focus-within`)
- Cada ítem mide `52px × 48px` en reposo y aloja un botón anclado a la derecha (`right: 0`).
- **Pastilla de ícono:** Recuadro contrastado de `26px × 26px` con bordes redondeados `6px`, centrado perfectamente en los 52px en reposo.
- **Etiqueta textual:** `<span>` posicionado a la derecha de la pastilla con `white-space: nowrap; opacity: 0; transition: opacity 0.2s`.
- **Expansión suave hacia la izquierda:** Al pasar el cursor o recibir foco de teclado (`:hover`, `:focus-within`, `:focus-visible`), el botón se expande hacia la izquierda hasta `196px` (`transition: width 0.25s ease`), revelando la etiqueta con `opacity: 1`.
- **Reducción de movimiento:** Si el usuario tiene activa la preferencia de movimiento reducido (`prefers-reduced-motion` o `data-a11y-reduced-motion="true"`), la expansión es instantánea sin animación (`duration: 0.001ms`).

### 1.3. Acciones Directas en la Barra (un clic, sin modal bloqueante)
1. **Contraste directo (`aria-pressed`):** Alterna inmediatamente entre modo normal y **Alto Contraste AAA** (`[data-a11y-contrast="alto"]`), actualizando la pastilla y emitiendo anuncio audible.
2. **Aumentar tamaño (`A+`):** Sube un paso la escala de texto (`100% → 125% → 150% → 200%`). Muestra el porcentaje actual dinámicamente en la etiqueta (`Aumentar (125%)`). Se deshabilita al alcanzar `200%`.
3. **Reducir tamaño (`A−`):** Disminuye un paso la escala de texto (`200% → 150% → 125% → 100%`). Se deshabilita al alcanzar `100%`.
4. **Restablecer:** Restaura todas las preferencias de accesibilidad a sus valores por defecto en un solo clic.
5. **Más opciones (`aria-expanded`):** Despliega a la izquierda de la barra el subpanel flotante desacoplado con controles adicionales. Manejo completo de teclado: la tecla `Escape` o clic externo cierran el subpanel y devuelven el foco al botón disparador.
6. **Centro de Relevo / Signos en Red:** Enlace externo oficial a `https://centroderelevo.gov.co/` (`target="_blank" rel="noopener noreferrer"`) con ícono de comunicación y advertencia accesible de apertura en pestaña nueva.

### 1.4. Subpanel de Más Opciones
- **Tamaño de texto:** Selector directo de 4 pasos (100%, 125%, 150%, 200%).
- **Color y Tema:** Selector Modo claro / Modo oscuro integrado con `next-themes` + alternador de **Escala de grises** (`data-a11y-grayscale="true"`).
- **Lectura y Movimiento:** Interlineado amplio (`line-height: 1.8`), Espaciado de letras (`letter-spacing: 0.12em`), Subrayar enlaces (`text-decoration: underline`), y Reducir movimiento.
- **Botón Restablecer todo.**

---

## 🎨 2. Tokens Semánticos y Cumplimiento de Guardas POLIS

- **Guardas UI001 a UI006 (`scripts/ui-policy.mjs`):**
  - `UI001` / `UI002`: Componentes de biblioteca importados exclusivamente desde `@/shared/ui/`.
  - `UI003`: Cero colores hexadecimales o arbitrarios en el TSX. Se utilizan exclusivamente variables semánticas (`var(--surface-1)`, `var(--text-primary)`, `var(--ember)`, `var(--border-strong)`).
  - `UI004`: `src/shared/ui/` no importa desde `src/features/`.
  - `UI005` (Zero-Modals): No se utilizan modales bloqueantes (`<dialog>`, `AlertDialog`). El subpanel es una región flotante no invasiva accesible por teclado (`role="region"`).
  - `UI006`: Componente registrado formalmente en `src/shared/design-system/catalog.ts` con su historia correspondiente en Storybook (`a11y: { test: "error" }`).
- **Tokens de Alto Contraste AAA en `tokens.css`:**
  - Modo claro: fondo blanco puro `oklch(1 0 0)`, texto negro absoluto `oklch(0 0 0)` (ratio 21:1 AAA), bordes `oklch(0 0 0 / 60%)`.
  - Modo oscuro: fondo negro puro `oklch(0 0 0)`, texto blanco absoluto `oklch(1 0 0)` (ratio 21:1 AAA), bordes `oklch(1 0 0 / 70%)`.
- **Responsive (320px y 375px):**
  - Posicionamiento `fixed` al margen derecho no incrementa el ancho de layout.
  - Subpanel ajustado con `w-[min(20rem,calc(100vw-4.5rem))]` garantizando matemáticamente cero scroll horizontal (`scrollWidth <= innerWidth`).

---

## 🧪 3. Resultados de Pruebas y Certificación de Calidad

### 3.1. Pruebas Unitarias del Feature y Store (`bun test`)
```
bun test v1.4.2

src/features/accesibilidad/accesibilidad-store.test.ts:
✓ AccesibilidadStore > proporciona valores iniciales seguros por defecto [0.34ms]
✓ AccesibilidadStore > persiste los cambios en localStorage con clave versionada [0.39ms]
✓ AccesibilidadStore > aumenta y disminuye el tamaño de texto dentro del rango seguro [100, 200] [0.21ms]
✓ AccesibilidadStore > recupera valores por defecto ante datos corruptos o inválidos [0.26ms]
✓ AccesibilidadStore > resetAll restablece todas las configuraciones a sus valores canónicos [0.34ms]
✓ AccesibilidadStore > respeta las preferencias del sistema (prefers-contrast / prefers-reduced-motion) [0.29ms]
✓ AccesibilidadStore > emite anuncios en aria-live tras cada cambio para lectores de pantalla [0.15ms]

src/features/accesibilidad/accesibilidad-widget.test.tsx:
✓ AccesibilidadWidget UI > renderiza la barra lateral adosada al borde derecho con <nav aria-label='Menú de accesibilidad'> [18.05ms]
✓ AccesibilidadWidget UI > renderiza las acciones directas de la barra con expansión lateral al hover/focus [2.04ms]
✓ AccesibilidadWidget UI > en modo alto contraste, el botón de contraste refleja aria-pressed='true' y etiqueta de desactivación [1.65ms]
✓ AccesibilidadWidget UI > al 200% de tamaño de texto, el botón A+ queda deshabilitado y A− habilitado [1.40ms]
✓ AccesibilidadWidget UI > cuando isOpen es true, despliega el subpanel de Más Opciones a la izquierda con todos sus controles [6.80ms]
✓ AccesibilidadWidget UI > en geovisor con isCollapsed=true renderiza únicamente la pestaña mínima compacta para no obstruir paneles [1.81ms]

 13 pass, 0 fail, 82 expect() calls (231ms)
```

### 3.2. Chequeo de Políticas de Diseño y Linter (`bun run check`)
```
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit (0 errores)
$ eslint . (0 errores)
```

### 3.3. Compilación de Producción (`bun run build`)
- Next.js 16.3.8 (Turbopack) compiló las 192 rutas estáticas y SSG limpiamente.
- Servicio `polis-frontend.service` reiniciado y verificado activo.
- Respuestas HTTP 200 confirmadas en `/` y `/geovisor` conteniendo el menú accesible en el HTML renderizado.

### 3.4. Auditoría Playwright E2E y Axe-Core (`test_a11y_e2e.mjs`)
Ejecutado sobre Chromium headless:
```
1. Navegando a http://127.0.0.1:3000/ ...
2. Verificando barra lateral fija: width=52px -> ✓ Aprobado
3. Verificando expansión al hover: width=196px -> ✓ Aprobado
4. Probando activación de Alto Contraste AAA: data-a11y-contrast="alto", aria-pressed="true" -> ✓ Aprobado
5. Probando aumento de texto (A+): data-a11y-text-size="125" -> ✓ Aprobado
6. Verificando enlace a Centro de Relevo: target=_blank, href oficial -> ✓ Aprobado
7. Probando despliegue de subpanel Más Opciones: panel visible a la izquierda -> ✓ Aprobado
8. Probando cierre con teclado Escape: cierra y devuelve foco -> ✓ Aprobado
9. Verificando persistencia en localStorage tras recarga: clave polis_a11y_v1 intacta -> ✓ Aprobado
10. Probando botón Restablecer: atributos restaurados -> ✓ Aprobado
11. Auditoría axe-core en modo normal: 0 violaciones de contraste -> ✓ Aprobado
12. Auditoría axe-core en Alto Contraste: 0 violaciones de contraste -> ✓ Aprobado
13. Responsive (375px y 320px): scrollWidth > innerWidth = false -> ✓ Aprobado
14. Geovisor: pestaña mínima inicial visible, despliegue y colapso funcional -> ✓ Aprobado

=== RESUMEN DE EJECUCIÓN ===
Pasos aprobados: 14 / 14 (100%)
Auditorías Axe aprobadas: 2 / 2 (0 violaciones)
```

---

## 📸 4. Evidencia Visual (Capturas de Pantalla)

Guardadas en `/root/.gemini/antigravity-cli/brain/ab05e85a-5868-48f3-9e1b-3bf75b7bedb1/`:
1. `a11y-sidebar-desktop-hover.png`: Barra lateral fija con botón expandido a 196px al hover.
2. `a11y-sidebar-alto-contraste.png`: Vista completa en modo Alto Contraste AAA (21:1).
3. `a11y-subpanel-mas-opciones.png`: Subpanel de Más Opciones desplegado a la izquierda de la barra.
4. `a11y-geovisor-tab.png`: Pestaña mínima compacta acoplada al borde derecho en `/geovisor`.
5. `a11y-mobile-375px.png`: Barra lateral visible en viewport móvil de 375px sin desbordamiento.

---

## 🔒 5. Verificación de Inviolabilidad del Censo en `bd_csh`

Verificación directa mediante consulta SQL en la base de datos de producción `bd_csh`:
```sql
SELECT 
  (SELECT count(*) FROM mesas_trabajo.mesas) as mesas, 
  (SELECT count(*) FROM mesas_trabajo.agendas) as agendas, 
  (SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores) as fichas, 
  (SELECT count(*) FROM participacion_ciudadana.actores_estrategicos) as actores;
```
**Resultado:**
```
 mesas | agendas | fichas | actores 
-------+---------+--------+---------
    33 |      36 |     11 |      17
```
Censo institucional rigurosamente intacto.

---

## 📦 6. Archivos Modificados y Creados por `agy2`

- `src/shared/design-system/tokens.css`: Definición de tokens de alto contraste WCAG AAA.
- `src/shared/design-system/styles.css`: Modificadores raíz (`data-a11y-*`), escalas de fuente y resets.
- `src/shared/design-system/catalog.ts`: Registro del componente en el catálogo de UI.
- `src/shared/ui/accesibilidad-widget.tsx`: Componente presentacional con barra lateral Función Pública y subpanel.
- `src/shared/ui/accesibilidad-widget.stories.tsx`: Historias de Storybook con escenarios y auditoría axe.
- `src/features/accesibilidad/accesibilidad-store.ts`: Store Zustand con persistencia y detección de sistema.
- `src/features/accesibilidad/accesibilidad-store.test.ts`: Pruebas unitarias de lógica y almacenamiento.
- `src/features/accesibilidad/accesibilidad-widget.tsx`: Contenedor conectado al store y detector de geovisor.
- `src/features/accesibilidad/accesibilidad-widget.test.tsx`: Pruebas unitarias de renderizado y eventos.
- `src/features/accesibilidad/index.ts`: Export público del módulo.
- `src/app/layout.tsx`: Montaje global en layout público dentro de `ThemeProvider`.
- `bridge/02_resultado_agy2.md`: Este reporte de entrega.

*(Se respetó estrictamente la zona de trabajo de `freebuff`: ningún archivo de historias internas, plataforma ni banners fue modificado ni staged).*


---

# INFORME DE ENTREGA: [UI-REMED-01] CULMINACIÓN DE REMEDIACIÓN UI/STORYBOOK (F1–F4) + AJUSTE O1 ACCESIBILIDAD

**Responsable:** `agy2` — **Auditor:** `agy` — **Fecha:** 13-oct-2026  
**Documentos base:** `Revision_ui_13102026.md` (§5, §8 y §9), `docs/plan-remediacion-ui-13102026.md` y Dictamen EAF `bridge/03_dictamen_revision.md` (Observación O1)

---

## 📋 1. Resumen Ejecutivo de la Intervención

Se retomó, revisó, completó y certificó el trabajo de remediación UI y Storybook iniciado por `freebuff` en el árbol de trabajo (hallazgos **F1 a F4**), se subsanó la observación cosmética **O1** sobre la barra lateral de accesibilidad (`src/shared/ui/accesibilidad-widget.tsx`) y se aisló el ciclo de vida de los mocks de `window`/`document` en `src/features/accesibilidad/accesibilidad-store.test.ts` para dejar tanto `bun run ui:test` (**212/212**) como `bun test` (**547/547**) y `bun run check` (**0 errores**) al **100 % en verde**.

---

## 🛠️ 2. Detalle Técnico por Hallazgo (F1–F4 + O1)

### 2.1. F1 — Contraste WCAG 1.4.3 (`color-contrast`) en pestañas de héroes
- **Archivo:** `src/features/plataforma/components/gestor-heros-plataforma.tsx:264`
- **Cambio:** Se sustituyó `opacity-75` por el token semántico `text-[var(--text-secondary)]` en el `<span className="font-mono text-[10px] text-[var(--text-secondary)] truncate">{espacio.ruta}</span>` de las 7 pestañas (`role="tab"`).
- **Verificación:** La historia `plataforma-interna › Configuracion` supera la auditoría `axe-core` con 0 violaciones de contraste en tema claro y oscuro.

### 2.2. F2 — Aserciones asíncronas y aislamiento de mocks en `plataforma-interna.stories.tsx`
- **Archivo:** `src/app/_stories/plataforma-interna.stories.tsx`
- **Cambios:**
  - En `Testimonios` y `TestimoniosOscuro`: uso de `await c.findByRole("heading", { name: "Gestión y Moderación de Testimonios" })`, `await c.findByRole("region", { name: "Cola de moderación de testimonios" })` y `await c.findByText(...)`.
  - En `Usuarios`: mock de `identidadApi` con 8 cuentas institucionales de demo (`cuentasBase`, incluyendo a `Ana Pérez`), métodos `crearUsuario`, `editarUsuario`, `roles` y `ambitosUsuario: fn(async () => [])`, restaurando `cuentasActuales = structuredClone(cuentasBase)` en el cleanup del `beforeEach`.
  - Se alinearon las aserciones de la función `play` con los textos reales de `UsuarioDetallePanel` (`"Detalles de la cuenta"` y botón `"Editar rol y datos"` que abre el panel `"Editar usuario"`).
- **Verificación:** Las historias `Usuarios`, `Testimonios` y `Testimonios Oscuro` pasan de forma determinista y sin fugas de estado entre corridas.

### 2.3. F3 — Eliminación de landmark `banner` duplicado/anidado en héroes embebidos
- **Archivos:** `src/features/politicas/components/hero-page-banner.tsx` y `src/features/politicas/components/hero-page-banner.test.tsx`
- **Cambios:**
  - Se reemplazó `<header role="banner" aria-label={titulo}>` por `<section aria-label={titulo}>` para que el documento conserve un único landmark `banner` de nivel superior (el del shell de la plataforma).
  - Se actualizó la prueba unitaria `hero-page-banner.test.tsx` para verificar que renderice `<section` con `aria-label` y no emita `role="banner"`.
- **Verificación:** Las historias `platform › Explorar`, `› Sin Resultados` y `› Mesas` pasan con 0 violaciones de `landmark-banner-is-top-level` y `landmark-no-duplicate-banner`.

### 2.4. F4 — Mock determinista de `POST /api/v1/mesas` en Storybook
- **Archivo:** `src/app/_stories/platform.stories.tsx`
- **Cambios:**
  - Se añadió soporte para `POST /api/v1/mesas` en el mock de `window.fetch` del `meta` y en el `beforeEach` específico de `CrearMesaCompleta`, devolviendo HTTP `201` con eco del cuerpo e `id` generado (`mesa-demo-...`) conforme a la regla 8 del kit UI (las historias no escriben en servicios reales), sin modificar `mesa-editor-panel.tsx`.
  - Se completaron en `play` los campos requeridos del formulario (incluyendo fecha con `fireEvent.change` y coordenadas válidas dentro de Cartagena `10.4`, `-75.6`) y se verificó la inserción de `"Mesa de convivencia barrial"` en `useMesasStore` y la apertura del diálogo de detalle.
- **Verificación:** La historia `platform › Crear Mesa Completa` pasa en verde en Chromium headless.

### 2.5. O1 — Subsanación de solapamiento de barra lateral con subpanel «Más opciones» abierto
- **Archivos:** `src/shared/ui/accesibilidad-widget.tsx` y `src/features/accesibilidad/accesibilidad-widget.test.tsx`
- **Cambios:**
  - Se condicionaron las clases de expansión horizontal (`hover:w-[196px] focus-within:w-[196px] focus-visible:w-[196px]`) y de opacidad de etiqueta a `!isOpen`, de modo que mientras el subpanel `#panel-mas-opciones-a11y` permanece abierto, los botones de la barra lateral se mantienen en `52px` sin invadir el borde derecho del subpanel.
  - Se estableció jerarquía explícita de apilamiento: `z-20` en `#panel-mas-opciones-a11y` frente a `z-10` en `<nav aria-label="Menú de accesibilidad">`.
  - Se añadieron aserciones unitarias en `accesibilidad-widget.test.tsx` y se regeneró la captura `a11y-subpanel-mas-opciones.png` con Playwright E2E confirmando visualmente la ausencia total de solapamiento.
- **Aislamiento adicional en `src/features/accesibilidad/accesibilidad-store.test.ts`:**
  - Se encapsuló la inyección de `globalThis.window` y `globalThis.document` dentro de `beforeEach` y su limpieza en `afterEach`, garantizando que las 63 suites de `bun test` se ejecuten en un mismo proceso sin contaminar la detección SSR (`typeof window === "undefined"`) de otras pruebas.

---

## 🧪 3. Certificación de Calidad (Antes vs. Después)

Se documentó la sección `§9. Resultados de la remediación ejecutada — antes/después` en `Revision_ui_13102026.md`:

| Verificación / Comando | Antes | Después |
|---|---|---|
| **`bun run ui:test`** (Storybook + `axe-core` Chromium) | ❌ 198 / 206 (8 fallos) | ✅ **212 / 212 pasadas** (17 archivos, **0 fallos**, 30.22 s) |
| **`bun test`** (Unitarios frontend completos) | — | ✅ **547 / 547 pasadas** (63 archivos, 2.548 `expect()`, **0 fallos**, 7.00 s) |
| **`bun run check`** (`ui:check` + `tsc --noEmit` + `eslint .`) | ✅ 0 errores | ✅ **0 errores** |
| **`bun run ui:policy:test`** (`scripts/ui-policy.test.mjs`) | ✅ 8 / 8 | ✅ **8 / 8 pasadas** |
| **`bun run build`** (Next.js 16.3.8 Turbopack) | ✅ Exitoso | ✅ **192 / 192 rutas compiladas** |
| **Playwright E2E Accesibilidad (`test_a11y_e2e.mjs`)** | ✅ 14 / 14 | ✅ **14 / 14 pasos + 2 / 2 auditorías axe (0 violaciones)** |

---

## 🚀 4. Despliegue y Censo Institucional `bd_csh`

- **Servicio `polis-frontend`:** Reiniciado (`systemctl restart polis-frontend`), estado `active (running)`.
- **Verificación HTTP:**
  - `GET http://127.0.0.1:3000/` → `HTTP/1.1 200 OK`
  - `GET http://127.0.0.1:3000/geovisor` → `HTTP/1.1 200 OK`
- **Inviolabilidad del Censo en `bd_csh`:**
  ```
   mesas | agendas | fichas | actores 
  -------+---------+--------+---------
      33 |      36 |     11 |      17
  ```
  Censo institucional rigurosamente intacto.


---

# INFORME DE ENTREGA: [A11Y-WIDGET-01c] RETIRO DEL BOTÓN «CENTRO DE RELEVO» DE LA BARRA LATERAL DE ACCESIBILIDAD

**Responsable:** `agy2` — **Auditor:** `agy` — **Fecha:** 13-oct-2026  
**Tarea de referencia:** `bridge/01_tarea_activa.md` (`[A11Y-WIDGET-01c]`)

---

## 📋 1. Resumen de la Solicitud y Alcance

A solicitud del propietario del producto, se procedió a retirar de la barra lateral vertical de accesibilidad (`src/shared/ui/accesibilidad-widget.tsx`) el 6.º botón correspondiente al enlace externo *"Centro de Relevo / Signos en Red"* (`https://centroderelevo.gov.co/`), debido a que no cargaba contenido en el entorno de despliegue.

La barra de accesibilidad conserva ahora de forma limpia y exclusiva los **5 botones esenciales**:
1. **Contraste:** Alternancia directa a Modo Alto Contraste AAA (ratio 21:1).
2. **Aumentar (`A+`):** Incremento del tamaño de fuente en pasos del 10 % (hasta 150 %).
3. **Reducir (`A−`):** Reducción del tamaño de fuente (hasta 90 %).
4. **Restablecer:** Retorno inmediato a la configuración tipográfica y de contraste predeterminada.
5. **Más opciones:** Apertura/cierre del subpanel flotante con controles avanzados (escala de grises, interlineado, espaciado entre letras, subrayado de enlaces, reducción de movimiento).

---

## 🛠️ 2. Modificaciones Realizadas

### 2.1. Componente de UI (`src/shared/ui/accesibilidad-widget.tsx`)
- Se removieron los iconos no utilizados `Volume2` y `ExternalLink` de los imports de `lucide-react`.
- Se eliminó el sexto elemento `<li>` del `<nav aria-label="Menú de accesibilidad">` que contenía el enlace externo hacia `https://centroderelevo.gov.co/`.
- La lista de controles ahora contiene exactamente 5 elementos `<li>`, manteniendo el diseño de 52px de ancho, expansión en hover/focus-within hacia la izquierda, tokens semánticos del design system y aria attributes completos.

### 2.2. Pruebas Unitarias (`src/features/accesibilidad/accesibilidad-widget.test.tsx`)
- Se actualizó el paso 6 de la suite para verificar explícitamente la ausencia del enlace y del texto institucional:
  - `expect(html).not.toContain("Centro de Relevo")`
  - `expect(html).not.toContain("centroderelevo.gov.co")`
- Se verificó que todas las 13 pruebas de la suite de accesibilidad pasen exitosamente.

### 2.3. Historias de Storybook (`src/shared/ui/accesibilidad-widget.stories.tsx`)
- Se actualizó la descripción del componente en el `meta` de Storybook indicando el retiro del enlace en `[A11Y-WIDGET-01c]`.
- Se actualizó la función `play` de la historia `BarraLateral`:
  - `await expect(canvas.queryByRole("link", { name: /centro de relevo/i })).toBeNull()`
- Las historias de Storybook pasaron todas las aserciones y auditorías axe sin fallos.

---

## 🧪 3. Certificación de Calidad y Resultados

| Verificación / Comando | Resultado | Detalle |
|---|---|---|
| **`bun test src/features/accesibilidad`** | ✅ **13 / 13 pasadas** | Pruebas unitarias de renderizado y eventos de la barra lateral |
| **`bunx vitest run --project=storybook src/shared/ui/accesibilidad-widget.stories.tsx`** | ✅ **6 / 6 pasadas** | Historias de Storybook y auditoría de accesibilidad |
| **`bun run check`** (`ui:check` + `tsc --noEmit` + `eslint .`) | ✅ **0 errores** | Validación estricta de UI tokens, tipado TypeScript y linter |
| **`bun run build`** (Next.js 16.3.8 Turbopack) | ✅ **192 / 192 rutas** | Compilación de producción exitosa en standalone |
| **E2E Playwright + axe-core (`test_a11y_e2e.mjs`)** | ✅ **14 / 14 pasos + 2/2 axe** | Confirmación en navegador real de retiro de botón y 0 violaciones WCAG |

---

## 🚀 4. Despliegue y Estado del Servicio

- **Servicio `polis-frontend`:** Reiniciado (`systemctl restart polis-frontend`), estado `active (running)`.
- **Verificación HTTP:**
  - `GET http://127.0.0.1:3000/` → `HTTP 200 OK`
  - `GET http://127.0.0.1:3000/geovisor` → `HTTP 200 OK`
- **Inviolabilidad del Censo en `bd_csh`:**
  ```
   mesas | agendas | fichas | actores 
  -------+---------+--------+---------
      33 |      36 |     11 |      17
  ```
  Invariante intacto (33 mesas, 36 agendas, 11 fichas técnicas, 17 actores estratégicos).

---

## 📦 5. Archivos Modificados en la Tarea

- `src/shared/ui/accesibilidad-widget.tsx`
- `src/shared/ui/accesibilidad-widget.stories.tsx`
- `src/features/accesibilidad/accesibilidad-widget.test.tsx`
- `bridge/02_resultado_agy2.md`


---

# INFORME DE ENTREGA: [MESA-UBIC-02] SIMPLIFICACIÓN DE COORDENADAS Y CORRECCIÓN DE VALIDACIÓN AL USAR ENLACES DE GOOGLE MAPS

**Responsable:** `agy2` — **Auditor:** `agy` — **Fecha:** 13-oct-2026  
**Tarea de referencia:** `bridge/01_tarea_activa.md` (`[MESA-UBIC-02]`)

---

## 📋 1. Resumen Ejecutivo y Diagnóstico

### Problema resuelto:
Al pegar un enlace de Google Maps en el editor de mesa de trabajo (`MesaEditorPanel`), el formulario requería obligatoriamente los campos *"Latitud individual"* y *"Longitud individual"*. Esto sucedía porque React Hook Form registraba dos inputs independientes (`coordenadas.lat` y `coordenadas.lng`), construyendo el objeto `{ coordenadas: { lat: undefined, lng: undefined } }` ante valores vacíos. Al evaluar el esquema Zod, el objeto resultaba no nulo con atributos `undefined`, bloqueando el guardado con errores espurios de campos requeridos. Adicionalmente, existía duplicación redundante de controles entre el campo combinado y los dos campos separados.

### Solución implementada:
1. **Unificación de controles UI:** Se eliminaron los dos campos separados (`Latitud individual` y `Longitud individual`). Se consolidó un único campo `#mesa-coords-planas` etiquetado como `"3. Coordenadas (Latitud, Longitud)"` con descripción instructiva clara, validación en línea de formato y botón de acción directa *"Limpiar coordenadas"*.
2. **Blindaje de esquema y sincronización RHF:** Se envolvió el campo `coordenadas` con `z.preprocess` en `mesaSchema`, convirtiendo automáticamente cualquier valor `null`, `undefined` o con `lat`/`lng` no finitos en `undefined`. Se eliminaron `watchLat`, `watchLng` y `setValue("coordenadas.lat/lng")`, dejando `coordenadas` verdaderamente opcional.
3. **Ampliación del parser de coordenadas:** Soporte para secuencias codificadas (`decodeURIComponent`, ej. `%2C`), rutas directas de Google Maps (`/maps/place/lat,lng`, `/maps/search/lat,lng`, `/maps/dir/lat,lng`), parámetros ampliados (`center`, `viewpoint`, `daddr`, `saddr`), formato sexagesimal DMS (`10°24'00.0"N 75°30'00.0"W`) y detección inteligente cruzada si el usuario pega una URL directamente en el campo de texto de coordenadas.
4. **Actualización de Historias y Pruebas:** Se alineó la historia `CrearMesaCompleta` en `src/app/_stories/platform.stories.tsx` con el campo unificado, se añadieron pruebas unitarias en `src/features/mesas/panels/mesa-editor-panel.test.tsx` y se expandió la suite `src/features/mesas/lib/coordenadas-parser.test.ts`.

---

## 🛠️ 2. Detalle de Archivos Intervenidos

### 2.1. `src/features/mesas/panels/mesa-editor-panel.tsx`
- **Esquema `mesaSchema`:** Inclusión de `z.preprocess` para limpiar objetos con valores `NaN` o `undefined` antes de validar el esquema opcional de latitud [-90..90] y longitud [-180..180].
- **Hooks y Handlers:** Eliminación de `watchLat` y `watchLng`. Reducción de `fijarCoordenadas` a `setValue("coordenadas", coords ?? undefined)`.
- **JSX:** Supresión de `<FormField id="mesa-lat">` y `<FormField id="mesa-lng">`. Campo unificado `#mesa-coords-planas` a ancho completo (`col-span-full`) con botón *"Limpiar"* y mensajes de validación contextuales.

### 2.2. `src/features/mesas/lib/coordenadas-parser.ts`
- Implementación de `parsearCoordenadasDMS` para grados, minutos y segundos WGS84.
- `parsearCoordenadasUrl`: Incorporación de `decodeURIComponent` seguro con `try/catch`, soporte para rutas directas de Google Maps (`/maps/place/`, `/maps/search/`, `/maps/dir/`) y parámetros `center`, `viewpoint`, `daddr`, `saddr`.
- `parsearTextoCoordenadas`: Detección preventiva de URLs pegadas en el campo de texto y parseo de DMS.

### 2.3. `src/app/_stories/platform.stories.tsx`
- En la historia `CrearMesaCompleta`, actualización del paso `play` para interactuar con el campo unificado `panel.getByLabelText(/Coordenadas/i)`.

### 2.4. `src/features/mesas/lib/coordenadas-parser.test.ts`
- Se agregaron casos de prueba para `%2C`, rutas `/place/`, `/search/`, `/dir/`, parámetros `center`/`viewpoint`/`daddr`/`saddr`, coordenadas DMS y pegado de URL en campo de texto (29/29 pasadas).

### 2.5. `src/features/mesas/panels/mesa-editor-panel.test.tsx`
- Nueva suite unitaria que valida la ausencia de inputs separados, presencia del campo unificado, extracción de coordenadas desde URLs complejas y comportamiento del botón de limpieza (4/4 pasadas).

---

## 🧪 3. Matriz de Pruebas y Certificación de Calidad

| Suite / Verificación | Comando Ejecutado | Resultado |
|---|---|---|
| **Unitarias Parser Coordenadas** | `bun test src/features/mesas/lib/coordenadas-parser.test.ts` | ✅ **29 / 29 pasadas** (114 ms) |
| **Unitarias Panel Editor Mesas** | `bun test src/features/mesas/panels/mesa-editor-panel.test.tsx` | ✅ **4 / 4 pasadas** (390 ms) |
| **Suite Completa Frontend** | `bun test` | ✅ **558 / 558 pasadas** (64 archivos, 0 fallos) |
| **Historias Storybook Plataforma** | `bunx vitest run --project=storybook src/app/_stories/platform.stories.tsx` | ✅ **24 / 24 pasadas** (incluyendo `CrearMesaCompleta`) |
| **Suite Global Storybook (axe-core)**| `bun run ui:test` | ✅ **212 / 212 pasadas** (17 archivos, 0 fallos) |
| **Verificación de Calidad y Tipos** | `bun run check` (`ui:check` + `tsc --noEmit` + `eslint .`) | ✅ **0 errores** |
| **Build de Producción** | `bun run build` (Next.js 16.3.8 Turbopack) | ✅ **192 / 192 rutas compiladas** |

---

## 🚀 4. Despliegue y Estado Operativo

- **Servicio `polis-frontend`:** Reiniciado (`systemctl restart polis-frontend`), estado `active (running)`.
- **Verificación HTTP:**
  - `GET http://127.0.0.1:3000/` → `HTTP 200 OK`
  - `GET http://127.0.0.1:3000/plataforma/mesas` → `HTTP 200 OK`
- **Inviolabilidad del Censo Institucional en `bd_csh`:**
  ```sql
  SELECT 
    (SELECT count(*) FROM mesas_trabajo.mesas) as mesas, 
    (SELECT count(*) FROM mesas_trabajo.agendas) as agendas, 
    (SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores) as fichas, 
    (SELECT count(*) FROM participacion_ciudadana.actores_estrategicos) as actores;
  ```
  ```
   mesas | agendas | fichas | actores 
  -------+---------+--------+---------
      33 |      36 |     11 |      17
  ```
  *(33 mesas, 36 agendas, 11 fichas técnicas, 17 actores estratégicos — rigurosamente intactos).*

---

## 📦 5. Archivos Modificados e Incluidos

- `src/features/mesas/panels/mesa-editor-panel.tsx`
- `src/features/mesas/panels/mesa-editor-panel.test.tsx`
- `src/features/mesas/lib/coordenadas-parser.ts`
- `src/features/mesas/lib/coordenadas-parser.test.ts`
- `src/app/_stories/platform.stories.tsx`
- `bridge/02_resultado_agy2.md`


---

# INFORME DE RESULTADO: TAREA [DIM-ONU-01]
## ESTRATEGIA DE CONTENIDO PROFUNDO E INTERACTIVIDAD PARA LAS 7 DIMENSIONES DE LA SEGURIDAD HUMANA (ONU) EN EL HOME

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 14 de Octubre de 2026  
**Tarea Reportada:** `[DIM-ONU-01] Estrategia de contenido profundo e interactividad para las 7 Dimensiones de la Seguridad Humana (ONU) en el Home`  
**Plan de Ejecución:** `bridge/01_tarea_activa.md`  

---

## 🎯 1. Resumen Ejecutivo

En estricta atención al mandato de `bridge/01_tarea_activa.md`, se ejecutó y desplegó en producción la estrategia integral de contenido pedagógico situado, interactividad y arquitectura Zero-Modals para las **7 Dimensiones de la Seguridad Humana (Resolución 66/290 ONU)** y su eje transversal de crisis en Cartagena de Indias:

1. **Enriquecimiento Pedagógico y Territorial Situado (`dimensiones-detalle.data.ts`):**
   - Se completaron las 8 dimensiones con contenido técnico real y no trivial situado en Cartagena:
     - **Pilar Fundamental ONU:** Mapeo estricto a *Libertad frente al miedo*, *Libertad frente a la necesidad* o *Libertad frente a la indignidad*.
     - **Explicación Pedagógica Decenal:** 3 párrafos pedagógicos por dimensión explicando qué es según el paradigma PNUD 1994 y la Resolución ONU 66/290.
     - **Contexto Territorial Cartagena:** Diagnóstico situado en las tres localidades distritales y áreas insulares/rurales (Olaya Herrera, El Pozón, Nelson Mandela, Tierrabomba, Ciénaga de la Virgen, etc.).
     - **Amenazas Críticas:** 4 focos prioritarios por dimensión con título y descripción operativa.
     - **Enfoque Diferencial e Interseccional:** Incorporación de mandatos de la Ley 70 de 1993, comunidades negras/afrodescendientes, raizales, palenqueras, mujeres, jóvenes e infancia.
     - **Rutas de Incidencia Ciudadana:** Mecanismos concretos de participación y co-gobernanza comunitaria.
     - **Indicadores Trazadores Decenales (2026–2036):** 3 indicadores por dimensión con línea base y meta a 2036.

2. **Nuevo Panel Zero-Modals `DimensionDetallePanel` (`dimension-detalle-panel.tsx`):**
   - Montado sobre `PanelShell` con ancho adaptable `min(clamp(760px, 54vw, 1120px), 100vw)`.
   - Registrado en `PanelType`, `PanelPropsMap` (`src/core/panels/panel-store.ts`) y `PANEL_REGISTRY` (`src/app/_composition/panel-registry.tsx`).
   - Bloques estructurados: selector rápido de las 7 dimensiones ONU, paradigma ONU / definición pedagógica, diagnóstico Cartagena y 4 amenazas críticas, enfoque diferencial (Ley 70/93), indicadores trazadores 2026–2036 + metas PDD, gobernanza distrital con enlace a rendición de cuentas, y rutas de participación ciudadana con enlaces a líneas de acción y geovisor.

3. **Interactividad Plena en la Grilla del Home (`dimensiones-grid.tsx`):**
   - Recuadros convertidos en botones interactivos accesibles (`<Button variant="unstyled" size="unstyled">`) que invocan `openPanel("dimension-detalle", { dimensionId: dim.id })`.
   - Badge del Pilar ONU, título, descripción y llamada visual a la acción *"Explorar dimensión a fondo →"*.
   - Inclusión de las 3 píldoras conceptuales ONU (*Libertad frente al miedo*, *Libertad frente a las necesidades*, *Libertad frente a la indignidad*) en el encabezado de `#dimensiones` en `inicio-view.tsx`, junto con el botón de navegación directa hacia `DimensionesView`.

4. **Sincronización y Enriquecimiento de `DimensionesView` (`dimensiones-view.tsx`):**
   - Sincronización reactiva del estado `dimensionSeleccionadaId` con `dimensionActivaIdNav` de `useNavigationStore` (sin efectos secundarios ni renders en cascada).
   - Modo A enriquecido con el pilar ONU, explicación pedagógica, contexto Cartagena, diagnóstico de amenazas críticas, enfoque diferencial e indicadores decenales, junto con botones para abrir la ficha pedagógica completa en el panel lateral.

5. **Pruebas Unitarias y Calidad:**
   - Creada suite `src/features/politicas/components/dimensiones-grid.test.tsx` (8/8 pruebas pasadas).
   - Suite global Bun: **566 / 566 pasadas** (65 archivos, 0 fallos).
   - `bun run check`: `ui:check` (Zero-Colors y controles UI), `tsc --noEmit` y `eslint .` superados con **0 errores**.
   - `bun run ui:test`: **212 / 212 historias Storybook** pasadas (17 archivos, 0 fallos).
   - `bun run build`: Compilación Next.js 16.3.8 exitosa (192 páginas estáticas/SSG generadas).
   - Reinicio de `polis-frontend` exitoso con HTTP 200 en `/` y `/plataforma`.
   - Censo `bd_csh` intacto: 33 mesas, 36 agendas, 11 fichas, 17 actores.

---

## 🛠️ 2. Detalle de Archivos Intervenidos

### 2.1. `src/features/politicas/data/dimensiones-detalle.data.ts`
- Definición de tipos `PilarOnu`, `AmenazaCritica`, `IndicadorTrazador`.
- Enriquecimiento integral de las 8 dimensiones con `pilarOnu`, `queEsExplicacionPedagogica`, `contextoCartagena`, `amenazasCriticas`, `enfoqueDiferencial`, `comoParticipar`, `indicadoresTrazadores`.

### 2.2. `src/core/panels/panel-store.ts`
- Registro de `"dimension-detalle"` en `PanelType`.
- Registro de `dimension-detalle: { dimensionId: string }` en `PanelPropsMap`.

### 2.3. `src/core/navigation/navigation-store.ts`
- Incorporación de `dimensionActivaId?: string` en el contrato `NavigationState`.
- Incorporación del método `irADimension: (dimensionId: string) => void` que conmuta la vista a `"dimensiones"` y fija la dimensión activa.

### 2.4. `src/features/politicas/panels/dimension-detalle-panel.tsx` (Nuevo)
- Componente de ficha técnica pedagógica profunda bajo arquitectura Zero-Modals (`PanelShell`).
- 6 bloques temáticos detallados con selector rápido de las 7 dimensiones ONU, paradigma Resolución 66/290, diagnóstico territorial, enfoque Ley 70/93, indicadores decenales y gobernanza.

### 2.5. `src/app/_composition/panel-registry.tsx`
- Registro diferido `DimensionDetallePanel` en `PANEL_REGISTRY`.
- Asignación de ancho responsive `"min(clamp(760px, 54vw, 1120px), 100vw)"` en `PANEL_WIDTHS`.

### 2.6. `src/features/politicas/components/dimensiones-grid.tsx`
- Conexión a `DIMENSIONES_DETALLE_2026`.
- Conversión de recuadros a botones accesibles con badge de pilar ONU, descripción y pie *"Explorar dimensión a fondo →"*, abriendo `openPanel("dimension-detalle", { dimensionId: dim.id })`.

### 2.7. `src/features/politicas/views/inicio-view.tsx`
- Encabezado de `#dimensiones` actualizado con 3 píldoras conceptuales ONU (*Libertad frente al miedo / necesidad / indignidad*) y botón directo *"Ver matriz completa de las 7 Dimensiones y 27 Entidades →"*.

### 2.8. `src/features/politicas/views/dimensiones-view.tsx`
- Sincronización con `useNavigationStore((s) => s.dimensionActivaId)` sin efectos secundarios.
- Modo A enriquecido con explicación pedagógica, contexto de Cartagena, amenazas críticas, enfoque diferencial, indicadores trazadores decenales y botón directo para abrir `DimensionDetallePanel`.

### 2.9. `src/features/politicas/components/dimensiones-grid.test.tsx` (Nuevo)
- Suite con 8 pruebas verificando el renderizado de las 7 dimensiones ONU en la grilla, presencia de pilares y accesibilidad, despacho a `usePanelStore`, integridad de datos de las 8 dimensiones y renderizado de `DimensionDetallePanel`.

---

## 🧪 3. Matriz de Pruebas y Certificación de Calidad

| Suite / Verificación | Comando Ejecutado | Resultado |
|---|---|---|
| **Unitarias Grilla y Panel Dimensiones** | `bun test src/features/politicas/components/dimensiones-grid.test.tsx` | ✅ **8 / 8 pasadas** (281 ms) |
| **Suite Módulo Políticas** | `bun test src/features/politicas` | ✅ **54 / 54 pasadas** (6 archivos, 0 fallos) |
| **Suite Completa Frontend** | `bun test` | ✅ **566 / 566 pasadas** (65 archivos, 0 fallos) |
| **Suite Global Storybook (Playwright/axe)** | `bun run ui:test` | ✅ **212 / 212 pasadas** (17 archivos, 0 fallos) |
| **Verificación de Calidad y Tipos** | `bun run check` (`ui:check` + `tsc --noEmit` + `eslint .`) | ✅ **0 errores** |
| **Build de Producción** | `bun run build` (Next.js 16.3.8 Turbopack) | ✅ **192 / 192 rutas compiladas** |

---

## 🚀 4. Despliegue y Estado Operativo

- **Servicio `polis-frontend`:** Reiniciado (`systemctl restart polis-frontend`), estado `active (running)`.
- **Verificación HTTP:**
  - `GET http://127.0.0.1:3000/` → `HTTP 200 OK`
  - `GET http://127.0.0.1:3000/plataforma` → `HTTP 200 OK`
- **Inviolabilidad del Censo Institucional en `bd_csh`:**
  ```sql
  SELECT 
    (SELECT count(*) FROM mesas_trabajo.mesas) as mesas, 
    (SELECT count(*) FROM mesas_trabajo.agendas) as agendas, 
    (SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores) as fichas, 
    (SELECT count(*) FROM participacion_ciudadana.actores_estrategicos) as actores;
  ```
  ```
   mesas | agendas | fichas | actores 
  -------+---------+--------+---------
      33 |      36 |     11 |      17
  ```
  *(33 mesas, 36 agendas, 11 fichas técnicas, 17 actores estratégicos — rigurosamente intactos).*

---

## 📦 5. Archivos Intervenidos e Incluidos en la Entrega

- `src/features/politicas/data/dimensiones-detalle.data.ts`
- `src/core/panels/panel-store.ts`
- `src/core/navigation/navigation-store.ts`
- `src/features/politicas/panels/dimension-detalle-panel.tsx`
- `src/app/_composition/panel-registry.tsx`
- `src/features/politicas/components/dimensiones-grid.tsx`
- `src/features/politicas/views/inicio-view.tsx`
- `src/features/politicas/views/dimensiones-view.tsx`
- `src/features/politicas/components/dimensiones-grid.test.tsx`
- `bridge/02_resultado_agy2.md`


---

# INFORME DE RESULTADO: PAQUETE TRIPLE [FASES-CICLO-01] + [LINEAS-APORTES-01] + [NAV-RETORNO-01]
## ESTADO REAL DEL CICLO DE POLÍTICA, RECONEXIÓN DE APORTES EN LAS 8 LÍNEAS ESTRATÉGICAS Y NAVEGACIÓN DE RETORNO INSTITUCIONAL

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador Principal (`agy2`)  
**Fecha:** 14 de Octubre de 2026  
**Tareas Ejecutadas:**
1. `[FASES-CICLO-01]` Ciclo de Formulación en Home y Backend: Fase 1 En curso al 15% (`activa`), Fases 2 y 3 Próxima / Sin iniciar al 0% (`preparatoria`).
2. `[LINEAS-APORTES-01]` Conexión real de «Ver aportes» y «Aportar a esta línea» en las 8 Líneas Estratégicas mediante resolución híbrida TanStack Query (`useLineas`, `useFases`, `usePoliticas`), conteo de aportes en PostgreSQL y estado esqueleto.
3. `[NAV-RETORNO-01]` Navegación de retorno al inicio (`href="/"`) y a la plataforma en `/asistencia/[mesaId]` y en `/f/[slug]`.

---

## 🎯 1. Resumen Ejecutivo de la Intervención

En cumplimiento de las instrucciones de `bridge/01_tarea_activa.md`, se abordaron y resolvieron con rigor arquitectónico y forense los tres problemas prioritarios solicitados por el propietario:

1. **`[FASES-CICLO-01]` Estado Real del Ciclo de Formulación de la Política Pública:**
   - **Causa raíz eliminada:** `FASE_1_DIAGNOSTICO` calculaba `0.0%` porque las actas concertadas están en proceso de suscripción, ignorando el avance real del diagnóstico territorial. Paralelamente, `FASE_2_FORMULACION` reportaba erróneamente `100.0%` aun cuando su estado en base de datos es `preparatoria` (sin iniciar).
   - **Solución implementada:**
     - En `bd_csh` (`motor_politicas.fases_politica`), se actualizó `progreso_porcentaje = 15.00` para `FASE_1_DIAGNOSTICO`. Las Fases 2 y 3 permanecen estrictamente en `0.00` y `preparatoria`.
     - En `backend/app/modules/politicas/gating.py` (`calcular_progreso_real_fases`), se instauraron compuertas metodológicas formales: si una fase tiene `estado == 'preparatoria'`, su progreso calculado es estrictamente `0.00%`. Para `FASE_1_DIAGNOSTICO` activa, se aplica el piso empírico del `15.00%`.
     - En `backend/app/modules/politicas/router.py` (`listar_politicas`, `listar_fases` y `listar_fases_control`), se garantiza que las fases preparatorias reporten `0.0%` y Fase 1 activa reporte `15.0%`.
     - En `src/features/politicas/views/inicio-view.tsx`, la sección `#fases-politica` renderiza la Fase 1 con `StatusBadge tone="warning">En curso</StatusBadge>` y barra de progreso al 15%, y las Fases 2 y 3 con `StatusBadge tone="neutral">Próxima · Sin iniciar</StatusBadge>` y avance del 0%.
     - En `src/features/politicas/__fixtures__/politicas.fixture.ts`, se alinearon los fixtures locales de desarrollo.

2. **`[LINEAS-APORTES-01]` Conexión Real de «Ver aportes» y radicación cívica en las 8 Líneas:**
   - **Causa raíz eliminada:** `usePoliticasStore` permanecía vacío (`politicas: []`) en producción. `ExplorarView` pasaba `"pol-cartagena"` (en lugar del UUID o `"pol-001"`) y los UUIDs de PostgreSQL. Al abrir `LineaPanel`, la guarda `if (!linea || !fase || !politica)` fallaba y desplegaba prematuramente *"Línea no disponible"*.
   - **Solución implementada:**
     - En `LineaPanel`, `FasePanel`, `PoliticaPanel` y `AporteEditorPanel`, se implementó una **resolución híbrida resiliente**: primero consulta el store Zustand (para compatibilidad con historias de Storybook), y si no está poblado, resuelve dinámicamente contra los hooks TanStack Query `useLineas()`, `useFases()` y `usePoliticas()` conectados a PostgreSQL.
     - En `LineaPanel`, mientras `useLineas()` esté cargando y la línea aún no esté resuelta, se despliega un estado esqueleto (`Skeleton`) en `PanelShell`, eliminando falsos positivos de indisponibilidad.
     - En `backend/app/modules/politicas/router.py` y `schemas.py`, `listar_lineas` y `listar_politicas` ahora computan el conteo real de aportes cívicos radicados desde `participacion_ciudadana.propuestas_ciudadanas` (`estado != 'rechazado' AND activo = true`), serializando `aportes_count` / `aportesCount`.
     - En `src/features/politicas/views/explorar-view.tsx`, se corrigió el selector a `politicaPrincipal?.id ?? "pol-001"` y se conectó el contador de aportes en el pie de cada tarjeta.

3. **`[NAV-RETORNO-01]` Navegación de Retorno en `/asistencia/[mesaId]` y `/f/[slug]`:**
   - **Causa raíz eliminada:** Las planillas de asistencia pública y los formularios públicos no ofrecían rutas de retorno visibles, actuando como páginas sin salida.
   - **Solución implementada:**
     - En `src/app/asistencia/[mesaId]/asistencia-cliente.tsx`:
       1. Encabezado institucional: el bloque de marca (`Building2` + Alcaldía Mayor / Secretaría del Interior) se convirtió en un `<Link href="/">` accesible con `aria-label` y foco visible.
       2. Botón en header: se agregó el botón `<Button asChild variant="outline" size="sm"><Link href="/">← Volver al inicio</Link></Button>`.
       3. Barra de retorno sobre la tarjeta: se añadió una barra de navegación con botón dinámico «← Volver a la plataforma POLIS» (`router.back()` si hay historial del mismo origen, o fallback a `/`) y migas de pan directas a `Inicio`.
       4. Pie de página: se incluyó el enlace accesible «← Regresar al portal principal de Seguridad Humana Integral (POLIS)».
     - En `src/features/formularios/views/formulario-publico-view.tsx`:
       1. Encabezado: logo `Landmark` + título enlazados a `/`.
       2. Botón visible «← Volver al inicio» (`<Link href="/">`).

---

## 🛠️ 2. Detalle de Archivos Intervenidos

### Backend:
- `backend/app/modules/politicas/gating.py`:
  - En `calcular_progreso_real_fases`:
    - `FASE_1_DIAGNOSTICO`: implementado piso de diagnóstico en curso `Decimal("15.00")`.
    - `FASE_2_FORMULACION`: compuerta CASE en SQL que retorna `0` si el estado en `fases_politica` es `'preparatoria'`.
    - `FASE_3_PLAN_ACCION`: compuerta CASE en SQL que retorna `0.00` si el estado en `fases_politica` es `'preparatoria'`.
- `backend/app/modules/politicas/schemas.py`:
  - `LineaEstrategicaRead`: añadido `aportes_count: int = Field(default=0)`.
  - `LineaPoliticaResumen`: añadido `aportes_count: int = Field(default=0, alias="aportesCount")`.
- `backend/app/modules/politicas/router.py`:
  - Importado `PropuestaCiudadana`.
  - En `listar_politicas`: compuertas de progreso para fases y agregación de `conteos_aportes` en `lineas_por_fase`.
  - En `listar_lineas`: agregación de `conteos_aportes` desde `PropuestaCiudadana` (`estado != 'rechazado' AND activo = true`) asignado a cada `item.aportes_count`.
  - En `listar_fases` y `listar_fases_control`: compuertas de `0.00` para fases preparatorias y piso `15.00` para Fase 1 activa.
- `backend/tests/test_politicas_catalogo.py`:
  - Añadida prueba de integración `test_gating_fases_ciclo_progresos_y_aportes_lineas` validando Fase 1 al 15%, Fases 2 y 3 al 0% y conteo de `aportes_count` en líneas.

### Frontend:
- `src/features/politicas/models/politicas.ts`:
  - Añadido `aportesCount?: number;` a la interfaz canónica `LineaEstrategica`.
- `src/features/politicas/services/politicas-api.ts`:
  - Añadido `aportes_count?: number;` a `LineaEstrategicaApi`.
- `src/features/politicas/services/use-politicas-queries.ts`:
  - Exportado alias `usePoliticas = useCatalogoPoliticas` para consumo uniforme en paneles y vistas.
- `src/features/politicas/__fixtures__/politicas.fixture.ts`:
  - Fase 1: `estado: "activa", progreso: 15`.
  - Fase 2: `estado: "proxima", progreso: 0`.
  - Fase 3: `estado: "proxima", progreso: 0`.
- `src/features/politicas/views/inicio-view.tsx`:
  - Renderizado de badges y barras en `#fases-politica`: Fase 1 (15%, "En curso", tone warning), Fases 2 y 3 (0%, "Próxima · Sin iniciar", tone neutral).
- `src/features/politicas/views/explorar-view.tsx`:
  - `openPanel` corregido para pasar `politicaPrincipal?.id ?? "pol-001"`.
  - Mapeo de `aportesCount` desde `linea.aportes_count`.
  - Tarjetas de línea con indicador de aportes radicados y enlace «Ver aportes».
- `src/features/politicas/panels/linea-panel.tsx`:
  - Integración de `useLineas`, `useFases`, `usePoliticas` con resolución híbrida.
  - Estado `Skeleton` de carga en `PanelShell` mientras `isLoading && !linea`.
  - `lineaIdApi` adaptado a UUIDs de BD para consultar `useAportes`.
  - Botón «Aportar a esta línea» invocando `openPanel("aporte")` con los IDs resueltos.
- `src/features/politicas/panels/linea-panel.test.tsx` (Nuevo):
  - 2 pruebas unitarias con TanStack Query y Zustand store vacío: renderizado completo y estado esqueleto.
- `src/features/politicas/panels/fase-panel.tsx`:
  - Resolución híbrida con TanStack Query (`useFases`, `useLineas`, `usePoliticas`), carga esqueleto y navegación hacia `linea-panel`.
- `src/features/politicas/panels/politica-panel.tsx`:
  - Resolución híbrida con TanStack Query (`usePoliticas`), carga esqueleto y navegación.
- `src/features/aportes/panels/aporte-editor-panel.tsx`:
  - Resolución híbrida de `linea`, `fase` y `politica` para subtítulo y breadcrumbs.
  - Resolución de `lineaIdReal` para la mutación `useCrearAporte`.
- `src/app/asistencia/[mesaId]/asistencia-cliente.tsx`:
  - Header institucional con logo clicable hacia `/` y botón «← Volver al inicio».
  - Barra de navegación previa a la mesa con botón «← Volver a la plataforma POLIS» (`router.back()` / `/`) y migas de pan.
  - Footer con enlace clicable «← Regresar al portal principal de Seguridad Humana Integral (POLIS)».
- `src/app/asistencia/[mesaId]/asistencia-cliente.test.tsx` (Nuevo):
  - 3 pruebas unitarias verificando la navegación de retorno en header, barra y footer.
- `src/features/formularios/views/formulario-publico-view.tsx`:
  - Header con logo clicable a `/` y botón «← Volver al inicio».
- `src/features/formularios/views/formulario-publico-view.test.tsx` (Nuevo):
  - Prueba unitaria verificando el botón de retorno y marca institucional en formularios públicos.

---

## 🧪 3. Matriz de Verificación y Quality Gates

| Puerta de Calidad | Comando Ejecutado | Resultado |
|---|---|---|
| **Pruebas Backend Pytest (Suite Completa)** | `venv/bin/pytest backend/tests/` | ✅ **528 / 528 pasadas** (100% verde, 5m 33s) |
| **Pruebas Específicas Gating & Catálogo** | `venv/bin/pytest backend/tests/test_politicas_catalogo.py backend/tests/test_aud05_gating_fases.py` | ✅ **7 / 7 pasadas** (0 fallas) |
| **Pruebas Frontend Bun Test (Suite Completa)** | `bun test` | ✅ **572 / 572 pasadas** (68 archivos, 0 fallas) |
| **Pruebas Unitarias Nuevas LineaPanel** | `bun test src/features/politicas/panels/linea-panel.test.tsx` | ✅ **2 / 2 pasadas** (0 fallas) |
| **Pruebas Unitarias Nuevas Asistencia** | `bun test src/app/asistencia/[mesaId]/asistencia-cliente.test.tsx` | ✅ **3 / 3 pasadas** (0 fallas) |
| **Pruebas Unitarias Nuevas Formulario** | `bun test src/features/formularios/views/formulario-publico-view.test.tsx` | ✅ **1 / 1 pasada** (0 fallas) |
| **Storybook Accessibility & Interaction Tests** | `bun run ui:test` | ✅ **212 / 212 historias pasadas** (17 suites, 0 violaciones axe-core) |
| **Verificación de Políticas UI (Zero-Colors)** | `bun run ui:check` | ✅ **0 violaciones** (tokens, capas y componentes canónicos conformes) |
| **Chequeo de Tipos TypeScript** | `bun run typecheck` (`tsc --noEmit`) | ✅ **0 errores** |
| **Linter ESLint** | `bun run lint` (`eslint .`) | ✅ **0 errores** |
| **Compilación de Producción Next.js** | `bun run build` | ✅ **192 / 192 rutas SSG/dinámicas compiladas** |

---

## 🚀 4. Despliegue en Vivo y Verificación Operativa

- **Servicios de Producción:**
  - `polis-backend`: `active (running)`, Uvicorn FastAPI en `http://127.0.0.1:8000`.
  - `polis-frontend`: `active (running)`, Next.js 16.3.8 en `http://127.0.0.1:3000`.
- **Verificación de Endpoints en Vivo:**
  - `GET http://127.0.0.1:8000/api/v1/politicas/fases`:
    - Fase 1: `estado = "activa"`, `progreso_porcentaje = "15.00"`.
    - Fase 2: `estado = "preparatoria"`, `progreso_porcentaje = "0.00"`.
    - Fase 3: `estado = "preparatoria"`, `progreso_porcentaje = "0.00"`.
  - `GET http://127.0.0.1:8000/api/v1/politicas`:
    - Fase 1: `progreso = 15.0`, `estado = "activa"`.
    - Fases 2 y 3: `progreso = 0.0`, `estado = "proxima"`.
    - Líneas estratégicas: reportan conteo real de aportes en `aportesCount`.
  - `GET http://127.0.0.1:3000/` → `HTTP 200 OK`.
  - `GET http://127.0.0.1:3000/asistencia/mt-l01-01` → `HTTP 200 OK` (incluye «Volver al inicio», «Volver a la plataforma POLIS» y «Regresar al portal principal»).
  - `GET http://127.0.0.1:3000/f/reporte-inseguridad` → `HTTP 200 OK` (incluye «Volver al inicio»).
- **Inviolabilidad Estricta del Censo en `bd_csh`:**
  ```
  CENSO: mesas=33 agendas=36 fichas=11 actores=17
  FASES BD: [('FASE_1_DIAGNOSTICO', 'activa', Decimal('15.00')), ('FASE_2_FORMULACION', 'preparatoria', Decimal('0.00')), ('FASE_3_PLAN_ACCION', 'preparatoria', Decimal('0.00'))]
  ```
  *(Censo institucional 100% inalterado).*

---

## 📦 5. Archivos Incluidos en el Commit Local (Política Zero-Push)

- `backend/app/modules/politicas/gating.py`
- `backend/app/modules/politicas/router.py`
- `backend/app/modules/politicas/schemas.py`
- `backend/tests/test_politicas_catalogo.py`
- `src/features/politicas/models/politicas.ts`
- `src/features/politicas/services/politicas-api.ts`
- `src/features/politicas/services/use-politicas-queries.ts`
- `src/features/politicas/__fixtures__/politicas.fixture.ts`
- `src/features/politicas/views/inicio-view.tsx`
- `src/features/politicas/views/explorar-view.tsx`
- `src/features/politicas/panels/linea-panel.tsx`
- `src/features/politicas/panels/linea-panel.test.tsx`
- `src/features/politicas/panels/fase-panel.tsx`
- `src/features/politicas/panels/politica-panel.tsx`
- `src/features/aportes/panels/aporte-editor-panel.tsx`
- `src/app/asistencia/[mesaId]/asistencia-cliente.tsx`
- `src/app/asistencia/[mesaId]/asistencia-cliente.test.tsx`
- `src/features/formularios/views/formulario-publico-view.tsx`
- `src/features/formularios/views/formulario-publico-view.test.tsx`
- `bridge/02_resultado_agy2.md`
