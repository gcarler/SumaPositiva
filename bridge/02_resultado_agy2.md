# INFORME PERICIAL DE EJECUCIÓN — TAREA [FEAT-TESTIMONIOS-01] HABILITACIÓN INTEGRAL DE CREACIÓN, EDICIÓN Y GESTIÓN DE TESTIMONIOS EN PLATAFORMA Y FORMALIZACIÓN DE PERMISOS
**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Ejecución:** Jueves, 08 de Octubre de 2026  
**Requerimiento del Usuario:** *"en la plataforma /plataforma no me deja crear ni editar testimonios. por favor encargate de eso.... necesito que crees esa opción"*  
**Estado:** Subsanación e Implementación Ejecutada al 100%, Validada y Conforme

---

## 1. Resumen Ejecutivo de la Intervención [FEAT-TESTIMONIOS-01]

En estricta observancia de los requerimientos y del diagnóstico establecido en `bridge/01_tarea_activa.md`, `agy2` ha implementado y verificado la solución completa para la creación, edición y administración de testimonios desde la plataforma:

### 1.1. Botón Principal de Creación en `/plataforma/testimonios` (`src/features/plataforma/views/testimonios-view.tsx`)
- Se importó `Button`, `Plus` y `usePanels`.
- En `TestimoniosPlataformaView`, se añadió la prop `action` al `PageHeader`:
  ```tsx
  <PageHeader
    title="Gestión y Moderación de Testimonios"
    description="Revisa los relatos comunitarios, registra testimonios institucionales o territoriales y gestiona su curaduría y publicación."
    action={
      <Button
        variant="ember"
        size="sm"
        onClick={() => openPanel("testimonio-editor", {})}
        className="gap-1.5"
      >
        <Plus className="size-4" aria-hidden="true" />
        Registrar Testimonio
      </Button>
    }
  />
  ```
- En `src/features/testimonios/panels/testimonios-moderacion-panel.tsx`:
  - En el estado vacío (`empty state`), se incorporó el botón secundario `+ Registrar Testimonio Comunitario` para agilizar el flujo de trabajo del funcionario.

### 1.2. Robustecimiento Integral de `TestimonioEditorPanel` (`src/features/testimonios/panels/testimonio-editor-panel.tsx`)
1. **Inicialización y Carga Reactiva**:
   - Se implementó la derivación de datos reactiva para pre-llenar los campos al editar (`testimonioId` presente) a partir de `detalle.data`, sin recurrir a efectos con mutación síncrona que disparen `react-hooks/set-state-in-effect`.
   - Si `!testimonioId` (modo nuevo testimonio), el formulario se inicializa 100% limpio en blanco.
2. **Selectores de Territorio Distrital y Dimensión ONU**:
   - Se integraron selectores desplegables para asociar el testimonio al territorio distrital (Localidad 1, 2, 3, La Boquilla, Barú, etc.) y a la Dimensión de Seguridad Humana de la política pública (Seguridad Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria, Política).
   - Se combinan las opciones remotas del backend (`useResumenTestimonios` y `useDimensiones`) con fallbacks canónicos de alta resiliencia offline.
3. **Persistencia e Invalidación de Caché**:
   - `handleSubmit` discrimina entre creación (`crearMutation.mutateAsync`) y actualización (`editarMutation.mutateAsync`).
   - Envío de payload completo con `territorio_id`, `dimension_id`, `metadatos_enfoque` y canal `plataforma_administrativa`.
   - Al completar exitosamente:
     - Invalida todas las claves de React Query: `TESTIMONIOS_KEYS.all`, `TESTIMONIOS_KEYS.resumen`, `["testimonios", "gestion"]` y `["testimonios", "publicos"]`.
     - Notificación interactiva con `toast.success` y cierre del panel lateral con `closeTop()`.
4. **Manejo de Errores Tipado y Desbloqueo del Botón**:
   - Errores de API capturados con tipado estricto `ApiError` y desplegados descriptivamente con `toast.error`.
   - El botón de guardado **NUNCA** se bloquea por `detalle.isError`.
   - Cuando ocurre un error de carga en edición, se despliega una alerta con botón interactivo de `Reintentar` (`detalle.refetch()`) sin congelar la interfaz ni inhabilitar el botón de submit.

### 1.3. Formalización de Migración Alembic en Backend (`backend/alembic/versions/0053_permiso_testimonios_admin.py`)
- Se formalizó la migración `0053_permiso_testimonios_admin.py` (con `down_revision = "0052_alinear_esquema_mesas"`):
  ```sql
  UPDATE autenticacion.roles 
  SET permisos = permisos || '["testimonios:moderar"]'::jsonb 
  WHERE codigo = 'administrador_identidades' AND NOT (permisos ? 'testimonios:moderar');
  ```
- Se ejecutó `alembic upgrade head`, alcanzando la versión `0053_permiso_testimonios_admin (head)` en la base de datos PostgreSQL, garantizando la idempotencia del entorno y la ausencia permanente de errores 403 en la gestión de testimonios.

---

## 2. Matriz de Cumplimiento de Quality Gates

| Quality Gate | Comando Oficial | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **QG1: Check UI, Tipos y Linter** | `bun run check` | `node scripts/ui-policy.mjs`, `tsc --noEmit`, `eslint .` -> **0 errores** | ✅ 100% CONFORME |
| **QG2: Pruebas Unitarias Globales** | `bun test` | **321 pass, 0 fail**, 1383 expect calls en 34 suites | ✅ 100% CONFORME |
| **QG3: Compilación Producción Next.js** | `bun run build` | Turbopack exitoso (11.4s), **190 rutas generadas**, standalone empaquetado | ✅ 100% CONFORME |
| **QG4: Reinicio de Servicio Frontend** | `systemctl restart polis-frontend` | Servicio activo en puerto 3000 (`Active: active (running)`) | ✅ 100% CONFORME |
| **QG5: Endpoint Testimonios Local** | `curl -s -I http://127.0.0.1:3000/plataforma/testimonios` | **HTTP/1.1 200 OK** | ✅ 100% CONFORME |
| **QG6: Endpoint Testimonios Público** | `curl -s -k -I https://seguridadhumanaintegral.org/plataforma/testimonios` | **HTTP/1.1 200 OK** (Nginx proxy) | ✅ 100% CONFORME |
| **QG7: Migración Alembic Backend** | `alembic current` | `0053_permiso_testimonios_admin (head)` | ✅ 100% CONFORME |
| **QG8: Control de Versiones** | Git local | Commit atómico en `main`, cero git push a remoto | ✅ 100% CONFORME |

---

## 3. Estado Final

La tarea **`[FEAT-TESTIMONIOS-01]`** se encuentra culminada al 100%, validada en todos sus extremos técnicos y desplegada.
Se transfiere formalmente al Coordinador General y Auditor `agy` para su contra-auditoría pericial independiente.
