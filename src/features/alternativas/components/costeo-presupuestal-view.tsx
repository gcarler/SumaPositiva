"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Coins,
  DollarSign,
  ShieldAlert,
  Landmark,
  Calendar,
  Plus,
  RotateCw,
  Search,
  Filter,
  FileSpreadsheet,
  FileJson,
  Download,
  AlertTriangle,
  Building,
  CheckCircle2,
  Tag,
  Eye,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
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
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import type {
  AsignacionPresupuestal,
  FuenteFinanciacion,
  ResumenCosteo,
} from "../models/presupuesto";
import {
  listarAsignacionesPresupuestales,
  listarFuentesFinanciacion,
  obtenerResumenCosteo,
  calcularKpisPresupuesto,
} from "../services/presupuesto-api";

function sanitizarCsv(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null) return '""';
  let str = String(valor).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

interface CosteoPresupuestalViewProps {
  puedeEditar?: boolean;
}

export function CosteoPresupuestalView({ puedeEditar: puedeEditarProp }: CosteoPresupuestalViewProps = {}) {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario =
    puedeEditarProp !== undefined ? puedeEditarProp : puedeEditar(sesion, "alternativas");

  const [asignaciones, setAsignaciones] = useState<AsignacionPresupuestal[]>([]);
  const [fuentes, setFuentes] = useState<FuenteFinanciacion[]>([]);
  const [resumen, setResumen] = useState<ResumenCosteo | null>(null);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroFuente, setFiltroFuente] = useState<string>("todas");
  const [filtroVigencia, setFiltroVigencia] = useState<string>("todas");
  const [filtroVigenciaFutura, setFiltroVigenciaFutura] = useState<string>("todas");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [datosAsignaciones, datosFuentes, datosResumen] = await Promise.all([
        listarAsignacionesPresupuestales(),
        listarFuentesFinanciacion(),
        obtenerResumenCosteo(),
      ]);
      setAsignaciones(datosAsignaciones);
      setFuentes(datosFuentes);
      setResumen(datosResumen);
    } catch {
      toast.error("Error al sincronizar datos presupuestales distritales.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const kpis = useMemo(() => calcularKpisPresupuesto(asignaciones), [asignaciones]);

  const formatoMoneda = (val: number | string) => {
    const num = typeof val === "number" ? val : Number(val);
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  };

  const formatoMilesMillones = (val: number) => {
    const milesMillones = val / 1_000_000_000;
    return `$ ${milesMillones.toLocaleString("es-CO", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} M COP`;
  };

  // Filtrado reactivo de asignaciones
  const asignacionesFiltradas = useMemo(() => {
    return asignaciones.filter((item) => {
      const q = busqueda.trim().toLowerCase();
      if (q) {
        const matchAlt =
          item.metadatos?.alternativa_codigo?.toLowerCase().includes(q) ||
          item.metadatos?.alternativa_nombre?.toLowerCase().includes(q);
        const matchBpin = item.codigo_bpin?.toLowerCase().includes(q);
        const matchJust = item.justificacion.toLowerCase().includes(q);
        const matchFuente = item.fuente_nombre?.toLowerCase().includes(q);
        if (!matchAlt && !matchBpin && !matchJust && !matchFuente) {
          return false;
        }
      }

      if (filtroFuente !== "todas" && item.fuente_financiacion_id !== filtroFuente && item.fuente_codigo !== filtroFuente) {
        return false;
      }

      if (filtroVigencia !== "todas" && String(item.anio_vigencia) !== filtroVigencia) {
        return false;
      }

      if (filtroVigenciaFutura === "si" && !item.es_vigencia_futura) return false;
      if (filtroVigenciaFutura === "no" && item.es_vigencia_futura) return false;

      return true;
    });
  }, [asignaciones, busqueda, filtroFuente, filtroVigencia, filtroVigenciaFutura]);

  const handleNuevaAsignacion = () => {
    openPanel("asignacion-presupuestal", {
      soloLectura: !puedeEditarUsuario,
      onAsignacionGuardada: cargarDatos,
    });
  };

  const handleInspeccionarAsignacion = (asig: AsignacionPresupuestal) => {
    openPanel("asignacion-presupuestal", {
      alternativaId: asig.metadatos?.alternativa_id,
      asignacionId: asig.id,
      soloLectura: true,
      onAsignacionGuardada: cargarDatos,
    });
  };

  const handleExportarCsv = () => {
    try {
      const headers = [
        "ID Asignación",
        "Código Alternativa",
        "Nombre Alternativa",
        "Código BPIN",
        "Fuente Financiación",
        "Vigencia Fiscal",
        "Monto Estimado COP",
        "Es Vigencia Futura",
        "Tipo Vigencia Futura",
        "Justificación Técnica",
      ];

      const filas = asignacionesFiltradas.map((asig) => [
        sanitizarCsv(asig.id),
        sanitizarCsv(asig.metadatos?.alternativa_codigo ?? "N/A"),
        sanitizarCsv(asig.metadatos?.alternativa_nombre ?? "N/A"),
        sanitizarCsv(asig.codigo_bpin ?? "N/A"),
        sanitizarCsv(asig.fuente_nombre ?? asig.fuente_codigo ?? "N/A"),
        sanitizarCsv(asig.anio_vigencia),
        sanitizarCsv(asig.monto_estimado),
        sanitizarCsv(asig.es_vigencia_futura ? "SÍ" : "NO"),
        sanitizarCsv(asig.tipo_vigencia_futura ?? "N/A"),
        sanitizarCsv(asig.justificacion),
      ]);

      const contenido = [
        headers.join(","),
        ...filas.map((f) => f.join(",")),
      ].join("\n");

      const blob = new Blob([`\uFEFF${contenido}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `costeo-presupuestal-cartagena-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Catálogo presupuestal exportado en CSV.");
    } catch {
      toast.error("Error al exportar a CSV.");
    }
  };

  const handleExportarJson = () => {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              kpis,
              resumen,
              fuentes,
              asignaciones: asignacionesFiltradas,
              fecha_corte: new Date().toISOString(),
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `costeo-presupuestal-cartagena-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Catálogo presupuestal exportado en JSON.");
    } catch {
      toast.error("Error al exportar a JSON.");
    }
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroFuente("todas");
    setFiltroVigencia("todas");
    setFiltroVigenciaFutura("todas");
  };

  const hayFiltrosActivos =
    busqueda.trim() !== "" ||
    filtroFuente !== "todas" ||
    filtroVigencia !== "todas" ||
    filtroVigenciaFutura !== "todas";

  return (
    <div className="space-y-6">
      {/* Barra de Acciones Superiores del Tablero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border bg-surface-1">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Coins className="size-4 text-ember" aria-hidden="true" />
            Plan Financiero y Asignaciones Presupuestales Cuatrienales
          </h2>
          <p className="text-xs text-text-muted">
            Monitoreo y formalización de recursos FONSET, transferencias de la Nación (SGP), regalías (SGR) e ICLD vinculados al Banco de Alternativas MGA.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={cargarDatos}
            disabled={cargando}
            className="h-8 gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <RotateCw
              className={`size-3.5 ${cargando ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Actualizar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                <Download className="size-3.5" aria-hidden="true" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleExportarCsv}
                className="gap-2 cursor-pointer text-xs"
              >
                <FileSpreadsheet className="size-4 text-success" aria-hidden="true" />
                <span>Exportar CSV (Excel)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportarJson}
                className="gap-2 cursor-pointer text-xs"
              >
                <FileJson className="size-4 text-accent" aria-hidden="true" />
                <span>Exportar JSON Estructurado</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {puedeEditarUsuario && (
            <Button
              size="sm"
              onClick={handleNuevaAsignacion}
              className="h-8 gap-1.5 text-xs bg-ember hover:bg-ember/90 text-text-inverse font-semibold"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Nueva Asignación</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI Presupuestales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Presupuesto Total */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Presupuesto Asignado</span>
            <DollarSign className="size-4 text-accent" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-text-primary">
              {formatoMilesMillones(kpis.totalAsignado)}
            </p>
            <p className="text-[11px] text-text-muted">
              {kpis.conteoAsignaciones} compromisos registrados en {resumen?.por_vigencia.length ?? 0} vigencias
            </p>
          </div>
        </div>

        {/* KPI 2: Recursos FONSET */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Recursos FONSET</span>
            <Coins className="size-4 text-ember" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-ember">
              {formatoMilesMillones(kpis.totalFonset)}
            </p>
            <p className="text-[11px] text-text-muted">
              Ley 418/97 & 2272/22 (Seguridad Humana y Orden Público)
            </p>
          </div>
        </div>

        {/* KPI 3: SGP y SGR */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Transferencias SGP / SGR</span>
            <Landmark className="size-4 text-success" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-success">
              {formatoMilesMillones(kpis.totalSgpSgr)}
            </p>
            <p className="text-[11px] text-text-muted">
              Leyes 715/01 y 2056/20 (Nación y Regalías Directas)
            </p>
          </div>
        </div>

        {/* KPI 4: Vigencias Futuras */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Vigencias Futuras</span>
            <Calendar className="size-4 text-warning" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-warning">
              {formatoMilesMillones(kpis.totalVigenciasFuturas)}
            </p>
            <p className="text-[11px] text-text-muted">
              Leyes 819/03 y 1483/11 (Compromisos Plurianuales)
            </p>
          </div>
        </div>
      </div>

      {/* Desglose de Fuentes y Distribución Plurianual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución por Fuente de Financiación */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Landmark className="size-3.5 text-ember" aria-hidden="true" />
            Distribución por Fuente Distrital
          </span>
          <div className="space-y-2.5">
            {resumen?.por_fuente.map((item, idx) => {
              const totalNum = Number(resumen.total_asignado) || 1;
              const porcentaje = Math.round((item.total / totalNum) * 100);
              return (
                <div key={idx} className="space-y-1 p-2.5 rounded-lg border border-border bg-surface-2/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary">{item.fuente}</span>
                    <span className="font-semibold text-text-primary">{formatoMoneda(item.total)} ({porcentaje}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-ember transition-all duration-300"
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribución Plurianual por Vigencia */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="size-3.5 text-ember" aria-hidden="true" />
            Plan Financiero por Vigencia Fiscal (2026 - 2029)
          </span>
          <div className="space-y-2.5">
            {resumen?.por_vigencia.map((item, idx) => {
              const totalNum = Number(resumen.total_asignado) || 1;
              const porcentaje = Math.round((item.total / totalNum) * 100);
              const esFutura = item.vigencia > 2026;
              return (
                <div key={idx} className="space-y-1 p-2.5 rounded-lg border border-border bg-surface-2/60">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">Vigencia {item.vigencia}</span>
                      {esFutura && (
                        <Badge variant="outline" className="border-border text-[10px] text-warning">
                          Vigencia Futura
                        </Badge>
                      )}
                    </div>
                    <span className="font-semibold text-text-primary">{formatoMoneda(item.total)} ({porcentaje}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        esFutura ? "bg-warning" : "bg-accent"
                      }`}
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de Filtros de la Tabla */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-border bg-surface-1">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Buscar por código BPIN, alternativa, fuente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 h-8 text-xs bg-surface-2 border-border"
            />
          </div>

          <Select value={filtroFuente} onValueChange={setFiltroFuente}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-surface-2 border-border">
              <SelectValue placeholder="Fuente..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">Todas las fuentes</SelectItem>
              {fuentes.map((f) => (
                <SelectItem key={f.id} value={f.codigo} className="text-xs">
                  {f.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroVigencia} onValueChange={setFiltroVigencia}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-surface-2 border-border">
              <SelectValue placeholder="Vigencia..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">Toda vigencia</SelectItem>
              <SelectItem value="2026" className="text-xs">2026</SelectItem>
              <SelectItem value="2027" className="text-xs">2027</SelectItem>
              <SelectItem value="2028" className="text-xs">2028</SelectItem>
              <SelectItem value="2029" className="text-xs">2029</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroVigenciaFutura} onValueChange={setFiltroVigenciaFutura}>
            <SelectTrigger className="w-[150px] h-8 text-xs bg-surface-2 border-border">
              <SelectValue placeholder="Compromiso..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">Todos los tipos</SelectItem>
              <SelectItem value="si" className="text-xs">Solo Vigencias Futuras</SelectItem>
              <SelectItem value="no" className="text-xs">Solo Ordinarias</SelectItem>
            </SelectContent>
          </Select>

          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-8 px-2 text-xs text-text-muted hover:text-text-primary"
            >
              Limpiar
            </Button>
          )}
        </div>

        <div className="text-xs text-text-muted shrink-0">
          Mostrando <strong>{asignacionesFiltradas.length}</strong> de {asignaciones.length} asignaciones
        </div>
      </div>

      {/* Tabla de Asignaciones Presupuestales */}
      <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
        <Table>
          <TableHeader className="bg-surface-2">
            <TableRow className="border-border hover:bg-surface-2">
              <TableHead className="text-xs font-semibold text-text-secondary">Iniciativa MGA Vinculada</TableHead>
              <TableHead className="text-xs font-semibold text-text-secondary">Código BPIN</TableHead>
              <TableHead className="text-xs font-semibold text-text-secondary">Fuente de Financiación</TableHead>
              <TableHead className="text-xs font-semibold text-text-secondary text-center">Vigencia</TableHead>
              <TableHead className="text-xs font-semibold text-text-secondary text-right">Monto Asignado (COP)</TableHead>
              <TableHead className="text-xs font-semibold text-text-secondary text-center">Condición Fiscal</TableHead>
              <TableHead className="text-xs font-semibold text-text-secondary text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asignacionesFiltradas.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="text-center py-8 text-xs text-text-muted">
                  No se encontraron asignaciones presupuestales con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              asignacionesFiltradas.map((asig) => {
                const montoNum = typeof asig.monto_estimado === "number"
                  ? asig.monto_estimado
                  : Number(asig.monto_estimado ?? 0);

                return (
                  <TableRow key={asig.id} className="border-border hover:bg-surface-2/50 transition-colors">
                    <TableCell className="text-xs font-medium text-text-primary max-w-[260px]">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-text-primary block truncate">
                          {asig.metadatos?.alternativa_codigo ?? "MGA"}
                        </span>
                        <p className="text-[11px] text-text-muted truncate">
                          {asig.metadatos?.alternativa_nombre ?? asig.justificacion}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-text-secondary">
                      {asig.codigo_bpin ? (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="size-3 text-text-muted" aria-hidden="true" />
                          {asig.codigo_bpin}
                        </span>
                      ) : (
                        <span className="text-text-muted">En trámite</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-text-primary max-w-[200px]">
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="border-border text-[10px] font-mono text-accent">
                          {asig.fuente_codigo ?? "DIST"}
                        </Badge>
                        <p className="text-[11px] text-text-muted truncate">
                          {asig.fuente_nombre}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-center font-bold text-text-primary">
                      {asig.anio_vigencia}
                    </TableCell>

                    <TableCell className="text-xs text-right font-mono font-bold text-text-primary">
                      {formatoMoneda(montoNum)}
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      {asig.es_vigencia_futura ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] border-border ${
                            asig.tipo_vigencia_futura === "Excepcional"
                              ? "text-danger bg-danger/10 border-danger/20"
                              : "text-warning bg-warning/10 border-warning/20"
                          }`}
                        >
                          VF {asig.tipo_vigencia_futura ?? "Ordinaria"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-border text-success bg-success/10 border-success/20">
                          Vigencia Ordinaria
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInspeccionarAsignacion(asig)}
                        className="h-7 px-2 text-xs text-text-secondary hover:text-text-primary gap-1"
                      >
                        <Eye className="size-3.5 text-ember" aria-hidden="true" />
                        <span>Inspeccionar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
