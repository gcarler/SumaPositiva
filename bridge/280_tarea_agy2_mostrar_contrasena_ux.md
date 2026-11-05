# ENCARGO 280: POLIS UX — Control de Visibilidad "Mostrar/Ocultar Contraseña" en Creación y Gestión de Cuentas

**Destinatario:** `agy2`
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Fecha:** 2026-10-31
**Estado:** ASIGNADO
**Solicitud del usuario:** *"cuando se crea una cuenta y se estan creando las contraseñas debe existir la posibilidad de ver la contraseña que se esta creando"*

---

## 1. Objetivo y Alcance

Permitir que los usuarios ciudadanos, funcionarios y administradores puedan **ver/ocultar el texto de la contraseña** que están ingresando mediante un botón toggle con ícono accesible (ojo abierto / ojo tachado), eliminando la frustración por errores tipográficos al registrarse o cambiar su clave.

### Formularios afectados:
1. **Registro Ciudadano y Autenticación:** [`src/features/sesion/panels/sesion-panel.tsx`](file:///root/polis/src/features/sesion/panels/sesion-panel.tsx) (campos `contrasena` y confirmación de contraseña en el alta ciudadana).
2. **Creación de Usuarios por Gestor/Admin:** [`src/features/sesion/panels/usuarios-panel.tsx`](file:///root/polis/src/features/sesion/panels/usuarios-panel.tsx) y [`src/features/usuarios/panels/usuario-editor-panel.tsx`](file:///root/polis/src/features/usuarios/panels/usuario-editor-panel.tsx).
3. **Gestión de Cuenta y Cambio de Clave:** [`src/features/sesion/components/cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx) (contraseña actual, nueva contraseña y confirmación).

---

## 2. Requerimientos Técnicos y de Diseño (Estrictos)

1. **Componente Reutilizable o Primitivo Accesible:**
   - Puede crearse un componente reutilizable `CampoContrasena` o enriquecer `CampoIdentidad` / inputs existentes con soporte para botón de visibilidad.
   - Alternar entre `type="password"` y `type="text"`.
2. **Accesibilidad (A11y - WCAG AA):**
   - El botón de alternancia debe tener atributo `type="button"` (para no enviar el formulario accidentalmente).
   - Atributo `aria-label`: `"Mostrar contraseña"` cuando está oculta, `"Ocultar contraseña"` cuando está visible.
   - `aria-pressed` o estado semántico claro.
   - Navegable por teclado (foco accesible).
3. **Iconografía e Interfaz:**
   - Usar íconos estándar del sistema de diseño (p. ej. `Eye` y `EyeOff` de `lucide-react` si ya está instalada, o SVG inline acorde a la geometría de POLIS).
   - No usar clases fijas de color Tailwind (`text-blue-500`, etc.). Respetar **tokens semánticos de diseño** (`var(--foreground)`, `var(--muted-foreground)`, etc.).
4. **Verificación y Pruebas Obligatorias:**
   - Crear o actualizar pruebas unitarias en `src/features/sesion/__tests__/` o similar verificando el toggle y los atributos de accesibilidad.
   - Pasar `node scripts/ui-policy.mjs` sin errores ni excepciones.
   - Pasar `bun run typecheck` (0 errores).
5. **Reglas de Entrega:**
   - **NO hacer git commit ni git push.**
   - Entregar informe en `bridge/280_entrega_agy2_mostrar_contrasena_ux.md` con evidencia de tests y componentes modificados.
   - Notificar a `agy:0.0` vía tmux al concluir.
