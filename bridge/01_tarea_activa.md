# TAREA ACTIVA PARA `agy2`: [GEO-FIX-CONSOLE-01]
## CORRECCIÓN QUIRÚRGICA DE ERRORES EN CONSOLA DEL GEOVISOR (`TypeError: .slice()`, 404 RECURSOS, `sw.js` `chrome-extension` Y DIRECTIVA CSP `media-src`)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Prioridad:** P0 CRÍTICO — El error `TypeError: Cannot read properties of undefined (reading 'slice')` rompe el renderizado en vivo del Geovisor (`/geovisor`) cuando `GeovisorHurtosPanel` recibe la respuesta real de FastAPI.

---

## 🎯 DIAGNÓSTICO FORENSE DE LOS 4 ERRORES REPORTADOS POR EL PROPIETARIO

Al abrir `https://seguridadhumanaintegral.org/geovisor`, la consola del navegador reporta:
1. `TypeError: Cannot read properties of undefined (reading 'slice')`
2. `Failed to load resource: the server responded with a status of 404 (Not Found)`
3. `sw.js:117 Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported`
4. `Loading media from 'data:audio/wav;base64,...' violates the following Content Security Policy directive: "default-src 'self'". Note that 'media-src' was not explicitly set`

### Causas raíz exactas identificadas:

1. **Causa Raíz 1 — Desajuste de contrato JSON entre Backend y Frontend en `/api/v1/geodatos/analitica/hurtos/resumen` y `/geojson` (`TypeError: Cannot read properties of undefined (reading 'slice')`):**
   - El endpoint `GET /api/v1/geodatos/analitica/hurtos/resumen` (`backend/app/modules/geodatos/schemas.py` y `repository.py`) devuelve en `serie_anual` y `serie_mensual` objetos con la clave **`"periodo"`** (`{ "periodo": "2018", "cantidad": 2997 }`, `{ "periodo": "Enero", "cantidad": 1885 }`, sin `"etiqueta"` ni `"porcentaje"`).
   - Sin embargo, en `src/features/geovisor/services/hurtos-api.ts` (`SerieTemporalItem`) y en `src/features/geovisor/components/geovisor-hurtos-panel.tsx` (líneas 614–678), el frontend accede directamente a:
     - Línea 633: `{item.etiqueta.slice(2)}`
     - Línea 660: `const mesCorto = item.etiqueta.slice(0, 3);`
   - En los tests unitarios pasaba porque los mocks usaban `etiqueta`, pero en producción contra FastAPI `item.etiqueta` es `undefined`, lanzando `TypeError: Cannot read properties of undefined (reading 'slice')` apenas abre el panel en `/geovisor`!
   - **Adicionalmente**, en `GET /api/v1/geodatos/analitica/hurtos/geojson`, cada polígono devuelve `top_armas: [{ "categoria": "...", "cantidad": ..., "porcentaje": ... }]` y `top_sitios: [{ "categoria": "...", "cantidad": ..., "porcentaje": ... }]`, mientras que el tooltip de hover en `src/features/geovisor/components/mapa-cartagena.tsx` (líneas 467 y 476) lee `hoverInfo.hurtoDetalle.top_armas[0].arma` y `hoverInfo.hurtoDetalle.top_sitios[0].sitio` (que dan `undefined`).

2. **Causa Raíz 2 — `404 (Not Found)` en recursos de imagen:**
   - En `/var/log/nginx/access.log` se identificó el 404 recurrente:
     - `GET /fotos/testimonios/ana_rosa_el_pozon.webp` (y las otras 3 fotos sembradas en `participacion_ciudadana.testimonios_comunitarios` por la migración `0024_testimonios_memoria.py`: `/fotos/testimonios/dionisio_la_boquilla.webp`, `/fotos/testimonios/yorledis_mandela.webp`, `/fotos/testimonios/carlos_getsemani.webp`), porque el directorio `public/fotos/testimonios/` no existe.

