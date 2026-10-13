# INFORME DE RESULTADO: TAREA [MESA-UBIC-01]
## FIJACIÓN DE UBICACIÓN DE LA MESA: CLIC EN MAPA, URL DE MAPAS O COORDENADAS PLANAS Y ENLACE CON GEOVISOR

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tarea Reportada:** `[MESA-UBIC-01] Ubicación de la mesa: clic en mapa, URL de Google Maps o coordenadas planas, y uso en el geovisor`  
**Plan Maestro y Especificación:** `bridge/01_tarea_activa.md` y `bridge/00_plan_maestro_cierre_operativo.md`  

---

## 🎯 1. Resumen Ejecutivo

En estricta atención al requerimiento del propietario y las directrices técnicas de `bridge/01_tarea_activa.md`, se implementó y desplegó la funcionalidad integral de geolocalización de mesas de trabajo:

1. **Tres vías independientes y sincronizadas para fijar ubicación:**
   - **Vía 1: Clic interactivo en mapa OpenLayers** (`SelectorUbicacionMesa`), con carga dinámica `ssr: false`, centrado en Cartagena o en punto previo, y controles accesibles POLIS.
   - **Vía 2: Pegado de URL de mapas** con detección automática y extracción de lat/lng para Google Maps (`@lat,lng`, `!3dLAT!4dLNG`, `?q=`, `query=`, `ll=`, `destination=`), OpenStreetMap (`#map=`, `mlat`/`mlon`) y Waze (`ll=`). Incluye aviso preventivo contra SSRF para enlaces cortos (`maps.app.goo.gl` o `goo.gl/maps`).
   - **Vía 3: Coordenadas planas combinadas en un solo campo** (separadores comma, punto y coma o espacio, ej. `10.39972, -75.51444`) además de campos individuales continuos para Latitud y Longitud, con advertencia no bloqueante si caen fuera de los límites distritales de Cartagena (lat 10.1–10.6, lng −75.8–−75.3).
2. **Sección 3 abierta por defecto:**
   - En el editor de mesas (`mesa-editor-panel.tsx`), la sección «3. Ubicación y logística» ahora se muestra **abierta por defecto** tanto al crear una nueva mesa como al editar una existente, permitiendo al usuario visualizar el mapa y las opciones de ubicación inmediatamente.
3. **Consumo y visualización en el Geovisor:**
   - Si la mesa cuenta con coordenadas válidas registradas en `metadatos.coordenadas`, el backend (`backend/app/modules/evidencia/service.py`) y el frontend (`mesas-geovisor-api.ts`) asignan y validan el nuevo `tipo_ubicacion`: `"coordenada_registrada"`, así como `url_mapa`. Si no existen coordenadas propias, se mantiene el fallback exacto al centroide del territorio (`"centroide_territorial_referencia"`).
