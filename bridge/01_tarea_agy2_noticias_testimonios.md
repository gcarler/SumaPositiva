# TAREA — Módulos pro de Noticias y Testimonios

## Contexto
La app POLIS tiene estas vistas actuales en el menú superior (Topbar) y en `page.tsx`:
`inicio | explorar | mesas | geovisor`

Hay que añadir dos módulos nuevos, de nivel top:
- **Noticias** — artículos institucionales sobre el avance de la política pública
- **Testimonios** — voces ciudadanas que respaldan o narran experiencias con la política

Ambos deben tener:
1. Entrada en el menú principal (Topbar)
2. Sección CTA visible en el Home (`inicio-view.tsx`)
3. Su propia vista (`NoticiasView`, `TestimoniosView`) con diseño super pro

---

## A. MODELO DE DATOS

### `src/features/noticias/models/noticia.ts`
```ts
export type CategoriaNoticia =
  | "avance_politica"
  | "mesa_realizada"
  | "acuerdo_distrital"
  | "convocatoria"
  | "informe"
  | "logro";

export interface Noticia {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;           // 1-2 frases para cards y OG
  contenido: string;         // Markdown completo del artículo
  imagenPortada?: string;    // URL de imagen
  categoria: CategoriaNoticia;
  autor: string;             // "Secretaría de Planeación Distrital"
  publicadaEn: string;       // ISO date
  destacada: boolean;        // Aparece en hero del home
  etiquetas: string[];       // ["mesas", "localidad-1", "participacion"]
}
```

### `src/features/testimonios/models/testimonio.ts`
```ts
export type TipoTestimonio = "ciudadano" | "lider_comunal" | "funcionario" | "academia";

export interface Testimonio {
  id: string;
  nombre: string;            // "María González" o "Anónimo"
  anonimo: boolean;
  barrio?: string;           // "Getsemaní"
  localidad?: string;        // "Localidad 1 — Histórica"
  tipo: TipoTestimonio;
  texto: string;             // El testimonio en sí (max 500 chars en card)
  textoCompleto?: string;    // Si es más largo, se muestra en panel
  foto?: string;             // URL foto de perfil (opcional)
  dimensionOnu?: string;     // A qué dimensión de seguridad se refiere
  verificado: boolean;       // Lo revisó el equipo de facilitación
  creadoEn: string;          // ISO date
  destacado: boolean;        // Aparece en home
}
```

---

## B. DATOS MOCK

### `src/features/noticias/data/noticias.mock.ts`
Crear 6 noticias de ejemplo realistas para Cartagena:

1. **Destacada** — "Cartagena inicia su proceso de Seguridad Humana Integral con 33 mesas de trabajo" (imagenPortada, categoria: "avance_politica", destacada: true)
2. "Primera Mesa Territorial en el Centro Histórico — 120 participantes" (categoria: "mesa_realizada")
3. "Decreto 037 de 2026: Cartagena formaliza su hoja de ruta de Seguridad Humana" (categoria: "acuerdo_distrital")
4. "Convocatoria: Participa en las Mesas de Trabajo Rurales e Insulares" (categoria: "convocatoria")
5. "Informe de avance: 8 mesas poblacionales completadas con 640 participantes" (categoria: "informe")
6. "Barú y Tierrabomba: comunidades étnicas lideran su propio diagnóstico" (categoria: "logro", destacada: true)

### `src/features/testimonios/data/testimonios.mock.ts`
Crear 6 testimonios realistas:

1. Ciudadana de Getsemaní (anonimo: false, verificado: true, destacado: true) — sobre inseguridad en el barrio
2. Líder comunal de La Boquilla (tipo: "lider_comunal", verificado: true) — sobre el proceso de mesas
3. Anónimo de Tierrabomba (anonimo: true, verificado: true) — sobre la mesa insular
4. Funcionaria de Planeación (tipo: "funcionario", verificado: true) — sobre el decreto
5. Académica de Universidad de Cartagena (tipo: "academia") — sobre el enfoque diferencial
6. Joven de la Localidad 2 (tipo: "ciudadano", destacado: true) — sobre participación juvenil

---

## C. STORES

### `src/features/noticias/state/noticias-store.ts`
```ts
import { create } from "zustand";
import { NOTICIAS_MOCK } from "../data/noticias.mock";

interface NoticiasState {
  noticias: Noticia[];
  filtroCategoria: CategoriaNoticia | "todas";
  busqueda: string;
  setFiltro: (c: CategoriaNoticia | "todas") => void;
  setBusqueda: (q: string) => void;
}
```

