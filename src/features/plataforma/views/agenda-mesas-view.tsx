"use client";

import { useState, useMemo } from "react";
import { Calendar, MapPin, Clock, Users, Filter, Pencil } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import {
  TIPOS_MESA,
  ESTADO_MESA,
  totalPorTipo,
  type TipoMesa,
  type EstadoMesa,
} from "@/features/mesas/data/agenda.data";

const COLORES_TIPO: Record<TipoMesa, string> = {
  territorial:   "bg-[#e85d04]/10 text-[#e85d04] border-[#e85d04]/30",
  rural_insular: "bg-[#2d6a4f]/10 text-[#2d6a4f] border-[#2d6a4f]/30",
  poblacional:   "bg-[#3a86ff]/10 text-[#3a86ff] border-[#3a86ff]/30",
  sectorial:     "bg-[#6d6875]/10 text-[#6d6875] border-[#6d6875]/30",
};

const COLORES_ESTADO: Record<string, string> = {
  programada:   "bg-[var(--surface-2)] text-[var(--text-secondary)]",
  en_curso:     "bg-[#2d6a4f]/15 text-[#2d6a4f]",
  cerrada:      "bg-[var(--surface-2)] text-[var(--text-tertiary)]",
  realizada:    "bg-[var(--surface-2)] text-[var(--text-tertiary)]",
  cancelada:    "bg-red-500/10 text-red-600",
  reprogramada: "bg-amber-500/10 text-amber-700",
};

function formatFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function AgendaMesasView() {
  const { openPanel } = usePanels();
  const sesion  = useSesionStore((s) => s.sesion);
  const editar  = puedeEditar(sesion, "mesas");

  // Leer del store (que ya contiene las mesas de agenda + mesas de trabajo)
  const todasMesas = useMesasStore((s) => s.mesas);

  // Solo mesas que vienen de la agenda (tienen tipoMesa definido)
  const mesasAgenda = useMemo(
    () => todasMesas.filter((m) => !!m.tipoMesa),
    [todasMesas],
  );

  const [filtroTipo,   setFiltroTipo]   = useState<TipoMesa | "todos">("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda,     setBusqueda]     = useState("");

  const lista = useMemo(() => {
    return mesasAgenda.filter((m) => {
      if (filtroTipo   !== "todos" && m.tipoMesa !== filtroTipo)   return false;
      if (filtroEstado !== "todos" && m.estado   !== filtroEstado) return false;
      if (busqueda) {
        const q = busqueda.toLocaleLowerCase("es");
        return (
          m.nombre.toLocaleLowerCase("es").includes(q) ||
          m.lugar .toLocaleLowerCase("es").includes(q) ||
          m.entidad.toLocaleLowerCase("es").includes(q)
        );
      }
      return true;
    });
  }, [mesasAgenda, filtroTipo, filtroEstado, busqueda]);

  // Agrupar por fecha
  const porFecha = useMemo(() => {
    const grupos = new Map<string, typeof lista>();
    for (const m of lista) {
      if (!grupos.has(m.fecha)) grupos.set(m.fecha, []);
      grupos.get(m.fecha)!.push(m);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [lista]);

  const totales = totalPorTipo();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Política Pública de Seguridad Humana Integral 2026–2036"
        title="Agenda de Mesas de Trabajo"
        description={`${mesasAgenda.length} mesas programadas · oct 15 – dic 11 de 2026`}
        action={
          editar && (
            <Button onClick={() => openPanel("mesa-editor", {})}>
              + Crear mesa
            </Button>
          )
        }
      />

      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.entries(TIPOS_MESA) as [TipoMesa, string][]).map(([tipo, label]) => (
          <button
            key={tipo}
            onClick={() => setFiltroTipo(filtroTipo === tipo ? "todos" : tipo)}
            className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${COLORES_TIPO[tipo]} ${filtroTipo === tipo ? "ring-2 ring-current" : ""}`}
          >
            <p className="text-2xl font-bold tabular-nums">{totales[tipo] ?? 0}</p>
            <p className="text-xs font-medium mt-1">{label}s</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <Filter className="size-4 text-[var(--text-tertiary)] shrink-0" />
        <input
          type="search"
          placeholder="Buscar por nombre, lugar o entidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 min-w-48 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--ember)]"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoMesa | "todos")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--ember)]"
        >
          <option value="todos">Todos los tipos</option>
          {(Object.entries(TIPOS_MESA) as [TipoMesa, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--ember)]"
        >
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADO_MESA).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className="text-xs text-[var(--text-tertiary)] ml-auto">
          {lista.length} de {mesasAgenda.length} mesas
        </span>
      </div>

      {/* Lista agrupada por fecha */}
      {porFecha.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
          <Calendar className="size-12 text-[var(--text-tertiary)]" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">No se encontraron mesas</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Ajusta los filtros o crea una nueva mesa</p>
          </div>
          {editar && (
            <Button variant="outline" onClick={() => openPanel("mesa-editor", {})}>
              + Crear primera mesa
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {porFecha.map(([fecha, mesas]) => (
            <section key={fecha} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-[var(--ember)] px-4 py-1.5">
                  <Calendar className="size-3.5 text-white" />
                  <span className="text-xs font-semibold text-white capitalize">
                    {formatFecha(fecha)}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {mesas.length} mesa{mesas.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {mesas.map((mesa) => (
                  <article
                    key={mesa.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-shadow hover:shadow-md"
                  >
                    {/* Badge tipo + estado + editar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {mesa.tipoMesa && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLORES_TIPO[mesa.tipoMesa as TipoMesa] ?? ""}`}>
                          {TIPOS_MESA[mesa.tipoMesa as TipoMesa] ?? mesa.tipoMesa}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ESTADO[mesa.estado] ?? ""}`}>
                        {ESTADO_MESA[mesa.estado as keyof typeof ESTADO_MESA] ?? mesa.estado}
                      </span>
                      {editar && (
                        <button
                          onClick={() => openPanel("mesa-editor", { mesaId: mesa.id })}
                          className="ml-auto rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--ember)] transition-colors"
                          title="Editar mesa"
                          aria-label={`Editar ${mesa.nombre}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Nombre */}
                    <h3 className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
                      {mesa.nombre}
                    </h3>

                    {/* Metadatos */}
                    <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-start gap-2">
                        <MapPin className="size-3.5 mt-0.5 shrink-0 text-[var(--ember)]" />
                        <span className="line-clamp-2">{mesa.lugar}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 shrink-0 text-[var(--ember)]" />
                        <span>{mesa.horario ?? `${mesa.fecha}`}</span>
                      </div>
                      {mesa.entidad && mesa.entidad !== "Secretaría de Planeación Distrital" && (
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
                          <span className="text-xs text-[var(--text-tertiary)] line-clamp-1">{mesa.entidad}</span>
                        </div>
                      )}
                    </div>

                    {/* Dimensión ONU */}
                    {mesa.dimensionOnu && (
                      <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--text-tertiary)] w-fit">
                        {mesa.dimensionOnu}
                      </span>
                    )}

                    {/* Observaciones */}
                    {mesa.descripcion && (
                      <p className="text-xs text-[var(--text-tertiary)] italic border-t border-[var(--border)] pt-2">
                        ⚠ {mesa.descripcion}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 mt-auto">
                      <Button
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => openPanel("mesa", { mesaId: mesa.id })}
                      >
                        Ver detalle
                      </Button>
                      {editar && (
                        <Button
                          variant="outline"
                          className="text-xs px-3"
                          onClick={() => openPanel("mesa-editor", { mesaId: mesa.id })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-tertiary)] text-center pt-4 border-t border-[var(--border)]">
        *** Las mesas y sus respectivos horarios son susceptibles a cambios •
        Secretaría de Planeación Distrital de Cartagena de Indias
      </p>
    </div>
  );
}
