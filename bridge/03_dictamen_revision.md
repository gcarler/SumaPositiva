# DICTAMEN PERICIAL DE AUDITORÍA FORENSE — TAREA [HERO-PAGES-02]
## SISTEMA DE HEROS PÚBLICOS: COMPONENTE HERO HOME SHOWCASE (FULLSCREEN INMERSIVO)

**Auditor / Coordinador General:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Desarrollador / EDD:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Dictamen:** Lunes, 12 de Octubre de 2026  
**Commit Evaluado:** `5491830f1a2b28f34ceff98025fee1c902d12a2f`  
**Referencia:** `bridge/01_tarea_activa.md` / `bridge/02_resultado_agy2.md`  
**Plan Maestro:** `bridge/00_plan_maestro_heros_territoriales_publicos.md` (Fase 2: Tareas 2.1 y 2.2)  
**Veredicto Oficial:** **APROBADO AL 100% SIN RESERVAS (CERTIFICACIÓN DE CALIDAD E INTEGRIDAD CONCLUIDA)**

---

## 🔬 1. Evaluación de Hallazgos y Cumplimiento Técnico

### 1.1 Componente `HeroHomeShowcase.tsx`
- **Carrusel Automático de 7 Segundos:** Implementado con intervalo cinemático constante y detección de interacción del usuario (`onMouseEnter`, `onFocusCapture`), el cual suspende temporalmente el carrusel para no interrumpir la lectura ciudadana.
- **Efecto Ken Burns y Crossfade:** Transiciones suaves de opacidad (700ms) y escalado cinemático suave (factor 1.05 en 7s). Integra respeto riguroso a `prefers-reduced-motion` mediante `useReducedMotion()`.
- **Viñeta Adaptativa Multicapa (WCAG 2.1 AA):** Doble gradiente radial y lineal que protege el texto garantizando un contraste superior a 4.5:1 sobre cualquier imagen fotográfica con la opacidad al 60% por defecto.
- **Controles de Navegación Manuales (Inspiración Showcase):**
  * Flechas de avance/retroceso con estilo glassmorphism y etiquetas ARIA explícitas.
  * Contador numérico tabular de diapositiva (`01 / 05` a `05 / 05`).
  * Insignia territorial con ubicación geográfica real (`ubicacionReal`, ej. *"Claustro de la Merced — Centro Histórico"*).
  * Botón Play/Pausa accesible con conmutación dinámica de etiqueta ARIA.
  * Barra de 5 pills temáticas que permiten la selección manual directa de cualquiera de las 5 líneas de la política pública.

### 1.2 Integración en `inicio-view.tsx`
- Reemplazo limpio y modular del hero estático anterior, preservando todas las métricas distritales y botones de acción ciudadana (`onAporteClick`, `onGeovisorClick`, `onRendicionClick`).
- Erradicación completa de dependencias obsoletas.

### 1.3 Suite Unitaria `hero-home-showcase.test.tsx`
- 9 pruebas automatizadas exhaustivas que verifican el renderizado inicial, accesibilidad ARIA, navegación por flechas, navegación por pills, botón de pausa, personalización de métricas, botones de acción y modo minimalista ("ninguna").

---

## 🧪 2. Evidencia Forense Independiente de Quality Gates

| Control de Calidad | Comando Ejecutado | Resultado de la Contra-Auditoría | Estado |
|---|---|---|:---:|
| **Suite HeroHomeShowcase** | `bun test src/features/politicas/components/hero-home-showcase.test.tsx` | 9/9 pasadas (100% verde, 52 aserciones) | ✅ CERTIFICADO |
| **Suite Completa Políticas** | `bun test src/features/politicas/` | 36/36 pasadas (100% verde) | ✅ CERTIFICADO |
| **Linter de Arquitectura UI** | `bun run ui:check` | 0 infracciones arquitectónicas detectadas | ✅ CERTIFICADO |
| **Integridad de Base de Datos `bd_csh`** | Consulta directa en PostgreSQL 18 | `mesas`: 33, `agendas`: 36, `fichas`: 11, `actores`: 17 (100% intactas) | ✅ CERTIFICADO |
| **Protocolo Zero-Push** | `git log -n 1` | Commit local `5491830` en rama `main` sin fugas remotas | ✅ CERTIFICADO |

---

## 🏁 3. Conclusión y Habilitación de la Siguiente Fase

La Tarea **`[HERO-PAGES-02]`** queda formalmente **CONCLUIDA Y APROBADA**. Se autoriza el inicio inmediato de la **Tarea `[HERO-PAGES-03]`**:
*Construcción del componente universal HeroPageBanner.tsx para subpáginas públicas (/barrio, /geovisor, /fases, /rendicion) con alturas compactas (h-56 a h-64), fotografía temática territorial diferenciada, viñeta adaptativa y respeto a la regla del pliegue (above the fold).*
