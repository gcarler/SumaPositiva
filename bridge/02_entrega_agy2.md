# INFORME DE ENTREGA TÉCNICA: GESTIÓN COMPLETA DE MESAS EN /PLATAFORMA/MESAS

**Fecha de Ejecución**: 2026-10-01T21:35:30Z  
**Tarea**: Habilitar creación de mesas por rol, mejorar vista de gestión y flujo completo en `/plataforma/mesas`  
**Asignada por**: EAF / Auditoría  
**Ejecutada por**: agy2 (EDD)  
**Dominio Público**: `seguridadhumanaintegral.org`  
**Commit**: `2e4d370`  
**Estado General**: APROBADO Y DESPLEGADO (100% CONFORME)

---

## 1. Resumen Ejecutivo de la Intervención

Se resolvió la problemática identificada en la ruta `/plataforma/mesas`, asegurando que los usuarios con roles operativos y de liderazgo puedan gestionar y crear mesas de trabajo territorial sin bloqueos por ausencia del array `permisos[]` del backend, enriqueciendo sustancialmente la experiencia de usuario y garantizando la coherencia arquitectónica Zero-Modals.

### Problema 1: Desbloqueo del Botón "Crear mesa" por Rol
- **Diagnóstico**: En `src/features/plataforma/models/acceso.ts`, la función `puedeEditar` requería taxativamente el permiso granular `"mesas:abrir"` dentro de `sesion.permisos[]`. Si la sesión activa no incluía dicho permiso en el arreglo devuelto por el backend, el botón no se renderizaba.
- **Solución**: Se desacopló la autorización de edición de mesas de la presencia estricta de `permisos[]`, basándola en la matriz PBAC de roles institucionales:
  ```ts
  const rolesPorModulo: Partial<Record<ModuloPlataforma, string[]>> = {
    mesas: ['autoridad_distrital', 'facilitador_mesa', 'administrador_identidades'],
    formularios: ['autoridad_distrital', 'administrador_identidades'],
    contenido: ['autoridad_distrital', 'administrador_identidades'],
  };
  return !!rolesPorModulo[modulo]?.includes(sesion?.rol ?? '');
  ```
- **Resultado**: Los roles `autoridad_distrital`, `facilitador_mesa` y `administrador_identidades` tienen acceso garantizado para crear y editar mesas, mientras que roles como `auditor_forense` o `ciudadano` permanecen en modo de solo lectura o sin acceso.

### Problema 2: Rediseño Integral de la Vista `/plataforma/mesas`
Se implementó `MesasGestionView` en `src/features/plataforma/views/mesas-view.tsx` con las siguientes capacidades:
1. **Ribbon de Contadores KPI**:
   - Total de mesas.
   - Mesas Activas / En curso.
   - Mesas Programadas.
   - Mesas Completadas.
2. **Barra de Búsqueda y Filtros Dinámicos**:
   - Búsqueda textual reactiva por nombre de mesa, entidad o lugar.
   - Filtros de estado mediante píldoras interactivas (Todas, Activas, Programadas, Completadas, Canceladas).
   - Selector de filtro por fecha específica con botón de reinicio/limpieza.
3. **Botón de Acción Principal "Crear mesa"**:
   - Ubicado en el `PageHeader`, condicionado a `puedeEditar(sesion, "mesas")`.
   - Abre directamente el drawer lateral `mesa-editor`.
4. **Tarjetas de Mesa Enriquecidas**:
   - Indicador de estado (`StatusBadge`), código de mesa y badge temático.
   - Metadatos visuales con iconos semánticos: Entidad convocante (`Landmark`), Fecha (`CalendarDays`), Hora (`Clock`), Lugar (`MapPin`), Asistentes registrados (`Users`) y submesas vinculadas (`Layers`).
   - Botón "Ver detalle" que abre el panel `mesa`.
   - Botón "Editar" (visible para usuarios con permisos de edición) que abre el panel `mesa-editor` con los datos cargados.
5. **Estados Vacíos con CTA**:
   - Mensaje claro e ilustración tipográfica para búsquedas sin coincidencias (con botón para restablecer filtros).
   - Estado vacío de catálogo general con llamado a la acción (CTA) directo para crear la primera mesa.
6. **Cumplimiento Estricto de Política UI (`scripts/ui-policy.mjs`)**:
   - Reemplazo de elementos HTML nativos interactivos por componentes `<Button variant="unstyled">`, asegurando que no existan violaciones de diseño ni linter.

### Problema 3: Integración del Panel `MesaEditorPanel`
- Se validó el registro del panel `mesa-editor` en `src/app/_composition/panel-registry.tsx`.
- Se verificó el flujo de creación en `src/features/mesas/panels/mesa-editor-panel.tsx`:
  - Formulario con React Hook Form + Zod matching exacto con las etiquetas requeridas por la suite de pruebas (`Nombre de la mesa`, `Entidad que convoca`, `Fecha`, `Total de asistentes`, `Lugar`, `Funcionario facilitador`).
  - Persistencia reactiva en Zustand (`crearMesa`), sincronización remota opcional con FastAPI (`crearMesaRemota`) e invalidación de caché TanStack Query.
  - Al completar la creación, se transiciona automáticamente abriendo el panel de detalle (`mesa`) con la mesa recién creada.

---

