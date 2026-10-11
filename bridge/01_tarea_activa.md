# TAREA ACTIVA: [OPS-FORENSIC-01] TELEMETRÍA Y OBSERVABILIDAD FORENSE SQL EN VIVO (PG_STAT_STATEMENTS)
## APERTURA DE FASE 3: MONITOREO DE CONSULTAS PESADAS, HIT RATIO Y RENDIMIENTO EN /PLATAFORMA/CONFIGURACION

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Observabilidad Forense SQL, Fe Pública en PDF y Resiliencia Offsite (Tarea 3.1)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / OBSERVABILIDAD FORENSE, ALTA DISPONIBILIDAD Y AUDITORÍA DE RENDIMIENTO  

---

## 🎯 1. Justificación y Alcance de la Tarea

Con el súper-tuning de PostgreSQL 18.6 aplicado (`shared_buffers=8GB`, `effective_cache_size=24GB`, `work_mem=32MB`, `random_page_cost=1.1`) y la suite espacial de PostGIS activa en `bd_csh`, la extensión de telemetría interna **`pg_stat_statements`** ya se encuentra recopilando las métricas de ejecución de todas las transacciones SQL del servidor.

El objetivo de esta tarea es **abrir la FASE 3** exponiendo estas métricas forenses en tiempo real para que las autoridades y auditores distritales puedan vigilar la salud y la latencia del motor de base de datos directamente desde la plataforma web sin depender de accesos SSH.

### Alcance Técnico:
1. **Módulo Backend de Observabilidad de Base de Datos (`backend/app/modules/health/`):**
   - **Repository (`health/repository.py`):**
     * Implementar método `obtener_telemetria_consultas(limite: int = 10, ordenar_por: str = "tiempo_total")`.
     * Consultar la vista `pg_stat_statements` para obtener: query (sanitizado a máximo 200 caracteres), número de llamadas (`calls`), tiempo total en ms (`total_exec_time`), tiempo promedio en ms (`mean_exec_time`), filas devueltas (`rows`), lecturas de disco (`shared_blks_read`), y lecturas de caché (`shared_blks_hit`).
     * Calcular el **Cache Hit Ratio Global** de PostgreSQL mediante consulta agregada a `pg_stat_database`.
     * Obtener el total de consultas catalogadas en el búfer de `pg_stat_statements`.
   - **Schemas (`health/schemas.py`):**
     * Diseñar `DatabaseQueryStat` (`query: str`, `calls: int`, `total_ms: float`, `mean_ms: float`, `rows: int`, `hit_ratio_pct: float`).
     * Diseñar `DatabaseTelemetryResponse` (`status: str`, `total_queries_recorded: int`, `cache_hit_ratio_pct: float`, `top_queries: list[DatabaseQueryStat]`, `timestamp: datetime`).
   - **Service y Router (`health/service.py` y `health/router.py`):**
     * Exponer endpoint `GET /api/v1/health/database/queries` con parámetros de query `limite: int = 10` y `ordenar_por: str = "tiempo_total" | "tiempo_medio" | "llamadas"`.
     * Blindar el endpoint con verificación de permisos o acceso institucional (auditor_forense, autoridad_distrital, administrador) o permitir acceso de monitoreo del sistema coherente con `/health/system`.
     * Reflejar el contrato en `docs/permisos-api.md` y pasar `test_access_policy.py`.

2. **Integración en la Interfaz de Configuración (Frontend):**
   - Enriquecer `src/features/plataforma/components/salud-sistema-section.tsx` (o crear `src/features/plataforma/components/telemetria-sql-card.tsx` acoplado limpiamente a la vista):
     * Visualizar tarjeta o sección de **"Rendimiento SQL & Consultas en Tiempo Real (pg_stat_statements)"**.
     * Métricas destacadas en badges/KPIs: **Cache Hit Ratio (ej. 99.4%)**, **Consultas Registradas** y **Latencia Media**.
     * Tabla o listado interactivo con el Top de consultas: resumen SQL sanitizado, tiempo medio en ms, número de llamadas y eficiencia de caché.
     * Botón de refresco manual con feedback visual (`sonner toast`).

3. **Pruebas Automatizadas y Calidad:**
   - Crear `backend/tests/test_database_telemetry.py` que valide:
     * Retorno 200 con estructura válida `DatabaseTelemetryResponse`.
     * Presencia de `top_queries` no vacío y campos numéricos coherentes (`calls >= 1`, `mean_ms >= 0`).
     * Manejo ante ordenamiento por `tiempo_total`, `tiempo_medio` o `llamadas`.
   - Pruebas frontend: `bun test src/features/plataforma/`.
   - Quality Gates innegociables: `bun run ui:check`, `bun run check`, `bun test`, `pytest`, `alembic check`.

---

## 📋 2. Requerimientos Técnicos y Especificación de Contrato

### A. Contrato API (`GET /api/v1/health/database/queries`)
- **Query Params:**
  - `limite: int = 10` (rango entre 1 y 50)
  - `ordenar_por: str = "tiempo_total"` (opciones: `"tiempo_total"`, `"tiempo_medio"`, `"llamadas"`)
- **Respuesta JSON:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-11T22:40:00Z",
    "total_queries_recorded": 2340,
    "cache_hit_ratio_pct": 99.45,
    "top_queries": [
      {
        "query": "SELECT count(*) FROM mesas_trabajo.mesas ...",
        "calls": 1420,
        "total_ms": 115.42,
        "mean_ms": 0.08,
        "rows": 1420,
        "hit_ratio_pct": 99.85
      }
    ]
  }
  ```

### B. Consulta SQL de Referencia (`pg_stat_statements`)
```sql
SELECT
    query,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    rows,
    CASE 
        WHEN (shared_blks_hit + shared_blks_read) = 0 THEN 100.0
        ELSE round((shared_blks_hit::numeric / (shared_blks_hit + shared_blks_read)::numeric) * 100, 2)
    END AS hit_ratio_pct
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT :limite;
```

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Suite Telemetría SQL Backend** | `/root/polis/venv/bin/pytest backend/tests/test_database_telemetry.py` | 100% verde |
| **Paridad RBAC** | `/root/polis/venv/bin/pytest backend/tests/test_access_policy.py` | 100% verde |
| **Pruebas Plataforma Frontend** | `bun test src/features/plataforma/` | 100% verde |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 417+ pasadas |
| **Alembic Schema Check** | `cd backend && /root/polis/venv/bin/alembic check` | No new upgrade operations |

---

## 📦 4. Entregables y Salvaguardas

1. **Código Implementado:** Rutas, servicio, repositorio y schemas en `backend/app/modules/health/` e integración en `src/features/plataforma/components/`.
2. **Salvaguardas Inviolables:**
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas, 17 actores).
   - Sanitización de consultas para evitar filtración de contraseñas, tokens o PII.
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `feat(ops): telemetria forense sql en vivo pg_stat_statements OPS-FORENSIC-01`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial.
