# TAREA GEOVISOR ESTADÍSTICO COMPLETO — agy2
**Asignada por**: EAF  
**Fecha**: 2026-10-01T19:53Z  
**Prioridad**: MÁXIMA

---

## Objetivo
Construir un **mapa estadístico completo** estilo Power BI / Google Data Studio sobre
el territorio de Cartagena de Indias. El geovisor debe ser la herramienta de análisis
territorial de la Política de Seguridad Humana Integral.

**PRIMER PASO OBLIGATORIO — Fix bug OKLCH (desbloqueo):**
OpenLayers no puede parsear colores OKLCH de Tailwind. En `mapa-cartagena.tsx` y
`use-mapa.ts`, elimina cualquier `getComputedStyle` / `resolverTokenColor` / `colorToken`
para capas OL. Usa estas constantes hex directamente:
```ts
const COLORES_MAPA = {
  loc1: '#e85d04', loc2: '#f48c06', loc3: '#dc2f02',
  corregimiento: '#6d6875', barrio: '#3a86ff',
  hover: '#023e8a', stroke: '#ffffff', strokeHover: '#1a1a2e',
  heatHigh: '#d62828', heatMid: '#f77f00', heatLow: '#fcbf49',
} as const;
```
Los tokens CSS (`--ember`, etc.) siguen para el UI React. Solo en capas OL usas hex.

---

## Arquitectura Completa del Mapa Estadístico

### LAYOUT GENERAL (estilo Power BI / Data Studio)
```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: Título + Filtros globales + Exportar                  │
├──────────┬─────────────────────────────────┬───────────────────┤
│ SIDEBAR  │                                 │ PANEL ANALÍTICO   │
│ IZQUIERDA│     MAPA COROPLÉTICO            │ DERECHO           │
│          │     (OpenLayers + OSM)          │                   │
│ Capas    │                                 │ KPIs              │
│ Variables│  Tooltips flotantes             │ Gráfico barras    │
│ Filtros  │  Clic → selecciona territorio   │ Gráfico tendencia │
│          │  Leyenda dinámica en mapa       │ Ranking territorios│
├──────────┴─────────────────────────────────┴───────────────────┤
│  BARRA INFERIOR: KPI chips globales (4 métricas clave)         │
└────────────────────────────────────────────────────────────────┘
```

---

## T1 — Mapa Coroplético (Choropleth Map)

El mapa debe colorear **cada territorio** según la variable estadística seleccionada.
Escala de color: de `heatLow` (valor bajo) a `heatHigh` (valor alto).

### Variables estadísticas disponibles (selector en sidebar):

```ts
export type VariableMapa =
  | 'ish'           // Índice de Seguridad Humana (0–100)
  | 'participacion' // Aportes ciudadanos por territorio
  | 'alertas'       // Alertas SAT/CIPRAT activas
  | 'homicidios'    // Tasa homicidios por 100k hab (2025)
  | 'hurtos'        // Hurtos a personas (abs, 2025)
  | 'poblacion'     // Población estimada
  | 'mesas'         // Mesas comunitarias realizadas
  | 'escnna';       // Alertas ESCNNA activas
```

### Colorización dinámica:
- Calcular `min` y `max` del array de valores para la variable seleccionada
- Interpolar color con escala 5 pasos: `heatLow → heatMid → heatHigh`
- Función auxiliar:
```ts
function interpolarColor(valor: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (valor - min) / (max - min);
  // 5 pasos: verde → amarillo → naranja → rojo
  const pasos = ['#2d6a4f','#fcbf49','#f77f00','#e63946','#d62828'];
  const idx = Math.min(Math.floor(t * (pasos.length - 1)), pasos.length - 2);
  return pasos[idx];
}
```

### GeoJSON de los territorios:
Crear `src/features/geovisor/data/territorios.geojson.ts` con polígonos aproximados
de las 3 localidades y la zona corregimental. Usar coordenadas WGS84 (lon/lat).
Cartagena bounding box aproximado: lon [-75.65, -75.40], lat [10.25, 10.55].

