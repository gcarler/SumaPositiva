# DICTAMEN DE AUDITORÍA FORENSE EAF — TAREA [GEO-UX-SCROLL-01]

**Para:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**De:** Coordinador General / Auditor Forense EAF (`agy`)  
**Fecha:** 14 de Octubre de 2026  
**Tarea Auditada:** `[GEO-UX-SCROLL-01] Geovisor UX: Lenguaje Ciudadano Claro, Panel Superior Oculto por Defecto, Mapa +20% y Scroll Vertical Fluido`  
**Commit Auditado:** `1707f67` (`feat(geovisor): lenguaje ciudadano claro panel superior oculto y scroll estadistico [GEO-UX-SCROLL-01]`)  
**Estado del Dictamen:** ✅ **APROBADO AL 100% (DICTAMEN FAVORABLE — CIERRE DEFINITIVO DE TAREA)**  

---

## 🔬 1. Verificación Forense Independiente

Se ejecutó auditoría técnica y funcional independiente sobre el commit `1707f67` y el entorno en vivo (`http://127.0.0.1:3000/geovisor`), comprobando el cumplimiento estricto de todos los criterios de aceptación:

1. **Lenguaje Ciudadano Claro (0% Jerga Técnica Visible al Ciudadano):**
   - En `src/features/geovisor/components/geovisor-top-shelf.tsx`:
     - Erradicadas las etiquetas `Zona GeoJSON:` y `Capa GeoJSON:`, reemplazadas por **`Zona Territorial:`** y **`Datos Estadísticos:`**.
     - Erradicada la jerga `features`, `ID_POLIG 1` e `ID_POLIG 2` en los 4 KPI chips ejecutivos (`Total Casos Reportados`, `Registros Estadísticos SIEDCO`, `Perímetro Urbano`, `Zona Rural e Insular`).
   - En `src/features/geovisor/components/geovisor-controles.tsx`:
     - Encabezado actualizado a **`Capas de Datos Estadísticos (SIEDCO 2018–2026)`** y conteos en `casos · registros`.
     - Botón inferior del sidebar izquierdo reemplazado de `Procesar y Gestionar GeoJSON` a **`Ver Datos Estadísticos y Tablero`** (`data-testid="btn-sidebar-ver-estadisticas"`).
   - En `src/features/geovisor/components/geovisor-workbench-bar.tsx`:
     - Botón de acceso directo actualizado a **`Datos Estadísticos`** (`data-testid="workbench-btn-gestor-geojson"`).
   - En `src/features/geovisor/components/mapa-cartagena.tsx` y `geovisor-hurtos-panel.tsx`:
     - Overlay superior izquierdo renombrado a **`Datos Estadísticos de Seguridad (2018–2026)`**, badge superior derecho a **`Mapa Estadístico Activo`** y pestañas del panel inferior a **`1. Resumen y Gráficos Estadísticos`**, **`2. Explorador y Tabla de Datos (12.280)`** y **`3. Catálogo de Capas e Importador`**.

2. **Panel Superior Oculto por Defecto (`topOpen: false`, `version: 4`) y Mapa +20% Más Grande:**
   - En `src/features/geovisor/state/geovisor-layout-store.ts`:
     - `DEFAULT_DOCK_VISIBILITY` establece `topOpen: false`, `leftOpen: true`, `rightOpen: false`, `bottomOpen: true`.
     - `DEFAULT_DOCK_SIZES` calibrado a `{ top: 16, left: 22, right: 24, bottom: 28 }` con migración automática en `version: 4`.
     - Comprobado en Chromium Headless (`1440x900`): `#dock-panel-top` inicia con `height: 0px`, otorgando al lienzo central (`#dock-panel-center`) `1122.4px × 621.4px` (+20% de área útil) y dejando visible desde la primera vista el panel estadístico inferior (`#dock-panel-bottom`, `height: 241.6px`).
   - El botón explícito `[data-testid="workbench-btn-toggle-top-panel"]` muestra **`Mostrar Panel Superior`** por defecto y al pulsarlo despliega el panel superior (`height: 137.9px`) cambiando su etiqueta a **`Ocultar Panel Superior`**.

3. **Botón Flotante CTA y Scroll Vertical Fluido sobre Datos Estadísticos:**
   - El botón flotante `[data-testid="btn-ver-datos-estadisticos"]` (**`Ver datos estadísticos (18.242 casos) ↓`**) en la parte inferior del mapa abre/expande automáticamente el panel inferior al 60% de la altura útil y desplaza suavemente la vista hacia `#geovisor-datos-estadisticos`.
   - Verificado mediante Playwright que `[data-testid="dock-view-hurtos"]` permite desplazamiento vertical fluido (`scrollHeight: 934px`, `clientHeight: 205px`, `scrollTop: 0 -> 300px`) y cuenta con el botón **`↑ Subir al Mapa / Ver Mapa Completo`** para retornar de inmediato al lienzo cartográfico.

---

## 📊 2. Matriz de Quality Gates Auditados

| Quality Gate | Estado | Resultado Verificado |
| :--- | :---: | :--- |
| **Geovisor Unit Tests (`bun test src/features/geovisor/`)** | ✅ PASS | **75 / 75 tests pasando** (14 archivos de prueba, 357 `expect()`) |
| **Playwright Headless (`/geovisor`)** | ✅ PASS | **0 errores de consola**, `hasCapaGeojson: false`, `hasProcesarGeojson: false`, `topBoxInitial.height: 0`, scroll y CTA verificados |
| **Aislamiento de Commit (`Zero-Push`)** | ✅ PASS | Commit local `1707f67` en `main` circunscrito exclusivamente a `src/features/geovisor/*` y `bridge/02_resultado_agy2.md` |

---

## 🏁 3. Conclusión

Se declara **APROBADA Y CERRADA AL 100%** la tarea **`[GEO-UX-SCROLL-01]`**. Quedas en espera de la siguiente asignación en `bridge/01_tarea_activa.md` correspondiente al **Plan Maestro de los 3 Motores Articulados (Plan de Desarrollo + Plan de Acción Multiformato 2016–2026 + Inversión y Ejecución Presupuestal)**.
