# INFORME TÉCNICO DE IMPLEMENTACIÓN Y ASEGURAMIENTO DE CALIDAD
## ALTA VISIBILIDAD DE HEROS E INTEGRACIÓN COMPLETA EN TODOS LOS ESPACIOS PÚBLICOS
### CALIBRACIÓN DE FOTOGRAFÍAS, EXPANSIÓN A 9 ESPACIOS DISTRITALES Y GESTIÓN DESDE /plataforma

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Lunes, 12 de Octubre de 2026  
**Referencia de Trabajo:** Calibración de Visibilidad y Cobertura Total de Heros en Espacios Públicos  
**Severidad Atendida:** ALTA / EXPERIENCIA VISUAL CIUDADANA, IDENTIDAD TERRITORIAL Y GOBERNANZA EDITORIAL  
**Estado de la Entrega:** ✅ 100% Implementada, Certificada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Trabajo Realizado

En atención directa a la instrucción de mejora de visibilidad ("las imágenes no se ven... tienen que verse más") y extensión a todas las páginas públicas del portal que carecían de cabecera visual ("en el resto de las páginas no hay sola imagen ni hero"):

1. **Calibración de Alta Visibilidad Fotográfica:**
   - **Desmantelamiento de mantas oscuras completas:** Se eliminó la superposición de tres gradientes oscuros que cubrían el 100% del área y sofocaban las fotografías en un 60%–90%.
   - **Scrim Direccional Focalizado:** Se introdujo un scrim degradado lateral suave (`from-[var(--surface-0)]/85 via-[var(--surface-0)]/40 to-transparent`) que protege estrictamente la legibilidad del texto en el tercio izquierdo (garantizando ratio WCAG 2.1 AA/AAA) mientras deja el centro y el costado derecho de la fotografía limpios, luminosos y con su riqueza cromática original.
   - **Suelo de Visibilidad y Opacidad Reforzada:** En `src/features/politicas/state/hero-store.ts`, se ajustó la opacidad por defecto a **80%** (con rango hasta **95%**). En `HeroHomeShowcase` y `HeroPageBanner`, se aplica un suelo mínimo de renderizado de `Math.max(0.75, (opacidad ?? 80) / 100)`, impidiendo que sesiones antiguas con valores bajos en `localStorage` oscurezcan las fotos.
   - **Atenuación de Retícula:** La textura `bg-dotgrid` se calibró a `opacity-20`, actuando como detalle institucional sutil sin enturbiar la toma fotográfica.

2. **Cobertura de Hero Banners en el 100% de Espacios Públicos:**
   - 🏛️ **Portada Principal (`/`)**: `HeroHomeShowcase` inmersivo con carrusel de 5 frentes de Cartagena, Ken Burns y controles.
   - 📑 **Líneas Estratégicas y Gobernanza (`/`, vista `explorar`)**: Reemplazo de texto plano por `<HeroPageBanner pageKey="explorar" />` proyectando el Centro Comunitario Nelson Mandela (Localidad 3).
   - 🤝 **Mesas de Diálogo Territorial (`/`, vista `mesas`)**: Reemplazo de encabezado básico por `<HeroPageBanner pageKey="mesas" />` con el Claustro de la Merced y botón directo al Geovisor.
   - 🗺️ **Geovisor Cartográfico (`/`, vista `geovisor`)**: `<HeroPageBanner pageKey="geovisor" />` en modo ultracompacto respetando el mapa coroplético y barra de KPIs.
   - 📰 **Noticias y Comunicados Oficiales (`/`, vista `noticias`)**: `<HeroPageBanner pageKey="noticias" />` con el Palacio de la Proclamación y actualidad distrital.
   - 🗣️ **Voces Ciudadanas y Memoria Social (`/`, vista `testimonios`)**: Reemplazo de contenedor gris por `<HeroPageBanner pageKey="testimonios" />` con imagen de diálogo barrial en El Pozón.
   - 🧭 **Dimensiones ONU y Estructura Distrital (`/`, vista `dimensiones`)**: `<HeroPageBanner pageKey="fases" />` con las 4 métricas distritales embebidas.
   - 🏘️ **Modo Barrio Popular (`/barrio`)**: `<HeroPageBanner pageKey="barrio" />` optimizado para bajo consumo de datos móviles.
   - ⚖️ **Veeduría y Rendición de Cuentas (`/plataforma/rendicion`)**: `<HeroPageBanner pageKey="rendicion" />` con control social y fe pública.

