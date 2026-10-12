# DICTAMEN PERICIAL DE AUDITORÍA FORENSE — GESTIÓN TOTAL DE IMÁGENES DESDE /plataforma
## SISTEMA DE GESTIÓN EDITORIAL DE HEROS E IMÁGENES TERRITORIALES PARA ESPACIOS PÚBLICOS

**Auditor / Coordinador General:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Desarrollador / EDD:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Dictamen:** Lunes, 12 de Octubre de 2026  
**Commit Evaluado:** `3634740f026f85b09530280a85e7d046ee2d8859`  
**Referencia:** `bridge/02_resultado_agy2.md`  
**Veredicto Oficial:** 🏆 **APROBADO AL 100% — CERTIFICACIÓN INTEGRAL DE GOBERNANZA EDITORIAL Y PRODUCCIÓN**

---

## 🔬 1. Evaluación de Hallazgos y Cumplimiento Técnico

### 1.1 Motor de Estado Reactivo (`src/features/politicas/state/hero-store.ts`)
- **Gestión Descentralizada de Imágenes por Espacio (`pageImages`):** Se introdujo el mapa `pageImages: Record<string, string>` en el store persistente Zustand.
- **Acciones Implementadas:**
  * `setPageImage(pageKey, imageSrcOrId)`: asigna dinámicamente un ID del catálogo o una URL externa/interna a cualquiera de los espacios públicos (`home`, `barrio`, `geovisor`, `fases`, `rendicion`).
  * `resetPageImage(pageKey)`: restaura la imagen por defecto para el espacio seleccionado.
  * `resetAllPageImages()`: restablece la configuración general de fábrica.
  * `resolverImagenHero(idOrSrc)`: función determinista que traduce IDs fotográficos a rutas WebP oficiales o preserva rutas personalizadas.

### 1.2 Conexión en Subpáginas Públicas (`src/features/politicas/components/hero-page-banner.tsx`)
- El componente universal `HeroPageBanner` ahora consulta reactivamente `useHeroConfigStore` con `pageImages[pageKey]`, permitiendo que cualquier cambio o reasignación hecha por los administradores en `/plataforma/configuracion` se proyecte al instante en `/barrio`, `/geovisor`, `/fases` o `/rendicion`.

### 1.3 Módulo Administrativo GestorHerosPlataforma (`src/features/plataforma/components/gestor-heros-plataforma.tsx`)
- **Selector de Espacios Públicos:** Pestañas para Portada Principal (`/`), Modo Barrio (`/barrio`), Geovisor Cartográfico (`/geovisor`), Diagnóstico y Fases (`/fases`) y Veeduría y Rendición (`/plataforma/rendicion`).
- **Selector Visual de Fotografías:** Mosaico con las 5 fotos territoriales de alta resolución + opción minimalista de retícula técnica.
- **Soporte de URL Personalizada:** Campo validado para ingresar rutas `/images/...` o URLs externas seguras.
- **Controles de Carrusel y Opacidad:** Configuración de rotación automática, selección de intervalos (3s, 5s, 7s, 10s, 15s) y calibración de opacidad (25%, 45%, 60%, 75%, 85%).
- **Live Preview en Tiempo Real:** Miniatura interactiva con escala, viñeta y badge geográfico en vivo.
- **Acceso Directo:** Vinculado en `/plataforma/configuracion` y referenciado desde `/plataforma/contenido`.

---

## 🧪 2. Matriz Forense Independiente de Quality Gates

| Control de Calidad | Comando Ejecutado | Criterio Forense | Resultado de la Contra-Auditoría | Estado |
|---|---|---|---|:---:|
| **UI Architectural Linter** | `bun run ui:check` | 0 violaciones arquitectónicas a tokens o HTML controls | **0 infracciones detectadas** | ✅ CERTIFICADO |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint | **0 errores, 0 warnings** (`tsc --noEmit`, `eslint .`) | ✅ CERTIFICADO |
| **Suite Completa Frontend** | `bun test` | 450+ pruebas unitarias y de integración | **456/456 PASADAS** (2113 aserciones en 47 archivos) | ✅ CERTIFICADO |
| **Suite Completa Backend** | `pytest backend/tests` | 480+ pruebas de servicios, seguridad y APIs | **488/488 PASADAS** (100% verde) | ✅ CERTIFICADO |
| **Alembic Drift Check** | `alembic check` | 0 diferencias entre modelos SQLAlchemy y BD | **"No new upgrade operations detected"** | ✅ CERTIFICADO |
| **Inviolabilidad Censo `bd_csh`** | Consulta directa PostgreSQL 18 | 33 mesas, 36 agendas, 11 fichas, 17 actores | **33 mesas, 36 agendas, 11 fichas, 17 actores (100% intactos)** | ✅ CERTIFICADO |
| **Servicios en Producción** | `systemctl is-active` | Daemons en estado active | `polis-frontend`, `polis-backend`, `nginx`, `postgresql` (todos activos) | ✅ CERTIFICADO |
| **Protocolo Zero-Push** | `git log -n 1` | Commits confinados estrictamente en `main` local | **Commit `3634740` verificado** | ✅ CERTIFICADO |

---

## 🏛️ 3. Censo Forense de Fe Pública de la Base de Datos (`bd_csh`)

```
========================================================================================
TABLA                                              CENSO AUDITADO        INTEGRIDAD
========================================================================================
mesas_trabajo.mesas                                      33               100% INTACTO
mesas_trabajo.agendas                                    36               100% INTACTO
indicadores.fichas_tecnicas_indicadores                  11               100% INTACTO
participacion_ciudadana.actores_estrategicos             17               100% INTACTO
========================================================================================
```

---

## 🏆 4. Dictamen Final y Conclusión

La **Gestión Total de Imágenes y Heros Territoriales desde la Plataforma Administrativa** queda formalmente **CERTIFICADA Y APROBADA AL 100%**.

El sistema POLIS dispone ahora de control editorial total descentralizado por espacio público, previsualización en caliente y soporte para imágenes personalizadas, manteniendo la inviolabilidad censal y cero regresiones en producción.
