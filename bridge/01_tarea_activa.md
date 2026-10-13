# TAREA ACTIVA: [MESA-UBIC-02] SIMPLIFICAR CAMPO DE COORDENADAS Y CORREGIR VALIDACIÓN AL USAR ENLACE DE GOOGLE MAPS

**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (`bd_csh` intacta 33/36/11/17, verificar servicios y HTTP 200, commits locales por ruta explícita, nunca `git push`, `bun run ui:test` 212/212 en verde).

## Problema reportado por el propietario
> *"en la mesa coloque el link de la ubicación que da google maps, sin embargo me esta pidiendo la lautidu individual y la longitud individual. creo, a proposito que debes eliminar uno de los campos porque se repita en uno se pega la latitud y la longitud y en otro se hace por separado... crea el plan y asignaselo a agy2"*

## Diagnóstico de Causa Raíz (identificado por `agy`)
1. **Bloqueo de validación Zod por campos individuales registrados en RHF (`src/features/mesas/panels/mesa-editor-panel.tsx`):**
   - Los inputs `register("coordenadas.lat")` (`Latitud individual`) y `register("coordenadas.lng")` (`Longitud individual`) hacen que React Hook Form construya el objeto `{ coordenadas: { lat: undefined, lng: undefined } }` cuando están vacíos.
   - Si el usuario pega un enlace de Google Maps que no contiene coordenadas en texto plano (como un enlace compartido `https://maps.app.goo.gl/...`) o deja las coordenadas vacías, `mesaSchema` evalúa `coordenadas` como objeto no nulo con `lat: undefined` y `lng: undefined`, disparando error obligatorio en `Latitud individual` y `Longitud individual` e impidiendo guardar la mesa.
2. **Duplicación innecesaria de controles en la Sección 3:**
   - Existen simultáneamente el campo combinado (`#mesa-coords-planas`: `10.39972, -75.51444`) y los dos campos separados (`Latitud individual` y `Longitud individual`), generando fricción y redundancia visual.
3. **Formatos adicionales de URL de Google Maps (`src/features/mesas/lib/coordenadas-parser.ts`):**
   - `parsearCoordenadasUrl` no aplica `decodeURIComponent` antes de evaluar (por lo que falla con comas codificadas `%2C`, ej. `?api=1&query=10.39972%2C-75.51444`) ni contempla rutas como `/maps/place/10.39972,-75.51444`, `/maps/search/10.39972,-75.51444`, `center=lat,lng`, `daddr=lat,lng` o coordenadas DMS (`10°24'00.0"N 75°30'00.0"W`).

---

## Plan de Trabajo a Ejecutar por `agy2`

### Paso 1: Eliminar los campos separados (`Latitud individual` y `Longitud individual`) en `src/features/mesas/panels/mesa-editor-panel.tsx`
- Eliminar del JSX los dos bloques `<FormField id="mesa-lat" label="Latitud individual">` y `<FormField id="mesa-lng" label="Longitud individual">` (líneas ~1202–1246).
- Dejar **únicamente** el campo unificado **`#mesa-coords-planas`** con etiqueta clara: **`"3. Coordenadas (Latitud, Longitud)"`** y descripción: *"Escribe o pega Latitud y Longitud separadas por coma o espacio (ej. 10.39972, -75.51444). También se llena automáticamente al hacer clic en el mapa o pegar un enlace con coordenadas."*
- Agregar un botón/acción sutil para limpiar las coordenadas si el usuario vacía el campo `#mesa-coords-planas` (`if (!val.trim()) fijarCoordenadas(undefined)`), mostrando error en línea únicamente si el usuario escribió texto en `#mesa-coords-planas` que no corresponde a coordenadas válidas.

### Paso 2: Blindar `mesaSchema` y `fijarCoordenadas` para que `coordenadas` sea verdaderamente opcional
- En `mesaSchema` (`src/features/mesas/panels/mesa-editor-panel.tsx`), envolver `coordenadas` con `z.preprocess` para que si recibe `null`, `undefined`, o un objeto donde `lat` o `lng` no sean números finitos (`!Number.isFinite(val?.lat) || !Number.isFinite(val?.lng)`), devuelva `undefined` antes de validar el `z.object({ lat, lng }).optional()`.
- En `fijarCoordenadas`, actualizar únicamente `setValue("coordenadas", coords ?? undefined, { shouldDirty: dirty, shouldValidate: true })` (sin `setValue("coordenadas.lat", ...)` ni `setValue("coordenadas.lng", ...)`), eliminando `watchLat` y `watchLng`.
- Así, pegar cualquier enlace válido en `urlMapa` (incluso `https://maps.app.goo.gl/...`) permitirá guardar la mesa de inmediato sin exigir latitud ni longitud.

### Paso 3: Ampliar `parsearCoordenadasUrl` y `parsearTextoCoordenadas` (`src/features/mesas/lib/coordenadas-parser.ts`)
- Decodificar secuencias URL (`decodeURIComponent` seguro con `try/catch`) antes de extraer coordenadas (soporta `?query=10.39972%2C-75.51444`).
- Soportar patrones adicionales de Google Maps:
  - `/maps/(?:place|search|dir)/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i`
  - Parámetros `center=lat,lng`, `viewpoint=lat,lng`, `daddr=lat,lng`, `saddr=lat,lng`.
  - Si el usuario pega por error una URL de Google Maps dentro del campo de coordenadas `#mesa-coords-planas`, o pega coordenadas planas dentro de `#mesa-coords-planas`, detectarlo automáticamente (`parsearTextoCoordenadas` puede delegar en `parsearCoordenadasUrl` si detecta `http` o `@`).

### Paso 4: Actualizar pruebas e historia `CrearMesaCompleta`
- En `src/app/_stories/platform.stories.tsx` (historia `CrearMesaCompleta`), actualizar el `play` para que use el campo unificado de coordenadas (o no dependa de los inputs eliminados `Latitud individual` / `Longitud individual`).
- Actualizar `src/features/mesas/panels/mesa-editor-panel.test.tsx` y `src/features/mesas/lib/coordenadas-parser.test.ts` verificando:
  1. Que no existan los campos separados `Latitud individual` y `Longitud individual` y sí exista el campo unificado de coordenadas.
  2. Que al pegar un enlace de Google Maps (con coordenadas o enlace corto `maps.app.goo.gl`) el formulario permita guardar sin pedir latitud/longitud individual.
  3. Que las URLs con `%2C`, `/maps/place/lat,lng` y `/maps/search/?api=1&query=lat%2Clng` extraigan las coordenadas y sincronicen el campo unificado y el mapa.

### Paso 5: Certificación y Despliegue
- Ejecutar `bun test`, `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`), `bun run ui:test` (212/212 historias en verde) y `bun run build`.
- Reiniciar `polis-frontend`, verificar `HTTP 200` en `/` y `/plataforma/mesas`, comprobar censo `bd_csh` intacto (33/36/11/17), hacer commit local en `main` y reportar en `bridge/02_resultado_agy2.md`.