## 2. Matriz de Cumplimiento Técnico

| Requerimiento | Archivo Afectado | Estado | Detalle |
| :--- | :--- | :---: | :--- |
| **Autorización por rol en `puedeEditar`** | `src/features/plataforma/models/acceso.ts` | ✅ **CONFORME** | Autorización explícita para `autoridad_distrital`, `facilitador_mesa` y `administrador_identidades`. |
| **Pruebas unitarias de acceso PBAC** | `src/features/plataforma/models/acceso.test.ts` | ✅ **CONFORME** | 16/16 pruebas unitarias aprobadas, validando edición con permisos vacíos. |
| **Contadores KPI por estado** | `src/features/plataforma/views/mesas-view.tsx` | ✅ **CONFORME** | Indicadores Total, Activas, Programadas y Completadas con badge numérico. |
| **Filtros por estado y fecha** | `src/features/plataforma/views/mesas-view.tsx` | ✅ **CONFORME** | Pills de estado, input date picker y campo de búsqueda reactivo con debounce. |
| **Botón 'Crear mesa' condicional** | `src/features/plataforma/views/mesas-view.tsx` | ✅ **CONFORME** | Visible en `PageHeader` solo si `puedeEditar(sesion, "mesas")` es verdadero. |
| **Cards informativas de mesa** | `src/features/plataforma/views/mesas-view.tsx` | ✅ **CONFORME** | Metadatos completos (código, entidad, fecha/hora, lugar, participantes, estado). |
| **Estado vacío con CTA** | `src/features/plataforma/views/mesas-view.tsx` | ✅ **CONFORME** | `EmptyState` adaptado tanto para filtros sin resultados como para lista vacía. |
| **Apertura de `MesaEditorPanel`** | `src/features/mesas/panels/mesa-editor-panel.tsx` | ✅ **CONFORME** | Abre drawer L4, valida campos, guarda en store/backend y abre detalle. |
| **Cumplimiento UI Policy** | `scripts/ui-policy.mjs` | ✅ **CONFORME** | Cero elementos interactivos nativos (`<button>`, `<select>`) no envueltos en componentes de diseño. |
| **Pruebas de Historias Storybook** | `src/app/_stories/plataforma-interna.stories.tsx`, `platform.stories.tsx` | ✅ **CONFORME** | 100% de historias de plataforma y mesas aprobadas (incluyendo `MesasAuditor` y `Crear Mesa Completa`). |

---

## 3. Evidencias de Verificación y Pruebas

### 3.1 Comprobación de Políticas, Tipos y Linter (`bun run check`)
```bash
$ bun run check
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
# Código de salida: 0 (Cero errores, cero advertencias)
```

### 3.2 Pruebas Unitarias de Acceso (`bun test`)
```bash
$ bun test src/features/plataforma/models/acceso.test.ts
✓ acceso plataforma > roles autorizados ven módulos según matriz [3.81ms]
✓ acceso plataforma > roles autorizados editan según matriz de acceso por rol [0.68ms]
✓ acceso plataforma > paneles restringidos rechazan roles no autorizados [0.72ms]
✓ acceso plataforma > auditores solo tienen lectura [0.38ms]
...
 16 pass
 0 fail
 40 expect() calls
Ran 16 tests across 1 file. [19.00ms]
```

### 3.3 Pruebas de Interacción Storybook / Vitest
```bash
$ bun x vitest run src/app/_stories/plataforma-interna.stories.tsx
 ✓ src/app/_stories/plataforma-interna.stories.tsx (19 tests) 3144ms
   ✓ PlataformaInterna > Mesas
   ✓ PlataformaInterna > MesasAuditor (verifica que auditor no ve botón 'Crear mesa')
   ...
 Tests  19 passed (19)

$ bun x vitest run src/app/_stories/platform.stories.tsx
 ✓ src/app/_stories/platform.stories.tsx (24 tests) 4120ms
   ✓ Platform > Crear Mesa Completa
   ...
 Tests  24 passed (24)
```

### 3.4 Compilación de Producción (`bun run build`)
```bash
$ bun run build
$ next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
▲ Next.js 16.1.3 (Turbopack)
- Environments: .env.local, .env
✓ Compiled successfully in 8.3s
Finished TypeScript in 10.9s
Generating static pages using 7 workers (3/3) in 410.2ms
Finalizing page optimization in 140.1ms
```

### 3.5 Verificación del Servicio Activo y HTTP 200
```bash
$ curl -sI http://127.0.0.1:3000/plataforma/mesas
HTTP/1.1 200 OK
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
x-nextjs-cache: HIT
Content-Type: text/html; charset=utf-8
```

---

## 4. Registro de Cambios y Commits

- **Commit**: `2e4d370`
- **Mensaje**:
```text
fix(plataforma/mesas): habilitar creación de mesas por rol, mejorar vista y flujo completo

- Refactorizar puedeEditar en acceso.ts para habilitar creación por rol
  (autoridad_distrital, facilitador_mesa, administrador_identidades)
- Rediseñar mesas-view.tsx con KPIs por estado, filtros reactivos y tarjetas informativas
- Reemplazar botones interactivos por Button de UI policy
- Integrar MesaEditorPanel con validación RHF y navegación a detalle
- Actualizar tests de acceso y verificar historias de Storybook
```
