"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  RotateCcw,
  FileSpreadsheet,
  FileJson,
  Download,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { SeguimientoKpis } from "../components/seguimiento-kpis";
import { CompromisosTabla } from "../components/compromisos-tabla";
import {
  useCompromisosStore,
  calcularKpisSeguimiento,
  filtrarCompromisos,
} from "../state/compromisos-store";
import type { EstadoCompromiso } from "../models/compromiso";
import {
  ESTADOS_COMPROMISO,
  ENTIDADES_DISTRITALES_CARTAGENA,
} from "../models/compromiso";

function sanitizarCsv(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null) return '""';
  let str = String(valor).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

export function SeguimientoView() {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario = puedeEditar(sesion, "seguimiento");

  const compromisos = useCompromisosStore((s) => s.compromisos);
  const filtros = useCompromisosStore((s) => s.filtros);
  const setFiltros = useCompromisosStore((s) => s.setFiltros);
  const limpiarFiltros = useCompromisosStore((s) => s.limpiarFiltros);

  const kpis = useMemo(() => calcularKpisSeguimiento(compromisos), [compromisos]);

  const compromisosFiltrados = useMemo(
    () => filtrarCompromisos(compromisos, filtros),
    [compromisos, filtros]
  );

  const hayFiltrosActivos =
    filtros.busqueda.trim() !== "" ||
    filtros.entidad !== "todas" ||
    filtros.estado !== "todos";

  const handleAbrirCrear = () => {
    openPanel("compromiso-editor", {
      modo: "crear",
      soloLectura: false,
    });
  };

  const exportarCSV = () => {
    try {
      const headers = [
        "Código",
        "Nombre",
        "Descripción",
        "Entidad Responsable",
        "Línea Estratégica",
        "Alternativa MGA",
        "Indicador Asociado",
        "Meta Cuatrienal",
        "Unidad de Medida",
        "Avance Cuatrienal",
        "% Cumplimiento",
        "Presupuesto Anual COP",
        "Vigencias",
        "Estado",
        "Fecha Último Reporte",
      ];

      const rows = compromisosFiltrados.map((c) => [
        sanitizarCsv(c.codigo),
        sanitizarCsv(c.nombre),
        sanitizarCsv(c.descripcion),
        sanitizarCsv(c.entidad_responsable),
        sanitizarCsv(c.linea_estrategica_codigo),
        sanitizarCsv(c.alternativa_mga_codigo),
        sanitizarCsv(c.indicador_asociado_codigo),
        sanitizarCsv(c.meta_cuatrienal_valor),
        sanitizarCsv(c.unidad_medida),
        sanitizarCsv(c.avance_cuatrienal_valor),
        sanitizarCsv(c.porcentaje_cumplimiento),
        sanitizarCsv(c.presupuesto_anual_cop),
        sanitizarCsv(c.vigencias_programadas.join("; ")),
        sanitizarCsv(ESTADOS_COMPROMISO[c.estado]?.label ?? c.estado),
        sanitizarCsv(c.fecha_corte_ultimo_reporte),
      ]);

      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `matriz_compromisos_pas_cartagena_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Matriz de compromisos exportada en formato CSV seguro.");
    } catch {
      toast.error("Error al exportar compromisos a CSV.");
    }
  };

  const exportarJSON = () => {
    try {
      const blob = new Blob(
        [JSON.stringify(compromisosFiltrados, null, 2)],
        { type: "application/json;charset=utf-8;" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `matriz_compromisos_pas_cartagena_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Matriz exportada en formato JSON estructurado.");
    } catch {
      toast.error("Error al exportar compromisos a JSON.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera institucional de la vista */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Plan de Acción y Seguimiento (PAS) · Cartagena de Indias 2026–2036"
          title="Matriz de Compromisos Institucionales"
          description="Monitoreo de metas cuatrienales, asignación presupuestal y avance de gestión por secretarías del Distrito para la Seguridad Humana Integral."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Menú de exportación pericial */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportarCSV} className="gap-2 text-xs">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Exportar CSV (Excel / OWASP)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportarJSON} className="gap-2 text-xs">
                <FileJson className="h-4 w-4" />
                <span>Exportar JSON Estructurado</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón Nuevo Compromiso */}
          {puedeEditarUsuario && (
            <Button
              onClick={handleAbrirCrear}
              size="sm"
              className="gap-2 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Compromiso</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Seguimiento */}
      <SeguimientoKpis kpis={kpis} />

      {/* Barra de Filtros Multicriterio */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador reactivo */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ busqueda: e.target.value })}
              placeholder="Buscar por código, nombre, indicador o alternativa MGA..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Filtro Entidad Responsable */}
          <div className="w-[220px]">
            <Select
              value={filtros.entidad}
              onValueChange={(val) => setFiltros({ entidad: val })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Entidad responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="text-xs">
                  Todas las entidades
                </SelectItem>
                {ENTIDADES_DISTRITALES_CARTAGENA.map((entidad) => (
                  <SelectItem key={entidad} value={entidad} className="text-xs">
                    {entidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Estado de Cumplimiento */}
          <div className="w-[180px]">
            <Select
              value={filtros.estado}
              onValueChange={(val) =>
                setFiltros({ estado: val as EstadoCompromiso | "todos" })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Estado de cumplimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos los estados
                </SelectItem>
                {Object.entries(ESTADOS_COMPROMISO).map(([key, info]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botón Limpiar Filtros */}
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-9 gap-1.5 px-3 text-xs text-text-muted hover:text-text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>

        {/* Resumen de resultados filtrados */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Mostrando{" "}
            <strong className="text-text-primary">
              {compromisosFiltrados.length}
            </strong>{" "}
            de {compromisos.length} compromisos institucionales
          </span>
        </div>
      </div>

      {/* DataGrid interactivo de Compromisos */}
      <CompromisosTabla
        compromisos={compromisosFiltrados}
        puedeEditar={puedeEditarUsuario}
      />
    </div>
  );
}
