# INFORME TÉCNICO DE IMPLEMENTACIÓN — TAREA [HERO-PAGES-01]
## PLAN MAESTRO DE HEROS TERRITORIALES PÚBLICOS
### CATÁLOGO TEMÁTICO CENTRALIZADO Y MOTOR DE ESTADO EXTENDIDO

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Lunes, 12 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[HERO-PAGES-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md` (Fase 1: Tarea 1.1)  
**Severidad Atendida:** MEDIA-ALTA / EXPERIENCIA DE USUARIO, IDENTIDAD TERRITORIAL Y ACCESIBILIDAD  
**Estado de la Entrega:** 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Trabajo Realizado

En cumplimiento estricto de la orden técnica **[HERO-PAGES-01]**, se implementaron la capa de datos canónicos y el motor de estado para el sistema de Heros territoriales de los espacios públicos de POLIS:

### 1.1 Catálogo Temático Centralizado (`src/features/politicas/data/hero-pages.data.ts`)
- **Interfaz `HeroPageConfig` Tipada Estrictamente:**
  * `id: string`
  * `titulo: string`
  * `subtitulo: string`
  * `enfoque: string`
  * `imagenFondo: string`
  * `ubicacionReal: string` (con precisión de hitos geográficos de Cartagena)
  * `altura: "fullscreen" | "compact" | "ultracompact"`
  * `badgeTexto: string`
  * `accionPrimaria?: { label: string; href?: string; onClickAction?: string }`
- **5 Diapositivas Territoriales para el Carrusel de la Portada Principal (`HERO_HOME_SLIDES`):**
  1. `asamblea-claustro`: *Cabildo Abierto y Foro Ciudadano* — Claustro de la Merced — Centro Histórico.
  2. `dialogo-comunitario`: *Diálogo Social y Escucha Barrial* — Sector El Pozón — Localidad 2.
  3. `enfoque-diferencial`: *Enfoque Diferencial, Género y Juventud* — Casa de Justicia Chiquinquirá — Localidad 2.
  4. `marco-logico`: *Metodología y Proyectos Comunitarios* — Centro Comunitario Nelson Mandela — Localidad 3.
  5. `mesa-deliberativa`: *Mesa de Concertación y Transparencia* — Palacio de la Proclamación — Plaza de Bolívar.
- **Configuración por Página Pública (`HERO_PAGES_CONFIG`):**
  * `home`: Portada principal inmersiva con carrusel (altura `fullscreen`).
  * `barrio`: Modo Barrio Popular y Participativo (altura `compact`, El Pozón).
  * `geovisor`: Geovisor Cartográfico y Cobertura Territorial (altura `ultracompact`, retícula SIG).
  * `fases`: Diagnóstico y Formulación Participativa (altura `compact`, Claustro de la Merced).
  * `rendicion`: Veeduría y Control Social Ciudadano (altura `compact`, Palacio de la Proclamación).
- **Funciones de Acceso y Resiliencia:** `obtenerHeroPageConfig(key)`, `obtenerHeroConfig(key)`, `obtenerHeroHomeSlides()`, `obtenerHeroSlide(idOrIndex)`.

### 1.2 Extensión del Store de Estado (`src/features/politicas/state/hero-store.ts`)
- **Rango de Opacidad Ampliado:**
  * Límite inferior: `10%` (`HERO_MIN_OPACIDAD`).
  * Límite superior: `85%` (`HERO_MAX_OPACIDAD`).
  * Valor por defecto oficial: **`60%`** (`HERO_DEFAULT_OPACIDAD`).
  * Función de calibración: `Math.max(10, Math.min(85, Math.round(opacidad)))`.
- **Motor de Estado del Carrusel:**
  * `modoCarrusel: boolean` (default: `true`).
  * `intervaloSegundos: number` (default: `7`).
  * `pausado: boolean` (default: `false`).
  * `indiceActivo: number` (default: `0`).
- **Acciones Implementadas:**
  * `siguienteImagen()`: rotación cíclica sobre las 5 fotografías territoriales (excluyendo automáticamente la opción minimalista `"ninguna"`).
  * `anteriorImagen()`: retroceso cíclico con cálculo módulo positivo.
  * `irAImagen(id)`: salto determinista con sincronización de `indiceActivo`.
  * `togglePausa()`: alternancia instantánea entre pausa y reproducción activa.
  * `setModoCarrusel(activo)`: activación o desactivación de rotación automática.
  * `resetearHeroConfig()`: restauración canónica de todos los parámetros.
  * `storageFallback`: protección contra fallos en entornos SSR y tests de Node/Bun.

### 1.3 Calibración en Interfaz de Administración (`src/features/plataforma/views/configuracion-view.tsx`)
- Presets actualizados a: `25% (Sutil)`, `45% (Equilibrado)`, `60% (Recomendado)`, `75% (Vibrante)`.

---

## 🧪 2. Evidencia de Verificación y Quality Gates

| Verificación | Comando / Prueba | Resultado |
|---|---|---|
| **Suite Unitaria Hero Store & Catálogo** | `bun test src/features/politicas/state/hero-store.test.ts` | **16/16 PASADAS** (100% verde, 110ms) |
| **Suite Completa Políticas** | `bun test src/features/politicas/` | **27/27 PASADAS** (100% verde) |
| **UI Architectural Linter** | `bun run ui:check` | **0 infracciones** |
| **TypeCheck & Linter** | `bun run check` | **0 errores TypeScript, 0 warnings ESLint** |
| **Suite Completa Frontend** | `bun test` | **430/430 PASADAS** (1972 expect() calls en 44 archivos) |
| **Inviolabilidad Censo `bd_csh`** | Consulta directa en PostgreSQL 18 | **33 mesas, 36 agendas, 11 fichas, 17 actores** (100% intactos) |

---

## 🔒 3. Salvaguardas y Compromisos

1. **Inviolabilidad censal de `bd_csh`:** Se confirmó por consulta pericial en PostgreSQL 18 que las 33 mesas de diálogo territorial, 36 agendas comunitarias, 11 fichas técnicas de indicadores y 17 actores estratégicos están 100% intactos.
2. **Protocolo Zero-Push:** Ningún cambio empujado a repositorios remotos; commits estrictamente locales en la rama `main`.
3. **WCAG 2.1 AA:** La ampliación de opacidad al 60% por defecto junto con la viñeta y gradientes de protección lumínica preservan la legibilidad estricta de los textos institucionales.
