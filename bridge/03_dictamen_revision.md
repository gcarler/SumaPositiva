# DICTAMEN DE AUDITORÍA FORENSE EAF — TAREA [GEO-FIX-CONSOLE-01]
## CORRECCIÓN QUIRÚRGICA DE ERRORES EN CONSOLA DEL GEOVISOR (`TypeError: .slice()`, 404 RECURSOS, `sw.js` `chrome-extension` Y DIRECTIVA CSP `media-src`)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Estado del Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## 1. Verificación Forense de Entregables

1. **Resolución del Crash `TypeError: Cannot read properties of undefined (reading 'slice')` (`schemas.py`, `repository.py`, `hurtos-api.ts`, `geovisor-hurtos-panel.tsx`, `mapa-cartagena.tsx`, `use-mapa.ts`):**
   - **Backend:** `SerieTemporalItem` en `backend/app/modules/geodatos/schemas.py` y las consultas en `repository.py` devuelven ahora de forma simétrica `periodo`, `etiqueta` y `porcentaje` en `serie_anual` y `serie_mensual`. Asimismo, `TopCategoriaItem` expone claves duales (`categoria`, `arma`, `sitio`) en `top_armas` y `top_sitios`.
   - **Frontend:** `obtenerResumenHurtos` en `src/features/geovisor/services/hurtos-api.ts` normaliza defensivamente cada ítem temporal, y `src/features/geovisor/components/geovisor-hurtos-panel.tsx` protege todas las invocaciones a `.slice()` con `String(item.etiqueta ?? item.periodo ?? "")`. El tooltip de `src/features/geovisor/components/mapa-cartagena.tsx` resuelve `arma ?? categoria` y `sitio ?? categoria`.

2. **Eliminación de Errores `404 (Not Found)` de Recursos Estáticos (`public/fotos/testimonios/*.webp`):**
   - Verificado `HTTP/1.1 200 OK` (`image/webp`) para las 4 fotografías referenciadas en `participacion_ciudadana.testimonios_comunitarios`:
     - `/fotos/testimonios/ana_rosa_el_pozon.webp`
     - `/fotos/testimonios/dionisio_la_boquilla.webp`
     - `/fotos/testimonios/yorledis_mandela.webp`
     - `/fotos/testimonios/carlos_getsemani.webp`

3. **Guardia en Service Worker (`public/sw.js`):**
   - Caché actualizada a `polis-pwa-v2`.
   - El listener `fetch` descarta de inmediato cualquier URL cuyo protocolo no sea `http:` / `https:` o cuyo `origin !== self.location.origin` (evitando interceptar `chrome-extension://`), además de encadenar `.catch(() => {})` en `cache.put(...)`.

4. **Directiva `media-src` en Content Security Policy (`next.config.ts`):**
   - Verificado en la cabecera HTTP `Content-Security-Policy-Report-Only` en vivo que incluye `media-src 'self' data: blob:;`, eliminando el aviso de consola ante audios embebidos en `data:audio/wav;base64,...`.

---

## 2. Certificación Independiente de Calidad y Censo

- **Pruebas Backend (`pytest`):** `110 / 110 pasadas` (`test_geodatos_analitica_hurtos.py`, `test_cierre05_csp_report.py`, `test_access_policy.py`).
- **Pruebas Frontend (`bun test`):** `579 / 579 pasadas` (`73 / 73` en `src/features/geovisor/`).
- **Quality Gates (`bun run ui:check` + `tsc --noEmit` + `eslint .`):** `0 errores`.
- **Storybook (`bun run ui:test`):** `212 / 212 historias pasadas` con `axe-core`.
- **Build y Servicios:** `192 / 192` rutas compiladas y desplegadas en standalone; `polis-backend` y `polis-frontend` activos (`0 errores` de consola en Chromium headless sobre `/geovisor`).
- **Censo Institucional en `bd_csh`:** Intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores, `12.280` registros de hurtos).
