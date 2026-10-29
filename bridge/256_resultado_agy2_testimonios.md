# Encargo 256 — Resultado de Diagnóstico y Remediación de Gestión de Testimonios (`/plataforma/testimonios`)

**Fecha:** 28 de octubre de 2026  
**Responsable:** AGY2 (`=agy2:0.0`)  
**Destinatario:** Coordinación de Política Pública y Sistemas EAF (`agy`) / Usuario  
**URL Producción Verificada:** `https://seguridadhumanaintegral.org/plataforma/testimonios`  
**Estado:** REMEDIADO Y DESPLEGADO EXITOSAMENTE  

---

## 1. Causa Raíz Identificada

El hallazgo reportado por el usuario ("no puedo crear ni editar ni dejar en borrador ni publicar testimonios") respondía a una desconexión estructural a través de las tres capas del sistema:

1. **Base de Datos:**
   El check constraint `chk_estado_testimonio` en `participacion_ciudadana.testimonios_comunitarios` solo admitía `('PENDIENTE', 'APROBADO', 'DESTACADO', 'RECHAZADO')`. El estado `BORRADOR` no estaba permitido a nivel de tabla, causando un fallo de integridad relacional en cualquier intento de persistencia.
2. **Backend (Schemas, Modelos y Servicios):**
   - `TestimonioCrear` no recibía `estado` y forzaba invariablemente `estado="PENDIENTE"`.
   - `TestimonioEdicion` no permitía alterar el estado del testimonio ni publicarlo directamente.
   - `TestimonioModeracion` no contemplaba transiciones hacia `BORRADOR`.
   - `ResumenTestimonios` no calculaba ni reportaba el conteo de borradores.
3. **Frontend (Paneles y Vistas):**
   - `testimonio-editor-panel.tsx` no contaba con selector de estado ni botones diferenciados ("Guardar Borrador", "Enviar a Moderación", "Publicar").
   - `testimonios-moderacion-panel.tsx` solo mostraba 4 pestañas (`Pendientes`, `Aprobados`, `Destacados`, `Rechazados`), impidiendo que un gestor visualizara y retomara sus borradores.
   - `testimonios-view.tsx` en plataforma no mostraba la tarjeta métrica de borradores.

---

## 2. Remediaciones Implementadas

### A. Migración de Base de Datos (Alembic)
- **Migración creada:** `backend/alembic/versions/0085_borrador_testimonios.py`.
- **Acción ejecutada:** Actualización del constraint `chk_estado_testimonio` para admitir `'BORRADOR'`:
  ```sql
  ALTER TABLE participacion_ciudadana.testimonios_comunitarios
  DROP CONSTRAINT IF EXISTS chk_estado_testimonio,
  ADD CONSTRAINT chk_estado_testimonio
  CHECK (estado IN ('BORRADOR', 'PENDIENTE', 'APROBADO', 'DESTACADO', 'RECHAZADO'));
  ```
- **Aplicado en:** Base de producción `bd_csh` y base de pruebas `polis_test`.

### B. Backend FastAPI
- **`backend/app/modules/testimonios/schemas.py`:**
  - `TestimonioCrear`: soporte para campo opcional `estado: str | None = Field(None, description="BORRADOR, PENDIENTE, APROBADO")`.
  - `TestimonioEdicion`: soporte para campo opcional `estado: str | None = Field(None, description="BORRADOR, PENDIENTE, APROBADO, DESTACADO, RECHAZADO")`.
  - `TestimonioModeracion`: ampliado para permitir `BORRADOR`.
  - `ResumenTestimonios`: agregado campo `borradores: int = 0`.
- **`backend/app/modules/testimonios/repository.py`:**
  - `actualizar_contenido`: preserva el estado si no se envía o lo actualiza si se especifica.
  - `obtener_resumen_metricas`: agrega `COUNT(*) FILTER (WHERE estado = 'BORRADOR') AS borradores`.
- **`backend/app/modules/testimonios/service.py`:**
  - `crear_testimonio`: valida estado inicial (`BORRADOR`, `PENDIENTE`, `APROBADO`). Exige permiso institucional (`testimonios:moderar`) para auto-aprobar directamente.
  - `moderar_testimonio`: admite transiciones a `BORRADOR`.
  - `editar_testimonio`: procesa mutaciones de contenido y de estado.
- **`backend/app/modules/testimonios/router.py`:**
  - `POST /api/v1/testimonios`: verifica si el sujeto tiene `testimonios:moderar` para autorizar creación en `APROBADO` directo o asigna `BORRADOR`/`PENDIENTE`.

### C. Frontend Next.js & React
- **`src/features/testimonios/models/testimonio.ts`:**
  - `EstadoTestimonio = "BORRADOR" | "PENDIENTE" | "APROBADO" | "DESTACADO" | "RECHAZADO"`.
  - `TestimonioCrearPeticion` incluye `estado?: EstadoTestimonio`.
  - `ResumenTestimonios` incluye `borradores?: number`.
