# TAREA — Fix submesas + cálculo asistentes + adjuntos en mesas/submesas

## 1. BUG CRÍTICO — Submesas no se crean / no persisten

### Diagnóstico
`useCrearSubMesa()` llama a `crearSubMesa(mesaId, datos)` en `mesas-api.ts` que:
1. Actualiza el store Zustand ✅
2. Intenta llamar al backend FastAPI (falla porque los IDs de agenda no son UUIDs) ❌
3. `onSuccess` invalida el query de TanStack Query
4. El query refetch pide al backend → falla → cae al fallback `fallbackObtenerMesa`
5. El fallback lee del store Zustand... **PERO** la vista `MesaPanel` recibe los datos
   del query `useMesaQuery(mesaId)` que está desincronizado del store

### Fix en `src/features/mesas/services/mesas-api.ts`
La función `crearSubMesa` debe **siempre** actualizar el store primero y sincronizar
el query con el estado del store inmediatamente, sin depender del backend:

```ts
export async function crearSubMesa(mesaId: string, datos: SubMesaInput): Promise<SubMesa | null> {
  // 1. Crear en el store local inmediatamente
  const sub = useMesasStore.getState().crearSubMesa(mesaId, datos);
  if (!sub) return null;

  // 2. Intentar sincronizar con backend (fire and forget)
  try {
    await apiFetch(`/api/v1/mesas/${mesaId}/submesas`, {
      method: "POST",
      body: JSON.stringify({ nombre: datos.nombre, tema: datos.tema, participantes: datos.participantes }),
    });
  } catch { /* silencioso — el store local ya tiene los datos */ }

  return sub;
}
```

### Fix en `src/features/mesas/services/use-mesas-queries.ts`
`useCrearSubMesa` después del éxito debe leer del store Zustand directamente en lugar de
refetch del backend:

```ts
export function useCrearSubMesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mesaId, datos }) => crearSubMesa(mesaId, datos),
    onSuccess: (_, { mesaId }) => {
      // Actualizar el cache de TanStack Query con los datos del store
      const mesaActualizada = useMesasStore.getState().mesas.find(m => m.id === mesaId);
      if (mesaActualizada) {
        queryClient.setQueryData(MESAS_KEYS.detail(mesaId), mesaActualizada);
      }
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
    },
  });
}
```

### Fix en `fallbackObtenerMesa`
En `mesas-api.ts`, la función `fallbackObtenerMesa` debe reflejar SIEMPRE el estado
más reciente del store (incluyendo submesas creadas):

```ts
export async function fallbackObtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  const mesa = useMesasStore.getState().mesas.find(m => m.id === mesaId);
  if (!mesa) throw new Error(`Mesa ${mesaId} no encontrada`);
  return mesa; // retorna referencia viva del store
}
```

---

## 2. LÓGICA DE ASISTENTES — Regla de negocio

### Regla:
- Si la mesa tiene **submesas**: `totalAsistentes = Σ submesas[].participantes`
  (alguien puede ir a una submesa sin ir a plenaria, y viceversa)
- Si NO tiene submesas: `totalAsistentes` se captura manualmente en la plenaria
- En el panel de detalle mostrar:
  - Si hay submesas: desglose "Plenaria: N · Submesa A: N · Submesa B: N · **Total: N**"
  - Si no hay submesas: campo editable de asistentes totales

### Implementación en `src/features/mesas/models/mesas.ts`
Añadir campo en `SubMesa`:
```ts
export interface SubMesa {
  id: string;
  nombre: string;
  tema: string;
  participantes: number | null;
  asistentesPresenciales?: number | null;  // asistentes reales al finalizar
  // ...resto de campos existentes
}
```

Añadir en `MesaDeTrabajo`:
```ts
asistentesPlenaaria?: number | null;  // solo quienes fueron a plenaria, no a submesas
```

