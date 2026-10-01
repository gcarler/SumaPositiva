# TAREA ACTIVA — freebuff (Ingeniero de Infraestructura / Full-Stack)
**Asignada por**: EAF (Antigravity Líder)
**Fecha**: 2026-10-01T18:23Z
**Prioridad**: ALTA — Nuevo frente de trabajo

---

## Objetivo
Implementar el **Geovisor de Seguridad Humana Integral** de Cartagena de Indias:
un mapa interactivo con datos estadísticos territoriales integrado en la plataforma
POLIS, accesible desde la vista `geovisor` del frontend.

El sitio público es `seguridadhumanaintegral.org`. El stack es:
- **Frontend**: Next.js 16.1.3 / React 19 / TypeScript / Bun
- **Backend**: FastAPI (Python) en `127.0.0.1:8000`
- **BD**: PostgreSQL 18.6 (`bd_csh`) con PostGIS disponible si es necesario
- **Regla Zero-Modals**: todo en Drawers laterales, nunca modals centrados
- **Tokens CSS**: `--surface-1`, `--text-primary`, `--ember`, `--border` obligatorios

---

## Decisión de Tecnología de Mapas

Usa **OpenLayers** (paquete `ol`) como librería principal de mapas.
Razones: licencia BSD-2, sin API key requerida, soporte nativo de tiles OSM,
WMS/WFS y GeoJSON, SSR-friendly con dynamic import en Next.js.

Usa **OpenStreetMap** como proveedor de tiles base (sin costo, sin API key):
```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## T1 — Instalar dependencias

```bash
cd /root/polis
bun add ol
bun add -d @types/ol 2>/dev/null || true
```

Verificar que `ol` quedó en `package.json`.

---

## T2 — Crear el componente base del mapa

**Archivo nuevo**: `src/features/geovisor/components/mapa-cartagena.tsx`

```
src/features/geovisor/
├── components/
│   ├── mapa-cartagena.tsx       ← componente principal del mapa
│   └── panel-territorio.tsx     ← panel lateral de estadísticas por territorio
├── data/
│   └── territorios.data.ts      ← datos estáticos de localidades y corregimientos
├── hooks/
│   └── use-mapa.ts              ← hook de inicialización de OpenLayers
└── views/
    └── geovisor-view.tsx        ← vista principal (ya existe, actualizar)
```

### `mapa-cartagena.tsx`
- Importar OpenLayers con `dynamic import` (no SSR):
  ```ts
  // En el componente padre usar:
  const MapaCartagena = dynamic(() => import('./mapa-cartagena'), { ssr: false });
  ```
- El mapa debe centrar en Cartagena de Indias: `[-75.5144, 10.3910]` (lon, lat) —
  zoom inicial 11.
- Tile layer: OpenStreetMap estándar.
- Pintar las **3 Localidades** y la **Zona Corregimental** como capas GeoJSON
  con colores semánticos diferenciados usando `--ember` para hover.
- Al hacer clic en un territorio, emitir un evento/callback `onSelectTerritorio`
  con el id del territorio seleccionado.
- Importar el CSS de OpenLayers en el componente:
  ```ts
  import 'ol/ol.css';
  ```

### `territorios.data.ts`
Definir los territorios con sus coordenadas centrales y metadatos estadísticos:

```ts
export interface Territorio {
  id: string;
  nombre: string;
  tipo: 'localidad' | 'corregimiento' | 'isla';
  lon: number;
  lat: number;
  poblacion: number;
  indicadorSeguridad: number;   // 0-100 (índice compuesto)
  aportesCiudadanos: number;
  mesasRealizadas: number;
  alertasActivas: number;
  descripcion: string;
}

