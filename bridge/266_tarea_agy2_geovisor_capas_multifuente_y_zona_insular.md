# Encargo 266: Proyección Cartográfica de Capas Multifuente y Corrección de Georreferenciación de Zona Insular

**Fecha:** 29 de octubre de 2026  
**Origen:** Solicitud del usuario administrador general  
**Asignado a:** AGY2 (`=agy2:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulos afectados:** `src/features/geovisor/`, `backend/app/modules/geodatos/`  
**Entregable esperado:** `bridge/266_entrega_agy2_geovisor_capas_multifuente_y_zona_insular.md`

---

## 1. Hallazgos Reportados por el Usuario

> "asignale a agy2 la opcio de que los datos de las capas multifuente se pinten en el mapa. porque en la acutalidad no se pintan en el mapa... si no tiene nivel desagregado que se pinte toda la ciudada - perimetro urbano y rural-, por otra parte hay datos de hurtos qu dcien: hurtos en zona insular y se pinta en bocagrande... y bocagrande es perimetro urbano continental no insular."

---

## 2. Diagnóstico Técnico

### A. Capas Multifuente no se Pintan en el Mapa
1. En [`src/features/geovisor/components/geovisor-multifuente-panel.tsx`](file:///root/polis/src/features/geovisor/components/geovisor-multifuente-panel.tsx), el usuario puede explorar y filtrar más de 2.400 indicadores del banco de fuentes (DANE, Medicina Legal, Policía, DNP, etc.), pero las tarjetas son meramente informativas. **No existe botón ni acción de "Pintar en mapa"**, ni conexión con el motor de OpenLayers (`mapa-cartagena.tsx` / `use-mapa.ts`).
2. Tampoco existe un estado en [`geovisor-layout-store.ts`](file:///root/polis/src/features/geovisor/state/geovisor-layout-store.ts) para almacenar el `indicadorMultifuenteActivo` y sincronizarlo con el lienzo cartográfico.
3. El mapa carece de una capa vectorial dinámica (`capaMultifuente`) capaz de renderizar los datos tanto a nivel desagregado (localidades, UCGs, barrios) como a nivel global distrital (perímetro urbano + zona rural e insular completos).

### B. Georreferenciación Errónea de "Zona Insular" en Bocagrande
1. En [`src/features/geovisor/data/estadisticas.data.ts:120`](file:///root/polis/src/features/geovisor/data/estadisticas.data.ts#L120), el registro `rural-insular` ("Zona Corregimental e Insular") tiene asignadas las coordenadas:
   ```ts
   lon: -75.52,
   lat: 10.4,
   ```
   **Este punto geográfico se ubica en el casco continental de Cartagena (entre Bocagrande, Castillogrande y Manga).**
2. Como consecuencia, en [`src/features/geovisor/hooks/use-mapa.ts`](file:///root/polis/src/features/geovisor/hooks/use-mapa.ts) la función `crearCapaPuntosAlertas` proyecta el punto de `rural-insular` (con sus alertas y 420 hurtos reportados) en plena península de Bocagrande.
3. Además, en [`src/features/geovisor/components/geovisor-bi-sidebar.tsx:90`](file:///root/polis/src/features/geovisor/components/geovisor-bi-sidebar.tsx#L90), `targetLocId` mapea de forma anómala `rural-insular` a `loc-1` (Localidad 1, donde radica Bocagrande), reforzando la confusión territorial.

---

## 3. Plan de Acción y Tareas Requeridas para AGY2

### Tarea 1: Corrección Territorial de la Zona Insular (Hurtos y Puntos)
1. **Corregir Coordenadas en `estadisticas.data.ts`:**
   - En [`src/features/geovisor/data/estadisticas.data.ts`](file:///root/polis/src/features/geovisor/data/estadisticas.data.ts), reubicar el centroide/coordenadas de `rural-insular` a la verdadera zona insular de Cartagena:
     - Coordenada insular representativa: `lon: -75.640, lat: 10.220` (sector insular Barú / Tierra Bomba / Rosario).
     - **Bajo ninguna circunstancia debe apuntar a `[-75.52, 10.4]` ni a las inmediaciones de Bocagrande (`-75.555, 10.400`).**
2. **Desacoplar `rural-insular` de `loc-1`:**
   - En [`src/features/geovisor/components/geovisor-bi-sidebar.tsx`](file:///root/polis/src/features/geovisor/components/geovisor-bi-sidebar.tsx), eliminar la sustitución forzada `territorioActivo.id === "rural-insular" ? "loc-1" : ...`. La zona rural e insular debe conservar su propia identidad territorial y zoom centrado en las islas y corregimientos.
3. **Validación en Capas de Hurtos (`use-mapa.ts`):**
   - Asegurar que la etiqueta y el centroide de visualización de `CARTAGENA_RURAL` (id: 2) se ubiquen en el territorio rural e insular y no sobre el perímetro urbano de Bocagrande.

### Tarea 2: Habilitación de "Pintar en Mapa" para Capas Multifuente
1. **Estado en el Store de Geovisor:**
   - En [`src/features/geovisor/state/geovisor-layout-store.ts`](file:///root/polis/src/features/geovisor/state/geovisor-layout-store.ts), añadir el estado y mutador:
     - `indicadorMultifuenteActivo: IndicadorMultifuente | null`
     - `setIndicadorMultifuenteActivo: (indicador: IndicadorMultifuente | null) => void`
2. **Interfaz en `GeovisorMultifuentePanel` (`geovisor-multifuente-panel.tsx`):**
   - Agregar en cada tarjeta de indicador un botón accesible y visible:
     - **"Pintar en mapa"** (con icono de mapa / capa).
     - Si el indicador ya está pintado, mostrar estado activo: **"Pintado en mapa"** o botón para "Quitar del mapa".
3. **Capa Vectorial en OpenLayers (`use-mapa.ts` y `mapa-cartagena.tsx`):**
   - Implementar la capa reactiva `capaMultifuente` en el mapa OpenLayers.
   - **Regla de visualización por nivel de agregación:**
     - **A. Con nivel desagregado territorial (ej. `LOC-1`, `LOC-2`, `LOC-3`, UCG o barrios):**
       Pintar el polígono de cada territorio reportado con su respectivo valor y rampa de color (según escala de valor o nivel de riesgo: rojo para ALTO, naranja para MEDIO, verde/azul para BAJO).
     - **B. Sin nivel desagregado (nivel distrito/consolidado `DISTRITO-CTG`, `todos` o general):**
       *Conforme a la instrucción textual del usuario:*
       > **"si no tiene nivel desagregado que se pinte toda la ciudad - perimetro urbano y rural-"**
       Pintar la totalidad del polígono de Cartagena de Indias (tanto el perímetro urbano como la zona rural e insular) con el color semántico del indicador y su nivel de riesgo.
4. **Hover Info / Tooltip Flotante y Control de Desactivación:**
   - Al posar el puntero sobre la geometría pintada, el tooltip debe detallar:
     - Nombre del indicador
     - Entidad fuente oficial (DANE, Policía, DNP, etc.)
     - Año de corte y valor con su unidad de medida
     - Nivel de riesgo
     - Ámbito territorial
   - En los controles del mapa (`MapaCartagena`), incluir un badge/chip flotante visible:
     `[🎨 Capa activa: <nombre_indicador>] [✕ Desactivar]` para que el usuario pueda retirar la capa con un solo clic.

### Tarea 3: Verificación, Pruebas y Despliegue
1. `bun run check`: Comprobar 0 errores en TypeScript, ESLint y UI-policy.
2. `bun test src/features/geovisor/`: Todas las pruebas unitarias deben pasar al 100%.
3. `bun run build`: Compilación limpia de producción de Next.js.
4. Reinicio de servicios en producción (`polis-frontend.service`, `polis-backend.service`).
5. Comprobación en vivo en `https://seguridadhumanaintegral.org/geovisor` y `/plataforma/geovisor`.
6. Generar el informe de entrega en `bridge/266_entrega_agy2_geovisor_capas_multifuente_y_zona_insular.md`.
