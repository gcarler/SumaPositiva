# TAREA ACTIVA: [FEAT-TESTIMONIOS-01] HABILITACIÓN INTEGRAL DE CREACIÓN, EDICIÓN Y GESTIÓN DE TESTIMONIOS EN PLATAFORMA

**Fecha**: 2026-10-08  
**Asignada a**: `agy2` (Desarrollador / EDD)  
**Supervisor / Auditor**: `agy` (Coordinador / Auditor Forense EAF)  
**Solicitud del Usuario**:
> *"en la plataforma /plaforma no me deja crear ni editar testimonios. por favor encargate de eso.... necesito que crees esa opción"*

---

## 🎯 1. Diagnóstico Pericial y Causa Raíz

La auditoría forense (`agy`) ha identificado las dos causas determinantes de la falla reportada:

1. **Ausencia de Interfaz de Creación en `/plataforma/testimonios`**:
   - En `src/features/plataforma/views/testimonios-view.tsx` (`TestimoniosPlataformaView`), el componente `PageHeader` **carece por completo** de prop `action` con botón de registro. Los administradores institucionales no disponían de ningún botón ni acceso para crear nuevos testimonios desde la plataforma.

2. **Causa Raíz de Falla al Editar (Error 403 y Bloqueo de Formulario)**:
   - En la base de datos PostgreSQL, el rol `administrador_identidades` no tenía el permiso `testimonios:moderar`.
   - Como resultado, las consultas a `/api/v1/testimonios/gestion/{id}` retornaban `403 Forbidden`. En `testimonio-editor-panel.tsx`, esto activaba `detalle.isError === true`, deshabilitando el botón de guardado (`disabled={... || detalle.isError}`) y bloqueando al usuario con la alerta *"No se pudo cargar el testimonio para editar."*
   - Adicionalmente, el formulario de edición no incluía selectores para `territorio_id` y `dimension_id`, enviando valores incompletos.
   - **Acción ya adelantada**: La auditoría (`agy`) ya ha aplicado la adición del permiso `testimonios:moderar` al rol `administrador_identidades` en la base de datos activa. `agy2` debe formalizar la migración correspondiente en Alembic para garantizar la idempotencia del entorno.

---

## 🛠️ 2. Especificación Técnica de Implementación

### 2.1. Botón de Creación en `/plataforma/testimonios`
- **Archivo**: `src/features/plataforma/views/testimonios-view.tsx`
- **Cambios**:
  - Importar `Button` y el icono `Plus` de `lucide-react`, junto con `usePanels` de `@/core/panels/panel-store`.
  - En `TestimoniosPlataformaView`:
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
  - En la sección inferior o vacía de `testimonios-moderacion-panel.tsx`, proveer un botón secundario "+ Registrar Testimonio Comunitario" para máxima ergonomía del funcionario.

### 2.2. Robustecimiento Integral de `TestimonioEditorPanel`
- **Archivo**: `src/features/testimonios/panels/testimonio-editor-panel.tsx`
- **Cambios requeridos**:
  1. **Inicialización y Carga de Datos**:
     - Usar `useEffect` para poblar el estado local `edicion` cuando `detalle.data` esté disponible al editar (`testimonioId` presente).
     - Si `!testimonioId` (nuevo testimonio), inicializar con formulario en blanco.
  2. **Selectores de Territorio y Dimensión**:
     - Incluir campos desplegables para asociar el testimonio al territorio distrital (ej. Localidad 1, Localidad 2, Localidad 3, Zona Insular) y a la Dimensión de Seguridad Humana de la política pública (usando datos existentes o catálogo distrital).
  3. **Envío y Persistencia (`handleSubmit`)**:
     - Si es edición (`testimonioId`): invocar `editarMutation.mutateAsync({ id: testimonioId, datos })`.
     - Si es nuevo: invocar `crearMutation.mutateAsync(datos)`.
     - Al éxito:
       - Notificación `toast.success(testimonioId ? "Testimonio actualizado correctamente" : "Testimonio registrado exitosamente")`.
       - Invalidar queries de React Query: `TESTIMONIOS_KEYS.all`, `TESTIMONIOS_KEYS.gestion`, `TESTIMONIOS_KEYS.resumen`, `TESTIMONIOS_KEYS.publicos()`.
       - Cerrar panel con `closeTop()`.
     - Al error: extraer el mensaje de error tipado (`error instanceof ApiError ? error.message : ...`) y mostrarlo con `toast.error`.
  4. **Habilitación del Botón**:
     - Si `detalle.isError` ocurre pero el usuario está en modo nuevo testimonio (`!testimonioId`), el botón NUNCA debe estar bloqueado.
     - Si es edición y ocurre error, permitir botón de reintento de carga sin congelar la interfaz.

### 2.3. Formalización de Migración Alembic en Backend
- **Directorio**: `backend/alembic/versions/`
- **Acción**:
  - Crear una migración idempotente (ej. `0052_permiso_testimonios_admin.py`) que asegure que `testimonios:moderar` forme parte de los permisos del rol `administrador_identidades`:
    ```sql
    UPDATE autenticacion.roles 
    SET permisos = permisos || '["testimonios:moderar"]'::jsonb 
    WHERE codigo = 'administrador_identidades' AND NOT (permisos ? 'testimonios:moderar');
    ```

---

## 🔒 3. Protocolo de Quality Gates

Antes de entregar, `agy2` debe verificar:
1. `bun run check`: 0 errores en `ui-policy.mjs`, `tsc --noEmit` y `eslint .`.
2. `bun test`: Pruebas de testimonios y plataforma 100% en verde.
3. `bun run build`: Empaquetado de producción de Turbopack exitoso (190 rutas).
4. `systemctl restart polis-frontend`: Frontend activo en puerto 3000.
5. Verificación HTTP en vivo:
   - `curl -s -I http://127.0.0.1:3000/plataforma/testimonios` -> 200 OK
   - `curl -s -k -I https://seguridadhumanaintegral.org/plataforma/testimonios` -> 200 OK
6. Commit local atómico en `main` (sin git push) con mensaje descriptivo (e.g. `feat(testimonios): creacion y edicion de testimonios desde plataforma y habilitacion de permisos (FEAT-TESTIMONIOS-01)`).
7. Registrar el informe de resultados en `bridge/02_resultado_agy2.md` y notificar a la sesión `agy`.
