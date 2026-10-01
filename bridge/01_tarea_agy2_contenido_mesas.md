# TAREA — Contenido rico en panel de detalle de mesas de trabajo

## Contexto
La agenda tiene 33 mesas (oct 15 – dic 11 de 2026). Al hacer clic en "Ver detalle" se abre `MesaPanel` (`src/features/mesas/panels/mesa-panel.tsx`). El panel muestra datos administrativos, acuerdos de plenaria y submesas — pero las mesas de agenda están completamente vacías (sin acuerdos, sin submesas, sin descripción de qué sucede en cada una).

## Lo que necesita el usuario
Cuando se abra el detalle de cualquier mesa de la agenda, debe mostrar:
1. **Descripción del propósito** de esa mesa específica
2. **Agenda del día** (orden del día / metodología)
3. **Preguntas orientadoras** para la participación ciudadana
4. **Submesas sugeridas** (con temas y número de participantes estimados)
5. **Resultados esperados** / entregables

## Solución técnica

### Paso 1 — Crear `agenda-contenido.data.ts`
Crea `src/features/mesas/data/agenda-contenido.data.ts` con un mapa de contenido por `mesaId`:

```ts
export interface ContenidoMesa {
  proposito: string;         // Párrafo de 2-3 líneas
  ordenDelDia: string[];     // Lista de puntos (4-6 items)
  preguntasOrientadoras: string[]; // 3-5 preguntas para la participación
  submesasSugeridas: { nombre: string; tema: string; participantes: number }[];
  resultadosEsperados: string[]; // 2-4 entregables
  marcoNormativo?: string[];     // Leyes/decretos relevantes (opcional)
}

export const CONTENIDO_MESAS: Record<string, ContenidoMesa> = {
  "mt-001": { ... }, // Mesa Territorial L1 Histórica
  "mt-002": { ... }, // Mesa Territorial L2 Virgen
  "mt-003": { ... }, // Mesa Territorial L3 Industrial
  // ... todas las 33 mesas
};
```

Genera contenido REAL y específico para cada mesa. Por ejemplo:

**Mesa Territorial L1 (Histórica y del Caribe Norte):**
- Propósito: Identificar y priorizar los factores de inseguridad humana en los barrios del centro histórico, Getsemaní, Pie de la Popa y el Caribe Norte desde la voz de sus comunidades.
- Preguntas: "¿Cuáles son las tres principales amenazas a su seguridad personal en su barrio?", "¿Qué servicios públicos fallan con más frecuencia?", etc.
- Submesas: Seguridad personal y convivencia, Economía y empleo informal, Espacio público y movilidad

**Mesa Insular Barú:**
- Propósito: Garantizar participación con enfoque étnico diferencial de la comunidad afrodescendiente de Barú...
- Marco normativo: Convenio 169 OIT, Decreto 1320/98, Sentencia SU-123/18

**Mesa Poblacional Mujeres:**
- Preguntas orientadoras sobre VBG, economía del cuidado, ESCNNA
- Marco normativo: Ley 1257/08, CONPES 4080/22, Decreto 2734/12

**Mesa Sectorial Construcción de Paz:**
- Marco normativo: Ley 2272/2022, Acuerdo de Paz, Decreto Ley 893/17

### Paso 2 — Modificar `mesa-panel.tsx` para mostrar el contenido
En `src/features/mesas/panels/mesa-panel.tsx`, añadir una nueva sección "Contenido de la mesa" que se muestre cuando exista contenido en `CONTENIDO_MESAS[mesa.id]`:

```tsx
import { CONTENIDO_MESAS } from "@/features/mesas/data/agenda-contenido.data";

// Dentro del JSX del panel, ANTES de la sección de acuerdos:
{contenido && (
  <section className="space-y-6">
    {/* Propósito */}
    <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-5">
      <SectionLabel>Propósito de la mesa</SectionLabel>
      <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{contenido.proposito}</p>
    </div>
    
    {/* Orden del día */}
    <div>
      <SectionLabel>Agenda del día</SectionLabel>
      <ol className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
        {contenido.ordenDelDia.map((item, i) => (
          <li key={i} className="flex gap-2"><span className="text-[var(--ember)] font-bold tabular-nums">{i+1}.</span>{item}</li>
        ))}
      </ol>
    </div>

    {/* Preguntas orientadoras */}
    <div>
      <SectionLabel>Preguntas orientadoras</SectionLabel>
      <ul className="mt-2 space-y-2">
        {contenido.preguntasOrientadoras.map((p, i) => (
          <li key={i} className="rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--text-primary)] italic">
            "{p}"
          </li>
        ))}
      </ul>
    </div>

    {/* Resultados esperados */}
    <div>
      <SectionLabel>Resultados esperados</SectionLabel>
      <ul className="mt-2 space-y-1">
        {contenido.resultadosEsperados.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <span className="text-[var(--ember)] mt-0.5">→</span>{r}
          </li>
        ))}
      </ul>
    </div>

    {/* Marco normativo */}
    {contenido.marcoNormativo?.length && (
      <div>
        <SectionLabel>Marco normativo</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {contenido.marcoNormativo.map((n) => (
            <span key={n} className="rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-tertiary)]">{n}</span>
          ))}
        </div>
      </div>
    )}
  </section>
)}
```

### Paso 3 — Sembrar submesas sugeridas en el store
Las mesas de agenda en el store tienen `submesas: []`. Cuando exista `CONTENIDO_MESAS[id].submesasSugeridas`, el store debe inicializarlas automáticamente.

Modificar `mesas-store.ts` en `MESAS_AGENDA_INICIAL`:
```ts
submesas: (CONTENIDO_MESAS[m.id]?.submesasSugeridas ?? []).map((ss, idx) => ({
  id: `${m.id}-sm-${idx + 1}`,
  nombre: ss.nombre,
  tema: ss.tema,
  participantes: ss.participantes,
  arbolProblemas: ARBOL_PROBLEMAS_VACIO,   // usar la constante que ya existe
  arbolSoluciones: ARBOL_SOLUCIONES_VACIO,  // usar la constante que ya existe
})),
```

**IMPORTANTE:** `ARBOL_PROBLEMAS_VACIO` y `ARBOL_SOLUCIONES_VACIO` ya están definidas en el mismo archivo, líneas ~168-169. Úsalas directamente.

## QA obligatorio
```bash
bun run check && bun run build && sudo systemctl restart polis-frontend.service
```

## Entrega
```bash
git add -A && git commit -m "feat(mesas): contenido rico en panel de detalle — propósito, agenda, preguntas orientadoras, submesas y marco normativo para las 33 mesas"
cat > /root/polis/bridge/02_entrega_agy2.md << 'ENTREGA'
# Entrega agy2 — Contenido mesas
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Commit: $(git rev-parse HEAD)
Estado: CONFORME
ENTREGA
```