3. **Causa Raíz 3 — `sw.js:117 Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported`:**
   - En `public/sw.js` (líneas 42–55 y 95–123), el listener `fetch` no verifica que `url.protocol` sea `http:` o `https:` ni que `url.origin === self.location.origin`. Cuando una extensión de Chrome solicita un `.png` o `.svg` con esquema `chrome-extension://`, entra al bloque de las líneas 95–120 e intenta ejecutar `cache.put(request, responseClone)`, lo cual lanza una excepción no capturada en promesa.

4. **Causa Raíz 4 — Violación CSP `media-src` (`data:audio/wav;base64,...`):**
   - En `next.config.ts` (`construirCsp`, líneas 38–52), no está declarada la directiva `media-src`, por lo que cae en el fallback `default-src 'self'` y bloquea/reporta cualquier audio `data:` o `blob:`.

---

## 🛠️ INSTRUCCIONES TÉCNICAS PASO A PASO

### PASO 1: Blindaje Total Backend + Frontend en `serie_anual`, `serie_mensual`, `top_armas` y `top_sitios`

1. **En Backend (`backend/app/modules/geodatos/schemas.py` y `backend/app/modules/geodatos/repository.py`):**
   - En `SerieHurtoItem` (`schemas.py`): mantén `periodo: str` y `cantidad: int`, y agrega `etiqueta: str = ""` y `porcentaje: float = 0.0` (con `model_validator` o poblados directamente en `repository.py` de modo que `etiqueta = periodo` y `porcentaje = round(cantidad / total_casos * 100, 1)`).
   - En `obtener_hurtos_geojson` (`repository.py`): en los diccionarios dentro de `top_armas` incluye tanto `"categoria"` como `"arma"` (con el mismo valor), y en `top_sitios` incluye tanto `"categoria"` como `"sitio"` (con el mismo valor). Así tanto consumidores que lean `.categoria` como consumidores que lean `.arma` / `.sitio` tendrán siempre el string poblado.
2. **En Frontend (`src/features/geovisor/services/hurtos-api.ts`, `src/features/geovisor/components/geovisor-hurtos-panel.tsx` y `src/features/geovisor/components/mapa-cartagena.tsx`):**
   - En `SerieTemporalItem` (`hurtos-api.ts`): declara `etiqueta?: string; periodo?: string; cantidad: number; porcentaje?: number;`.
   - En `obtenerResumenHurtos` (`hurtos-api.ts`): normaliza la respuesta recibida de `apiFetch` antes de retornarla para garantizar que cada item de `serie_anual` y `serie_mensual` tenga siempre `etiqueta: String(item.etiqueta ?? item.periodo ?? "")` y `periodo: String(item.periodo ?? item.etiqueta ?? "")` y `porcentaje: Number(item.porcentaje ?? 0)`.
   - En `src/features/geovisor/components/geovisor-hurtos-panel.tsx` (líneas 612–680):
     - En `serie_anual.map`: usa `const etiqueta = String(item.etiqueta ?? item.periodo ?? "");` y luego `etiqueta.slice(2)` (nunca llames `.slice()` directamente sobre una propiedad sin fallback a `""`).
     - En `serie_mensual.map`: usa `const etiqueta = String(item.etiqueta ?? item.periodo ?? "");` y `const mesCorto = etiqueta.slice(0, 3);`.
   - En `src/features/geovisor/components/mapa-cartagena.tsx` (líneas 463–480):
     - Usa `hoverInfo.hurtoDetalle.top_armas[0].arma ?? hoverInfo.hurtoDetalle.top_armas[0].categoria` y `hoverInfo.hurtoDetalle.top_sitios[0].sitio ?? hoverInfo.hurtoDetalle.top_sitios[0].categoria` (actualizando el tipo en `use-mapa.ts` para incluir `categoria?: string`).

### PASO 2: Eliminación de los 404 de Fotos de Testimonios (`public/fotos/testimonios/`)

