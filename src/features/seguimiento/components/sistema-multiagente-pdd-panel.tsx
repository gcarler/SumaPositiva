"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bot,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Play,
  Layers,
  FileText,
  Scale,
  Compass,
  Building2,
  Sparkles,
  FolderSync,
  Eye,
  GitBranch,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { SidePanel } from "@/shared/ui/side-panel";
import {
  obtenerEstadoSistemaMultiagentePdd,
  ejecutarSistemaMultiagentePdd,
  obtenerComparativoSeguridadHumanaPdd,
  obtenerCruceMultiagentePaBpim,
  obtenerEstadoSistemaMultiagentePddLocal,
  obtenerComparativoSeguridadHumanaPddLocal,
  obtenerCruceMultiagentePaBpimLocal,
  type EstadoSistemaMultiagentePddRespuesta,
  type ComparativoSeguridadHumanaPddRespuesta,
  type CruceMultiagentePaBpimRespuesta,
  type PlanPddComparativoSeguridadHumana,
  type ResultadoAgenteMultiagente,
  type DimensionSeguridadHumanaNombre,
} from "../services/plan-accion-dnp-api";

function formatearCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearMillonesCOP(valorCop: number): string {
  const millones = valorCop / 1_000_000;
  return `$${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(millones)}M`;
}

export interface InspeccionLateralMultiagente {
  tipo: "PLAN" | "AGENTE";
  codigoPlan?: string;
  nombreAgente?: string;
}

export interface SistemaMultiagentePddPanelProps {
  puedeEditar?: boolean;
  inspeccionInicial?: InspeccionLateralMultiagente | null;
}

