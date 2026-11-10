"use client";

import { useState, useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Shuffle,
  Clock,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  ListOrdered,
  Users,
} from "lucide-react";
import {
  type ConfiguracionSorteoAzar,
  type MesaDeTrabajo,
  type MetodoConvocatoriaMesa,
} from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useRegistrosMesa } from "@/features/mesas/state/asistencia-store";
import { toast } from "sonner";

interface MesaSorteoAzarProps {
  mesa: MesaDeTrabajo;
  soloLectura?: boolean;
}

const METODOS_CONVOCATORIA_LABELS: Record<MetodoConvocatoriaMesa, { label: string; desc: string }> = {
  sorteo_civico_aleatorio: {
    label: "Sorteo Cívico Aleatorio (Minipúblico)",
    desc: "Convocatoria por muestreo probabilístico estratificado garantizando representatividad demográfica.",
  },
  abierta: {
    label: "Convocatoria Abierta Universal",
    desc: "Ingreso libre y deliberativo para cualquier habitante del territorio sin filtros previos.",
  },
  delegacion_comunitaria: {
    label: "Delegación Comunitaria / Organizacional",
    desc: "Voceros elegidos por Juntas de Acción Comunal (JAC), gremios o colectivos sectoriales.",
  },
  mixta: {
    label: "Convocatoria Mixta (Azar + Organizaciones)",
    desc: "Ponderación combinada entre liderazgos tradicionales y ciudadanos convocados por sorteo.",
  },
};

