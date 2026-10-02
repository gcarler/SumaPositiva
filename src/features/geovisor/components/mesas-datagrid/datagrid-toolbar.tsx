"use client";

import { Table } from "@tanstack/react-table";
import {
  Search,
  X,
  SlidersHorizontal,
  Download,
  LayoutGrid,
  Table as TableIcon,
  Columns,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";
import { exportarMesasCsv, copiarMesasPortapapeles } from "./datagrid-export";
import type { MesaGeovisor } from "../../services/mesas-geovisor-api";

export type DensidadFila = "compacto" | "normal" | "comodo";
export type ModoVistaMesas = "tabla" | "tarjetas";

interface DataGridToolbarProps {
  table: Table<MesaGeovisor>;
  busquedaGlobal: string;
  onBusquedaGlobalChange: (valor: string) => void;
  filtroEstado: string;
  onFiltroEstadoChange: (valor: string) => void;
  filtroTerritorio: string;
  onFiltroTerritorioChange: (valor: string) => void;
  territoriosDisponibles: { id: string; nombre: string }[];
  densidad: DensidadFila;
  onDensidadChange: (densidad: DensidadFila) => void;
  modoVista: ModoVistaMesas;
  onModoVistaChange: (modo: ModoVistaMesas) => void;
  filasFiltradas: MesaGeovisor[];
  totalMesas: number;
}

export function DataGridToolbar({
  table,
  busquedaGlobal,
  onBusquedaGlobalChange,
  filtroEstado,
  onFiltroEstadoChange,
  filtroTerritorio,
  onFiltroTerritorioChange,
  territoriosDisponibles,
  densidad,
  onDensidadChange,
  modoVista,
  onModoVistaChange,
  filasFiltradas,
  totalMesas,
}: DataGridToolbarProps) {
  const columnasVisibles = table.getAllLeafColumns().filter((c) => c.id !== "acciones");

  const exportarCsv = () => {
    exportarMesasCsv(filasFiltradas);
    toast.success(`Exportadas ${filasFiltradas.length} mesas a CSV`);
  };

  const copiarPortapapeles = async () => {
    const ok = await copiarMesasPortapapeles(filasFiltradas);
    if (ok) {
      toast.success(`${filasFiltradas.length} mesas copiadas en formato TSV (para Excel)`);
    } else {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Lado Izquierdo: Buscador global + Filtro de Estado + Filtro de Territorio */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Input de búsqueda global con icono y limpiar */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              type="text"
              placeholder="Buscar por mesa, código o lugar…"
              value={busquedaGlobal}
              onChange={(e) => onBusquedaGlobalChange(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-[var(--surface-0)] border-[var(--border)]"
            />
            {busquedaGlobal && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onBusquedaGlobalChange("")}
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="size-3" />
                <span className="sr-only">Limpiar búsqueda</span>
              </Button>
            )}
          </div>

          {/* Filtro por Estado */}
          <div className="w-[140px]">
            <Select value={filtroEstado} onValueChange={onFiltroEstadoChange}>
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

          {/* Filtro por Territorio */}
          <div className="w-[170px]">
            <Select value={filtroTerritorio} onValueChange={onFiltroTerritorioChange}>
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

        {/* Lado Derecho: Controles estilo AG-Grid (Columnas, Densidad, Exportar, Switcher de Vista) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Selector de Densidad (solo en modo tabla) */}
          {modoVista === "tabla" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  title="Ajustar densidad de filas"
                  className="h-8 px-2 text-xs"
                >
                  <SlidersHorizontal className="size-3.5 text-[var(--text-secondary)] sm:mr-1" />
                  <span className="hidden sm:inline capitalize">{densidad}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Densidad de filas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDensidadChange("compacto")}>
                  {densidad === "compacto" && <Check className="mr-1.5 size-3.5 text-[var(--ember)]" />}
                  Compacto (32px)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDensidadChange("normal")}>
                  {densidad === "normal" && <Check className="mr-1.5 size-3.5 text-[var(--ember)]" />}
                  Normal (44px)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDensidadChange("comodo")}>
                  {densidad === "comodo" && <Check className="mr-1.5 size-3.5 text-[var(--ember)]" />}
                  Cómodo (56px)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Menú de Visibilidad de Columnas (Column Visibility) */}
          {modoVista === "tabla" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  title="Personalizar columnas visibles"
                  className="h-8 px-2 text-xs"
                >
                  <Columns className="size-3.5 text-[var(--text-secondary)] sm:mr-1" />
                  <span className="hidden sm:inline">Columnas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columnasVisibles.map((column) => {
                  const headerTitle =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {headerTitle}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Menú de Exportación (CSV / Copiar) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="h-8 px-2 text-xs"
                title="Exportar datos de mesas"
              >
                <Download className="size-3.5 text-[var(--text-secondary)] sm:mr-1" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Exportar datos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportarCsv}>
                <Download className="mr-1.5 size-3.5 text-[var(--ember)]" />
                Descargar archivo CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copiarPortapapeles}>
                <Copy className="mr-1.5 size-3.5 text-[var(--text-secondary)]" />
                Copiar al portapapeles (TSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Switcher de Vista: Tarjetas 🗂️ vs DataGrid 📊 */}
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-0.5 ml-1">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => onModoVistaChange("tabla")}
              title="Vista DataGrid Empresarial (TanStack Table)"
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
              title="Vista Tarjetas Visuales (Cards)"
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
      </div>

      {/* Barra de estado con resumen de resultados y filtros activos */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border)]/60">
        <span>
          Mostrando <strong>{filasFiltradas.length}</strong> de <strong>{totalMesas}</strong> mesas registradas
          {filtroEstado !== "todos" && ` · Estado: ${filtroEstado}`}
          {filtroTerritorio !== "todos" && ` · Territorio: ${territoriosDisponibles.find((t) => t.id === filtroTerritorio)?.nombre ?? filtroTerritorio}`}
        </span>
        {(busquedaGlobal || filtroEstado !== "todos" || filtroTerritorio !== "todos") && (
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => {
              onBusquedaGlobalChange("");
              onFiltroEstadoChange("todos");
              onFiltroTerritorioChange("todos");
            }}
            className="text-[11px] text-[var(--ember)] hover:underline"
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
