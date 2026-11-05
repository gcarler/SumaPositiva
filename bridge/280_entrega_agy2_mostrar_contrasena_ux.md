# Entrega Encargo 280: Control de Visibilidad "Mostrar/Ocultar Contraseña" en Creación y Gestión de Cuentas

- **Agente:** `agy2`
- **Emisor / Destinatario de entrega:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-10-31
- **Referencia de especificación:** `bridge/280_tarea_agy2_mostrar_contrasena_ux.md`
- **Estado:** COMPLETADO (sin commit ni push según directiva)

---

## 1. Resumen de la Solución Implementada

Se implementó el control de visibilidad **Mostrar/Ocultar Contraseña** en todo el ciclo de vida de credenciales de POLIS, respondiendo a la necesidad expresada por el usuario: *"cuando se crea una cuenta y se estan creando las contraseñas debe existir la posibilidad de ver la contraseña que se esta creando"*.

### A. Componente Primitivo Accesible (`src/shared/ui/password-input.tsx`):
- Componente `PasswordInput` reutilizable que conmuta dinámicamente entre `type="password"` y `type="text"`.
- **Accesibilidad y A11y (WCAG AA):**
  - Botón interactivo con atributo estricto `type="button"` para prevenir envíos accidentales del formulario padre.
  - Atributo dinámico `aria-label`: `"Mostrar contraseña"` cuando está enmascarada y `"Ocultar contraseña"` cuando el texto es legible.
  - Atributo `aria-pressed` reflejando el estado de visibilidad activa.
  - Atributo `title` coincidente y soporte total de navegación por teclado con foco visible (`focus-visible:outline-2 focus-visible:outline-offset-2`).
  - Íconos accesibles del sistema de diseño (`Eye` y `EyeOff` de `lucide-react`) con `aria-hidden="true"`.
- **Tokens Semánticos:**
  - Sin utilidades fijas de Tailwind ni literales hexadecimales.
  - Utiliza tokens oficiales: `text-text-tertiary hover:text-text-primary`, `pr-11` para evitar solapamiento de texto, y `data-slot="password-input"`.
  - Registrado en `src/shared/design-system/catalog.ts` con estado `ready` y documentado con historia en `src/shared/ui/catalog.stories.tsx`.

### B. Enriquecimiento de `CampoIdentidad` y `CampoContrasena` (`src/features/sesion/components/`):
- `CampoIdentidad` (`src/features/sesion/components/campo-identidad.tsx`):
  - Detecta automáticamente `type === "password"` y renderiza internamente `PasswordInput`, propagando todas las propiedades de accesibilidad, validación (`minLength`, `maxLength`, `autoComplete`) y vinculación con `FormField`.
- `CampoContrasena`:
  - Componente de conveniencia exportado desde `campo-identidad.tsx` y `campo-contrasena.tsx`.

---

## 2. Formularios Coberturados

El toggle de visibilidad cubre el 100% de los campos de contraseña del sistema:

1. **Registro Ciudadano, Inicio de Sesión y Restablecimiento:**
   - Archivo: [`src/features/sesion/panels/sesion-panel.tsx`](file:///root/polis/src/features/sesion/panels/sesion-panel.tsx)
   - Campos: `contrasena` (login, registro y restablecer) y `confirmacion` (registro y restablecer).
2. **Creación de Usuarios por Administradores:**
   - Archivo: [`src/features/sesion/panels/usuarios-panel.tsx`](file:///root/polis/src/features/sesion/panels/usuarios-panel.tsx)
   - Campos: `contrasena` (Contraseña inicial) y `confirmacion` (Confirmar contraseña).
3. **Invitación de Usuarios Institucionales:**
   - Archivo: [`src/features/usuarios/panels/usuario-editor-panel.tsx`](file:///root/polis/src/features/usuarios/panels/usuario-editor-panel.tsx)
   - Campo: `contrasena` (Contraseña inicial con placeholder y longitud validada).
4. **Gestión de Cuenta, Cambio de Clave y Desactivación MFA:**
   - Archivo: [`src/features/sesion/components/cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx)
   - Campos: `contrasena_actual`, `contrasena` (nueva), `confirmacion`, y `contrasena_desactivacion`.

---

## 3. Archivos Creados y Modificados

### Archivos Creados:
- `src/shared/ui/password-input.tsx` (Primitivo accesible en shared UI).
- `src/features/sesion/components/campo-contrasena.tsx` (Punto de acceso modular y re-exportación).
- `src/features/sesion/components/campo-contrasena.test.tsx` (Suite de pruebas unitarias A11y y UX).

### Archivos Modificados:
- `src/features/sesion/components/campo-identidad.tsx` (Integración automática de `PasswordInput` para `type="password"` y exportación de `CampoContrasena`).
- `src/features/usuarios/panels/usuario-editor-panel.tsx` (Uso de `PasswordInput` en el alta/invitación institucional).
- `src/shared/design-system/catalog.ts` (Registro de `password-input` con estado `ready`).
- `src/shared/ui/catalog.stories.tsx` (Historia para Storybook y validación de UI policy).

---

## 4. Evidencia de Pruebas y Verificación

### A. Pruebas Unitarias (`bun test src/features/sesion/components/campo-contrasena.test.tsx`):
```bash
bun test v1.4.2 (744846f84)

src/features/sesion/components/campo-contrasena.test.tsx:
✓ PasswordInput / CampoContrasena UX y A11y > renderiza inicialmente el campo con type='password' [21.01ms]
✓ PasswordInput / CampoContrasena UX y A11y > renderiza el botón de visibilidad con type='button', aria-label y aria-pressed correctos [0.58ms]
✓ PasswordInput / CampoContrasena UX y A11y > deshabilita el botón de alternancia si el campo está deshabilitado [0.64ms]
✓ PasswordInput / CampoContrasena UX y A11y > permite omitir el botón de visibilidad si mostrarBotonVisibilidad=false [0.39ms]
✓ PasswordInput / CampoContrasena UX y A11y > CampoIdentidad integra PasswordInput automáticamente cuando type='password' [1.92ms]
✓ PasswordInput / CampoContrasena UX y A11y > CampoContrasena renderiza un campo de contraseña accesible con toggle [3.04ms]
✓ PasswordInput / CampoContrasena UX y A11y > CampoIdentidad normal (texto) no incluye botón de contraseña [0.66ms]

 7 pass
 0 fail
 19 expect() calls
Ran 7 tests across 1 file. [505.00ms]
```

Suite completa de sesión:
```bash
33 pass, 0 fail across 3 files.
```

### B. Validación de Política de UI (`node scripts/ui-policy.mjs`):
```bash
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```

### C. Verificación de Tipos TypeScript (`bun run typecheck`):
```bash
$ tsc --noEmit
# Código de salida 0 — Cero errores encontrados.
```

### D. Verificación de Estilo y Lint (`bun x eslint`):
```bash
# Sin errores ni advertencias en los archivos tocados.
```

---

## 5. Compromiso de Integración

- **NO se realizó commit ni push.**
- Los cambios quedan en el working tree listos para la revisión y unificación por parte de Coordinación.