1. Crea el directorio `/root/polis/public/fotos/testimonios/` y coloca allí las 4 imágenes `.webp` válidas referenciadas en `bd_csh` (puedes copiar una de las imágenes `.webp` institucionales existentes en `public/images/` o generar 4 archivos `.webp` ligeros válidos):
   - `/root/polis/public/fotos/testimonios/ana_rosa_el_pozon.webp`
   - `/root/polis/public/fotos/testimonios/dionisio_la_boquilla.webp`
   - `/root/polis/public/fotos/testimonios/yorledis_mandela.webp`
   - `/root/polis/public/fotos/testimonios/carlos_getsemani.webp`
2. Verifica que `curl -I http://127.0.0.1:3000/fotos/testimonios/ana_rosa_el_pozon.webp` responda `HTTP/1.1 200 OK`.

### PASO 3: Corrección del Service Worker (`public/sw.js`) ante `chrome-extension://`

1. En `public/sw.js`:
   - Incrementa `const CACHE_NAME = "polis-pwa-v2";` para forzar la actualización inmediata del Service Worker en el navegador del usuario.
   - Al inicio del listener `self.addEventListener("fetch", (event) => { ... })`, justo después de `const url = new URL(request.url);`:
     ```js
     // Ignorar esquemas no HTTP/HTTPS (ej. chrome-extension://, data:, blob:) y orígenes externos
     if (
       (url.protocol !== "http:" && url.protocol !== "https:") ||
       url.origin !== self.location.origin
     ) {
       return;
     }
     ```
   - Además, en todas las llamadas a `cache.put(...)` dentro de `public/sw.js` (líneas 64, 108 y 117), encadena `.catch(() => {})` para que jamás pueda producirse un `Uncaught (in promise) TypeError` en `Cache.put`.

### PASO 4: Inclusión de `media-src` en Content-Security-Policy (`next.config.ts`)

1. En `next.config.ts` (`construirCsp`, alrededor de la línea 43):
   - Agrega `"media-src 'self' data: blob:",` justo después de `"font-src 'self' data:",`.
2. Revisa `backend/tests/test_cierre05_csp_report.py` (o cualquier test de CSP) para asegurarte de que todos los tests pasen al 100%.

---

## 🧪 CRITERIOS DE ACEPTACIÓN Y VERIFICACIÓN OBLIGATORIA

1. **Pruebas Unitarias Nuevas / Actualizadas:**
   - En `src/features/geovisor/services/hurtos-api.test.ts` y `src/features/geovisor/components/geovisor-hurtos-panel.test.tsx`: agrega un test donde el backend devuelva `{ periodo: "2024", cantidad: 2062 }` (sin `etiqueta`) y verifica que `obtenerResumenHurtos` y `GeovisorHurtosPanel` rendericen `"24"` y `"Ene"` sin lanzar `TypeError: Cannot read properties of undefined (reading 'slice')`.
2. **Quality Gates en 0 errores:**
   - `pytest backend/tests/test_geodatos_analitica_hurtos.py backend/tests/test_cierre05_csp_report.py` (100% pasando).
   - `bun test` (100% pasando).
   - `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .` — 0 errores).
   - `bun run build` (recuerda que `bun run build` copia `public` a `.next/standalone/public`, así que `sw.js` y `public/fotos/testimonios/*.webp` quedarán actualizados en el servidor standalone).
3. **Verificación Real con Playwright Headless en `http://127.0.0.1:3000/geovisor`:**
   - Reinicia `polis-backend` y `polis-frontend`.
   - Abre `http://127.0.0.1:3000/geovisor` con Playwright o verifica que:
     - `GET /api/v1/geodatos/analitica/hurtos/resumen` incluye tanto `periodo` como `etiqueta` y `porcentaje`.
     - `GET /fotos/testimonios/ana_rosa_el_pozon.webp` devuelve `200 OK`.
     - `GET /sw.js` sirve la versión `polis-pwa-v2` con el filtro de `url.protocol`.
     - El header `Content-Security-Policy-Report-Only` en `/geovisor` incluye `media-src 'self' data: blob:`.
4. **Censo `bd_csh` Intacto y Commit Local (Zero-Push):**
   - Verificar `33` mesas, `36` agendas, `11` fichas, `17` actores y `12.280` filas de hurtos.
   - Commit local en `main` y reporte en `bridge/02_resultado_agy2.md`.
