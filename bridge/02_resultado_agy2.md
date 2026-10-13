# INFORME DE RESULTADO Y AUDITORÍA: TAREA [CIERRE-05]
**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tarea Activa:** `[CIERRE-05] CSP Endurecida, Recolección de Violaciones y Despliegue en Producción (Fase Beta)`  
**Plan Maestro:** `bridge/00_plan_maestro_cierre_operativo.md` (Sección EXTENSIÓN + ACTUALIZACIÓN DE REGLAS)

---

## 🎯 1. Resumen Ejecutivo de la Tarea

En cumplimiento de la autorización expresa del propietario/usuario para trabajar directamente en producción bajo fase beta, se implementó, certificó y desplegó con éxito el endurecimiento de la **Content-Security-Policy (CSP)**, la infraestructura de recolección de telemetría de violaciones y la eliminación de la ejecución de cadenas dinámicas en el frontend.

### Logros Principales:
1. **CSP Endurecida por Entorno**:
   - Eliminación total de `'unsafe-eval'` en `script-src` en producción.
   - Acotamiento estricto de `connect-src`: erradicados `ws:`, `wss:`, `localhost` y `127.0.0.1`.
   - Modo por defecto: **`Report-Only`** (`Content-Security-Policy-Report-Only`), conmutador `POLIS_CSP_ENFORCE=true` preparado para cuando EAF ordene el modo restrictivo.
   - Inclusión de directivas `report-uri /api/v1/seguridad/csp-report; report-to csp-endpoint;` y cabecera `Reporting-Endpoints`.
2. **Erradicación de Evaluación de Cadenas en Cliente (`new Function`)**:
   - Durante la auditoría en vivo se descubrió que Zod v4 utilizaba compilación JIT (`new Function(...)`) al analizar esquemas de objetos.
   - Se implementó `src/core/zod-init.ts` (`z.config({ jitless: true })`), desactivando la compilación JIT y eliminando el 100% de las violaciones de evaluación dinámica.
3. **Endpoint de Recolección de Violaciones (`POST /api/v1/seguridad/csp-report`)**:
   - Endpoint público y seguro con rate-limiting por IP (60 req/min por defecto), tamaño máximo de 32 KB (HTTP 413 si excede) y sanitización automática de PII (remueve parámetros de consulta y fragmentos).
   - Compatible con formato clásico CSP (`csp-report`) y W3C Reporting API v1. Retorna HTTP `204 No Content`.
   - Documentado en `docs/permisos-api.md` y cubierto en `backend/tests/test_access_policy.py` y `test_cierre05_csp_report.py`.
4. **Despliegue y Validación en Producción (Fase Beta)**:
   - Respaldo previo de configuración de Nginx en `/root/polis/backups/nginx_polis_20261013_032549.conf`.
   - Verificación previa de sintaxis: `nginx -t` exitoso.
   - Recarga controlada de Nginx y reinicio de servicios `polis-backend` y `polis-frontend`.
   - Validación automatizada en vivo con Playwright (`scripts/validar-cierre05-csp.mjs`): **0 violaciones de CSP** en 11 pruebas sobre 8 rutas críticas.

---

## 🔒 2. Respaldo y Salvaguardas de Producción

| Salvaguarda | Verificación / Ruta | Estado |
|---|---|---|
| **Respaldo de Nginx** | `/root/polis/backups/nginx_polis_20261013_032549.conf` | ✅ GENERADO Y VERIFICADO |
| **Snippet de CSP Nginx** | `/etc/nginx/snippets/polis-csp.conf` | ✅ SINCRONIZADO |
| **Validación de Sintaxis** | `nginx -t` | ✅ `syntax is ok / test is successful` |
| **Estado de Servicios** | `systemctl is-active polis-frontend polis-backend nginx postgresql@18-main` | ✅ **TODOS `active`** |
| **Inviolabilidad Censo** | `bd_csh` (33 mesas, 36 agendas, 11 fichas, 17 actores) | ✅ **100% INTACTO** |
| **Credenciales y Secretos** | Sin credenciales inventadas ni exposición de secretos | ✅ CUMPLIDO |

---

## 🌐 3. Cabeceras Exactas Emitidas en Producción (HTTPS 443)

Comprobación realizada en vivo mediante:
```bash
curl -sI -k https://127.0.0.1/ -H "Host: seguridadhumanaintegral.org"
```

