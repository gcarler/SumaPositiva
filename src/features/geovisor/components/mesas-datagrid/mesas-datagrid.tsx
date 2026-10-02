"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type VisibilityState,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { crearColumnasDataGrid, type ColumnActionsHandler } from "./datagrid-columns";
import { DataGridToolbar, type DensidadFila, type ModoVistaMesas } from "./datagrid-toolbar";
import { DataGridPagination } from "./datagrid-pagination";
import type { MesaGeovisor } from "../../services/mesas-geovisor-api";

interface MesasDataGridProps {
  mesas: MesaGeovisor[];
  seleccionada: string | null;
  onSeleccionar: (mesaId: string | null) => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
  onLocalizarEnMapa?: (mesa: MesaGeovisor) => void;
  modoVista: ModoVistaMesas;
  onModoVistaChange: (modo: ModoVistaMesas) => void;
}

export function MesasDataGrid({
  mesas,
  seleccionada,
  onSeleccionar,
  onAbrirPanelMesa,
  onLocalizarEnMapa,
  modoVista,
  onModoVistaChange,
}: MesasDataGridProps) {
  // Estados de control de TanStack Table
  const [sorting, setSorting] = useState<SortingState>([
    { id: "fecha", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [densidad, setDensidad] = useState<DensidadFila>("normal");

  // Filtros interactivos
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTerritorio, setFiltroTerritorio] = useState("todos");

  // Territorios únicos presentes en los datos
  const territoriosDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    mesas.forEach((m) => {
      if (m.territorio_nombre) {
        mapa.set(m.territorio_codigo ?? m.territorio_nombre, m.territorio_nombre);
      }
    });
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [mesas]);

  // Datos filtrados por facetas
  const datosFiltrados = useMemo(() => {
    return mesas.filter((mesa) => {
      // 1. Filtro de estado
      if (filtroEstado === "realizadas" && !mesa.realizada) return false;
      if (filtroEstado === "programadas" && mesa.realizada) return false;

      // 2. Filtro de territorio
      if (
        filtroTerritorio !== "todos" &&
        mesa.territorio_codigo !== filtroTerritorio &&
        mesa.territorio_nombre !== filtroTerritorio
      ) {
        return false;
      }

      // 3. Búsqueda global de texto
      if (busquedaGlobal.trim()) {
        const query = busquedaGlobal.toLowerCase();
        const coincideNombre = mesa.nombre.toLowerCase().includes(query);
        const coincideTerritorio = (mesa.territorio_nombre ?? "").toLowerCase().includes(query);
        const coincideId = mesa.id.toLowerCase().includes(query);
        const coincideHorario = (mesa.horario ?? "").toLowerCase().includes(query);
        if (!coincideNombre && !coincideTerritorio && !coincideId && !coincideHorario) {
          return false;
        }
      }

      return true;
    });
  }, [mesas, filtroEstado, filtroTerritorio, busquedaGlobal]);

  // Handlers para columnas
  const handlers: ColumnActionsHandler = useMemo(
    () => ({
      onSeleccionar,
      onAbrirPanelMesa,
      onLocalizarEnMapa,
    }),
    [onSeleccionar, onAbrirPanelMesa, onLocalizarEnMapa]
  );

  const columns = useMemo(() => crearColumnasDataGrid(handlers), [handlers]);

  const table = useReactTable({
    data: datosFiltrados,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Clases CSS según densidad
  const paddingCelda =
    densidad === "compacto"
      ? "py-1.5 px-3 text-xs"
      : densidad === "comodo"
      ? "py-4 px-4 text-sm"
      : "py-2.5 px-3 text-sm";

  return (
    <div className="space-y-3">
      {/* Barra de herramientas estilo AG-Grid */}
      <DataGridToolbar
        table={table}
        busquedaGlobal={busquedaGlobal}
        onBusquedaGlobalChange={setBusquedaGlobal}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={setFiltroEstado}
        filtroTerritorio={filtroTerritorio}
        onFiltroTerritorioChange={setFiltroTerritorio}
        territoriosDisponibles={territoriosDisponibles}
        densidad={densidad}
        onDensidadChange={setDensidad}
        modoVista={modoVista}
        onModoVistaChange={onModoVistaChange}
        filasFiltradas={datosFiltrados}
        totalMesas={mesas.length}
      />

      {/* Contenedor de Tabla con bordes y elevación */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xs">
        <Table>
          <TableHeader className="bg-[var(--surface-1)] border-b border-[var(--border)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const esSeleccionada = seleccionada === row.original.id;
                return (
                  <TableRow
                    key={row.id}
                    data-state={esSeleccionada ? "selected" : undefined}
                    onClick={() => onSeleccionar(esSeleccionada ? null : row.original.id)}
                    className={`cursor-pointer border-b border-[var(--border)]/70 transition-colors ${
                      esSeleccionada
                        ? "bg-[var(--ember-soft)] hover:bg-[var(--ember-soft)]"
                        : "hover:bg-[var(--surface-1)]/70"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={paddingCelda}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-sm text-[var(--text-tertiary)]"
                >
                  No se encontraron mesas de trabajo que coincidan con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Paginador Enterprise */}
        {table.getRowModel().rows?.length > 0 && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-1)]/50">
            <DataGridPagination table={table} />
          </div>
        )}
      </div>
    </div>
  );
}