Añadir función utilitaria:
```ts
export function calcularTotalAsistentes(mesa: MesaDeTrabajo): number {
  if (mesa.submesas.length === 0) return mesa.totalAsistentes ?? 0;
  const sumSubmesas = mesa.submesas.reduce((acc, sm) => acc + (sm.participantes ?? 0), 0);
  const plenaria = mesa.asistentesPlenaaria ?? 0;
  return sumSubmesas + plenaria;
}
```

### Mostrar en `mesa-panel.tsx`
En la sección de datos administrativos, reemplazar la celda "Asistentes" fija por:

```tsx
import { calcularTotalAsistentes } from "@/features/mesas/models/mesas";

// En el DL de datos:
<div className="space-y-1">
  <dt className="label-micro text-[var(--text-tertiary)]">Asistentes</dt>
  <dd className="text-sm font-medium text-[var(--text-primary)]">
    {mesa.submesas.length > 0 ? (
      <div className="space-y-0.5">
        {mesa.asistentesPlenaaria != null && (
          <div className="flex gap-2 text-xs text-[var(--text-secondary)]">
            <span>Plenaria:</span>
            <span className="font-medium">{mesa.asistentesPlenaaria}</span>
          </div>
        )}
        {mesa.submesas.map(sm => sm.participantes != null && (
          <div key={sm.id} className="flex gap-2 text-xs text-[var(--text-secondary)]">
            <span className="truncate max-w-[120px]">{sm.nombre}:</span>
            <span className="font-medium">{sm.participantes}</span>
          </div>
        ))}
        <div className="flex gap-2 text-sm font-semibold text-[var(--text-primary)] border-t border-[var(--border)] pt-1">
          <span>Total:</span>
          <span>{calcularTotalAsistentes(mesa)}</span>
        </div>
      </div>
    ) : (
      <span>{mesa.totalAsistentes.toLocaleString("es-CO")}</span>
    )}
  </dd>
</div>
```

También añadir un campo editable "Asistentes en plenaria" en la sección de acuerdos de plenaria
para capturar cuántas personas asistieron solo a la plenaria (no a submesas):

```tsx
<FormField label="Personas en plenaria (sin contar submesas)">
  <Input
    type="number"
    min={0}
    value={mesa.asistentesPlenaaria ?? ""}
    onChange={e => mutarAsistentes.mutate({ mesaId: mesa.id, cantidad: Number(e.target.value) })}
    placeholder="0"
  />
</FormField>
```

---

## 3. ADJUNTOS EN MESAS Y SUBMESAS

### Modelo — añadir en `mesas.ts`
```ts
export interface AdjuntoMesa {
  id: string;
  nombre: string;           // "Acta firmada.pdf"
  tipo: "documento" | "imagen" | "audio" | "video" | "otro";
  mimeType: string;         // "application/pdf" | "image/jpeg" | etc.
  tamaño: number;           // bytes
  url: string;              // URL de descarga (local blob o remota)
  subidoEn: string;         // ISO timestamp
  subidoPor?: string;       // nombre del usuario
}
```

Añadir a `MesaDeTrabajo`:
```ts
adjuntos?: AdjuntoMesa[];
```

Añadir a `SubMesa`:
```ts
adjuntos?: AdjuntoMesa[];
```

### Store — añadir acciones en `mesas-store.ts`
```ts
agregarAdjuntoMesa: (mesaId: string, adjunto: AdjuntoMesa) => void;
eliminarAdjuntoMesa: (mesaId: string, adjuntoId: string) => void;
agregarAdjuntoSubMesa: (mesaId: string, subMesaId: string, adjunto: AdjuntoMesa) => void;
eliminarAdjuntoSubMesa: (mesaId: string, subMesaId: string, adjuntoId: string) => void;
```

### Componente `<AdjuntosZona />` — reutilizable
Crear `src/features/mesas/components/adjuntos-zona.tsx`:

```tsx
/**
 * Zona de adjuntos drag-and-drop para mesas y submesas.
 * Acepta: PDF, Word, Excel, imágenes (JPG, PNG, WebP), audio (MP3), video (MP4).
 * Tamaño máximo por archivo: 10 MB.
 * Almacenamiento: localStorage como blob URL (temporal, para MVP sin backend).
 */

interface AdjuntosZonaProps {
  adjuntos: AdjuntoMesa[];
  onAgregar: (adjunto: AdjuntoMesa) => void;
  onEliminar: (adjuntoId: string) => void;
  soloLectura?: boolean;
}
```

