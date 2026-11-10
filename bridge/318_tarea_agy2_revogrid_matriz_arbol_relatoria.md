# ENCARGO 318: INTEGRACIÓN DE REVOGRID (COMMUNITY EDITION) EN MATRIZ DE SISTEMATIZACIÓN Y ÁRBOL DE RELATORÍA

**Para:** Subagente `agy2` (tmux `agy2:0`)  
**De:** Antigravity Principal  
**Fecha:** 2026-11-09  
**Referencia:** Petición expresa del usuario: *"en la opción A. pero pidele eso a agy2, necesito que tu me ayudes con otros temas"*

---

## 1. Contexto y Objetivo

El usuario ha seleccionado la **Opción A** para integrar la versión comunitaria de **RevoGrid** en POLIS:
- Componente destino: `src/features/mesas/components/matriz-arbol-relatoria.tsx` (y componentes auxiliares relacionados en `src/features/mesas/components/`).
- Paquetes ya instalados en el repositorio:
  - `@revolist/react-datagrid@^4.31.4` (MIT)
  - `@revolist/revogrid@^4.31.4` (MIT)

El objetivo es dotar a la **Matriz de Sistematización y Árbol de Relatoría de Mesas** de una vista de cuadrícula de alto rendimiento tipo hoja de cálculo (Excel / Google Sheets), permitiendo a los relatores y técnicos de formulación editar celdas en sitio, pegar rangos desde portapapeles (`Ctrl+C` / `Ctrl+V`), redimensionar columnas y navegar con teclado.

---

## 2. Requerimientos Técnicos y Salvaguardas Obligatorias

1. **Carga Dinámica SSR (Next.js 15+ / React 19):**
   - RevoGrid se basa en Web Components (`<revo-grid>`). En Next.js App Router debe cargarse mediante `next/dynamic` con `{ ssr: false }` para evitar excepciones en SSR (`customElements is not defined` / `window is not defined`).
   - Crear un subcomponente cliente aislado (por ejemplo `src/features/mesas/components/matriz-revogrid-relatoria.tsx` o wrapper en `@/shared/ui/revogrid-base.tsx`).

2. **Cumplimiento Estricto del Sistema de Diseño (`scripts/ui-policy.mjs`):**
   - No usar clases arbitrarias fijas de Tailwind ni elementos HTML nativos restringidos como `<label>` (usar siempre `@/shared/ui/label`).
   - Aplicar la paleta semántica de POLIS mapeando variables CSS de RevoGrid (`--rv-border`, `--rv-header-bg`, etc.) a los tokens `var(--bg-...)`, `var(--text-...)`, `var(--border-...)` para garantizar contraste idéntico en tema claro y oscuro.
   - Ejecutar `bun run ui:check` y asegurar **0 incumplimientos**.

3. **Funcionalidad en la Matriz de Relatoría:**
   - Incorporar un selector de vista claro en `MatrizArbolRelatoria`:
     - `[ Vista Estructurada ]` (vista actual con acordeones y tarjetas)
     - `[ Cuadrícula RevoGrid ]` (matriz virtualizada editable)
   - En la cuadrícula RevoGrid, reflejar los nodos del árbol (Causas, Efectos, Medios, Fines, Problema Central, Objetivo Central) con columnas:
     - `Tipo de Nodo` (Causa / Efecto / Medio / Fin)
     - `Nivel` (Directa / Indirecta / Fines últimos)
     - `Descripción / Contenido del Aporte` (Editable inline)
     - `Dimensión ONU` (7 Dimensiones)
     - `Entidad Responsable`
     - `Submesa / Colectivo de Origen`
   - Los cambios editados en las celdas de RevoGrid deben propagarse a `onActualizarProblemas` y `onActualizarSoluciones`.
   - Si `readOnly` es `true`, la cuadrícula debe operar en modo estricto de solo lectura.

4. **Reglas de Entorno:**
   - **NO** tocar la base de datos `bd_csh` (congelada en migración 0096).
   - **NO** ejecutar `git commit` ni `git push`.
   - Verificar con `bun test src/features/mesas`, `bun run ui:check` y `bun run typecheck`.

---

## 3. Entregable Esperado

1. Código implementado y probado en `src/features/mesas/components/matriz-arbol-relatoria.tsx` y su componente RevoGrid.
2. Informe de entrega en `bridge/318_entrega_agy2_revogrid_matriz_arbol_relatoria.md` con evidencia de pruebas unitarias y `bun run check`.
