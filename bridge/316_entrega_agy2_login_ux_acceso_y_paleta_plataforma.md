# Entrega Encargo 316: Botón de Login Visible, Delimitación Ciudadano vs. Área de Trabajo y Armonización de Paleta de Colores

- **Responsable:** `agy2` (`agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-08 · **Estado:** COMPLETADO CON ÉXITO
- **Regla rectora:** 100% Quality gates superados (`bun run check`), cero regresiones, tokens semánticos POLIS UI, cero commits ni push directos.

---

## 1. Resumen Ejecutivo de la Implementación

En estricta atención al requerimiento del usuario y a la especificación técnica en `bridge/316_tarea_agy2_login_ux_acceso_y_paleta_plataforma.md`, se resolvieron de forma exhaustiva los tres frentes planteados:

### 1.1. Visibilidad del Botón de Login en el Portal Público (`Topbar`)
- **Diagnóstico anterior:** `SesionButton` mostraba una etiqueta genérica "Anónimo" en botón tipo contorno (outline) cuando el usuario no tenía identidad autenticada. En dispositivos móviles el texto se ocultaba por completo, mostrando únicamente un círculo sin ningún llamado a la acción. Un visitante no tenía forma evidente de saber dónde iniciar sesión.
- **Solución implementada (`src/app/_components/topbar.tsx`):**
  - **Cuando no hay identidad activa (o está en modo anónimo):** Se muestra de forma prioritaria, visible y destacada el botón **"Iniciar sesión"** con icono `UserRound` en color azul institucional POLIS (`var(--brand-polis-blue)`) y hover cian (`var(--brand-polis-cyan)`).
  - **Cuando el usuario inicia sesión como Ciudadano (`rol === "ciudadano"`):** Se presenta su nombre real acompañado de una cápsula indicativa accesible `Ciudadano`. En cumplimiento de la regla de delimitación, **NO se muestra el botón de acceso al área técnica institucional**.
  - **Cuando el usuario inicia sesión como Funcionario / Formulador / Autoridad (`puedeEntrar(sesion)`):** Se muestra su nombre con la insignia de rol y se despliega de manera prominente el botón de acción técnica **"Área de Trabajo →"** con icono `KanbanSquare` en color ámbar/ember (`var(--ember)`).
  - **Jerarquía y orden visual:** Se optimizó la disposición de los botones secundarios en la cabecera para evitar desbordes y colapsos en pantallas intermedias y móviles.

### 1.2. Delimitación Estricta: Ciudadano vs. Área de Trabajo Técnica (`/plataforma`)
- **Regla institucional:** Un ciudadano puede radicar propuestas, votar y deliberar de forma anónima o loguearse con su nombre y apellidos verificados. No obstante, el inicio de sesión como ciudadano **no le otorga acceso al área técnica de formulación (`/plataforma`)**, la cual es el espacio de trabajo del equipo formulador (donde se estructuran mesas, se gestionan tareas, se levantan actas y se administran indicadores distritales).
- **En `src/features/sesion/components/cuenta-usuario.tsx` (Panel Mi Cuenta):**
  - Al abrir su cuenta, el ciudadano encuentra un aviso pedagógico formal [`Notice`](file:///root/polis/src/shared/ui/notice.tsx):
    > *"Estás participando con tu identidad ciudadana verificada en POLIS. Tus propuestas, votos y aportes territoriales quedan formalmente registrados a tu nombre bajo el marco de la Ley 1757 de 2015. El espacio de trabajo técnico (/plataforma) está reservado para los equipos formuladores y facilitadores acreditados de la política pública."*
  - Si el usuario cuenta con rol institucional acreditado (`puedeEntrar(sesion)`), ve en su lugar una tarjeta destacada con enlace directo al Área de Trabajo Técnica (`/plataforma`).
- **En `src/features/plataforma/components/plataforma-shell.tsx` (Guardia de Acceso):**
  - Anteriormente, si un usuario con rol ciudadano navegaba a `/plataforma`, sufría una redirección silenciosa y confusa hacia `/`.
  - Ahora, `PlataformaShell` intercepta el acceso y despliega una **pantalla pedagógica e institucional accesible**:
    - Isotipo oficial de POLIS y título *"Área de Trabajo Técnica Institucional"*.
    - Aviso explicativo detallado sobre la delimitación de espacios y la reserva técnica de la plataforma.
    - Botón de retorno primario: *"← Volver al Portal Ciudadano"*.
    - Accesos secundarios a *"Mi cuenta"* y *"Cerrar sesión"*.

### 1.3. Armonización de la Paleta de Colores de la Plataforma (`/plataforma`)
- **En `src/features/plataforma/components/plataforma-sidebar.tsx`:**
  - Cabecera enriquecida con `IsotipoPolis` y titulación institucional: `POLIS · Gestión` (azul POLIS `var(--brand-polis-blue)` / `var(--brand-polis-sky)`) y subtítulo `Área de Trabajo Técnica`.
  - Indicador de ruta activa estilizado con borde lateral en azul POLIS y fondo elevado `var(--surface-2)` con sombra sutil.
  - Enlace inferior estilizado *"Volver al portal ciudadano"* con icono `ArrowLeft` en acento ember (`var(--ember)`).
- **En `src/features/plataforma/components/plataforma-header.tsx`:**
  - Isotipo POLIS interactivo con micro-interacción hover.
  - Insignia de rol institucional con borde y tipografía en azul institucional POLIS (`var(--brand-polis-blue)` / `var(--brand-polis-cyan)`).
  - Subtítulo contextual: *"Espacio Técnico de Formulación y Seguimiento · Cartagena 2026–2036"*.
  - Botones canónicos de cuenta y cierre de sesión con tokens semánticos POLIS UI.

---

## 2. Archivos Modificados y Creados

| Archivo | Tipo | Descripción del cambio |
|---|---|---|
| `src/app/_components/topbar.tsx` | Modificado | Botón visible "Iniciar sesión" en azul POLIS; badge "Ciudadano"; botón prioritario "Área de Trabajo →" para roles técnicos. |
| `src/features/sesion/components/cuenta-usuario.tsx` | Modificado | Aviso pedagógico para ciudadanos (reserva de `/plataforma`) y tarjeta de acceso al área técnica para roles institucionales. |
| `src/features/plataforma/components/plataforma-shell.tsx` | Modificado | Pantalla institucional accesible ante intento de acceso de ciudadano a `/plataforma` con botón para volver al portal. |
| `src/features/plataforma/components/plataforma-sidebar.tsx` | Modificado | Paleta institucional POLIS, isotipo oficial en cabecera y enlaces activos destacados con tokens semánticos. |
| `src/features/plataforma/components/plataforma-header.tsx` | Modificado | Cabecera enriquecida con badge de rol institucional en azul POLIS y subtítulo territorial Cartagena 2026–2036. |
| `src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx` | Nuevo | Suite con 9 pruebas unitarias automatizadas cubriendo todos los casos de uso del Encargo 316. |

---

## 3. Verificación de Quality Gates

### A. Política de Interfaz POLIS (`node scripts/ui-policy.mjs` / `bun run ui:check`)
```
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```
- **Resultado:** 0 violaciones. 100% de controles canónicos (`@/shared/ui/*`) y tokens semánticos CSS (`var(--...)`). Cero clases fijas de color Tailwind.

### B. Chequeo de Tipado Estricto (`tsc --noEmit` / `bun run typecheck`)
```
$ tsc --noEmit
(código de salida 0)
```
- **Resultado:** 0 errores TypeScript.

### C. Linter Global (`eslint .` / `bun run lint`)
```
$ eslint .
(código de salida 0)
```
- **Resultado:** 0 errores, 0 advertencias.

### D. Pruebas Unitarias del Encargo (`bun test`)
```
bun test v1.4.2 (744846f84)

src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx:
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 1. Topbar y Visibilidad del Botón de Login > muestra botón visible de 'Iniciar sesión' cuando el usuario no tiene identidad [35.42ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 1. Topbar y Visibilidad del Botón de Login > en sesión ciudadana muestra el nombre y badge 'Ciudadano', y NO muestra 'Área de Trabajo' [4.37ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 1. Topbar y Visibilidad del Botón de Login > en sesión institucional muestra 'Área de Trabajo →' para el equipo formulador [4.31ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 2. Delimitación Estricta en PlataformaShell (/plataforma) > muestra aviso pedagógico accesible cuando un ciudadano navega a /plataforma [2.44ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 2. Delimitación Estricta en PlataformaShell (/plataforma) > permite acceso al espacio técnico para usuarios con rol institucional [11.03ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 3. Armonización de Paleta y Navegación en Sidebar y Header > PlataformaSidebar renderiza identidad POLIS y enlaces accesibles [2.62ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 3. Armonización de Paleta y Navegación en Sidebar y Header > PlataformaHeader muestra identidad, badge de rol y accesos de cuenta [0.88ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 4. Delimitación y Aviso Pedagógico en CuentaUsuario (Mi cuenta) > muestra aviso pedagógico de identidad ciudadana verificada en sesión ciudadana [10.41ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 4. Delimitación y Aviso Pedagógico en CuentaUsuario (Mi cuenta) > muestra tarjeta de acceso al área técnica en sesión institucional [10.97ms]

 9 pass
 0 fail
 29 expect() calls
Ran 9 tests across 1 file. [678.00ms]
```

---

## 4. Reglas Operativas
- Cero commits realizados.
- Cero comandos `git push` ejecutados.
- Cambios congelados en el árbol de trabajo local para revisión y consolidación.
