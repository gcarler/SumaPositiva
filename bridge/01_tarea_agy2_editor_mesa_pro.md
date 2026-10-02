# TAREA — Mesa Editor Pro: formulario de creación/edición de mesas mejorado

## Contexto
El formulario actual (`mesa-editor-panel.tsx`) pide: nombre, entidad, fecha, lugar, total de
asistentes y facilitador. El usuario necesita un formulario más completo y profesional.

---

## Cambios requeridos

### A. Modelo — extender `MesaDeTrabajo` y `MesaInput`

**Archivo:** `src/features/mesas/models/mesas.ts`

Añadir los nuevos campos a `MesaDeTrabajo` y a `MesaInput` del store:

```ts
// Geolocalización
coordenadas?: { lat: number; lng: number };
urlMapa?: string;          // Link Google Maps / Waze / OSM

// Logística del lugar
aforo?: number;            // Capacidad máxima del lugar

// Múltiples entidades responsables
entidades: EntidadResponsable[];  // Reemplaza el campo "entidad: string"

// Múltiples personas responsables
responsables: PersonaResponsable[];  // Reemplaza "facilitador: string"
```

Nuevos tipos:

```ts
export interface EntidadResponsable {
  id: string;          // nanoid o uuid-v4
  nombre: string;      // "Secretaría de Participación Ciudadana"
  rol: string;         // "Convocante" | "Coorganizadora" | "Aliada"
}

export interface PersonaResponsable {
  id: string;
  nombre: string;      // "Carlos Pérez"
  cargo: string;       // "Secretario de Participación"
  entidadId?: string;  // Referencia a EntidadResponsable.id
  esFacilitador: boolean;
}
```

**IMPORTANTE:** mantener retrocompatibilidad — `entidad` y `facilitador` (string) siguen
existiendo como campos legacy en `MesaDeTrabajo` para no romper mesas existentes.
Los nuevos campos son opcionales. El store sigue funcionando.

---

### B. Store — actualizar `MesaInput` y `crearMesa`

**Archivo:** `src/features/mesas/state/mesas-store.ts`

Añadir a `MesaInput`:
```ts
export interface MesaInput {
  nombre: string;
  fecha: string;
  lugar: string;
  entidad: string;          // legacy (se rellena con entidades[0].nombre si hay lista)
  facilitador: string;      // legacy (se rellena con responsables[0].nombre si hay lista)
  totalAsistentes: number;  // AHORA: campo opcional, default 0 en creación
  horario?: string;
  descripcion?: string;
  dimensionOnu?: string;
  estado?: EstadoMesa;
  tipoMesa?: string;
  codigoOficial?: string;
  shortcodeCiudadano?: string;
  // Nuevos:
  coordenadas?: { lat: number; lng: number };
  urlMapa?: string;
  aforo?: number;
  entidades?: EntidadResponsable[];
  responsables?: PersonaResponsable[];
}
```

En `crearMesa`, cuando se crean entidades/responsables, derivar los campos legacy:
```ts
entidad: input.entidades?.[0]?.nombre ?? input.entidad ?? "",
facilitador: input.responsables?.find(r => r.esFacilitador)?.nombre ?? input.facilitador ?? "",
totalAsistentes: input.totalAsistentes ?? 0,
```

---

### C. Panel editor — rediseño completo en secciones

**Archivo:** `src/features/mesas/panels/mesa-editor-panel.tsx`

El formulario se divide en **3 secciones colapsables** con indicador de progreso:

#### Sección 1 — Información básica (REQUERIDA para guardar)
- `nombre` — texto, requerido, min 6 chars
- `fecha` — date picker, requerido
- `horaInicio` + `horaFin` — time inputs opcionales (ej. "08:30" y "12:00")
- `lugar` — texto, requerido

#### Sección 2 — Entidades y personas responsables (OPCIONAL)
Lista dinámica de entidades (añadir/quitar):
- Cada entidad: `nombre` + `rol` (select: "Convocante" | "Coorganizadora" | "Aliada" | "Apoyo técnico")
- Al menos 1 entidad recomendada (no requerida para guardar)

Lista dinámica de personas responsables (añadir/quitar):
- Cada persona: `nombre` + `cargo` + checkbox `esFacilitador`
- Solo puede haber 1 facilitador marcado a la vez

#### Sección 3 — Ubicación y logística (OPCIONAL)
- `urlMapa` — texto libre, placeholder "https://maps.google.com/... o enlace Waze / OSM"
  - Parseo automático de coordenadas si pegan una URL de Google Maps (regex sobre `@lat,lng`)
  - Si se parsean coordenadas, mostrar chip verde "📍 Coordenadas detectadas: lat, lng"
- `coordenadas.lat` + `coordenadas.lng` — números con 6 decimales (ocultos si se parsean del link)
- `aforo` — número, "Capacidad máxima del lugar", opcional

