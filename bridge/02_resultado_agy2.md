# INFORME TÉCNICO DE IMPLEMENTACIÓN — TAREA [HERO-PAGES-03]
## PLAN MAESTRO DE HEROS TERRITORIALES PÚBLICOS
### COMPONENTE HERO PAGE BANNER PARA SUBPÁGINAS PÚBLICAS
#### ALTURAS COMPACTAS (h-56 A h-64) Y ULTRACOMPACTAS (h-40 A h-48), FOTOGRAFÍA TEMÁTICA DIFERENCIADA Y REGLA DEL PLIEGUE

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Lunes, 12 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[HERO-PAGES-03]`)  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md` (Fase 3: Tareas 3.1 y 3.2)  
**Severidad Atendida:** MEDIA-ALTA / ARQUITECTURA VISUAL, COHERENCIA DE MARCA Y ACCESIBILIDAD  
**Estado de la Entrega:** 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Trabajo Realizado

En cumplimiento estricto de la orden técnica **[HERO-PAGES-03]**, se diseñó, implementó y desplegó el componente universal `HeroPageBanner` en las tres subpáginas públicas prioritarias del sistema: **Geovisor Territorial (`geovisor-view.tsx`)**, **Modo Barrio (`barrio-view.tsx`)** y **Dimensiones de Seguridad Humana (`dimensiones-view.tsx`)**.

La arquitectura respeta plenamente los principios cívicos y técnicos rectores:
1. **Fotografía Temática Diferenciada:** Cada subpágina proyecta su hito territorial oficial y su procedencia geográfica real (`ubicacionReal`), resolviendo su imagen WebP optimizada desde el catálogo centralizado `HERO_PAGES_CONFIG`.
2. **Regla del Pliegue (*Above the Fold*):** Alturas estrictamente acotadas (`compact` `min-h-[14rem] sm:min-h-[16rem]` y `ultracompact` `min-h-[10rem] sm:min-h-[12rem]`), impidiendo que los mapas interactivos de OpenLayers, los selectores de barrio o los tableros analíticos queden desplazados hacia abajo.
3. **Blindaje de Accesibilidad y Contraste WCAG 2.1 AA:** Triple viñeta semántica multicapa (`from-[var(--surface-0)]/90 via-[var(--surface-0)]/70 to-transparent`) que garantiza legibilidad cristalina del texto institucional sobre la fotografía al 60% de opacidad.
4. **Plataforma Administrativa Intacta:** La suite administrativa (`/plataforma/*`) se mantiene 100% sobria sin interferencias visuales.

---

## 🛠️ 2. Detalle de Archivos y Arquitectura

### 2.1 Componente Universal `src/features/politicas/components/hero-page-banner.tsx`
- **Props de Configuración:** `pageKey`, `tituloOverride`, `subtituloOverride`, `badgeOverride`, `alturaOverride`, `children` y `className`.
- **Resolución Canónica:** Consulta automática de metadatos vía `obtenerHeroPageConfig(pageKey)`.
- **Integración con Store de Usuario:** Consume `useHeroConfigStore` para respetar la calibración de opacidad y el modo minimalista oficial (`heroImageId = "ninguna"`).
- **Insignia Territorial en Vivo:** Etiqueta translúcida superior con ícono `MapPin` y texto de procedencia territorial real (ej. *"Distrito de Cartagena de Indias — Cobertura Total"*, *"Sector El Pozón — Localidad 2"*, *"Claustro de la Merced — Centro Histórico"*).
- **Semántica Accesible:** Elemento `<header role="banner" aria-label={...}>` con jerarquía tipográfica institucional H1.
- **Slot de Extensibilidad (`children`):** Permite inyectar de forma fluida barras de métricas distritales, selectores y filtros.
- **100% Tokens de Diseño POLIS:** Cero colores Tailwind literales, cero controles nativos no autorizados (`scripts/ui-policy.mjs`).

### 2.2 Integración en Vistas Públicas Clave

#### A. Geovisor Territorial (`src/features/geovisor/views/geovisor-view.tsx`)
- Integración de `<HeroPageBanner pageKey="geovisor" ... />` en reemplazo del antiguo `PageHeader` estático.
- Altura automática **ultracompacta** (`min-h-[10rem] sm:min-h-[12rem]`), garantizando que la barra de control de variables, los selectores de ámbito y el mapa coroplético OpenLayers permanezcan inmediatamente interactivos por encima del pliegue.

#### B. Modo Barrio Popular (`src/features/barrio/components/barrio-view.tsx`)
- Integración mobile-first de `<HeroPageBanner pageKey="barrio" />` situado estratégicamente antes de `<BarrioSelector />`.
- Contextualiza la asamblea barrial con la fotografía comunitaria de El Pozón (`/images/hero/hero-dialogo-comunitario.webp`).

#### C. Dimensiones de Seguridad Humana (`src/features/politicas/views/dimensiones-view.tsx`)
- Integración de `<HeroPageBanner pageKey="fases" ... />` envolviendo el bloque de métricas clave distritales (7 Dimensiones ONU, 27 Dependencias, Avance PDD y Fecha de Auditoría) mediante su slot `children`.
- Preserva la procedencia territorial del Claustro de la Merced y elimina dependencias e íconos obsoletos.

### 2.3 Suite Unitaria Automatizada `src/features/politicas/components/hero-page-banner.test.tsx`
- 7 pruebas exhaustivas verificando:
  1. Semántica accesible `role="banner"` y atributo `aria-label`.
  2. Renderizado de datos canónicos para las 4 páginas públicas (`barrio`, `geovisor`, `fases`, `rendicion`).
  3. Aplicación de alturas diferenciadas (`compact` vs `ultracompact`).
  4. Sobrescritura de altura con `alturaOverride`.
  5. Sobrescritura de título, subtítulo y badge con props específicas conservando la ubicación real.
  6. Inyección fluida de componentes y elementos hijos vía `children`.
  7. Respeto de la calibración de opacidad del store y del modo minimalista oficial (`heroImageId = "ninguna"`).

---

## 🧪 3. Evidencia de Verificación y Quality Gates

| Verificación | Comando / Prueba | Resultado |
|---|---|---|
| **Suite Componente HeroPageBanner** | `bun test src/features/politicas/components/hero-page-banner.test.tsx` | **7/7 PASADAS** (100% verde, 230ms) |
| **Suite Completa Políticas** | `bun test src/features/politicas/` | **43/43 PASADAS** (100% verde) |
| **UI Architectural Linter** | `bun run ui:check` | **0 infracciones** |
| **TypeCheck & Linter** | `bun run check` | **0 errores TypeScript, 0 warnings ESLint** |
| **Suite Completa Frontend** | `bun test` | **446/446 PASADAS** (2062 expect() calls en 46 archivos) |
| **Inviolabilidad Censo `bd_csh`** | Consulta directa en PostgreSQL 18 | **33 mesas, 36 agendas, 11 fichas, 17 actores** (100% intactos) |

---

## 🔒 4. Salvaguardas y Compromisos

1. **Inviolabilidad censal de `bd_csh`:** Se comprobó directamente en PostgreSQL 18 que las 33 mesas de diálogo territorial, 36 agendas comunitarias, 11 fichas técnicas de indicadores y 17 actores estratégicos se mantienen 100% matemáticamente intactos.
2. **Protocolo Zero-Push:** Todos los cambios permanecen estrictamente confinados en el repositorio local en la rama `main`.
3. **Blindaje de la Regla del Pliegue:** Ninguna interfaz operativa pública fue empujada por debajo de la línea visual inicial.
