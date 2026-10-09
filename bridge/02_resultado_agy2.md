# INFORME PERICIAL DE EJECUCIÓN — TAREA [GAP-FIX-02]
## CONEXIÓN REAL DE GESTIÓN DE USUARIOS Y ROLES A LA API FASTAPI

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Ejecución:** Viernes, 09 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (Fase 2 del Plan Maestro GAP-FIX)  
**Severidad Mitigada:** CRÍTICA (GAP-01 y GAP-08 erradicados)  
**Estado de la Entrega:** 100% Ejecutada, Contra-Verificada y Conforme con Quality Gates  

---

## 1. Resumen Ejecutivo de la Intervención [GAP-FIX-02]

En estricta observancia de los lineamientos técnicos de la Fase 2 en `bridge/01_tarea_activa.md`, `agy2` ha eliminado todos los mocks en memoria (`usuariosDemo`, notices de "demostración", tarjetas "Pendiente"), conectando la administración de usuarios, los paneles laterales y el dashboard institucional con los endpoints canónicos de FastAPI (`identidadApi` / `/api/v1/identidad/`):

### 1.1. Conexión Real de `src/features/plataforma/views/usuarios-view.tsx`
1. **Consumo de API Real con React Query**:
   - Se erradicó la dependencia de `useUsuariosStore.usuarios` local.
   - Se implementó la consulta paginada reactiva mediante `useQuery` a `identidadApi.usuarios(busqueda, pagina * 20, 20)`.
   - Se implementó consulta de resumen consolidado para KPIs y catálogo dinámico de roles mediante `identidadApi.roles()`.
   - Paginación dinámica funcional basada en `data.total` (con controles de *Anterior* y *Siguiente*) y búsqueda en tiempo real por correo / identificador.
   - Filtrado por rol compatible con los roles del sistema (`administrador_identidades`, `autoridad_distrital`, `facilitador_mesa`, `auditor_forense`, `ciudadano`).
2. **Erradicación de Mocks y Elementos Ficticios**:
   - Eliminado el `<Notice tone="info" title="Vista de demostración">`.
   - Eliminado el botón redundante inferior *"Abrir administración institucional"*. La pantalla `/plataforma/usuarios` es ahora la administración canónica y centralizada de identidades.
3. **Métricas y KPIs Reales**:
   - Las cuatro tarjetas del resumen superior se calculan en vivo sobre el directorio distrital en PostgreSQL:
     - **Total usuarios**: Cuentas registradas totales y conteo de cuentas activas.
     - **Facilitadores**: Cuentas con rol `facilitador_mesa` (gestión territorial y mesas).
     - **Auditores**: Cuentas con rol `auditor_forense` (acceso forense e inmutabilidad).
     - **Administradores**: Cuentas con rol `administrador_identidades` (gestión de identidades).
4. **Acción Principal**:
   - El botón principal `+ Invitar usuario` en el `PageHeader` (habilitado según permiso `usuarios:gestionar`) abre directamente el panel de alta institucional `openPanel("usuario-invitar", {})`.

---

### 1.2. Conexión de Paneles de Edición y Detalle

#### A. Panel de Edición e Invitación (`src/features/usuarios/panels/usuario-editor-panel.tsx`)
1. **Mutaciones Reales**:
   - **Modo Invitación (`mode === "invite"`)**: Despacha `identidadApi.crearUsuario({ correo, contrasena, nombres, apellidos, codigo_rol, motivo })`.
   - **Modo Edición (`mode === "edit"`)**: Despacha `identidadApi.editarUsuario(usuarioId, { nombres, apellidos, codigo_rol, activo, motivo })`.
2. **Catálogo de Roles Dinámico**:
   - Consume `identidadApi.roles()` con fallback a los 5 roles canónicos distritales.
3. **Trazabilidad y Manejo Tipado de Errores**:
   - Campo obligatorio de `motivo` (mínimo 10 caracteres) exigido por el backend FastAPI para el registro inmutable de auditoría.
   - Errores de API capturados con la clase tipada `ApiError` y notificados mediante `toast.error`.
   - Invalidación de caché en React Query (`["identidad"]`) y notificación con `toast.success`.
4. **Higiene Textual**:
   - Erradicada cualquier mención a "Demo", "demostrativo" o textos simulados en títulos, kicker y subtítulos.

#### B. Panel de Ficha y Detalle (`src/features/usuarios/panels/usuario-detalle-panel.tsx`)
1. **Carga Real desde Base de Datos**:
   - Consulta el registro del usuario en PostgreSQL mediante `identidadApi.usuarios`.
