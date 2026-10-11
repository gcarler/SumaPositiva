# TAREA ACTIVA: [OPS-OBSERVABILITY-01] OBSERVABILIDAD, TELEMETRÍA Y MONITOREO PROACTIVO
## ENDPOINTS DE MÉTRICAS EN FASTAPI, INTEGRACIÓN SENTRY/GLITCHTIP, CAPTURA GLOBAL DE ERRORES EN FRONTEND, WATCHDOG DE SERVICIOS SYSTEMD Y ALERTAS DE POSTGRESQL

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Adopción Territorial y Resiliencia (Tarea 3.3 — Cierre Operativo de Fase 3 y Plan Maestro)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / RESILIENCIA Y CONTINUIDAD OPERATIVA (Prevención de caídas silenciosas en producción de POLIS)

---

## 🎯 1. Justificación y Diagnóstico Estratégico

La plataforma POLIS opera en el servidor de producción distrital soportando procesos de fe pública: registro de asistencia ciudadana (Ley 1757 de 2015), 33 mesas de diálogo territorial, 36 agendas comunitarias, 11 indicadores de seguridad y el nuevo canal Modo Barrio y PWA Offline.

Sin embargo, ante fallos eventuales en producción:
1. **Ausencia de Métricas Agregadas en Tiempo Real:** El endpoint `/health/ready` actual solo reporta disponibilidad binaria (`ready` / `unavailable`), pero no expone métricas de rendimiento, saturación del pool de conexiones PostgreSQL, uso de memoria RSS, tiempo de respuesta o conteo de solicitudes y errores.
2. **Falta de Trazabilidad Centralizada de Excepciones:** Si un usuario o facilitador experimenta un error no controlado en Next.js o FastAPI, el incidente queda sepultado en logs locales no estructurados. Se requiere configuración nativa y extensible para Sentry / GlitchTip / OpenTelemetry (`POLIS_SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`) con filtrado estricto de PII y secretos.
3. **Ausencia de Watchdog Proactivo para Servicios Systemd:** Si `polis-backend.service` o `polis-frontend.service` sufren una caída, o si PostgreSQL agota sus conexiones permitidas, no existe una alarma temprana ni un script de diagnóstico automatizado que detecte y notifique la degradación antes de que impacte a la comunidad.
4. **Visibilidad Institucional en Plataforma:** En `/plataforma/configuracion`, los administradores distritales carecen de un panel accesible para verificar la salud y latencia del sistema, el estado de la base de datos y la capacidad de almacenamiento.

---

## 📋 2. Especificación Técnica de la Implementación

