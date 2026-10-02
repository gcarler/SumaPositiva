"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  MapPin,
  Users,
  Camera,
  LocateFixed,
  ExternalLink,
  Search,
  X,
  Table as TableIcon,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";
import type { ModoVistaMesas } from "./mesas-datagrid/datagrid-toolbar";

interface MesasCardsViewProps {
  mesas: MesaGeovisor[];
  seleccionada: string | null;
  onSeleccionar: (mesaId: string | null) => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
  onLocalizarEnMapa?: (mesa: MesaGeovisor) => void;
  modoVista: ModoVistaMesas;
  onModoVistaChange: (modo: ModoVistaMesas) => void;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "Fecha no registrada";
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(
      new Date(`${fecha}T12:00:00`)
    );
  } catch {
    return fecha;
  }
}

export function MesasCardsView({
  mesas,
  seleccionada,
  onSeleccionar,
  onAbrirPanelMesa,
  onLocalizarEnMapa,
  modoVista,
  onModoVistaChange,
}: MesasCardsViewProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTerritorio, setFiltroTerritorio] = useState("todos");

  const territoriosDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    mesas.forEach((m) => {
      if (m.territorio_nombre) {
        mapa.set(m.territorio_codigo ?? m.territorio_nombre, m.territorio_nombre);
      }
    });
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [mesas]);

  const filtradas = useMemo(() => {
    return mesas.filter((m) => {
      if (filtroEstado === "realizadas" && !m.realizada) return false;
      if (filtroEstado === "programadas" && m.realizada) return false;
      if (
        filtroTerritorio !== "todos" &&
        m.territorio_codigo !== filtroTerritorio &&
        m.territorio_nombre !== filtroTerritorio
      ) {
        return false;
      }
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const okNombre = m.nombre.toLowerCase().includes(query);
        const okTerritorio = (m.territorio_nombre ?? "").toLowerCase().includes(query);
        const okId = m.id.toLowerCase().includes(query);
        if (!okNombre && !okTerritorio && !okId) return false;
      }
      return true;
    });
  }, [mesas, filtroEstado, filtroTerritorio, busqueda]);

  return (
    <div className="space-y-4">
      {/* Barra de filtros para tarjetas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              type="text"
              placeholder="Buscar por mesa, territorio o código…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-[var(--surface-0)] border-[var(--border)]"
            />
            {busqueda && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>

          <div className="w-[140px]">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="h-8 text-xs bg-[var(--surface-0)] border-[var(--border)]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="realizadas">Realizadas</SelectItem>
                <SelectItem value="programadas">Programadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[170px]">
            <Select value={filtroTerritorio} onValueChange={setFiltroTerritorio}>
              <SelectTrigger className="h-8 text-xs bg-[var(--surface-0)] border-[var(--border)]">
                <SelectValue placeholder="Territorio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los territorios</SelectItem>
                {territoriosDisponibles.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Switcher de Vista */}
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-0.5">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => onModoVistaChange("tabla")}
            title="Vista DataGrid Empresarial"
            className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors ${
              modoVista === "tabla"
                ? "bg-[var(--ember)] text-[var(--surface-0)] shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            }`}
          >
            <TableIcon className="size-3.5" />
            <span className="hidden md:inline">Tabla</span>
          </Button>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => onModoVistaChange("tarjetas")}
            title="Vista Tarjetas Visuales"
            className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors ${
              modoVista === "tarjetas"
                ? "bg-[var(--ember)] text-[var(--surface-0)] shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden md:inline">Tarjetas</span>
          </Button>
        </div>
      </div>

      {/* Grid de tarjetas rediseñadas */}
      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-secondary)]">
          No se encontraron mesas de trabajo con los criterios de búsqueda actuales.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((mesa) => {
            const esSeleccionada = seleccionada === mesa.id;
            return (
              <li key={mesa.id}>
                <div
                  className={`group relative flex h-full flex-col justify-between rounded-xl border p-4 transition-all ${
                    esSeleccionada
                      ? "border-[var(--ember)] bg-[var(--ember-soft)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/50"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Encabezado de la tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Cód. {mesa.id.toUpperCase()}
                        </span>
                        <h3 className="font-semibold text-sm leading-snug text-[var(--text-primary)]">
                          {mesa.nombre}
                        </h3>
                      </div>
                      <StatusBadge tone={mesa.realizada ? "success" : "warning"}>
                        {mesa.realizada ? "Realizada" : "Programada"}
                      </StatusBadge>
                    </div>

                    {/* Metadatos */}
                    <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
                        <span className="tabular">{formatearFecha(mesa.fecha)}</span>
                        {mesa.horario && (
                          <span className="text-[11px] text-[var(--text-tertiary)] tabular">
                            · {mesa.horario}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
                        <span className="truncate">
                          {mesa.territorio_nombre ?? "Territorio no indicado"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                          <Users className="size-3.5 text-[var(--text-tertiary)]" />
                          <strong className="tabular">{mesa.total_asistentes.toLocaleString("es-CO")}</strong> asistentes
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                          <Camera className="size-3" />
                          <span>{mesa.fotos.length} {mesa.fotos.length === 1 ? "foto" : "fotos"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la tarjeta */}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)]/70 pt-3">
                    <Button
                      variant={esSeleccionada ? "default" : "outline"}
                      size="sm"
                      type="button"
                      onClick={() => onSeleccionar(esSeleccionada ? null : mesa.id)}
                      className="h-7 text-xs"
                    >
                      {esSeleccionada ? "Deseleccionar" : "Ver detalle"}
                    </Button>

                    <div className="flex items-center gap-1">
                      {onLocalizarEnMapa && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => onLocalizarEnMapa(mesa)}
                          title="Localizar en el mapa"
                          className="h-7 px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <LocateFixed className="size-3.5 text-[var(--ember)]" />
                        </Button>
                      )}
                      {onAbrirPanelMesa && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => onAbrirPanelMesa(mesa.id)}
                          title="Abrir acta viva"
                          className="h-7 px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
