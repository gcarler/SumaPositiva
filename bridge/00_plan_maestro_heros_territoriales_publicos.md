# 🎨 PLAN MAESTRO DE IDENTIDAD VISUAL: HEROS TERRITORIALES TEMÁTICOS PARA ESPACIOS PÚBLICOS
## POLIS — POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (CARTAGENA DE INDIAS, 2026–2036)

**Versión:** 1.0 — Identidad Cívica y Experiencia de Usuario  
**Fecha de Promulgación:** Lunes, 12 de Octubre de 2026  
**Fecha de Cierre y Certificación:** Lunes, 12 de Octubre de 2026  
**Coordinador General y Auditor Forense EAF:** `agy` (`tmux a -t agy`)  
**Equipo de Desarrollo / EDD:** `agy2` (`tmux a -t agy2`)  
**Estado:** ✅ CULMINADO AL 100% Y CERTIFICADO EN PRODUCCIÓN  

---

## 🏛️ 1. Justificación y Objetivos Estratégicos

El Hero actual de POLIS cuenta con fotografías documentales reales de las comunidades de Cartagena de Indias, pero adolecía de dos limitaciones críticas:
1. **Baja Visibilidad:** La opacidad se encontraba fijada en 18% (y capada al 40%), lo que transformaba las imágenes en sombras oscuras y apagaba los rostros de la ciudadanía cartagenera.
2. **Ausencia de Dinamismo y Diferenciación:** La portada era estática y las subpáginas públicas carecían de encabezados temáticos con identidad propia.

Este Plan Maestro dotó a todos los espacios públicos y cívicos de POLIS de un **sistema de Heros fotográficos de alta visibilidad, movimiento cinemático sutil y controles manuales**, estructurados bajo una clara distinción arquitectónica:

1. **Exclusividad para Sitios Públicos:** Los paneles internos administrativos y operativos (`/plataforma/*`) conservan su diseño denso y sobrio (`PageHeader`).
2. **Hero Fullscreen Inmersivo en Portada (`/`):** Carrusel cinemático de los 5 grandes frentes de Cartagena, con contador `01 / 05`, controles de navegación (`<` / `>`), pills interactivas, botón de `Play/Pausa` y viñeta adaptativa que garantiza contraste tipográfico WCAG 2.1 AA.
3. **Heros Compactos Editoriales en Subpáginas Públicas:** Encabezados temáticos con altura optimizada (`compact` `min-h-[14rem]` / `h-56` a `h-64` y `ultracompact` `min-h-[10rem]` / `h-40` a `h-48`) en **Modo Barrio (`/barrio`)**, **Geovisor Ciudadano**, **Diagnóstico/Fases** y **Rendición de Cuentas**, para no desplazar los formularios ni el contenido operativo respetando la regla del pliegue (*above the fold*).
4. **Sello de Procedencia Territorial:** Identificación del lugar real de cada fotografía (*"Claustro de la Merced"*, *"El Pozón"*, *"Nelson Mandela"*, etc.).

---

## 🗺️ 2. Estructura de Fases y Tareas Atómicas (100% CUMPLIDO)

```
PLAN MAESTRO: HEROS TERRITORIALES TEMÁTICOS (4 Tareas Atómicas — 100% Culminadas)
├── [HERO-PAGES-01] ✅ Catálogo Temático Centralizado y Motor de Estado Extendido [APROBADO - Commit 8a06bd5]
│   • Archivos: hero-pages.data.ts, hero-store.ts, hero-store.test.ts
│   • Rango de opacidad ampliado (10% a 85%, default 60%), rotación de 7s, controles siguiente/anterior/irA/togglePausa
│
├── [HERO-PAGES-02] ✅ Hero Inmersivo Cinemático con Controles en Home (/) [APROBADO - Commit 5491830]
│   • Archivos: HeroHomeShowcase.tsx, inicio-view.tsx, hero-home-showcase.test.tsx
│   • Carrusel con fundido suave (crossfade), Ken Burns sutil (con prefers-reduced-motion), contador 01/05,
│     flechas glassmorphism, pills temáticas, botón play/pausa y viñeta adaptativa WCAG AAA
│
├── [HERO-PAGES-03] ✅ Hero Compacto Editorial para Subpáginas Públicas [APROBADO - Commit 5ea8d93]
│   • Archivos: hero-page-banner.tsx, barrio-view.tsx, geovisor-view.tsx, dimensiones-view.tsx, hero-page-banner.test.tsx
│   • Encabezado temático compacto reutilizable con altura optimizada (compact y ultracompact), insignia territorial y slot children
│
└── [HERO-PAGES-04] ✅ Certificación de Calidad, Pruebas y Cierre Global [CULMINADO AL 100%]
    • Quality Gates 100% verdes: bun test (446 tests), pytest (488 tests), bun run ui:check (0 infracciones), bun run check (0 errores), alembic check (0 drift)
    • Inviolabilidad matemática bd_csh: 33 mesas, 36 agendas, 11 fichas, 17 actores intactos
    • Servicios en producción 100% activos: polis-frontend, polis-backend, nginx, postgresql
```

