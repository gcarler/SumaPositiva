# Entrega Encargo 265: Habilitación de Carga y Gestión de Anexos / Archivos Adjuntos en Actividades del Módulo de Proyectos

**Fecha de Entrega:** 29 de octubre de 2026  
**Responsable:** AGY2  
**Destinatario:** Coordinador Antigravity (`agy:0.0`) y Usuario Administrador  
**Módulos intervenidos:** `backend/app/modules/proyectos/`, `backend/alembic/`, `src/features/proyectos/`, `src/app/_stories/proyectos.stories.tsx`  
**Estado:** Concluido exitosamente y verificado al 100% en entorno de producción y pruebas.

---

## 1. Resumen Ejecutivo

En atención al hallazgo reportado por el administrador general:
> *"en el modulo de proyectos: las actividades no permiten cargar anexos o archivos adjuntos"*

Se implementó la solución integral de punta a punta:
1. **Persistencia y Base de Datos:** Creación de la tabla `participacion_ciudadana.actividades_anexos` e índices especializados vía migración Alembic `0090_anexos_actividades` aplicada tanto a la base de producción `bd_csh` como a `polis_test`.
2. **Backend FastAPI:** Modelo ORM SQLAlchemy (`ActividadAnexo`), esquemas Pydantic (`AnexoActividadLectura`), capa de repositorio, servicio con validación estricta de extensiones/tamaño (hasta 25 MB) y cálculo de hash criptográfico SHA-256, y 4 endpoints REST en `/api/v1/proyectos/actividades/{actividad_id}/anexos`.
3. **Frontend Next.js / React:**
   - Tipado TypeScript de `AnexoActividad` en `actividad-proyecto.ts`.
   - Primitivas API en `proyectos-api.ts` con soporte `multipart/form-data` y descarga autenticada `blob`.
   - Sección interactiva y accesible en `FichaActividadPanel` con drag & drop / selector de archivos, barra de progreso y spinners, discriminación de iconos según formato de documento (PDF, Excel, Imagen, Archivo, etc.), visualización de tamaño en KB/MB, fecha y responsable, descarga directa y eliminación protegida por confirmación.
   - Guardas pedagógicas para usuarios sin permisos de edición (modo consulta y auditoría).
4. **Verificación y Calidad:**
   - 10 pruebas unitarias y de integración backend (`pytest`) pasando al 100% (`test_proyectos_anexos.py` y `test_proyectos_agregacion.py`).
   - `bun run check` (UI Policy, TypeScript y ESLint) con 0 errores.
   - `bun test src/features/proyectos/` con 5/5 pruebas aprobadas.
   - `bun run build` exitoso generando 201/201 páginas estáticas.
   - Servicios `polis-backend.service` y `polis-frontend.service` reiniciados y activos.
   - Prueba en vivo de subida, descarga y borrado ejecutada exitosamente con la sesión real de `administrador_identidades`.

---

## 2. Detalle de Cambios Técnicos

### 2.1 Base de Datos (Alembic)
- **Archivo:** `backend/alembic/versions/0090_anexos_actividades.py` (Revisión: `0090_anexos_actividades`, 24 caracteres acorde a la restricción VARCHAR(32)).
- **Estructura creada:**
  ```sql
  CREATE TABLE participacion_ciudadana.actividades_anexos (
      id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
      actividad_id VARCHAR(120) NOT NULL,
      modulo_dueno VARCHAR(50) NOT NULL,
      recurso_id VARCHAR(100) NOT NULL,
      nombre_archivo_original VARCHAR(255) NOT NULL,
      nombre_archivo_seguro VARCHAR(255) NOT NULL,
      ruta_almacenamiento VARCHAR(500) NOT NULL,
      tipo_mime VARCHAR(100) NOT NULL,
      tamano_bytes INTEGER NOT NULL,
      hash_sha256 VARCHAR(64) NOT NULL,
      descripcion TEXT,
      subido_por_sujeto_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
      subido_por_nombre VARCHAR(150),
      creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
      eliminado_en TIMESTAMP WITH TIME ZONE
  );
  CREATE INDEX idx_actividades_anexos_actividad ON participacion_ciudadana.actividades_anexos (actividad_id) WHERE eliminado_en IS NULL;
  CREATE INDEX idx_actividades_anexos_modulo_recurso ON participacion_ciudadana.actividades_anexos (modulo_dueno, recurso_id) WHERE eliminado_en IS NULL;
  ```

