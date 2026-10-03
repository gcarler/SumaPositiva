"use client";

import { useMemo } from "react";
import { Search, RotateCcw, Filter } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FuentesKpis } from "@/features/fuentes/components/fuentes-kpis";
import { FuentesDataGrid } from "@/features/fuentes/components/fuentes-datagrid";
import { useFuentesStore } from "@/features/fuentes/state/fuentes-store";
import type { AmbitoFuente, EstadoEntrega } from "@/features/fuentes/models/fuente";

export function FuentesView() {
  const filtros = useFuentesStore((s) => s.filtros);
  const setFiltros = useFuentesStore((s) => s.setFiltros);
  const limpiarFiltros = useFuentesStore((s) => s.limpiarFiltros);

  const hayFiltrosActivos =
    filtros.busqueda !== "" ||
    filtros.ambito !== "todos" ||
    filtros.estado !== "todos" ||
    filtros.dimension !== "todas" ||
    filtros.tipo !== "todos";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestión interna · Decreto 037/26"
        title="Fuentes de Información"
        description="Monitoreo, radicación, trazabilidad y control de cumplimiento a fuentes primarias y secundarias requeridas para la formulación técnica de la política pública."
      />

      {/* Tarjetas KPI de cumplimiento */}
      <FuentesKpis />

      {/* Barra de Filtros y Búsqueda */}
      <div className="space-y-3 rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Filter className="size-3.5 text-ember" aria-hidden="true" />
            <span>Filtros y Búsqueda de Fuentes</span>
          </div>
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-7 text-xs text-text-secondary hover:text-text-primary gap-1.5"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Búsqueda por texto */}
          <div className="relative sm:col-span-2 md:col-span-1 lg:col-span-2">
            <Search
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Buscar por código, entidad, fuente o variable..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ busqueda: e.target.value })}
              className="pl-8 text-xs"
            />
          </div>

          {/* Filtro por Ámbito */}
          <div>
            <Select
              value={filtros.ambito}
              onValueChange={(val) =>
                setFiltros({ ambito: val as AmbitoFuente | "todos" })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Ámbito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los ámbitos</SelectItem>
                <SelectItem value="local">Local (Cartagena / Bolívar)</SelectItem>
                <SelectItem value="nacional">Nacional (Colombia)</SelectItem>
                <SelectItem value="internacional">Internacional (ONU/OEA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Estado de Entrega */}
          <div>
            <Select
              value={filtros.estado}
              onValueChange={(val) =>
                setFiltros({ estado: val as EstadoEntrega | "todos" })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Estado de entrega" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="entregada">Entregada</SelectItem>
                <SelectItem value="en_termino">En Término</SelectItem>
                <SelectItem value="incompleta">Incompleta</SelectItem>
                <SelectItem value="vencida_sin_entrega">Vencida sin Entrega</SelectItem>
                <SelectItem value="requerimiento_insistencia">
                  Insistencia Radicada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Dimensión de Seguridad Humana */}
          <div>
            <Select
              value={filtros.dimension}
              onValueChange={(val) => setFiltros({ dimension: val })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Dimensión de seguridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las dimensiones</SelectItem>
                <SelectItem value="personal">Personal / Convivencia</SelectItem>
                <SelectItem value="comunitaria">Comunitaria / Social</SelectItem>
                <SelectItem value="ambiental">Ambiental / Ecoterritorial</SelectItem>
                <SelectItem value="economica">Económica / Productiva</SelectItem>
                <SelectItem value="alimentaria">Alimentaria / Nutrición</SelectItem>
                <SelectItem value="salud">Salud Pública</SelectItem>
                <SelectItem value="politica">Política / Institucional</SelectItem>
                <SelectItem value="crisis">Crisis / Alertas Tempranas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grilla de datos */}
      <FuentesDataGrid />
    </div>
  );
}
