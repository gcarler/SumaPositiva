"use client";

import { useState, useMemo } from "react";
import { Calendar, MapPin, Clock, Users, Filter } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import {
  AGENDA_MESAS,
  TIPOS_MESA,
  ESTADO_MESA,
  mesasPorTipo,
  totalPorTipo,
  type TipoMesa,
  type EstadoMesa,
} from "@/features/mesas/data/agenda.data";

const COLORES_TIPO: Record<TipoMesa, string> = {
  territorial: "bg-[#e85d04]/10 text-[#e85d04] border-[#e85d04]/30",
  rural_insular: "bg-[#2d6a4f]/10 text-[#2d6a4f] border-[#2d6a4f]/30",
  poblacional: "bg-[#3a86ff]/10 text-[#3a86ff] border-[#3a86ff]/30",
  sectorial: "bg-[#6d6875]/10 text-[#6d6875] border-[#6d6875]/30",
};

const COLORES_ESTADO: Record<EstadoMesa, string> = {
  programada: "bg-[var(--surface-2)] text-[var(--text-secondary)]",
  en_curso: "bg-[#2d6a4f]/15 text-[#2d6a4f]",
  realizada: "bg-[var(--surface-2)] text-[var(--text-tertiary)]",
  cancelada: "bg-red-500/10 text-red-600",
  reprogramada: "bg-amber-500/10 text-amber-700",
};

function formatFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ResumenTipo() {
  const totales = totalPorTipo();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(Object.entries(TIPOS_MESA) as [TipoMesa, string][]).map(([tipo, label]) => (
        <div
          key={tipo}
          className={`rounded-xl border p-4 ${COLORES_TIPO[tipo]}`}
        >
          <p className="text-2xl font-bold tabular-nums">{totales[tipo] ?? 0}</p>
          <p className="text-xs font-medium mt-1">{label}s</p>
        </div>
      ))}
    </div>
  );
}

export function AgendaMesasView() {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const editar = puedeEditar(sesion, "mesas");

  const [filtroTipo, setFiltroTipo] = useState<TipoMesa | "todos">("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoMesa | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");

  const lista = useMemo(() => {
    return AGENDA_MESAS.filter((m) => {
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && m.estado !== filtroEstado) return false;
      if (busqueda) {
        const q = busqueda.toLocaleLowerCase("es");
        return (
          m.nombre.toLocaleLowerCase("es").includes(q) ||
          m.territorio.toLocaleLowerCase("es").includes(q) ||
          m.lugar.toLocaleLowerCase("es").includes(q)
        );
      }
      return true;
    });
  }, [filtroTipo, filtroEstado, busqueda]);

  // Agrupar por fecha
  const porFecha = useMemo(() => {
    const grupos = new Map<string, typeof lista>();
    for (const m of lista) {
      if (!grupos.has(m.fecha)) grupos.set(m.fecha, []);
      grupos.get(m.fecha)!.push(m);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [lista]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Política Pública de Seguridad Humana Integral 2026–2036"
        title="Agenda de Mesas de Trabajo"
        description={`${AGENDA_MESAS.length} mesas programadas — 4 tipos: Territoriales · Rurales e Insulares · Poblacionales · Sectoriales`}
        action={
          editar && (
            <Button onClick={() => openPanel("mesa-editor", {})}>
              + Crear mesa
            </Button>
          )
        }
      />

      {/* Resumen por tipo */}
      <ResumenTipo />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <Filter className="size-4 text-[var(--text-tertiary)] shrink-0" />

        <input
          type="search"
          placeholder="Buscar por nombre, territorio o lugar…"
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
          onChange={(e) => setFiltroEstado(e.target.value as EstadoMesa | "todos")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--ember)]"
        >
          <option value="todos">Todos los estados</option>
          {(Object.entries(ESTADO_MESA) as [EstadoMesa, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <span className="text-xs text-[var(--text-tertiary)] ml-auto">
          {lista.length} de {AGENDA_MESAS.length} mesas
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
              {/* Encabezado de fecha */}
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

              {/* Cards de mesas */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {mesas.map((mesa) => (
                  <article
                    key={mesa.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-shadow hover:shadow-md"
                  >
                    {/* Badge tipo + estado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLORES_TIPO[mesa.tipo]}`}>
                        {TIPOS_MESA[mesa.tipo]}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ESTADO[mesa.estado]}`}>
                        {ESTADO_MESA[mesa.estado]}
                      </span>
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
                        <span>{mesa.horaInicio} – {mesa.horaFin}</span>
                      </div>
                      {mesa.responsable && (
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
                          <span className="text-xs text-[var(--text-tertiary)] line-clamp-1">{mesa.responsable}</span>
                        </div>
                      )}
                    </div>

                    {/* Dimensiones ONU */}
                    <div className="flex flex-wrap gap-1">
                      {mesa.dimensionesONU.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Observaciones */}
                    {mesa.observaciones && (
                      <p className="text-xs text-[var(--text-tertiary)] italic border-t border-[var(--border)] pt-2">
                        ⚠ {mesa.observaciones}
                      </p>
                    )}

                    {/* Acción */}
                    <Button
                      variant="outline"
                      className="mt-auto text-xs"
                      onClick={() => openPanel("mesa", { mesaId: mesa.id })}
                    >
                      Ver detalle →
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-tertiary)] text-center pt-4 border-t border-[var(--border)]">
        *** Las mesas y sus respectivos horarios son susceptibles a cambios •
        Secretaría de Planeación Distrital de Cartagena
      </p>
    </div>
  );
}
