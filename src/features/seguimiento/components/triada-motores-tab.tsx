"use client";

import { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  Coins,
  TrendingUp,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  ArrowRight,
  FileClock,
  Sparkles,
  Database,
  BarChart3,
  RefreshCw,
  Compass,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  obtenerResumenTriadaMotoresApi,
  detectarFormatoPlanAccionApi,
  obtenerResumenTriadaMotoresLocal,
  detectarFormatoPlanAccionLocal,
  DIMENSIONES_SEGURIDAD_HUMANA_INFO,
  PERIODOS_GOBIERNO_INFO,
  type ResumenTriadaMotoresRespuesta,
  type DetectarFormatoPlanAccionRespuesta,
  type ArchivoExcelPlanAccion2026,
} from "../services/plan-accion-dnp-api";
import { InteligenciaForense6MPanel } from "./inteligencia-forense-6m-panel";
import { DeaEconometriaPanel } from "./dea-econometria-panel";
import { PddDeaEvaluacionPanel } from "./pdd-dea-evaluacion-panel";

export interface TriadaMotoresTabProps {
  puedeEditar?: boolean;
}

export function TriadaMotoresTab({ puedeEditar = false }: TriadaMotoresTabProps) {
  // Sub-vista activa
  const [subvistaActiva, setSubvistaActiva] = useState<
    | "triada_lecturas"
    | "detector_multiformato"
    | "conector_transparencia"
    | "inteligencia_forense"
    | "dea_econometria"
    | "pdd_dea"
  >("triada_lecturas");

  // Estado general de datos inicializado con catálogo canónico (SSR y resiliencia offline)
  const [datosConsolidados, setDatosConsolidados] =
    useState<ResumenTriadaMotoresRespuesta>(obtenerResumenTriadaMotoresLocal);

  // Filtros de Sub-vista 1 (Triada de Lecturas)
  const [filtroCuatrienio, setFiltroCuatrienio] = useState<string>("2024–2027");
  const [filtroDependencia, setFiltroDependencia] = useState<string>("TODAS");
  const [filtroFuente, setFiltroFuente] = useState<string>("TODAS");
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>("TODOS");
  const [filtroDimensionTriada, setFiltroDimensionTriada] = useState<string>("TODAS");
  const [filtroPeriodoTriada, setFiltroPeriodoTriada] = useState<string>("TODOS");

  // Estado de Sub-vista 2 (Detector Polimórfico)
  const [muestraSeleccionadaId, setMuestraSeleccionadaId] = useState<string>(
    "muestra-2026-planeacion"
  );
  const [resultadoDeteccion, setResultadoDeteccion] =
    useState<DetectarFormatoPlanAccionRespuesta>(() =>
      detectarFormatoPlanAccionLocal({ codigo_muestra: "muestra-2026-planeacion" })
    );
  const [detectando, setDetectando] = useState<boolean>(false);

  // Estado de Sub-vista 3 (Conector Transparencia)
  const [busquedaArchivo, setBusquedaArchivo] = useState<string>("");
  const [filtroExtension, setFiltroExtension] = useState<string>("TODAS");
  const [filtroPerfilArchivo, setFiltroPerfilArchivo] = useState<string>("TODOS");

  // Refresco asíncrono con API si está disponible
  useEffect(() => {
    let activo = true;
    async function sincronizarConBackend() {
      try {
        const data = await obtenerResumenTriadaMotoresApi();
        if (activo && data) {
          setDatosConsolidados(data);
        }
      } catch (err) {
        console.warn("Uso de datos locales canónicos para la Triada de Motores:", err);
      }
    }
    void sincronizarConBackend();
    return () => {
      activo = false;
    };
  }, []);

  // Ejecutar detección polimórfica al cambiar la muestra seleccionada
  useEffect(() => {
    async function ejecutarDeteccion() {
      setDetectando(true);
      const res = await detectarFormatoPlanAccionApi({
        codigo_muestra: muestraSeleccionadaId,
      });
      setResultadoDeteccion(res);
      setDetectando(false);
    }
    void ejecutarDeteccion();
  }, [muestraSeleccionadaId]);

  // Cruces filtrados para la Matriz de las 3 Lecturas
  const crucesFiltrados = useMemo(() => {
    if (!datosConsolidados) return [];
    let list = datosConsolidados.cruce_lecturas;

    if (filtroDependencia !== "TODAS") {
      list = list.filter((c) =>
        c.dependencia.toLowerCase().includes(filtroDependencia.toLowerCase())
      );
    }
    if (filtroFuente !== "TODAS") {
      list = list.filter((c) => c.fuente_financiacion === filtroFuente);
    }
    if (filtroSemaforo !== "TODOS") {
      list = list.filter((c) => c.estado_semaforo === filtroSemaforo);
    }
    return list;
  }, [datosConsolidados, filtroDependencia, filtroFuente, filtroSemaforo]);

  // Archivos de Transparencia filtrados
  const archivosFiltrados = useMemo(() => {
    if (!datosConsolidados) return [];
    let list = datosConsolidados.archivos_excel_2026;

    if (busquedaArchivo.trim() !== "") {
      const q = busquedaArchivo.toLowerCase();
      list = list.filter(
        (a) =>
          a.nombre_archivo.toLowerCase().includes(q) ||
          a.dependencia.toLowerCase().includes(q) ||
          a.sigla.toLowerCase().includes(q)
      );
    }
    if (filtroExtension !== "TODAS") {
      list = list.filter((a) => a.extension === filtroExtension);
    }
    if (filtroPerfilArchivo !== "TODOS") {
      list = list.filter((a) => a.perfil_formato === filtroPerfilArchivo);
    }
    return list;
  }, [datosConsolidados, busquedaArchivo, filtroExtension, filtroPerfilArchivo]);

  // Función para redirigir desde un archivo de transparencia al detector
  const handleInspeccionarArchivo = (archivo: ArchivoExcelPlanAccion2026) => {
    if (archivo.perfil_formato === "PA_MONOHOJA_2016_2019") {
      setMuestraSeleccionadaId("muestra-2016-dadis");
    } else {
      setMuestraSeleccionadaId("muestra-2026-planeacion");
    }
    setSubvistaActiva("detector_multiformato");
  };

  if (!datosConsolidados) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface-1 p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-ember" />
        <p className="text-sm font-medium text-text-primary">
          Cargando articulación de los 3 Motores y Catálogo de Transparencia Cartagena...
        </p>
      </div>
    );
  }

  const { resumen_consolidado } = datosConsolidados;

  return (
    <div className="space-y-6">
      {/* 1. NAVEGADOR DE SUB-VISTAS PRINCIPALES */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={subvistaActiva === "triada_lecturas" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaActiva("triada_lecturas")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-nav-triada-lecturas"
            aria-pressed={subvistaActiva === "triada_lecturas"}
          >
            <TrendingUp className="h-4 w-4" />
            <span>1. Triada de Lecturas (PDD · PA · Inversión)</span>
          </Button>

          <Button
            variant={subvistaActiva === "detector_multiformato" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaActiva("detector_multiformato")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-nav-detector-multiformato"
            aria-pressed={subvistaActiva === "detector_multiformato"}
          >
            <Cpu className="h-4 w-4" />
            <span>2. Detector Polimórfico de Formatos Excel (2016–2026)</span>
          </Button>

          <Button
            variant={subvistaActiva === "conector_transparencia" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaActiva("conector_transparencia")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-nav-conector-transparencia"
            aria-pressed={subvistaActiva === "conector_transparencia"}
          >
            <Database className="h-4 w-4" />
            <span>3. Conector Transparencia Cartagena (23 Archivos 2026)</span>
          </Button>

          <Button
            variant={subvistaActiva === "inteligencia_forense" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaActiva("inteligencia_forense")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-nav-inteligencia-forense-6m"
            aria-pressed={subvistaActiva === "inteligencia_forense"}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>4. Laboratorio de Inteligencia Forense (6 Motores · 217k)</span>
          </Button>

          <Button
            variant={subvistaActiva === "dea_econometria" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaActiva("dea_econometria")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-nav-dea-econometria"
            aria-pressed={subvistaActiva === "dea_econometria"}
          >
            <Compass className="h-4 w-4" />
            <span>5. Frontera Eficiente DEA & Econometría (CCR · BCC · SBM · Malmquist)</span>
          </Button>

          <Button
            variant={subvistaActiva === "pdd_dea" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaActiva("pdd_dea")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-nav-pdd-dea"
            aria-pressed={subvistaActiva === "pdd_dea"}
          >
            <TrendingUp className="h-4 w-4" />
            <span>6. Evaluación & DEA Planes de Desarrollo (2012–2027 · Acuerdo 139)</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/40 bg-primary/10 text-xs font-semibold text-primary"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Calidad Forense 99,97% (217.740 registros saneados en bd_csh)</span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-ember/30 bg-ember/10 text-xs text-text-primary">
            <Sparkles className="h-3 w-3 text-ember" />
            <span>Ley 152/94 · Ley 1474/11 Art. 74</span>
          </Badge>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-VISTA 1: TRIADA DE LECTURAS (PDD · PA · INVERSIÓN) */}
      {/* ==================================================================== */}
      {subvistaActiva === "triada_lecturas" && (
        <section
          data-testid="subvista-triada-lecturas"
          aria-label="Triada de Lecturas Estratégica, Operativa y Financiera"
          className="space-y-6"
        >
          {/* Tarjetas Resumen de los 3 Motores Articulados */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Tarjeta Motor 1 */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-soft text-info">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Motor 1 · Estratégico
                    </h3>
                    <p className="text-sm font-bold text-text-primary">Plan de Desarrollo (PDD)</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-info/30 bg-info-soft text-text-primary text-[10px]">
                  Cuatrienal
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Metas Cuatrienales:</span>
                  <span className="font-semibold text-text-primary">
                    {resumen_consolidado.totales_estrategicos.total_metas_cuatrienales_pdd}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Avance Promedio PDD:</span>
                  <span className="font-semibold text-info">
                    {resumen_consolidado.totales_estrategicos.avance_cuatrienal_promedio_pct}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Cuatrienio Activo:</span>
                  <span className="font-medium text-text-secondary text-[11px] truncate max-w-[160px]">
                    2024–2027 Ciudad de Derechos
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Motor 2 */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember/15 text-ember">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Motor 2 · Operativo
                    </h3>
                    <p className="text-sm font-bold text-text-primary">Plan de Acción (PA 4.3)</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-ember/30 bg-ember/10 text-text-primary text-[10px]">
                  T1–T4
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Actividades Anuales:</span>
                  <span className="font-semibold text-text-primary">
                    {resumen_consolidado.totales_operativos.total_actividades_plan_accion}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Avance Físico Promedio:</span>
                  <span className="font-semibold text-ember">
                    {resumen_consolidado.totales_operativos.avance_fisico_promedio_pct}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Verbos Fuertes DNP:</span>
                  <span className="font-semibold text-success">
                    {resumen_consolidado.totales_operativos.cumplimiento_verbos_fuertes_dnp_pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Motor 3 */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Motor 3 · Financiero
                    </h3>
                    <p className="text-sm font-bold text-text-primary">Inversión y Presupuesto</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-success/30 bg-success-soft text-text-primary text-[10px]">
                  POAI / BPIM
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Apropiación Definitiva:</span>
                  <span className="font-semibold text-text-primary">
                    ${(resumen_consolidado.totales_presupuesto.apropiacion_definitiva_cop / 1e12).toFixed(2)} Billones
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Compromisos (RP):</span>
                  <span className="font-semibold text-success">
                    {resumen_consolidado.totales_presupuesto.porcentaje_rp_global}% (${(resumen_consolidado.totales_presupuesto.compromisos_rp_cop / 1e12).toFixed(2)}B)
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Giro Efectivo (Pagos):</span>
                  <span className="font-semibold text-text-secondary">
                    {resumen_consolidado.totales_presupuesto.porcentaje_pagos_global}% (${(resumen_consolidado.totales_presupuesto.pagos_tesoreria_cop / 1e12).toFixed(2)}B)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visualizador de la Cascada Presupuestal (Motor 3) */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-ember" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Cascada Presupuestal Distrital 2026 (Presupuesto General → Pagos de Tesorería)
                </h4>
              </div>
              <span className="text-xs text-text-muted">Corte de Ejecución Trimestral Consolidado</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-2">
              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                <span className="text-[10px] font-medium uppercase text-text-muted">Apropiación Inicial</span>
                <p className="text-xs font-bold text-text-primary">$3.450.000M</p>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-text-muted" style={{ width: "100%" }} />
                </div>
                <span className="text-[10px] text-text-muted">100.0% Base</span>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                <span className="text-[10px] font-medium uppercase text-text-muted">Apropiación Definitiva</span>
                <p className="text-xs font-bold text-text-primary">$3.820.000M</p>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-info" style={{ width: "100%" }} />
                </div>
                <span className="text-[10px] text-info">+10.7% Adiciones</span>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                <span className="text-[10px] font-medium uppercase text-text-muted">CDP Acumulado</span>
                <p className="text-xs font-bold text-text-primary">$3.310.000M</p>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-info" style={{ width: "86.6%" }} />
                </div>
                <span className="text-[10px] text-text-secondary">86.6% Certificado</span>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                <span className="text-[10px] font-medium uppercase text-text-muted">Compromisos (RP)</span>
                <p className="text-xs font-bold text-success">$2.980.000M</p>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-success" style={{ width: "78.0%" }} />
                </div>
                <span className="text-[10px] text-success">78.0% Contratado</span>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                <span className="text-[10px] font-medium uppercase text-text-muted">Obligaciones</span>
                <p className="text-xs font-bold text-text-primary">$2.450.000M</p>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-ember" style={{ width: "64.1%" }} />
                </div>
                <span className="text-[10px] text-text-secondary">64.1% Recibo a Satisfacción</span>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                <span className="text-[10px] font-medium uppercase text-text-muted">Pagos Efectivos</span>
                <p className="text-xs font-bold text-text-primary">$2.180.000M</p>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-text-primary" style={{ width: "57.1%" }} />
                </div>
                <span className="text-[10px] text-text-muted">57.1% Girado Tesorería</span>
              </div>
            </div>
          </div>

          {/* Filtros Multicriterio de la Matriz Cruzada */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro Cuatrienio */}
              <div className="w-[200px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Plan de Desarrollo (PDD)</Label>
                <Select value={filtroCuatrienio} onValueChange={setFiltroCuatrienio}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por Plan de Desarrollo">
                    <SelectValue placeholder="Cuatrienio PDD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024–2027" className="text-xs">
                      2024–2027 Ciudad de Derechos
                    </SelectItem>
                    <SelectItem value="2020–2023" className="text-xs">
                      2020–2023 Salvemos Juntos
                    </SelectItem>
                    <SelectItem value="2016–2019" className="text-xs">
                      2016–2019 Primero la Gente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Dependencia */}
              <div className="w-[220px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Dependencia Distrital</Label>
                <Select value={filtroDependencia} onValueChange={setFiltroDependencia}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por Dependencia">
                    <SelectValue placeholder="Todas las entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">
                      Todas las dependencias
                    </SelectItem>
                    <SelectItem value="DISTRISEGURIDAD" className="text-xs">
                      DISTRISEGURIDAD
                    </SelectItem>
                    <SelectItem value="Interior" className="text-xs">
                      Secretaría del Interior
                    </SelectItem>
                    <SelectItem value="Infraestructura" className="text-xs">
                      Secretaría de Infraestructura
                    </SelectItem>
                    <SelectItem value="Educación" className="text-xs">
                      Secretaría de Educación
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Fuente */}
              <div className="w-[180px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Fuente Financiación</Label>
                <Select value={filtroFuente} onValueChange={setFiltroFuente}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por Fuente">
                    <SelectValue placeholder="Todas las fuentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">
                      Todas las fuentes
                    </SelectItem>
                    <SelectItem value="FONSET" className="text-xs">
                      FONSET (Seguridad)
                    </SelectItem>
                    <SelectItem value="ICLD" className="text-xs">
                      ICLD (Libre Destino)
                    </SelectItem>
                    <SelectItem value="SGP" className="text-xs">
                      SGP (General Participaciones)
                    </SelectItem>
                    <SelectItem value="CREDITO" className="text-xs">
                      Crédito Distrital
                    </SelectItem>
                    <SelectItem value="RECURSOS_PROPIOS" className="text-xs">
                      Recursos Propios
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Semáforo */}
              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Semáforo de Coherencia</Label>
                <Select value={filtroSemaforo} onValueChange={setFiltroSemaforo}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por Estado de Semáforo">
                    <SelectValue placeholder="Todos los semáforos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Todos los estados
                    </SelectItem>
                    <SelectItem value="COHERENCIA_INTEGRAL_ALTA" className="text-xs">
                      🟢 Coherencia Integral Alta
                    </SelectItem>
                    <SelectItem value="DESFASE_CRITICO_SOBREEJECUCION" className="text-xs">
                      🔴 Desfase Sobreejecución Financiera
                    </SelectItem>
                    <SelectItem value="REZAGO_CONTRACTUAL_INVERSION" className="text-xs">
                      🟡 Rezago Contractual en Inversión
                    </SelectItem>
                    <SelectItem value="META_PDD_SUBOPERACIONALIZADA" className="text-xs">
                      🟠 Meta PDD Suboperacionalizada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Dimensión de Seguridad Humana */}
              <div className="w-[220px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Dimensión Seguridad Humana</Label>
                <Select value={filtroDimensionTriada} onValueChange={setFiltroDimensionTriada}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por Dimensión de Seguridad Humana">
                    <SelectValue placeholder="Todas las dimensiones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">
                      Todas las 8 dimensiones
                    </SelectItem>
                    {DIMENSIONES_SEGURIDAD_HUMANA_INFO.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Periodo de Gobierno */}
              <div className="w-[200px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Periodo Histórico</Label>
                <Select value={filtroPeriodoTriada} onValueChange={setFiltroPeriodoTriada}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por Periodo Histórico">
                    <SelectValue placeholder="Todos los periodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Todos los periodos (2016–2026)
                    </SelectItem>
                    {PERIODOS_GOBIERNO_INFO.map((p) => (
                      <SelectItem key={p.codigo} value={p.codigo} className="text-xs">
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Matriz Cruzada de las 3 Lecturas */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="flex flex-wrap items-center justify-between border-b border-border p-4 bg-surface-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Matriz Cruzada de las 3 Lecturas (Estratégica PDD · Operativa PA · Financiera Inversión)
                </h4>
                <p className="text-xs text-text-muted">
                  Mostrando {crucesFiltrados.length} cruces evaluados con dictamen pericial automatizado
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-success/30 bg-success-soft text-text-primary text-[10px]">
                  {resumen_consolidado.distribucion_semaforo.coherencia_alta} Coherentes
                </Badge>
                <Badge variant="outline" className="border-error/30 bg-error-soft text-text-primary text-[10px]">
                  {resumen_consolidado.distribucion_semaforo.desfase_sobreejecucion} Sobreejecución
                </Badge>
                <Badge variant="outline" className="border-warning/30 bg-warning-soft text-text-primary text-[10px]">
                  {resumen_consolidado.distribucion_semaforo.rezago_contractual} Rezagos
                </Badge>
              </div>
            </div>

            <div className="divide-y divide-border">
              {crucesFiltrados.map((cruce) => (
                <div key={cruce.id} className="p-4 space-y-3 hover:bg-surface-2/40 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {cruce.codigo_bpim}
                        </Badge>
                        <span className="font-semibold text-xs text-text-primary">
                          {cruce.dependencia}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-text-muted">
                          {cruce.fuente_financiacion}
                        </Badge>
                      </div>
                      <h5 className="text-sm font-semibold text-text-primary">
                        {cruce.proyecto_bpim_nombre}
                      </h5>
                    </div>

                    {/* Semáforo badge */}
                    <div>
                      {cruce.estado_semaforo === "COHERENCIA_INTEGRAL_ALTA" && (
                        <Badge variant="outline" className="border-success/40 bg-success-soft text-success gap-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Coherencia Integral Alta ({cruce.indice_coherencia_tripartita}%)</span>
                        </Badge>
                      )}
                      {cruce.estado_semaforo === "DESFASE_CRITICO_SOBREEJECUCION" && (
                        <Badge variant="outline" className="border-error/40 bg-error-soft text-error gap-1 text-xs">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Desfase Sobreejecución (+{cruce.brecha_fisico_financiera_pts} pts)</span>
                        </Badge>
                      )}
                      {cruce.estado_semaforo === "REZAGO_CONTRACTUAL_INVERSION" && (
                        <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning gap-1 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Rezago Contractual ({cruce.brecha_fisico_financiera_pts} pts)</span>
                        </Badge>
                      )}
                      {cruce.estado_semaforo === "META_PDD_SUBOPERACIONALIZADA" && (
                        <Badge variant="outline" className="border-ember/40 bg-ember/15 text-ember gap-1 text-xs">
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span>Meta Suboperacionalizada</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 3 Lecturas Comparadas */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-lg border border-border-subtle bg-surface-2 p-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-text-muted">1. Lectura Estratégica PDD</span>
                      <p className="text-text-secondary text-[11px] line-clamp-1">{cruce.meta_pdd_titulo}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="font-semibold text-info">{cruce.avance_estrategico_pdd_pct}%</span>
                        <span className="text-[10px] text-text-muted">avance cuatrienal</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 border-t border-border-subtle pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
                      <span className="text-[10px] uppercase font-bold text-text-muted">2. Lectura Operativa PA (4.3)</span>
                      <p className="text-text-secondary text-[11px] line-clamp-1">{cruce.actividad_pa_descripcion}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="font-semibold text-ember">{cruce.avance_operativo_pa_pct}%</span>
                        <span className="text-[10px] text-text-muted">físico entregado</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 border-t border-border-subtle pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
                      <span className="text-[10px] uppercase font-bold text-text-muted">3. Lectura Financiera (RP / Pagos)</span>
                      <p className="text-text-secondary text-[11px]">Compromisos vs Giro Efectivo</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-semibold text-success">RP: {cruce.ejecucion_financiera_rp_pct}%</span>
                        <span className="text-text-muted">·</span>
                        <span className="font-medium text-text-secondary">Pagos: {cruce.giro_pagos_pct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Hallazgo forense y Recomendación técnica */}
                  <div className="rounded-lg border border-border-subtle bg-surface-0/60 p-3 text-xs space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-text-muted mt-0.5" />
                      <p className="text-text-primary leading-relaxed">
                        <strong className="text-text-muted">Hallazgo:</strong> {cruce.hallazgo_forense}
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <ArrowRight className="h-4 w-4 shrink-0 text-ember mt-0.5" />
                      <p className="text-text-secondary leading-relaxed">
                        <strong className="text-ember">Recomendación Pericial:</strong> {cruce.recomendacion_tecnica}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 2: DETECTOR POLIMÓRFICO DE FORMATOS EXCEL (2016–2026) */}
      {/* ==================================================================== */}
      {subvistaActiva === "detector_multiformato" && (
        <section
          data-testid="subvista-detector-multiformato"
          aria-label="Detector Polimórfico de Formatos Excel"
          className="space-y-6"
        >
          {/* Selector de Muestras Reales y Simulador de Fingerprinting */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-ember" />
                  Simulador de Detección de Huella de Esquema (Schema Fingerprinting)
                </h3>
                <p className="text-xs text-text-muted">
                  Prueba en 1 clic los formatos históricos de Planes de Acción de la Alcaldía de Cartagena (2016 a 2026)
                </p>
              </div>

              <Badge variant="outline" className="border-info/30 bg-info-soft text-text-primary text-xs">
                {detectando ? "Analizando huella..." : "Huella Analizada"}
              </Badge>
            </div>

            {/* Selector de botones para las 4 muestras */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {datosConsolidados.muestras_simulacion.map((m) => (
                <Button
                  key={m.id}
                  variant={muestraSeleccionadaId === m.id ? "ember" : "outline"}
                  size="sm"
                  onClick={() => setMuestraSeleccionadaId(m.id)}
                  className="h-auto py-2.5 flex-col items-start gap-1 text-left"
                  data-testid={`btn-muestra-${m.id}`}
                >
                  <span className="font-semibold text-xs">{m.titulo_muestra}</span>
                  <span className="text-[10px] text-text-muted truncate max-w-full">
                    {m.nombre_archivo}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Resultado del Detector Polimórfico */}
          {resultadoDeteccion && (
            <div className="space-y-4">
              {/* Tarjeta de Huella y Métricas de Confianza */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Perfil Detectado</span>
                  <p className="text-sm font-bold text-ember truncate">{resultadoDeteccion.nombre_perfil}</p>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {resultadoDeteccion.perfil_detectado}
                  </Badge>
                </div>

                <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Nivel de Confianza</span>
                  <p className="text-lg font-bold text-success">
                    {resultadoDeteccion.confianza_porcentaje.toFixed(1)}%
                  </p>
                  <span className="text-[10px] text-text-muted">Coincidencia de encabezados</span>
                </div>

                <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Hojas en el Libro</span>
                  <p className="text-lg font-bold text-text-primary">
                    {resultadoDeteccion.total_hojas_analizadas} {resultadoDeteccion.total_hojas_analizadas === 1 ? "Hoja plana" : "Hojas"}
                  </p>
                  <span className="text-[10px] text-text-muted truncate block">
                    {resultadoDeteccion.nombres_hojas_analizadas.join(", ")}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Calidad Verbos DNP</span>
                  <p className="text-lg font-bold text-info">
                    {resultadoDeteccion.resumen_auditoria_dnp.cumplimiento_calidad_pct}%
                  </p>
                  <span className="text-[10px] text-text-muted">
                    {resultadoDeteccion.resumen_auditoria_dnp.verbos_fuertes_validos} fuertes / {resultadoDeteccion.resumen_auditoria_dnp.verbos_debiles_detectados} débiles
                  </span>
                </div>
              </div>

              {/* Tabla de Homologación Semántica de Columnas */}
              <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden">
                <div className="border-b border-border p-4 bg-surface-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Tabla de Homologación Semántica de Columnas (Encabezado Original → Estándar Canónico POLIS)
                  </h4>
                  <p className="text-xs text-text-muted">
                    Permite normalizar cualquier variación léxica utilizada en las 23 dependencias distritales
                  </p>
                </div>

                <div className="divide-y divide-border overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 text-text-muted">
                      <tr>
                        <th className="p-3 font-semibold">Encabezado Original del Excel</th>
                        <th className="p-3 font-semibold">Campo Canónico POLIS</th>
                        <th className="p-3 font-semibold">Estado de Mapeo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {resultadoDeteccion.mapeo_columnas_detectadas.map((col, idx) => (
                        <tr key={idx} className="hover:bg-surface-2/30">
                          <td className="p-3 font-medium text-text-primary">{col.columna_detectada}</td>
                          <td className="p-3 font-mono text-ember">{col.campo_canonico_polis}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                col.estado_homologacion === "MAPEO_EXACTO"
                                  ? "border-success/30 bg-success-soft text-success"
                                  : "border-info/30 bg-info-soft text-info"
                              }`}
                            >
                              {col.estado_homologacion === "MAPEO_EXACTO" ? "Mapeo Exacto 1:1" : "Mapeo Semántico IA"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matriz Comparativa Interanual Estandarizada (2016 vs 2020 vs 2026) */}
              <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
                <div className="border-b border-border p-4 bg-surface-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Lectura Comparativa Interanual Estandarizada (2016 vs. 2020 vs. 2026)
                  </h4>
                  <p className="text-xs text-text-muted">
                    Demostración de normalización: formatos dispares comparados de forma homogénea en el tiempo
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {datosConsolidados.comparativa_interanual.map((item, idx) => (
                    <div key={idx} className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-text-primary">{item.dependencia}</h5>
                          <span className="text-[11px] text-text-muted">{item.eje_tematico}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {item.sigla}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                        {/* 2016 */}
                        <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-text-primary">Vigencia 2016</span>
                            <Badge variant="outline" className="text-[9px]">Monohoja</Badge>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            {item.v2016.total_metas_actividades} metas · ${(item.v2016.presupuesto_asignado_cop / 1e9).toFixed(1)}MM
                          </p>
                          <div className="flex justify-between text-[11px] pt-1">
                            <span className="text-text-muted">Avance Físico:</span>
                            <span className="font-semibold text-text-secondary">{item.v2016.avance_fisico_pct}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-muted">Calidad DNP:</span>
                            <span className="font-semibold text-warning">{item.v2016.calidad_redaccion_dnp_pct}%</span>
                          </div>
                        </div>

                        {/* 2020 */}
                        <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-text-primary">Vigencia 2020</span>
                            <Badge variant="outline" className="text-[9px]">Híbrido Pilares</Badge>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            {item.v2020.total_metas_actividades} metas · ${(item.v2020.presupuesto_asignado_cop / 1e9).toFixed(1)}MM
                          </p>
                          <div className="flex justify-between text-[11px] pt-1">
                            <span className="text-text-muted">Avance Físico:</span>
                            <span className="font-semibold text-text-secondary">{item.v2020.avance_fisico_pct}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-muted">Calidad DNP:</span>
                            <span className="font-semibold text-info">{item.v2020.calidad_redaccion_dnp_pct}%</span>
                          </div>
                        </div>

                        {/* 2026 */}
                        <div className="rounded-lg border border-ember/30 bg-ember/5 p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-text-primary">Vigencia 2026 (Actual)</span>
                            <Badge variant="outline" className="border-ember/40 text-ember text-[9px]">Multihoja DNP</Badge>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            {item.v2026.total_metas_actividades} metas · ${(item.v2026.presupuesto_asignado_cop / 1e9).toFixed(1)}MM
                          </p>
                          <div className="flex justify-between text-[11px] pt-1">
                            <span className="text-text-muted">Avance Físico:</span>
                            <span className="font-semibold text-ember">{item.v2026.avance_fisico_pct}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-muted">Calidad DNP:</span>
                            <span className="font-semibold text-success">{item.v2026.calidad_redaccion_dnp_pct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 3: CONECTOR TRANSPARENCIA ALCALDÍA DE CARTAGENA */}
      {/* ==================================================================== */}
      {subvistaActiva === "conector_transparencia" && (
        <section
          data-testid="subvista-conector-transparencia"
          aria-label="Conector de Transparencia de la Alcaldía de Cartagena"
          className="space-y-6"
        >
          {/* Tarjetas de las 4 Subcategorías Oficiales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {datosConsolidados.catalogo_transparencia.map((cat) => (
              <div
                key={cat.codigo}
                className="rounded-xl border border-border bg-surface-1 p-4 space-y-2 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px] text-ember border-ember/30">
                      Cat. {cat.codigo}
                    </Badge>
                    <span className="text-[10px] text-text-muted">
                      {cat.total_documentos_detectados} docs
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary">{cat.titulo}</h4>
                  <p className="text-[11px] text-text-secondary line-clamp-3 leading-relaxed">
                    {cat.descripcion}
                  </p>
                </div>

                <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-text-muted truncate max-w-[120px]">
                    {cat.frecuencia_actualizacion}
                  </span>
                  <a
                    href={cat.url_portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-ember hover:underline"
                    aria-label={`Abrir portal de transparencia categoría ${cat.codigo}`}
                  >
                    <span>Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Inventario Interactivo de los 23 Archivos Excel 2026 */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 bg-surface-2 border-b border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Inventario de Archivos Excel 2026 (/43-plan-accion/planes-accion-institucionales-2026)
                  </h4>
                  <p className="text-xs text-text-muted">
                    23 dependencias distritales oficiales detectadas en el portal de la Alcaldía de Cartagena
                  </p>
                </div>

                <Badge variant="outline" className="border-success/30 bg-success-soft text-text-primary text-xs">
                  {archivosFiltrados.length} Archivos Disponibles
                </Badge>
              </div>

              {/* Filtros de Búsqueda de Archivos */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <Input
                    value={busquedaArchivo}
                    onChange={(e) => setBusquedaArchivo(e.target.value)}
                    placeholder="Buscar por dependencia, archivo o sigla (ej. DADIS, Hacienda)..."
                    aria-label="Buscar archivo de plan de acción"
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="w-[160px]">
                  <Select value={filtroExtension} onValueChange={setFiltroExtension}>
                    <SelectTrigger className="text-xs" aria-label="Filtrar por extensión">
                      <SelectValue placeholder="Formato archivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODAS" className="text-xs">Todas las extensiones</SelectItem>
                      <SelectItem value=".xlsx" className="text-xs">.xlsx (Multihoja)</SelectItem>
                      <SelectItem value=".xls" className="text-xs">.xls (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[190px]">
                  <Select value={filtroPerfilArchivo} onValueChange={setFiltroPerfilArchivo}>
                    <SelectTrigger className="text-xs" aria-label="Filtrar por perfil">
                      <SelectValue placeholder="Perfil de formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS" className="text-xs">Todos los perfiles</SelectItem>
                      <SelectItem value="PA_MULTIHOJA_2024_2026" className="text-xs">Multihoja 2026</SelectItem>
                      <SelectItem value="PA_MONOHOJA_2016_2019" className="text-xs">Monohoja Legacy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Listado de Archivos en Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Archivo Excel</th>
                    <th className="p-3 font-semibold">Dependencia Distrital</th>
                    <th className="p-3 font-semibold">Formato / Hojas</th>
                    <th className="p-3 font-semibold">Actividades</th>
                    <th className="p-3 font-semibold">Estado Normalización</th>
                    <th className="p-3 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {archivosFiltrados.map((archivo) => (
                    <tr key={archivo.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {archivo.extension === ".xls" ? (
                            <FileClock className="h-4 w-4 text-warning shrink-0" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-success shrink-0" />
                          )}
                          <span className="font-mono text-xs font-medium text-text-primary">
                            {archivo.nombre_archivo}
                          </span>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="text-text-primary font-medium">{archivo.dependencia}</span>
                        <span className="block text-[10px] text-text-muted">{archivo.sigla}</span>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            archivo.extension === ".xls"
                              ? "border-warning/30 bg-warning-soft text-warning"
                              : "border-success/30 bg-success-soft text-success"
                          }`}
                        >
                          {archivo.extension} · {archivo.total_hojas} {archivo.total_hojas === 1 ? "hoja" : "hojas"}
                        </Badge>
                      </td>

                      <td className="p-3 font-semibold text-text-primary">
                        {archivo.total_actividades_detectadas}
                      </td>

                      <td className="p-3">
                        {archivo.estado_normalizacion === "NORMALIZADO_100" && (
                          <Badge variant="outline" className="border-success/30 bg-success-soft text-success text-[10px]">
                            Normalizado 100%
                          </Badge>
                        )}
                        {archivo.estado_normalizacion === "EN_CONVERSION_LEGACY" && (
                          <Badge variant="outline" className="border-warning/30 bg-warning-soft text-warning text-[10px]">
                            Conversión Legacy .xls
                          </Badge>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInspeccionarArchivo(archivo)}
                          className="gap-1 text-[11px]"
                          data-testid={`btn-inspeccionar-${archivo.id}`}
                        >
                          <Cpu className="h-3.5 w-3.5" />
                          <span>Inspeccionar</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 4: LABORATORIO DE INTELIGENCIA FORENSE (6 MOTORES · 217K) */}
      {/* ==================================================================== */}
      {subvistaActiva === "inteligencia_forense" && (
        <section aria-labelledby="heading-subvista-inteligencia" className="space-y-6">
          <InteligenciaForense6MPanel puedeEditar={puedeEditar} />
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 5: FRONTERA EFICIENTE DEA & ECONOMETRÍA DE 2ª ETAPA       */}
      {/* ==================================================================== */}
      {subvistaActiva === "dea_econometria" && (
        <section aria-labelledby="heading-subvista-dea-econometria" className="space-y-6">
          <DeaEconometriaPanel puedeEditar={puedeEditar} />
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 6: EVALUACIÓN & DEA PLANES DE DESARROLLO (ACUERDO 139)    */}
      {/* ==================================================================== */}
      {subvistaActiva === "pdd_dea" && (
        <section aria-labelledby="heading-subvista-pdd-dea" className="space-y-6">
          <PddDeaEvaluacionPanel puedeEditar={puedeEditar} />
        </section>
      )}
    </div>
  );
}