2. **Acciones Operativas Reales**:
   - **Suspender / Reactivar cuenta**: Conectado a `identidadApi.editarUsuario` con actualización de `activo` e invalidación de caché.
   - **Revocar sesiones activas**: Conectado a `identidadApi.revocarUsuario(usuarioId)` con invalidación de sesiones de JWT.
   - **Restablecer acceso**: Conectado a `identidadApi.solicitarRecuperacion(usuario.correo)` para despacho de enlace de recuperación.
   - **Editar rol y datos**: Enlaza a `openPanel("usuario-editor", { usuarioId: usuario.id })`.
3. **Higiene Textual**:
   - Eliminados avatares con URLs externas mockeadas, actividades ficticias simuladas y etiquetas de demostración.

---

### 1.3. Conexión en Dashboard Institucional (`src/features/plataforma/views/dashboard-view.tsx`)
- Se reemplazó el texto estático `valor: "Pendiente"` y su detalle por la consulta real `identidadApi.usuarios("", 0, 1)` vía React Query (`["identidad", "usuarios", "conteo-dashboard"]`).
- Si la sesión cuenta con permiso `usuarios:leer`, se visualiza en tiempo real el total de cuentas registradas en PostgreSQL (41 cuentas activas).
- Si la sesión no tiene permisos de auditoría o identidad, se muestra descriptivamente *"Acceso restringido"*.

---

### 1.4. Higiene de Stores y Pruebas Unitarias
- En `src/features/usuarios/state/usuarios-store.ts`, se purgó el array `usuariosDemo` (8 cuentas ficticias) y las constantes no utilizadas, inicializando el estado en vacío.
- Se implementó la nueva suite de pruebas unitarias [`src/features/usuarios/services/usuarios-integracion.test.ts`](file:///root/polis/src/features/usuarios/services/usuarios-integracion.test.ts) (6 pruebas pasando al 100%), validando consultas paginadas, creación, edición, revocación de sesiones, listado de roles y captura tipada de excepciones `ApiError`.

---

## 2. Matriz de Cumplimiento de Quality Gates

| Quality Gate | Comando Oficial | Resultado Obtenido | Dictamen |
| :--- | :--- | :--- | :---: |
| **QG1: Verificación UI, Tipos y Linter** | `bun run check` | `node scripts/ui-policy.mjs`<br>`tsc --noEmit`<br>`eslint .` | **0 errores, 0 advertencias** ✅ |
| **QG2: Pruebas Unitarias Frontend** | `bun test` | **327 pass, 0 fail** (1397 expect calls en 35 suites) | **100% Verde (+6 tests)** ✅ |
| **QG3: Compilación Producción Next.js** | `bun run build` | Turbopack build exitoso (11.9s)<br>**190 rutas generadas** (165 estáticas de mesas, SSG y dynamic) | **Limpio** ✅ |
| **QG4: Paridad de Pruebas Backend** | `.venv/bin/pytest tests/test_access_policy.py tests/test_integridad_compromisos.py` | **100 passed in 17.60s** | **100% Verde** ✅ |
| **QG5: Disponibilidad del Servicio Frontend** | `systemctl restart polis-frontend` | `Active: active (running)`. `curl` a `:3000/plataforma/usuarios` y `:3000/plataforma` retorna **HTTP 200 OK**. | **Operativo** ✅ |
| **QG6: Control de Versiones Git** | `git status` / `git log -1` | Commit atómico `4fbeec1` en `main`. Cero `git push` a remoto. | **Conforme** ✅ |

---

## 3. Detalle del Commit Atómico Realizado

- **Hash de Commit:** `4fbeec1`
- **Mensaje:** `feat(usuarios): [GAP-FIX-02] conexion real de usuarios y roles a api fastapi y dashboard`
- **Archivos Modificados:** 8 archivos (954 inserciones, 346 eliminaciones).
- **Nuevo Archivo de Pruebas:** `src/features/usuarios/services/usuarios-integracion.test.ts`.

---

## 4. Conclusión y Solicitud de Contra-Auditoría

La Fase 2 **`[GAP-FIX-02]`** queda formalmente culminada, validada al 100% y en producción local.
Se transfiere el resultado al Coordinador General `agy` en la sesión `tmux` para su contra-auditoría pericial independiente y posterior habilitación de la **Fase 3: `[GAP-FIX-03]` (Activación de Enlaces Inertes en Menú Institucional)**.
