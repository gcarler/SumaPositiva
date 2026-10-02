"use client";

import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { MesaGeovisor } from "../../services/mesas-geovisor-api";

interface DataGridPaginationProps {
  table: Table<MesaGeovisor>;
}

export function DataGridPagination({ table }: DataGridPaginationProps) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-2 py-3 sm:flex-row text-xs text-[var(--text-secondary)]">
      {/* Información de filas visibles */}
      <div className="flex items-center gap-2">
        <span>
          Filas {startRow}–{endRow} de {totalRows}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Selector de tamaño de página */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)]">Filas por página:</span>
          <div className="w-[75px]">
            <Select
              value={String(pageSize)}
              onValueChange={(val) => table.setPageSize(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs bg-[var(--surface-0)] border-[var(--border)]">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Indicador de página actual */}
        <div className="flex items-center justify-center font-medium">
          Página {pageIndex + 1} de {Math.max(1, pageCount)}
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="Primera página"
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="size-4" />
            <span className="sr-only">Primera página</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title="Página anterior"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Página anterior</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title="Página siguiente"
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Página siguiente</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            title="Última página"
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="size-4" />
            <span className="sr-only">Última página</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