export function MesaSorteoAzar({ mesa, soloLectura = false }: MesaSorteoAzarProps) {
  const sorteo: ConfiguracionSorteoAzar = mesa.sorteoAzar ?? {
    metodoConvocatoria: "sorteo_civico_aleatorio",
    intervencionesSorteo: [],
  };

  const ejecutarSorteoIntervencion = useMesasStore((s) => s.ejecutarSorteoIntervencion);
  const eliminarSorteoIntervencion = useMesasStore((s) => s.eliminarSorteoIntervencion);
  const generarMuestraAleatoriaAsistencia = useMesasStore(
    (s) => s.generarMuestraAleatoriaAsistencia
  );
  const actualizarMetodoConvocatoria = useMesasStore((s) => s.actualizarMetodoConvocatoria);

  const registrosAsistencia = useRegistrosMesa(mesa.id);

  // Estados de interfaz
  const [temaIntervencion, setTemaIntervencion] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState(3);
  const [sorteando, setSorteando] = useState(false);
  const [ultimoSorteado, setUltimoSorteado] = useState<{ id: string; nombre: string } | null>(null);

  // Muestra de auditoría
  const [tamanoMuestraInput, setTamanoMuestraInput] = useState<number>(5);

  // Asistentes elegibles para sorteo (que aún no han intervenido)
  const yaSorteadosIds = useMemo(
    () => new Set(sorteo.intervencionesSorteo.map((i) => i.asistenteId)),
    [sorteo.intervencionesSorteo]
  );
  const asistentesDisponibles = useMemo(() => {
    return registrosAsistencia.filter((a) => !yaSorteadosIds.has(a.id));
  }, [registrosAsistencia, yaSorteadosIds]);

  const handleSortearPalabra = () => {
    if (soloLectura) return;
    if (registrosAsistencia.length === 0) {
      toast.error(
        "No hay asistentes registrados en la mesa aún. Registra participantes en el módulo de Asistencia."
      );
      return;
    }

    if (asistentesDisponibles.length === 0) {
      toast.info("Todos los asistentes registrados ya han sido sorteados para intervenir.");
      return;
    }

    setSorteando(true);

    // Simulación accesible de sorteo
    setTimeout(() => {
      const indice = Math.floor(Math.random() * asistentesDisponibles.length);
      const elegido = asistentesDisponibles[indice];

      ejecutarSorteoIntervencion(
        mesa.id,
        { id: elegido.id, nombre: elegido.nombreCompleto },
        duracionMinutos,
        temaIntervencion.trim() || undefined
      );

      setUltimoSorteado({ id: elegido.id, nombre: elegido.nombreCompleto });
      setSorteando(false);
      setTemaIntervencion("");
      toast.success(`Turno sorteado: ${elegido.nombreCompleto}`);
    }, 600);
  };

  const handleGenerarMuestra = () => {
    if (soloLectura) return;
    if (registrosAsistencia.length === 0) {
      toast.error("No hay asistentes para muestreo.");
      return;
    }

    const ids = registrosAsistencia.map((r) => r.id);
    const muestra = generarMuestraAleatoriaAsistencia(mesa.id, ids, tamanoMuestraInput);
    toast.success(`Muestra aleatoria de auditoría generada (${muestra.length} asistentes)`);
  };

  return (
    <div className="space-y-6" data-testid="mesa-sorteo-azar">
      {/* Banner Principal de Democracia Deliberativa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Fase 2: Ejecución Deliberativa
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">•</span>
            <span className="text-xs font-semibold text-[var(--ember)]">
              Democracia por Sorteo (Sortición)
            </span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            Sorteo Cívico al Azar y Distribución Equitativa de la Palabra
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Mecanismo para mitigar la captura de la palabra por líderes hegemónicos y dar voz imparcial a la ciudadanía
          </p>
        </div>

        <Badge variant="ember" className="text-xs shrink-0 flex items-center gap-1.5 py-1">
          <Users className="size-3.5" aria-hidden="true" />
          <span>{registrosAsistencia.length} Asistentes en Padrón</span>
        </Badge>
      </div>

      {/* Método de Convocatoria */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Modalidad de Convocatoria de la Mesa
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              {METODOS_CONVOCATORIA_LABELS[sorteo.metodoConvocatoria]?.desc}
            </p>
          </div>

          {!soloLectura ? (
            <Select
              value={sorteo.metodoConvocatoria}
              onValueChange={(val) =>
                actualizarMetodoConvocatoria(mesa.id, val as MetodoConvocatoriaMesa)
              }
            >
              <SelectTrigger className="text-xs h-8 w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METODOS_CONVOCATORIA_LABELS) as MetodoConvocatoriaMesa[]).map((met) => (
                  <SelectItem key={met} value={met} className="text-xs">
                    {METODOS_CONVOCATORIA_LABELS[met].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-xs">
              {METODOS_CONVOCATORIA_LABELS[sorteo.metodoConvocatoria]?.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Sorteo de Turnos de Palabra en Plenaria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Motor de Sorteo */}
        <div className="md:col-span-1 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
          <div className="flex items-center gap-2">
            <Shuffle className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Sortear Turno de Palabra
            </h4>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Selecciona de manera 100% aleatoria a un ciudadano presente en la sala para exponer su propuesta o testimonio.
          </p>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Tema de intervención (opcional)
              </Label>
              <Input
                value={temaIntervencion}
                onChange={(e) => setTemaIntervencion(e.target.value)}
                placeholder="Ej. Priorización de alumbrado en UCG-03"
                className="text-xs"
                disabled={soloLectura}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Tiempo asignado (minutos)
              </Label>
              <Select
                value={String(duracionMinutos)}
                onValueChange={(val) => setDuracionMinutos(Number(val))}
                disabled={soloLectura}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2" className="text-xs">2 Minutos (Intervención rápida)</SelectItem>
                  <SelectItem value="3" className="text-xs">3 Minutos (Estándar metodológico)</SelectItem>
                  <SelectItem value="5" className="text-xs">5 Minutos (Profundización técnica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ember"
              size="default"
              onClick={handleSortearPalabra}
              disabled={soloLectura || sorteando || registrosAsistencia.length === 0}
              className="w-full text-xs font-bold shadow-xs mt-2"
              data-testid="btn-sortear-palabra"
            >
              <Shuffle className={`size-3.5 mr-1.5 ${sorteando ? "animate-spin" : ""}`} aria-hidden="true" />
              {sorteando ? "Sorteando ciudadano..." : "Sortear Turno al Azar"}
            </Button>

            <span className="block text-[11px] text-center text-[var(--text-tertiary)]">
              {asistentesDisponibles.length} de {registrosAsistencia.length} disponibles
            </span>
          </div>

          {/* Anuncio del último sorteado */}
          {ultimoSorteado && (
            <div className="p-3.5 rounded-xl border border-[var(--ember)]/30 bg-[var(--surface-2)] space-y-1.5 text-center animate-in fade-in zoom-in-95 duration-200">
              <span className="text-[10px] uppercase font-bold text-[var(--ember)] flex items-center justify-center gap-1">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Turno Asignado en Vivo
              </span>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {ultimoSorteado.nombre}
              </p>
              <Badge variant="success" className="text-[10px]">
                {duracionMinutos} minutos para hablar
              </Badge>
            </div>
          )}
        </div>

        {/* Columna Derecha: Lista de Turnos Sorteados */}
        <div className="md:col-span-2 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <ListOrdered className="size-4 text-[var(--ember)]" aria-hidden="true" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Turnos de Palabra Sorteados ({sorteo.intervencionesSorteo.length})
              </h4>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
              Orden de Exposición
            </span>
          </div>

          {sorteo.intervencionesSorteo.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-tertiary)] rounded-xl border border-dashed border-[var(--border)] space-y-1">
              <Shuffle className="size-8 mx-auto text-[var(--text-tertiary)]/50" aria-hidden="true" />
              <p className="font-semibold text-[var(--text-primary)]">
                Aún no se han sorteado turnos de palabra
              </p>
              <p>
                Haz clic en el botón de sorteo para invitar al estrado a los ciudadanos inscritos.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {sorteo.intervencionesSorteo.map((interv, idx) => (
                <div
                  key={`${interv.asistenteId}-${idx}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--text-inverse)] font-mono font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--text-primary)] truncate">
                        {interv.nombre}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {interv.tema}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex items-center gap-1">
                      <Clock className="size-3" aria-hidden="true" />
                      {interv.horaSorteo} ({interv.duracionMinutos} min)
                    </span>

                    {!soloLectura && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => eliminarSorteoIntervencion(mesa.id, interv.asistenteId)}
                        aria-label={`Eliminar turno de ${interv.nombre}`}
                        className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Muestra Aleatoria para Auditoría y Fe Pública */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--success)]" aria-hidden="true" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Muestreo Aleatorio de Verificación Cívica (Auditoría Forense)
              </h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Genera una submuestra probabilística de asistentes para verificar autenticidad de firmas y testimonios
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">Tamaño muestra:</span>
            <Input
              type="number"
              min={1}
              max={registrosAsistencia.length || 10}
              value={tamanoMuestraInput}
              onChange={(e) => setTamanoMuestraInput(Number(e.target.value))}
              className="w-16 text-xs h-8 font-mono"
              disabled={soloLectura}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerarMuestra}
              disabled={soloLectura || registrosAsistencia.length === 0}
              className="text-xs h-8"
            >
              Generar Muestra
            </Button>
          </div>
        </div>

        {sorteo.muestraAleatoriaAuditoria && sorteo.muestraAleatoriaAuditoria.length > 0 && (
          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Asistentes seleccionados por muestreo aleatorio ({sorteo.muestraAleatoriaAuditoria.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sorteo.muestraAleatoriaAuditoria.map((asistenteId) => {
                const reg = registrosAsistencia.find((r) => r.id === asistenteId);
                return (
                  <Badge key={asistenteId} variant="outline" className="text-[10px] font-mono">
                    <CheckCircle2 className="size-3 text-[var(--success)] mr-1" aria-hidden="true" />
                    {reg?.nombreCompleto ?? asistenteId}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