export const TERRITORIOS_CARTAGENA: Territorio[] = [
  {
    id: "loc-1",
    nombre: "Localidad 1 — Histórica y del Caribe Norte",
    tipo: "localidad",
    lon: -75.5506, lat: 10.4236,
    poblacion: 331000,
    indicadorSeguridad: 62,
    aportesCiudadanos: 3210,
    mesasRealizadas: 12,
    alertasActivas: 8,
    descripcion: "Comprende el Centro Histórico, Bocagrande, El Pozón, La Esperanza y sectores turísticos de alta afluencia."
  },
  {
    id: "loc-2",
    nombre: "Localidad 2 — De la Virgen y Turística",
    tipo: "localidad",
    lon: -75.4850, lat: 10.4480,
    poblacion: 448000,
    indicadorSeguridad: 54,
    aportesCiudadanos: 2890,
    mesasRealizadas: 10,
    alertasActivas: 14,
    descripcion: "Incluye La Boquilla, Nelson Mandela, Revivir, La Esperanza y zonas de desarrollo turístico costero."
  },
  {
    id: "loc-3",
    nombre: "Localidad 3 — Industrial y de la Bahía",
    tipo: "localidad",
    lon: -75.5200, lat: 10.3250,
    poblacion: 278000,
    indicadorSeguridad: 58,
    aportesCiudadanos: 2320,
    mesasRealizadas: 8,
    alertasActivas: 6,
    descripcion: "Zona industrial, Mamonal, Pasacaballos, Ceballos y sectores portuarios y petroquímicos."
  },
  {
    id: "cor-boquilla",
    nombre: "La Boquilla",
    tipo: "corregimiento",
    lon: -75.4672, lat: 10.4783,
    poblacion: 18500,
    indicadorSeguridad: 49,
    aportesCiudadanos: 410,
    mesasRealizadas: 3,
    alertasActivas: 5,
    descripcion: "Comunidad afrodescendiente pesquera con fuerte identidad étnica. Ley 70/93 aplicable."
  },
  {
    id: "cor-tierrabomba",
    nombre: "Tierrabomba",
    tipo: "isla",
    lon: -75.5600, lat: 10.3400,
    poblacion: 6200,
    indicadorSeguridad: 45,
    aportesCiudadanos: 180,
    mesasRealizadas: 2,
    alertasActivas: 3,
    descripcion: "Isla habitada con comunidades afrodescendientes y economía pesquera artesanal."
  },
  {
    id: "cor-baru",
    nombre: "Barú",
    tipo: "isla",
    lon: -75.5900, lat: 10.2300,
    poblacion: 3800,
    indicadorSeguridad: 43,
    aportesCiudadanos: 120,
    mesasRealizadas: 2,
    alertasActivas: 2,
    descripcion: "Isla con comunidades afrodescendientes y ecosistemas de manglar y arrecifes de coral."
  },
  {
    id: "cor-pasacaballos",
    nombre: "Pasacaballos",
    tipo: "corregimiento",
    lon: -75.5050, lat: 10.2800,
    poblacion: 12000,
    indicadorSeguridad: 51,
    aportesCiudadanos: 290,
    mesasRealizadas: 3,
    alertasActivas: 4,
    descripcion: "Corregimiento en zona industrial con comunidades vulnerables y exposición a riesgos ambientales."
  },
  {
    id: "cor-bayunca",
    nombre: "Bayunca",
    tipo: "corregimiento",
    lon: -75.4200, lat: 10.5200,
    poblacion: 9500,
    indicadorSeguridad: 56,
    aportesCiudadanos: 210,
    mesasRealizadas: 2,
    alertasActivas: 3,
    descripcion: "Corregimiento rural en zona norte con economía agropecuaria y pesquera."
  },
];
```

---

## T3 — Panel lateral de estadísticas `panel-territorio.tsx`

Cuando el usuario haga clic en un territorio en el mapa, abrir un panel lateral
(usando `usePanels` de `@/core/panels/panel-store`) que muestre:

**Estadísticas por territorio**:
- Nombre e ícono de tipo (Localidad/Corregimiento/Isla)
- Población estimada
- **Indicador de Seguridad Humana** (barra de progreso 0–100 con color semántico:
  <50 = rojo, 50–69 = amarillo/amber, ≥70 = verde)
- Aportes ciudadanos registrados
- Mesas comunitarias realizadas
- Alertas activas
- Descripción del territorio
- Botón `"Ver aportes de este territorio"` → `setVista("explorar")`

Registrar el panel en `src/core/panels/panel-registry.tsx` con el id `"territorio"`.
El tipo de datos del panel debe ser `{ territorioId: string }`.

---

## T4 — Actualizar `geovisor-view.tsx`

**Archivo**: buscar la vista del geovisor. Probablemente en:
- `src/features/geovisor/views/geovisor-view.tsx` o
- `src/app/(views)/geovisor/page.tsx`

Buscar con: `find /root/polis/src -name "*geovisor*" -type f`

Actualizar la vista para:
1. Importar `MapaCartagena` con `dynamic({ ssr: false })`.
2. Layout: mapa ocupa la mayor parte del viewport (`h-[calc(100vh-5rem)]`).
3. Mostrar una leyenda superior con los 4 territorios y sus colores.
4. Al seleccionar territorio en el mapa → abrir el panel lateral `"territorio"`.
5. Encabezado:
   - Eyebrow: `"Geovisor Territorial"`
   - Título: `"Seguridad Humana en el Territorio de Cartagena"`
   - Descripción breve sobre las capas disponibles.

---

## T5 — Endpoint backend para datos de territoros (opcional pero preferible)

Si el tiempo lo permite, crear:
**Archivo**: `backend/app/api/v1/endpoints/territorios.py`

```python
GET /api/v1/territorios/
# Retorna lista de territorios con sus indicadores estadísticos

GET /api/v1/territorios/{territorio_id}/
# Retorna detalle de un territorio específico

GET /api/v1/territorios/{territorio_id}/aportes/
# Retorna aportes ciudadanos filtrados por territorio (join con politicas)
```

Si no alcanza el tiempo, los datos estáticos de `territorios.data.ts` (T2) son
suficientes para la entrega inicial.

Registrar el router en `backend/app/api/v1/api.py`.

---

## T6 — Aseguramiento de Calidad y Despliegue

```bash
# 1. TypeScript y ESLint
cd /root/polis && bun run check

# 2. Build de producción
bun run build

# 3. Reiniciar frontend
sudo systemctl restart polis-frontend.service
sudo systemctl is-active polis-frontend.service

# 4. Verificar respuesta
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/

# 5. Si se creó backend nuevo:
sudo systemctl restart polis-backend.service

# 6. Commit
git add -A && git commit -m "feat(geovisor): mapa interactivo OpenLayers + OSM con estadísticas territoriales Cartagena

- Instalar ol (OpenLayers) con tiles OpenStreetMap
- MapaCartagena: mapa centrado en Cartagena zoom 11, 3 Localidades + Corregimientos
- territorios.data.ts: datos estadísticos de 8 territorios (población, ISH, aportes, alertas)
- PanelTerritorio: panel lateral con indicador de seguridad y estadísticas
- GeovisorView: layout full-height con leyenda y selección de territorio
- Endpoint opcional GET /api/v1/territorios/"
```

---

## Entrega Esperada
Al terminar, escribe el resultado en `/root/polis/bridge/02_entrega_freebuff.md` con:
- Estado de cada tarea (T1–T6): ✅ CONFORME / ❌ ERROR
- Salida de `bun run check`
- Salida de `bun run build`
- Hash del commit
- Si se implementó el backend (T5): endpoints disponibles
- Decisiones de diseño tomadas