### A. Backend FastAPI: Módulo de Métricas y Observabilidad del Sistema
1. **Endpoint de Métricas y Diagnóstico del Sistema ([`backend/app/modules/health/router.py`](file:///root/polis/backend/app/modules/health/router.py) y [`schemas.py`](file:///root/polis/backend/app/modules/health/schemas.py))**:
   - Extender el módulo de salud con:
     * `GET /api/v1/health/system` (o `GET /api/v1/metrics`):
       - **PostgreSQL (`bd_csh`):** Conexiones activas, estado del pool asyncpg, tiempo de respuesta a ping (`ping_ms`), revisiones de migración Alembic y extensiones PostGIS/pgcrypto activas.
       - **Proceso FastAPI:** Uptime en segundos, memoria RSS utilizada (MB), total de peticiones procesadas, desglose por códigos HTTP (2xx, 3xx, 4xx, 5xx) y tasa de error.
       - **Almacenamiento:** Espacio en disco libre y porcentaje de uso del volumen `/root/polis`.
       - **Entorno:** Modo de ejecución (`production`/`development`), versión de la API (`0.2.1`), estado de Sentry/GlitchTip (`activo` / `desactivado`).
2. **Middleware de Telemetría HTTP en Memoria ([`backend/app/main.py`](file:///root/polis/backend/app/main.py))**:
   - Implementar un registrador en memoria ligero y thread-safe (usando `time.monotonic()` y contadores enteros) que registre:
     * Total de solicitudes acumuladas.
     * Conteo acumulado de respuestas 2xx, 3xx, 4xx, 5xx.
     * Duración promedio de solicitud (ms) en ventana móvil.
   - Preservar la privacidad ciudadana: Cero registro de PII, parámetros de consulta con datos sensibles o tokens de autorización en los logs.
3. **Soporte Defensivo de Sentry / GlitchTip ([`backend/app/core/config.py`](file:///root/polis/backend/app/core/config.py))**:
   - Agregar variable opcional `sentry_dsn: str | None = None` (prefijo `POLIS_SENTRY_DSN`).
   - Inicialización condicional y tolerante a fallos: Si la variable está presente y `sentry_sdk` está disponible, inicializar con `traces_sample_rate=0.1` y filtro `before_send` que purge contraseñas, tokens JWT e identificadores personales. Si no está configurado, registrar un aviso de nivel INFO sin arrojar excepciones.

### B. Frontend Next.js: Error Boundary Global y Panel de Salud en Plataforma
1. **Captura Global de Excepciones y Error Boundary ([`src/shared/monitoring/error-boundary.tsx`](file:///root/polis/src/shared/monitoring/error-boundary.tsx) o `@/shared/monitoring/`)**:
   - Componente de captura de errores React con interfaz institucional accesible (`@/shared/ui/`):
     * Muestra un mensaje amigable: *"Se ha presentado una eventualidad en el módulo"* con botón táctil *"Reintentar"* y *"Volver al inicio"*.
     * Captura de metadatos de error (nombre del error, stack trace truncado, URL actual) sin exponer información sensible ni romper la navegación del usuario.
     * Soporte opcional de reporte hacia Sentry/GlitchTip si `NEXT_PUBLIC_SENTRY_DSN` está definido.
     * Cumplimiento estricto de la regla **UI004**: Los módulos en `src/shared/` no deben importar desde `@/features/` ni `@/app/`.
2. **Panel de Salud del Sistema en Configuración ([`src/features/plataforma/views/configuracion-view.tsx`](file:///root/polis/src/features/plataforma/views/configuracion-view.tsx))**:
   - Añadir una sección accesible *"Salud del Sistema y Observabilidad"* con:
     * Estado en vivo de FastAPI (`/api/v1/health/ready`): Badge de disponibilidad y latencia en ms.
     * Estado de PostgreSQL (`bd_csh`): Conexiones y extensiones.
     * Estado de Frontend Next.js: Versión standalone y modo offline PWA activo.
     * Botón de verificación interactivo *"Comprobar salud en tiempo real"*.

### C. Script Watchdog de Producción y Monitoreo Proactivo
1. **Script de Monitoreo ([`scripts/monitor_sistema_polis.sh`](file:///root/polis/scripts/monitor_sistema_polis.sh))**:
   - Desarrollar un script robusto en Bash con permisos de ejecución:
     * Verifica que `polis-backend.service` y `polis-frontend.service` estén activos (`systemctl is-active`).
     * Verifica respuesta HTTP de `http://127.0.0.1:8000/api/v1/health/live` y `http://127.0.0.1:3000/`.
     * Consulta PostgreSQL para verificar que las conexiones activas no superen el 85% de `max_connections`.
     * Verifica que el espacio en disco en `/` no supere el 90% de uso.
     * Modos de ejecución:
       - `--check` (modo puntual): Imprime el diagnóstico en consola con formato tabular/JSON y código de salida 0 (saludable) o 1 (alerta).
       - `--cron` (modo programado): Registra eventos en `/var/log/polis-monitor.log` (o syslog local). En caso de fallo crítico en algún servicio, intenta reiniciarlo de forma controlada (`systemctl restart ...`) y deja constancia forense.
2. **Automatización Programada**:
   - Integrar la ejecución periódica cada 5 minutos en el crontab del sistema de `/root` (`*/5 * * * * /root/polis/scripts/monitor_sistema_polis.sh --cron >> /var/log/polis-monitor.log 2>&1`), complementando el respaldo diario de `[OPS-BACKUP-01]`.

---

## 🧪 3. Pruebas y Criterios de Aceptación

1. **Backend Tests:**
   - Crear [`backend/tests/test_observability.py`](file:///root/polis/backend/tests/test_observability.py) validando:
     * `GET /api/v1/health/system` responde 200 OK con estructura completa (base de datos, métricas de proceso, uptime, almacenamiento).
     * Middleware de métricas registra correctamente las peticiones acumuladas y responde adecuadamente ante fallos simulados.
     * Comportamiento idempotente ante ausencia de `POLIS_SENTRY_DSN`.
2. **Frontend Tests:**
   - Crear prueba unitaria en Vitest para el componente Error Boundary y utilidades de monitoreo, validando renderizado seguro y captura de excepciones.
3. **Hot-Verification del Script:**
   - Ejecutar `/root/polis/scripts/monitor_sistema_polis.sh --check` comprobando salida verde y código de salida 0.
4. **Preservación de Invariantes:**
   - `bun run ui:check`: **0 infracciones**.
   - `bun run check`: **0 errores de TypeScript y ESLint**.
   - `bun test`: **100% de tests frontend pasando**.
   - `pytest backend/tests`: **100% de tests backend pasando**.
   - `bun run build`: **Compilación exitosa con Turbopack**.

---

## 🔒 4. Salvaguardas Obligatorias

1. **Preservación Inviolable de BPIN:** Prohibido alterar códigos o tablas BPIN distritales.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA en código o interfaces.
3. **UI-Policy Estricta (UI004):** Usar exclusivamente componentes canónicos `@/shared/ui/` y tokens oficiales. El submódulo `@/shared/monitoring/` debe ser autocontenido.
4. **Habeas Data y Seguridad:** Cero inclusión de credenciales, tokens JWT o PII en logs de telemetría o endpoints de métricas.
5. **Inviolabilidad de Producción (`bd_csh`):** Las 33 mesas de diálogo, 36 agendas comunitarias y 11 fichas de indicadores permanecen 100% intactas.
6. **Protocolo Zero-Push:** Exclusivamente commits locales en `main`.

---

## 🚀 5. Instrucciones de Entrega para agy2

1. Implementar los componentes de backend, frontend y el script watchdog.
2. Ejecutar y validar todos los Quality Gates (`ui:check`, `check`, `bun test`, `pytest`, `bun run build`).
3. Registrar el informe pericial detallado en `bridge/02_resultado_agy2.md`.
4. Generar el commit atómico correspondiente: `feat(ops): observabilidad telemetria y watchdog proactivo OPS-OBSERVABILITY-01`.
5. Notificar a `agy` en la sesión tmux `%0` para la contra-auditoría final.
