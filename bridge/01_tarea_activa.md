# TAREA ACTIVA: [HERO-PAGES-02] COMPONENTE HERO HOME SHOWCASE (FULLSCREEN INMERSIVO)
## PORTADA PRINCIPAL PÚBLICA: CARRUSEL CINEMATOGRÁFICO, KEN BURNS, VIÑETA ADAPTATIVA Y CONTROLES

**Fecha:** Lunes, 12 de Octubre de 2026  
**Fase:** FASE 2: Hero Inmersivo de Portada Principal (Tarea 2.1 y 2.2)  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / EXPERIENCIA VISUAL, ACCESIBILIDAD Y ENGAGEMENT CIUDADANO  

---

## 🎯 1. Justificación y Alcance de la Tarea

El usuario ha solicitado de forma expresa que las imágenes del Hero:
1. **"Se vean mucho más"**: Opacidad viva al 60% por defecto (ampliable hasta 85%).
2. **"Que se muevan"**: Carrusel automático (7 segundos) con transición fluida (crossfade) y ligero zoom cinematográfico Ken Burns.
3. **"Que también pueda cambiarlas manualmente"**: Controles de navegación de alta gama (inspirados en la sofisticación de *heliasoils.com*, pero con la dignidad de la política pública de seguridad humana de Cartagena).

### Alcance Técnico Detallado:

1. **Creación de `src/features/politicas/components/hero-home-showcase.tsx`:**
   - Debe consumir las 5 diapositivas territoriales `HERO_HOME_SLIDES` desde `hero-pages.data.ts`.
   - Conectado a `useHeroConfigStore`:
     * `heroImageId`: ID de la diapositiva actual.
     * `opacidad`: Nivel de transparencia de la capa fotográfica (60% default).
     * `modoCarrusel`: Si la rotación está habilitada.
     * `pausado`: Si el ciudadano detuvo la rotación.
     * `siguienteImagen()`, `anteriorImagen()`, `irAImagen(id)`, `togglePausa()`.
   - **Efecto Visual Cinematográfico:**
     * Contenedor de altura completa o inmersiva (`min-h-[82vh]` o `h-[88vh] md:h-[92vh]`).
     * Capa de imagen de fondo WebP con transición crossfade (`transition-opacity duration-700 ease-in-out`).
     * Animación sutil de respiración/Ken Burns (`scale-[1.03] transition-transform duration-[7000ms] ease-out`).
     * **Viñeta Adaptativa Multicapa:** Gradiente radial y lineal oscuro (`from-slate-950/90 via-slate-900/60 to-transparent`) para garantizar que el texto tenga contraste superior a 4.5:1 (WCAG 2.1 AA) sin apagar la vivacidad de la imagen.
   - **Controles de Navegación Manuales (Estilo Showcase):**
     * **Contador Numérico:** Formato `01 / 05`, `02 / 05`, etc., con tipografía tabular y elegante.
     * **Insignia Territorial en Vivo:** Etiqueta translúcida con el hito geográfico real (`ubicacionReal`, ej. *"Claustro de la Merced — Centro Histórico"* o *"Sector El Pozón — Localidad 2"*).
     * **Botones Flecha:** Botones `<` y `>` (anterior / siguiente) con efectos hover sutiles y accesibilidad ARIA (`aria-label="Diapositiva anterior"`, `aria-label="Diapositiva siguiente"`).
     * **Pills / Barra de Diapositivas:** Indicadores interactivos para seleccionar directamente cualquiera de las 5 líneas temáticas (al hacer click, salta a la diapositiva correspondiente).
     * **Botón Play / Pausa:** Control accesible para detener o reanudar el carrusel en cualquier momento (`aria-label="Pausar carrusel"` / `"Reanudar carrusel"`).
     * **Detección de Interacción:** Si el usuario pasa el mouse por encima (hover) o hace foco en los controles, el temporizador se suspende temporalmente para no cambiarle la diapositiva mientras lee.
     * **Soporte `prefers-reduced-motion`:** Si el usuario tiene reducida la animación en su sistema operativo, desactivar el Ken Burns y respetar pausas.

2. **Integración en `src/features/politicas/views/inicio-view.tsx`:**
   - Incorporar `HeroHomeShowcase` en la cabecera del Home público (`/`), asegurando que conviva de manera impecable con el resumen ejecutivo, métricas clave y enlaces de acción ciudadana.

3. **Pruebas Automatizadas en `src/features/politicas/components/hero-home-showcase.test.tsx`:**
   - Renderizado con la diapositiva activa inicial.
   - Presencia de controles: flechas anterior/siguiente, contador `01 / 05`, botón de pausa y badge territorial.
   - Disparo de eventos de clic en anterior, siguiente, salto por pill y toggle de pausa.
   - Cumplimiento de accesibilidad (`aria-label` en controles interactivos).

---

## 🧪 2. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Criterio de Éxito |
|---|---|---|
| **Suite Componente Hero Home** | `bun test src/features/politicas/components/hero-home-showcase.test.tsx` | 100% verde |
| **Suite Políticas Completa** | `bun test src/features/politicas/` | 100% verde |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 430+ pasadas |
| **Inviolabilidad `bd_csh`** | Verificación PostgreSQL 18 | 33 mesas, 36 agendas, 11 fichas, 17 actores intactos |

---

## 📦 3. Entregables y Compromisos

1. Componente `src/features/politicas/components/hero-home-showcase.tsx`.
2. Integración en `src/features/politicas/views/inicio-view.tsx`.
3. Pruebas unitarias en `src/features/politicas/components/hero-home-showcase.test.tsx`.
4. Commit atómico local: `feat(hero): componente inmersivo HeroHomeShowcase con carrusel y controles HERO-PAGES-02`.
5. Registro en `bridge/02_resultado_agy2.md` y notificación a `agy` en `%0`.