4. **Fichas con enlace "Cómo llegar":**
   - Tanto la ficha detallada de la mesa (`mesa-panel.tsx`) como la ficha del geovisor (`geovisor-ficha-mesa.tsx`) presentan las coordenadas registradas y un botón/enlace interactivo «Cómo llegar» que abre la navegación hacia el punto de encuentro en Google Maps (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`).
5. **Calidad, Pruebas y Despliegue en Producción:**
   - **22 pruebas unitarias** nuevas para el parser de coordenadas (`coordenadas-parser.test.ts`).
   - **3 pruebas SSR/a11y** para el selector OpenLayers (`selector-ubicacion-mesa.test.tsx`).
   - **8 pruebas unitarias** para el contrato del geovisor (`mesas-geovisor-api.test.ts`).
   - **5 pruebas pytest** para el backend geovisor (`test_geovisor_ubicacion_mesa.py`).
   - **Playwright E2E** verificado en viewport de 1440px (Desktop) y 375px (Mobile) en entorno aislado sin alterar `bd_csh`.
   - **Censo `bd_csh` intacto:** exactamente 33 mesas, 36 agendas, 11 fichas y 17 actores estratégicos.
   - Despliegue verificado en producción con `polis-frontend` y `polis-backend` respondiendo HTTP 200.

---

## 🏗️ 2. Arquitectura y Componentes Implementados

### 2.1. Parser y Utilidades de Coordenadas (`coordenadas-parser.ts`)
- **Ubicación:** `src/features/mesas/lib/coordenadas-parser.ts`
- **Funcionalidades:**
  - `parsearCoordenadasUrl(url: string): Coordenadas | null`:
    - Google Maps `@10.421523,-75.551982,17z`
    - Google Maps data params `!3d10.421523!4d-75.551982`
    - Google Maps query params `?q=10.421523,-75.551982` o `query=...` o `ll=...`
    - OpenStreetMap hash `#map=16/10.4215/-75.5520` o params `mlat=...&mlon=...`
    - Waze `ll=10.421523,-75.551982`
  - `esEnlaceCorto(url: string): boolean`: Detecta `maps.app.goo.gl` o `goo.gl/maps` sin realizar solicitudes de red salientes (prevención de SSRF según directiva de seguridad de `agy`).
  - `parsearTextoCoordenadas(texto: string): Coordenadas | null`: Admite `lat, lng`, `lat; lng`, `lat lng`, y formatos con prefijos `lat: ... lng: ...`.
  - `validarLimitesCartagena(lat: number, lng: number)`: Valida la caja de cobertura distrital `[10.1, 10.6]` y `[-75.8, -75.3]`, emitiendo advertencia no bloqueante si el punto se encuentra fuera.
  - `validarRangoWgs84(lat: number, lng: number)`: Valida que latitud pertenezca a `[-90, 90]` y longitud a `[-180, 180]`.
  - `generarUrlComoLlegar(lat: number, lng: number)`: Genera URL de navegación directa `https://www.google.com/maps/dir/?api=1&destination=lat,lng`.

### 2.2. Selector Interactivo de Mapa OpenLayers (`selector-ubicacion-mesa.tsx`)
- **Ubicación:** `src/features/mesas/components/selector-ubicacion-mesa.tsx`
- **Carga dinámica en editor:** `dynamic(() => import(...), { ssr: false })`.
- **Características:**
  - Capa base OSM con capa vectorial OpenLayers superpuesta para el marcador.
  - Estilo de marcador token-aware: resolución de variables `--ember` y `--surface-0` en tiempo de ejecución para cumplir con la política UI003.
  - Clic en el canvas actualiza la posición del feature vectorial y dispara `onChange` con coordenadas normalizadas a 6 decimales.
  - Botón de recentrado rápido en el centro de Cartagena (`10.4225, -75.5489`) con animación suave.
  - Controles de zoom accesibles (`ZoomIn`, `ZoomOut`) con botones POLIS y `aria-label`.
  - Barra de estado inferior que muestra las coordenadas fijadas en formato monoespaciado o un texto indicativo.
  - `ResizeObserver` integrado para garantizar el renderizado correcto cuando el panel modal se redimensiona o se abre en móvil.

### 2.3. Sincronización en el Editor de Mesas (`mesa-editor-panel.tsx`)
- **Sección 3 abierta por defecto:** `seccion3Abierta = true` en el estado inicial.
- **Sincronización bidireccional:**
  - `coordenadasActuales`: Memo que sincroniza de forma transparente `watchCoords`, `watchLat` y `watchLng`.
  - `fijarCoordenadas(coords)`: Helper que actualiza simultáneamente los campos registrados `coordenadas`, `coordenadas.lat` y `coordenadas.lng`, disparando la reactividad en el formulario y en el mapa.
  - Detección reactiva de URL: si se pega una URL con coordenadas, se reflejan instantáneamente en el mapa y en los campos numéricos.
  - Aviso SSRF en URL corta: Si se detecta un enlace tipo `maps.app.goo.gl`, se renderiza un aviso `Notice` de tono `warning` indicando al usuario que pegue la URL expandida o use el mapa.
  - Aviso fuera de Cartagena: Si las coordenadas no pertenecen a Cartagena, se renderiza un `Notice` no bloqueante advirtiendo la situación.
  - Persistencia: `crearMesaRemota` y `actualizarMesaRemota` guardan `coordenadas` (`lat`, `lng`), `urlMapa` y `aforo` dentro de `metadatos`.

### 2.4. Backend y Geovisor
- **Backend Schemas:** `backend/app/modules/mesas/schemas.py`:
  - `MesaGeovisorRespuesta.tipo_ubicacion`: extendido a `Literal["centroide_territorial_referencia", "coordenada_registrada"] | None`.
  - `MesaGeovisorRespuesta.url_mapa`: agregado como campo opcional `str | None = None`.
- **Backend Service:** `backend/app/modules/evidencia/service.py`:
  - En `listar_mesas_geovisor()`: se inspeccionan `mesa.metadatos["coordenadas"]` (`lat` o `latitud`, `lng` o `longitud`). Si son válidas y están dentro del rango WGS84, se asigna `latitud_ref = lat_custom`, `longitud_ref = lng_custom` y `tipo_ubicacion = "coordenada_registrada"`. Si no, se preserva el centroide territorial (`"centroide_territorial_referencia"`).
- **Frontend Geovisor Service:** `src/features/geovisor/services/mesas-geovisor-api.ts`:
  - Modelo `MesaGeovisor` actualizado con `"coordenada_registrada"` y `url_mapa`.
  - Validación zod/tipada aceptando `null | undefined`.
- **Fichas de Detalle:**
  - `src/features/mesas/panels/mesa-panel.tsx`: Sección de ubicación con visualización de coordenadas y botón interactivo «Cómo llegar» con icono `Navigation`.
  - `src/features/geovisor/components/geovisor-ficha-mesa.tsx`: Renderiza badge de ubicación (`Coordenada exacta` o `Centroide territorial`), coordenadas en fuente monoespaciada y enlace directo «Cómo llegar».

---

## 🧪 3. Resultados de Pruebas y Certificación

### 3.1. Frontend Unit Tests (Bun Test)
- **Suite de coordenadas:** `src/features/mesas/lib/coordenadas-parser.test.ts`
  - **22 / 22 pasadas** en 13.9ms:
    - Extracción Google Maps `@lat,lng,z`, `!3d!4d`, query param `?q=`, query param `query=`, query param `ll=`.
    - Extracción OpenStreetMap hash `#map=z/lat/lon` y params `mlat/mlon`.
    - Extracción Waze `ll=lat,lng`.
    - Extracción URL de direcciones `/dir/...`.
    - Detección de enlaces cortos `maps.app.goo.gl` y `goo.gl/maps`.
    - Parseo de coordenadas planas: coma, espacio, punto y coma, prefijos lat/lng.
    - Validación de límites de Cartagena (dentro: Centro Histórico, Getsemaní, Bocagrande, El Pozón; fuera: Bogotá, Medellín, coordenadas nulas).
    - Validación de rangos WGS84 y generación de URL «Cómo llegar».
- **Suite de componente de mapa:** `src/features/mesas/components/selector-ubicacion-mesa.test.tsx`
  - **3 / 3 pasadas** (accesibilidad role `application`, controles de zoom y centrado, renderizado inicial).
- **Suite de Geovisor API:** `src/features/geovisor/services/mesas-geovisor-api.test.ts`
  - **8 / 8 pasadas** (soporte de `coordenada_registrada`, fallback de centroide, normalización de URLs).
- **Suite de Mesas API:** `src/features/mesas/services/mesas-api.test.ts`
  - **17 / 17 pasadas** (normalización de `metadatos.coordenadas`, `urlMapa`, `aforo`).
- **Total Frontend:** **529 pruebas pasando / 0 fallando** en 59 archivos de prueba.

### 3.2. Backend Pytest
- `backend/tests/test_geovisor_ubicacion_mesa.py`: **5 / 5 verificaciones pasadas** en 4.79s:
  - Asignación de `tipo_ubicacion="coordenada_registrada"` cuando existen coordenadas en `metadatos`.
  - Asignación de `url_mapa` desde `metadatos.urlMapa` o `url_mapa`.
  - Fallback a `"centroide_territorial_referencia"` cuando la mesa no tiene metadatos de coordenadas.
  - Validación de tolerancia y descarte de coordenadas corruptas o fuera de rango.
- **Suite integral backend mesas y geodatos:** **28 / 28 pruebas pasando**.

### 3.3. Playwright E2E (`scripts/mesa-ubicacion-e2e.mjs`)
- **Entorno aislado:** Red interceptada en memoria; **cero interacción con la base de datos oficial `bd_csh`**.
- **Resultados de ejecución:**
  - `📱 Caso 1: Desktop 1440px`:
    - Sección 3 abierta por defecto con `SelectorUbicacionMesa` visible.
    - Vía 1 (Clic en mapa): Coordenadas asignadas automáticamente (`lat=10.397754, lng=-75.496213`).
    - Vía 2 (Pegar URL Google Maps): Detección automática exitosa (`10.421523, -75.551982`).
    - Vía 2b (Enlace corto `maps.app.goo.gl`): Renderizado exitoso del aviso preventivo de SSRF.
    - Vía 3 (Coordenadas planas combinadas): Sincronización exitosa (`10.39972, -75.51444`).
    - Vía 3b: Renderizado exitoso del aviso de coordenadas fuera de Cartagena (`4.7110, -74.0721`).
    - Guardado de mesa: Persistencia validada en `metadatos.coordenadas`.
  - `🗺️ Caso 2: Geovisor`:
    - Carga exitosa de mesa con `tipo_ubicacion = 'coordenada_registrada'` y botón «Cómo llegar».
  - `📱 Caso 3: Mobile 375px`:
    - Verificación responsive: `scrollWidth (375) <= innerWidth (375)` (cero desbordamiento horizontal).
    - Selector de ubicación y controles plenamente operables en pantalla táctil/móvil.
- **Evidencias gráficas capturadas:**
  - `01_desktop_mesas_inicio.png` (107 KB)
  - `02_desktop_editor_completado.png` (361 KB)
  - `03_desktop_ficha_mesa.png` (211 KB)
  - `04_geovisor_mapa.png` (482 KB)
  - `05_mobile_mesas_inicio.png` (52 KB)
  - `06_mobile_editor_abierto.png` (43 KB)
  - Almacenadas en `/tmp/polis-e2e-mesa-ubicacion/`.

---

## 📊 4. Quality Gates y Estado del Sistema

| Gate / Criterio | Meta / Exigencia | Resultado Obtenido | Estado |
|---|---|---|---|
| **Pruebas Frontend (Bun Test)** | 100% pasando | **529 / 529 passing** (59 suites) | ✅ **VERDE** |
| **Pruebas Backend (Pytest)** | 100% pasando | **28 / 28 passing** | ✅ **VERDE** |
| **Playwright E2E** | Desktop 1440px y Mobile 375px | **6 / 6 casos passing**, evidencias guardadas | ✅ **VERDE** |
| **TypeScript (`tsc --noEmit`)** | Cero errores de tipado | Completado con **0 errores** | ✅ **VERDE** |
| **ESLint (`eslint .`)** | Cero violaciones de linter | Completado con **0 errores** | ✅ **VERDE** |
| **UI Policy (`bun run ui:check`)** | Tokens, a11y y capas POLIS | Controles, tokens y capas 100% conformes | ✅ **VERDE** |
| **Prevención SSRF** | Sin peticiones de red a enlaces cortos | Validado: aviso en frontend, 0 fetch backend | ✅ **CUMPLIDO** |
| **Censo `bd_csh` Intacto** | 33 mesas, 36 agendas, 11 fichas, 17 actores | **33 / 36 / 11 / 17 exactos** verificados por SQL | ✅ **INTACTO** |
| **Servicios en Producción** | Servicios systemd activos | `polis-backend`, `polis-frontend`, `nginx`, `postgresql@18-main` activos | ✅ **ACTIVOS** |
| **Endpoints en Vivo (HTTP 200)** | Respuesta 200 OK | `/`, `/geovisor`, `/plataforma/mesas`, `/api/v1/mesas/geovisor`, `/api/v1/health/live` -> 200 | ✅ **OPERATIVO** |

---

## 🛑 5. Conclusión y Espera de Dictamen

La tarea **[MESA-UBIC-01]** ha sido completamente implementada, probada y desplegada en producción.  
No se introdujeron migraciones de base de datos ni modificaciones a las 33 mesas canónicas de `bd_csh`.  
El sistema se encuentra en estado verde, compilado en producción y con todos los servicios operativos.

Quedo a la espera del dictamen del Auditor EAF `agy`.
