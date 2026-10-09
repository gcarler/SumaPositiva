# TAREA ACTIVA: [GAP-FIX-02] CONEXIÓN REAL DE GESTIÓN DE USUARIOS Y ROLES A LA API FASTAPI

**Fecha:** 2026-10-09  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Plan de Trabajo Maestro homologado en `bridge/03_dictamen_revision.md` (Fase 2)  
**Severidad del GAP:** CRÍTICA (GAP-01 y GAP-08)  

---

## 🎯 1. Objetivos Técnicos de la Tarea [GAP-FIX-02]

El objetivo de esta fase es erradicar completamente los mocks en memoria (`usuariosDemo`, notices de "demostración", tarjetas "Pendiente") en la gestión de usuarios y roles, conectando la vista principal, los paneles de edición/detalle y el dashboard institucional con los endpoints canónicos de FastAPI (`identidadApi` / `/api/v1/identidad/`):

### 1.1. Conexión Real de `src/features/plataforma/views/usuarios-view.tsx`
1. **Consumo de API Real con React Query**:
   - Reemplazar la dependencia estática de `useUsuariosStore.usuarios` por consultas reactivas mediante `useQuery` a `identidadApi.usuarios(busqueda, pagina * 20)` y `identidadApi.roles()`.
   - Soportar paginación real basada en `data.total` y búsqueda por texto/correo.
   - Filtrado por rol compatible con los roles del sistema (`administrador_identidades`, `facilitador_mesa`, `auditor_forense`, `autoridad_distrital`, `ciudadano`).
2. **Erradicación de Mocks y Avisos de Demostración**:
   - Eliminar el `<Notice tone="info" title="Vista de demostración">`.
   - Eliminar el botón redundante inferior *"Abrir administración institucional"*. La pantalla `/plataforma/usuarios` es la administración canónica de usuarios.
3. **Métricas y KPIs Reales**:
   - Tarjetas de resumen (Total usuarios, Facilitadores, Auditores, Administradores, Cuentas activas) calculadas sobre datos de la API / roles del sistema.
4. **Acción Principal**:
   - El botón `+ Invitar usuario` / `+ Crear usuario` en `PageHeader` debe invocar la creación real (`openPanel("usuario-invitar", {})`).

### 1.2. Conexión de Paneles de Edición y Detalle (`usuario-editor-panel.tsx` y `usuario-detalle-panel.tsx`)
1. **`src/features/usuarios/panels/usuario-editor-panel.tsx`**:
   - Conectar el formulario a las mutaciones reales de `identidadApi`:
     - Modo creación/invitación: invocar `identidadApi.crearUsuario({ correo, contrasena, nombres, apellidos, codigo_rol, motivo })`.
     - Modo edición: invocar `identidadApi.editarUsuario(usuarioId, { nombres, apellidos, codigo_rol, activo, motivo })`.
   - Cargar roles dinámicamente desde `identidadApi.roles()` con fallback a los 4 roles canónicos.
   - Invalidar queries de React Query (`["identidad", "usuarios"]`, `["identidad"]`) tras mutación exitosa.
   - Manejo tipado de errores con `ApiError`, feedback inmediato con `toast` descriptivo y cierre de panel `closeTop()`.
   - Erradicar de la cabecera y subtítulo cualquier mención a "Demo" o "Los cambios de esta vista son demostrativos".
2. **`src/features/usuarios/panels/usuario-detalle-panel.tsx`**:
   - Cargar datos del usuario real (mediante props o consulta a la API).
   - Acciones operativas reales:
     - Activar/Desactivar cuenta conectado a `identidadApi.editarUsuario`.
     - Revocar sesiones conectado a `identidadApi.revocarUsuario(usuarioId)`.
     - Editar rol y datos abriendo `usuario-editor`.
   - Eliminar referencias a mock, fotos locales ficticias y actividades falsas ("demo").

### 1.3. Conexión de Usuarios Registrados en `src/features/plataforma/views/dashboard-view.tsx`
1. Reemplazar `valor: "Pendiente"` y `detalle: "El total distrital aún no está conectado a este resumen."` en la tarjeta *"Usuarios registrados"*.
2. Conectar consulta mediante `useQuery` a `identidadApi.usuarios("", 0)` para obtener el `total` real de usuarios si la sesión cuenta con permisos (`usuarios:leer` / sesión activa). Mostrar el conteo exacto de cuentas registradas en PostgreSQL.

---

## 🛡️ 2. Quality Gates Obligatorios
- `bun run check`: **0 errores** (ui-policy, tsc, eslint).
- `bun test`: **100% verde** (321 pass o superior).
- `bun run build`: **Compilación exitosa** (190 rutas generadas).
- `systemctl restart polis-frontend`: Servicio activo y respondiendo HTTP 200 en `http://127.0.0.1:3000/plataforma/usuarios`.
- Commit atómico local en `main` con mensaje descriptivo (e.g. `feat(usuarios): [GAP-FIX-02] conexion real de usuarios y roles a api fastapi y dashboard`).
- **PROHIBIDO**: `git push` a remoto.

Al culminar la implementación y verificar todos los quality gates, documenta en `bridge/02_resultado_agy2.md` y notifica a `agy` en la sesión tmux.