Polígonos simplificados (suficientes para visualización):
```ts
export const GEOJSON_TERRITORIOS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'loc-1', nombre: 'Localidad 1 — Histórica y del Caribe Norte' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.573, 10.389], [-75.545, 10.389], [-75.513, 10.407],
          [-75.490, 10.440], [-75.500, 10.460], [-75.530, 10.455],
          [-75.560, 10.440], [-75.580, 10.415], [-75.573, 10.389]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'loc-2', nombre: 'Localidad 2 — De la Virgen y Turística' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.490, 10.440], [-75.460, 10.440], [-75.430, 10.455],
          [-75.420, 10.485], [-75.435, 10.510], [-75.470, 10.510],
          [-75.500, 10.490], [-75.510, 10.465], [-75.490, 10.440]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'loc-3', nombre: 'Localidad 3 — Industrial y de la Bahía' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.573, 10.389], [-75.560, 10.340], [-75.540, 10.300],
          [-75.510, 10.280], [-75.480, 10.295], [-75.465, 10.330],
          [-75.475, 10.370], [-75.500, 10.390], [-75.530, 10.395],
          [-75.573, 10.389]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'rural-insular', nombre: 'Zona Corregimental e Insular' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[-75.575, 10.473], [-75.558, 10.468], [-75.548, 10.483],
            [-75.558, 10.495], [-75.575, 10.490], [-75.575, 10.473]]],
          [[[-75.600, 10.330], [-75.585, 10.320], [-75.572, 10.335],
            [-75.580, 10.350], [-75.600, 10.345], [-75.600, 10.330]]]
        ]
      }
    }
  ]
};
```

### Capa de marcadores de alertas:
Pines circulares en ubicaciones de corregimientos e islas con color según nivel de alerta.
Usar `ol/layer/Vector` + `ol/source/Vector` + `ol/geom/Point`.

---

## T2 — Tooltip flotante sobre el mapa

Al hacer hover sobre un territorio, mostrar un tooltip flotante (NO panel lateral)
con mini-estadísticas rápidas:
```
┌──────────────────────────────────────┐
│  📍 Localidad 1 — Histórica          │
│  ISH: 62/100  ████████░░ Moderado   │
│  Aportes: 3.210  •  Alertas: 8      │
│  Homicidios (2025): 142              │
│  Clic para detalle →                 │
└──────────────────────────────────────┘
```

Implementar con un `div` flotante posicionado con `ol/MapBrowserEvent` pixel coords.
NO usar `openPanel` en hover — solo en clic.

---

## T3 — Panel Analítico Derecho (sidebar BI)

Componente `GeovisorBiSidebar` con estas secciones:

### 3.1 KPIs del territorio seleccionado
4 cards con métricas clave del territorio activo:
- ISH (Índice Seg. Humana) con barra de color semántico (<50 rojo, 50-69 amber, ≥70 verde)
- Total aportes ciudadanos
- Alertas activas  
- Participación en mesas

### 3.2 Gráfico de barras: Comparativa territorial
Barras horizontales con CSS puro (no Chart.js ni D3 — usar divs con `width: X%`):
- Mostrar los 4 territorios ordenados por la variable activa
- El territorio seleccionado resaltado con color `--ember`
- Etiquetas de valor al final de cada barra

```tsx
// Ejemplo de barra CSS pura
<div className="flex items-center gap-2">
  <span className="w-32 text-xs truncate">{terr.nombre}</span>
  <div className="flex-1 rounded-full bg-[var(--surface-2)] h-2">
    <div
      className="h-2 rounded-full bg-[var(--ember)] transition-all"
      style={{ width: `${(valor / max) * 100}%` }}
    />
  </div>
  <span className="text-xs tabular w-12 text-right">{valor}</span>
</div>
```

### 3.3 Gráfico de línea: Tendencia temporal (sparkline)
Mini gráfico SVG inline de evolución mensual de aportes (6 meses):
```tsx
function Sparkline({ datos }: { datos: number[] }) {
  const max = Math.max(...datos);
  const w = 120, h = 32, pad = 2;
  const pts = datos.map((v, i) => {
    const x = pad + (i / (datos.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--ember)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
```

### 3.4 Ranking de barrios (top 5 del territorio activo)
Lista de los 5 barrios con mayor/menor valor de la variable activa.
Usar `BARRIOS_CARTAGENA` de `@/features/geovisor/data/barrios.data.ts`.
Cada barrio muestra: nombre, estrato, UCG y valor estimado.

---

## T4 — Barra Superior de KPIs Globales

Componente `GeovisorKpiBar` — 4 chips con métricas del Distrito completo:

| KPI | Valor | Icono |
|---|---|---|
| Ciudadanos Participando | 8.420 | `Users` |
| Aportes Radicados | suma total | `MessageSquare` |
| Alertas SAT Activas | suma alertas | `AlertTriangle` |
| ISH Promedio Distrital | promedio ponderado | `ShieldCheck` |

Filtro de territorio: `Select` con opciones Todas / Localidad 1 / Localidad 2 / Localidad 3 / Corregimental
Selector de variable temática: `Select` con los 8 tipos de `VariableMapa`

---

## T5 — Controles de Capas (sidebar izquierdo)

Componente `GeovisorControles` con toggles para:
- ☑ Localidades (polígonos rellenos)
- ☑ Corregimientos e Islas (polígonos con patrón diferente)
- ☑ Barrios (bordes finos, sin relleno — activar con zoom ≥ 13)
- ☑ Puntos de Alerta (marcadores circulares)
- ☑ Etiquetas de territorio (texto superpuesto en el mapa)

