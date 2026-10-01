"use client";

import { useMemo, useState } from "react";
import { CalendarClock, MapPin, Upload, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useSesionStore, tienePermiso } from "@/features/sesion/state/session-store";
import { subirFotoMesa, type MesaGeovisor } from "../services/mesas-geovisor-api";

function fechaLocal(fecha: string | null): string {
  if (!fecha) return "Fecha no registrada";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(`${fecha}T12:00:00`));
}

function estadoMesa(mesa: MesaGeovisor): { etiqueta: string; tono: "success" | "warning" } {
  return mesa.realizada ? { etiqueta: "Realizada", tono: "success" } : { etiqueta: "No realizada", tono: "warning" };
}

function FormularioFotoMesa({ mesa }: { mesa: MesaGeovisor }) {
  const sesion = useSesionStore((state) => state.sesion);
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [autorizada, setAutorizada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (!tienePermiso(sesion, "mesas:fotos:subir")) return null;

  async function enviar() {
    if (!archivo || !autorizada) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await subirFotoMesa(mesa.id, archivo, autorizada);
      setArchivo(null);
      setAutorizada(false);
      setMensaje("Foto enviada; se mostrará cuando tenga aprobación institucional.");
      void queryClient.invalidateQueries({ queryKey: ["geovisor", "mesas"] });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo enviar la foto.");
    } finally {
      setEnviando(false);
    }
  }

  const idArchivo = `foto-mesa-${mesa.id}`;
  const idAutorizacion = `autorizacion-foto-mesa-${mesa.id}`;
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
      <Label htmlFor={idArchivo}>Subir fotografía (JPEG, PNG o WebP)</Label>
      <Input id={idArchivo} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} />
      <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        <Checkbox id={idAutorizacion} checked={autorizada} onCheckedChange={(checked) => setAutorizada(checked === true)} />
        <Label htmlFor={idAutorizacion} className="font-normal">Confirmo que tengo autorización para compartir esta imagen. Entiendo que la publicación requiere aprobación institucional.</Label>
      </div>
      <Button type="button" size="sm" disabled={!archivo || !autorizada || enviando} onClick={enviar}>
        <Upload aria-hidden="true" className="size-3.5" /> {enviando ? "Enviando…" : "Enviar para revisión"}
      </Button>
      {mensaje && <p role="status" className="text-xs text-[var(--text-secondary)]">{mensaje}</p>}
    </div>
  );
}

function MesaDetalle({ mesa }: { mesa: MesaGeovisor }) {
  const estado = estadoMesa(mesa);
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-4" aria-label={`Detalle de ${mesa.nombre}`}>
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-[var(--text-primary)]">{mesa.nombre}</h3><p className="text-xs text-[var(--text-secondary)]">{mesa.territorio_nombre ?? "Sin territorio registrado"} · {fechaLocal(mesa.fecha)} · {mesa.horario ?? "hora no registrada"}</p></div><StatusBadge tone={estado.tono}>{estado.etiqueta}</StatusBadge></div>
      <p className="mt-2 text-sm text-[var(--text-primary)]">Asistencia registrada: <strong>{mesa.total_asistentes.toLocaleString("es-CO")}</strong></p>
      {mesa.tipo_ubicacion && <p className="mt-2 text-xs text-[var(--text-tertiary)]">La marca cartográfica corresponde al centroide del territorio; no representa la ubicación precisa de la reunión.</p>}
      {mesa.fotos.length > 0 ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{mesa.fotos.map((foto) => <figure key={foto.id}><img src={foto.archivo_url} alt={foto.descripcion} loading="lazy" className="aspect-[4/3] w-full rounded-lg border border-[var(--border)] object-cover" /><figcaption className="mt-1 text-[10px] text-[var(--text-tertiary)]">Foto aprobada</figcaption></figure>)}</div> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">Esta mesa no tiene fotos aprobadas para publicación.</p>}
      <FormularioFotoMesa mesa={mesa} />
    </article>
  );
}

export function MesasGeovisor({ mesas, isLoading, isError, error, seleccionada, onSeleccionar }: {
  mesas: MesaGeovisor[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  seleccionada: string | null;
  onSeleccionar: (mesaId: string | null) => void;
}) {
  const actual = useMemo(() => mesas.find((mesa) => mesa.id === seleccionada) ?? null, [mesas, seleccionada]);

  return (
    <section aria-labelledby="mesas-geovisor-heading" className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Participación deliberativa · datos persistidos</p>
          <h2 id="mesas-geovisor-heading" className="text-lg font-semibold text-[var(--text-primary)]">Realización de mesas</h2>
          <p className="mt-1 max-w-3xl text-xs text-[var(--text-secondary)]">Verde: acta concertada/finalizada. Ámbar: aún no realizada formalmente. Los puntos indican centroides territoriales de referencia, no el lugar exacto del evento.</p>
        </div>
        <div className="flex gap-2"><StatusBadge tone="success">Realizada</StatusBadge><StatusBadge tone="warning">No realizada</StatusBadge></div>
      </div>
      {isLoading && <p role="status" className="text-sm text-[var(--text-secondary)]">Cargando mesas registradas…</p>}
      {isError && <p role="alert" className="text-sm text-[var(--danger)]">No se pudieron cargar las mesas persistidas. {error instanceof Error ? error.message : "Intenta más tarde."}</p>}
      {!isLoading && !isError && mesas.length === 0 && <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">No hay mesas persistidas para mostrar todavía. No se presentan registros de demostración.</p>}
      {mesas.length > 0 && <>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mesas.map((mesa) => {
            const estado = estadoMesa(mesa);
            return <li key={mesa.id}><Button variant="unstyled" size="unstyled" className={`flex h-full w-full flex-col items-stretch rounded-xl border p-3 text-left transition-colors hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ember)] ${seleccionada === mesa.id ? "border-[var(--ember)] bg-[var(--ember-soft)]" : "border-[var(--border)] bg-[var(--surface-1)]"}`} aria-pressed={seleccionada === mesa.id} onClick={() => onSeleccionar(seleccionada === mesa.id ? null : mesa.id)}>
              <span className="flex items-start justify-between gap-2"><span className="font-semibold text-[var(--text-primary)]">{mesa.nombre}</span><StatusBadge tone={estado.tono}>{estado.etiqueta}</StatusBadge></span>
              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]"><span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />{fechaLocal(mesa.fecha)}{mesa.horario ? ` · ${mesa.horario}` : " · Hora no registrada"}</span><span className="inline-flex items-center gap-1"><Users className="size-3.5" />{mesa.total_asistentes.toLocaleString("es-CO")} asistentes</span></span>
              <span className="mt-2 inline-flex items-start gap-1 text-xs text-[var(--text-tertiary)]"><MapPin className="mt-0.5 size-3.5 shrink-0" />{mesa.territorio_nombre ?? "Territorio no indicado"}{mesa.tipo_ubicacion ? " · punto de referencia territorial" : ""}</span>
              <span className="mt-2 text-[10px] text-[var(--text-tertiary)]">{mesa.fotos.length} {mesa.fotos.length === 1 ? "foto aprobada" : "fotos aprobadas"}</span>
            </Button></li>;
          })}
        </ul>
        {actual && <MesaDetalle mesa={actual} />}
      </>}
    </section>
  );
}
