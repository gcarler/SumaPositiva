# TAREA ACTIVA: [GAP-FIX-03] ACTIVACIÓN DE ENLACES INERTES Y NAVEGACIÓN OPERATIVA EN MENÚ INSTITUCIONAL

**Fecha:** 2026-10-09  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Plan de Trabajo Maestro homologado en `bridge/03_dictamen_revision.md` (Fase 3)  
**Severidad del GAP:** ALTA (GAP-03 y GAP-10 erradicados)  

---

## 🎯 1. Objetivos Técnicos de la Tarea [GAP-FIX-03]

El objetivo de esta fase es erradicar de raíz todos los botones inertes disfrazados de `toast.info` y los identificadores hardcoded en el menú institucional (`src/app/_components/sidebar-institucional.tsx`), dotando a cada opción de una acción operativa real (apertura de panel especializado o navegación a vista de plataforma):

### 1.1. Erradicación de Botones Inertes con `toast.info` en `src/app/_components/sidebar-institucional.tsx`
1. **Analítica y Métricas de Formularios (`forms_analitica`, L167)**:
   - Eliminar `toast.info("Analítica global", ...)`.
   - Conectar la acción para abrir el panel operativo de analítica: `openPanel("formulario-analitica", {})` o, en su defecto, desplegar el selector de formularios con métricas consolidadas (`openPanel("formularios", {})`).
2. **Actas Inmutables C-150 (`mesas_actas`, L199)**:
   - Eliminar `toast.info("Actas Comunitarias", ...)`.
   - Conectar a la apertura del panel de actas oficial `openPanel("mesa-acta", {})` resolviendo la primera mesa canónica o abriendo el visor institucional de actas comunitarias.
3. **Presupuesto FONSET / SGP (`presupuesto`, L269)**:
   - Eliminar `toast.info("Presupuesto FONSET / SGP", ...)`.
   - Conectar a la apertura del panel de costeo `openPanel("asignacion-presupuestal", {})` o navegación hacia `/plataforma/alternativas` (módulo de asignación presupuestal y fuentes MGA).
4. **Indicadores DNP SINERGIA (`indicadores`, L275)**:
   - Eliminar `toast.info("Indicadores DNP SINERGIA", ...)`.
   - Conectar a la apertura del panel `openPanel("rendicion-cuentas", {})` o `openPanel("indicador-detalle", {})` o navegación directa hacia `/plataforma/seguimiento`.

### 1.2. Resolución Dinámica de Mesas en Papelógrafo MGA (`mesas_papelografo`, GAP-10)
- En L188-193, erradicar los identificadores estáticos mockeados `mesaId: "mesa-001"` y `submesaId: "sm-001-1"`.
- Resolver dinámicamente una mesa válida desde `useMesasStore.getState().mesas` (e.g. la primera mesa disponible o la mesa canónica activa). Si no hay submesa cargada, abrir el panel en modo visión general del árbol o abrir el panel de selección de mesa para papelógrafo.

### 1.3. Robustecimiento de Navegación Institucional
- Permitir la navegación fluida tanto a las vistas del portal ciudadano (`setVista`) como a los módulos avanzados de la plataforma administrativa (`/plataforma/*`) mediante `useRouter` de `next/navigation` o enlaces tipados.
- Añadir opciones directas a módulos institucionales clave si el rol lo amerita (Diagnóstico, Fuentes, Actores).

### 1.4. Pruebas Unitarias de Navegación
- Crear o actualizar suite de pruebas unitarias (`src/app/_components/sidebar-institucional.test.tsx` o similar) verificando que ninguno de los módulos o submódulos llame a `toast.info` como sustituto de navegación o acción y que todos despachen la apertura de paneles o rutas correspondientes.

---

## 🛡️ 2. Quality Gates Obligatorios
- `bun run check`: **0 errores** (ui-policy, tsc, eslint).
- `bun test`: **100% verde** (327 pass o superior).
- `bun run build`: **Compilación limpia exitosa** (190 rutas generadas).
- `systemctl restart polis-frontend`: Servicio activo y respondiendo HTTP 200 en `http://127.0.0.1:3000`.
- Commit atómico local en `main` con mensaje descriptivo (e.g. `feat(sidebar): [GAP-FIX-03] activacion de enlaces inertes y resolucion dinamica en menu institucional`).
- **PROHIBIDO**: `git push` a remoto.

Al culminar la implementación y verificar todos los quality gates, documenta en `bridge/02_resultado_agy2.md` y notifica a `agy` en la sesión tmux.