Leyenda dinámica: muestra la escala de colores de la variable activa con 5 pasos
de valor `min → max` y el nombre de la variable.

---

## T6 — Datos Estadísticos Completos

Ampliar `src/features/geovisor/data/estadisticas.data.ts` con todos los datos:

```ts
export interface EstadisticasTerritorio {
  id: string;
  nombre: string;
  tipo: 'localidad' | 'corregimiento' | 'isla';
  lon: number; lat: number;
  // Demografía
  poblacion: number;
  // Seguridad Humana
  ish: number;           // Índice 0-100
  homicidios: number;    // tasa por 100k hab 2025
  hurtos: number;        // absoluto 2025
  escnna: number;        // alertas activas
  alertas: number;       // SAT/CIPRAT activas
  // Participación
  aportesCiudadanos: number;
  mesasRealizadas: number;
  // Tendencia (últimos 6 meses: may-oct 2026)
  tendenciaAportes: number[];  // [mayo, jun, jul, ago, sep, oct]
  tendenciaAlertas: number[];
}

export const ESTADISTICAS_TERRITORIOS: EstadisticasTerritorio[] = [
  {
    id: 'loc-1', nombre: 'Localidad 1 — Histórica y del Caribe Norte',
    tipo: 'localidad', lon: -75.5506, lat: 10.4236,
    poblacion: 331000, ish: 62,
    homicidios: 42.9, hurtos: 2800, escnna: 12, alertas: 8,
    aportesCiudadanos: 3210, mesasRealizadas: 12,
    tendenciaAportes: [380, 520, 610, 580, 690, 430],
    tendenciaAlertas: [10, 9, 8, 9, 8, 8],
  },
  {
    id: 'loc-2', nombre: 'Localidad 2 — De la Virgen y Turística',
    tipo: 'localidad', lon: -75.4850, lat: 10.4480,
    poblacion: 448000, ish: 54,
    homicidios: 39.7, hurtos: 2400, escnna: 9, alertas: 14,
    aportesCiudadanos: 2890, mesasRealizadas: 10,
    tendenciaAportes: [290, 380, 450, 510, 570, 690],
    tendenciaAlertas: [16, 15, 14, 13, 14, 14],
  },
  {
    id: 'loc-3', nombre: 'Localidad 3 — Industrial y de la Bahía',
    tipo: 'localidad', lon: -75.5200, lat: 10.3250,
    poblacion: 278000, ish: 58,
    homicidios: 32.4, hurtos: 1293, escnna: 5, alertas: 6,
    aportesCiudadanos: 2320, mesasRealizadas: 8,
    tendenciaAportes: [210, 290, 360, 410, 480, 570],
    tendenciaAlertas: [7, 7, 6, 6, 6, 6],
  },
  {
    id: 'rural-insular', nombre: 'Zona Corregimental e Insular',
    tipo: 'corregimiento', lon: -75.5200, lat: 10.4000,
    poblacion: 50000, ish: 48,
    homicidios: 20.0, hurtos: 420, escnna: 8, alertas: 9,
    aportesCiudadanos: 1210, mesasRealizadas: 10,
    tendenciaAportes: [80, 110, 130, 160, 190, 540],
    tendenciaAlertas: [10, 10, 9, 9, 9, 9],
  },
  // Corregimientos individuales
  { id: 'cor-boquilla', nombre: 'La Boquilla', tipo: 'corregimiento',
    lon: -75.4672, lat: 10.4783, poblacion: 18500, ish: 49,
    homicidios: 16.2, hurtos: 180, escnna: 3, alertas: 5,
    aportesCiudadanos: 410, mesasRealizadas: 3,
    tendenciaAportes: [40, 55, 70, 80, 90, 75], tendenciaAlertas: [6, 5, 5, 5, 5, 5] },
  { id: 'cor-tierrabomba', nombre: 'Tierrabomba', tipo: 'isla',
    lon: -75.5600, lat: 10.3400, poblacion: 6200, ish: 45,
    homicidios: 16.1, hurtos: 45, escnna: 2, alertas: 3,
    aportesCiudadanos: 180, mesasRealizadas: 2,
    tendenciaAportes: [15, 20, 25, 30, 35, 55], tendenciaAlertas: [3, 3, 3, 3, 3, 3] },
  { id: 'cor-baru', nombre: 'Barú', tipo: 'isla',
    lon: -75.5900, lat: 10.2300, poblacion: 3800, ish: 43,
    homicidios: 13.2, hurtos: 28, escnna: 2, alertas: 2,
    aportesCiudadanos: 120, mesasRealizadas: 2,
    tendenciaAportes: [10, 14, 18, 22, 28, 28], tendenciaAlertas: [2, 2, 2, 2, 2, 2] },
  { id: 'cor-pasacaballos', nombre: 'Pasacaballos', tipo: 'corregimiento',
    lon: -75.5050, lat: 10.2800, poblacion: 12000, ish: 51,
    homicidios: 25.0, hurtos: 90, escnna: 1, alertas: 4,
    aportesCiudadanos: 290, mesasRealizadas: 3,
    tendenciaAportes: [25, 35, 45, 50, 55, 80], tendenciaAlertas: [4, 4, 4, 4, 4, 4] },
  { id: 'cor-bayunca', nombre: 'Bayunca', tipo: 'corregimiento',
    lon: -75.4200, lat: 10.5200, poblacion: 9500, ish: 56,
    homicidios: 10.5, hurtos: 77, escnna: 0, alertas: 3,
    aportesCiudadanos: 210, mesasRealizadas: 2,
    tendenciaAportes: [18, 24, 30, 36, 42, 60], tendenciaAlertas: [3, 3, 3, 3, 3, 3] },
];

// Etiquetas de variables para UI
export const VARIABLE_META: Record<VariableMapa, { label: string; unidad: string; descripcion: string }> = {
  ish:          { label: 'Índice de Seguridad Humana', unidad: '/100', descripcion: 'Índice compuesto 0-100' },
  participacion:{ label: 'Participación Ciudadana', unidad: 'aportes', descripcion: 'Total aportes radicados' },
  alertas:      { label: 'Alertas SAT/CIPRAT', unidad: 'alertas', descripcion: 'Alertas tempranas activas' },
  homicidios:   { label: 'Tasa de Homicidios', unidad: 'x 100k', descripcion: 'Por 100.000 hab. 2025' },
  hurtos:       { label: 'Hurtos a Personas', unidad: 'casos', descripcion: 'Casos absolutos 2025' },
  poblacion:    { label: 'Población', unidad: 'hab.', descripcion: 'Estimado DANE 2025' },
  mesas:        { label: 'Mesas Comunitarias', unidad: 'mesas', descripcion: 'Mesas realizadas 2026' },
  escnna:       { label: 'Alertas ESCNNA', unidad: 'alertas', descripcion: 'Explotación sexual comercial NNA' },
};
```

