# TAREA ACTIVA: [HERO-PAGES-01] CATÁLOGO TEMÁTICO CENTRALIZADO Y MOTOR DE ESTADO EXTENDIDO
## SISTEMA DE HEROS PÚBLICOS: OPACIDAD AMPLIADA, CARRUSEL DE 7S Y CONTROLES MANUALES

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 1: Catálogo Temático y Motor de Estado del Hero (Tarea 1.1)  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** MEDIA-ALTA / EXPERIENCIA DE USUARIO, IDENTIDAD TERRITORIAL Y ACCESIBILIDAD  

---

## 🎯 1. Justificación y Alcance de la Tarea

Para permitir que las imágenes del Hero tengan **mucha mayor visibilidad (opacidad al 60% por defecto)**, que **se muevan de manera armónica en carrusel automático** y que el ciudadano o funcionario **pueda cambiarlas manualmente**, es indispensable dotar al frontend del catálogo de datos temáticos y de un store robusto.

### Alcance Técnico:
1. **Creación del Catálogo Temático Centralizado (`src/features/politicas/data/hero-pages.data.ts`):**
   - Definir interfaz `HeroPageConfig`:
     * `id: string`
     * `titulo: string`
     * `subtitulo: string`
     * `enfoque: string`
     * `imagenFondo: string`
     * `ubicacionReal: string` (ej. *"Claustro de la Merced — Centro Histórico"*, *"Sector El Pozón — Localidad 2"*, etc.)
     * `altura: "fullscreen" | "compact" | "ultracompact"`
     * `badgeTexto: string`
     * `accionPrimaria?: { label: string; href?: string; onClickAction?: string }`
   - Registrar la configuración diferenciada para las páginas públicas:
     * `home`: 5 diapositivas territoriales (*Cabildo Masivo*, *Diálogo Barrial*, *Mujeres y Género*, *Proyectos Comunitarios*, *Transparencia*).
     * `barrio`: *Modo Barrio Popular y Participativo* (fotografía barrial en calle, altura compacta).
     * `geovisor`: *Geovisor Cartográfico y Cobertura* (altura ultracompacta).
     * `fases`: *Diagnóstico y Formulación Participativa* (altura compacta).
     * `rendicion`: *Veeduría y Control Social* (altura compacta).

2. **Extensión del Store de Estado (`src/features/politicas/state/hero-store.ts`):**
   - **Rango de Opacidad:** Ampliar el límite superior de 40 a 85 (`Math.max(10, Math.min(85, Math.round(opacidad)))`), con nuevo default en **60%** (`HERO_DEFAULT_OPACIDAD = 60`).
   - **Propiedades de Carrusel:**
     * `modoCarrusel: boolean` (default: `true`).
     * `intervaloSegundos: number` (default: `7`).
     * `pausado: boolean` (default: `false`).
     * `indiceActivo: number` (índice 0 a N-1).
   - **Acciones:**
     * `siguienteImagen()`: Avanza cíclicamente a la siguiente imagen disponible (excluyendo "ninguna").
     * `anteriorImagen()`: Retrocede cíclicamente.
     * `irAImagen(id: string)`: Salta directamente a la imagen con dicho ID.
     * `togglePausa()`: Alterna entre pausado y reproducción activa.
     * `setModoCarrusel(activo: boolean)`: Habilita o deshabilita la rotación.

3. **Pruebas Unitarias Automatizadas:**
   - Actualizar `src/features/politicas/state/hero-store.test.ts` cubriendo:
     * Nuevo rango de opacidad (10% a 85%) y default en 60%.
     * Avance cíclico con `siguienteImagen()` y retroceso con `anteriorImagen()`.
     * Salto directo con `irAImagen()`.
     * Alternancia de pausa con `togglePausa()`.
     * Integridad del catálogo en `hero-pages.data.ts`.

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Suite Hero Store** | `bun test src/features/politicas/state/hero-store.test.ts` | 100% verde |
| **Suite Completa Políticas** | `bun test src/features/politicas/` | 100% verde |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 420+ pasadas |

---

## 📦 3. Entregables y Salvaguardas

1. **Código Implementado:** `src/features/politicas/data/hero-pages.data.ts`, `src/features/politicas/state/hero-store.ts` y pruebas unitarias.
2. **Salvaguardas:**
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas, 17 actores).
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `feat(hero): catalogo tematico y motor de estado del carrusel HERO-PAGES-01`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial.
