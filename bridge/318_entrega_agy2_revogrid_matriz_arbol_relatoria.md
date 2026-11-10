# INFORME DE ENTREGA — ENCARGO 318: INTEGRACIÓN DE REVOGRID (COMMUNITY EDITION) EN MATRIZ DE SISTEMATIZACIÓN Y ÁRBOL DE RELATORÍA

**Para:** Antigravity Principal / Usuario  
**De:** Subagente `agy2`  
**Fecha:** 2026-11-09  
**Referencia:** [`bridge/318_tarea_agy2_revogrid_matriz_arbol_relatoria.md`](file:///root/polis/bridge/318_tarea_agy2_revogrid_matriz_arbol_relatoria.md) — *Opción A: Integración de RevoGrid en Matriz de Sistematización y Árbol de Relatoría*

---

## 1. Resumen Ejecutivo

En cumplimiento de las instrucciones del **Encargo 318**, se integró exitosamente la versión comunitaria de **RevoGrid** (`@revolist/react-datagrid` y `@revolist/revogrid` versión `^4.31.4`, MIT) en la Matriz de Sistematización y Árbol de Relatoría de Mesas de Trabajo:
- Ubicación principal: [`src/features/mesas/components/matriz-arbol-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-arbol-relatoria.tsx).
- Componente especializado: [`src/features/mesas/components/matriz-revogrid-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-revogrid-relatoria.tsx).
- Suite de pruebas unitarias: [`src/features/mesas/components/matriz-revogrid-relatoria.test.tsx`](file:///root/polis/src/features/mesas/components/matriz-revogrid-relatoria.test.tsx).

La integración permite a relatores, facilitadores comunitarios y técnicos de formulación pública operar en un entorno de alto rendimiento tipo hoja de cálculo virtualizada (estilo Excel / Google Sheets), con edición interactiva inline, copiado y pegado de rangos desde portapapeles (`Ctrl+C` / `Ctrl+V`), exportación a TSV/CSV, filtrado dinámico y sincronización bidireccional reactiva con los árboles de problemas y soluciones (MML).

---

## 2. Arquitectura de Implementación y Salvaguardas Técnicas

### 2.1 Carga Dinámica SSR (`next/dynamic ssr: false`)
- RevoGrid se fundamenta en Web Components de Stencil (`<revo-grid>`). Para evitar fallos en el renderizado del servidor de Next.js (`window is not defined` o `customElements is not defined`), el componente `MatrizRevogridRelatoria` se importa dinámicamente en [`matriz-arbol-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-arbol-relatoria.tsx) con `{ ssr: false }` y un indicador de carga accesible mientras se montan los custom elements en el DOM del cliente:
  ```tsx
  const MatrizRevogridRelatoria = dynamic(
    () =>
      import("./matriz-revogrid-relatoria").then(
        (m) => m.MatrizRevogridRelatoria,
      ),
    {
      ssr: false,
      loading: () => (
        <div className="flex h-96 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-tertiary)]">
          Iniciando motor de cuadrícula RevoGrid…
        </div>
      ),
    },
  );
  ```
- En [`matriz-revogrid-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-revogrid-relatoria.tsx), la inicialización de los web components (`defineCustomElements()`) está resguardada por verificación `typeof window !== "undefined"`.

### 2.2 Cumplimiento Estricto de UI Policy (`scripts/ui-policy.mjs`)
- Cero elementos HTML nativos restringidos (`<button>`, `<input>`, `<select>`, `<label>`, `<textarea>`). Todo control interactivo utiliza los componentes certificados de `@/shared/ui/` (`Button`, `Input`, `Select`, `Label`, `Badge`).
- Cero clases de color Tailwind fijas o arbitrarias (`text-blue-500`, `bg-gray-100`, etc.).
- Las variables CSS internas del motor RevoGrid (`--rg-theme-background`, `--rg-theme-text`, `--rg-theme-header-bg`, `--rg-theme-header-border`, `--rg-theme-row-border`, `--rg-theme-select-border`, `--rg-theme-header-text`) se conectaron explícitamente a los tokens semánticos de POLIS:
  - `var(--surface-1)` / `var(--surface-2)` / `var(--surface-0)`
  - `var(--text-primary)` / `var(--text-secondary)` / `var(--text-tertiary)`
  - `var(--border)`
  - `var(--ember)`
- Garantiza contraste óptimo y coherencia visual idéntica en tema claro y tema oscuro.

### 2.3 Estructura de Datos Tabular Proyectada (`FilaRevoGrid`)
Se diseñó la función pura `arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones)` que descompone y proyecta la jerarquía de los árboles en filas planas con 7 columnas esenciales:
1. **Tipo de Nodo:** Causa / Efecto / Problema Central / Medio / Fin / Objetivo Central.
2. **Nivel:** Directa / Indirecta / Fines últimos / Nivel Central.
3. **Descripción / Contenido del Aporte:** Texto editable inline del nodo.
4. **Dimensión ONU:** Selector / visualizador de las 7 dimensiones distritales (Res. 66/290).
5. **Entidad Responsable:** Dependencia o secretaría responsable del nodo.
6. **Submesa / Colectivo de Origen:** Trazabilidad comunitaria del insumo.
7. **Criticidad:** Nivel de prioridad/severidad (Baja, Media, Alta, Muy Alta, Crítica).

### 2.4 Sincronización Bidireccional de Edición y Pegado de Rangos
- La función `sincronizarEdicionesArboles` procesa eventos de edición de celdas (`afteredit`) y cambios por lotes generados al pegar múltiples celdas desde Excel o Google Sheets.
- Detecta si el nodo modificado pertenece al Árbol de Problemas o al Árbol de Soluciones, actualiza inmutablemente el nodo raíz o subnodo correspondiente, y emite `onActualizarProblemas` o `onActualizarSoluciones`.
- **Modo Solo Lectura:** Si `readOnly` es `true`, todas las columnas configuran `readonly: true`, se inhabilitan las adiciones rápidas y se muestra un banner informativo de solo lectura.

### 2.5 Capacidades Adicionales
- **Selector de Vista en Cabecera:** Alternancia instantánea entre `[ Vista Estructurada ]` (acordeones y tarjetas MML tradicionales) y `[ Cuadrícula RevoGrid ]`.
- **Cinta de Métricas KPI:** Conteo en tiempo real de Total de Nodos, Causas, Efectos, Problemas/Objetivo Central, Medios y Fines.
- **Filtrado Avanzado:** Búsqueda textual y filtro desplegable por tipo de nodo y dimensión ONU.
- **Acciones Rápidas:** Botones accesibles `+ Causa`, `+ Efecto`, `+ Medio`, `+ Fin` para añadir registros directamente.
- **Exportación Flexible:** Botón para copiar matriz completa al portapapeles en formato TSV (para pegar en Excel) y botón de descarga directa de archivo `.csv`.

---

## 3. Evidencia de Calidad y Pruebas Unitarias

### 3.1 Pruebas Unitarias de RevoGrid (`matriz-revogrid-relatoria.test.tsx`)
Se desarrollaron 8 pruebas exhaustivas cubriendo:
1. Mapeo tabular completo de árboles a filas (`arbolesAFilasRevoGrid`).
2. Renderizado del componente con RevoGrid y controles de búsqueda/filtro.
3. Comportamiento en modo solo lectura (`readOnly={true}`).
4. Alternancia accesible entre vista estructurada y vista RevoGrid en `MatrizArbolRelatoria`.
5. Sincronización de ediciones en Causas directas/indirectas.
6. Sincronización de ediciones en Efectos.
7. Sincronización de ediciones en el Problema Central.
8. Sincronización por lotes simulando pegado de rango multicelda desde Excel.

```
✓ MatrizRevoGridRelatoria > arbolesAFilasRevoGrid > mapea arboles de problemas y soluciones a filas planas RevoGrid
✓ MatrizRevoGridRelatoria > renderiza la cuadricula RevoGrid y la barra de herramientas
✓ MatrizRevoGridRelatoria > respeta el modo solo lectura (readOnly)
✓ MatrizRevoGridRelatoria > alternancia entre vista estructurada y cuadricula RevoGrid en MatrizArbolRelatoria
✓ MatrizRevoGridRelatoria > sincronizarEdicionesArboles > propaga cambios en causas a onActualizarProblemas
✓ MatrizRevoGridRelatoria > sincronizarEdicionesArboles > propaga cambios en efectos a onActualizarProblemas
✓ MatrizRevoGridRelatoria > sincronizarEdicionesArboles > propaga cambios en el problema central
✓ MatrizRevoGridRelatoria > sincronizarEdicionesArboles > soporta edicion por lotes (simulacion de pegado de rangos)
```

### 3.2 Suite de Mesas Completa
Ejecutada con `bun test src/features/mesas`:
```
 166 pass
 0 fail
 655 expect() calls
Ran 166 tests across 14 files. [4.96s]
```

### 3.3 Quality Gates del Proyecto (`bun run check`)
Ejecutado con resultado 100% exitoso:
```bash
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```
- `ui-policy.mjs`: **0 infracciones** (todos los tokens semánticos y controles POLIS validados).
- `tsc --noEmit`: **0 errores de TypeScript**.
- `eslint .`: **0 errores, 0 advertencias**.

---

## 4. Archivos Modificados y Creados

| Archivo | Estado | Descripción |
| --- | --- | --- |
| [`src/features/mesas/components/matriz-revogrid-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-revogrid-relatoria.tsx) | Creado | Componente cliente RevoGrid con mapeo de tokens CSS POLIS, sincronizador bidireccional, filtros y exportación |
| [`src/features/mesas/components/matriz-arbol-relatoria.tsx`](file:///root/polis/src/features/mesas/components/matriz-arbol-relatoria.tsx) | Modificado | Inclusión del selector de vista `[ Vista Estructurada ]` / `[ Cuadrícula RevoGrid ]` y carga dinámica SSR con `next/dynamic` |
| [`src/features/mesas/components/matriz-revogrid-relatoria.test.tsx`](file:///root/polis/src/features/mesas/components/matriz-revogrid-relatoria.test.tsx) | Creado | Suite de 8 pruebas unitarias (mapeo, render, sincronización de celdas, pegado de rangos, toggle de vista) |
| [`src/features/plataforma/components/plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx) | Corregido | Corrección de prop `size="icon-xs"` a `size="icon-sm"` en botón para satisfacer `ButtonProps` |

---

## 5. Salvaguardas de Entorno
- Base de datos `bd_csh` intacta (congelada en migración 0096).
- Cero commits de git (`git commit`) y cero operaciones de push (`git push`).
- Archivos listos para revisión y congelación.