### `src/features/testimonios/state/testimonios-store.ts`
```ts
import { create } from "zustand";
import { TESTIMONIOS_MOCK } from "../data/testimonios.mock";

interface TestimoniosState {
  testimonios: Testimonio[];
  filtroTipo: TipoTestimonio | "todos";
  setFiltro: (t: TipoTestimonio | "todos") => void;
  // Acción futura: enviarTestimonio()
}
```

---

## D. VISTAS

### `src/features/noticias/views/noticias-view.tsx`

**Layout (de arriba a abajo):**

```
┌──────────────────────────────────────────────────────────────────┐
│ HERO NOTICIA DESTACADA                                           │
│  Imagen de fondo completa · Título grande · Categoría · Fecha   │
│  Botón "Leer más →"  (abre panel de detalle)                    │
├──────────────────────────────────────────────────────────────────┤
│ Filtros por categoría (chips horizontales scrolleables):        │
│  [Todas] [Avances] [Mesas realizadas] [Acuerdos] [Convocatorias]│
│  [Informes] [Logros]                                            │
├──────────────────────────────────────────────────────────────────┤
│ GRID DE NOTICIAS — masonry-like:                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Imagen      │  │  Imagen      │  │  Imagen      │          │
│  │  Categoría   │  │  Categoría   │  │  Categoría   │          │
│  │  Título      │  │  Título      │  │  Título      │          │
│  │  Resumen     │  │  Resumen     │  │  Resumen     │          │
│  │  Autor · Fecha│  │  Autor · Fecha│  │  Autor · Fecha│         │
│  │  Leer más →  │  │  Leer más →  │  │  Leer más →  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Cards con `ui-interactive-card` (efecto hover ya definido en el proyecto)
- Categoría como badge con color por tipo:
  - `avance_politica` → `--ember` (naranja)
  - `mesa_realizada` → verde
  - `acuerdo_distrital` → azul
  - `convocatoria` → amarillo
  - `informe` → gris
  - `logro` → dorado
- Al hacer clic → `openPanel("noticia", { noticiaId: n.id })` (Zero-Modals)
- Animaciones stagger de entrada con `framer-motion`

### `src/features/testimonios/views/testimonios-view.tsx`

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│  "Voces de Cartagena"                                           │
│  "Lo que dicen quienes participan en la construcción de la      │
│   Política Pública de Seguridad Humana Integral"                │
├──────────────────────────────────────────────────────────────────┤
│ Filtros tipo: [Todos] [Ciudadanos] [Líderes] [Funcionarios] [Academia] │
├──────────────────────────────────────────────────────────────────┤
│ MOSAICO DE TESTIMONIOS — estilo Pinterest / quotes              │
│                                                                  │
│  ┌────────────────────┐   ┌──────────────────────────────────┐  │
│  │ ❝ Texto del        │   │ ❝ Testimonio más largo que ocupa  │  │
│  │   testimonio       │   │   dos columnas en desktop...      │  │
│  │   breve ❞          │   │   ❞                              │  │
│  │ 🙋 María · Getsemaní│   │ 👤 Anónimo · Tierrabomba         │  │
│  │ ✅ Verificado       │   │ ✅ Verificado                    │  │
│  └────────────────────┘   └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────┐   ┌────────────────────┐  │
│  │ ❝ Testimonio de lider comunal... │   │ ❝ Breve ❞          │  │
│  │   ❞                             │   │ 👤 Funcionaria      │  │
│  │ 👥 Líder JAC · La Boquilla       │   └────────────────────┘  │
│  └──────────────────────────────────┘                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  + ¿Quieres compartir tu testimonio?                     │   │
│  │  [Comparte tu experiencia →]  (abre panel formulario)    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

- Layout masonry con `columns-1 md:columns-2 lg:columns-3` (CSS columns)
- Cards con comillas tipográficas grandes (`❝ ❞`) como elemento decorativo
- Foto de perfil circular si existe, iniciales si no
- Badge `✅ Verificado` en verde para los verificados
- Badge de dimensión ONU si aplica
- Botón al final: "Comparte tu experiencia" → `openPanel("testimonio-nuevo", {})`
- Animación de entrada stagger

---

## E. PANELES (Zero-Modals)

### `src/features/noticias/panels/noticia-panel.tsx`
Panel de detalle de una noticia:
- Imagen hero full-width del panel
- Categoría badge + fecha
- Título grande
- Autor e institución
- Contenido en Markdown (usar `react-markdown` si ya está; si no, renderizar como texto con párrafos)
- Etiquetas al final
- Botón "Compartir" (copiar URL de la noticia)

### `src/features/testimonios/panels/testimonio-nuevo-panel.tsx`
Formulario para enviar un nuevo testimonio:
- ¿Quieres dar tu nombre? (toggle anónimo)
- Nombre (si no es anónimo)
- Barrio / Zona
- Tipo (ciudadano / líder / funcionario / academia)
- Tu testimonio (textarea, max 500 chars con contador)
- Dimensión de seguridad que más te afecta (select opcional)
- Botón "Enviar" → guarda en store + toast "¡Gracias! Tu testimonio será revisado."

---

## F. REGISTRO DE PANELES

**Archivo:** `src/app/_composition/panel-registry.tsx`

Añadir:
```tsx
"noticia" → import NoticiаPanel
"testimonio-nuevo" → import TestimoniоNuevoPаnel
```

---

## G. NAVEGACIÓN — Topbar + NavigationStore

### `src/core/navigation/navigation-store.ts`
```ts
// Cambiar:
export type VistaApp = "inicio" | "explorar" | "mesas" | "geovisor";
// Por:
export type VistaApp = "inicio" | "explorar" | "mesas" | "geovisor" | "noticias" | "testimonios";
```

### `src/app/_components/topbar.tsx`
Añadir dos nuevos items en el menú de navegación:
```
Inicio | Explorar | Mesas | Geovisor | Noticias | Testimonios
```

Cada item nuevo con el mismo estilo que los existentes.

### `src/app/page.tsx`
Añadir los dos nuevos casos al `AnimatePresence`:
```tsx
import { NoticiasView } from "@/features/noticias/views/noticias-view";
import { TestimoniosView } from "@/features/testimonios/views/testimonios-view";

