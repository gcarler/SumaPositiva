# ENCARGO 286: POLIS UX & Branding — Integración del Logo e Isotipo Oficial en el Footer del Sitio Público y Vistas Públicas

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-03
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Solicitud del usuario:**
  > *"revisando los sitio publico de la plataforma encontré que el footer el logo no ha sido actualizado, debeerias asignarle a algun agente esa tarea"*

---

## 1. Contexto y Diagnóstico

Tras la exitosa integración del logo e isotipo oficial en la cabecera pública (`Topbar`), favicon vectorial y Modo Barrio (Encargo 284), el pie de página institucional del sitio público todavía conserva el ícono genérico desactualizado:

1. **Footer Público ([`src/shared/layout/footer.tsx`](../src/shared/layout/footer.tsx)):**
   - En las líneas 13–25, el bloque de identidad de marca renderiza:
     ```tsx
     <span className="flex size-6 items-center justify-center rounded bg-[var(--text-primary)]">
       <Landmark className="size-3.5 text-[var(--text-inverse)]" strokeWidth={1.5} />
     </span>
     ```
   - Exhibe el ícono `<Landmark>` de Lucide en un contenedor cuadrado, en lugar del **Isotipo P (Ágora Concéntrica)** o la marca institucional unificada de POLIS.
2. **Formulario Público de Aportes ([`src/features/formularios/views/formulario-publico-view.tsx`](../src/features/formularios/views/formulario-publico-view.tsx)):**
   - En las líneas 71–74, la cabecera pública del formulario de aportes ciudadanos contiene:
     ```tsx
     <Landmark aria-hidden="true" className="size-10 sm:size-12 shrink-0 text-ember" />
     ```
   - También debe actualizarse al isotipo oficial POLIS para mantener coherencia visual integral en todas las vistas ciudadanas.

---

## 2. Requerimientos Técnicos

### Requerimiento 1: Actualización del Footer (`src/shared/layout/footer.tsx`)
- Importar `IsotipoPolis` desde `@/shared/branding/logo-polis`.
- Reemplazar el contenedor con `<Landmark>` por el isotipo oficial:
  - Usar un contenedor squircle estilizado coherente con la identidad institucional (`bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-lg p-1` o variante adecuada con dimensiones equilibradas, ej. `size-7` o `size-8`).
  - Renderizar `<IsotipoPolis className="size-full" />`.
  - Asegurar contraste y legibilidad absoluta tanto en **tema claro** como en **tema oscuro**.
  - Si `Landmark` no tiene otros usos en el archivo, retirar su importación de `lucide-react`.

### Requerimiento 2: Coherencia en Formulario Público (`src/features/formularios/views/formulario-publico-view.tsx`)
- Reemplazar el ícono `<Landmark>` en la cabecera del formulario por el isotipo oficial `IsotipoPolis` con su contenedor squircle institucional, armonizado con el título de la iniciativa *«Política Pública de Seguridad Humana Integral — Cartagena 2026–2036»*.

### Requerimiento 3: Verificación de Calidad
- Ejecutar y certificar:
  1. `node scripts/ui-policy.mjs` (0 violaciones de políticas de interfaz y tokens semánticos).
  2. `bun run typecheck` (cero errores de TypeScript).
  3. `bun test` (suite frontend 100% pasando).

---

## 3. Entregables

1. Modificaciones aplicadas en `src/shared/layout/footer.tsx` y `src/features/formularios/views/formulario-publico-view.tsx`.
2. Informe de entrega en [`bridge/286_entrega_agy2_logo_footer.md`](286_entrega_agy2_logo_footer.md).
3. Actualización de [`bridge/01_tarea_activa.md`](01_tarea_activa.md).
4. **Sin commit ni push.** Notificar a la coordinación (`agy:0.0`) al concluir.
