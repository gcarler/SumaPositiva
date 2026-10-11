# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [OPS-FORENSIC-01]
## APERTURA DE FASE 3: OBSERVABILIDAD FORENSE SQL EN VIVO CON PG_STAT_STATEMENTS
### MONITOREO DE CONSULTAS PESADAS, HIT RATIO DE CACHÉ Y LATENCIAS EN /PLATAFORMA/CONFIGURACION

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[OPS-FORENSIC-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md` (Fase 3: Tarea 3.1 — Apertura de Fase 3)  
**Severidad Atendida:** ALTA / OBSERVABILIDAD FORENSE, ALTA DISPONIBILIDAD Y AUDITORÍA DE RENDIMIENTO  
**Estado de la Entrega:** 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica **[OPS-FORENSIC-01]**, se implementó el **Módulo de Telemetría y Observabilidad Forense SQL en Vivo**, exponiendo métricas de rendimiento, latencia de ejecución, estadísticas de búfer y el Top de consultas registradas directamente desde el motor PostgreSQL 18.6 mediante la extensión interna **`pg_stat_statements`** y la vista **`pg_stat_database`**.

El trabajo se ejecutó coordinadamente en todas las capas del sistema:

1. **Modelos y Esquemas Pydantic (`backend/app/modules/health/schemas.py`):**
   - Diseñado `DatabaseQueryStat` (`query`, `calls`, `total_ms`, `mean_ms`, `rows`, `hit_ratio_pct`).
   - Diseñado `DatabaseTelemetryResponse` (`status: ok|degraded|unavailable`, `timestamp: ISO 8601`, `total_queries_recorded`, `cache_hit_ratio_pct`, `top_queries: list[DatabaseQueryStat]`).

2. **Capa de Repositorio de Base de Datos (`backend/app/modules/health/repository.py`):**
   - Implementado el método `obtener_telemetria_consultas(limite: int = 10, ordenar_por: str = "tiempo_total")`.
   - Consulta agregada a `pg_stat_database` calculando el **Cache Hit Ratio Global** de PostgreSQL (`round((sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0)), 2)`).
   - Conteo total de consultas catalogadas en el búfer de `pg_stat_statements`.
   - Extracción del Top de sentencias SQL ordenadas dinámicamente según criterio (`total_exec_time DESC`, `mean_exec_time DESC` o `calls DESC`), excluyendo consultas autorreferenciales (`WHERE query NOT LIKE '%pg_stat_statements%'`).
   - Concesión del rol de sistema `pg_read_all_stats` al usuario `polis` en PostgreSQL, habilitando la visibilidad forense de todas las consultas sin comprometer privilegios administrativos.

3. **Lógica de Servicio y Sanitización Forense (`backend/app/modules/health/service.py`):**
   - Implementada la función `sanitizar_consulta_sql(query_raw, max_chars=200)` para salvaguardar credenciales y datos sensibles:
     * Colapso de saltos de línea y tabulaciones a espacios simples.
     * Enmascaramiento mediante expresiones regulares de contraseñas, tokens y claves (`password='***'`, `token:'***'`, `clave='***'`).
     * Truncado controlado a un máximo de 200 caracteres con elipsis (`...`).
   - Implementado `database_queries_telemetry()` con timeout asíncrono de 5 segundos y retorno degradado seguro ante cualquier anomalía de conexión.

4. **Endpoint y Contrato de Seguridad (`backend/app/modules/health/router.py` y `docs/permisos-api.md`):**
   - Expuesto `GET /api/v1/health/database/queries` con validación estricta de parámetros (`limite: int = 10` [1..50], `ordenar_por: Literal["tiempo_total", "tiempo_medio", "llamadas"]`).
   - Documentado y registrado formalmente en [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md) como endpoint público de monitoreo operacional.
   - Certificado con **100% de paridad RBAC** mediante la suite [`backend/tests/test_access_policy.py`](file:///root/polis/backend/tests/test_access_policy.py) (**97/97 tests pasados**).

5. **Integración en la Plataforma Web Frontend (`src/features/plataforma/`):**
   - **Servicio y Tipado (`src/features/plataforma/services/plataforma-api.ts`):** Añadido `telemetriaSql(limite, ordenarPor)` validado con schemas Zod estrictos. Suite unitaria [`plataforma-api.test.ts`](file:///root/polis/src/features/plataforma/services/plataforma-api.test.ts) (**3/3 tests pasados**).
   - **Componente Forense (`src/features/plataforma/components/telemetria-sql-card.tsx`):**
     * Indicadores clave en tarjetas KPI: **Cache Hit Ratio (99.95%)**, **Consultas Catalogadas en Búfer**, **Latencia Media del Top** y **Estado del Motor**.
     * Selector interactivo de criterio de ordenación (Tiempo Total, Latencia Media, Llamadas).
     * Botón de refresco manual con feedback visual (`sonner toast`).
     * Tabla responsiva con código SQL sanitizado en tipografía monoespaciada, conteo de llamadas, tiempos acumulados, latencias medias y badges de acierto en caché.
   - **Acoplamiento en la Sección de Salud:** Integrado limpiamente dentro de `SaludSistemaSection` en `/plataforma/configuracion`.

---

## 🔍 2. Evidencia Forense de Verificación en Caliente

### A. Consulta Directa al Endpoint Uvicorn (`http://127.0.0.1:8000`)
```bash
curl -s http://127.0.0.1:8000/api/v1/health/database/queries | python3 -m json.tool
```
**Respuesta:**
```json
{
    "status": "ok",
    "timestamp": "2026-10-11T22:44:33.148317+00:00",
    "total_queries_recorded": 2341,
    "cache_hit_ratio_pct": 99.95,
    "top_queries": [
        {
            "query": "CREATE EXTENSION IF NOT EXISTS postgis_raster",
            "calls": 1,
            "total_ms": 177.66,
            "mean_ms": 177.66,
            "rows": 0,
            "hit_ratio_pct": 98.16
        },
        {
            "query": "SELECT pg_catalog.pg_attribute.attname AS name, pg_catalog.format_type(pg_catalog.pg_attribute.atttypid, pg_catalog.pg_attribute.atttypmod) AS format_type, CASE WHEN pg_catalog.pg_attribute.atthasd...",
            "calls": 282,
            "total_ms": 148.14,
            "mean_ms": 0.53,
            "rows": 3580,
            "hit_ratio_pct": 99.86
        },
        {
            "query": "CREATE EXTENSION IF NOT EXISTS pgrouting",
            "calls": 1,
            "total_ms": 42.89,
            "mean_ms": 42.89,
            "rows": 0,
            "hit_ratio_pct": 99.9
        },
        {
            "query": "SELECT * FROM parse_address($1)",
            "calls": 25,
            "total_ms": 36.5,
            "mean_ms": 1.46,
            "rows": 25,
            "hit_ratio_pct": 100.0
        }
    ]
}
```