// En el switch de vistas:
} : vista === "noticias" ? (
  <NoticiasView />
) : vista === "testimonios" ? (
  <TestimoniosView />
) : (
  <ExplorarView />
)}
```

---

## H. HOME — CTAs en `inicio-view.tsx`

Añadir una sección nueva entre el hero y las métricas (o al final antes del footer):

```
┌──────────────────────────────────────────────────────────────────┐
│  📰 Noticias                                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Noticia     │ │ Noticia     │ │ Noticia     │              │
│  │ destacada 1 │ │ destacada 2 │ │ ...         │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│  [Ver todas las noticias →]                                     │
├──────────────────────────────────────────────────────────────────┤
│  🎙️ Testimonios                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ ❝ Testimonio dest. 1 │  │ ❝ Testimonio dest. 2 │            │
│  └──────────────────────┘  └──────────────────────┘            │
│  [Leer más testimonios →]   [Comparte tu experiencia →]         │
└──────────────────────────────────────────────────────────────────┘
```

Mostrar en home:
- Últimas 3 noticias (usar `noticias.slice(0, 3)`)
- 2 testimonios destacados (`testimonios.filter(t => t.destacado).slice(0, 2)`)
- Botón "Ver todas" → `setVista("noticias")` / `setVista("testimonios")`

---

## QA obligatorio
```bash
bun run check   # 0 errores TS, 0 violaciones ui-policy
bun run build   # build exitoso
sudo systemctl restart polis-frontend.service
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 && echo ""
```

Verificar:
- Menú Topbar muestra: Inicio · Explorar · Mesas · Geovisor · **Noticias** · **Testimonios** ✅
- Clic en Noticias → hero + grid de 6 noticias con filtros de categoría ✅
- Clic en una noticia → abre panel de detalle con contenido ✅
- Clic en Testimonios → mosaico de 6 testimonios con filtros de tipo ✅
- Botón "Comparte tu experiencia" → abre panel formulario ✅
- Home muestra últimas 3 noticias y 2 testimonios con botones CTA ✅

---

## Entrega
```bash
git add -A
git commit -m "feat(noticias+testimonios): módulos pro con menú, home CTAs, paneles y formulario

- NavigationStore: nuevas vistas 'noticias' y 'testimonios'
- Topbar: 6 items de navegación
- NoticiasView: hero destacado + filtros por categoría + grid animado
- TestimoniosView: mosaico masonry estilo quotes + formulario envío
- NoticiaPanel: detalle completo con markdown y botón compartir
- TestimoniоNuevoPаnel: formulario anónimo con validación 500 chars
- inicio-view: sección CTA con últimas noticias y testimonios destacados
- Mocks: 6 noticias + 6 testimonios de Cartagena realistas"

cat > /root/polis/bridge/02_entrega_agy2.md << 'ENTREGA'
# Entrega agy2 — Módulos Noticias y Testimonios
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Estado: CONFORME
ENTREGA
```
