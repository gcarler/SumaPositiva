# Encargo 265: Habilitación de Carga y Gestión de Anexos / Archivos Adjuntos en Actividades del Módulo de Proyectos

**Fecha:** 29 de octubre de 2026  
**Origen:** Reporte de usuario / Administrador general (`gscarlosernesto@gmail.com`)  
**Asignado a:** AGY2 (`=agy2:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulos afectados:** `backend/app/modules/proyectos/`, `src/features/proyectos/`, `participacion_ciudadana` / `backend/alembic/`  
**Entregable esperado:** `bridge/265_entrega_agy2_proyectos_adjuntos_actividades.md`

---

## 1. Hallazgo Reportado

> "en el modulo de proyectos: las actividades no permiten cargar anexos o archivos adjuntos"

---

## 2. Diagnóstico Técnico Preliminar

1. **Frontend (`src/features/proyectos/`):**
   - El módulo `/plataforma/proyectos` permite consultar y gestionar las actividades de formulación de la política pública (en vistas Lista, Kanban, Gantt y Calendario).
   - Al seleccionar cualquier actividad, se abre el panel lateral `FichaActividadPanel` ([`src/features/proyectos/panels/ficha-actividad-panel.tsx`](file:///root/polis/src/features/proyectos/panels/ficha-actividad-panel.tsx)).
   - **Actualmente la ficha carece totalmente de sección, componentes o acciones para subir, listar o descargar archivos adjuntos o anexos documentales.**
   - El modelo TypeScript [`src/features/proyectos/models/actividad-proyecto.ts`](file:///root/polis/src/features/proyectos/models/actividad-proyecto.ts) no incluye campos ni tipos para anexos.
   - En [`src/features/proyectos/services/proyectos-api.ts`](file:///root/polis/src/features/proyectos/services/proyectos-api.ts) no existen funciones de API para interactuar con archivos de actividades.

2. **Backend (`backend/app/modules/proyectos/`):**
   - [`backend/app/modules/proyectos/router.py`](file:///root/polis/backend/app/modules/proyectos/router.py) solo cuenta con dos rutas de lectura (`GET /actividades` y `GET /resumen`). No expone endpoints de carga o descarga multipart de archivos para actividades.
   - [`backend/app/modules/proyectos/schemas.py`](file:///root/polis/backend/app/modules/proyectos/schemas.py) y `repository.py` solo proyectan datos planos de comunicaciones, mesas y formularios.

3. **Base de Datos (`bd_csh`):**
   - No existe una tabla que relacione la clave compuesta de la actividad (`<modulo_dueno>:<recurso_id>`) con archivos almacenados en el storage de evidencias/adjuntos de POLIS.

---

## 3. Plan de Acción y Tareas Requeridas para AGY2

### Tarea 1: Base de Datos y Persistencia (Alembic)
1. Crear la migración Alembic (ej. `0090_anexos_actividades_proyectos.py`) sobre `bd_csh`:
   - Crear tabla `participacion_ciudadana.actividades_anexos` (o `proyectos.actividades_anexos`):
     - `id: UUID` (PK, default `public.generar_uuid_v7()`)
     - `actividad_id: String(120)` (ej. `comunicaciones:<uuid>`, `mesas:<codigo>`, `formularios:<uuid>`), indexada.
     - `modulo_dueno: String(50)` (`comunicaciones`, `mesas`, `formularios`)
     - `recurso_id: String(100)`
     - `nombre_archivo_original: String(255)` (nombre original del archivo subido)
     - `nombre_archivo_seguro: String(255)` (UUID o slug seguro)
     - `ruta_almacenamiento: String(500)` (ruta en disco en el volumen de evidencias/adjuntos)
     - `tipo_mime: String(100)` (ej. `application/pdf`, `image/png`, etc.)
     - `tamano_bytes: Integer`
     - `hash_sha256: String(64)`
     - `descripcion: Text` (opcional, notas sobre el documento)
     - `subido_por_sujeto_id: UUID` (nullable, FK o referencia de auditoría)
     - `subido_por_nombre: String(150)` (opcional)
     - `creado_en: DateTime(timezone=True)` (default `clock_timestamp()`)
     - `eliminado_en: DateTime(timezone=True)` (soft-delete opcional)

### Tarea 2: Modelos, Schemas y Endpoints Backend (`backend/app/modules/proyectos/`)
1. **Modelos y Schemas:**
   - Crear modelo ORM `ActividadAnexo` en `backend/app/modules/proyectos/models.py`.
   - Crear esquemas Pydantic `AnexoActividadLectura`, `AnexoActividadCrear` en `schemas.py`.
   - Extender `ActividadProyectoLectura` para incluir opcionalmente `anexos: list[AnexoActividadLectura] = []` o `total_anexos: int = 0`.
2. **Servicio y Repositorio:**
   - Implementar en `repository.py` y `service.py`:
     - `listar_anexos(actividad_id: str) -> list[ActividadAnexo]`
     - `guardar_anexo(actividad_id: str, archivo: UploadFile, descripcion: str | None, sujeto: ...)`
     - `obtener_anexo(actividad_id: str, anexo_id: UUID) -> ActividadAnexo`
     - `eliminar_anexo(actividad_id: str, anexo_id: UUID, sujeto: ...)`
   - Sanitizar nombres de archivo, calcular SHA-256 y validar cuotas/tipos permitidos (PDF, DOCX, XLSX, imágenes, etc.).
3. **Rutas en `router.py`:**
   - `GET /api/v1/proyectos/actividades/{actividad_id}/anexos`: Lista los anexos de la actividad (requiere `proyectos:leer`).
   - `POST /api/v1/proyectos/actividades/{actividad_id}/anexos`: Carga un anexo (`UploadFile`, `Form`) para la actividad (requiere permiso institucional o `proyectos:escribir` / `comunicaciones:gestionar` / `mesas:abrir`).
   - `GET /api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}/archivo`: Descarga segura del archivo físico mediante `FileResponse`.
   - `DELETE /api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}`: Eliminación de anexo por usuario autorizado.

### Tarea 3: Frontend y Panel de Actividad (`src/features/proyectos/`)
1. **Modelo y Servicios:**
   - En `src/features/proyectos/models/actividad-proyecto.ts`:
     - Definir interfaz `AnexoActividad`:
       ```ts
       export interface AnexoActividad {
         id: string;
         actividad_id: string;
         nombre_archivo: string;
         tipo_mime: string;
         tamano_bytes: number;
         hash_sha256: string;
         descripcion?: string | null;
         subido_por?: string | null;
         creado_en: string;
         url_descarga: string;
       }
       ```
   - En `src/features/proyectos/services/proyectos-api.ts`:
     - `listarAnexosActividad(actividadId: string): Promise<AnexoActividad[]>`
     - `subirAnexoActividad(actividadId: string, archivo: File, descripcion?: string): Promise<AnexoActividad>`
     - `eliminarAnexoActividad(actividadId: string, anexoId: string): Promise<void>`
2. **Componente de UI en `FichaActividadPanel` (`ficha-actividad-panel.tsx`):**
   - Incorporar una sección accesible e intuitiva **"Anexos y Archivos Adjuntos"**:
     - Visualizar la lista de archivos con iconos semánticos según formato (PDF, Excel, Word, Imagen, etc.).
     - Tamaño formateado en KB/MB y fecha de carga.
     - Botón de descarga directa del archivo.
     - Botón de eliminación (con confirmación o guardas de rol).
     - Componente de subida (Dropzone o botón "Adjuntar archivo") con soporte para arrastrar archivos o seleccionar desde el explorador.
     - Estados de carga (progreso/spinner), manejo de errores y notificaciones `toast.success` / `toast.error`.
     - Si el usuario no tiene permisos de edición, mostrar la lista en modo solo lectura ("Ver y descargar anexos") con mensaje pedagógico.

### Tarea 4: Validación y Pruebas
1. Backend:
   - Añadir tests unitarios/integración en `backend/tests/test_proyectos_anexos.py` validando subida, listado, descarga y borrado de anexos con roles autenticados y no autenticados.
2. Frontend:
   - Ejecutar `bun run check` (TypeScript, ESLint y UI-policy deben salir con 0 errores).
   - Ejecutar `bun test src/features/proyectos/` garantizando que no haya regresiones.
   - Ejecutar `bun run build` para asegurar la compilación de producción.
3. Despliegue:
   - Reiniciar `polis-backend.service` y `polis-frontend.service`.
   - Probar en vivo en `https://seguridadhumanaintegral.org/plataforma/proyectos`.

---

## 4. Instrucción de Inicio para AGY2
Por favor confirma la recepción del encargo, ejecuta el diagnóstico y procede con la implementación de acuerdo con el estándar de calidad y observabilidad de POLIS.