```http
HTTP/1.1 200 OK
Server: nginx/1.28.3 (Ubuntu)
Date: Tue, 13 Oct 2026 03:30:46 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 160427
Connection: keep-alive
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
X-Powered-By: Next.js
Cache-Control: s-maxage=31536000
ETag: "10ajcit4kp23fh0"
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.tile.osm.org https://*.googleusercontent.com https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://images.unsplash.com https://api.qrserver.com; font-src 'self' data:; connect-src 'self' https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://accounts.google.com; frame-src 'self' https://accounts.google.com https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; report-uri /api/v1/seguridad/csp-report; report-to csp-endpoint;
Reporting-Endpoints: csp-endpoint="/api/v1/seguridad/csp-report"
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

### Cabeceras Emitidas por FastAPI Backend (`/api/v1/health/live`):
```http
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

---

## 🎭 4. Resultados de Validación Playwright en Producción (En Vivo)

Ejecución del script `scripts/validar-cierre05-csp.mjs` contra `https://seguridadhumanaintegral.org` (certificado en `docs/evidencia-cierre05-csp-endurecida.json`):

| Ruta Auditada | Módulo / Propósito | Estado HTTP | Tiempo Carga | Violaciones CSP | Comprobación Específica | Resultado |
|---|---|---|---|---|---|---|
| `/` | Portada Pública Distrital | `200 OK` | 1,188 ms | **0** | Componentes e imágenes íntegros | ✅ PASS |
| `/geovisor` | Geovisor Distrital Pantalla Completa | `200 OK` | 1,337 ms | **0** | Teselas OSM y Canvas OpenLayers renderizado | ✅ PASS |
| `/barrio` | Modo Barrio (Bajo Ancho de Banda) | `200 OK` | 977 ms | **0** | Vistas cívicas sin desborde | ✅ PASS |
| `/f/reporte-inseguridad` | Formulario Cívico de Reporte | `200 OK` | 2,810 ms | **0** | Esquemas Zod parseados sin evaluación JIT | ✅ PASS |
| `/asistencia/mt-001` | Asistencia de Mesa (QR y Registro) | `200 OK` | 1,525 ms | **0** | Generador QR y formulario interactivo | ✅ PASS |
| `/plataforma` | Acceso Institucional (Google OAuth) | `200 OK` | 2,572 ms | **0** | Interfaz de Acceso y Google Auth listos | ✅ PASS |
| `/plataforma/geovisor` | Geovisor de Plataforma | `200 OK` | 1,810 ms | **0** | Panel de mapa y capas administrativas | ✅ PASS |
| `/plataforma/comunicaciones` | Comunicaciones y Medios | `200 OK` | 1,527 ms | **0** | Reproductores y galerías autorizadas | ✅ PASS |
| `/api/v1/seguridad/csp-report` | Telemetría CSP (Report-URI & W3C API) | `204 No Content` | 12 ms | **0** | Sanitización PII, rate-limit y buffer OK | ✅ PASS |

**Total de Pruebas:** 11  
**Exitosas:** 11  
**Fallidas:** 0  
**Violaciones CSP detectadas en vivo:** **0**

---

## 🧪 5. Matriz de Quality Gates (100% Verde)

| Quality Gate | Comando / Prueba | Criterio de Éxito | Resultado Obtenido | Estado |
|---|---|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | 0 violaciones | **0 infracciones** | ✅ CERTIFICADO |
| **TypeCheck TypeScript** | `bun run typecheck` (`tsc --noEmit`) | 0 errores | **0 errores** | ✅ CERTIFICADO |
| **Linter ESLint** | `bun run lint` (`eslint .`) | 0 warnings, 0 errores | **0 warnings, 0 errores** | ✅ CERTIFICADO |
| **Suite Completa Frontend** | `bun test` | 100% pasadas (0 fail) | **500/500 PASADAS** (57 archivos) | ✅ CERTIFICADO |
| **Suite Backend Completa** | `uv run --project backend pytest backend/tests` | 100% pasadas (0 fail) | **507/507 PASADAS** (502 previas + 5 de telemetría CSP) | ✅ CERTIFICADO |
| **Pruebas de Telemetría CSP** | `pytest backend/tests/test_cierre05_csp_report.py` | 5/5 pasadas | **5/5 PASADAS** (report-uri, reporting API, sanitización PII, tamaño 413, rate limit 429) | ✅ CERTIFICADO |
| **Matriz de Permisos RBAC** | `pytest backend/tests/test_access_policy.py` | 97/97 pasadas | **97/97 PASADAS** (permiso público para `/csp-report`) | ✅ CERTIFICADO |
| **Alembic Drift Check** | `alembic check` | 0 diferencias | **No new upgrade operations detected** | ✅ CERTIFICADO |
| **Validación Playwright Producción** | `node scripts/validar-cierre05-csp.mjs` | 0 violaciones CSP en vivo | **11/11 PASADAS (0 violaciones)** | ✅ CERTIFICADO |
| **Inviolabilidad Censo `bd_csh`** | Consulta directa en PostgreSQL 18 | 33 mesas, 36 agendas, 11 fichas, 17 actores | **33 mesas, 36 agendas, 11 fichas, 17 actores intactos** | ✅ CERTIFICADO |

