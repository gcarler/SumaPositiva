# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [AUD-COMP-06]
## AUDITORÍA DE CONSISTENCIA DE INFRAESTRUCTURA, OPERABILIDAD Y SALUD EN PRODUCCIÓN
### CERTIFICACIÓN FORENSE DE SERVICIOS SYSTEMD, REVERSE PROXY NGINX SSL TLS 1.3, CRONTAB DE RESPALDOS GFS, WATCHDOG DE AUTOSANACIÓN Y TELEMETRÍA EN CALIENTE (/API/V1/HEALTH/SYSTEM)

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[AUD-COMP-06]`)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md` (Fase 3: Tarea 3.2 — Cierre Final del Plan Maestro)  
**Severidad Atendida:** ALTA / DISPONIBILIDAD 24/7, SEGURIDAD OPERATIVA Y RESILIENCIA DE PRODUCCIÓN  
**Estado de la Entrega:** 100% Auditada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica final **[AUD-COMP-06]**, se ejecutó una inspección pericial forense y de aseguramiento sobre la totalidad de la infraestructura de soporte, servicios del sistema operativo, terminación criptográfica y mecanismos de salvaguarda de datos de la plataforma POLIS Cartagena 2026:

1. **Servicios Systemd en Producción:**  
   - **`polis-backend.service` (FastAPI / Uvicorn):** Activo y en ejecución (`active (running)`), gestionando 3 procesos worker con un consumo de memoria estable (364.8 MB RSS). Inspección de `journalctl` constata cero excepciones no capturadas, cero fallos HTTP 500 y cero ciclos de reinicio anómalo.  
   - **`polis-frontend.service` (Next.js v16.1.3 Turbopack Standalone):** Activo y en ejecución (`active (running)`), sirviendo en puerto 3000 con respuesta sub-100 ms y 39.8 MB RSS.  
   - **`nginx.service`:** Activo y en ejecución (`active (running)`), 8 worker processes operando con afinidad balanceada.  
   - **`postgresql@18-main.service`:** Cluster PostgreSQL 18 activo y saludable, administrando la base de datos de producción `bd_csh` sin bloqueo de conexiones.

