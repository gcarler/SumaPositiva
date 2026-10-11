# INFORME PERICIAL DE IMPLEMENTACIÓN TÉCNICA — TAREA [OPS-OBSERVABILITY-01]
## OBSERVABILIDAD, TELEMETRÍA Y MONITOREO PROACTIVO
### ENDPOINTS DE MÉTRICAS EN FASTAPI, INTEGRACIÓN SENTRY/GLITCHTIP, CAPTURA GLOBAL DE ERRORES EN FRONTEND, WATCHDOG DE SERVICIOS SYSTEMD Y ALERTAS DE POSTGRESQL

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[OPS-OBSERVABILITY-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md` (Fase 3: Tarea 3.3 — Cierre Operativo de Fase 3 y Plan Maestro)  
**Severidad Atendida:** ALTA / RESILIENCIA Y CONTINUIDAD OPERATIVA (Prevención de caídas silenciosas en producción de POLIS)  
**Estado de la Entrega:** 100% Implementada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo de la Implementación

En cumplimiento estricto de la orden técnica **[OPS-OBSERVABILITY-01]**, se ha diseñado, implementado y verificado en caliente el **Sistema Integral de Observabilidad, Telemetría y Monitoreo Proactivo** de POLIS Cartagena:

1. **Endpoint de Métricas del Sistema (`GET /api/v1/health/system`):** Expone en tiempo real métricas no sensibles de PostgreSQL (`bd_csh`: ping en ms, conexiones activas vs máximas, extensiones PostGIS/pgcrypto, revisiones Alembic), telemetría del proceso FastAPI (uptime, memoria RSS, conteo y tasa de errores por códigos HTTP 2xx, 3xx, 4xx, 5xx) y almacenamiento en disco de `/root/polis`.
2. **Middleware de Telemetría HTTP en Memoria ([`backend/app/core/telemetry.py`](file:///root/polis/backend/app/core/telemetry.py)):** Registrador en memoria thread-safe, de latencia sub-milisegundo, sin dependencias pesadas y con exclusión absoluta de datos personales (PII), contraseñas o tokens JWT.
3. **Integración Defensiva de Sentry / GlitchTip ([`backend/app/core/sentry.py`](file:///root/polis/backend/app/core/sentry.py)):** Soporte configurable vía `POLIS_SENTRY_DSN` con inicialización tolerante a fallos y sanitización rigurosa `before_send` para proteger el secreto estadístico y Habeas Data (Ley 1581 de 2012).
4. **Error Boundary Global en Frontend ([`src/shared/monitoring/error-boundary.tsx`](file:///root/polis/src/shared/monitoring/error-boundary.tsx)):** Captura institucional de excepciones en React 19 / Next.js 16 con interfaz accesible (`@/shared/ui/button`), mensaje amigable, contención de errores y botones táctiles *"Reintentar"* y *"Volver al inicio"*, montado en [`src/app/layout.tsx`](file:///root/polis/src/app/layout.tsx).
5. **Panel de Salud del Sistema en Plataforma ([`src/features/plataforma/components/salud-sistema-section.tsx`](file:///root/polis/src/features/plataforma/components/salud-sistema-section.tsx)):** Componente interactivo integrado en [`src/features/plataforma/views/configuracion-view.tsx`](file:///root/polis/src/features/plataforma/views/configuracion-view.tsx) con diagnóstico visual en vivo de FastAPI, PostgreSQL, Service Worker PWA y almacenamiento con botón *"Comprobar salud en tiempo real"*.
6. **Watchdog Automatizado de Producción ([`scripts/monitor_sistema_polis.sh`](file:///root/polis/scripts/monitor_sistema_polis.sh)):** Script en Bash con modos `--check` (tabular), `--json` y `--cron` (con reinicio de contingencia de servicios systemd ante caídas y alertas si PostgreSQL supera el 85% de conexiones o el disco el 90%), programado cada 5 minutos en el crontab del sistema.

---

## 🏛️ 2. Componentes Técnicos Implementados

### A. Backend FastAPI
- [`backend/app/core/telemetry.py`](file:///root/polis/backend/app/core/telemetry.py): Tracker thread-safe con `threading.Lock()` y ventana deslizante para promediar latencias y clasificar respuestas por rangos HTTP.
- [`backend/app/core/sentry.py`](file:///root/polis/backend/app/core/sentry.py): Inicializador defensivo con filtros `_filtrar_pii` para encabezados y payloads sensibles.
- [`backend/app/core/config.py`](file:///root/polis/backend/app/core/config.py): Inclusión de variable opcional `sentry_dsn: str | None = None` bajo prefijo `POLIS_`.
- [`backend/app/modules/health/schemas.py`](file:///root/polis/backend/app/modules/health/schemas.py): Modelos Pydantic `SystemHealthResponse`, `DatabaseMetrics`, `ProcessMetrics`, `StorageMetrics`, `ObservabilityMetrics`.
- [`backend/app/modules/health/repository.py`](file:///root/polis/backend/app/modules/health/repository.py): Métodos `ping_ms()`, `active_connections()`, `max_connections()`.
- [`backend/app/modules/health/service.py`](file:///root/polis/backend/app/modules/health/service.py): Orquestador `system_metrics()`, lectura de `/proc/self/status` (VmRSS) y `shutil.disk_usage()`.
- [`backend/app/modules/health/router.py`](file:///root/polis/backend/app/modules/health/router.py): Endpoint canónico `GET /api/v1/health/system`.
- [`backend/app/main.py`](file:///root/polis/backend/app/main.py): Invocación de `init_sentry(settings)` y captura métrica en middleware `log_request`.
- [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md): Registro oficial del endpoint para conformidad con matriz de acceso.

### B. Frontend Next.js
- [`src/shared/monitoring/error-boundary.tsx`](file:///root/polis/src/shared/monitoring/error-boundary.tsx): Componente Error Boundary institucional.
- [`src/shared/monitoring/index.ts`](file:///root/polis/src/shared/monitoring/index.ts): Exportación canónica cumpliendo estrictamente con la regla **UI004** (shared es autocontenido y no importa features ni app).
- [`src/app/layout.tsx`](file:///root/polis/src/app/layout.tsx): Envoltorio global de `<ErrorBoundary>` alrededor de `{children}`.
- [`src/features/plataforma/components/salud-sistema-section.tsx`](file:///root/polis/src/features/plataforma/components/salud-sistema-section.tsx): Sección visual de diagnóstico con 4 tarjetas métricas y botón de refresco en vivo.
- [`src/features/plataforma/views/configuracion-view.tsx`](file:///root/polis/src/features/plataforma/views/configuracion-view.tsx): Inclusión de la sección de observabilidad para administradores distritales.

### C. Watchdog de Producción y Automatización
- [`scripts/monitor_sistema_polis.sh`](file:///root/polis/scripts/monitor_sistema_polis.sh): Script ejecutable para monitoreo proactivo con autosanación (*self-healing*) de servicios systemd y verificación de PostgreSQL.
- **Crontab (`crontab -l`):**
  ```cron
  0 2 * * * /root/polis/scripts/respaldo_programado_bd.sh >> /root/polis/backups/respaldos.log 2>&1
  */5 * * * * /root/polis/scripts/monitor_sistema_polis.sh --cron >> /var/log/polis-monitor.log 2>&1
  ```

---

## 🔬 3. Pruebas Automatizadas

1. **Backend Tests ([`backend/tests/test_observability.py`](file:///root/polis/backend/tests/test_observability.py)):**
   - `test_system_health_metrics_endpoint`: Valida estructura completa de `GET /api/v1/health/system` (200 OK, database, process, storage, observability).
   - `test_sentry_defensivo_sin_dsn`: Valida tolerancia total ante ausencia de DSN.
   - `test_telemetry_tracker_registro_y_reseteo`: Valida cálculo exacto de métricas y contadores de código HTTP.
   - **Resultado:** 3/3 tests aprobados.

2. **Backend Access Policy ([`backend/tests/test_access_policy.py`](file:///root/polis/backend/tests/test_access_policy.py)):**
   - Valida que todas las 97 rutas del sistema coinciden con la matriz de permisos.
   - **Resultado:** 97/97 tests aprobados.

3. **Frontend Tests ([`src/shared/monitoring/tests/error-boundary.test.tsx`](file:///root/polis/src/shared/monitoring/tests/error-boundary.test.tsx)):**
   - 5 pruebas unitarias en Vitest certificando renderizado normal, captura de error, renderizado de contingencia accesible, fallback personalizado y restablecimiento de estado con `onReset`.
   - **Resultado:** 5/5 tests aprobados.

---

## 🛡️ 4. Verificación de Salvaguardas Obligatorias

1. **Preservación Inviolable de BPIN:** Cero modificaciones a tablas o identificadores presupuestales.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA en código, documentación o interfaces.
3. **UI-Policy Estricta (UI004):** `src/shared/monitoring` es 100% autocontenido y no importa módulos de `features` ni `app`. Cero infracciones en `node scripts/ui-policy.mjs`.
4. **Habeas Data y Seguridad:** Cero inclusión de credenciales, contraseñas, tokens JWT o PII en logs de telemetría o endpoints de métricas.
5. **Inviolabilidad de Producción (`bd_csh`):**
   * Mesas de trabajo registradas: **33 intactas**.
   * Agendas comunitarias registradas: **36 intactas**.
6. **Protocolo Zero-Push:** Todo cambio confinado exclusivamente en la rama local `main`.

---

## 🚦 5. Resultados de Quality Gates

| Quality Gate | Herramienta / Comando | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **UI Policy Check** | `bun run ui:check` | 0 infracciones detectadas | **APROBADO** |
| **Typecheck & Linter** | `bun run check` (`tsc --noEmit && eslint .`) | 0 errores TypeScript, 0 warnings ESLint | **APROBADO** |
| **Pruebas Frontend** | `bun test` | **412 tests pasados**, 0 fallidos (43 archivos) | **APROBADO** |
| **Pruebas Backend** | `/root/polis/venv/bin/pytest backend/tests/test_observability.py` | 100% aprobadas (3/3) | **APROBADO** |
| **Matriz de Permisos** | `/root/polis/venv/bin/pytest backend/tests/test_access_policy.py` | 100% aprobadas (97/97) | **APROBADO** |
| **Compilación Turbopack** | `bun run build` | Compilado exitoso en 15.1s, 191/191 páginas estáticas | **APROBADO** |
| **Diagnóstico Watchdog** | `/root/polis/scripts/monitor_sistema_polis.sh --check` | Código de salida 0 (Sistema 100% Saludable) | **APROBADO** |
| **Endpoint Métricas** | `curl -i http://127.0.0.1:8000/api/v1/health/system` | HTTP 200 OK con payload completo | **APROBADO** |
| **Integridad Base de Datos** | `psql -d bd_csh` | 33 mesas y 36 agendas 100% preservadas | **APROBADO** |

---

## 🎖️ 6. Dictamen Final

La orden técnica **[OPS-OBSERVABILITY-01]** se encuentra **100% implementada, verificada en caliente y en ejecución continua**, completando el ciclo operativo de resiliencia y telemetría de la Fase 3 del Plan Maestro. Lista para contra-auditoría por parte del Coordinador General `agy`.
