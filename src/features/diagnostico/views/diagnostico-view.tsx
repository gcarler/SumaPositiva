"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  RotateCcw,
  RotateCw,
  Filter,
  Download,
  FileSpreadsheet,
  FileJson,
  BarChart3,
  GitBranch,
  MapPin,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
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
import { useSesionStore, tienePermiso } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { DiagnosticoKpis } from "../components/diagnostico-kpis";
import { LineaBaseTabla } from "../components/linea-base-tabla";
import { ArbolProblemasView } from "../components/arbol-problemas-view";
import { GeodiagnosticoTerritorialView } from "../components/geodiagnostico-territorial-view";
import { listarFichasIndicadores } from "../services/indicadores-api";
import type { FichaIndicador, TipoIndicador } from "../models/indicador";
import { sanitizarCsv } from "@/shared/lib/csv";

export function DiagnosticoView() {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeGestionarIndicadores =
    tienePermiso(sesion, "indicadores:gestionar") || puedeEditar(sesion, "diagnostico");

  const [indicadores, setIndicadores] = useState<FichaIndicador[]>([]);
  const [modoVista, setModoVista] = useState<
    "linea_base" | "arbol_mga" | "geodiagnostico"
  >("linea_base");
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoIndicador | "todos">("todos");
  const [periodicidadFiltro, setPeriodicidadFiltro] = useState<string>("todas");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarFichasIndicadores();
      setIndicadores(data);
    } catch {
      toast.error("Error al sincronizar con la API de indicadores.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const hayFiltrosActivos =
    busqueda.trim() !== "" ||
    tipoFiltro !== "todos" ||
    periodicidadFiltro !== "todas";

  const limpiarFiltros = () => {
    setBusqueda("");
    setTipoFiltro("todos");
    setPeriodicidadFiltro("todas");
  };

  const indicadoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return indicadores.filter((ind) => {
      if (tipoFiltro !== "todos" && ind.tipo_indicador !== tipoFiltro) {
        return false;
      }
      if (
        periodicidadFiltro !== "todas" &&
        ind.periodicidad.toLowerCase() !== periodicidadFiltro.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const texto = `${ind.codigo} ${ind.nombre} ${ind.definicion} ${ind.fuente_datos} ${ind.responsable_reporte}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [indicadores, busqueda, tipoFiltro, periodicidadFiltro]);

  const handleExportarCsv = () => {
    if (indicadoresFiltrados.length === 0) {
      toast.error("No hay indicadores para exportar con los filtros activos.");
      return;
    }

    const cabeceras = [
      "Código DNP",
      "Nombre Indicador",
      "Tipo Indicador",
      "Definición",
      "Método de Cálculo",
      "Unidad de Medida",
      "Sentido Esperado",
      "Periodicidad",
      "Línea Base (Valor)",
      "Año Base",
      "Valor Actual",
      "Meta Cuatrienio",
      "Porcentaje de Avance",
      "Fuente Oficial",
      "Responsable del Reporte",
    ];

    const filas = indicadoresFiltrados.map((i) => [
      sanitizarCsv(i.codigo),
      sanitizarCsv(i.nombre),
      sanitizarCsv(i.tipo_indicador),
      sanitizarCsv(i.definicion),
      sanitizarCsv(i.metodo_calculo),
      sanitizarCsv(i.unidad_medida),
      sanitizarCsv(i.sentido_esperado),
      sanitizarCsv(i.periodicidad),
      sanitizarCsv(i.linea_base_valor),
      sanitizarCsv(i.linea_base_anio),
      sanitizarCsv(i.valor_actual),
      sanitizarCsv(i.meta_cuatrienio),
      sanitizarCsv(i.porcentaje_avance),
      sanitizarCsv(i.fuente_datos),
      sanitizarCsv(i.responsable_reporte),
    ]);

    const contenidoCsv =
      "\uFEFF" +
      [cabeceras.join(","), ...filas.map((f) => f.join(","))].join("\r\n");
    const blob = new Blob([contenidoCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `polis_linea_base_dnp_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${indicadoresFiltrados.length} indicadores exportados a CSV`);
  };

  const handleExportarJson = () => {
    if (indicadoresFiltrados.length === 0) {
      toast.error("No hay indicadores para exportar con los filtros activos.");
      return;
    }

    const dataStr = JSON.stringify(indicadoresFiltrados, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `polis_linea_base_dnp_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${indicadoresFiltrados.length} indicadores exportados a JSON`);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera institucional y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow={
            modoVista === "linea_base"
              ? "Línea Base Cuantitativa · Metodología DNP / MGA"
              : modoVista === "arbol_mga"
                ? "Metodología General Ajustada (MGA) · Validación Causal DNP"
                : "Geodiagnóstico Territorial · Cartagena de Indias"
          }
          title={
            modoVista === "linea_base"
              ? "Diagnóstico Situacional y Línea Base — Seguridad Humana Cartagena 2026"
              : modoVista === "arbol_mga"
                ? "Árbol de Problemas y Soluciones Distrital — Cartagena 2026"
                : "Perfiles Analíticos y Fichas de Vulnerabilidad por UCG y Corregimiento"
          }
          description={
            modoVista === "linea_base"
              ? "Matriz oficial de indicadores de resultado, producto e insumo para el seguimiento técnico y auditoría pericial a las 7 dimensiones de la política pública."
              : modoVista === "arbol_mga"
                ? "Estructura causal de problemas, causas, efectos y formulación de objetivos con validación del Agente IA DNP articulado al Plan de Desarrollo Distrital."
                : "Caracterización territorial multidimensional, equipamientos, alertas tempranas SAT y enfoque étnico Ley 70 de 1993 en las 3 localidades distritales."
          }
        />

        {modoVista === "linea_base" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cargarDatos}
              disabled={cargando}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCw
                className={`size-3.5 ${cargando ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Actualizar</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Download className="size-3.5" aria-hidden="true" />
                  <span>Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleExportarCsv}
                  className="gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  <span>Exportar CSV (Excel)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportarJson}
                  className="gap-2 cursor-pointer"
                >
                  <FileJson className="size-4" aria-hidden="true" />
                  <span>Exportar JSON</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {puedeGestionarIndicadores && (
              <Button
                variant="ember"
                size="sm"
                onClick={() =>
                  openPanel("ficha-editor", { onGuardado: cargarDatos })
                }
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Nueva Ficha Técnica</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Conmutador de Modos: Línea Base vs Árbol MGA vs Geodiagnóstico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-surface-1 p-2">
        <div className="inline-flex flex-wrap rounded-lg border border-border bg-surface-2 p-1 gap-1">
          <Button
            variant={modoVista === "linea_base" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModoVista("linea_base")}
            className={`h-8 gap-2 text-xs font-semibold transition-all ${
              modoVista === "linea_base"
                ? "bg-surface-3 text-text-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <BarChart3 className="size-3.5 text-ember" aria-hidden="true" />
            <span>Línea Base Cuantitativa</span>
          </Button>
          <Button
            variant={modoVista === "arbol_mga" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModoVista("arbol_mga")}
            className={`h-8 gap-2 text-xs font-semibold transition-all ${
              modoVista === "arbol_mga"
                ? "bg-surface-3 text-text-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <GitBranch className="size-3.5 text-ember" aria-hidden="true" />
            <span>Árbol de Problemas MGA</span>
          </Button>
          <Button
            variant={modoVista === "geodiagnostico" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModoVista("geodiagnostico")}
            className={`h-8 gap-2 text-xs font-semibold transition-all ${
              modoVista === "geodiagnostico"
                ? "bg-surface-3 text-text-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <MapPin className="size-3.5 text-ember" aria-hidden="true" />
            <span>Geodiagnóstico Territorial</span>
          </Button>
        </div>

        <div className="text-2xs text-text-tertiary px-2">
          {modoVista === "linea_base" &&
            "Metodología DNP: Indicadores cuantitativos de resultado, producto e insumo"}
          {modoVista === "arbol_mga" &&
            "Metodología General Ajustada (MGA): Estructura causal y validación IA DNP"}
          {modoVista === "geodiagnostico" &&
            "Geodiagnóstico: Fichas de vulnerabilidad UCGs, corregimientos e islas (Ley 70/93)"}
        </div>
      </div>

      {modoVista === "linea_base" ? (
        <>
          {/* Tarjetas KPI de resumen */}
          <DiagnosticoKpis indicadores={indicadores} />

          {/* Barra de Filtros y Búsqueda */}
          <div className="space-y-3 rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <Filter className="size-3.5 text-ember" aria-hidden="true" />
                <span>Filtros y Búsqueda en Línea Base DNP</span>
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

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {/* Búsqueda por texto libre */}
              <div className="relative sm:col-span-2">
                <Search
                  className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Buscar por código DNP, nombre de indicador, fuente o responsable..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>

              {/* Filtro por Tipo de Indicador */}
              <div>
                <Select
                  value={tipoFiltro}
                  onValueChange={(val) =>
                    setTipoFiltro(val as TipoIndicador | "todos")
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Tipo de indicador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="resultado">Resultado</SelectItem>
                    <SelectItem value="impacto">Impacto</SelectItem>
                    <SelectItem value="producto">Producto</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Periodicidad */}
              <div>
                <Select
                  value={periodicidadFiltro}
                  onValueChange={(val) => setPeriodicidadFiltro(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Periodicidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las periodicidades</SelectItem>
                    <SelectItem value="Mensual">Mensual</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabla de indicadores de línea base */}
          <LineaBaseTabla
            indicadores={indicadoresFiltrados}
            onMedicionRegistrada={cargarDatos}
            onFichaActualizada={cargarDatos}
          />
        </>
      ) : modoVista === "arbol_mga" ? (
        <ArbolProblemasView />
      ) : (
        <GeodiagnosticoTerritorialView />
      )}
    </div>
  );
}
