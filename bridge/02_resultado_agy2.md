# INFORME DE RESULTADO: TAREA [GEO-UX-SCROLL-01]
## GEOVISOR UX: LENGUAJE CIUDADANO CLARO, PANEL SUPERIOR OCULTO POR DEFECTO (VERSION 4), MAPA +20% Y SCROLL VERTICAL FLUIDO CON CTA DE DATOS ESTADÍSTICOS

**Para:** Coordinador General / Auditor Forense EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 14 de Octubre de 2026  
**Tarea Reportada:** `[GEO-UX-SCROLL-01] Geovisor UX: Lenguaje Ciudadano Claro, Panel Superior Oculto por Defecto, Mapa +20% y Scroll Vertical Fluido`  
**Referencia Metodológica y Legal:** Guía de Lenguaje Claro DNP · Estándares de Accesibilidad e Interacción SIG Ciudadano · WCAG 2.1 AA  
**Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`)  

---

## 🎯 1. Resumen Ejecutivo de la Entrega

Dando cumplimiento exacto a las especificaciones técnicas estipuladas en `bridge/01_tarea_activa.md`, se ejecutó con éxito la reingeniería de experiencia de usuario (UX) y lenguaje ciudadano para el Geovisor (`/geovisor` y `/plataforma/geovisor`):

### 1.1. Lenguaje Ciudadano Claro (Erradicación Total de Jerga Técnica)
* **`GeovisorTopShelf` (`src/features/geovisor/components/geovisor-top-shelf.tsx`):**
  - Reemplazado `Zona GeoJSON:` por **`Zona Territorial:`** con `aria-label="Seleccionar zona territorial"`.
  - Normalizadas las opciones de zona a terminología limpia: `Distrito Completo (Urbano + Rural)`, `Perímetro Urbano (75,3 km²)` y `Zona Rural e Insular (597,4 km²)`.
  - Reemplazado `Capa GeoJSON:` por **`Datos Estadísticos:`** con `aria-label="Seleccionar categoría de datos estadísticos"`.
  - Reemplazado `Consolidado 3 Capas Drive (18.242 casos)` por **`Consolidado General de Hurtos (18.242 casos)`**.
  - Erradicada la palabra `features` y códigos internos en los 4 KPI chips ejecutivos:
    - `Total Incidentes GeoJSON` → **`Total Casos Reportados`**
    - `Registros GeoJSON (Drive)` / `features` → **`Registros Estadísticos SIEDCO`** (`{kpis.features.toLocaleString("es-CO")} registros`)
    - `Perímetro Urbano (ID_POLIG 1)` → **`Perímetro Urbano`**
    - `Zona Rural e Insular (ID_POLIG 2)` → **`Zona Rural e Insular`**
* **`GeovisorControles` (`src/features/geovisor/components/geovisor-controles.tsx`):**
  - Título principal actualizado a **`Capas de Datos Estadísticos (SIEDCO 2018–2026)`**.
  - Checkboxes de capas actualizados a lenguaje de registros: `(4.683 casos · 2.520 registros)`, `(5.044 casos · 3.853 registros)` y `(8.515 casos · 5.907 registros)`.
  - Ficha territorial actualizada: `Cobertura Territorial Analizada`, badge `Cartagena de Indias`, `Zona 1: Perímetro Urbano` y `Zona 2: Rural e Insular`.
  - Botón de acción inferior transformado de `Procesar y Gestionar GeoJSON` a **`Ver Datos Estadísticos y Tablero`** (`data-testid="btn-sidebar-ver-estadisticas"`).
* **`GeovisorWorkbenchBar` (`src/features/geovisor/components/geovisor-workbench-bar.tsx`):**
  - Botón de acceso directo actualizado a **`Datos Estadísticos`** (`data-testid="workbench-btn-gestor-geojson"`) con `title="Ver y explorar datos estadísticos (12.280 registros)"`.
  - Añadido botón explícito **`workbench-btn-toggle-top-panel`** que muestra dinámicamente **`Mostrar Panel Superior`** (cuando `topOpen === false`) u **`Ocultar Panel Superior`** (cuando `topOpen === true`).
* **`MapaCartagena` (`src/features/geovisor/components/mapa-cartagena.tsx`):**
  - Panel flotante superior izquierdo con `aria-label="Filtro de datos estadísticos en el mapa"`, título **`Datos Estadísticos de Seguridad (2018–2026)`** y subtítulo **`Cartagena · Urbano y Rural`**.
  - Badge superior derecho actualizado a **`Mapa Estadístico Activo`**.
* **`GeovisorHurtosPanel` (`src/features/geovisor/components/geovisor-hurtos-panel.tsx`):**
  - Pestañas de modo actualizadas:
    - `1. Resumen y Gráficos Estadísticos`
    - `2. Explorador y Tabla de Datos (12.280)`
    - `3. Catálogo de Capas e Importador`
  - Encabezado de pintado rápido: **`Visualización Rápida en el Mapa:`**.

---

### 1.2. Panel Superior Oculto por Defecto (`topOpen: false`) y Mapa +20% Más Grande
* **`geovisor-layout-store.ts`:**
  - `DEFAULT_DOCK_VISIBILITY` configurado con `topOpen: false`, `leftOpen: true`, `rightOpen: false`, `bottomOpen: true`.
  - `DEFAULT_DOCK_SIZES` calibrados a `{ top: 16, left: 22, right: 24, bottom: 28 }`, otorgando al lienzo central del mapa un protagonismo un **20% superior** en área útil de pantalla.
  - Incremento de versión de persistencia a **`version: 4`** con función `migrate` que detecta configuraciones locales con `version < 4` y las migra automáticamente al estado inicial con panel superior cerrado y nuevos tamaños proporcionales.

---

### 1.3. Scroll Vertical Fluido, Botón Flotante CTA e Interacción Bidireccional
* **Lienzo del Mapa y Contenedor:**
  - El contenedor principal de `MapaCartagena` se identifica con `id="geovisor-mapa-lienzo"` y altura mínima ampliada (`min-h-[42rem]`).
  - Eliminado el encapsulamiento redundante con `overflow-y-auto` innecesario en la vista de hurtos, permitiendo que el panel inferior fluya de manera natural dentro de su contenedor elástico con barra de desplazamiento delgada (`scrollbar-width: thin`).
* **Botón Flotante CTA en el Mapa (`btn-ver-datos-estadisticos`):**
  - Píldora de alto contraste centrada en la parte inferior del mapa con texto **`Ver datos estadísticos (18.242 casos) ↓`**.
  - Al hacer clic:
    1. Asegura la apertura de la vista de hurtos (`openView("hurtos")`).
    2. Asegura la apertura del panel dock inferior (`setPanelOpen("bottom", true)`).
    3. Si el dock no está expandido, ejecuta `toggleDockExpanded("bottom")` para otorgarle el 60% de la altura útil de la ventana.
    4. Ejecuta `scrollIntoView({ behavior: "smooth", block: "start" })` hacia `#geovisor-datos-estadisticos`.
