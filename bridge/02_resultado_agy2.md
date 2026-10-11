# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [SEC-HARDEN-01]
## HARDENING DE PUERTOS, AISLAMIENTO NEXT.JS A LOCALHOST Y FIREWALL UFW
### BLINDAJE PERIMETRAL, CIERRE DE EXPOSICIÓN EXTERNA DIRECTA (PUERTOS 3000/4000) Y FILTRADO ESTRICTO DE RED

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[SEC-HARDEN-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md` (Fase 1: Tarea 1.1)  
**Severidad Atendida:** ALTA / SEGURIDAD PERIMETRAL Y BLINDAJE DE ACCESOS  
**Estado de la Entrega:** 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica **[SEC-HARDEN-01]**, se ejecutó el endurecimiento perimetral del servidor de producción y la mitigación de vectores de ataque por acceso directo a puertos de backend y frontend:

1. **Aislamiento Estricto de Next.js a Localhost (`127.0.0.1`):**  
   - Se editó la unidad de servicio [`/etc/systemd/system/polis-frontend.service`](file:///etc/systemd/system/polis-frontend.service), conmutando `Environment=HOSTNAME=0.0.0.0` por `Environment=HOSTNAME=127.0.0.1`.  
   - Se recargó systemd y se reinició el servicio (`systemctl daemon-reload && systemctl restart polis-frontend.service`).  
   - Comprobación forense con `ss -tulpn | grep 3000`: el proceso Next.js (`pid 3409362`) escucha **estrictamente en `127.0.0.1:3000`**, imposibilitando cualquier bypass directo de Nginx o evasión de las políticas TLS 1.3 / HSTS desde internet.

2. **Configuración y Activación Inmune de UFW (Uncomplicated Firewall):**  
   - **Política por Defecto:**  
     - Tráfico entrante: Denegado (`default deny incoming`).  
     - Tráfico saliente: Permitido (`default allow outgoing`).  
     - Tráfico enrutado: Denegado (`default deny routed`).  
   - **Reglas Perimetrales Explícitas Permitidas:**  
     - **Puerto 777/tcp (`SSH Administrativo`):** Habilitado para IPv4 e IPv6 con preservación ininterrumpida de la sesión de administración.  
     - **Puerto 80/tcp (`HTTP Nginx`):** Habilitado para redirección canónica 301.  
     - **Puerto 443/tcp (`HTTPS Nginx`):** Habilitado para tráfico seguro web con certificados SSL y TLS 1.3.  
   - **Puertos Internos Protegidos:** Los puertos `3000` (Next.js), `4000` (servicios de desarrollo), `5432` (PostgreSQL `bd_csh`) y `8000` (FastAPI) quedan completamente aislados del exterior y accesibles únicamente en red local por Nginx o procesos autorizados.  
   - **Activación Segura:** Ejecutado `ufw --force enable`. Estado verificado: `Status: active`.

3. **Supervisión de Intrusiones con Fail2ban:**  
   - Verificado `systemctl is-active fail2ban` -> `active (running)`.  
   - Fail2ban continúa supervisando los intentos fallidos de autenticación SSH sobre el puerto 777 y el tráfico anómalo en Nginx.

4. **Verificación de Enrutamiento y Servicios Web:**  
   - Petición HTTPS en localhost `curl -k -sI https://127.0.0.1/` -> `HTTP/1.1 200 OK`.  
   - Endpoint de disponibilidad `curl -s http://127.0.0.1:8000/api/v1/health/ready` -> `HTTP/1.1 200 OK` (`"status":"ready"`).  
   - Endpoint de telemetría `curl -s http://127.0.0.1:8000/api/v1/health/system` -> `HTTP/1.1 200 OK` (`"status":"ok"`).

---

## 🔍 2. Evidencia Forense de Verificación en Caliente

### A. Inspección de Socket Next.js (`ss -tulpn | grep 3000`)
```
tcp   LISTEN 0      511        127.0.0.1:3000       0.0.0.0:*    users:(("next-server (v1",pid=3409362,fd=21))
```
*Dictamen: Enlace restringido a interfaz de bucle invertido (`127.0.0.1`). Cero exposición en interfaces públicas.*

### B. Estado Exhaustivo del Cortafuegos (`ufw status verbose`)
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
777/tcp                    ALLOW IN    Anywhere                   # SSH Administrativo
80/tcp                     ALLOW IN    Anywhere                   # HTTP Nginx
443/tcp                    ALLOW IN    Anywhere                   # HTTPS Nginx
777/tcp (v6)               ALLOW IN    Anywhere (v6)              # SSH Administrativo
80/tcp (v6)                ALLOW IN    Anywhere (v6)              # HTTP Nginx
443/tcp (v6)               ALLOW IN    Anywhere (v6)              # HTTPS Nginx
```

### C. Estado del Servicio Fail2ban
```
● fail2ban.service - Fail2Ban Service
     Loaded: loaded (/usr/lib/systemd/system/fail2ban.service; enabled; preset: enabled)
     Active: active (running)
```

---

## 🧪 3. Quality Gates de la Entrega

| Verificación | Comando / Prueba | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Aislamiento Next.js** | `ss -tulpn \| grep 3000` | `127.0.0.1:3000` verificado | ✅ APROBADO |
| **Estado UFW** | `ufw status verbose` | `Status: active`, reglas 777, 80, 443 ALLOW | ✅ APROBADO |
| **Fail2ban** | `systemctl is-active fail2ban` | `active` | ✅ APROBADO |
| **Health API en Caliente** | `curl -s http://127.0.0.1:8000/api/v1/health/system` | HTTP 200 OK (`status: "ok"`, DB: ok) | ✅ APROBADO |
| **UI Architectural Linter** | `bun run ui:check` | `POLIS UI: controles, tokens, capas... correctos` | ✅ APROBADO |
| **TypeCheck & Linter** | `bun run check` (`tsc --noEmit && eslint .`) | **0 errores TypeScript, 0 warnings ESLint** | ✅ APROBADO |
| **Frontend Test Suite** | `bun test` | **412 pruebas pasadas** en 43 archivos (0 fallos) | ✅ APROBADO |

---

## 🔒 4. Cumplimiento de Salvaguardas Inviolables

1. **Sesión SSH Activa en Puerto 777:** La regla `ufw allow 777/tcp` garantizó la continuidad absoluta y sin cortes de las sesiones de administración.
2. **Inviolabilidad de Producción (`bd_csh`):** Inspección directa en PostgreSQL certifica que los datos canónicos continúan 100% íntegros:
   - `mesas_trabajo.mesas`: **33 mesas**.
   - `mesas_trabajo.agendas`: **36 agendas**.
   - `indicadores.fichas_tecnicas_indicadores`: **11 fichas**.
   - `participacion_ciudadana.actores_estrategicos`: **17 actores**.
3. **Protocolo Zero-Push:** Commit atómico registrado localmente en la rama `main` sin operaciones de push remoto.

---

## 📦 5. Archivos Auditados y Modificados

- `/etc/systemd/system/polis-frontend.service` (conmutación de `HOSTNAME=127.0.0.1`)
- `/etc/ufw/user.rules` y `/etc/ufw/user6.rules` (reglas perimetrales UFW 777, 80, 443)
- `bridge/02_resultado_agy2.md` (informe pericial de hardening)
