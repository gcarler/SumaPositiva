# Encargo 256: Diagnóstico y Remediación de Gestión de Testimonios (`/plataforma/testimonios`)

**Fecha:** 2026-10-28  
**Origen:** Reporte de usuario en producción  
**Asignado a:** AGY2 (`=agy2:0.0`)  
**Coordinador:** Antigravity (Coordinador General)  
**URL Producción:** `https://seguridadhumanaintegral.org/plataforma/testimonios`

---

## 1. Hallazgo Reportado por el Usuario

> "Hallazgo crítico: Acabo de revisar el menú testimonios y la plataforma no me deja gestionarlos es decir no puedo crear ni editar ni dejar en borrador ni publicar testimonios por favor revisa ese tema puedes pedirle a AGY2 que se encarga de revisar qué pasó Y por qué no está funcionando. link: https://seguridadhumanaintegral.org/plataforma/testimonios"

---

## 2. Diagnóstico Técnico Preliminar Realizado por Coordinación

### A. Base de Datos (`participacion_ciudadana.testimonios_comunitarios`)
1. **Restricción de Integridad Excluyente (`chk_estado_testimonio`)**:
   ```sql
   CONSTRAINT chk_estado_testimonio CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADO'::character varying, 'DESTACADO'::character varying, 'RECHAZADO'::character varying])::text[])))
   ```
   - El estado **`BORRADOR`** **NO está permitido** en la base de datos a nivel de constraint. Cualquier intento de persistir un borrador dispararía un error `CheckViolation`.
   - Se requiere migración Alembic (o actualización de constraint) para admitir `'BORRADOR'`.

### B. Backend (`backend/app/modules/testimonios/`)
1. **`models.py` & `schemas.py`**:
   - `estado` por defecto es `PENDIENTE`.
   - `TestimonioModeracion` solo contempla `APROBADO`, `DESTACADO`, `RECHAZADO`. No contempla `BORRADOR` ni transición a borrador.
   - `TestimonioCrear` no recibe `estado` (siempre crea en `PENDIENTE`).
   - `TestimonioEdicion` no recibe `estado` (solo actualiza campos textuales y metadatos, no permite publicar directamente ni pasar a borrador).
2. **`service.py` & `repository.py`**:
   - `crear_testimonio`: fuerza `estado="PENDIENTE"` sin permitir que un usuario con permisos institucionales cree en `BORRADOR` o `APROBADO`.
   - `editar_testimonio`: no modifica `estado`.
   - `obtener_resumen_metricas`: solo agrupa y cuenta `aprobados`, `destacados`, `pendientes`, `rechazados`. No computa `borradores`.
   - `listar_publicos`: filtra `estado IN ('APROBADO', 'DESTACADO')`. Esto está correcto para la galería pública, asegurando que `BORRADOR` nunca se filtre al público.
3. **`router.py`**:
   - `POST /api/v1/testimonios`: solo permite creación normal en `PENDIENTE`. Falta soporte para guardar como `BORRADOR` o publicar directamente si el usuario tiene permiso institucional (`testimonios:moderar`).

### C. Frontend (`src/features/testimonios/` y `src/features/plataforma/`)
1. **`testimonio-editor-panel.tsx`**:
   - **No existe selector de estado ni botones diferenciados** de "Guardar Borrador" vs "Publicar Testimonio". Solo hay un botón genérico "Registrar Testimonio" / "Guardar cambios".
   - Al guardar, no envía `estado`.
2. **`testimonios-moderacion-panel.tsx`**:
   - Las pestañas de moderación solo contemplan: `Pendientes`, `Aprobados`, `Destacados`, `Rechazados`.
   - **No existe pestaña de `Borradores`** para que el gestor pueda revisar, retomar y publicar los testimonios que dejó en borrador.
3. **Métricas en `/plataforma/testimonios` (`testimonios-view.tsx`)**:
   - Solo muestra contadores de: Pendientes, Aprobados, Destacados, Rechazados. Falta incluir métrica de Borradores si aplica.

---

## 3. Plan de Acción y Tareas para AGY2

### Tarea 1: Base de Datos y Migración Alembic
- Crear migración Alembic que modifique el check constraint `chk_estado_testimonio` en `participacion_ciudadana.testimonios_comunitarios` para admitir `'BORRADOR'`:
  ```sql
  ALTER TABLE participacion_ciudadana.testimonios_comunitarios 
  DROP CONSTRAINT chk_estado_testimonio,
  ADD CONSTRAINT chk_estado_testimonio 
  CHECK (estado IN ('BORRADOR', 'PENDIENTE', 'APROBADO', 'DESTACADO', 'RECHAZADO'));
  ```

### Tarea 2: Backend (Modelos, Esquemas, Servicios y Rutas)
- Actualizar `models.py`, `schemas.py`:
  - Agregar `BORRADOR` a `EstadoTestimonio`.
  - Permitir campo opcional `estado: str | None = None` en `TestimonioCrear` y `TestimonioEdicion` (validando que solo usuarios con `testimonios:moderar` puedan fijar `BORRADOR` o `APROBADO` directamente).
  - Incluir `borradores: int` en `ResumenTestimonios`.
- Actualizar `service.py` y `repository.py`:
  - Permitir creación con `estado` inicial (`BORRADOR` o `PENDIENTE` o `APROBADO`).
  - Permitir actualización de `estado` en edición o moderación.
  - Actualizar cálculo de métricas de resumen para incluir conteo de `borradores`.
- Probar suites de backend (`pytest backend/tests/test_testimonios_comunitarios.py`) y asegurar ruff limpio.

### Tarea 3: Frontend (Tipos, Paneles y Vistas)
- `src/features/testimonios/models/testimonio.ts`:
  - Ampliar `EstadoTestimonio = "BORRADOR" | "PENDIENTE" | "APROBADO" | "DESTACADO" | "RECHAZADO"`.
  - Actualizar `ResumenTestimonios` con `borradores?: number`.
- `src/features/testimonios/panels/testimonio-editor-panel.tsx`:
  - Añadir selector visual o botones claros de acción:
    - **"Guardar como Borrador"** (establece `estado: "BORRADOR"`).
    - **"Publicar Testimonio"** (establece `estado: "APROBADO"` directamente para gestores con permiso `testimonios:moderar`).
    - **"Enviar a Moderación"** (establece `estado: "PENDIENTE"`).
- `src/features/testimonios/panels/testimonios-moderacion-panel.tsx`:
  - Añadir pestaña **"Borradores"** al gestor institucional.
  - Acciones rápidas sobre borradores: editar, publicar o descartar.
- `src/features/plataforma/views/testimonios-view.tsx`:
  - Reflejar métricas completas (incluyendo Borradores) en el tablero de testimonios.

---

## 4. Entregables Esperados
1. Migración Alembic ejecutada y aplicada limpiamente.
2. Endpoints backend verificados con `curl` y `pytest`.
3. Frontend compilado y verificado con `bun test` o `bun run build`.
4. Servicio `polis-backend.service` y frontend recargados en producción.
5. Bitácora de entrega en `bridge/256_resultado_agy2_testimonios.md`.