- **`src/features/testimonios/panels/testimonio-editor-panel.tsx`:**
  - Incorporado selector de estado institucional (`Borrador`, `Pendiente`, `Aprobado`, `Destacado`, `Rechazado`).
  - Botones de acción contextuales claros:
    - **Guardar Borrador:** almacena en estado `BORRADOR` sin publicar ni enviar a cola pública.
    - **Enviar a Moderación:** guarda en estado `PENDIENTE` para revisión ética.
    - **Publicar Directamente / Guardar y Publicar:** guarda y pasa a `APROBADO` (o conserva `DESTACADO`).
- **`src/features/testimonios/panels/testimonios-moderacion-panel.tsx`:**
  - Pestañas ampliadas a 5: **Borradores**, **Pendientes**, **Aprobados**, **Destacados**, **Rechazados**.
  - Acciones rápidas en cada tarjeta: "Editar contenido", "Borrador" (para retirar de publicación o moderación), "A Pendientes", "Aprobar y Publicar", "Destacar" y "Rechazar" motivado.
  - `EstadoBadge` adaptado con estilo neutral para `BORRADOR`.
- **`src/features/plataforma/views/testimonios-view.tsx`:**
  - Matriz de métricas ampliada a 5 columnas: `Borradores`, `Pendientes`, `Aprobados`, `Destacados`, `Rechazados`.

---

## 3. Verificaciones y Calidad de Código

1. **Pruebas Automatizadas Backend:**
   - Archivo: `backend/tests/test_testimonios_comunitarios.py`.
   - Incorporado caso `test_ciclo_completo_borrador_y_publicacion_directa`:
     - Creación en `BORRADOR`.
     - Confirmación de exclusión en galería pública (`GET /api/v1/testimonios`).
     - Confirmación de inclusión en gestión interna con filtro `estado=BORRADOR`.
     - Verificación de contador `borradores >= 1` en `/api/v1/testimonios/resumen`.
     - Publicación directa vía edición (`PUT /api/v1/testimonios/{id}` a `APROBADO`) y aparición en galería pública.
     - Moderación de retorno a `BORRADOR`.
     - Rechazo con 403 a usuarios ciudadanos sin permisos que intenten auto-aprobar directamente.
   - **Resultado:** **7 de 7 tests pasando** (100%) en 17.52s.

2. **Linter & Formato Python:**
   - `uv run --project backend ruff check backend` -> **0 errores** (All checks passed).
   - `uv run --project backend ruff format --check backend` -> **546 files already formatted**.

3. **Tipado y Compilación Frontend:**
   - `bun run typecheck` (`tsc --noEmit`) -> **0 errores**.
   - `bun run build` (`node scripts/build-polis.mjs`) -> Compilación Turbopack y generación estática de 210/210 páginas completadas con éxito.

4. **Despliegue y Estado de Servicios:**
   - `systemctl restart polis-backend.service`: activo y funcionando en PID 3857747.
   - `systemctl restart polis-frontend.service`: activo y funcionando en PID 3866709.
   - Verificación HTTP en vivo:
     - `http://127.0.0.1:8000/api/v1/testimonios/resumen` -> 200 OK con campo `borradores: 0`.
     - `http://127.0.0.1:3000/plataforma/testimonios` -> 200 OK.

---

## 4. Remediación Adicional: Habilitación en Matriz de Paneles (`panelPermitido`)

- **Síntoma reportado por el administrador:** Al hacer clic en *"Editar contenido"* o *"+ Registrar Testimonio"* dentro de `/plataforma/testimonios`, aparecía el aviso de guardia de `PanelHost`:  
  > *"Acción no disponible — La sesión o el rol actual no permite esta acción."*
- **Causa raíz:** En `src/features/plataforma/models/acceso.ts`, la función `panelPermitido` evaluaba el tipo de panel contra un `switch`. Mientras que `"testimonios-moderacion"` estaba mapeado, el panel de edición `"testimonio-editor"` (y `"testimonio-nuevo"`, `"testimonios-galeria"`) no estaban contemplados en los casos y caían al `default: return false;`. Esto provocaba que `PanelHost` bloqueara el renderizado del panel considerándolo no autorizado.
- **Corrección:** Se incorporaron explícitamente al validador de acceso:
  ```typescript
  case "testimonios-galeria":
    return puedeVer(sesion, "testimonios");
  case "testimonio-editor":
  case "testimonio-nuevo":
  case "testimonios-moderacion":
    return puedeEditar(sesion, "testimonios");
  ```
- **Pruebas:** Incorporadas 7 aserciones en `src/features/plataforma/models/acceso.test.ts` (36 pruebas unitarias pasando al 100%). Recompilado el frontend y reiniciado `polis-frontend.service`. El panel lateral de edición abre con total normalidad para el administrador.
