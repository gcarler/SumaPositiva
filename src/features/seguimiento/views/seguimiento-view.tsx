"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  RotateCcw,
  FileSpreadsheet,
  FileJson,
  Download,
  CheckSquare,
  Layers,
  Scale,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { useFases } from "@/features/politicas/services/use-politicas-queries";
import { SeguimientoKpis } from "../components/seguimiento-kpis";
import { CompromisosTabla } from "../components/compromisos-tabla";
import { CadenaValorTab } from "../components/cadena-valor-tab";
import { RendicionCuentasTab } from "../components/rendicion-cuentas-tab";
import {
  useCompromisosStore,
  calcularKpisSeguimiento,
  filtrarCompromisos,
} from "../state/compromisos-store";
import { useCadenaValorStore } from "../state/cadena-valor-store";
import { useDevolucionStore } from "../state/devolucion-store";
import type { EstadoCompromiso } from "../models/compromiso";
import {
  ESTADOS_COMPROMISO,
  ENTIDADES_DISTRITALES_CARTAGENA,
} from "../models/compromiso";
import { sanitizarCsv } from "@/shared/lib/csv";

export function SeguimientoView() {
  const [tabActiva, setTabActiva] = useState<string>("matriz_compromisos");
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario = puedeEditar(sesion, "seguimiento");

  // Gating de Fases de Política (AUD-05): en fase preparatoria solo los admins pueden modificar
  const { data: fases } = useFases();
  const fase3 = fases?.find((f) => f.codigo === "FASE_3_PLAN_ACCION");
  const fase3Activa = fase3?.estado === "activa";
  const esAdmin =
    sesion?.rol === "autoridad_distrital" ||
    sesion?.rol === "administrador_identidades";

  const puedeEditarEfectivo = fase3Activa
    ? puedeEditarUsuario
    : esAdmin && puedeEditarUsuario;
  const esPreparatoria = fase3?.estado === "preparatoria";

  const compromisos = useCompromisosStore((s) => s.compromisos);
  const filtros = useCompromisosStore((s) => s.filtros);
  const setFiltros = useCompromisosStore((s) => s.setFiltros);
  const limpiarFiltros = useCompromisosStore((s) => s.limpiarFiltros);
  const esContingencia = useCompromisosStore((s) => s.esContingencia);

  const cargarCompromisos = useCompromisosStore((s) => s.cargarCompromisos);
  const cargarCadenaValor = useCadenaValorStore((s) => s.cargarCadenaValor);
  const cargarDevolucion = useDevolucionStore((s) => s.cargarDatos);

  useEffect(() => {
    void cargarCompromisos();
    void cargarCadenaValor();
    void cargarDevolucion();
  }, [cargarCompromisos, cargarCadenaValor, cargarDevolucion]);

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
        "Alternativa de Solución",
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
          title={
            tabActiva === "matriz_compromisos"
              ? "Matriz de Compromisos Institucionales"
              : tabActiva === "cadena_valor"
              ? "Cadena de Valor y Seguimiento"
              : "Rendición de Cuentas y Devolución Ciudadana"
          }
          description={
            tabActiva === "matriz_compromisos"
              ? "Monitoreo de metas cuatrienales, asignación presupuestal y avance de gestión por secretarías del Distrito para la Seguridad Humana Integral."
              : tabActiva === "cadena_valor"
              ? "Estructuración lógica de causalidad técnica: Insumos financieros y operativos articulados a Productos entregados y Resultados transformadores de impacto en Cartagena."
              : "Garantía del deber de motivación sustancial y proscripción del descarte silencioso conforme a la Sentencia C-150 de 2015 y la Ley Estatutaria 1757 de 2015."
          }
        />

        {tabActiva === "matriz_compromisos" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Menú de exportación pericial */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  aria-label="Exportar compromisos institucionales"
                >
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
            {puedeEditarEfectivo && (
              <Button
                onClick={handleAbrirCrear}
                size="sm"
                className="gap-2 text-xs font-medium"
                aria-label="Crear nuevo compromiso institucional PAS"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Compromiso</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Banner de Gating en Fase Preparatoria (AUD-05) */}
      {esPreparatoria && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-xs text-text-primary"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-warning text-sm">
              Fase 3 en Etapa Preparatoria — Módulo en Modo Consulta
            </span>
            <p className="text-text-secondary leading-relaxed pt-0.5">
              {esAdmin
                ? "La Fase 3 (Plan de Acción y Seguimiento PAS / SINERGIA) se encuentra en alistamiento. Como autoridad o administrador distrital, cuenta con permisos institucionales de configuración y cargue de metas previo a la apertura pública."
                : "La Fase 3 (Plan de Acción y Seguimiento PAS / SINERGIA) se encuentra actualmente en etapa preparatoria. La creación y edición de compromisos institucionales está reservada a la administración distrital hasta la activación oficial de la fase."}
            </p>
          </div>
        </div>
      )}

      {/* Banner de Modo Contingencia (OBS-01) */}
      {esContingencia && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-text-primary">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-warning">
                Modo Contingencia Local
              </span>
              <Badge variant="warning" className="text-[10px]">
                Datos de Contingencia
              </Badge>
            </div>
            <p className="mt-0.5 text-text-muted">
              El servicio central de compromisos no se encuentra disponible. Se está visualizando el catálogo canónico en memoria; las operaciones de escritura están protegidas para evitar inconsistencias de persistencia.
            </p>
          </div>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <Tabs
        value={tabActiva}
        onValueChange={setTabActiva}
        className="w-full space-y-6"
      >
        <div className="rounded-xl border border-border bg-surface-1 p-2">
          <TabsList
            aria-label="Pestañas del Plan de Acción y Seguimiento"
            className="bg-surface-2 p-1 border border-border"
          >
            <TabsTrigger
              value="matriz_compromisos"
              className="gap-2 text-xs data-[state=active]:bg-surface-1 data-[state=active]:text-text-primary"
            >
              <CheckSquare className="h-3.5 w-3.5 text-ember" />
              <span>Matriz de Compromisos PAS</span>
            </TabsTrigger>
            <TabsTrigger
              value="cadena_valor"
              className="gap-2 text-xs data-[state=active]:bg-surface-1 data-[state=active]:text-text-primary"
            >
              <Layers className="h-3.5 w-3.5 text-ember" />
              <span>Cadena de Valor y Seguimiento</span>
            </TabsTrigger>
            <TabsTrigger
              value="rendicion_cuentas"
              className="gap-2 text-xs data-[state=active]:bg-surface-1 data-[state=active]:text-text-primary"
            >
              <Scale className="h-3.5 w-3.5 text-info" />
              <span>Rendición de Cuentas (C-150/15)</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Matriz de Compromisos PAS */}
        <TabsContent value="matriz_compromisos" className="space-y-6 outline-none">
          {/* Tarjetas KPI de Seguimiento */}
          <SeguimientoKpis kpis={kpis} />

          {/* Barra de Filtros Multicriterio */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Buscador reactivo */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <Input
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({ busqueda: e.target.value })}
                  placeholder="Buscar por código, nombre, indicador o alternativa de solución..."
                  aria-label="Buscar compromisos por código, nombre, indicador o alternativa de solución"
                  className="pl-9 text-xs"
                />
              </div>

              {/* Filtro Entidad Responsable */}
              <div className="w-[220px]">
                <Select
                  value={filtros.entidad}
                  onValueChange={(val) => setFiltros({ entidad: val })}
                >
                  <SelectTrigger className="text-xs" aria-label="Filtrar por entidad responsable">
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
                  <SelectTrigger className="text-xs" aria-label="Filtrar por estado de cumplimiento">
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
                  aria-label="Limpiar filtros de búsqueda"
                  className="h-9 gap-1.5 px-3 text-xs text-text-muted hover:text-text-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
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
            puedeEditar={puedeEditarEfectivo}
          />
        </TabsContent>

        {/* Tab 2: Cadena de Valor SINERGIA */}
        <TabsContent value="cadena_valor" className="space-y-6 outline-none">
          <CadenaValorTab puedeEditar={puedeEditarEfectivo} />
        </TabsContent>

        {/* Tab 3: Rendición de Cuentas y Devolución Ciudadana */}
        <TabsContent value="rendicion_cuentas" className="space-y-6 outline-none">
          <RendicionCuentasTab puedeEditar={puedeEditarEfectivo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
