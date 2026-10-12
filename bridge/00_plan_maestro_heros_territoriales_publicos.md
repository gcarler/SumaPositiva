# 🎨 PLAN MAESTRO DE IDENTIDAD VISUAL: HEROS TERRITORIALES TEMÁTICOS PARA ESPACIOS PÚBLICOS
## POLIS — POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (CARTAGENA DE INDIAS, 2026–2036)

**Versión:** 1.0 — Identidad Cívica y Experiencia de Usuario  
**Fecha de Promulgación:** Lunes, 12 de Octubre de 2026  
**Coordinador General y Auditor Forense EAF:** `agy` (`tmux a -t agy`)  
**Equipo de Desarrollo / EDD:** `agy2` (`tmux a -t agy2`)  
**Estado:** VIGENTE / EN EJECUCIÓN SECUENCIAL  

---

## 🏛️ 1. Justificación y Objetivos Estratégicos

El Hero actual de POLIS cuenta con fotografías documentales reales de las comunidades de Cartagena de Indias, pero adolece de dos limitaciones críticas:
1. **Baja Visibilidad:** La opacidad se encuentra fijada en 18% (y capada al 40%), lo que transforma las imágenes en sombras oscuras y apaga los rostros de la ciudadanía cartagenera.
2. **Ausencia de Dinamismo y Diferenciación:** La portada es estática y las subpáginas públicas carecen de encabezados temáticos con identidad propia.

Este Plan Maestro tiene por objeto dotar a todos los espacios públicos y cívicos de POLIS de un **sistema de Heros fotográficos de alta visibilidad, movimiento cinemático sutil y controles manuales**, estructurados bajo una clara distinción arquitectónica:

1. **Exclusividad para Sitios Públicos:** Los paneles internos administrativos y operativos (`/plataforma/*`) conservan su diseño denso y sobrio (`PageHeader`).
2. **Hero Fullscreen Inmersivo en Portada (`/`):** Carrusel cinemático de los 5 grandes frentes de Cartagena, con contador `01 / 05`, controles de navegación (`<` / `>`), pills interactivas, botón de `Play/Pausa` y viñeta adaptativa que garantiza contraste tipográfico WCAG 2.1 AA.
3. **Heros Compactos Editoriales en Subpáginas Públicas:** Encabezados temáticos con altura optimizada (`h-56` a `h-64` / 220–260px) en **Modo Barrio (`/barrio`)**, **Geovisor Ciudadano**, **Diagnóstico/Fases** y **Rendición de Cuentas**, para no desplazar los formularios ni el contenido operativo.
4. **Sello de Procedencia Territorial:** Identificación del lugar real de cada fotografía (*"Claustro de la Merced"*, *"El Pozón"*, *"Nelson Mandela"*, etc.).

---

## 🗺️ 2. Estructura de Fases y Tareas Atómicas

```
PLAN MAESTRO: HEROS TERRITORIALES TEMÁTICOS (4 Tareas Atómicas)
├── [HERO-PAGES-01] Catálogo Temático Centralizado y Motor de Estado Extendido
│   • Archivos: hero-pages.data.ts, hero-store.ts, hero-store.test.ts
│   • Rango de opacidad ampliado (10% a 85%, default 60%), rotación de 7s, controles siguiente/anterior/irA/togglePausa
│
├── [HERO-PAGES-02] Hero Inmersivo Cinemático con Controles en Home (/)
│   • Archivos: HeroHomeShowcase.tsx, inicio-view.tsx
│   • Carrusel con fundido suave (crossfade), Ken Burns sutil (con prefers-reduced-motion), contador 01/05,
│     flechas glassmorphism, pills con tooltip, botón play/pausa y viñeta adaptativa WCAG AAA
│
├── [HERO-PAGES-03] Hero Compacto Editorial para Subpáginas Públicas
│   • Archivos: HeroPageBanner.tsx, barrio-view.tsx, geovisor-view.tsx, alternativas/seguimiento views
│   • Encabezado temático compacto reutilizable con altura optimizada, breadcrumbs y badge territorial
│
└── [HERO-PAGES-04] Certificación de Calidad, Pruebas y Cierre
    • Quality Gates 100% verdes: bun test, bun run ui:check, bun run check, alembic check
    • Verificación de contraste WCAG 2.1 AA en todas las páginas públicas
```

---

## 📋 3. Detalle de Requerimientos y Criterios de Aceptación

### Tarea 1: `[HERO-PAGES-01]` Catálogo Temático y Motor de Estado Extendido
- Crear `src/features/politicas/data/hero-pages.data.ts` con la definición tipada de los Heros por página (`Home`, `Modo Barrio`, `Geovisor`, `Fases`, `Rendición`).
- En `src/features/politicas/state/hero-store.ts`:
  * Ampliar límite de opacidad de 40% a 85% (default 60%).
  * Implementar estado de rotación: `modoCarrusel: boolean`, `intervaloSegundos: number` (7s), `pausado: boolean`.
  * Acciones: `siguienteImagen()`, `anteriorImagen()`, `irAImagen(id)`, `togglePausa()`.
- Actualizar `src/features/politicas/state/hero-store.test.ts` con cobertura completa.

### Tarea 2: `[HERO-PAGES-02]` Hero Inmersivo Cinemático en Portada (`/`)
- Crear `src/features/politicas/components/hero-home-showcase.tsx`.
- Integrar en `src/features/politicas/views/inicio-view.tsx`.
- Transición suave de diapositivas con `AnimatePresence`.
- Movimiento Ken Burns sutil (`scale: 1` a `1.03` en 7s) blindado por `useReducedMotion()`.
- Controles: flechas laterales de navegación manual, indicador numérico `01 / 05`, pills de selección directa, badge de procedencia territorial y botón de Play/Pausa.
- Viñeta adaptativa con gradiente oscuro sobre la columna izquierda para garantizar ratio de contraste > 4.5:1 (WCAG 2.1 AA).

### Tarea 3: `[HERO-PAGES-03]` Hero Compacto Editorial para Subpáginas Públicas
- Crear `src/features/politicas/components/hero-page-banner.tsx`.
- Integrar en:
  * `/barrio`: Modo Barrio con fotografía de asambleas populares y llamado comunitario directo.
  * `/geovisor`: Geovisor con fondo cartográfico/aéreo y retícula SIG.
  * `/plataforma/rendicion` o modal: Seguimiento con fondo deliberativo.
- Altura acotada (`h-56` a `h-64`) para respetar la regla del pliegue (*above the fold*).

### Tarea 4: `[HERO-PAGES-04]` Quality Gates y Certificación
- Cobertura de pruebas frontend y backend.
- Cero infracciones en `bun run ui:check`.
- Cero errores TypeScript y cero advertencias ESLint en `bun run check`.
- Inviolabilidad censal de `bd_csh` (33 mesas, 36 agendas, 11 fichas, 17 actores).

---

## 🔒 4. Salvaguardas Inviolables
1. **Legibilidad y Contraste WCAG 2.1 AA:** Todo texto institucional debe ser nítido y legible sobre las fotografías.
2. **Accesibilidad para Discapacidad Sensorial:** Respeto estricto a `prefers-reduced-motion` y control de pausa manual.
3. **Aislamiento de la Plataforma Interna:** Los paneles administrativos mantienen su diseño sobrio sin fotos invasivas.
4. **Protocolo Zero-Push:** Commits atómicos locales en la rama `main`.
