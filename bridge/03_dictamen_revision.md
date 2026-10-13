# DICTAMEN EAF — [MESA-UBIC-01] Ubicación de la mesa: clic en mapa, URL de mapas o coordenadas planas y geovisor

**Auditor:** `agy` — **Commit evaluado:** `00751f3` — **Fecha:** 13-oct-2026  
**Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## 1. Verificación Técnica Independiente

- **Censo de Datos `bd_csh` Intacto:**
  - `mesas_trabajo.mesas`: 33
  - `mesas_trabajo.agendas`: 36
  - `indicadores.fichas_tecnicas_indicadores`: 11
  - `participacion_ciudadana.actores_estrategicos`: 17
  - Sin alteraciones ni truncamientos en la base de datos canónica.
- **Alembic & Esquema:**
  - Cabeza única `0060_ambito_territorial (head)`.
  - `alembic check` reporta cero operaciones de actualización (0 drift).
  - No se requirieron migraciones de base de datos; la persistencia se realiza limpiamente en la columna JSONB `metadatos` (`metadatos.coordenadas`, `metadatos.urlMapa`, `metadatos.aforo`).
- **Pruebas de Backend (Pytest):**
  - Ejecutada suite `tests/test_geovisor_ubicacion_mesa.py`, `tests/test_mesas_agenda.py` y `tests/test_mesas_ltree.py`: 4 pasadas / 0 fallidas.
  - Comprobado que el endpoint `/api/v1/mesas/geovisor` retorna `tipo_ubicacion="coordenada_registrada"` cuando existen coordenadas en metadatos y preserva el fallback al centroide territorial cuando no están presentes.
- **Pruebas de Frontend (Bun Test):**
  - **529 pasadas / 0 fallidas** en 59 suites (incluye 22 pruebas del parser de coordenadas, 3 del selector de mapa y 8 del contrato geovisor).
- **Quality Gates de Frontend:**
  - `bun run ui:check` (política de tokens, capas y accesibilidad): Conforme.
  - `tsc --noEmit`: 0 errores de tipado.
  - `eslint .`: 0 advertencias y 0 errores.
- **Pruebas E2E Playwright (`scripts/mesa-ubicacion-e2e.mjs`):**
  - Ejecución independiente completada con 6/6 casos aprobados en Desktop (1440px) y Mobile (375px) en entorno aislado sin alterar `bd_csh`.
  - Capturas de evidencia registradas en `/tmp/polis-e2e-mesa-ubicacion/`. Cero desbordamiento horizontal en 375px.

---

## 2. Requerimientos Funcionales y de Seguridad Auditados

1. **Tres vías funcionales para fijar ubicación:**
   - **Vía 1 (Clic en mapa):** Componente `SelectorUbicacionMesa` con OpenLayers, carga dinámica (`ssr: false`), recentrado a Cartagena y sincronización reactiva de lat/lng.
   - **Vía 2 (URL de mapas):** Soporta Google Maps (`@lat,lng`, `!3d!4d`, `?q=`, `query=`, `ll=`, `destination=`), OpenStreetMap (`#map=`, `mlat`/`mlon`) y Waze (`ll=`).
   - **Vía 2b (Seguridad SSRF):** Enlaces acortados (`maps.app.goo.gl`, `goo.gl/maps`, `bit.ly/`, etc.) no se resuelven en el backend; se despliega aviso preventivo al usuario para que pegue la URL expandida o use el mapa.
   - **Vía 3 (Coordenadas planas combinadas):** Campo único para `lat, lng` con separadores coma, espacio o punto y coma, y campos individuales Latitud/Longitud sincronizados bidireccionalmente.
   - **Límites de Cartagena:** Advertencia no bloqueante si las coordenadas caen fuera del polígono distrital (lat 10.1–10.6, lng −75.8–−75.3).
2. **Editor de Mesas (`mesa-editor-panel.tsx`):**
   - La sección «3. Ubicación y logística» se inicializa abierta por defecto tanto para creación como para edición.
3. **Consumo en Geovisor y Fichas:**
   - En `/api/v1/mesas/geovisor`, las mesas con coordenadas asignadas se exponen con `tipo_ubicacion="coordenada_registrada"`.
   - Tanto la ficha de detalle de la mesa (`mesa-panel.tsx`) como la ficha del geovisor (`geovisor-ficha-mesa.tsx`) presentan las coordenadas y un botón/enlace interactivo «Cómo llegar» a Google Maps.

---

## 3. Estado de Despliegue en Producción

- **Servicios Systemd:** `polis-frontend`, `polis-backend`, `nginx`, `postgresql@18-main` activos.
- **Compilación Frontend:** `.next/BUILD_ID` actualizado (11:10 UTC) y servicios reiniciados a las 11:12:52 UTC.
- **Endpoints en Vivo:**
  - `/` -> HTTP 200
  - `/geovisor` -> HTTP 200
  - `/plataforma/mesas` -> HTTP 200
  - `/api/v1/health/live` -> HTTP 200
  - `/api/v1/mesas/geovisor` -> HTTP 200 (33 mesas retornadas correctamente con `coordenada_registrada`).