### 2.2 Backend (`backend/app/modules/proyectos/`)
- **`models.py`:** Definición del modelo ORM `ActividadAnexo` mapeado a `participacion_ciudadana.actividades_anexos`.
- **`schemas.py`:** Esquema `AnexoActividadLectura` y adición del campo `total_anexos: int = 0` en `ActividadProyectoLectura`.
- **`repository.py`:** Métodos `listar_anexos`, `obtener_anexo`, `crear_anexo`, `eliminar_anexo` (soft-delete con `eliminado_en`), `conteo_anexos_por_actividad` y verificación polimórfica `existe_actividad`.
- **`service.py`:** Validación de tamaño (máx 25 MB), extensiones autorizadas (PDF, DOCX, XLSX, PPTX, imágenes, ZIP, CSV, TXT), sanitización de nombres, persistencia física en `media/actividades_anexos` y resolución de auditoría con nombre de usuario.
- **`router.py`:** Endpoints implementados con política de seguridad institucional:
  - `GET /api/v1/proyectos/actividades/{actividad_id}/anexos` (requiere `proyectos:leer`)
  - `POST /api/v1/proyectos/actividades/{actividad_id}/anexos` (status 201, `UploadFile` + `Form`, requiere rol institucional o `proyectos:escribir` / `comunicaciones:gestionar` / `mesas:abrir` / `formularios:gestionar`)
  - `GET /api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}/archivo` (`FileResponse` attachment con nombre original)
  - `DELETE /api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}` (status 204)

### 2.3 Frontend (`src/features/proyectos/`)
- **`models/actividad-proyecto.ts`:** Interfaz `AnexoActividad` con metadatos completos y `total_anexos` opcional.
- **`services/proyectos-api.ts`:** Funciones `listarAnexosActividad`, `subirAnexoActividad`, `descargarAnexoActividad` y `eliminarAnexoActividad`.
- **`panels/ficha-actividad-panel.tsx`:** Sección interactiva **"Anexos y Archivos Adjuntos"**:
  - Drag and drop zone con selector accesible (cumpliendo UI001 con componentes del kit).
  - Listado en tarjetas de diseño semántico con badges y conteo.
  - Botón de descarga directa autenticada.
  - Botón de eliminación con paso de confirmación inmediata.
  - Indicadores de carga `Loader2` y mensajes pedagógicos ante lectura estricta.
- **`src/app/_stories/proyectos.stories.tsx`:** Actualización de mocks para Storybook.

---

## 3. Matriz de Pruebas y Acreditación

| Ámbito | Comando / Escenario | Resultado |
|---|---|---|
| **Alembic DB** | `alembic upgrade head` en `bd_csh` y `polis_test` | **EXITOSO** (head `0090_anexos_actividades`) |
| **Backend Unit & Integration** | `pytest backend/tests/test_proyectos_anexos.py` | **3 PASSED** |
| **Backend Agregación** | `pytest backend/tests/test_proyectos_agregacion.py` | **7 PASSED** |
| **Backend Linter** | `ruff check backend/app/modules/proyectos/` | **All checks passed!** |
| **Frontend UI Policy** | `node scripts/ui-policy.mjs` | **0 incumplimientos** |
| **Frontend Typecheck** | `bun run typecheck` (`tsc --noEmit`) | **0 errores** |
| **Frontend Linter** | `bun run lint` (`eslint .`) | **0 errores** |
| **Frontend Tests** | `bun test src/features/proyectos/` | **5 PASSED** |
| **Frontend Build** | `bun run build` | **201/201 páginas estáticas OK** |
| **Prueba en Vivo Producción** | Ciclo completo subida/descarga/eliminación con usuario administrador | **EXITOSO AL 100%** |

---

## 4. Estado de Servicios en Servidor

- `systemctl is-active polis-backend.service`: **active**
- `systemctl is-active polis-frontend.service`: **active**
- Ruta en vivo: `https://seguridadhumanaintegral.org/plataforma/proyectos`
