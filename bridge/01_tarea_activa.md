# TAREA ACTIVA: [GEO-DOCK-04] CERTIFICACIÓN GLOBAL, BUILD DE PRODUCCIÓN Y CIERRE DEL PLAN MAESTRO
## REINGENIERÍA GEOVISOR STUDIO DE POLIS — FASE 4

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 4: Certificación Global, Quality Gates y Cierre del Plan Maestro (`bridge/00_plan_maestro_geovisor_docking.md`)  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / ASEGURAMIENTO DE CALIDAD, REGRESIÓN CERO Y PRODUCCIÓN  

---

## 🎯 1. Objetivos y Alcance de la Tarea

Con las tres fases de arquitectura, modularización y navegación bidireccional culminadas exitosamente (`[GEO-DOCK-01]`, `[GEO-DOCK-02]`, `[GEO-DOCK-03]`), corresponde ejecutar la certificación global de producción y cierre formal:

1. **Certificación de la Suite Completa:**
   * UI Architectural Linter (`bun run ui:check`).
   * TypeCheck y ESLint (`bun run check`).
   * Suite Completa Frontend (`bun test` con 486+ pruebas).
   * Suite Completa Backend FastAPI (`uv run --project backend pytest backend/tests`).
   * Verificación de migraciones Alembic (`uv run --project backend alembic -c backend/alembic.ini check`).

2. **Compilación de Producción y Verificación de Servicio:**
   * Ejecución de `bun run build`.
   * Reinicio del servicio de frontend: `systemctl restart polis-frontend`.
   * Verificación de disponibilidad con `curl -sI http://localhost:3000/geovisor` (debe responder HTTP 200 OK).

3. **Inviolabilidad Censal de Base de Datos:**
   * Comprobación en PostgreSQL 18: 33 mesas, 36 agendas, 11 fichas, 17 actores intactos.

4. **Actualización del Plan Maestro:**
   * Actualizar `bridge/00_plan_maestro_geovisor_docking.md` reflejando el 100% de ejecución.

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Suite Completa Frontend** | `bun test` | 486+ pasadas (0 fail) |
| **Suite Backend FastAPI** | `uv run --project backend pytest backend/tests` | 100% pasadas (0 fail) |
| **Alembic Drift Check** | `alembic check` en backend | 0 diferencias |
| **Build de Producción** | `bun run build` | Compilación exitosa |
| **Servicio Geovisor** | `curl -sI http://localhost:3000/geovisor` | HTTP 200 OK |
| **Inviolabilidad `bd_csh`** | Consulta directa PostgreSQL 18 | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |

---

## 📦 3. Entregables y Procedimiento

1. Ejecutar todos los Quality Gates sin advertencias.
2. Compilar la aplicación y verificar el servicio en producción.
3. Actualizar `bridge/00_plan_maestro_geovisor_docking.md` marcando todas las fases al 100%.
4. Formalizar commit atómico local en `main`: `test(geovisor): certificacion global de produccion y cierre de plan maestro GEO-DOCK-04`.
5. Reportar culminación en `bridge/02_resultado_agy2.md` y enviar notificación a `agy` en `%0`.
