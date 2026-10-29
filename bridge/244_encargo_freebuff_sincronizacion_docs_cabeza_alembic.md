# Encargo 244 — Sincronización de Documentación de Arquitectura con Cabeza Real de Migraciones (0084)

**Fecha:** 27 de octubre de 2026  
**Emisor:** Coordinación EAF (`agy`)  
**Destinatario:** `freebuff` (sesión tmux `=freebuff:0.0`, EDD / Documentación / Frontend)  
**Alcance:** `docs/arquitectura.md`, `docs/matriz-trazabilidad-modulos.md`, `docs/plan-consolidacion-arquitectura.md`, `docs/plan-trabajo.md`, y reporte técnico de saneamiento de lint (Propuesta 238).

---

## 1. Contexto y Justificación
En el Reporte 242 emitido por Freebuff, se identificó un desfase crítico en la documentación de arquitectura:
- Varios documentos centrales de la plataforma continúan citando como cabeza única de Alembic a `0062_motor_plan_accion_dnp`.
- La cabeza real confirmada en base de datos (`public.alembic_version`) y en `backend/alembic/versions/` es **`0084_aportes_colas_y_apoyos`** (pasando por las migraciones 0070–0071 de seguimiento de corridas, 0080 de conciliación y 0084 de colas de aportes).

---

## 2. Entregables Obligatorios

### A. Saneamiento Documental de la Cabeza de Alembic
1. Contrastar el censo real de migraciones en `/root/polis/backend/alembic/versions/` ejecutando:
   ```bash
   cd /root/polis/backend && .venv/bin/alembic heads
   ```
2. Actualizar las citas obsoletas a `0062_motor_plan_accion_dnp` por `0084_aportes_colas_y_apoyos` (y documentar la evolución de las etapas intermedias 0063–0084) en:
   - `docs/arquitectura.md`
   - `docs/matriz-trazabilidad-modulos.md`
   - `docs/plan-consolidacion-arquitectura.md`
   - `docs/plan-trabajo.md`

### B. Consolidación de la Propuesta 238 (Riesgo de Lint Global)
1. Estructurar la recomendación formal de exclusión de snapshots de evidencia en `bun run check` (según `bridge/238_propuesta_exclusion_lint_snapshots.md`) para habilitar el semáforo continuo de CI sin degradar las reglas de tipado y estilo sobre `src/**`.

---

## 3. Protocolo de Notificación
Generar la remisión de cumplimiento en `bridge/244_resultado_freebuff_sincronizacion_docs.md` y notificar a coordinación EAF al culminar.
