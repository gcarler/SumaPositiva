# INFORME DE ENTREGA — ENCARGO 324: AJUSTES DE FIDELIDAD FIGMA EN `PlataformaSidebar` (MENÚ NIVEL 2 ALINEADO A LA IZQUIERDA + BOTÓN CIRCULAR CHEVRON)

- **Responsable:** Subagente `agy2`
- **Revisor:** Coordinación General Antigravity / Auditoría EAF
- **Fecha:** 2026-11-10
- **Estado:** IMPLEMENTADO Y VERIFICADO (100% Quality Gates Superados)
- **Especificación Rector:** [`bridge/324_tarea_agy2_ajustes_figma_sidebar_nivel2_y_chevron.md`](file:///root/polis/bridge/324_tarea_agy2_ajustes_figma_sidebar_nivel2_y_chevron.md)
- **Referencia Figma Community:** `1239525598886080843/sidebar`

---

## 1. Resumen Ejecutivo

En cumplimiento de las observaciones del usuario y los requerimientos del Encargo 324, se realizaron dos refinamientos de alta fidelidad visual en el sidebar institucional de `/plataforma/*`:

1. **Alineación Izquierda del Menú Nivel 2 (Submódulos):** Se erradicó el centrado horizontal no deseado provocado por la clase base de `buttonVariants`. Ahora los submódulos cuentan con indentación técnica respecto al Nivel 1 (`ml-4 pl-2.5 border-l border-[var(--border)] space-y-0.5 my-1 flex flex-col items-stretch`) y alineación horizontal explícita `justify-start text-left gap-2.5 px-2.5` en cada botón. Tanto los iconos como los textos se alinean perfectamente a la izquierda sobre la línea guía vertical, tal como especifica el diseño de referencia.
2. **Botón Circular de Expansión/Colapso tipo Chevron (Estilo Figma Community):** Se reemplazó el icono y botón anterior por un botón circular flotante posicionado sobre el borde derecho superior (`-right-3 top-5 z-30`), con iconos `ChevronLeft` (cuando está expandido) y `ChevronRight` (cuando está colapsado a iconos). En `PlataformaHeader` se actualizaron análogamente los iconos para coherencia del sistema, manteniendo los atributos accesibles `aria-label` y `title`.
3. **Visibilidad y Desbordamiento en Desktop:** Se ajustó el contenedor `<aside>` con `lg:overflow-visible` permitiendo que el botón circular flote de forma visible sobre el borde sin ser recortado, mientras el scroll vertical se mantiene encapsulado en el elemento `<nav>` interno.

---

## 2. Detalle de Archivos Modificados

### 1. `src/features/plataforma/components/plataforma-sidebar.tsx`
- **Importaciones:** Se importó `ChevronLeft` de `lucide-react` y se removieron los iconos redundantes `PanelLeftClose` y `PanelLeftOpen`.
- **Estructura `<aside>`:** Se cambió `lg:overflow-y-auto` a `lg:overflow-visible` para permitir el desbordamiento del botón circular flotante.
- **Botón de Colapso/Expansión:** Implementado con clases:
  ```tsx
  className="hidden lg:inline-flex absolute -right-3 top-5 z-30 size-6 p-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] shadow-xs hover:bg-[var(--brand-polis-blue)] hover:text-[var(--text-inverse)] hover:border-[var(--brand-polis-blue)] transition-all cursor-pointer"
  ```
  Con iconos `ChevronRight` (colapsado) y `ChevronLeft` (expandido), preservando `aria-label={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}`.
- **Submódulos Nivel 2:**
  - Contenedor con `flex flex-col items-stretch`.
  - Botones con `className="flex items-center justify-start gap-2.5 w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors ..."`, garantizando la alineación a la izquierda.

### 2. `src/features/plataforma/components/plataforma-header.tsx`
- Se reemplazaron `PanelLeftClose` y `PanelLeftOpen` por `ChevronLeft` y `ChevronRight`, manteniendo la consistencia de iconografía en toda la barra superior.

### 3. `src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx`
- Se agregó la prueba unitaria:
  `Encargo 324: submódulos Nivel 2 alineados a la izquierda (justify-start, text-left) y botón circular Figma con chevron (-right-3)`
- Verificación de presencia de clases `justify-start`, `text-left`, `flex-col items-stretch`, `-right-3`, `rounded-full` y los estados colapsado/expandido.

---

## 3. Verificación de Quality Gates

### A. Política UI y Tokens Semánticos (`node scripts/ui-policy.mjs`)
```bash
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```
- **Resultado:** 0 infracciones.

### B. Verificación de Tipos TypeScript (`bun run typecheck`)
```bash
$ tsc --noEmit
# Código de salida 0
```
- **Resultado:** 0 errores de tipado.

### C. Linter Institucional (`npx eslint src/features/plataforma/` y `bun run lint`)
```bash
$ npx eslint src/features/plataforma/
# Código de salida 0

$ eslint .
# Código de salida 0
```
- **Resultado:** 0 errores y 0 advertencias de ESLint en todo el proyecto.

### D. Pruebas Unitarias de Acceso y Sidebar
```bash
$ bun test src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx
bun test v1.4.2 (744846f84)

src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx:
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 1. Topbar y Visibilidad del Botón de Login > muestra botón visible de 'Iniciar sesión' cuando el usuario no tiene identidad [34.27ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 1. Topbar y Visibilidad del Botón de Login > en sesión ciudadana muestra el nombre y badge 'Ciudadano', y NO muestra 'Área de Trabajo' [3.97ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 1. Topbar y Visibilidad del Botón de Login > en sesión institucional muestra 'Área de Trabajo →' para el equipo formulador [3.36ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 2. Delimitación Estricta en PlataformaShell (/plataforma) > muestra aviso pedagógico accesible cuando un ciudadano navega a /plataforma [5.83ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 2. Delimitación Estricta en PlataformaShell (/plataforma) > permite acceso al espacio técnico para usuarios con rol institucional [16.96ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 3. Armonización de Paleta y Navegación en Sidebar y Header > PlataformaSidebar renderiza identidad POLIS y enlaces accesibles [9.37ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 3. Armonización de Paleta y Navegación en Sidebar y Header > PlataformaSidebar en modo colapsado se reduce a iconos (lg:w-16) con botón de expandir [10.73ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 3. Armonización de Paleta y Navegación en Sidebar y Header > PlataformaHeader muestra identidad, badge de rol y accesos de cuenta [1.22ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 4. Delimitación y Aviso Pedagógico en CuentaUsuario (Mi cuenta) > muestra aviso pedagógico de identidad ciudadana verificada en sesión ciudadana [10.86ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 4. Delimitación y Aviso Pedagógico en CuentaUsuario (Mi cuenta) > muestra tarjeta de acceso al área técnica en sesión institucional [3.40ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento > renderiza secciones, módulos y submódulos según permisos de facilitador_mesa [3.87ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento > renderiza sección y submódulos de administración para administrador_identidades [5.49ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento > buscador visible en modo expandido y oculto en modo colapsado [5.56ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento > tirador de redimensionamiento accesible con role separator y límites aria [2.45ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento > store: persistencia, acotamiento de ancho (200-420px) y subvistas [0.20ms]
✓ Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional > 5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento > Encargo 324: submódulos Nivel 2 alineados a la izquierda (justify-start, text-left) y botón circular Figma con chevron (-right-3) [4.21ms]

 16 pass
 0 fail
 67 expect() calls
Ran 16 tests across 1 file. [4.00s]
```

### E. Suite de Módulos de Plataforma
```bash
$ bun test src/features/plataforma/
 89 pass
 0 fail
 661 expect() calls
Ran 89 tests across 9 files. [917.00ms]
```

---

## 4. Estado de Salvaguardas

| Salvaguarda | Estado | Verificación |
|---|---|---|
| **Base de datos congelada en 0096** | CUMPLIDO | `0096_riesgo_sin_evaluar`. Cero migraciones ejecutadas. |
| **Cero git commit / push** | CUMPLIDO | Sin commits ni pushes realizados. |
| **Alcance exclusivo `/plataforma/*`** | CUMPLIDO | El portal público (`/`) no fue afectado. |

---

## 5. Conclusión

El **Encargo 324** ha sido completado al 100%, dejando el sidebar institucional de POLIS fiel al diseño de referencia de Figma Community, con excelente ergonomía visual, alineación estricta y plena conformidad técnica.