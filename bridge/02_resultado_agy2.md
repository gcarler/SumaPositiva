# INFORME TÉCNICO DE IMPLEMENTACIÓN Y ASEGURAMIENTO DE CALIDAD
## GESTIÓN TOTAL DE IMÁGENES Y HEROS TERRITORIALES DESDE LA PLATAFORMA INTERNA (/plataforma)
### COMPONENTE GESTORHEROSPLATAFORMA, CONTROL DE ESPACIOS PÚBLICOS, CUSTOM URLS Y QUALITY GATES

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Lunes, 12 de Octubre de 2026  
**Referencia de Trabajo:** Orden de Calidad y Gestión de Imágenes desde `/plataforma`  
**Severidad Atendida:** ALTA / GOBERNANZA EDITORIAL, EXPERIENCIA DE ADMINISTRACIÓN Y FE PÚBLICA  
**Estado de la Entrega:** ✅ 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Trabajo Realizado

En respuesta directa al requerimiento de control de calidad y gestión integral de imágenes desde la plataforma administrativa (`/plataforma`), se diseñó, implementó y certificó un sistema integral de administración de imágenes y Heros territoriales para todos los espacios públicos del sistema POLIS:

1. **Gestión Descentralizada por Espacio Público:**
   - 🏛️ **Portada Principal (`/`)**: Gestión de imagen activa, carrusel automático, intervalo de rotación (3s, 5s, 7s oficial, 10s, 15s) y botón Play/Pausa.
   - 🏘️ **Modo Barrio Popular (`/barrio`)**: Selección de imagen para el banner compacto barrial.
   - 🗺️ **Geovisor Cartográfico (`/geovisor`)**: Selección de imagen para el banner ultracompacto SIG distrital.
   - 📑 **Diagnóstico y Fases (`/fases`)**: Selección de imagen para el encabezado metodológico.
   - ⚖️ **Veeduría y Rendición (`/plataforma/rendicion`)**: Selección de imagen para la cabecera cívica.

2. **Asignación Flexible y Personalizada:**
   - Selección con 1 clic entre las 5 fotografías territoriales de alta resolución documentadas en Cartagena + Fondo minimalista oficial (retícula).
   - Soporte para **asignación de URL o ruta personalizada** (ej. `/images/...` o `https://...`) por página.
   - Botón individual de restauración a la imagen oficial del catálogo por espacio.
   - Botón global de restablecimiento a valores de fábrica.

3. **Previsualizador Interactivo en Tiempo Real:**
   - Live preview en miniatura que simula con precisión de píxel la imagen seleccionada, la opacidad real, el gradiente de contraste WCAG 2.1 AA y los badges territoriales.
   - Botón con enlace directo para previsualizar la vista pública en vivo.

4. **Calibración Global de Intensidad Ambiental:**
   - Botones preset (25%, 45%, 60% recomendado, 75%, 85% máximo).
   - Certificación de contraste tipográfico seguro WCAG 2.1 AA respaldado por la viñeta adaptativa.

5. **Accesos y Navegación Interna:**
   - Sección principal integrada en [`/plataforma/configuracion`](file:///root/polis/src/features/plataforma/views/configuracion-view.tsx).
   - Acceso directo desde [`/plataforma/contenido`](file:///root/polis/src/features/plataforma/views/contenido-view.tsx) con el botón "Gestionar Heros e Imágenes".

---

## 🛠️ 2. Detalle de Archivos Modificados y Creados

1. **`src/features/politicas/state/hero-store.ts`:**
   - Se extendió el estado con `pageImages: Record<string, string>`.
   - Se implementaron las acciones `setPageImage(pageKey, imageSrcOrId)`, `resetPageImage(pageKey)` y `resetAllPageImages()`.
   - Se exportó el helper `resolverImagenHero(idOrSrc)` para traducir IDs del catálogo a rutas WebP o respetar URLs externas.

2. **`src/features/politicas/components/hero-page-banner.tsx`:**
   - Se conectó la resolución de imagen con el estado `pageImages` del store, permitiendo que cualquier cambio realizado en `/plataforma` se refleje inmediatamente en el banner de la subpágina correspondiente.

3. **`src/features/plataforma/components/gestor-heros-plataforma.tsx`:**
   - Componente modular de administración con selector de 5 espacios públicos, catálogo de fotos, formulario de URL personalizada, controles de carrusel, calibrador de opacidad y live preview.
   - 100% conforme con las reglas del kit UI de POLIS (`scripts/ui-policy.mjs`).

4. **`src/features/plataforma/views/configuracion-view.tsx`:**
   - Reemplazo del bloque anterior por `<GestorHerosPlataforma editar={editar} />`.
   - Limpieza de variables y dependencias obsoletas.

5. **`src/features/plataforma/views/contenido-view.tsx`:**
   - Botón de acceso directo hacia `/plataforma/configuracion#heros`.

6. **Suites de Pruebas Unitarias:**
   - `src/features/plataforma/components/gestor-heros-plataforma.test.tsx` (7 pruebas 100% verdes).
   - `src/features/politicas/state/hero-store.test.ts` (18 pruebas 100% verdes).
   - `src/features/politicas/components/hero-page-banner.test.tsx` (8 pruebas 100% verdes).

---

## 🧪 3. Evidencia de Quality Gates

| Verificación | Comando / Prueba | Resultado |
|---|---|---|
| **UI Architectural Linter** | `bun run ui:check` | **0 infracciones** (Tokens, capas y controles conformes) |
| **TypeCheck & Linter** | `bun run check` | **0 errores TypeScript, 0 warnings ESLint** |
| **Suite Completa Frontend** | `bun test` | **456/456 PASADAS** (2113 expect() calls en 47 archivos) |
| **Suite Backend FastAPI** | `pytest` en entorno virtual | **488/488 PASADAS** (0 fallos) |
| **Alembic Drift Check** | `alembic check` | **"No new upgrade operations detected"** |
| **Inviolabilidad Censo `bd_csh`** | Consulta directa en PostgreSQL 18 | **33 mesas, 36 agendas, 11 fichas, 17 actores** (100% intactos) |
| **Servicios en Producción** | `systemctl is-active` | `polis-frontend`, `polis-backend`, `nginx`, `postgresql` (todos activos) |

---

## 🔒 4. Salvaguardas

1. **Protocolo Zero-Push:** Todos los commits permanecen estrictamente confinados en el repositorio local en la rama `main`.
2. **Inviolabilidad Censal:** Integridad matemática total de la base de datos oficial `bd_csh`.
3. **Control de Acceso:** Los controles de modificación en `/plataforma` respetan el modelo de permisos del usuario (`editar: boolean`).
