# ENCARGO 322: MÓDULO DE RECUPERACIÓN / CAMBIO DE CONTRASEÑA CIUDADANA Y REGLA ESTRICTA DE ACCESO GOOGLE WORKSPACE PARA FUNCIONARIOS

- **Destinatario:** Subagente `agy2` (tmux `agy2:0`)
- **Emisor:** Coordinación General Antigravity
- **Fecha:** 2026-11-09 · **Estado:** ASIGNADO EN EJECUCIÓN
- **Referencia del Usuario:**
  > *"Otra tarea Necesito que por favor le pidas a agy2 que desarrolle un módulo que permita cambiar contraseña es decir es posible que haya ciudadanos que ingresen a la plataforma se logueen y el correo de verificación quieran ingresar de nuevo y no se acuerden de la contraseña que digitaron entonces ponga a recuperar contraseña violín ellos puedan crear su nueva contraseña y puedan ingresar los funcionarios de la plataforma interna Es decir de trabajo o regla Sí o sí deben lo guiarse con una cuenta de Google. que es la cuenta donde les van a llegar que la cuenta donde les va a llegar la notificación de todos los trabajos que han hecho en la plataforma"*
- **Reglas Rectoras:**
  - Base de datos de producción `bd_csh` estrictamente congelada en migración 0096. Cero migraciones Alembic.
  - Cero operaciones `git commit` o `git push` sin autorización expresa.
  - Cero infracciones en `node scripts/ui-policy.mjs`.
  - Cero errores en `tsc --noEmit` y `eslint .`.
  - Cobertura de pruebas unitarias 100% pasando en `bun test` y `pytest`.

---

## 1. Diagnóstico y Necesidades de la Plataforma

El sistema POLIS atiende a dos públicos con naturalezas y responsabilidades operativas diferenciadas:

1. **La Ciudadanía:**
   - Ingresa para deliberar, votar, radicar iniciativas y consultar actas.
   - Puede registrarse con correo y contraseña. Con frecuencia olvidan la contraseña digitada durante el registro inicial o tras activar su cuenta por correo.
   - Requiere un flujo intuitivo, accesible y sin fricciones de **"Recuperar contraseña"** / **"Restablecer contraseña"** con validación por token seguro enviado al correo y creación de su nueva clave.

2. **Los Funcionarios y Equipos de Gobierno (`/plataforma`):**
   - Operan la logística de mesas territoriales, relatorías, actas oficiales, compromisos PAS, seguridad humana y auditoría.
   - **Regla Estricta Institucional (Sí o Sí):** Los funcionarios **deben autenticarse obligatoriamente con su cuenta corporativa de Google Workspace (Google OAuth)**.
   - **Justificación Operativa:** Es la cuenta donde se centralizan las notificaciones transaccionales, convocatorias oficiales, trazabilidad pericial y alertas del sistema Herald / SM. Los funcionarios no deben utilizar contraseñas ordinarias ni mecanismos alternos no trazables para el ingreso al área de gestión.

---

## 2. Requerimientos Específicos del Encargo

### Requerimiento A: Flujo Completo de Recuperación y Restablecimiento de Contraseña (Ciudadanía)
1. **Modal de Sesión (`src/features/sesion/panels/sesion-panel.tsx`):**
   - Asegurar que el acceso a *"¿Olvidaste tu contraseña?"* esté visible y accesible en la pestaña de login ordinario.
   - **Paso 1: Solicitud de Recuperación (`vista === "recuperar"`):**
     - Campo de correo electrónico con validación accesible.
     - Botón "Enviar instrucciones de recuperación".
     - Al enviar, invoca `identidadApi.solicitarRecuperacion(correo)` (`POST /api/v1/identidad/recuperacion/solicitar`).
     - Muestra aviso pedagógico indicando que revise su bandeja de entrada y la carpeta de spam para encontrar el enlace de recuperación.
   - **Paso 2: Restablecimiento de Contraseña (`vista === "restablecer"`):**
     - El correo transaccional enviado incluye el enlace:
       `https://seguridadhumanaintegral.org/#accion=recuperar&token=...` (o `restablecer`).
     - Al abrir el enlace, el frontend detecta el deep-link `#accion=recuperar` y abre automáticamente el panel en `vista === "restablecer"`, recibiendo el token.
     - El formulario debe incluir:
       - Campo 1: **Nueva contraseña** (con `PasswordInput`, botón de visibilidad `mostrar/ocultar`, medidor o validación de longitud mínima de 8 caracteres).
       - Campo 2: **Confirmar nueva contraseña** (validación de coincidencia).
     - Al enviar, invoca `identidadApi.confirmarRecuperacion(token, contrasena)` (`POST /api/v1/identidad/recuperacion/confirmar`).
     - Notificación de éxito: *"Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."*, redirigiendo fluidamente a la vista de login.

### Requerimiento B: Regla Estricta de Autenticación Google Workspace para Funcionarios
1. **Delimitación de Roles y Canales de Ingreso:**
   - Roles de funcionarios: `administrador_identidades`, `autoridad_distrital`, `facilitador_mesa`, `auditor_forense`.
   - Si un usuario con rol de funcionario intenta iniciar sesión mediante correo y contraseña ordinaria, o solicita recuperación de contraseña por formulario:
     - El backend o el frontend deben informarle pedagógica y formalmente:
       *"Tu cuenta tiene perfil de funcionario institucional. Por política de seguridad y trazabilidad de notificaciones oficiales, el ingreso debe realizarse exclusivamente mediante el botón 'Continuar con Google'."*
     - Ofrecer el botón directo de Google Login (`GoogleIdentityServices`).
2. **Protección de la Plataforma Interna (`/plataforma`):**
   - Verificar en [`src/features/plataforma/components/plataforma-shell.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-shell.tsx) o en el guardia de acceso que los funcionarios autenticados tengan trazabilidad de identidad corporativa vinculada.
   - Mostrar en el pie o encabezado de la plataforma el indicador de cuenta Google institucional activa para la recepción de notificaciones de los trabajos realizados.

### Requerimiento C: Calidad y Pruebas Automatizadas
1. **Pruebas Frontend:**
   - Añadir/actualizar pruebas unitarias en `src/features/sesion/` que verifiquen:
     - Formulario de recuperación de contraseña y feedback de éxito.
     - Formulario de restablecimiento con doble campo de contraseña.
     - Bloqueo o advertencia a funcionarios que intenten usar contraseña en vez de Google.
   - Ejecutar `bun test src/features/sesion/`.
2. **Pruebas Backend:**
   - Verificar en `backend/tests/` los endpoints `/api/v1/identidad/recuperacion/solicitar` y `/api/v1/identidad/recuperacion/confirmar`.
   - Ejecutar `uv run pytest backend/tests/test_identidad*.py` o `tests/test_google_token_verificado.py`.
3. **Calidad Estática:**
   - `node scripts/ui-policy.mjs` &rarr; 0 infracciones.
   - `bun run typecheck` &rarr; 0 errores.
   - `bun run lint` &rarr; 0 errores.

---

## 3. Entregable Requerido

Una vez implementado y verificado, `agy2` debe emitir su dictamen formal en:
`bridge/322_dictamen_recuperar_contrasena_y_regla_google_funcionarios.md`
actualizando `bridge/01_tarea_activa.md`.
