# TAREA ACTIVA: [SEC-HARDEN-02] ENDURECIMIENTO DE NGINX: RATE LIMITING, REDIRECCIÓN 301 UNIVERSAL Y CABECERAS AVANZADAS
## PROTECCIÓN CONTRA SATURACIÓN DE VOTOS/FORMULARIOS CÍVICOS, FORZADO LIMPIO DE HTTPS Y BLINDAJE HTTP

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 1: Blindaje Perimetral, Seguridad de Red y Hardening de Servidor (Tarea 1.2 — Cierre de Fase 1)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / DISPONIBILIDAD, MITIGACIÓN DoS Y BLINDAJE DE FE PÚBLICA CÍVICA  

---

## 🎯 1. Justificación y Alcance de la Tarea

Nginx es la primera línea de defensa de POLIS frente a internet. Actualmente, carece de mecanismos de limitación de tasa de peticiones (`limit_req_zone`), lo que expone a los formularios cívicos (`/barrio`, `/asistencia/`, `/f/`) y a la API a riesgos de saturación, ataques de denegación de servicio (DoS) o scripts automatizados de votación. Además, el bloque del puerto 80 retorna 404 en dominios secundarios en lugar de aplicar una redirección 301 incondicional a HTTPS.

El objetivo de esta tarea es implementar un endurecimiento exhaustivo en `/etc/nginx/sites-available/polis`:
1. **Rate Limiting Segmentado:**
   - Zona general de API (`api_general`): 30 req/s con burst de 50.
   - Zona estricta de participación cívica (`civic_forms`): 5 req/s con burst de 10 sobre endpoints de formularios y radicación de propuestas/asistencias.
   - Configuración de `limit_req_status 429` (HTTP 429 Too Many Requests) para retroalimentar con el código estándar RFC 6585.
2. **Redirección Universal 301 en Puerto 80:**
   - Redirección incondicional hacia `https://$host$request_uri` para cualquier Host, eliminando retornos 404 accidentales.
3. **Cabeceras de Endurecimiento Avanzadas:**
   - HSTS con `preload`: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.
   - Preservación de `X-Content-Type-Options: nosniff` y `X-Frame-Options: SAMEORIGIN`.

---

## 📋 2. Requerimientos Técnicos y Pasos de Ejecución

### A. Configuración de Rate Limiting
1. En `/etc/nginx/sites-available/polis` (o `/etc/nginx/conf.d/security.conf`):
   - Definir:
     ```nginx
     limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
     limit_req_zone $binary_remote_addr zone=civic_forms:10m rate=5r/s;
     limit_req_status 429;
     ```
   - Aplicar `limit_req zone=api_general burst=50 nodelay;` en `location /api/`.
   - Aplicar `limit_req zone=civic_forms burst=10 nodelay;` en `location /api/v1/formularios/`.

### B. Redirección Universal HTTP 301 en Puerto 80
1. Reemplazar las cláusulas condicionales del bloque server en puerto 80 por:
   ```nginx
   server {
       listen 80 default_server;
       listen [::]:80 default_server;
       server_name _;
       return 301 https://$host$request_uri;
   }
   ```

### C. Cabeceras de Seguridad Avanzadas
1. En el bloque server 443, incorporar:
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-XSS-Protection "1; mode=block" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
   ```

### D. Validación y Recarga de Nginx
1. Comprobar sintaxis: `nginx -t`.
2. Recargar configuración: `systemctl reload nginx`.
3. Comprobar en vivo:
   - `curl -sI http://127.0.0.1/` -> HTTP/1.1 301 Moved Permanently con `Location: https://...`.
   - `curl -k -sI https://127.0.0.1/` -> HTTP/1.1 200 OK con cabeceras de seguridad activas.

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Sintaxis Nginx** | `nginx -t` | `syntax is ok / test is successful` |
| **Redirección 301 Puerto 80** | `curl -sI http://127.0.0.1/` | `HTTP/1.1 301 Moved Permanently` |
| **Cabeceras HSTS & Permissions** | `curl -k -sI https://127.0.0.1/` | HSTS preload y Permissions-Policy presentes |
| **Estado Nginx** | `systemctl is-active nginx` | `active` |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 412/412 pasadas |

---

## 📦 4. Entregables y Salvaguardas

1. **Informe Pericial:** Registrar en `bridge/02_resultado_agy2.md` la salida de `nginx -t`, cabeceras HTTP y verificación de redirección 301.
2. **Salvaguardas Inviolables:**
   - Cero caída o interrupción de certificados SSL Let's Encrypt.
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas).
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `sec(nginx): rate limiting redireccion 301 universal y cabeceras de endurecimiento SEC-HARDEN-02`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial y cierre de Fase 1.
