# TAREA ACTIVA: [HERO-PAGES-03] COMPONENTE HERO PAGE BANNER (HEROS COMPACTOS PÚBLICOS)
## SUBPÁGINAS PÚBLICAS: ALTURAS COMPACTAS, FOTOGRAFÍA TEMÁTICA DIFERENCIADA Y REGLA DEL PLIEGUE

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 3: Heros Compactos para Subpáginas Públicas (Tareas 3.1 y 3.2)  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** MEDIA-ALTA / ARQUITECTURA VISUAL, COHERENCIA DE MARCA Y ACCESIBILIDAD  

---

## 🎯 1. Justificación y Alcance de la Tarea

Tal como acordamos en el Plan Maestro, **cada página pública debe tener un Hero diferenciado** que refleje su propósito territorial específico, pero **con una altura compacta (`h-56` a `h-64`, o ultracompacta `h-44` a `h-48` en el Geovisor)** para respetar estrictamente la regla del pliegue (*above the fold*) y no desplazar hacia abajo los mapas interactivos, selectores de barrio o formularios de participación.

Asimismo, **la plataforma administrativa interna (`/plataforma/*`) se mantiene 100% sobria sin imágenes invasivas de fondo**.

### Alcance Técnico Detallado:

1. **Creación del Componente Universal `src/features/politicas/components/hero-page-banner.tsx`:**
   - Props aceptadas:
     * `pageKey`: `"barrio" | "geovisor" | "fases" | "rendicion"` (clave canónica del catálogo `HERO_PAGES_CONFIG`).
     * `tituloOverride?: string` (permite sobreescribir el título si la vista lo requiere).
     * `subtituloOverride?: string`.
     * `badgeOverride?: string`.
     * `alturaOverride?: "compact" | "ultracompact"`.
     * `children?: React.ReactNode` (espacio para inyectar selectores, filtros o KPIs si la vista lo requiere).
     * `className?: string`.
   - **Renderizado Visual:**
     * Contenedor con altura acotada:
       - `compact`: `min-h-[14rem] sm:min-h-[16rem]` (`h-56` a `h-64`).
       - `ultracompact`: `min-h-[10rem] sm:min-h-[12rem]` (`h-40` a `h-48`, ideal para el Geovisor).
     * Imagen de fondo temática WebP obtenida de `hero-pages.data.ts` (con opacidad calibrada en sincronía con el store o default al 55-60%).
     * Viñeta semántica multicapa que blinda el contraste WCAG 2.1 AA del texto institucional (`from-[var(--surface-0)]/90 via-[var(--surface-0)]/70 to-transparent`).
     * **Insignia Territorial:** Etiqueta translúcida superior con el hito geográfico real (`ubicacionReal`, ej. *"Sector El Pozón — Localidad 2"* para Barrio, o *"Claustro de la Merced — Centro Histórico"* para Fases).
     * Título institucional nítido y subtítulo explicativo de alto valor cívico.
     * Cero colores o utilidades no autorizadas (100% tokens de diseño de POLIS).

2. **Integración en Vistas Públicas Clave:**
   - **`src/features/geovisor/views/geovisor-view.tsx`:** Integrar `<HeroPageBanner pageKey="geovisor" />` en reemplazo o enriquecimiento del `PageHeader` estático, manteniendo la visibilidad inmediata del lienzo de mapas y controles.
   - **`src/features/barrio/components/barrio-view.tsx`:** Integrar `<HeroPageBanner pageKey="barrio" />` de forma ligera y optimizada mobile-first antes del selector de barrios de Cartagena.
   - **`src/features/politicas/views/dimensiones-view.tsx`:** Integrar `<HeroPageBanner pageKey="fases" />` en la cabecera institucional preservando los indicadores clave.

3. **Pruebas Automatizadas en `src/features/politicas/components/hero-page-banner.test.tsx`:**
   - Renderizado correcto para cada una de las páginas públicas (`barrio`, `geovisor`, `fases`, `rendicion`).
   - Aplicación de alturas diferenciadas (`compact` vs `ultracompact`).
   - Renderizado de la insignia geográfica de procedencia real.
   - Soporte de sobrescritura de props (`tituloOverride`, etc.) y renderizado de `children`.
   - Cumplimiento de accesibilidad (`role="banner"` o semántica accesible).

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **Suite HeroPageBanner** | `bun test src/features/politicas/components/hero-page-banner.test.tsx` | 100% verde |
| **Suite Completa Políticas** | `bun test src/features/politicas/` | 100% verde |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 440+ pasadas |
| **Inviolabilidad `bd_csh`** | Verificación PostgreSQL 18 | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |

---

## 📦 3. Entregables y Compromisos

1. Componente `src/features/politicas/components/hero-page-banner.tsx`.
2. Integración en `geovisor-view.tsx`, `barrio-view.tsx` y `dimensiones-view.tsx`.
3. Suite unitaria `src/features/politicas/components/hero-page-banner.test.tsx`.
4. Commit atómico local: `feat(hero): componente universal HeroPageBanner para subpaginas publicas HERO-PAGES-03`.
5. Registro en `bridge/02_resultado_agy2.md` y notificación a `agy` en `%0`.
