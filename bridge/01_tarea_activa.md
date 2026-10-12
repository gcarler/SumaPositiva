# TAREA ACTIVA: [HERO-PAGES-04] SUITE INTEGRAL, UI CHECKS, FORENSE Y CIERRE DEL PLAN MAESTRO
## CERTIFICACIÓN GLOBAL DEL SISTEMA DE HEROS PÚBLICOS DE POLIS

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 4: Pruebas de Integración, UI Checks y Cierre Global (Tarea 4.1 y 4.2)  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / ASEGURAMIENTO DE CALIDAD, REGRESIÓN CERO Y FE PÚBLICA  

---

## 🎯 1. Justificación y Alcance de la Tarea

Con las tres fases de arquitectura e implementación culminadas exitosamente (`[HERO-PAGES-01]`, `[HERO-PAGES-02]`, `[HERO-PAGES-03]`), corresponde ejecutar la certificación global de extremo a extremo para asegurar:
1. Cero regresiones en todo el árbol de componentes frontend y backend.
2. Cumplimiento de la política arquitectónica UI (`ui-policy.mjs`).
3. Limpieza absoluta en TypeScript y ESLint (`bun run check`).
4. Inviolabilidad matemática de la base de datos oficial `bd_csh` (33 mesas, 36 agendas, 11 fichas, 17 actores).
5. Estado saludable de los servicios de producción (`polis-frontend`, `polis-backend`, `nginx`, `postgresql`).
6. Actualización y cierre formal del Plan Maestro en `bridge/00_plan_maestro_heros_territoriales_publicos.md`.

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Suite Completa Frontend** | `bun test` | 446+ pasadas (0 fail) |
| **Suite Backend FastAPI** | `pytest` en entorno virtual | 111+ pasadas (0 fail) |
| **Alembic Drift Check** | `alembic check` | 0 diferencias |
| **Inviolabilidad `bd_csh`** | Consulta directa PostgreSQL 18 | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |
| **Servicios en Producción** | `systemctl is-active` | `polis-frontend`, `polis-backend`, `nginx`, `postgresql` activos |

---

## 📦 3. Entregables y Compromisos

1. Ejecución de todos los Quality Gates sin advertencias.
2. Actualización del estado de las tareas en `bridge/00_plan_maestro_heros_territoriales_publicos.md` al 100% completado.
3. Commit atómico local: `test(hero): suite integral de pruebas y cierre de plan maestro HERO-PAGES-04`.
4. Registro de informe final en `bridge/02_resultado_agy2.md` y notificación a `agy` en `%0`.