---

## 📋 3. Detalle de Requerimientos y Verificación Final

### Tarea 1: `[HERO-PAGES-01]` Catálogo Temático y Motor de Estado Extendido ✅ (Cerrada)
- Creado `src/features/politicas/data/hero-pages.data.ts` con catálogo tipado completo (`HERO_PAGES_CONFIG`, `HERO_HOME_SLIDES`, helpers de resolución).
- En `src/features/politicas/state/hero-store.ts`:
  * Rango de opacidad ampliado de 10% a 85% (default 60%).
  * Motor de rotación con `modoCarrusel`, `intervaloSegundos` (7s) y `pausado`.
  * Acciones: `siguienteImagen()`, `anteriorImagen()`, `irAImagen(id)`, `togglePausa()`.
- Suite `hero-store.test.ts` con 16 pruebas 100% verdes.

### Tarea 2: `[HERO-PAGES-02]` Hero Inmersivo Cinemático en Portada (`/`) ✅ (Cerrada)
- Creado `src/features/politicas/components/hero-home-showcase.tsx`.
- Integrado en `src/features/politicas/views/inicio-view.tsx`.
- Transición suave de diapositivas con crossfade y efecto Ken Burns respetuoso de `prefers-reduced-motion`.
- Controles completos: flechas laterales de navegación manual, indicador numérico `01 / 05`, pills de selección directa, insignia de procedencia territorial y botón Play/Pausa.
- Viñeta adaptativa con triple gradiente WCAG 2.1 AA / AAA.
- Suite `hero-home-showcase.test.tsx` con 9 pruebas 100% verdes.

### Tarea 3: `[HERO-PAGES-03]` Hero Compacto Editorial para Subpáginas Públicas ✅ (Cerrada)
- Creado `src/features/politicas/components/hero-page-banner.tsx` con soporte de alturas `compact` (`min-h-[14rem] sm:min-h-[16rem]`) y `ultracompact` (`min-h-[10rem] sm:min-h-[12rem]`), viñeta multicapa, insignia territorial e inyección de `children`.
- Integrado en:
  * `geovisor-view.tsx`: Modo ultracompacto respetando el mapa coroplético y barra de KPIs encima del pliegue.
  * `barrio-view.tsx`: Modo compacto con temática comunitaria de El Pozón antes del selector de barrios.
  * `dimensiones-view.tsx`: Modo compacto proyectando el Claustro de la Merced y encapsulando las 4 métricas distritales vía `children`.
- Suite `hero-page-banner.test.tsx` con 7 pruebas 100% verdes.

### Tarea 4: `[HERO-PAGES-04]` Quality Gates y Certificación ✅ (Cerrada)
- Frontend: 446 pruebas unitarias pasadas en 46 archivos (`bun test`).
- Backend FastAPI: 488 pruebas pasadas (`pytest`).
- Linter Arquitectónico UI: 0 infracciones (`bun run ui:check`).
- TypeScript & Linter: 0 errores, 0 advertencias (`bun run check`).
- Migraciones DB: 0 drift (`alembic check`).
- Inviolabilidad censal `bd_csh`: 33 mesas, 36 agendas, 11 fichas, 17 actores (100% intactos en PostgreSQL 18).
- Servicios de producción: `polis-frontend`, `polis-backend`, `nginx`, `postgresql` (todos activos).

---

## 🔒 4. Salvaguardas Inviolables Certificadas
1. **Legibilidad y Contraste WCAG 2.1 AA:** Texto institucional con ratio de contraste superior a 4.5:1 sobre todas las fotografías al 60% de opacidad.
2. **Accesibilidad para Discapacidad Sensorial:** Control manual de pausa y anulación de zoom ante `prefers-reduced-motion`.
3. **Aislamiento de la Plataforma Interna:** Paneles administrativos (`/plataforma/*`) 100% sobrios y sin fotos invasivas.
4. **Protocolo Zero-Push:** Todos los commits confinados en el repositorio local en la rama `main`.
5. **Inviolabilidad CSH:** Integridad física y lógica total de la base de datos oficial distrital.
