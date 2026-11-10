# ENCARGO 316: Botón de Login Visible, Delimitación Ciudadano vs. Área de Trabajo y Armonización de Paleta de Colores

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-08 · **Estado:** ASIGNADO
- **Origen:** Requerimiento del usuario:
  > *"Es que por lo que veo en polis no hay un botón para loguearse si bien un ciudadano puede hacer una propuesta de forma anónima, un ciudadano también puede loguearse y dar su nombre ahora el hecho de que se loguee en la plataforma polis no le da acceso a la plataforma en su área de trabajo, Es decir el lugar donde se crean las mesas donde se llenan los registros de las mesas donde están las tareas donde está plan de trabajo del equipo formulador es decir la plataforma como espacio de trabajo del equipo formulador de la política pública entonces revisa ese tema porfa….. por favor que te iba a pedir es que a la plataforma poli le pongas la paleta de colores de la plataforma…. por favor apóyate con AGY2"*
- **Regla rectora:** Cero regresiones en quality gates (`node scripts/ui-policy.mjs`, `bun run typecheck`, `bun run lint`). Uso estricto de tokens semánticos del kit UI (`tokens.css`, `var(--brand-polis-*)`, `var(--ember)`, `var(--surface-*)`, etc.). Cero colores fijos ni utilidades de paleta pura Tailwind.

---

## 1. Diagnóstico y Objetivos

### 1.1. Visibilidad del Botón de Login en el Portal Público (`Topbar`)
* **Problema:** En `src/app/_components/topbar.tsx`, el componente `SesionButton` muestra "Anónimo" cuando la sesión está en modo anónimo (lo cual ocurre por defecto tras interactuar con formularios o aportes). El usuario ve una etiqueta "Anónimo" y NO un botón visible de "Iniciar sesión". Además, en móviles y pantallas medianas el texto se ocultaba, y en desktop estaba rodeado de 5 botones secundarios.
* **Solución:**
  1. Rediseñar `SesionButton` y la barra de acciones de `Topbar` para que **siempre sea visible y evidente la acción de "Iniciar sesión"**.
  2. Si el usuario navega como anónimo, debe mostrar claramente la opción de identificarse: botón claro "Iniciar sesión" o cápsula interactiva `"Anónimo · Iniciar sesión"`.
  3. Reorganizar los botones secundarios de la barra superior para evitar desbordes y dar jerarquía visual al acceso.

### 1.2. Delimitación Estricta: Ciudadano vs. Área de Trabajo Institucional (`/plataforma`)
* **Regla fundamental de diseño:**
  - El **Ciudadano** puede hacer propuestas de forma anónima O loguearse para participar con su nombre y apellidos verificados.
  - El hecho de que un ciudadano inicie sesión **NO le da acceso a la plataforma en su área de trabajo** (`/plataforma`), la cual es el espacio técnico del equipo formulador (donde se crean las mesas, se gestionan compromisos, se asignan tareas y se monitorea el plan de trabajo).
  - Si un ciudadano inicia sesión:
    - En `Topbar` se muestra su nombre: ej. `<SesionAvatar /> Juan Pérez` con un badge o indicativo `Ciudadano`.
    - **NO** se muestra el botón "Ir a la Plataforma".
    - En `SesionPanel` (Mi cuenta), se explica claramente: *"Estás participando con tu identidad ciudadana verificada. El espacio de trabajo técnico (/plataforma) está reservado para los equipos formuladores y facilitadores acreditados de la política pública."*
    - Si un usuario con rol ciudadano navega manualmente a `/plataforma`, `PlataformaShell` le muestra un aviso pedagógico accesible explicando la restricción institucional y ofreciendo volver al portal ciudadano, en lugar de un rebote confuso.
  - Si un **Funcionario / Formulador / Facilitador** inicia sesión:
    - Ve su nombre y rol institucional (`facilitador_mesa`, `autoridad_distrital`, `coordinador`, etc.).
    - Se despliega de forma prominente el botón **"Área de Trabajo (/plataforma) →"** para acceder a sus herramientas de trabajo.

### 1.3. Armonización de la Paleta de Colores
* **Objetivo:** Aplicar la paleta de identidad oficial de POLIS (`--brand-polis-blue`, `--brand-polis-sky`, `--brand-polis-cyan`, `--ember`, `--surface-*`) en la plataforma institucional (`/plataforma`) y en el portal público:
  - En `/plataforma`: Sidebar y Header con estilo visual enriquecido y profesional (evitando el aspecto plano monocromático), con acentos en azul institucional POLIS y acento ember de Cartagena.
  - En el portal público: Botones, badges de estado y llamadas a la acción alineados a los tokens canónicos.

---

## 2. Entregables Esperados
1. Modificaciones en `src/app/_components/topbar.tsx`.
2. Modificaciones en `src/features/sesion/panels/sesion-panel.tsx`.
3. Ajustes en `src/features/plataforma/components/plataforma-sidebar.tsx`, `plataforma-header.tsx` y `plataforma-shell.tsx`.
4. Pruebas y verificación con `bun run check`.
5. Informe de entrega en `bridge/316_entrega_agy2_login_ux_acceso_y_paleta_plataforma.md`.
