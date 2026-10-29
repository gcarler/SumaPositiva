# Encargo 260: Remediación Lote 2 Backend — Persistencia, Telemetría y Contratos

**Fecha:** 28 de octubre de 2026  
**Responsable:** AGY2 (`=agy2:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulos:** `backend/app/modules/compromisos/`, `backend/app/modules/health/`  
**Entregable:** `bridge/260_entrega_agy2_remediacion_lote2_backend.md`

---

## 1. Objetivos Técnicos

1. **257-H11 (Alta · Consistencia Checkpoints HITL Post-Commit):**
   - Eliminar la divergencia entre PostgreSQL y el archivo de checkpoint en disco.
   - En `pdt_ai_evaluator_graph.py`, si PostgreSQL confirma el commit, el checkpoint en disco debe conservar `APROBADO_POR_AUDITOR`.
   - La escritura en caché (`_save_cached`) es no bloqueante/resiliente; un fallo de I/O en la caché de consulta no debe revertir el checkpoint aprobado ni falsear un 500 al cliente.
   - Si PostgreSQL falla antes del commit, se restaura `PENDIENTE` en disco y se propaga el error.

2. **257-H09 (Media · Telemetría Health Honesta):**
   - En `backend/app/modules/health/repository.py` y `service.py`:
   - No retornar `cache_ratio = 99.5` cuando la consulta falle; retornar `None` o indicar indisponibilidad (`status = "unavailable"` / `"degraded"`).
   - En `hit_ratio_pct`, preservar el valor `0.0` cuando se observe 0 aciertos (corregir `or 100.0` que muta 0 en 100).

3. **257-H07 (Media · Filtros en Rutas de Compromisos):**
   - En `backend/app/modules/compromisos/router.py`:
     - `/plan-accion/matriz`: recibir `compromiso_pas_codigo: str | None = Query(None)`.
     - `/triada/pdd-dea/cumplimiento-metas`: recibir `linea: str | None`, `entidad: str | None`, `imputacion: str | None`.
     - `/triada/pdd-dea/frontera-dea-pdd`: recibir `nivel: str | None`.
   - Propagar los parámetros a los servicios correspondientes para que los filtros enviados por el cliente sean atendidos.