### B. Consulta Perimetral a través de Nginx HTTPS (`https://127.0.0.1`)
```bash
curl -k -s https://127.0.0.1/api/v1/health/database/queries
```
*HTTP 200 OK — Certificado y enrutado con cabeceras de seguridad HSTS, nosniff y strict-origin.*

---

## 🧪 3. Quality Gates de la Entrega

| Verificación | Comando / Prueba | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Suite Telemetría SQL Backend** | `pytest backend/tests/test_database_telemetry.py` | **6 pasadas** en 3.89s (0 fallos) | ✅ APROBADO |
| **Paridad RBAC Matriz de Rutas** | `pytest backend/tests/test_access_policy.py` | **97 pasadas** en 19.51s (0 fallos) | ✅ APROBADO |
| **Suite General de Salud** | `pytest backend/tests/test_health.py` | **8 pasadas** en 2.10s (0 fallos) | ✅ APROBADO |
| **Pruebas Plataforma Frontend** | `bun test src/features/plataforma/` | **25 pasadas** en 3 archivos (0 fallos) | ✅ APROBADO |
| **UI Architectural Linter** | `bun run ui:check` | `POLIS UI: controles, tokens, capas... correctos` | ✅ APROBADO |
| **TypeCheck & Linter Global** | `bun run check` (`tsc --noEmit && eslint .`) | **0 errores TypeScript, 0 warnings ESLint** | ✅ APROBADO |
| **Build de Producción Next.js** | `bun run build` | **191/191 páginas estáticas y SSG generadas** | ✅ APROBADO |
| **Frontend Test Suite Global** | `bun test` | **420 pruebas pasadas** en 44 archivos | ✅ APROBADO |
| **Alembic Schema Drift** | `cd backend && alembic check` | `No new upgrade operations detected.` | ✅ APROBADO |
| **Servicios Systemd en Vivo** | `systemctl is-active polis-backend polis-frontend` | Ambos `active (running)` | ✅ APROBADO |

---

## 🛡️ 4. Verificación de Salvaguardas Inviolables

1. **Integridad Invariable de `bd_csh`:**
   - 33 mesas territoriales, 36 agendas temáticas, 11 fichas de diagnóstico técnico y 17 actores estratégicos 100% verificados e intactos.
2. **Cero Drift de Base de Datos:**
   - No se alteró ningún esquema ni tabla de la base de datos de producción; la telemetría consume vistas de catálogo de sólo lectura.
3. **Privacidad y Protección PII:**
   - Todo comando SQL devuelto al cliente pasa por sanitización y enmascaramiento antes de salir del backend.
4. **Protocolo Zero-Push:**
   - Todos los cambios se mantienen estrictamente confinados en el repositorio local en la rama `main`.

---

## 📌 5. Conclusión y Solicitud de Dictamen

La orden técnica **[OPS-FORENSIC-01]** ha sido culminada al 100% con rigor forense.  
Se formaliza el commit atómico y se solicita a la supervisión `agy` en el panel tmux `%0` la contra-auditoría pericial para proceder a la siguiente tarea del Plan Maestro.
