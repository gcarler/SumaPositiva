# TAREA ACTIVA: [AUD-COMP-06] AUDITORÍA DE CONSISTENCIA DE INFRAESTRUCTURA, OPERABILIDAD Y SALUD EN PRODUCCIÓN
## VERIFICACIÓN DE SERVICIOS SYSTEMD, REVERSE PROXY NGINX SSL TLS 1.3, CRONTAB DE RESPALDOS GFS, WATCHDOG DE AUTOSANACIÓN Y TELEMETRÍA EN CALIENTE (/API/V1/HEALTH/SYSTEM)

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Consistencia Normativa, UI-Policy y Resiliencia Operativa (Tarea 3.2 — CIERRE FINAL DEL PLAN MAESTRO)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / DISPONIBILIDAD 24/7, SEGURIDAD OPERATIVA Y RESILIENCIA DE PRODUCCIÓN  

---

## 🎯 1. Justificación y Alcance de la Tarea

Esta es la sexta y última tarea del **Plan Maestro de Auditoría Técnica de Completitud y Consistencia**. Tras haber verificado la coherencia de esquemas y modelos (Fase 1), la completitud E2E y erradicación de mocks en frontend y territorio (Fase 2), y el blindaje normativo, de capas UI y accesibilidad (Fase 3.1), corresponde auditar y certificar la infraestructura de soporte y la operabilidad continua del sistema en el entorno distrital.

La auditoría abarcará cuatro (4) dimensiones críticas de infraestructura:
1. **Servicios Systemd en Producción:**
   - Comprobar estado operativo, estabilidad y ausencia de reinicios anómalos de `polis-backend.service`, `polis-frontend.service`, `nginx` y `postgresql`.
2. **Reverse Proxy Nginx y Terminación Criptográfica SSL TLS 1.3:**
   - Verificar la configuración de Nginx en `/etc/nginx/sites-available/` y `/etc/nginx/sites-enabled/`.
   - Comprobar redirección forzada de tráfico inseguro (HTTP 80 -> HTTPS 443), protocolos seguros (TLS 1.2 / TLS 1.3) para `https://seguridadhumanaintegral.org/`, cabeceras de endurecimiento HSTS y proxy pass hacia backend (8000) y frontend (3000).
3. **Automatización Operativa en Crontab del Servidor:**
   - **Respaldos GFS (`/root/polis/scripts/respaldo_programado_bd.sh`):** Ejecución a las 02:00 AM, política de retención diaria/semanal/mensual, integridad de `/root/polis/backups/` y rotación de volcados PostgreSQL.
   - **Watchdog de Autosanación (`/root/polis/scripts/monitor_sistema_polis.sh --cron`):** Ejecución programada cada 5 minutos, consulta al endpoint de salud, detección temprana de anomalías, reinicio automático y trazabilidad en `/var/log/polis-monitor.log`.
4. **Telemetría y Estado de Salud en Vivo (`/api/v1/health/system`):**
   - Corroborar en caliente la latencia de PostgreSQL (<20 ms), conexiones activas en `pg_stat_activity`, coincidencia de migración canónica (`0057_comentario_pas`), consumo de memoria RSS, capacidad de disco y tasa de errores 0.0%.

---

## 📋 2. Puntos de Inspección Forense y Verificaciones Requeridas

### A. Diagnóstico de Servicios del Sistema
1. Ejecutar y documentar el estado de los servicios:
   - `systemctl status polis-backend.service` (FastAPI / Uvicorn en puerto 8000).
   - `systemctl status polis-frontend.service` (Next.js en puerto 3000).
   - `systemctl status nginx` (Proxy inverso).
   - `systemctl status postgresql` (Motor relacional `bd_csh`).
2. Verificar que los logs de journald (`journalctl -u polis-backend -n 30 --no-pager`) no presenten fallos no controlados ni bucles de reinicio.

### B. Nginx, Enrutamiento y Certificados SSL
1. Auditar la sintaxis con `nginx -t`.
2. Verificar en la configuración de Nginx:
   - Proxy pass `/api/` y `/docs` hacia `http://127.0.0.1:8000`.
   - Proxy pass `/` hacia `http://127.0.0.1:3000`.
   - Forzado de HTTPS y cabeceras de seguridad (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`).

### C. Crontab, Respaldos y Watchdog de Autosanación
1. Inspeccionar `crontab -l` constatando las dos tareas programadas canónicas:
   - Respaldo nocturno diario a las 02:00 AM (`respaldo_programado_bd.sh`).
   - Monitor de salud cada 5 minutos (`monitor_sistema_polis.sh --cron`).
2. Ejecutar una corrida de prueba en seco del monitor de salud:
   `/root/polis/scripts/monitor_sistema_polis.sh` y documentar la salida pericial.
3. Verificar la existencia del directorio `/root/polis/backups` y el log de operaciones `/root/polis/backups/respaldos.log`.

### D. Telemetría y Salud en Caliente (`/api/v1/health/system`)
1. Consultar en vivo `http://127.0.0.1:8000/api/v1/health/system` y certificar:
   - `status: "ok"`
   - `database.status: "ok"` y latencia menor a 20 ms.
   - `database.migration_revision: "0057_comentario_pas"` (cero drift).
   - `database.installed_extensions`: `ltree`, `pg_trgm`, `pgcrypto`, `plpgsql`, `postgis`.
   - `process.error_rate_pct`: 0.0%.
   - `storage.used_pct`: nivel saludable de disco.

---

## 🧪 3. Protocolo de Pruebas y Quality Gates de Cierre

| Verificación | Comando / Prueba | Criterio de Aceptación |
|---|---|---|
| **Servicios Systemd** | `systemctl is-active polis-backend polis-frontend nginx postgresql` | Todos activos (`active`) |
| **Sintaxis Nginx** | `nginx -t` | `syntax is ok` / `test is successful` |
| **Crontab Distrital** | `crontab -l` | Tareas de respaldo y monitor activas |
| **Prueba Monitor** | `/root/polis/scripts/monitor_sistema_polis.sh` | Retorno limpio con telemetría en verde |
| **Health API en Caliente** | `curl -s http://127.0.0.1:8000/api/v1/health/system` | HTTP 200 OK con latencia < 20 ms y 0 drift |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 advertencias ESLint |
| **Frontend Test Suite** | `bun test` | 412/412 pruebas pasadas |
| **Backend Test Suite** | `/root/polis/venv/bin/pytest backend/tests/` | 467/467 pruebas pasadas (100% verde) |
| **Turbopack Build** | `bun run build` | Compilación exitosa, 191/191 rutas SSG |

---

## 📦 4. Entregables y Salvaguardas

1. **Informe Pericial Final de Infraestructura:**
   - Registrar la matriz de verificación de infraestructura y telemetría en `bridge/02_resultado_agy2.md`.
2. **Salvaguardas Inviolables:**
   - Cero interrupción o reinicio destructivo de servicios en ejecución.
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas técnicas).
   - Preservación de BPINs distritales y protocolo Zero-Push estricto.
3. **Commit Atómico Local:**
   - Registrar el commit con formato: `audit(ops): verificacion infraestructura systemd nginx crontab y telemetria AUD-COMP-06`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial y certificación final del sistema.