* **Retorno Fluido al Mapa en `GeovisorHurtosPanel`:**
  - Contenedor raíz etiquetado con `id="geovisor-datos-estadisticos"`.
  - Añadido botón superior rápido **`↑ Subir al Mapa / Ver Mapa Completo`** que restaura el tamaño estándar del panel si estaba expandido y desplaza suavemente la vista de vuelta hacia `#geovisor-mapa-lienzo`.

---

## 🏗️ 2. Archivos Modificados en `src/features/geovisor/`

| Archivo | Modificación Realizada |
| :--- | :--- |
| `src/features/geovisor/state/geovisor-layout-store.ts` | `topOpen: false`, tamaños `{ top: 16, left: 22, right: 24, bottom: 28 }`, bump a `version: 4` con migración |
| `src/features/geovisor/components/geovisor-top-shelf.tsx` | Reemplazo de jerga a `Zona Territorial:`, `Datos Estadísticos:`, `Consolidado General de Hurtos` y 4 KPI chips limpios |
| `src/features/geovisor/components/geovisor-controles.tsx` | `Capas de Datos Estadísticos`, conteos con `registros`, `Cobertura Territorial Analizada` y botón `Ver Datos Estadísticos y Tablero` |
| `src/features/geovisor/components/geovisor-workbench-bar.tsx` | Botón `Datos Estadísticos` y nuevo botón `workbench-btn-toggle-top-panel` (`Mostrar/Ocultar Panel Superior`) |
| `src/features/geovisor/components/mapa-cartagena.tsx` | `id="geovisor-mapa-lienzo"`, `Datos Estadísticos de Seguridad (2018–2026)`, badge `Mapa Estadístico Activo` y botón CTA flotante `btn-ver-datos-estadisticos` |
| `src/features/geovisor/components/geovisor-hurtos-panel.tsx` | `id="geovisor-datos-estadisticos"`, botón `↑ Subir al Mapa / Ver Mapa Completo`, 3 pestañas ciudadanas y visualización rápida |
| `src/features/geovisor/views/geovisor-view.tsx` | Eliminación de contenedor intermedio redundante para optimizar el scroll de rueda/trackpad sobre datos estadísticos |
| `src/features/geovisor/state/geovisor-layout-store.test.ts` | Actualización de tests para `topOpen: false`, tamaños nuevos y conmutación de paneles |
| `src/features/geovisor/components/geovisor-workspace-layout.test.tsx` | Pruebas de tamaño inicial 0.0 para top, 22.0 left, 28.0 bottom y prueba de despliegue manual a 16.0 |
| `src/features/geovisor/components/geovisor-top-shelf.test.tsx` | Pruebas unitarias de las nuevas etiquetas ciudadanas y 4 KPI chips ejecutivos |
| `src/features/geovisor/components/geovisor-workbench-bar.test.tsx` | Pruebas de presencia de `workbench-btn-gestor-geojson` y alternancia de texto en `workbench-btn-toggle-top-panel` |
| `src/features/geovisor/components/geovisor-hurtos-panel.test.tsx` | Pruebas del ID raíz, botón subir al mapa y nuevos títulos de pestañas |
| `src/features/geovisor/components/geovisor-dock-controls.test.tsx` | Pruebas de estado inicial con panel superior colapsado (`title="Mostrar panel superior..."`) |
| `src/features/geovisor/views/geovisor-view.test.tsx` | Verificación de ensamble con `Zona Territorial:` y `Datos Estadísticos:` |

