# TAREA ACTIVA: [MESA-UBIC-01] UBICACIÓN DE LA MESA: CLIC EN MAPA, URL DE GOOGLE MAPS O COORDENADAS PLANAS
**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (respaldo previo si hay migración, cambios por pasos, verificar servicios/HTTP, `bd_csh` inviolable: 33/36/11/17; nada de sobrescribir datos existentes).

## Pedido del propietario (literal)
En `/plataforma/mesas` el editor de mesa debe permitir fijar la ubicación **de cualquiera de estas tres formas**: (1) **hacer clic en un mapa**, (2) **pegar una URL de Google Maps**, (3) **escribir coordenadas planas**.

## Estado actual (verificado por `agy`)
- `src/features/mesas/panels/mesa-editor-panel.tsx` ya tiene la sección «3. Ubicación y logística» (campo URL con `parsearCoordenadas`, y Latitud/Longitud), pero viene **plegada y «Opcional»**, sin mapa de clic. Se guarda en `metadatos.coordenadas` / `metadatos.urlMapa` (`mesas-api.ts`).
- El geovisor **ignora** esas coordenadas: `backend/app/modules/evidencia/service.py` (~L259) usa solo el centroide del territorio y `tipo_ubicacion` es el literal `centroide_territorial_referencia` (también en `schemas.py` L110, `mesas-geovisor-api.ts` L24/L70, datos de prueba).

## Alcance
1. **Selector de ubicación en el editor** (componente reutilizable, p. ej. `selector-ubicacion-mesa.tsx`, OpenLayers ya presente en el repo; carga dinámica `ssr: false`): clic coloca/mueve el marcador; centrado inicial en Cartagena o en el punto existente; sincronización bidireccional con los campos Latitud/Longitud y con la URL.
2. **Pegar URL**: ampliar `parsearCoordenadas` para Google Maps (`@lat,lng`, `!3dLAT!4dLNG`, `?q=lat,lng`, `ll=`, `query=`), OSM (`#map=z/lat/lon`, `mlat`/`mlon`) y Waze (`ll=`). Enlaces cortos (`maps.app.goo.gl`, `goo.gl/maps`) no se pueden expandir en el navegador: mostrar un mensaje claro que pida abrir el enlace y pegar la URL larga o las coordenadas (NO añadas resolución de URLs en servidor sin pasar por `agy`: riesgo SSRF).
3. **Coordenadas planas**: aceptar en un solo campo `10.39972, -75.51444` (coma/espacio/punto y coma) además de Latitud/Longitud separados; validar rangos (lat −90..90, lng −180..180) y **advertir** (no bloquear) si el punto cae fuera del Distrito de Cartagena (caja aproximada lat 10.1–10.6, lng −75.8–−75.3).
4. La sección de ubicación debe verse **abierta por defecto** al crear o editar una mesa y mostrar el mapa; mantener accesibilidad (teclado, `aria`, tokens POLIS, `bun run ui:check` limpio, móvil 320 px).
5. **Geovisor**: si la mesa tiene coordenadas propias válidas en `metadatos.coordenadas`, usarlas en lugar del centroide, con `tipo_ubicacion` nuevo `coordenada_registrada` (extender literal en backend y frontend, validación de `mesas-geovisor-api.ts`, pruebas); si no las tiene, mantener el centroide como hoy. Sin cambios de esquema salvo que sean imprescindibles (si hay migración: aditiva, con respaldo).
6. La ficha de la mesa (`mesa-panel.tsx`) y la ficha del geovisor deben mostrar la ubicación y un enlace «Cómo llegar» cuando existan coordenadas.
7. Pruebas: parseo de todos los formatos de URL, coordenadas planas, límites, selección por clic (lógica), geovisor con y sin coordenadas propias, no regresión de las 33 mesas existentes (siguen en su centroide hasta que se les asigne ubicación).
8. Verifica con Playwright (1440 y 375 px): crear/editar una mesa de prueba en una **base aislada** (no ensucies las 33 mesas reales), fijar ubicación por las 3 vías y ver el punto en el geovisor. Despliega (build + reinicio de `polis-frontend` y `polis-backend`) y verifica servicios y HTTP 200. Reporta con evidencia y espera dictamen.
