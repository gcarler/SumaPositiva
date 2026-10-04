"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Globe,
  MessageSquare,
  Sparkles,
  MapPin,
  Search,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Scale,
  CheckCircle2,
  Percent,
  Bot,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { usePanels } from "@/core/panels/panel-store";
import {
  useDevolucionStore,
  filtrarPropuestas,
} from "../state/devolucion-store";
import type { PropuestaDevolucion, EstadoIncorporacion } from "../models/devolucion";
import {
  ESTADOS_INCORPORACION_INFO,
  CAUSALES_DESCARTE_INFO,
} from "../models/devolucion";
import { sanitizarCsv } from "@/shared/lib/csv";

interface RendicionCuentasTabProps {
  puedeEditar: boolean;
}

export function RendicionCuentasTab({ puedeEditar }: RendicionCuentasTabProps) {
  const { openPanel } = usePanels();

  const propuestas = useDevolucionStore((s) => s.propuestas);
  const consolidado = useDevolucionStore((s) => s.consolidado);
  const totalAportes = useDevolucionStore((s) => s.totalAportes);
  const totalRespondidos = useDevolucionStore((s) => s.totalRespondidos);
  const totalPendientes = useDevolucionStore((s) => s.totalPendientes);
  const tasaRespuestaMotivada = useDevolucionStore((s) => s.tasaRespuestaMotivada);
  const esContingencia = useDevolucionStore((s) => s.esContingencia);
  const filtros = useDevolucionStore((s) => s.filtros);
  const setFiltros = useDevolucionStore((s) => s.setFiltros);
  const limpiarFiltros = useDevolucionStore((s) => s.limpiarFiltros);
  const evaluandoIa = useDevolucionStore((s) => s.evaluandoIa);
  const resultadoIa = useDevolucionStore((s) => s.resultadoIa);
  const ejecutarEvaluacionIa = useDevolucionStore((s) => s.ejecutarEvaluacionIa);

  const [paginaActual, setPaginaActual] = useState(1);
  const [tamanoPagina, setTamanoPagina] = useState(20);

  const propuestasFiltradas = useMemo(
    () => filtrarPropuestas(propuestas, filtros),
    [propuestas, filtros]
  );

  const totalPaginas = Math.max(1, Math.ceil(propuestasFiltradas.length / tamanoPagina));
  const paginaValida = Math.min(paginaActual, totalPaginas);

  const propuestasPaginadas = useMemo(() => {
    const inicio = (paginaValida - 1) * tamanoPagina;
    return propuestasFiltradas.slice(inicio, inicio + tamanoPagina);
  }, [propuestasFiltradas, paginaValida, tamanoPagina]);

  const handleCambiarFiltro = (parcial: Partial<typeof filtros>) => {
    setFiltros(parcial);
    setPaginaActual(1);
  };

  const handleLimpiarFiltros = () => {
    limpiarFiltros();
    setPaginaActual(1);
  };

  const territoriosUnicos = useMemo(() => {
    const set = new Set(propuestas.map((p) => p.territorio));
    return Array.from(set).sort();
  }, [propuestas]);

  const hayFiltrosActivos =
    filtros.busqueda.trim() !== "" ||
    filtros.territorio !== "todos" ||
    filtros.estado !== "todos";

  const handleAbrirFicha = (p: PropuestaDevolucion) => {
    openPanel("devolucion-detalle", {
      propuestaId: p.id,
      soloLectura: !puedeEditar,
    });
  };

  const handleEvaluarIa = async () => {
    toast.info("Ejecutando Agente IA de Devolución Ciudadana C-150...");
    const ok = await ejecutarEvaluacionIa();
    if (ok) {
      toast.success("Dictamen de Devolución Ciudadana C-150/15 generado.");
    } else {
      toast.error("Error al ejecutar el agente de devolución.");
    }
  };

  const exportarCSV = () => {
    try {
      const headers = [
        "Código",
        "Título",
        "Descripción",
        "Territorio",
        "Canal",
        "Autor",
        "Fecha Radicación",
        "Estado Incorporación",
        "Compromiso PAS",
        "Causal Descarte",
        "Motivación Sustancial",
        "Norma Invocada",
        "Ruta Alternativa",
      ];

      const rows = propuestasFiltradas.map((p) => [
        sanitizarCsv(p.codigo),
        sanitizarCsv(p.titulo),
        sanitizarCsv(p.descripcion),
        sanitizarCsv(p.territorio),
        sanitizarCsv(p.canal_origen),
        sanitizarCsv(p.autor_nombre),
        sanitizarCsv(p.fecha_radicacion),
        sanitizarCsv(ESTADOS_INCORPORACION_INFO[p.estado_incorporacion]?.label ?? p.estado_incorporacion),
        sanitizarCsv(p.compromiso_pas_codigo ?? ""),
        sanitizarCsv(p.causal_descarte ? CAUSALES_DESCARTE_INFO[p.causal_descarte]?.label : ""),
        sanitizarCsv(p.motivacion_sustancial ?? ""),
        sanitizarCsv(p.norma_invocada ?? ""),
        sanitizarCsv(p.ruta_alternativa ?? ""),
      ]);

      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `devolucion_ciudadana_c150_cartagena_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Matriz de devolución ciudadana exportada en CSV seguro.");
    } catch {
      toast.error("Error al exportar matriz a CSV.");
    }
  };

  const exportarJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(propuestasFiltradas, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `devolucion_ciudadana_c150_cartagena_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Matriz exportada en formato JSON estructurado.");
    } catch {
      toast.error("Error al exportar a JSON.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Tarjetas KPI Multicanal de Participación */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-text-muted">Total Participantes</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-soft text-ember">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-text-primary">
              {consolidado.gran_total_participantes_distrital}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {consolidado.participantes_unicos_identificados} personas únicas identificadas
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-text-muted">Canal Web Ciudadano</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info">
              <Globe className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-text-primary">
              {consolidado.total_canal_web}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {consolidado.porcentaje_canal_web}% de la participación total
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-text-muted">Mesas y Escenarios</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-soft text-ember">
              <MessageSquare className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-text-primary">
              {consolidado.total_canal_mesas + consolidado.total_canal_escenarios}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {consolidado.total_canal_mesas} en mesas territoriales · {consolidado.total_canal_escenarios} en escenarios
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-text-muted">Respuesta Motivada (C-150)</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">
                {tasaRespuestaMotivada}%
              </span>
              <span className="text-xs text-text-muted">
                ({totalRespondidos}/{totalAportes})
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={tasaRespuestaMotivada}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tasa de respuesta motivada C-150: ${tasaRespuestaMotivada}%`}
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className="h-full rounded-full bg-success transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, tasaRespuestaMotivada))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {totalRespondidos} respondidos · {totalPendientes} sin respuesta
            </p>
          </div>
        </div>
      </div>

      {/* Banner de Contingencia si la API de aportes no responde */}
      {esContingencia && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-xs text-text-primary">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-warning text-sm">
              Sin conexión con el servidor central
            </span>
            <p className="text-text-secondary leading-relaxed pt-0.5">
              No fue posible recuperar los aportes en vivo desde /api/v1/aportes. La plataforma de control social no presenta datos ni cifras ficticias en cumplimiento estricto del mandato de integridad forense.
            </p>
          </div>
        </div>
      )}

      {/* Banner de Dictamen IA C-150 si fue ejecutado */}
      {resultadoIa && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-4 text-xs text-text-primary">
          <Bot className="h-5 w-5 shrink-0 text-ember mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-text-primary text-sm">
              Dictamen Oficial del Agente IA DNP — Cumplimiento C-150/15
            </span>
            <p className="text-text-secondary leading-relaxed pt-0.5">
              {resultadoIa}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              value={filtros.busqueda}
              onChange={(e) => handleCambiarFiltro({ busqueda: e.target.value })}
              placeholder="Buscar por código, título, territorio o palabra clave..."
              aria-label="Buscar propuestas comunitarias por código, título, territorio o palabra clave"
              className="pl-9 text-xs"
            />
          </div>

          {/* Filtro Territorio */}
          <div className="w-[200px]">
            <Select
              value={filtros.territorio}
              onValueChange={(val) => handleCambiarFiltro({ territorio: val })}
            >
              <SelectTrigger className="text-xs" aria-label="Filtrar por territorio de origen">
                <SelectValue placeholder="Territorio de origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos los territorios
                </SelectItem>
                {territoriosUnicos.map((terr) => (
                  <SelectItem key={terr} value={terr} className="text-xs">
                    {terr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Estado Incorporación */}
          <div className="w-[220px]">
            <Select
              value={filtros.estado}
              onValueChange={(val) =>
                handleCambiarFiltro({ estado: val as EstadoIncorporacion | "todos" })
              }
            >
              <SelectTrigger className="text-xs" aria-label="Filtrar por estado de incorporación">
                <SelectValue placeholder="Estado de incorporación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos los estados
                </SelectItem>
                {Object.entries(ESTADOS_INCORPORACION_INFO).map(([key, info]) => (
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
              onClick={handleLimpiarFiltros}
              aria-label="Limpiar filtros de propuestas"
              className="h-9 gap-1.5 px-3 text-xs text-text-muted hover:text-text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpiar</span>
            </Button>
          )}

          {/* Botón Evaluar IA C-150 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluarIa}
            disabled={evaluandoIa}
            aria-label="Evaluar devolución ciudadana con agente IA DNP"
            className="gap-1.5 text-xs text-text-primary border-border hover:bg-surface-2"
          >
            <Bot className="h-4 w-4 text-ember" aria-hidden="true" />
            <span>{evaluandoIa ? "Evaluando con IA..." : "Evaluar Devolución IA"}</span>
          </Button>

          {/* Menú Exportar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                aria-label="Exportar matriz de devolución ciudadana"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportarCSV} className="gap-2 text-xs">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Exportar CSV (Excel / Veeduría)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportarJSON} className="gap-2 text-xs">
                <FileJson className="h-4 w-4" />
                <span>Exportar JSON Estructurado</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Mostrando <strong className="text-text-primary">{propuestasFiltradas.length}</strong> de{" "}
            {propuestas.length} propuestas comunitarias radicadas
          </span>
          <span className="text-[11px] text-text-secondary">
            Proscripción del descarte silencioso · Sentencia C-150 de 2015
          </span>
        </div>
      </div>

      {/* DataGrid Interactivo de Propuestas y Devolución */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm">
        <div className="overflow-x-auto">
          <Table aria-label="Matriz de rendición de cuentas y devolución ciudadana C-150">
            <caption className="sr-only">
              Matriz de propuestas ciudadanas y estado de motivación sustancial C-150
            </caption>
            <TableHeader>
              <TableRow className="border-b border-border bg-surface-2 hover:bg-surface-2">
                <TableHead scope="col" className="w-[130px] font-semibold text-text-primary">
                  Código
                </TableHead>
                <TableHead scope="col" className="min-w-[280px] font-semibold text-text-primary">
                  Propuesta Comunitaria
                </TableHead>
                <TableHead scope="col" className="w-[160px] font-semibold text-text-primary">
                  Territorio y Canal
                </TableHead>
                <TableHead scope="col" className="w-[180px] text-center font-semibold text-text-primary">
                  Estado Incorporación
                </TableHead>
                <TableHead scope="col" className="min-w-[220px] font-semibold text-text-primary">
                  Compromiso PAS o Causal C-150
                </TableHead>
                <TableHead scope="col" className="w-[150px] text-right font-semibold text-text-primary">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propuestasPaginadas.map((p) => {
                const infoEstado = ESTADOS_INCORPORACION_INFO[p.estado_incorporacion] ?? {
                  label: p.estado_incorporacion,
                  badgeVariant: "secondary" as const,
                  colorClase: "",
                  descripcion: "",
                };
                const infoCausal = p.causal_descarte
                  ? CAUSALES_DESCARTE_INFO[p.causal_descarte]
                  : null;

                return (
                  <TableRow
                    key={p.id}
                    className="border-b border-border transition-colors hover:bg-surface-2/60"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-text-primary">
                      {p.codigo}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-text-primary text-xs">
                          {p.titulo}
                        </span>
                        <span className="line-clamp-2 text-[11px] text-text-muted">
                          {p.descripcion}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 text-text-primary font-medium">
                          <MapPin className="h-3 w-3 shrink-0 text-text-muted" aria-hidden="true" />
                          <span>{p.territorio}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] w-fit uppercase">
                          {p.canal_origen}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={infoEstado.badgeVariant} className="text-xs">
                        {infoEstado.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.estado_incorporacion === "SIN_RESPUESTA" ? (
                        <span className="text-[11px] text-text-muted italic">
                          Pendiente de motivación institucional (C-150)
                        </span>
                      ) : p.estado_incorporacion !== "NO_INCORPORADA_MOTIVADA" ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-mono font-semibold text-text-primary">
                            {p.compromiso_pas_codigo || "Articulada al PAS"}
                          </span>
                          <span className="text-[11px] text-text-muted truncate">
                            {p.compromiso_pas_nombre || "Meta distrital"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-semibold text-danger">
                            {infoCausal?.label ?? "Causal no registrada"}
                          </span>
                          <span className="line-clamp-1 text-[11px] text-text-muted">
                            {p.motivacion_sustancial ?? infoCausal?.norma}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirFicha(p)}
                        aria-label={`${p.estado_incorporacion === "SIN_RESPUESTA" && puedeEditar ? "Motivar respuesta C-150 para propuesta" : "Ver ficha C-150 de"} ${p.codigo}`}
                        className="gap-1.5 text-xs h-8"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {p.estado_incorporacion === "SIN_RESPUESTA" && puedeEditar
                            ? "Motivar C-150"
                            : "Ver Ficha C-150"}
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Controles de Paginación */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-1 px-4 py-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span>Filas por página:</span>
            <Select
              value={String(tamanoPagina)}
              onValueChange={(val) => {
                setTamanoPagina(Number(val));
                setPaginaActual(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs" aria-label="Seleccionar filas por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10" className="text-xs">10</SelectItem>
                <SelectItem value="20" className="text-xs">20</SelectItem>
                <SelectItem value="50" className="text-xs">50</SelectItem>
                <SelectItem value="100" className="text-xs">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-2">
              Mostrando{" "}
              <strong className="text-text-primary">
                {propuestasFiltradas.length === 0
                  ? 0
                  : (paginaValida - 1) * tamanoPagina + 1}
              </strong>
              {" - "}
              <strong className="text-text-primary">
                {Math.min(paginaValida * tamanoPagina, propuestasFiltradas.length)}
              </strong>{" "}
              de <strong className="text-text-primary">{propuestasFiltradas.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Página <strong className="text-text-primary">{paginaValida}</strong> de{" "}
              <strong className="text-text-primary">{totalPaginas}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={paginaValida <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                aria-label="Ir a la página anterior"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Anterior</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={paginaValida >= totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                aria-label="Ir a la página siguiente"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Siguiente</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