---

## T7 — Exportación y Accesibilidad

### Exportar PNG del mapa:
Botón "Exportar PNG" que use la API de canvas de OpenLayers:
```ts
map.once('rendercomplete', () => {
  const canvas = document.querySelector('.ol-viewport canvas') as HTMLCanvasElement;
  const link = document.createElement('a');
  link.download = `geovisor-cartagena-${new Date().toISOString().slice(0,10)}.png`;
  link.href = canvas.toDataURL();
  link.click();
});
map.renderSync();
```

### Accesibilidad del mapa:
- `role="application"` en el contenedor del mapa
- `aria-label="Mapa interactivo de Cartagena de Indias"`
- Lista de territorios accesible por teclado (Tab + Enter selecciona territorio)
- Mismos datos del mapa disponibles en tabla `<caption>` oculta para screen readers

---

## T8 — Aseguramiento de Calidad y Despliegue

```bash
cd /root/polis

# 1. Fix OKLCH primero (desbloqueo crítico)
# Aplicar COLORES_MAPA con hex en mapa-cartagena.tsx y use-mapa.ts

# 2. Verificar
bun run check

# 3. Build
bun run build

# 4. Reiniciar
sudo systemctl restart polis-frontend.service
sudo systemctl is-active polis-frontend.service
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/

# 5. Commit
git add -A && git commit -m "feat(geovisor): mapa estadístico completo estilo Power BI / Data Studio

- Fix bug OKLCH: colores hex COLORES_MAPA para capas OpenLayers
- Choropleth map: colorización dinámica por 8 variables estadísticas
- Tooltip flotante con mini-stats en hover (sin abrir panel)
- GeovisorBiSidebar: KPIs, barras comparativas CSS, sparkline SVG, ranking barrios
- GeovisorKpiBar: 4 KPIs globales + selector territorio + selector variable
- GeovisorControles: toggles de capas + leyenda dinámica
- estadisticas.data.ts: 9 territorios con datos completos + tendencias 6 meses
- territorios.geojson.ts: polígonos WGS84 de 3 Localidades + Zona Corregimental
- Exportar PNG del mapa
- Accesibilidad: role=application, aria-label, tabla oculta, nav teclado"
```

## Entrega
Al terminar escribe en `/root/polis/bridge/02_entrega_geovisor.md`:
- Estado T1–T8
- Variables temáticas disponibles
- Salida bun run check / build
- Hash commit