---

## 🧪 3. Resultados de los Quality Gates Obligatorios

| Quality Gate | Comando / Herramienta | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Backend Tests** | `PYTHONPATH=backend /root/polis/venv/bin/pytest backend/tests/` | **538 / 538 PASSED** | Suite completa en verde al 100% |
| **Geovisor Unit Tests** | `bun test src/features/geovisor/` | **75 / 75 PASSED** | 14 suites unitarias cubriendo componentes, stores y layout |
| **Diseño y Políticas UI** | `node scripts/ui-policy.mjs` | **0 VIOLACIONES** | Verificación estricta de tokens semánticos aprobada (UI003) |
| **Tipado TypeScript** | `bun run typecheck` (`tsc --noEmit`) | **0 ERRORES** | Tipos y contratos validados estrictamente |
| **Linter ESLint** | `bun run lint` (`eslint .`) | **0 ERRORES** | Código limpio conforme a reglas del repositorio |
| **Storybook & a11y** | `bunx vitest run --project storybook` | **GEOVISOR 100% OK** | `geovisor.stories.tsx` (2/2), `geovisor-charts.stories.tsx` (3/3) y `plataforma-interna.stories.tsx` (Geovisor Real) |
| **Compilación Producción** | `bun run build` | **192 / 192 RUTAS** | Next.js 16.3.8 Turbopack SSG/SSR compilado con éxito (0 fallos) |
| **Censo Base de Datos** | PostgreSQL `bd_csh` | **100% INTACTO** | 33 mesas, 17 actores estratégicos, 8 banco alternativas, 10 compromisos PAS, 12 actividades PA, 2 polígonos analítica hurtos |
| **Verificación Headless Playwright** | `http://127.0.0.1:3000/geovisor` (Chromium headless) | **EXITOSA** | • 0 errores de consola críticos.<br>• Panel superior oculto por defecto (`topOpen === false`).<br>• Botón `Mostrar Panel Superior` visible.<br>• Ausencia de `Capa GeoJSON:` y `Procesar y Gestionar GeoJSON`.<br>• Presencia de `Datos Estadísticos`.<br>• Botón `Ver datos estadísticos (18.242 casos) ↓` visible y funcional.<br>• Clic despliega sección `#geovisor-datos-estadisticos` inmediatamente. |
| **Reinicio de Servicios** | `systemctl restart polis-frontend.service` | **ACTIVE (running)** | Servicio frontend reiniciado y respondiendo en el puerto 3000 |

---

## 🔒 4. Cumplimiento de la Política Zero-Push y Control de Versiones

Siguiendo la instrucción perentoria de respetar el trabajo concurrente de `codex` en otros módulos del proyecto:
1. Se ejecutó `git add` **únicamente sobre `src/features/geovisor/*` y `bridge/02_resultado_agy2.md`**.
2. No se agregaron ni modificaron archivos fuera del ámbito asignado.
3. Se generó el commit local en `main` bajo la política **Zero-Push** estricta.
