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
  Filter,
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
import { AlternativasKpis } from "../components/alternativas-kpis";
import { AlternativasTabla } from "../components/alternativas-tabla";
import {
  useAlternativasStore,
  calcularKPIsAlternativas,
  filtrarAlternativas,
} from "../state/alternativas-store";
import type {
  EstadoAlternativa,
  SectorMGA,
} from "../models/alternativa";
import {
  SECTORES_MGA,
  ESTADOS_ALTERNATIVA,
  LINEAS_ESTRATEGICAS_MAP,
} from "../models/alternativa";

function sanitizarCsv(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null) return '""';
  let str = String(valor).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

export function AlternativasView() {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario = puedeEditar(sesion, "alternativas");

  const alternativas = useAlternativasStore((s) => s.alternativas);
  const filtros = useAlternativasStore((s) => s.filtros);
  const setFiltros = useAlternativasStore((s) => s.setFiltros);
  const limpiarFiltros = useAlternativasStore((s) => s.limpiarFiltros);

  const kpis = useMemo(() => calcularKPIsAlternativas(alternativas), [alternativas]);

  const alternativasFiltradas = useMemo(
    () => filtrarAlternativas(alternativas, filtros),
    [alternativas, filtros]
  );

  const hayFiltrosActivos =
    filtros.busqueda.trim() !== "" ||
    filtros.sector !== "todos" ||
    filtros.linea !== "todas" ||
    filtros.dimension !== "todas" ||
    filtros.estado !== "todos" ||
    filtros.enfoqueEtnico !== "todos";

  const handleAbrirCrear = () => {
    openPanel("alternativa-editor", {
      modo: "crear",
      soloLectura: false,
    });
  };

  const exportarCSV = () => {
    try {
      const headers = [
        "Código",
        "Nombre",
        "Sector MGA",
        "Línea Estratégica",
        "Dimensión ONU",
        "Objetivo Central MGA",
        "Territorio Cobertura",
        "Población Objetivo Estimada",
        "Costo Estimado COP",
        "Horizonte Años",
        "Fuentes Sugeridas",
        "Estado",
        "Requiere Consulta Previa (Ley 70/93)",
        "Fecha Actualización",
      ];

      const rows = alternativasFiltradas.map((alt) => [
        sanitizarCsv(alt.codigo),
        sanitizarCsv(alt.nombre),
        sanitizarCsv(SECTORES_MGA[alt.sector]?.label ?? alt.sector),
        sanitizarCsv(alt.linea_estrategica_codigo),
        sanitizarCsv(alt.dimension_id),
        sanitizarCsv(alt.objetivo_central_mga),
        sanitizarCsv(alt.territorio_cobertura),
        sanitizarCsv(alt.poblacion_objetivo_estimada),
        sanitizarCsv(alt.costo_estimado_cop),
        sanitizarCsv(alt.horizonte_anios),
        sanitizarCsv(alt.fuentes_financiacion_sugeridas?.join("; ") ?? ""),
        sanitizarCsv(ESTADOS_ALTERNATIVA[alt.estado]?.label ?? alt.estado),
        sanitizarCsv(alt.requiere_consulta_previa ? "SÍ" : "NO"),
        sanitizarCsv(alt.actualizado_en),
      ]);

      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alternativas_mga_cartagena_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Catálogo de alternativas exportado en formato CSV seguro.");
    } catch {
      toast.error("Error al exportar alternativas a CSV.");
    }
  };

  const exportarJSON = () => {
    try {
      const blob = new Blob(
        [JSON.stringify(alternativasFiltradas, null, 2)],
        { type: "application/json;charset=utf-8;" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alternativas_mga_cartagena_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Catálogo exportado en formato JSON estructurado.");
    } catch {
      toast.error("Error al exportar alternativas a JSON.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera institucional de la vista */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Fase 2: Formulación Estratégica · MGA DNP"
          title="Banco Distrital de Alternativas de Solución MGA"
          description="Iniciativas, programas e intervenciones transformadoras derivadas del diagnóstico distrital y priorizadas para la Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Menú de exportación */}
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

          {/* Botón Nueva Alternativa */}
          {puedeEditarUsuario && (
            <Button
              onClick={handleAbrirCrear}
              size="sm"
              className="gap-2 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Alternativa</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Financiamiento y Cobertura */}
      <AlternativasKpis kpis={kpis} />

      {/* Barra de Filtros Multicriterio */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ busqueda: e.target.value })}
              placeholder="Buscar por código, nombre, territorio u objetivo..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Filtro Sector MGA */}
          <div className="w-[190px]">
            <Select
              value={filtros.sector}
              onValueChange={(val) => setFiltros({ sector: val as SectorMGA | "todos" })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Sector MGA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos los sectores
                </SelectItem>
                {Object.entries(SECTORES_MGA).map(([key, info]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Línea Estratégica */}
          <div className="w-[180px]">
            <Select
              value={filtros.linea}
              onValueChange={(val) => setFiltros({ linea: val })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Línea estratégica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="text-xs">
                  Todas las líneas
                </SelectItem>
                {Object.entries(LINEAS_ESTRATEGICAS_MAP).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Estado */}
          <div className="w-[170px]">
            <Select
              value={filtros.estado}
              onValueChange={(val) =>
                setFiltros({ estado: val as EstadoAlternativa | "todos" })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Estado viabilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos los estados
                </SelectItem>
                {Object.entries(ESTADOS_ALTERNATIVA).map(([key, info]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Enfoque Étnico Ley 70 */}
          <div className="w-[170px]">
            <Select
              value={filtros.enfoqueEtnico}
              onValueChange={(val) =>
                setFiltros({
                  enfoqueEtnico: val as "todos" | "solo_etnicos" | "no_etnicos",
                })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Enfoque étnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Cualquier enfoque
                </SelectItem>
                <SelectItem value="solo_etnicos" className="text-xs">
                  Consulta Previa Ley 70
                </SelectItem>
                <SelectItem value="no_etnicos" className="text-xs">
                  Sin consulta previa
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limpiar Filtros */}
          {hayFiltrosActivos && (
            <Button
              variant="outline"
              size="sm"
              onClick={limpiarFiltros}
              className="gap-1.5 text-xs text-text-muted hover:text-text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar</span>
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border/50">
          <span>
            Mostrando <strong>{alternativasFiltradas.length}</strong> de{" "}
            <strong>{alternativas.length}</strong> alternativas en el banco distrital
          </span>
          {hayFiltrosActivos && (
            <span className="text-ember font-medium flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filtros aplicados
            </span>
          )}
        </div>
      </div>

      {/* DataGrid interactivo de Alternativas */}
      <AlternativasTabla
        alternativas={alternativasFiltradas}
        puedeEditar={puedeEditarUsuario}
      />
    </div>
  );
}