**NO incluir** `totalAsistentes` en el formulario de creación. Solo aparece al editar una mesa
que ya se realizó (estado === "cerrada").

---

### D. Esquema Zod actualizado

```ts
const mesaSchema = z.object({
  // Sección 1 — obligatorios
  nombre:     z.string().trim().min(6).max(120),
  fecha:      z.string().min(1, "Elige la fecha"),
  horaInicio: z.string().optional(),
  horaFin:    z.string().optional(),
  lugar:      z.string().trim().min(3).max(200),

  // Sección 2 — opcionales
  entidades: z.array(z.object({
    id:     z.string(),
    nombre: z.string().trim().min(2),
    rol:    z.string(),
  })).optional().default([]),
  responsables: z.array(z.object({
    id:            z.string(),
    nombre:        z.string().trim().min(2),
    cargo:         z.string().trim(),
    esFacilitador: z.boolean(),
  })).optional().default([]),

  // Sección 3 — opcionales
  urlMapa:     z.string().url().optional().or(z.literal("")),
  coordenadas: z.object({ lat: z.number(), lng: z.number() }).optional(),
  aforo:       z.number().int().min(1).max(100000).optional(),

  // Al editar mesa cerrada
  totalAsistentes: z.number().int().min(0).optional(),
}).refine(
  (d) => !d.horaInicio || !d.horaFin || d.horaInicio < d.horaFin,
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["horaFin"] }
);
```

---

### E. Parseo de coordenadas desde link de Google Maps

Cuando el usuario pega una URL en `urlMapa`, ejecutar este parseo:

```ts
function parsearCoordenadas(url: string): { lat: number; lng: number } | null {
  // Formato: @3.4516,0.7832 o 3d4516/3d0.7832 etc.
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  // Formato: ?q=3.4516,-75.5032
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}
```

Usar `watch("urlMapa")` de RHF y `useEffect` para parsear y hacer `setValue("coordenadas", ...)`.

---

### F. UI del formulario — patrón visual

Cada sección tiene:
- Cabecera clickeable con ícono + título + badge "Completado ✓" / "Opcional"
- Contenido animado con `<motion.div>` (framer-motion, `AnimatePresence`)
- Sección 1 siempre abierta al crear

Listas dinámicas (entidades, responsables):
- Botón "+ Agregar entidad" / "+ Agregar persona"
- Cada ítem renderizado como una fila con campos inline + botón × para eliminar
- Usar `useFieldArray` de React Hook Form

Tokens CSS a usar (OBLIGATORIO):
- `bg-[var(--surface-1)]`, `bg-[var(--surface-2)]`
- `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-tertiary)]`
- `border-[var(--border)]`, `text-[var(--ember)]`
- NO usar colores Tailwind fijos como `bg-blue-500`

---

### G. Actualizar `MesasInput` → `MesaPanel` para mostrar los nuevos campos

**Archivo:** `src/features/mesas/panels/mesa-panel.tsx`

En la sección "Acta de la mesa", añadir:
- Si hay `urlMapa`: enlace clickeable "📍 Ver en el mapa →"
- Si hay `aforo`: mostrar "Aforo: 120 personas"
- Si hay `entidades[]`: lista de chips con nombre + rol
- Si hay `responsables[]`: lista de personas con cargo y badge "Facilitador" para quien tenga `esFacilitador: true`

---

## QA obligatorio

```bash
bun run check   # 0 errores TS, 0 violaciones ui-policy
bun run build   # build exitoso
sudo systemctl restart polis-frontend.service
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/mesas
```

También verificar que:
- Abrir panel "Crear mesa" → solo muestra sección 1 requerida
- Expandir sección 2 → puede agregar 2 entidades y 1 persona facilitadora
- Expandir sección 3 → pegar link Google Maps → aparece chip de coordenadas detectadas
- Guardar → mesa aparece en la agenda con datos completos
- Panel de detalle muestra el link del mapa y las entidades responsables

---

## Entrega

```bash
git add -A
git commit -m "feat(mesas): editor pro — entidades múltiples, responsables, coordenadas/mapa, aforo, secciones colapsables

- MesaDeTrabajo: nuevos campos EntidadResponsable[], PersonaResponsable[], coordenadas, urlMapa, aforo
- MesaEditorPanel: 3 secciones (básica / responsables / ubicación), useFieldArray, parseo Google Maps
- MesaPanel: muestra enlace mapa, aforo, entidades y responsables con badge facilitador
- totalAsistentes: solo visible al editar mesa ya realizada (estado cerrada)
- Retrocompatible: campos legacy entidad y facilitador (string) se mantienen"

cat > /root/polis/bridge/02_entrega_agy2.md << 'ENTREGA'
# Entrega agy2 — Mesa Editor Pro
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Estado: CONFORME
ENTREGA
```
