# TAREA ACTIVA: [QA-FIX-01] RESOLUCIÓN INTEGRAL DE QA-002, QA-003 Y QA-004: FLUIDEZ TOTAL EN PANTALLAS ULTRA-ANCHAS Y SINCRONIZACIÓN DE ASISTENCIA EN PLATAFORMA

**Fecha**: 2026-10-08  
**Asignada a**: `agy2` (Desarrollador / EDD)  
**Supervisor / Auditor**: `agy` (Coordinador / Auditor Forense EAF)  
**Tickets de Referencia en QA Platform (`http://2.25.244.251:4000`)**:
- `QA-002`: No responsive y adaptative de algunos formularios (`https://seguridadhumanaintegral.org/asistencia/mt-l02-01`)
- `QA-003`: Los formularios siguen sin ser adaptativos (evidencia en monitor ultra-wide con márgenes vacíos)
- `QA-004`: El registro a las mesas debe estar en la plataforma y no en los sitios públicos (`https://seguridadhumanaintegral.org/plataforma/mesas`)

---

## 🎯 Alcance Técnico y Requerimientos de UX:

### 1. Fluidez Total y Eliminación de Márgenes Muertos en Pantallas Ultra-Anchas (`QA-002`, `QA-003`)
- **Archivo Principal**: `src/app/asistencia/[mesaId]/asistencia-cliente.tsx`.
- **Causa Raíz**: El contenedor utilizaba topes fijos `max-w-7xl` y `2xl:max-w-[1536px]`. En monitores 1440p, 2K, 4K o pantallas ultra-wide (como se evidenció en las capturas de QA), el contenido queda constreñido en una caja central de 1280px con franjas vacías gigantes a los lados.
- **Acción Requerida**:
  - Eliminar de raíz cualquier `max-w-7xl` y `2xl:max-w-[1536px]` en `<header>`, `<main>` y `<footer>`.
  - Aplicar contenedor **100% fluido (`w-full`)** con padding horizontal adaptativo:
    `w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20`.
  - En pantallas grandes (`xl:`, `2xl:`):
    - El grid de 2 columnas debe ocupar el 100% del ancho (`w-full`).
    - En la tarjeta derecha (formulario), organizar los campos en sub-grids de 2 y 3 columnas armónicas para que los inputs no queden excesivamente alargados, sino con ergonomía visual perfecta.
    - En la tarjeta izquierda (información): las tarjetas de datos, badges y aforo deben expandirse y lucir sólidas y bien proporcionadas.

### 2. Sincronización y Registro Nativo de Asistencia en la Plataforma (`QA-004`)
- **Archivos Principales**:
  - `src/features/mesas/panels/mesa-panel.tsx`
  - `src/features/mesas/state/asistencia-store.ts`
- **Causa Raíz**:
  - El facilitador en `/plataforma/mesas` veía el quórum en 0 porque `mesa-panel.tsx` consultaba únicamente con `props.mesaId` (UUID interno) mientras que los registros de puerta se indexaban por código oficial (`MT-L01-01` o `mt-l01-01`).
  - No se ejecutaba `cargarAsistentesDesdeBackend` al abrir el panel de la mesa.
  - El botón de "+ Registrar Asistente Manual" estaba poco visible y requiere mayor prominencia y accesibilidad directa dentro de la plataforma para que el equipo institucional pueda operar la sesión.
- **Acción Requerida**:
  - En `asistencia-store.ts`:
    - Mejorar `useRegistrosMesa(mesaId)` para que resuelva y agregue asistentes buscando por todas las variantes de identificación de la mesa (UUID, `codigoOficial`, slug en minúsculas y código de agenda `mt-001`).
  - En `mesa-panel.tsx`:
    - Invocar `cargarAsistentesDesdeBackend(mesa.id)` y `cargarAsistentesDesdeBackend(mesa.codigoOficial)` en el montaje del panel.
    - Hacer que el registro manual de asistencia sea destacado, intuitivo y con feedback inmediato (`toast.success`), limpiando los campos tras registrar.
    - Asegurar que la tabla de quórum digital refleje de inmediato tanto los registros manuales de la plataforma como los escaneos de puerta.

---

## 📋 Quality Gates de Entrega Obligatorios:
1. `bun run check` -> **0 errores** (`ui:check`, `tsc --noEmit`, `eslint .`).
2. `bun test src/features/mesas/` -> **100% pruebas pasando**.
3. `bun run build` -> **Compilación limpia de Next.js**.
4. Reinicio de frontend: `systemctl restart polis-frontend`.
5. Verificación pericial de:
   - `http://127.0.0.1:3000/asistencia/mt-l02-01` (ancho fluido sin `max-w-7xl`).
   - `http://127.0.0.1:3000/plataforma/mesas` (sincronización de asistentes).
6. Commit atómico local en la rama `main` (sin git push).
7. Documentar entrega en `bridge/02_resultado_agy2.md`.
8. Solicitar contra-auditoría pericial a `agy`.
