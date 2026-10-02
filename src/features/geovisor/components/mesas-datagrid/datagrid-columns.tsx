"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, MapPin, CalendarClock, Users, Camera, ExternalLink, LocateFixed } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import type { MesaGeovisor } from "../../services/mesas-geovisor-api";

const columnHelper = createColumnHelper<MesaGeovisor>();

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "Por definir";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${fecha}T12:00:00`));
  } catch {
    return fecha;
  }
}

export interface ColumnActionsHandler {
  onSeleccionar: (mesaId: string | null) => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
  onLocalizarEnMapa?: (mesa: MesaGeovisor) => void;
}

export function crearColumnasDataGrid(handlers: ColumnActionsHandler) {
  return [
    // 1. Estado
    columnHelper.accessor("realizada", {
      id: "estado",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Estado
            {sorted === "asc" ? (
              <ArrowUp className="ml-1 size-3 text-[var(--ember)]" />
            ) : sorted === "desc" ? (
              <ArrowDown className="ml-1 size-3 text-[var(--ember)]" />
            ) : (
              <ArrowUpDown className="ml-1 size-3 opacity-40" />
            )}
          </Button>
        );
      },
      cell: (info) => {
        const realizada = info.getValue();
        return (
          <StatusBadge tone={realizada ? "success" : "warning"}>
            {realizada ? "Realizada" : "Programada"}
          </StatusBadge>
        );
      },
      sortingFn: "basic",
    }),

    // 2. Nombre de la Mesa
    columnHelper.accessor("nombre", {
      id: "nombre",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Mesa de Trabajo
            {sorted === "asc" ? (
              <ArrowUp className="ml-1 size-3 text-[var(--ember)]" />
            ) : sorted === "desc" ? (
              <ArrowDown className="ml-1 size-3 text-[var(--ember)]" />
            ) : (
              <ArrowUpDown className="ml-1 size-3 opacity-40" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const mesa = row.original;
        return (
          <div className="max-w-[280px] space-y-0.5 sm:max-w-[360px]">
            <span className="block truncate font-semibold text-[var(--text-primary)]">
              {mesa.nombre}
            </span>
            <span className="block text-[11px] text-[var(--text-tertiary)]">
              Cód. {mesa.id.toUpperCase()}
            </span>
          </div>
        );
      },
      sortingFn: "text",
    }),

    // 3. Territorio / Localidad
    columnHelper.accessor((row) => row.territorio_nombre ?? "Territorio no indicado", {
      id: "territorio",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Territorio
            {sorted === "asc" ? (
              <ArrowUp className="ml-1 size-3 text-[var(--ember)]" />
            ) : sorted === "desc" ? (
              <ArrowDown className="ml-1 size-3 text-[var(--ember)]" />
            ) : (
              <ArrowUpDown className="ml-1 size-3 opacity-40" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const mesa = row.original;
        return (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <MapPin className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
            <span className="truncate max-w-[200px]">
              {mesa.territorio_nombre ?? "Sin asignar"}
            </span>
          </div>
        );
      },
      sortingFn: "text",
    }),

    // 4. Fecha & Horario
    columnHelper.accessor((row) => row.fecha ?? "", {
      id: "fecha",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Fecha y Horario
            {sorted === "asc" ? (
              <ArrowUp className="ml-1 size-3 text-[var(--ember)]" />
            ) : sorted === "desc" ? (
              <ArrowDown className="ml-1 size-3 text-[var(--ember)]" />
            ) : (
              <ArrowUpDown className="ml-1 size-3 opacity-40" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const mesa = row.original;
        return (
          <div className="space-y-0.5 whitespace-nowrap text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5 font-medium tabular text-[var(--text-primary)]">
              <CalendarClock className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
              <span>{formatearFecha(mesa.fecha)}</span>
            </div>
            {mesa.horario && (
              <div className="pl-5 text-[11px] text-[var(--text-tertiary)] tabular">
                {mesa.horario}
              </div>
            )}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.fecha ? new Date(rowA.original.fecha).getTime() : 0;
        const dateB = rowB.original.fecha ? new Date(rowB.original.fecha).getTime() : 0;
        return dateA - dateB;
      },
    }),

    // 5. Total Asistentes
    columnHelper.accessor("total_asistentes", {
      id: "asistentes",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Asistentes
            {sorted === "asc" ? (
              <ArrowUp className="ml-1 size-3 text-[var(--ember)]" />
            ) : sorted === "desc" ? (
              <ArrowDown className="ml-1 size-3 text-[var(--ember)]" />
            ) : (
              <ArrowUpDown className="ml-1 size-3 opacity-40" />
            )}
          </Button>
        );
      },
      cell: (info) => {
        const total = info.getValue();
        return (
          <div className="flex items-center gap-2">
            <Users className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
            <span className="font-semibold tabular text-[var(--text-primary)]">
              {total.toLocaleString("es-CO")}
            </span>
          </div>
        );
      },
      sortingFn: "basic",
    }),

    // 6. Evidencias / Fotos
    columnHelper.accessor((row) => row.fotos.length, {
      id: "fotos",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Evidencias
            {sorted === "asc" ? (
              <ArrowUp className="ml-1 size-3 text-[var(--ember)]" />
            ) : sorted === "desc" ? (
              <ArrowDown className="ml-1 size-3 text-[var(--ember)]" />
            ) : (
              <ArrowUpDown className="ml-1 size-3 opacity-40" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const totalFotos = row.original.fotos.length;
        return (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Camera className="size-3.5 text-[var(--text-tertiary)]" />
            <span className="tabular">{totalFotos} {totalFotos === 1 ? "foto" : "fotos"}</span>
          </div>
        );
      },
      sortingFn: "basic",
    }),

    // 7. Acciones rápidas (AG-Grid Quick Actions)
    columnHelper.display({
      id: "acciones",
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Acciones
        </span>
      ),
      cell: ({ row }) => {
        const mesa = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {handlers.onLocalizarEnMapa && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onLocalizarEnMapa?.(mesa);
                }}
                title="Centrar en el mapa SIG"
                className="h-7 px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <LocateFixed className="size-3.5 text-[var(--ember)]" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Mapa</span>
              </Button>
            )}

            {handlers.onAbrirPanelMesa && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onAbrirPanelMesa?.(mesa.id);
                }}
                title="Abrir acta viva y detalle metodológico"
                className="h-7 px-2 text-xs"
              >
                <ExternalLink className="size-3.5" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Acta</span>
              </Button>
            )}
          </div>
        );
      },
    }),
  ];
}
