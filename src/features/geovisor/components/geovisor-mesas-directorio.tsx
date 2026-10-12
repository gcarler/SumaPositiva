"use client";

import React, { useMemo, useState } from "react";
import { Calendar, MapPin, Navigation, Search, Users } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { StatusBadge } from "@/shared/ui/status-badge";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";
import { cn } from "@/shared/lib/utils";

export interface GeovisorMesasDirectorioProps {
  mesas: MesaGeovisor[];
  mesaSeleccionadaId: string | null;
  onSelectMesa: (mesaId: string | null) => void;
  onLocalizarEnMapa: (mesa: MesaGeovisor) => void;
  className?: string;
}

type FiltroEstado = "todas" | "realizadas" | "programadas";

/** Directorio de mesas con búsqueda reactiva y acción «Ubicar en Mapa». */
export function GeovisorMesasDirectorio({
  mesas,
  mesaSeleccionadaId,
  onSelectMesa,
  onLocalizarEnMapa,
  className,
}: GeovisorMesasDirectorioProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todas");

  // Filtrado reactivo de mesas
  const mesasFiltradas = useMemo(() => {
    return mesas.filter((mesa) => {
      // Filtro de texto (nombre, territorio, lugar)
      const q = busqueda.trim().toLowerCase();
      const coincideTexto =
        !q ||
        mesa.nombre.toLowerCase().includes(q) ||
        (mesa.territorio_nombre?.toLowerCase() ?? "").includes(q) ||
        (mesa.codigo_oficial?.toLowerCase() ?? "").includes(q);

      // Filtro de estado
      const coincideEstado =
        filtroEstado === "todas" ||
        (filtroEstado === "realizadas" && mesa.realizada) ||
        (filtroEstado === "programadas" && !mesa.realizada);

      return coincideTexto && coincideEstado;
    });
  }, [mesas, busqueda, filtroEstado]);

  return (
    <div
      data-testid="geovisor-mesas-directorio"
      className={cn("flex h-full min-h-0 flex-col gap-2.5 overflow-hidden p-3", className)}
    >
    {/* Barra de búsqueda reactiva */}
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <Input
        type="text"
        placeholder="Buscar mesa o barrio…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="h-8 pl-8 text-xs bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        aria-label="Buscar en el directorio de mesas de diálogo"
      />
    </div>

    {/* Filtros rápidos por estado */}
    <div className="flex items-center gap-1.5 pb-1">
      <Button
        variant={filtroEstado === "todas" ? "default" : "outline"}
        size="sm"
        onClick={() => setFiltroEstado("todas")}
        className="h-6 px-2 text-[10px]"
      >
        Todas ({mesas.length})
      </Button>
      <Button
        variant={filtroEstado === "realizadas" ? "default" : "outline"}
        size="sm"
        onClick={() => setFiltroEstado("realizadas")}
        className="h-6 px-2 text-[10px]"
      >
        Realizadas ({mesas.filter((m) => m.realizada).length})
      </Button>
      <Button
        variant={filtroEstado === "programadas" ? "default" : "outline"}
        size="sm"
        onClick={() => setFiltroEstado("programadas")}
        className="h-6 px-2 text-[10px]"
      >
        Programadas ({mesas.filter((m) => !m.realizada).length})
      </Button>
    </div>

    {/* Lista scrolleable de tarjetas de mesa */}
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {mesasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--text-tertiary)]">
          <MapPin className="mb-2 size-6 stroke-1 text-[var(--text-tertiary)]" />
          <p>No se encontraron mesas que coincidan con la búsqueda.</p>
        </div>
      ) : (
        mesasFiltradas.map((mesa) => {
          const esActiva = mesa.id === mesaSeleccionadaId;
          return (
            <div
              key={mesa.id}
              onClick={() => onSelectMesa(mesa.id)}
              className={cn(
                "group relative flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all cursor-pointer text-xs",
                esActiva
                  ? "border-[var(--ember)] bg-[var(--surface-0)] shadow-xs ring-1 ring-[var(--ember)]"
                  : "border-[var(--border)] bg-[var(--surface-0)]/60 hover:border-[var(--ember)]/50 hover:bg-[var(--surface-0)]"
              )}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-semibold text-[var(--text-primary)] line-clamp-1">
                  {mesa.nombre}
                </span>
                <StatusBadge tone={mesa.realizada ? "success" : "warning"}>
                  {mesa.realizada ? "Realizada" : "Programada"}
                </StatusBadge>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-tertiary)]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3 text-[var(--ember)]" />
                  {mesa.territorio_nombre ?? "Cartagena"}
                </span>
                {mesa.fecha && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3 text-[var(--text-tertiary)]" />
                    {mesa.fecha}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3 text-[var(--text-tertiary)]" />
                  {mesa.total_asistentes}
                </span>
              </div>

              {/* Botón de acción: Ubicar en Mapa */}
              <div className="pt-1 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMesa(mesa.id);
                    onLocalizarEnMapa(mesa);
                  }}
                  className="h-6 gap-1 px-2 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--ember)]"
                  aria-label={`Ubicar en mapa la mesa ${mesa.nombre}`}
                >
                  <Navigation className="size-2.5 text-[var(--ember)]" />
                  <span>Ubicar en Mapa</span>
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
    </div>
  );
}
