# DICTAMEN DE ENTREGA — ENCARGO 322: MÓDULO DE RECUPERACIÓN / CAMBIO DE CONTRASEÑA CIUDADANA Y REGLA ESTRICTA DE ACCESO GOOGLE WORKSPACE PARA FUNCIONARIOS

- **Destinatario:** Coordinación General Antigravity / Interventoría Técnica POLIS
- **Subagente Ejecutor:** `agy2` (Senior Frontend & Fullstack Engineer)
- **Fecha de Dictamen:** 2026-11-09 · **Estado:** CONCLUIDO Y VERIFICADO AL 100%
- **Tarea de Referencia:** [`bridge/322_tarea_agy2_recuperar_contrasena_y_regla_google_funcionarios.md`](file:///root/polis/bridge/322_tarea_agy2_recuperar_contrasena_y_regla_google_funcionarios.md)

---

## 1. Resumen Ejecutivo y Solución Implementada

En cumplimiento de la directriz emitida por el usuario y la coordinación técnica, se implementó de manera integral la diferenciación operativa de acceso a la plataforma POLIS:

1. **Módulo de Recuperación y Restablecimiento de Contraseña para la Ciudadanía:**
   - **Enlace Contextual Accesible en Login:** Ubicado directamente bajo el campo de contraseña en el formulario de inicio de sesión (`¿Olvidaste tu contraseña?`) y en la botonera de navegación superior (`Olvidé mi contraseña`).
   - **Paso 1: Solicitud de Enlace Seguro (`vista === "recuperar"`):** Permite ingresar el correo registrado y activa la solicitud al backend (`POST /api/v1/identidad/recuperacion/solicitar`). Despliega una tarjeta pedagógica solemne con `role="status"` y `aria-live="polite"` guiando detalladamente al usuario para revisar su bandeja de entrada, carpeta de Correo no deseado (Spam) y el periodo de vigencia de 30 minutos del enlace.
   - **Paso 2: Restablecimiento de Contraseña (`vista === "restablecer"`):** Activado de forma transparente al abrir el deep-link `#accion=recuperar&token=...` o `#accion=restablecer&token=...`. Incorpora doble campo de contraseña (`Nueva contraseña` y `Confirmar nueva contraseña`) con selector de visibilidad accesible (`PasswordInput` con toggler de ojo `aria-pressed`), validación de longitud mínima (8 caracteres) y comprobación de coincidencia idéntica (`comprobarContrasena`). Al enviar, consume el token (`POST /api/v1/identidad/recuperacion/confirmar`), revoca sesiones obsoletas, limpia la sesión anterior y redirige al inicio de sesión con confirmación positiva.

2. **Regla Institucional Estricta: Autenticación Obligatoria con Google Workspace para Funcionarios:**
   - **Delimitación de Roles Institucionales:** Se definieron y resguardaron los roles técnicos de funcionarios del sistema (`administrador_identidades`, `autoridad_distrital`, `facilitador_mesa`, `auditor_forense`).
   - **Blindaje Backend:** En `IdentidadService.autenticar_usuario` y `IdentidadService.solicitar_correo` se verifica si la cuenta solicitante pertenece a roles de funcionario institucional. Si intentan ingresar por contraseña ordinaria o solicitar recuperación por formulario, el backend rechaza con `HTTP 403`:
     > *"Tu cuenta tiene perfil de funcionario institucional. Por política de seguridad y trazabilidad de notificaciones oficiales, el ingreso debe realizarse exclusivamente mediante el botón 'Continuar con Google'."*
   - **Blindaje y Pedagogía Frontend:** En `SesionPanel`, la captura del error institucional despliega un panel de alerta prioritario (`role="alert"`, `tone="warning"`) con el isotipo de seguridad `ShieldAlert` y botón directo de Google Login (`GoogleIdentityServices`). Adicionalmente, el pie del formulario de login advierte permanentemente la obligatoriedad de Google Workspace para el personal de gobierno.
   - **Indicador de Notificaciones Oficiales en Plataforma Interna:** En `PlataformaHeader` y `CuentaUsuario` se añadió la insignia de estado oficial:
     > *"Google Workspace Oficial · Cuenta institucional vinculada para recepción de convocatorias, actas y compromisos oficiales."*

---

## 2. Matriz de Cambios por Archivo

| Componente / Archivo | Tipo de Cambio | Descripción Técnica |
| :--- | :--- | :--- |
| [`backend/app/core/config.py`](file:///root/polis/backend/app/core/config.py) | Configuración Backend | Añadidos flags `google_requerido_para_funcionarios: bool = True` y `probar_bloqueo_google_funcionarios: bool = False` a `Settings`. |
| [`backend/app/modules/identidad/service.py`](file:///root/polis/backend/app/modules/identidad/service.py) | Lógica Backend | Declaración de `ROLES_FUNCIONARIOS` y `MENSAJE_REGLA_GOOGLE_FUNCIONARIOS`. En `autenticar_usuario` y `solicitar_correo` se bloquea el uso de contraseña y recuperación para funcionarios, exigiendo Google Workspace. |
| [`src/app/_composition/panel-contracts.d.ts`](file:///root/polis/src/app/_composition/panel-contracts.d.ts) | Tipos Frontend | Soporte de `accion: "restablecer"` en el registro de contratos del panel `sesion`. |
| [`src/app/_composition/sesion-sync.tsx`](file:///root/polis/src/app/_composition/sesion-sync.tsx) | Deep-link Sync | Soporte sincronizado para enlaces tanto con `#accion=recuperar` como `#accion=restablecer`. |
| [`src/features/sesion/panels/sesion-panel.tsx`](file:///root/polis/src/features/sesion/panels/sesion-panel.tsx) | Panel UI Sesión | Incorporado enlace "¿Olvidaste tu contraseña?" bajo campo de clave; vistas optimizadas `recuperar` y `restablecer` con doble campo, feedback anti-spam y aviso de obligatoriedad Google Workspace para funcionarios. |
| [`src/features/plataforma/components/plataforma-header.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-header.tsx) | Encabezado Plataforma | Insignia institucional visible *"Google Workspace Oficial"* con indicador de latido activo para recepción de notificaciones. |
| [`src/features/sesion/components/cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx) | Perfil de Cuenta | Tarjeta informativa en Mi Cuenta indicando la vinculación de la cuenta institucional corporativa con Google Workspace. |
| [`backend/tests/test_identidad_regla_google_funcionarios.py`](file:///root/polis/backend/tests/test_identidad_regla_google_funcionarios.py) | Pruebas Backend | 10 pruebas unitarias con mock comprobando bloqueo en login y recuperación para los 4 roles de funcionarios, consumo de token y flujo normal para ciudadanos. |
| [`src/features/sesion/panels/sesion-recuperacion-y-regla-google.test.tsx`](file:///root/polis/src/features/sesion/panels/sesion-recuperacion-y-regla-google.test.tsx) | Pruebas Frontend | 6 pruebas unitarias verificando renderizado de avisos pedagógicos, enlace accesible, comprobación de contraseñas e insignias de Google Workspace. |

---

## 3. Evidencia de Pruebas y Quality Gates

### A. Pruebas Backend (Pytest)
```bash
$ uv run pytest tests/test_identidad_regla_google_funcionarios.py tests/test_identidad_territorial_catalogo_polis.py tests/test_google_token_verificado.py
============================= test session starts ==============================
rootdir: /root/polis/backend
configfile: pyproject.toml
plugins: platformdirs-4.14.5, logfire-sdk-5.4.0, langsmith-0.14.17, anyio-4.15.1
collected 49 items

tests/test_identidad_regla_google_funcionarios.py ..........             [ 20%]
tests/test_identidad_territorial_catalogo_polis.py ..................... [ 63%]
..........                                                               [ 83%]
tests/test_google_token_verificado.py ........                           [100%]

======================== 49 passed, 1 warning in 1.25s =========================
```

### B. Pruebas Frontend (Bun Test)
```bash
$ bun test src/features/sesion/
bun test v1.4.2 (744846f84)

src/features/sesion/panels/sesion-recuperacion-y-regla-google.test.tsx:
✓ Flujo de Recuperación y Restablecimiento de Contraseña (Encargo 322) > valida contraseñas con comprobarContrasena: requiere longitud mínima de 8 caracteres y coincidencia exacta [3.21ms]
✓ Flujo de Recuperación y Restablecimiento de Contraseña (Encargo 322) > renderiza el aviso pedagógico accesible de recuperación de contraseña con guía de spam y vigencia de 30 min [15.78ms]
✓ Flujo de Recuperación y Restablecimiento de Contraseña (Encargo 322) > renderiza el enlace contextual accesible ¿Olvidaste tu contraseña? para la vista de login [0.75ms]
✓ Regla Institucional de Autenticación Google Workspace para Funcionarios (Encargo 322) > renderiza la advertencia de acceso restringido para perfiles de funcionarios institucionales [0.79ms]
✓ Regla Institucional de Autenticación Google Workspace para Funcionarios (Encargo 322) > renderiza el callout informativo institucional en el pie del formulario de login [0.31ms]
✓ Regla Institucional de Autenticación Google Workspace para Funcionarios (Encargo 322) > renderiza la credencial y estado de notificación institucional en la barra de encabezado de la plataforma [0.13ms]
...
40 pass
0 fail
110 expect() calls
Ran 40 tests across 5 files. [579.00ms]
```

### C. UI Policy (0 Infracciones)
```bash
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```

### D. TypeScript Typecheck (0 Errores)
```bash
$ bun run typecheck
$ tsc --noEmit
(Salida limpia: 0 errores)
```

### E. ESLint (0 Errores)
```bash
$ bun run lint
$ eslint .
(Salida limpia: 0 errores, 0 warnings)
```

---

## 4. Garantía de Inviolabilidad de Reglas Rectoras
- **Base de Datos de Producción `bd_csh`:** Intacta y congelada en migración 0096. Cero migraciones Alembic creadas o aplicadas.
- **Git:** Cero operaciones de `git commit` y cero `git push`.
- **Diseño de Interfaz:** Cumplimiento total de tokens semánticos POLIS UI, sin componentes nativos no autorizados ni colores hardcodeados.

Dictamen favorable y listo para revisión.