UI de la zona de adjuntos:
```
┌─────────────────────────────────────────────────┐
│ 📎 Adjuntos (3)                    [+ Adjuntar] │
├─────────────────────────────────────────────────┤
│ 📄 Acta firmada.pdf          245 KB  [↓] [×]   │
│ 🖼️  Foto plenaria.jpg          1.2 MB  [↓] [×]  │
│ 📊 Resultados.xlsx           89 KB   [↓] [×]   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Arrastra archivos aquí o haz clic      │   │
│  │  PDF · Word · Excel · Imágenes · Audio  │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

Íconos por tipo:
- PDF → `FileText` (lucide)
- Word/Excel → `FileSpreadsheet` / `FileText`
- Imagen → `Image` (mostrar thumbnail en miniatura)
- Audio → `Music`
- Video → `Video`
- Otro → `Paperclip`

Implementación:
```tsx
// Usar <input type="file" multiple accept="..."> oculto
// Al seleccionar archivo: crear URL.createObjectURL(file) como url temporal
// Mostrar progreso de "lectura" (100ms fake)
// Guardar en store como AdjuntoMesa
// Al hacer clic en ↓: window.open(adjunto.url) o link download
// Al hacer clic en ×: confirmar y llamar onEliminar
```

### Integrar en `mesa-panel.tsx`
Al final del panel, antes del footer, añadir sección:

```tsx
import { AdjuntosZona } from "@/features/mesas/components/adjuntos-zona";

{/* Sección adjuntos de la mesa */}
<section className="space-y-3">
  <SectionLabel>Adjuntos de la mesa</SectionLabel>
  <AdjuntosZona
    adjuntos={mesa.adjuntos ?? []}
    onAgregar={(adj) => agregarAdjuntoMesa(mesa.id, adj)}
    onEliminar={(adjId) => eliminarAdjuntoMesa(mesa.id, adjId)}
    soloLectura={soloLectura}
  />
</section>
```

### Integrar en `papelografo-panel.tsx` (panel de submesa)
Añadir la misma `<AdjuntosZona />` al final del panel de cada submesa.

---

## QA obligatorio
```bash
bun run check   # 0 errores TS, 0 violaciones ui-policy
bun run build   # build exitoso
sudo systemctl restart polis-frontend.service
```

Verificar manualmente:
1. Abrir panel de una mesa de agenda → clic "+ Crear submesa" → se crea y aparece inmediatamente ✅
2. Recargar la página → la submesa persiste (store en memoria de la sesión) ✅
3. La mesa con 2 submesas muestra el desglose de asistentes con total ✅
4. Añadir un PDF → aparece en la lista con ícono y botón descarga ✅
5. Añadir una imagen → se muestra thumbnail ✅
6. Eliminar adjunto → desaparece de la lista ✅

---

## Entrega
```bash
git add -A
git commit -m "fix(mesas): submesas se crean y persisten + asistentes por plenaria/submesa + adjuntos

- Fix: crearSubMesa sincroniza TanStack Query con el store Zustand inmediatamente
- Fix: fallbackObtenerMesa retorna estado vivo del store (no snapshot)
- feat: calcularTotalAsistentes() = Σ submesas + plenaria (independientes)
- feat: campo asistentesPlenaaria en MesaDeTrabajo
- feat: AdjuntosZona — drag-and-drop de archivos para mesas y submesas
- feat: AdjuntoMesa model con tipo, mimeType, tamaño, url, thumbnail para imágenes
- feat: acciones agregarAdjunto / eliminarAdjunto en el store"

cat > /root/polis/bridge/02_entrega_agy2.md << 'ENTREGA'
# Entrega agy2 — Fix submesas + asistentes + adjuntos
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Estado: CONFORME
ENTREGA
```