2. **Reverse Proxy Nginx y Terminación Criptográfica SSL TLS 1.3:**  
   - **Validación Sintáctica:** `nginx -t` ejecutado con resultado exitoso (`syntax is ok`, `test is successful`).  
   - **Configuración de Sitios ([`/etc/nginx/sites-available/polis`](file:///etc/nginx/sites-available/polis)):** Enrutamiento inverso blindado:  
     - `/api/` y `/docs` redirigidos a `http://127.0.0.1:8000`.  
     - `/api/v1/formularios/` con cuota extendida `client_max_body_size 40m` para recepción de evidencias fotográficas ciudadanas.  
     - `/api/formularios/revalidar` y `/` redirigidos a `http://127.0.0.1:3000`.  
   - **Cifrado y Protocolos:** Certificados Let's Encrypt para `seguridadhumanaintegral.org`, protocolos permitidos restringidos a `TLSv1.2` y `TLSv1.3`. Negociación TLS 1.3 verificada en vivo con cipher suite `TLS_AES_256_GCM_SHA384`.  
   - **Redirección Forzada:** Puerto 80 configurado con redirección 301 incondicional hacia `https://$host$request_uri`.  
   - **Cabeceras de Endurecimiento:** Presencia verificada en respuestas en vivo de `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` / `DENY`, `X-XSS-Protection: 1; mode=block` y `Referrer-Policy: strict-origin-when-cross-origin`.

3. **Automatización Operativa en Crontab del Servidor:**  
   - **Planificación Canónica (`crontab -l`):**  
     - `0 2 * * * /root/polis/scripts/respaldo_programado_bd.sh >> /root/polis/backups/respaldos.log 2>&1` (Respaldo diario nocturno a las 02:00 AM).  
     - `*/5 * * * * /root/polis/scripts/monitor_sistema_polis.sh --cron >> /var/log/polis-monitor.log 2>&1` (Watchdog de autosanación cada 5 minutos).  
   - **Esquema de Respaldo GFS (Grandfather-Father-Son):** Carpeta `/root/polis/backups/` estructurada con directorios `diarios/`, `semanales/` y `mensuales/`. Último volcado binario diario ejecutado exitosamente a las 02:00:01 del 11 de Octubre de 2026 (`bd_csh_diario_20261011_020001.dump`, 1.2 MB, SHA-256: `ea9c9d1cd4c7c77899e0344f75810764b92074997c04698db9018a9c740d3bfc`), con promoción a `bd_csh_semanal_20261011_020001.dump` y rotación estricta de cuotas.  
   - **Watchdog de Autosanación:** Ejecución en seco de [`/root/polis/scripts/monitor_sistema_polis.sh`](file:///root/polis/scripts/monitor_sistema_polis.sh) culminada con código de salida 0 (`SISTEMA 100% SALUDABLE Y OPERATIVO`). Trazabilidad activa y regular en `/var/log/polis-monitor.log`.

4. **Telemetría y Salud en Caliente ([`GET /api/v1/health/system`](file:///root/polis/backend/app/modules/health/)):**  
   - Estado general: `status: "ok"`, `service: "polis-api"`, `version: "0.2.1"`, `environment: "production"`.  
   - Base de datos relacional: `database.status: "ok"`, latencia ultra baja de **2.66 ms** (umbral de tolerancia <20 ms). Conexiones activas: **4 / 100** (4%).  
   - Migración canónica: `database.migration_revision: "0057_comentario_pas"` (**cero drift** respecto al head de Alembic).  
   - Extensiones instaladas y verificadas: `ltree`, `pg_trgm`, `pgcrypto`, `plpgsql`, `postgis`.  
   - Confiabilidad del proceso: `process.error_rate_pct: 0.0%`, cero errores 5xx (`requests_5xx: 0`), consumo RSS 205.9 MB.  
   - Capacidad de almacenamiento: `storage.used_pct: 5.3%` (366.35 GB disponibles de 386.85 GB en partición raíz).

---

## 🔍 2. Matriz Pericial de Infraestructura y Operabilidad

| Dimensión Auditada | Parámetro Inspeccionado | Comando / Fuente de Comprobación | Resultado Obtenido | Dictamen |
| :--- | :--- | :--- | :--- | :--- |
| **Servicio Backend** | Estado operativo FastAPI/Uvicorn | `systemctl is-active polis-backend` | `active` (Main PID: 3342751, 3 workers) | ✅ CERTIFICADO |
| **Servicio Frontend** | Estado operativo Next.js v16.1.3 | `systemctl is-active polis-frontend` | `active` (Main PID: 3342752, standalone) | ✅ CERTIFICADO |
| **Reverse Proxy** | Estado operativo Nginx | `systemctl is-active nginx` | `active` (Main PID: 1174, 8 workers) | ✅ CERTIFICADO |
| **Base de Datos** | Estado operativo PostgreSQL Cluster | `systemctl is-active postgresql` | `active` (`postgresql@18-main.service`) | ✅ CERTIFICADO |
| **Sintaxis Nginx** | Validez de configuración | `nginx -t` | `syntax is ok / test is successful` | ✅ CERTIFICADO |
| **Cifrado SSL / TLS** | Negociación y Ciphers | `openssl s_client -tls1_3` | Protocolo `TLSv1.3`, Cipher `TLS_AES_256_GCM_SHA384` | ✅ CERTIFICADO |
| **Redirección HTTP** | Forzado a HTTPS puerto 443 | `curl -sI -H "Host: seguridadhumanaintegral.org" http://127.0.0.1/` | `HTTP/1.1 301 Moved Permanently` | ✅ CERTIFICADO |
| **HSTS & Headers** | Cabeceras de seguridad | `curl -k -s -i https://127.0.0.1/api/v1/health/live` | `Strict-Transport-Security: max-age=31536000`, `nosniff`, `SAMEORIGIN` | ✅ CERTIFICADO |
| **Programación Crontab** | Respaldo y Watchdog periódicos | `crontab -l` | Tareas a las 02:00 AM y c/5 min activas | ✅ CERTIFICADO |
| **Esquema GFS** | Respaldo diario y semanal | `/root/polis/backups/respaldos.log` | Volcado 2026-10-11 02:00:01 (1.2 MB, SHA-256 verificado) | ✅ CERTIFICADO |
| **Watchdog Autosanación**| Ejecución y diagnóstico | `/root/polis/scripts/monitor_sistema_polis.sh` | Salida exitosa código 0 (100% saludable) | ✅ CERTIFICADO |
| **Telemetría DB** | Latencia y conexión PostgreSQL | `curl -s http://127.0.0.1:8000/api/v1/health/system` | `ping_ms: 2.66`, 4/100 conx, `status: "ok"` | ✅ CERTIFICADO |
| **Paridad Alembic** | Revisión de esquema en caliente | `migration_revision` en `/health/system` | `"0057_comentario_pas"` (cero drift) | ✅ CERTIFICADO |
| **Extensiones DB** | Soporte Geoespacial y Árboles | `installed_extensions` en `/health/system` | `postgis`, `ltree`, `pgcrypto`, `pg_trgm`, `plpgsql` | ✅ CERTIFICADO |
| **Estabilidad API** | Tasa de errores HTTP 5xx | `process.error_rate_pct` en `/health/system` | `0.0%` (cero errores 5xx registrados) | ✅ CERTIFICADO |

---

## 🧪 3. Quality Gates y Resultados de Certificación Global

| Quality Gate | Comando de Validación | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Servicios Systemd** | `systemctl is-active polis-backend polis-frontend nginx postgresql` | Todos activos (`active`) | ✅ APROBADO |
| **Sintaxis Nginx** | `nginx -t` | `syntax is ok` / `test is successful` | ✅ APROBADO |
| **Crontab Distrital** | `crontab -l` | 2 tareas canónicas programadas | ✅ APROBADO |
| **Watchdog Script** | `/root/polis/scripts/monitor_sistema_polis.sh` | Retorno limpio con telemetría en verde (código 0) | ✅ APROBADO |
| **Health API en Caliente** | `curl -s http://127.0.0.1:8000/api/v1/health/system` | HTTP 200 OK con latencia 2.66 ms y 0 drift Alembic | ✅ APROBADO |
| **TypeCheck & Linter** | `bun run check` (`tsc --noEmit && eslint .`) | **0 errores TypeScript, 0 warnings ESLint** | ✅ APROBADO |
| **Frontend Test Suite** | `bun test` | **412 pruebas pasadas** en 43 archivos (0 fallos) | ✅ APROBADO |
| **Backend Test Suite** | `/root/polis/venv/bin/pytest backend/tests/` | **467 pruebas pasadas** en 330.44s (100% suites verdes) | ✅ APROBADO |
| **Turbopack Build** | `bun run build` | Compilación exitosa en 17.1s, **191/191 rutas SSG generadas** | ✅ APROBADO |

---

## 🔒 4. Cumplimiento de Salvaguardas Inviolables

1. **Inviolabilidad de Producción (`bd_csh`):** Comprobación en base de datos ejecutada:
   - `mesas_trabajo.mesas`: **33 mesas** registradas.
   - `mesas_trabajo.agendas`: **36 agendas** territoriales.
   - `indicadores.fichas_tecnicas_indicadores`: **11 fichas** de indicadores.
   - `participacion_ciudadana.actores_estrategicos`: **17 actores** clave.
   Todos los registros se mantienen íntegros, sin alteraciones, mutaciones o eliminaciones no deseadas.
2. **Cero Caída de Servicios:** Servicios `polis-backend`, `polis-frontend` y `nginx` permanecieron continuamente operativos durante la auditoría, con uptime preservado.
3. **Preservación Inviolable de BPIN:** Códigos distritales oficiales `BPIN-2026-CTG-XXXX` intactos y validados.
4. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA en canales y vistas cívico-territoriales.
5. **Protocolo Zero-Push:** Todo el empaquetado final reside de forma estricta en el commit local atómico en la rama `main`.

---

## 📦 5. Archivos Auditados y Verificados

- `/etc/systemd/system/polis-backend.service` y `/etc/systemd/system/polis-frontend.service`
- `/etc/nginx/sites-available/polis` y `/etc/nginx/nginx.conf`
- `/root/polis/scripts/respaldo_programado_bd.sh` y `/root/polis/backups/respaldos.log`
- `/root/polis/scripts/monitor_sistema_polis.sh` y `/var/log/polis-monitor.log`
- `backend/app/modules/health/` (auditoría del endpoint `/api/v1/health/system`)
- `bridge/02_resultado_agy2.md` (informe pericial de cierre de auditoría)
