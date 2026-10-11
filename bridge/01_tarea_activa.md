# TAREA ACTIVA: [SEC-HARDEN-01] HARDENING DE PUERTOS, AISLAMIENTO NEXT.JS A LOCALHOST Y FIREWALL UFW
## BLINDAJE PERIMETRAL, CIERRE DE EXPOSICIÓN EXTERNA DIRECTA (PUERTOS 3000/4000) Y FILTRADO ESTRICTO DE RED

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 1: Blindaje Perimetral, Seguridad de Red y Hardening de Servidor (Tarea 1.1)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / SEGURIDAD PERIMETRAL Y BLINDAJE DE ACCESOS  

---

## 🎯 1. Justificación y Alcance de la Tarea

Actualmente, el cortafuegos del sistema operativo se encuentra inactivo (`ufw status` -> `Status: inactive`) y el servicio de Next.js (`polis-frontend.service`) está enlazado a la dirección comodín `HOSTNAME=0.0.0.0` en el puerto 3000. Esto permitiría que un actor externo acceda al frontend directamente por la IP del servidor saltándose el proxy inverso Nginx, la terminación TLS 1.3 y las cabeceras de endurecimiento HSTS.

El objetivo de esta tarea es cerrar toda superficie de ataque perimetral mediante:
1. **Aislamiento de Next.js (`127.0.0.1`):** Restringir la escucha del frontend exclusivamente a localhost.
2. **Activación y Configuración Estricta de UFW:**
   - Permitir estrictamente el puerto SSH administrativo (**777/tcp**).
   - Permitir los puertos web **80/tcp** (HTTP) y **443/tcp** (HTTPS).
   - Denegar por defecto todo el tráfico entrante restante (`default deny incoming`).
   - Bloquear el acceso directo exterior a los puertos 3000, 4000, 5432 y 8000.
3. **Persistencia de Fail2ban y Servicios:** Garantizar que las sesiones SSH y la conectividad pública del portal no se interrumpan.

---

## 📋 2. Requerimientos Técnicos y Pasos de Ejecución

### A. Aislamiento de Next.js
1. Editar `/etc/systemd/system/polis-frontend.service`:
   - Cambiar `Environment=HOSTNAME=0.0.0.0` a `Environment=HOSTNAME=127.0.0.1`.
2. Recargar y reiniciar el servicio:
   ```bash
   systemctl daemon-reload && systemctl restart polis-frontend.service
   ```
3. Verificar con `ss -tulpn | grep 3000` que la dirección local sea `127.0.0.1:3000` (no `0.0.0.0:3000`).

### B. Configuración y Habilitación de UFW
1. Aplicar las políticas y reglas perimetrales:
   ```bash
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 777/tcp comment 'SSH Administrativo'
   ufw allow 80/tcp comment 'HTTP Nginx'
   ufw allow 443/tcp comment 'HTTPS Nginx'
   ```
2. Habilitar el cortafuegos de forma segura sin interrumpir sesiones:
   ```bash
   ufw --force enable
   ```
3. Comprobar el estado resultante con `ufw status verbose`:
   - Estado: `active`.
   - Reglas 777/tcp, 80/tcp y 443/tcp registradas en IPv4 e IPv6.

### C. Verificación de Conectividad y Resiliencia
1. Constatar que `fail2ban` permanezca activo: `systemctl status fail2ban --no-pager`.
2. Verificar que Nginx responda correctamente a través de localhost y dominio:
   - `curl -k -sI https://127.0.0.1/` -> HTTP 200.
   - `curl -s http://127.0.0.1:8000/api/v1/health/ready` -> HTTP 200.

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Aislamiento Next.js** | `ss -tulpn \| grep 3000` | Escucha en `127.0.0.1:3000` |
| **Estado UFW** | `ufw status verbose` | `Status: active`, reglas 777, 80, 443 ALLOW |
| **Fail2ban** | `systemctl is-active fail2ban` | `active` |
| **Salud del Sistema** | `curl -s http://127.0.0.1:8000/api/v1/health/system` | HTTP 200, status "ok" |
| **Frontend Test Suite** | `bun test` | 412/412 pasadas |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |

---

## 📦 4. Entregables y Salvaguardas

1. **Informe Pericial de Hardening:** Documentar en `bridge/02_resultado_agy2.md` la salida de `ss -tulpn` y `ufw status verbose`.
2. **Salvaguardas Inviolables:**
   - La sesión SSH en puerto 777 debe preservarse ininterrumpidamente.
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas).
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `sec(harden): aislamiento nextjs a localhost y activacion firewall ufw SEC-HARDEN-01`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial.