export function SistemaMultiagentePddPanel({
  puedeEditar = false,
  inspeccionInicial = null,
}: SistemaMultiagentePddPanelProps) {
  const [estadoMotor, setEstadoMotor] = useState<EstadoSistemaMultiagentePddRespuesta>(
    obtenerEstadoSistemaMultiagentePddLocal
  );
  const [comparativo, setComparativo] = useState<ComparativoSeguridadHumanaPddRespuesta>(
    obtenerComparativoSeguridadHumanaPddLocal
  );
  const [crucePaBpim, setCrucePaBpim] = useState<CruceMultiagentePaBpimRespuesta>(
    obtenerCruceMultiagentePaBpimLocal
  );

  const [actualizandoEstado, setActualizandoEstado] = useState<boolean>(false);
  const [ejecutandoMotor, setEjecutandoMotor] = useState<boolean>(false);
  const [preguntaActiva, setPreguntaActiva] = useState<number>(1);
  const [dimensionSeleccionada, setDimensionSeleccionada] = useState<DimensionSeguridadHumanaNombre | "TODAS">("TODAS");
  const [inspeccionActiva, setInspeccionActiva] = useState<InspeccionLateralMultiagente | null>(
    inspeccionInicial
  );
  const [panelMaximizado, setPanelMaximizado] = useState<boolean>(false);

  useEffect(() => {
    let activo = true;
    async function sincronizarEnVivo() {
      try {
        const [estRes, compRes, cruceRes] = await Promise.all([
          obtenerEstadoSistemaMultiagentePdd(),
          obtenerComparativoSeguridadHumanaPdd(),
          obtenerCruceMultiagentePaBpim(),
        ]);
        if (activo) {
          setEstadoMotor(estRes);
          setComparativo(compRes);
          setCrucePaBpim(cruceRes);
        }
      } catch (err) {
        console.warn("Usando respaldo local auditado del Sistema Multiagente PDD/PDL:", err);
      }
    }
    void sincronizarEnVivo();
    return () => {
      activo = false;
    };
  }, []);

  const consultarEstadoEnVivo = async () => {
    setActualizandoEstado(true);
    try {
      const [estRes, compRes, cruceRes] = await Promise.all([
        obtenerEstadoSistemaMultiagentePdd(),
        obtenerComparativoSeguridadHumanaPdd(),
        obtenerCruceMultiagentePaBpim(),
      ]);
      setEstadoMotor(estRes);
      setComparativo(compRes);
      setCrucePaBpim(cruceRes);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const dispararEjecucionMultiagente = async () => {
    setEjecutandoMotor(true);
    try {
      const nuevoEstado = await ejecutarSistemaMultiagentePdd({
        publicar: false,
        persistir: true,
      });
      setEstadoMotor(nuevoEstado);
    } finally {
      setEjecutandoMotor(false);
    }
  };

  const planInspeccionado: PlanPddComparativoSeguridadHumana | null = useMemo(() => {
    if (!inspeccionActiva || inspeccionActiva.tipo !== "PLAN") return null;
    return (
      comparativo.planes_pdd.find((p) => p.codigo_plan === inspeccionActiva.codigoPlan) ||
      comparativo.planes_pdd[comparativo.planes_pdd.length - 1] ||
      null
    );
  }, [inspeccionActiva, comparativo.planes_pdd]);

  const agenteInspeccionado: ResultadoAgenteMultiagente | null = useMemo(() => {
    if (!inspeccionActiva || inspeccionActiva.tipo !== "AGENTE") return null;
    return (
      estadoMotor.auditoria_agentes.find((a) => a.agente === inspeccionActiva.nombreAgente) ||
      estadoMotor.auditoria_agentes[0] ||
      null
    );
  }, [inspeccionActiva, estadoMotor.auditoria_agentes]);

  const archivosFiltradosDrawer = useMemo(() => {
    if (!inspeccionActiva) return estadoMotor.archivos_cobertura_pdf;
    if (inspeccionActiva.tipo === "PLAN" && inspeccionActiva.codigoPlan) {
      const propios = estadoMotor.archivos_cobertura_pdf.filter(
        (a) => a.codigo_plan === inspeccionActiva.codigoPlan
      );
      return propios.length > 0 ? propios : estadoMotor.archivos_cobertura_pdf;
    }
    return estadoMotor.archivos_cobertura_pdf;
  }, [inspeccionActiva, estadoMotor.archivos_cobertura_pdf]);

  const trazabilidadFiltradaDrawer = useMemo(() => {
    if (!inspeccionActiva) return crucePaBpim.matriz_trazabilidad_pa_bpim;
    if (inspeccionActiva.tipo === "PLAN" && inspeccionActiva.codigoPlan) {
      const propios = crucePaBpim.matriz_trazabilidad_pa_bpim.filter(
        (t) => t.codigo_plan === inspeccionActiva.codigoPlan
      );
      return propios.length > 0 ? propios : crucePaBpim.matriz_trazabilidad_pa_bpim;
    }
    return crucePaBpim.matriz_trazabilidad_pa_bpim;
  }, [inspeccionActiva, crucePaBpim.matriz_trazabilidad_pa_bpim]);

  const dimensionesFiltradas = useMemo(() => {
    if (dimensionSeleccionada === "TODAS") {
      return crucePaBpim.articulacion_por_dimension_sh;
    }
    return crucePaBpim.articulacion_por_dimension_sh.filter(
      (d) => d.dimension === dimensionSeleccionada
    );
  }, [crucePaBpim.articulacion_por_dimension_sh, dimensionSeleccionada]);

  return (
    <section
      data-testid="sistema-multiagente-pdd-panel"
      aria-label="Sistema Multiagente de Absorción y Diagnóstico Comparativo PDD/PDL y Seguridad Humana (2012–2027)"
      className="space-y-6"
    >
      {/* ==================================================================== */}
      {/* BLOQUE 1: TELEMETRÍA DE LOS AGENTES Y PUERTAS DE CALIDAD (A a F)     */}
      {/* ==================================================================== */}
      <div
        data-testid="bloque-telemetria-puertas-multiagente"
        className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ember/15 text-ember">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold tracking-tight text-text-primary">
                Sistema Multiagente PDD/PDL & Diagnóstico Comparativo de Seguridad Humana (2012–2027)
              </h3>
              <Badge
                variant="outline"
                data-testid="badge-estado-multiagente"
                className="border-success/40 bg-success/10 text-xs font-bold text-success gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{estadoMotor.estado}</span>
              </Badge>
              <Badge
                variant="outline"
                data-testid="badge-workspace-pdd-only"
                className="border-info/40 bg-info/10 text-xs font-semibold text-info gap-1"
              >
                <FolderSync className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{estadoMotor.estado_publicacion_workspace}</span>
              </Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pipeline determinístico de <strong>6 Agentes Especializados</strong> con verificación criptográfica SHA-256 sobre{" "}
              <strong>2.732 evidencias</strong> (11 PDFs oficiales = 2.728 páginas continuas + 6 JSONs estructurados),{" "}
              <strong>1.524 nodos MGA</strong>, <strong>2.228 metas PDD (2012–2027)</strong> y{" "}
              <strong>401 metas PDL (2024–2027)</strong>, articuladas con las <strong>29 entidades distritales</strong> y códigos{" "}
              <strong>BPIM de 13 dígitos</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="multiagente-run-id"
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] text-text-secondary"
            >
              run_id: <strong className="text-text-primary">{estadoMotor.run_id}</strong>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-consultar-estado-multiagente"
              onClick={consultarEstadoEnVivo}
              disabled={actualizandoEstado}
              className="gap-1.5 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${actualizandoEstado ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{actualizandoEstado ? "Sincronizando..." : "Actualizar Estado"}</span>
            </Button>
            {puedeEditar && (
              <Button
                type="button"
                variant="ember"
                size="sm"
                data-testid="btn-ejecutar-sistema-multiagente"
                onClick={dispararEjecucionMultiagente}
                disabled={ejecutandoMotor}
                className="gap-1.5 text-xs"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{ejecutandoMotor ? "Ejecutando Pipeline..." : "Verificar Pipeline"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tarjetas de Métricas Globales Auditadas */}
        <div
          data-testid="kpis-sistema-multiagente"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Evidencias Absorbidas (SHA-256)
            </span>
            <p className="text-2xl font-extrabold text-ember">
              {estadoMotor.metricas_globales.evidencias_absorbidas_total.toLocaleString("es-CO")}
            </p>
            <span className="text-[11px] text-text-secondary block">
              {estadoMotor.metricas_globales.paginas_pdf_continuas.toLocaleString("es-CO")} págs. de 11 PDFs + JSONs
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Nodos Jerárquicos MGA
            </span>
            <p className="text-2xl font-extrabold text-info">
              {estadoMotor.metricas_globales.nodos_jerarquicos_mga.toLocaleString("es-CO")}
            </p>
            <span className="text-[11px] text-text-secondary block">
              1.401 nodos PDD + 123 nodos PDL (0 falsos)
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Metas PDD (5 Planes 2012–2027)
            </span>
            <p className="text-2xl font-extrabold text-success">
              {estadoMotor.metricas_globales.metas_pdd_total.toLocaleString("es-CO")}
            </p>
            <span className="text-[11px] text-text-secondary block">
              191 · 195 · 370 · 226 · 1.246 metas PDD
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Anexo Territorial (3 PDL 2024–2027)
            </span>
            <p className="text-2xl font-extrabold text-warning">
              {`${estadoMotor.metricas_globales.metas_pdl_anexo.toLocaleString("es-CO")} metas PDL`}
            </p>
            <span className="text-[11px] text-text-secondary block">
              Localidades 1, 2 y 3 ($304.981M COP separados)
            </span>
          </div>
        </div>

        {/* Semáforo de las 6 Puertas de Calidad (Puerta A a Puerta F) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              <span>Semáforo de Puertas de Calidad Forense (Puerta A a Puerta F)</span>
            </h4>
            <span className="text-[11px] text-text-muted">
              Haz clic en un agente para abrir el Drawer Lateral de inspección (Zero-Modals)
            </span>
          </div>

          <div
            data-testid="semaforo-puertas-calidad"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
          >
            {estadoMotor.puertas_calidad.map((puerta) => {
              const agenteObj = estadoMotor.auditoria_agentes.find(
                (a) => a.agente === puerta.agente_responsable
              );
              return (
                <div
                  key={puerta.id_clave}
                  data-testid={`puerta-calidad-${puerta.codigo.replace(/\s+/g, "-").toLowerCase()}`}
                  className="rounded-xl border border-border bg-surface-2 p-3.5 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        {`${puerta.codigo}: ${puerta.titulo}`}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-success/40 bg-success/10 text-[10px] font-bold text-success"
                      >
                        {puerta.estado}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {puerta.descripcion_corta}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-semibold text-ember">
                      {puerta.metrica_principal}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid={`btn-inspeccionar-agente-${puerta.codigo.replace(/\s+/g, "-").toLowerCase()}`}
                      onClick={() =>
                        setInspeccionActiva({
                          tipo: "AGENTE",
                          nombreAgente: agenteObj?.agente ?? puerta.agente_responsable,
                        })
                      }
                      className="h-7 px-2 text-[11px] gap-1 text-text-primary hover:text-ember"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Inspeccionar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BLOQUE 2: COMPARATIVO LONGITUDINAL DE LOS 5 PDD (2012–2027) Y 7D     */}
      {/* ==================================================================== */}
      <div
        data-testid="bloque-comparativo-5-pdd"
        className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Scale className="h-4 w-4 text-ember" aria-hidden="true" />
              <span>
                Matriz Comparativa Longitudinal de los 5 Planes de Desarrollo Distritales (2012–2027) · Grado de Frontalidad A/B/C/N
              </span>
            </h4>
            <p className="text-xs text-text-muted">
              Rúbrica canónica <strong>POLIS_SH_A_B_C_N_V1</strong>: <strong>A</strong> (Núcleo Frontal Explícito),{" "}
              <strong>B</strong> (Determinante Multidimensional Directo), <strong>C</strong> (Contextual/Habilitante) y{" "}
              <strong>N</strong> (No Asociado / Funcionamiento). Conciliación exacta ±$1 COP en pesos constantes 2025.
            </p>
          </div>
          <Badge variant="outline" className="border-ember/30 bg-ember/10 text-xs text-ember">
            <span>5 PDD · 1.401 Nodos PDD · 2.228 Metas PDD</span>
          </Badge>
        </div>

        {/* Tabla Comparativa de los 5 PDD */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table
            data-testid="tabla-comparativa-5-pdd"
            className="w-full text-left text-xs border-collapse"
          >
            <thead>
              <tr className="border-b border-border bg-surface-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="p-3">Plan / Periodo</th>
                <th className="p-3">Acuerdo Oficial</th>
                <th className="p-3 text-right">Nodos MGA</th>
                <th className="p-3 text-right">Metas PDD</th>
                <th className="p-3 text-center">Grados A / B / C / N (Nodos)</th>
                <th className="p-3 text-right">PPI Oficial Nominal (COP)</th>
                <th className="p-3 text-right">Inversión A + B (Constante 2025)</th>
                <th className="p-3 text-center">% A+B</th>
                <th className="p-3 text-right">Inspección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-1">
              {comparativo.planes_pdd.map((plan) => (
                <tr
                  key={plan.codigo_plan}
                  data-testid={`fila-comparativo-${plan.codigo_plan}`}
                  className="hover:bg-surface-2/60 transition-colors"
                >
                  <td className="p-3">
                    <span className="font-bold text-text-primary block">{plan.nombre}</span>
                    <span className="text-[11px] text-text-muted font-mono">
                      {plan.codigo_plan} · {plan.periodo}
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary">
                    <span className="block font-medium">{plan.norma}</span>
                    <span className="text-[10px] text-text-muted">{plan.cobertura_pdf_paginas}</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-text-primary">
                    {plan.nodos_total.toLocaleString("es-CO")}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-info">
                    {plan.metas_pdd.toLocaleString("es-CO")}
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                      <span className="rounded bg-ember/15 px-1.5 py-0.5 font-bold text-ember" title="Grado A: Núcleo Frontal">
                        A={plan.nodos_por_frontalidad.A}
                      </span>
                      <span className="rounded bg-info/15 px-1.5 py-0.5 font-bold text-info" title="Grado B: Determinante Directo">
                        B={plan.nodos_por_frontalidad.B}
                      </span>
                      <span className="rounded bg-surface-3 px-1.5 py-0.5 text-text-secondary" title="Grado C: Contextual">
                        C={plan.nodos_por_frontalidad.C}
                      </span>
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-text-muted" title="Grado N: No Asociado">
                        N={plan.nodos_por_frontalidad.N}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-text-primary">
                    {formatearCOP(plan.ppi_oficial_nominal_cop)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-success">
                    {formatearMillonesCOP(plan.inversion_a_mas_b_constante_2025_cop)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className="border-success/40 bg-success/10 font-mono text-[11px] font-bold text-success"
                    >
                      {plan.participacion_a_mas_b_pct.toFixed(2)}%
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`btn-drawer-plan-${plan.codigo_plan}`}
                      onClick={() =>
                        setInspeccionActiva({
                          tipo: "PLAN",
                          codigoPlan: plan.codigo_plan,
                        })
                      }
                      className="h-7 px-2.5 text-[11px] gap-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-ember" aria-hidden="true" />
                      <span>Drawer PDF / PA</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Participación en las 7 Dimensiones de Seguridad Humana (PNUD 1994 / Decreto 037 de 2026) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-info" aria-hidden="true" />
                <span>
                  Vector de las 7 Dimensiones de Seguridad Humana (PNUD 1994 / Decreto 037 de 2026) y Articulación Plan de Acción
                </span>
              </h5>
              <p className="text-[11px] text-text-muted">
                Distribución sin doble conteo de la inversión A+B y cruce con las actividades operativas de las 29 entidades distritales.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant={dimensionSeleccionada === "TODAS" ? "ember" : "outline"}
                size="sm"
                onClick={() => setDimensionSeleccionada("TODAS")}
                className="h-7 px-2.5 text-[11px]"
              >
                Todas (7D)
              </Button>
              {comparativo.dimensiones.map((dim) => (
                <Button
                  key={dim}
                  type="button"
                  variant={dimensionSeleccionada === dim ? "ember" : "outline"}
                  size="sm"
                  onClick={() => setDimensionSeleccionada(dim)}
                  className="h-7 px-2 text-[11px]"
                >
                  {dim.replace("Seguridad ", "")}
                </Button>
              ))}
            </div>
          </div>

          <div
            data-testid="grid-7-dimensiones-sh"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {dimensionesFiltradas.map((item) => (
              <div
                key={item.dimension}
                className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">{item.dimension}</span>
                  <Badge variant="outline" className="border-info/40 bg-info/10 text-[10px] font-mono text-info">
                    {item.nodos_a_mas_b} nodos A+B
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded bg-surface-1 p-2">
                    <span className="text-[10px] text-text-muted block">PPI A+B (2025):</span>
                    <span className="font-mono font-bold text-text-primary">
                      {formatearMillonesCOP(item.presupuesto_ppi_constante_2025_cop)}
                    </span>
                  </div>
                  <div className="rounded bg-surface-1 p-2">
                    <span className="text-[10px] text-text-muted block">Actividades PA:</span>
                    <span className="font-mono font-bold text-success">
                      {item.actividades_pa_vinculadas} act. ({item.avance_fisico_promedio_pct}%)
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted">
                  <strong>Líderes:</strong> {item.entidades_lideres.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Separación Explícita del Anexo Territorial de los 3 PDL (2024–2027) */}
        <div
          data-testid="anexo-territorial-3-pdl"
          className="rounded-xl border border-warning/30 bg-surface-2 p-4 space-y-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-warning" aria-hidden="true" />
                <span>
                  Anexo Territorial Separado: 3 Planes de Desarrollo Local (PDL 2024–2027 · 401 Metas · $304.981M COP)
                </span>
              </h5>
              <p className="text-[11px] text-text-secondary">
                Regla metodológica EAF: los 3 PDL son instrumentos locales anidados (Acuerdos Locales 004 de 2024). Se mantienen separados para{" "}
                <strong>no contaminar el denominador distrital PDD</strong> y desagregan inversión programática frente a funcionamiento/honorarios de ediles.
              </p>
            </div>
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-xs font-bold text-warning">
              <span>123 Nodos PDL · 401 Metas PDL · 175 Págs. PDF</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {comparativo.anexo_pdl.map((pdl) => (
              <div
                key={pdl.codigo_plan}
                data-testid={`card-anexo-${pdl.codigo_plan}`}
                className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-text-primary block">{pdl.nombre}</span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {pdl.codigo_plan} · {pdl.norma}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-ember/30 bg-ember/10 text-[10px] font-mono text-ember">
                    {pdl.metas_pdl} metas
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded bg-surface-2 p-2">
                    <span className="text-[10px] text-text-muted block">Total Declarado:</span>
                    <span className="font-mono font-bold text-text-primary">
                      {formatearMillonesCOP(pdl.ppi_declarado_cop)}
                    </span>
                  </div>
                  <div className="rounded bg-surface-2 p-2">
                    <span className="text-[10px] text-text-muted block">Inversión Neta:</span>
                    <span className="font-mono font-bold text-success">
                      {formatearMillonesCOP(pdl.inversion_documentada_cop)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border">
                  <span>Funcionamiento: {formatearMillonesCOP(pdl.funcionamiento_documentado_cop)}</span>
                  <span className="font-mono">
                    {pdl.paginas_pdf_verificadas} págs. PDF · {pdl.nodos_total} nodos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BLOQUE 3: LAS 4 RESPUESTAS ESTRATÉGICAS Y TRAZABILIDAD PA / BPIM     */}
      {/* ==================================================================== */}
      <div
        data-testid="bloque-4-preguntas-estrategicas"
        className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-ember" aria-hidden="true" />
              <span>
                Las 4 Respuestas Estratégicas del Diagnóstico Comparativo (2012–2027) y Cruce Operativo PA / BPIM
              </span>
            </h4>
            <p className="text-xs text-text-muted">
              Dictamen sustentado del <strong>AgenteEstrategaDiagnosticoPDD</strong> y articulación del{" "}
              <strong>AgenteArticulacionPlanAccionBPIM</strong> con las 29 entidades distritales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {comparativo.preguntas_estrategicas.map((preg) => (
              <Button
                key={preg.codigo}
                type="button"
                variant={preguntaActiva === preg.numero ? "ember" : "outline"}
                size="sm"
                data-testid={`btn-pregunta-estrategica-${preg.numero}`}
                onClick={() => setPreguntaActiva(preg.numero)}
                className="h-7 px-2.5 text-xs"
              >
                Pregunta {preg.numero}
              </Button>
            ))}
          </div>
        </div>

        {/* Tarjetas Ejecutivas de las 4 Preguntas Estratégicas */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {comparativo.preguntas_estrategicas.map((preg) => {
            const esActiva = preguntaActiva === preg.numero;
            return (
              <div
                key={preg.codigo}
                data-testid={`card-pregunta-estrategica-${preg.numero}`}
                className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                  esActiva
                    ? "border-ember bg-surface-2 shadow-sm"
                    : "border-border bg-surface-1"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs font-bold text-text-primary leading-snug">
                    {preg.pregunta}
                  </h5>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-ember/40 bg-ember/10 font-mono text-[10px] font-bold text-ember"
                  >
                    {preg.metrica_destacada}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {preg.sintesis_ejecutiva}
                </p>
                <div className="rounded-lg border border-border bg-surface-1 p-2.5 text-[11px] text-text-secondary">
                  <strong className="text-text-primary">Hallazgo Forense Clave:</strong>{" "}
                  {preg.hallazgo_forense_clave}
                </div>
                <ul className="space-y-1 text-[11px] text-text-muted list-disc list-inside">
                  {preg.evidencia_sustentada.map((ev, idx) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Resumen de Articulación PDD (A/B) ↔ Plan de Acción (29 Entidades) ↔ BPIM */}
        <div
          data-testid="bloque-cruce-pa-bpim"
          className="rounded-xl border border-border bg-surface-2 p-4 space-y-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-success" aria-hidden="true" />
                <span>
                  Matriz de Articulación Multiagente: Nodos A/B PDD ↔ Planes de Acción (29 Entidades) ↔ Código BPIM (13 Dígitos)
                </span>
              </h5>
              <p className="text-[11px] text-text-muted">
                Cobertura de articulación vigente 2024–2027:{" "}
                <strong className="text-success">
                  {crucePaBpim.resumen_ejecutivo.cobertura_articulacion_vigente_2024_2027_pct}%
                </strong>{" "}
                ({crucePaBpim.resumen_ejecutivo.entidades_activas} entidades distritales activas ·{" "}
                {crucePaBpim.resumen_ejecutivo.total_actividades_pa} actividades PA).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-abrir-drawer-cobertura-completa"
              onClick={() =>
                setInspeccionActiva({
                  tipo: "PLAN",
                  codigoPlan: "PDD_2024_2027",
                })
              }
              className="gap-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5 text-ember" aria-hidden="true" />
              <span>Inspeccionar PDFs SHA-256 y Cruce BPIM en Drawer</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface-1">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[10px] font-bold uppercase text-text-muted">
                  <th className="p-2.5">Plan / Nodo</th>
                  <th className="p-2.5">Grado & Dimensión SH</th>
                  <th className="p-2.5">Meta PDD Oficial</th>
                  <th className="p-2.5">Actividad Plan de Acción (Entidad)</th>
                  <th className="p-2.5">Código BPIM / Producto MGA-DNP</th>
                  <th className="p-2.5 text-right">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {crucePaBpim.matriz_trazabilidad_pa_bpim.slice(0, 6).map((item) => (
                  <tr key={item.id_trazabilidad} className="hover:bg-surface-2/50">
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-text-primary block">
                        {item.codigo_nodo}
                      </span>
                      <span className="text-[10px] text-text-muted">{item.codigo_plan}</span>
                    </td>
                    <td className="p-2.5">
                      <Badge
                        variant="outline"
                        className="border-ember/40 bg-ember/10 font-mono text-[10px] font-bold text-ember mr-1"
                      >
                        Grado {item.grado_frontalidad}
                      </Badge>
                      <span className="text-[10px] text-text-secondary block mt-0.5">
                        {item.dimension_sh_principal}
                      </span>
                    </td>
                    <td className="p-2.5 max-w-xs">
                      <span className="font-mono text-[10px] text-info block">
                        {item.meta_pdd_codigo}
                      </span>
                      <span className="text-text-secondary line-clamp-2">
                        {item.meta_pdd_descripcion}
                      </span>
                    </td>
                    <td className="p-2.5 max-w-xs">
                      <span className="font-bold text-text-primary block">
                        {item.dependencia_responsable}
                      </span>
                      <span className="text-text-secondary line-clamp-2">
                        {item.actividad_pa_codigo}: {item.descripcion_actividad_pa}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-ember block">
                        BPIM {item.codigo_bpim}
                      </span>
                      <span className="text-[10px] text-text-muted line-clamp-1">
                        {item.producto_mga_dnp}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-success">
                      {item.avance_fisico_pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DRAWER LATERAL DE INSPECCIÓN FORENSE (ZERO-MODALS · SidePanel)       */}
      {/* ==================================================================== */}
      {inspeccionActiva && (
        <div
          data-testid="drawer-lateral-multiagente"
          className="fixed inset-0 z-50 flex justify-end bg-overlay"
        >
          <div
            className={`h-dvh w-full ${
              panelMaximizado ? "max-w-5xl" : "max-w-2xl"
            } transition-all duration-200`}
          >
            <SidePanel
              kicker="INSPECCIÓN FORENSE MULTIAGENTE (REGLA ZERO-MODALS)"
              title={
                inspeccionActiva.tipo === "PLAN" && planInspeccionado
                  ? `${planInspeccionado.nombre} (${planInspeccionado.periodo})`
                  : agenteInspeccionado
                  ? `Agente: ${agenteInspeccionado.agente}`
                  : "Inspección de Evidencia PDD/PDL y Articulación BPIM"
              }
              subtitle={
                inspeccionActiva.tipo === "PLAN" && planInspeccionado
                  ? `${planInspeccionado.norma} · ${planInspeccionado.nodos_total} nodos MGA · ${planInspeccionado.metas_pdd} metas PDD · Cobertura SHA-256 verificada`
                  : agenteInspeccionado
                  ? `${agenteInspeccionado.rol_especialista} · ${agenteInspeccionado.puerta_asociada}`
                  : "Verificación de páginas PDF con SHA-256 y articulación con Planes de Acción"
              }
              breadcrumbs={[
                { label: "Seguimiento", onSelect: () => setInspeccionActiva(null) },
                { label: "Sistema Multiagente PDD/PDL" },
              ]}
              currentKey={
                inspeccionActiva.tipo === "PLAN"
                  ? inspeccionActiva.codigoPlan
                  : inspeccionActiva.nombreAgente
              }
              maximized={panelMaximizado}
              onToggleMaximized={() => setPanelMaximizado((prev) => !prev)}
              onClose={() => setInspeccionActiva(null)}
              footer={
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted font-mono">
                    2.732 evidencias · 11 PDFs (2.728 págs.) · 29 entidades PA
                  </span>
                  <Button
                    type="button"
                    variant="ember"
                    size="sm"
                    data-testid="btn-cerrar-drawer-multiagente"
                    onClick={() => setInspeccionActiva(null)}
                  >
                    Cerrar Panel Lateral
                  </Button>
                </div>
              }
            >
              <div className="p-5 sm:p-6 space-y-6">
                {/* Selector rápido dentro del Drawer */}
                <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-4">
                  {comparativo.planes_pdd.map((p) => (
                    <Button
                      key={p.codigo_plan}
                      type="button"
                      variant={
                        inspeccionActiva.tipo === "PLAN" &&
                        inspeccionActiva.codigoPlan === p.codigo_plan
                          ? "ember"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setInspeccionActiva({
                          tipo: "PLAN",
                          codigoPlan: p.codigo_plan,
                        })
                      }
                      className="h-7 px-2.5 text-[11px]"
                    >
                      {p.periodo}
                    </Button>
                  ))}
                </div>

                {/* Detalle si se inspecciona un Agente */}
                {inspeccionActiva.tipo === "AGENTE" && agenteInspeccionado && (
                  <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">
                        Bitácora de Ejecución: {agenteInspeccionado.agente}
                      </span>
                      <Badge variant="outline" className="border-success/40 bg-success/10 text-xs text-success">
                        {agenteInspeccionado.estado} ({agenteInspeccionado.duracion_segundos}s)
                      </Badge>
                    </div>
                    <ul className="space-y-1.5 text-xs text-text-secondary list-disc list-inside">
                      {agenteInspeccionado.hallazgos.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detalle si se inspecciona un Plan */}
                {inspeccionActiva.tipo === "PLAN" && planInspeccionado && (
                  <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-text-primary block">
                          Ficha de Conciliación Presupuestal y Frontalidad ({planInspeccionado.codigo_plan})
                        </span>
                        <span className="text-[11px] text-text-muted">
                          Administración: {planInspeccionado.alcalde_administracion} · {planInspeccionado.norma}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-ember/40 bg-ember/10 font-mono text-xs text-ember">
                        A={planInspeccionado.nodos_por_frontalidad.A} · B={planInspeccionado.nodos_por_frontalidad.B} · C={planInspeccionado.nodos_por_frontalidad.C} · N={planInspeccionado.nodos_por_frontalidad.N}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {planInspeccionado.observacion_metodologica}
                    </p>
                  </div>
                )}

                {/* 1. Cobertura de Páginas PDF Verificadas con SHA-256 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-ember" aria-hidden="true" />
                    <span>
                      1. Cobertura de Páginas PDF Verificadas con SHA-256 (11 Archivos Oficiales · 2.728 Páginas)
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {archivosFiltradosDrawer.map((arch) => (
                      <div
                        key={arch.archivo}
                        data-testid={`drawer-pdf-${arch.archivo}`}
                        className="rounded-lg border border-border bg-surface-1 p-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-text-primary block">
                            {arch.titulo_documento}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted block">
                            {arch.archivo} · SHA-256: {arch.sha256_archivo.slice(0, 16)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className="border-success/40 bg-success/10 font-mono text-[11px] font-bold text-success"
                          >
                            {`${arch.paginas_absorbidas}/${arch.paginas_esperadas} págs.`}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-[10px] text-text-secondary">
                            {arch.origen_predominante}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Articulación de Metas A y B con Actividades del Plan de Acción (29 Entidades) y BPIM/MGA */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-info" aria-hidden="true" />
                    <span>
                      2. Articulación de Metas A y B con Actividades del Plan de Acción (29 Entidades) y Códigos BPIM/MGA
                    </span>
                  </h4>
                  <div className="space-y-2.5">
                    {trazabilidadFiltradaDrawer.map((trz) => (
                      <div
                        key={trz.id_trazabilidad}
                        className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-ember/40 bg-ember/10 font-mono text-[10px] font-bold text-ember"
                            >
                              Grado {trz.grado_frontalidad}
                            </Badge>
                            <span className="text-xs font-bold text-text-primary">
                              {trz.nombre_programa}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-ember">
                            BPIM: {trz.codigo_bpim}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">
                          <strong>Meta PDD ({trz.meta_pdd_codigo}):</strong> {trz.meta_pdd_descripcion}
                        </p>
                        <p className="text-xs text-text-secondary">
                          <strong>Actividad PA ({trz.dependencia_responsable} — {trz.actividad_pa_codigo}):</strong>{" "}
                          {trz.descripcion_actividad_pa}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-[11px] text-text-muted">
                          <span>
                            <Sparkles className="inline h-3 w-3 text-info mr-1" aria-hidden="true" />
                            Producto MGA-DNP: <strong>{trz.producto_mga_dnp}</strong>
                          </span>
                          <span className="font-mono font-bold text-success">
                            Avance Físico: {trz.avance_fisico_pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SidePanel>
          </div>
        </div>
      )}
    </section>
  );
}