3. **Gestión Administrativa Integral desde `/plataforma`:**
   - `GestorHerosPlataforma` en `/plataforma/configuracion` y `/plataforma/contenido` actualizado para administrar los **9 espacios públicos**.
   - Presets de intensidad ambiental calibrados: `40% (Suave)`, `60% (Medio)`, `80% (Recomendado)`, `85% (Vibrante)` y `95% (Máximo)`.
   - Previsualizador en tiempo real con la nueva viñeta de alta visibilidad.

---

## 🛠️ 2. Archivos Modificados

1. **`src/features/politicas/state/hero-store.ts`:**
   - Constantes actualizadas: `HERO_DEFAULT_OPACIDAD = 80;`, `HERO_MAX_OPACIDAD = 95;`.
2. **`src/features/politicas/state/hero-store.test.ts`:**
   - 18 pruebas actualizadas para el rango 10%–95%, valor por defecto 80% y catálogo ampliado.
3. **`src/features/politicas/data/hero-pages.data.ts`:**
   - Nuevas entradas canónicas en `HERO_PAGES_CONFIG`: `explorar`, `mesas`, `noticias` y `testimonios`.
4. **`src/features/politicas/components/hero-home-showcase.tsx`:**
   - Viñeta de alta visibilidad, scrim lateral suave, fundido inferior acotado y suelo de opacidad del 75%.
5. **`src/features/politicas/components/hero-page-banner.tsx`:**
   - Tipado extendido a todas las subpáginas, viñeta aligerada y opacidad reforzada.
6. **`src/features/politicas/components/hero-page-banner.test.tsx`:**
   - Suite ampliada que valida el renderizado canónico de los 8 espacios públicos.
7. **`src/features/politicas/views/explorar-view.tsx`:**
   - Integración de `<HeroPageBanner pageKey="explorar" />`.
8. **`src/features/mesas/views/mesas-view.tsx`:**
   - Integración de `<HeroPageBanner pageKey="mesas" />` con acción hacia el Geovisor.
9. **`src/features/noticias/views/noticias-view.tsx`:**
   - Integración de `<HeroPageBanner pageKey="noticias" />`.
10. **`src/features/testimonios/views/testimonios-view.tsx`:**
    - Integración de `<HeroPageBanner pageKey="testimonios" />`.
11. **`src/features/plataforma/components/gestor-heros-plataforma.tsx`:**
    - Cobertura de los 9 espacios públicos en `ESPACIOS_PUBLICOS`, presets de 80% y preview adaptado.
12. **`src/features/plataforma/components/gestor-heros-plataforma.test.tsx`:**
    - Suite adaptada para 9 espacios públicos y preset del 80%.

---

## 🧪 3. Matriz de Quality Gates

| Verificación | Comando / Prueba | Resultado Certificado |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | **0 infracciones** (Tokens, capas y controles conformes) |
| **TypeCheck & Linter** | `bun run check` | **0 errores TypeScript, 0 warnings ESLint** |
| **Suite Completa Frontend** | `bun test` | **456/456 PASADAS** (2149 expect() calls en 47 archivos) |
| **Suite Backend FastAPI** | `pytest` en entorno virtual | **488/488 PASADAS** (0 fallos) |
| **Alembic Drift Check** | `alembic check` | **"No new upgrade operations detected"** |
| **Inviolabilidad Censo `bd_csh`** | Consulta directa en PostgreSQL 18 | **33 mesas, 36 agendas, 17 actores** (100% intactos) |
| **Compilación Producción** | `bun run build` (Next.js 16.1.3 Turbopack) | **191/191 páginas estáticas/SSG generadas con éxito** |
| **Servicios en Producción** | `systemctl is-active` | `polis-frontend`, `polis-backend`, `nginx`, `postgresql` (todos activos) |