---

## 📦 6. Inventario de Archivos Modificados y Entregables

| Archivo | Estado | Descripción del Cambio |
|---|---|---|
| `backend/app/core/config.py` | Modificado | Variable de configuración `csp_report_limite_ip: int = 60` |
| `backend/app/modules/seguridad/` | **Nuevo** | Módulo de seguridad y endpoint colector de telemetría CSP (`schemas.py`, `router.py`) |
| `backend/app/api/router.py` | Modificado | Registro del router `seguridad_router` bajo prefijo `/api/v1` |
| `docs/permisos-api.md` | Modificado | Documentación de acceso público para `POST /api/v1/seguridad/csp-report` |
| `backend/tests/test_access_policy.py` | Modificado | Registro de la tupla `("POST", "/api/v1/seguridad/csp-report")` en lista blanca de operaciones públicas |
| `backend/tests/test_cierre05_csp_report.py` | **Nuevo** | Suite de pruebas unitarias del endpoint colector de violaciones CSP |
| `src/core/zod-init.ts` | **Nuevo** | Configuración de Zod en modo `jitless: true` para eliminar compilación de cadenas dinámicas |
| `src/app/_composition/query-provider.tsx` | Modificado | Importación de `@/core/zod-init` en el árbol de proveedores raíz de React |
| `src/app/layout.tsx` | Modificado | Importación de `@/core/zod-init` en el layout raíz |
| `src/features/sesion/services/identidad-api.ts` | Modificado | Importación de `@/core/zod-init` previa a definición de esquemas de sesión |
| `src/features/formularios/services/formulario-schema.ts` | Modificado | Importación de `@/core/zod-init` previa a definición de esquemas de formularios |
| `next.config.ts` | Modificado | Configuración CSP de producción sin `'unsafe-eval'`, `connect-src` acotado, `Report-Only` por defecto y `Reporting-Endpoints` |
| `docs/nginx-csp-polis.conf` | Modificado | Plantilla de Nginx actualizada con directivas de CIERRE-05 en `Report-Only` y endpoints de reporte |
| `/etc/nginx/snippets/polis-csp.conf` | **Desplegado** | Snippet activo en el servidor Nginx de producción |
| `/etc/nginx/sites-available/polis` | **Desplegado** | Inclusión de snippet y directivas `proxy_hide_header` para evitar duplicación de cabeceras |
| `/root/polis/backups/nginx_polis_20261013_032549.conf` | **Respaldo** | Copia fiel de seguridad de la configuración previa de Nginx |
| `docs/despliegue-produccion.md` | Modificado | Actualización de la Sección 7 con justificación de `'unsafe-inline'`, riesgo residual y endpoint de telemetría |
| `scripts/validar-cierre05-csp.mjs` | **Nuevo** | Script automatizado de validación Playwright y cabeceras en producción |
| `docs/evidencia-cierre05-csp-endurecida.json` | **Nuevo** | Evidencia digital de validación en vivo con 0 violaciones |
| `bridge/02_resultado_agy2.md` | Actualizado | Presente informe de entrega de la tarea CIERRE-05 |

---

## 🔒 7. Estado Final y Notificación a EAF

- Tarea `[CIERRE-05]` completada y desplegada al 100% en producción bajo fase beta.
- Todos los servicios de producción (`polis-frontend`, `polis-backend`, `nginx`, `postgresql@18-main`) verificados y operando en estado `active`.
- Calidad de código y pruebas certificadas al 100% (500 pruebas frontend, 507 pruebas backend, 0 errores TypeScript/ESLint, 0 drift Alembic).
- Evidencia digital estructurada disponible en [`docs/evidencia-cierre05-csp-endurecida.json`](file:///root/polis/docs/evidencia-cierre05-csp-endurecida.json).
- Base de datos censal `bd_csh` estrictamente conservada (33 mesas, 36 agendas, 11 fichas, 17 actores).
- Se genera el commit local atómico en `main` y se notifica al auditor `agy` en el panel `agy:0` para emitir el dictamen correspondiente antes de iniciar `[CIERRE-06]`.
