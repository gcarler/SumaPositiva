# DICTAMEN EAF — [MESA-UBIC-02] Simplificación de coordenadas y validación con enlaces de Google Maps

**Auditor:** `agy` — **Commit evaluado:** `2a8de56` — **Fecha:** 13-oct-2026
**Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## Verificación independiente del Auditor (`agy`)

1. **Eliminación de campos duplicados (`src/features/mesas/panels/mesa-editor-panel.tsx`):**
   - Suprimidos por completo los dos campos redundantes `Latitud individual` (`#mesa-lat`) y `Longitud individual` (`#mesa-lng`).
   - Consolidado un único control **`#mesa-coords-planas`** (`"3. Coordenadas (Latitud, Longitud)"`) sincronizado bidireccionalmente con el clic en el mapa (`SelectorUbicacionMesa`) y con el enlace de mapas (`#mesa-url-mapa`), con botón de acción directa `Limpiar`.
2. **Blindaje de `mesaSchema` y `fijarCoordenadas`:**
   - En `mesaSchema`, `coordenadas` utiliza `z.preprocess` para convertir cualquier estado vacío, `null`, `undefined` o con `lat`/`lng` no finitos en `undefined` antes de validar el esquema opcional WGS84 (`[-90..90]`, `[-180..180]`).
   - Eliminados `watchLat` y `watchLng`; `fijarCoordenadas` actualiza directamente `setValue("coordenadas", coords ?? undefined)`. Pegar cualquier enlace en `urlMapa` (incluidos enlaces cortos `maps.app.goo.gl`) permite guardar la mesa sin pedir latitud ni longitud individual.
3. **Ampliación de `parsearCoordenadasUrl` y `parsearTextoCoordenadas` (`src/features/mesas/lib/coordenadas-parser.ts`):**
   - Decodificación previa segura con `decodeURIComponent` (soporta `%2C`, ej. `?api=1&query=10.39972%2C-75.51444`).
   - Soporte de rutas `/maps/place/lat,lng`, `/maps/search/lat,lng`, `/maps/dir/lat,lng`, parámetros `center`, `viewpoint`, `daddr`, `saddr`, formato sexagesimal DMS (`10°24'00.0"N 75°30'00.0"W`) y detección automática si se pega una URL en el campo de coordenadas.
4. **Pruebas, Guardas y Producción:**
   - `bun test src/features/mesas`: **72/72 pruebas pasadas** en 6 archivos (`coordenadas-parser.test.ts` 29/29, `mesa-editor-panel.test.tsx` 4/4). Suite frontend global: **558/558 pruebas pasadas**.
   - `bun run ui:test`: **212/212 historias Storybook + axe-core en verde** (incluida `CrearMesaCompleta` en `platform.stories.tsx`).
   - `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`): **0 errores**.
   - `polis-frontend` activo (`HTTP 200` en `/` y `/plataforma/mesas`) y censo `bd_csh` intacto (**33 mesas, 36 agendas, 11 fichas, 17 actores**).
