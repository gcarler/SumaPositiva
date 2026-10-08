# TAREA ACTIVA: [AUD21-H01] REMEDIACIÓN DE MATRIZ DE ACCESO Y ALINEACIÓN DE ESQUEMA ALEMBIQUE

**Fecha**: 2026-10-08  
**Asignada a**: `agy2` (Desarrollador / EDD)  
**Supervisor / Auditor**: `agy` (Coordinador / Auditor Forense EAF)  
**Objetivo**: Subsanar los 2 hallazgos identificados en la Auditoría Forense de Línea Base para alcanzar 100% de pruebas verdes en backend y cero drift en Alembic.

---

## 🎯 Alcance Técnico Requerido:

### Hito 1: Registro de Rutas de Comunicaciones en Matriz de Permisos (`HALLAZGO-BACKEND-01`)
1. **Archivo a Actualizar**: `docs/permisos-api.md`.
2. **Rutas a Registrar**:
   - `POST /api/v1/comunicaciones/tareas`: Clasificación de control, rol requerido (ej. `autoridad_distrital`, `admin`) y justificación de producto.
   - `GET /api/v1/comunicaciones/tareas`: Control de acceso y visibilidad.
   - `GET /api/v1/comunicaciones/tareas/{id}`: Control de acceso por ID.
   - `PUT /api/v1/comunicaciones/tareas/{id}`: Rol administrativo requerido.
   - `PATCH /api/v1/comunicaciones/tareas/{id}`: Rol administrativo / edición de cronograma.
   - `DELETE /api/v1/comunicaciones/tareas/{id}`: Rol administrativo restrictivo.
3. **Criterio de Éxito**:
   - La prueba `backend/.venv/bin/pytest backend/tests/test_access_policy.py` debe pasar al 100% (sin AssertionError en `test_matriz_cubre_todas_las_rutas_y_sus_controles`).

### Hito 2: Alineación de Modelo SQLAlchemy `Mesa` con `bd_csh` (`HALLAZGO-BD-01`)
1. **Archivo a Ajustar**: `backend/app/modules/mesas/models/mesa.py` (y `fotos_mesa` si aplica).
2. **Ajustes de Tipado y Longitud**:
   - Ajustar `slug`: de `String(100)` a `String(180)` (o tipo exacto de BD `VARCHAR(180)`).
   - Ajustar `nombre`: `String(255)`.
   - Ajustar `lugar_nombre`: `String(255)`.
   - Ajustar `estado`: `String(30)`.
   - Ajustar `modalidad`: `String(30)`.
   - Normalizar la restricción de unicidad en `fotos_mesa.evidencia_id` para que coincida exactamente con la definición física de la tabla.
3. **Criterio de Éxito**:
   - Ejecutar en `/root/polis/backend`: `.venv/bin/alembic check` y debe retornar `No new upgrade operations detected.` (código de salida 0).

---

## 📋 Quality Gates de Entrega Obligatorios:
1. `backend/.venv/bin/pytest backend/tests/test_access_policy.py` -> **100% verde (0 fallas)**.
2. `cd /root/polis/backend && .venv/bin/alembic check` -> **0 diffs**.
3. `bun run check` -> **0 errores** (TypeScript, ESLint, UI tokens).
4. `bun test` -> **313 pruebas pasando**.
5. Cero `git push` a remoto. Commits atómicos locales descriptivos.
6. Documentar el informe pericial en `/root/polis/bridge/02_resultado_agy2.md`.
7. Al finalizar, solicitar auditoría pericial a `agy`.
