"use client";

import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Search,
  Layers,
  Sparkles,
  Scale,
  Binary,
  Target,
  Calculator,
  Compass,
  GitCompare,
  FileCheck2,
  Building2,
  MapPin,
  Coins,
  Activity,
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
  obtenerCatalogoYConciliacionPpiApi,
  obtenerCumplimientoMetasPddApi,
  obtenerFronteraDeaPddApi,
  obtenerEconometriaComparadaPddApi,
  obtenerCatalogoYConciliacionPpiLocal,
  obtenerCumplimientoMetasPddLocal,
  obtenerFronteraDeaPddLocal,
  obtenerEconometriaComparadaPddLocal,
  type CatalogoYConciliacionPpiRespuesta,
  type CumplimientoMetasPddRespuesta,
  type FronteraDeaPddRespuesta,
  type EconometriaComparadaPddRespuesta,
  type InsumoDeaPdd,
  type DmuDeaPddEntidad,
  type PlanDesarrolloInfo,
} from "../services/plan-accion-dnp-api";

export interface PddDeaEvaluacionPanelProps {
  puedeEditar?: boolean;
}

export type SubvistaPddTipo =
  | "catalogo_y_ppi"
  | "cumplimiento_metas"
  | "frontera_dea_pdd"
  | "econometria_comparada_pdd";

export function PddDeaEvaluacionPanel({ puedeEditar: _puedeEditar = false }: PddDeaEvaluacionPanelProps) {
  // Navegación entre las 4 sub-vistas del Panel PDD
  const [subvistaPdd, setSubvistaPdd] = useState<SubvistaPddTipo>("catalogo_y_ppi");

  // Estado con fallback local inmediato (SSR y tolerancia a desconexión)
  const [datosCatalogo, setDatosCatalogo] = useState<CatalogoYConciliacionPpiRespuesta>(
    obtenerCatalogoYConciliacionPpiLocal
  );
  const [datosCumplimiento, setDatosCumplimiento] = useState<CumplimientoMetasPddRespuesta>(() =>
    obtenerCumplimientoMetasPddLocal({ plan: "PDD_2024_2027" })
  );
  const [datosFrontera, setDatosFrontera] = useState<FronteraDeaPddRespuesta>(() =>
    obtenerFronteraDeaPddLocal({ plan: "PDD_2024_2027", insumo: "conciliado_ppi" })
  );
  const [datosEconometria, setDatosEconometria] = useState<EconometriaComparadaPddRespuesta>(
    obtenerEconometriaComparadaPddLocal
  );

  // Filtros Sub-vista 2 (Cumplimiento de Metas)
  const [planCumplimiento, setPlanCumplimiento] = useState<string>("PDD_2024_2027");
  const [lineaFiltro, setLineaFiltro] = useState<string>("TODAS");
  const [busquedaMacro, setBusquedaMacro] = useState<string>("");

  // Filtros Sub-vista 3 (Frontera DEA PDD)
  const [planDeaSeleccionado, setPlanDeaSeleccionado] = useState<string>("PDD_2024_2027");
  const [insumoDeaSeleccionado, setInsumoDeaSeleccionado] = useState<InsumoDeaPdd>("conciliado_ppi");
  const [filtroRetornosDea, setFiltroRetornosDea] = useState<string>("TODOS");
  const [busquedaDmu, setBusquedaDmu] = useState<string>("");
  const [dmuModal, setDmuModal] = useState<DmuDeaPddEntidad | null>(null);

  // Carga asíncrona no bloqueante desde API
  useEffect(() => {
    let activo = true;

    async function cargarDatosBackend() {
      try {
        const [catRes, cumRes, froRes, ecoRes] = await Promise.all([
          obtenerCatalogoYConciliacionPpiApi(),
          obtenerCumplimientoMetasPddApi({ plan: planCumplimiento, linea: lineaFiltro }),
          obtenerFronteraDeaPddApi({ plan: planDeaSeleccionado, insumo: insumoDeaSeleccionado }),
          obtenerEconometriaComparadaPddApi(),
        ]);

        if (activo) {
          if (catRes) setDatosCatalogo(catRes);
          if (cumRes) setDatosCumplimiento(cumRes);
          if (froRes) setDatosFrontera(froRes);
          if (ecoRes) setDatosEconometria(ecoRes);
        }
      } catch (err) {
        console.warn("Uso de datos locales auditados para PDD-DEA y PPI:", err);
      }
    }

    void cargarDatosBackend();

    return () => {
      activo = false;
    };
  }, [planCumplimiento, lineaFiltro, planDeaSeleccionado, insumoDeaSeleccionado]);

  // Macroproyectos filtrados
  const macroproyectosFiltrados = useMemo(() => {
    if (!datosCumplimiento?.macroproyectos) return [];
    let list = datosCumplimiento.macroproyectos;
    if (lineaFiltro !== "TODAS") {
      list = list.filter((m) =>
        m.linea_estrategica.toLowerCase().includes(lineaFiltro.toLowerCase())
      );
    }
    if (busquedaMacro.trim() !== "") {
      const q = busquedaMacro.toLowerCase();
      list = list.filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.entidad_responsable.toLowerCase().includes(q) ||
          m.descripcion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [datosCumplimiento, lineaFiltro, busquedaMacro]);

  // DMUs DEA Filtradas
  const dmusDeaFiltradas = useMemo(() => {
    if (!datosFrontera?.ranking_entidades) return [];
    let list = datosFrontera.ranking_entidades;
    if (filtroRetornosDea !== "TODOS") {
      list = list.filter((d) => d.retornos_escala === filtroRetornosDea);
    }
    if (busquedaDmu.trim() !== "") {
      const q = busquedaDmu.toLowerCase();
      list = list.filter(
        (d) =>
          d.entidad.toLowerCase().includes(q) ||
          d.sigla.toLowerCase().includes(q) ||
          d.grupo_institucional.toLowerCase().includes(q)
      );
    }
    return list;
  }, [datosFrontera, filtroRetornosDea, busquedaDmu]);

  // Resumen del Plan de Cumplimiento Activo
  const resumenPlanActivo = useMemo(() => {
    if (!datosCumplimiento?.resumen_planes) return null;
    return (
      datosCumplimiento.resumen_planes.find((p) => p.plan_codigo === planCumplimiento) ||
      datosCumplimiento.resumen_planes[0]
    );
  }, [datosCumplimiento, planCumplimiento]);

  return (
    <div
      className="space-y-6"
      data-testid="panel-pdd-dea"
      role="region"
      aria-label="Laboratorio de Evaluación de Planes de Desarrollo, Conciliación PPI y DEA Cartagena (2012–2027)"
    >
      {/* ==================================================================== */}
      {/* CABECERA GENERAL DEL LABORATORIO DE EVALUACIÓN Y DEA PDD             */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ember/15 text-ember">
              <FileCheck2 className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Evaluación & DEA de Planes de Desarrollo (2012–2027 · Acuerdo 139)
            </h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Auditoría de cumplimiento de <strong>3.170 metas PDD</strong>, conciliación oficial del{" "}
            <strong>Plan Plurianual de Inversiones (PPI $12,801B COP)</strong>, frontera DEA con HiGHS y econometría comparada inter-gobiernos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Acuerdo 139/2024 · P.A. 016/2020</span>
          </Badge>
          <Badge variant="outline" className="border-ember/30 bg-ember/10 text-xs text-text-primary gap-1">
            <Sparkles className="h-3.5 w-3.5 text-ember" />
            <span>HiGHS Solver · IPC Base 2025</span>
          </Badge>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* NAVEGACIÓN ENTRE LAS 4 SUB-VISTAS DEL PANEL PDD                      */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={subvistaPdd === "catalogo_y_ppi" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("catalogo_y_ppi")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-catalogo-ppi"
          aria-pressed={subvistaPdd === "catalogo_y_ppi"}
        >
          <Building2 className="h-4 w-4" />
          <span>1. Catálogo Histórico (2012–2027) & Conciliación PPI</span>
        </Button>

        <Button
          variant={subvistaPdd === "cumplimiento_metas" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("cumplimiento_metas")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-cumplimiento"
          aria-pressed={subvistaPdd === "cumplimiento_metas"}
        >
          <Activity className="h-4 w-4" />
          <span>2. Semáforo Metas, Seguridad Humana & 19 Macroproyectos</span>
        </Button>

        <Button
          variant={subvistaPdd === "frontera_dea_pdd" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("frontera_dea_pdd")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-frontera-dea"
          aria-pressed={subvistaPdd === "frontera_dea_pdd"}
        >
          <Compass className="h-4 w-4" />
          <span>3. Frontera Eficiente DEA PDD (CCR · BCC · SBM · Slacks)</span>
        </Button>

        <Button
          variant={subvistaPdd === "econometria_comparada_pdd" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("econometria_comparada_pdd")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-econometria"
          aria-pressed={subvistaPdd === "econometria_comparada_pdd"}
        >
          <Calculator className="h-4 w-4" />
          <span>4. Malmquist Inter-Planes, FDR, Gini & Wilcoxon</span>
        </Button>
      </div>

      {/* ==================================================================== */}
      {/* SUB-VISTA 1: CATÁLOGO HISTÓRICO Y CONCILIACIÓN PPI                   */}
      {/* ==================================================================== */}
      {subvistaPdd === "catalogo_y_ppi" && (
        <section
          data-testid="subvista-pdd-catalogo-ppi"
          aria-label="Catálogo Histórico de Planes de Desarrollo y Conciliación Oficial del PPI"
          className="space-y-6"
        >
          {/* Banner Metodológico */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-ember" />
              <h3 className="text-sm font-bold text-text-primary">
                Conciliación Presupuestal Oficial del Plan Plurianual de Inversiones (PPI 2012–2027)
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Auditoría comparada entre los documentos normativos de adopción oficial en Concejo Distrital y los
              registros operacionales de seguimiento en <strong>bd_csh</strong> (99.424 filas de motor PLAN_DESARROLLO).
              El <strong>Acuerdo Distrital 139 del 29 de mayo de 2024</strong> fijó un PPI cuatrienal de{" "}
              <strong>$12,801 Billones COP</strong> ($12,57B ordinarios + $227,8M SGR), superando en más del doble al
              PDD 2020–2023 ($6,023B COP).
            </p>
          </div>

          {/* Tarjetas Resumen de Techos Financieros */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">PPI Oficial 2024–2027</span>
              <p className="text-xl font-extrabold text-ember">$12,801 Billones</p>
              <span className="text-[11px] text-text-muted">Acuerdo 139/2024 (Dumek Turbay)</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">PPI Oficial 2020–2023</span>
              <p className="text-xl font-extrabold text-info">$6,023 Billones</p>
              <span className="text-[11px] text-text-muted">P.A. 016/2020 (William Dau)</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Metas PDD Acuerdo 139</span>
              <p className="text-xl font-extrabold text-success">3.170 Metas</p>
              <span className="text-[11px] text-text-muted">1.753 indicadores en 29 entidades</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Calibración bd_csh</span>
              <p className="text-xl font-extrabold text-warning">0.82x Factor</p>
              <span className="text-[11px] text-text-muted">Corrección por sobrerreporte de filas</span>
            </div>
          </div>

          {/* Tarjetas de los 5 Planes de Desarrollo + 3 Locales */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Building2 className="h-4 w-4 text-ember" />
              <span>Catálogo Canónico de los 5 Planes de Desarrollo Distritales + 3 Planes Locales</span>
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {datosCatalogo.catalogo_planes.map((plan: PlanDesarrolloInfo) => (
                <div
                  key={plan.codigo}
                  className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-3 hover:border-ember/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        variant="outline"
                        className={
                          plan.estado_historico === "VIGENTE_ACTIVO"
                            ? "border-success/40 bg-success/10 text-success text-[10px]"
                            : "border-border text-text-muted text-[10px]"
                        }
                      >
                        {plan.cuatrienio} · {plan.estado_historico}
                      </Badge>
                      <h5 className="font-bold text-sm text-text-primary mt-1.5 leading-snug">
                        {plan.nombre_oficial}
                      </h5>
                      <p className="text-[11px] text-text-muted italic">{plan.lema}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-text-secondary border-t border-border-subtle pt-2">
                    <p>
                      <strong>Norma:</strong> {plan.norma_adopcion}
                    </p>
                    <p>
                      <strong>Alcalde:</strong> {plan.alcalde}
                    </p>
                    <p>
                      <strong>Documento Oficial:</strong> {plan.paginas_documento} páginas ({plan.fuente_archivo_md})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border-subtle pt-2 bg-surface-2 p-2 rounded-lg">
                    <div>
                      <span className="text-[10px] text-text-muted block">PPI Cuatrienio:</span>
                      <span className="font-bold text-text-primary">
                        {plan.ppi_total_cuatrienio_mcop > 0
                          ? `$${(plan.ppi_total_cuatrienio_mcop / 1_000_000).toFixed(3)}B COP`
                          : "Documental"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Metas Únicas:</span>
                      <span className="font-bold text-text-primary">
                        {plan.metas_pdd_unicas > 0 ? plan.metas_pdd_unicas.toLocaleString() : "Cualitativo"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Indicadores:</span>
                      <span className="font-semibold text-text-secondary">
                        {plan.indicadores_unicos > 0 ? plan.indicadores_unicos.toLocaleString() : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Filas bd_csh:</span>
                      <span className="font-semibold text-text-secondary">
                        {plan.filas_bd_csh > 0 ? plan.filas_bd_csh.toLocaleString() : "Documental"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla Oficial del Plan Plurianual de Inversiones (PPI Anual) */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Coins className="h-4 w-4 text-ember" />
                  <span>Tabla Oficial Anualizada del PPI (2020–2027) en Pesos Corrientes y Constantes Base 2025</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Desglose oficial por fuentes: Recursos Ordinarios vs. Sistema General de Regalías (SGR).
                </p>
              </div>
              <Badge variant="outline" className="border-border text-xs text-text-muted self-start">
                Ley 152 de 1994 Art. 29
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Vigencia</th>
                    <th className="p-3 text-right">Monto Corriente ($M)</th>
                    <th className="p-3 text-right">Constante 2025 ($M)</th>
                    <th className="p-3 text-center">Deflactor IPC</th>
                    <th className="p-3 text-right">Recursos Ordinarios ($M)</th>
                    <th className="p-3 text-right">Regalías SGR Directas ($M)</th>
                    <th className="p-3 text-right">Regalías Educación Sup. ($M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datosCatalogo.tabla_ppi_anual.map((item) => (
                    <tr key={item.vigencia} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3 font-bold text-text-primary">
                        {item.vigencia}{" "}
                        {item.vigencia >= 2024 ? (
                          <Badge variant="outline" className="ml-1 text-[9px] border-ember/40 text-ember">
                            Acuerdo 139
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-1 text-[9px] border-info/40 text-info">
                            Salvemos Juntos
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        ${item.monto_corriente_mcop.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-ember">
                        ${item.monto_constante_2025_mcop.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="p-3 text-center font-mono text-text-muted">
                        {item.factor_deflactacion_ipc.toFixed(4)}
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${item.recursos_distritales_ordinarios_mcop.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${item.regalias_sgr_directas_mcop.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${item.regalias_sgr_educacion_superior_mcop.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dos Tablas: Desglose por Línea Estratégica (Acuerdo 139) y Conciliación bd_csh */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Desglose PPI por Línea Estratégica */}
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Layers className="h-4 w-4 text-ember" />
                  <span>Distribución del PPI por Línea Estratégica (Acuerdo 139 / 2024–2027)</span>
                </h4>
                <p className="text-xs text-text-muted">Total cuatrienio: $12,801 Billones COP</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3">Línea Estratégica</th>
                      <th className="p-3 text-right">Monto ($M)</th>
                      <th className="p-3 text-right">Constante ($M)</th>
                      <th className="p-3 text-center">Part. %</th>
                      <th className="p-3 text-center">Metas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {datosCatalogo.lineas_estrategicas_ppi.map((linea) => (
                      <tr key={linea.linea_codigo} className="hover:bg-surface-2 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-text-primary block">{linea.linea_nombre}</span>
                          <span className="text-[10px] text-text-muted">{linea.linea_codigo}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-text-primary">
                          ${linea.monto_total_cuatrienio_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right font-mono text-ember font-semibold">
                          ${linea.monto_total_constante_2025_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-center font-bold text-success">
                          {linea.participacion_porcentual.toFixed(1)}%
                        </td>
                        <td className="p-3 text-center font-bold text-info">
                          {linea.metas_asociadas}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conciliación PPI vs bd_csh */}
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-warning" />
                  <span>Conciliación PPI vs. Matrices Excel (bd_csh) y Factor de Calibración</span>
                </h4>
                <p className="text-xs text-text-muted">Identificación del sobrerreporte por repetición de filas</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3">Vigencia</th>
                      <th className="p-3 text-right">PPI Acuerdo ($M)</th>
                      <th className="p-3 text-right">bd_csh Matriz ($M)</th>
                      <th className="p-3 text-center">Factor</th>
                      <th className="p-3">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {datosCatalogo.conciliacion_ppi.map((item) => (
                      <tr key={item.vigencia} className="hover:bg-surface-2 transition-colors">
                        <td className="p-3 font-bold text-text-primary">
                          {item.vigencia}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-text-primary">
                          ${item.ppi_oficial_acuerdo_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right font-mono text-warning font-semibold">
                          ${item.reportado_matrices_bd_csh_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-ember">
                          {item.factor_calibracion.toFixed(2)}x
                        </td>
                        <td className="p-3 text-xs text-text-muted">
                          {item.diagnostico_calibracion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Serie Histórica de Deflactación IPC DANE (2012–2025) */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
            <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-info" />
              <span>Serie Histórica de Inflación y Deflactor DANE Base Cerrada 2025 = 100 (2012–2025)</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 text-xs">
              {datosCatalogo.serie_ipc.slice(-7).map((ipc) => (
                <div key={ipc.anio} className="rounded-lg border border-border-subtle bg-surface-2 p-2.5 space-y-1">
                  <span className="font-bold text-text-primary block">{ipc.anio}</span>
                  <div className="text-[11px] text-text-muted">
                    Inflación: <strong className="text-ember">{ipc.inflacion_pct.toFixed(2)}%</strong>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Índice: <span className="font-mono">{ipc.indice_base_2025.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-info font-mono">
                    Factor: {ipc.factor_deflactor_hacia_2025.toFixed(4)}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 2: SEMÁFORO DE METAS, SEGURIDAD HUMANA & MACROPROYECTOS    */}
      {/* ==================================================================== */}
      {subvistaPdd === "cumplimiento_metas" && (
        <section
          data-testid="subvista-pdd-cumplimiento"
          aria-label="Semáforo de Metas PDD, Foco en Línea 1 Seguridad Humana y 19 Macroproyectos"
          className="space-y-6"
        >
          {/* Controles de Filtrado */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Selector de Plan */}
              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Plan de Desarrollo Evaluado</Label>
                <Select value={planCumplimiento} onValueChange={setPlanCumplimiento}>
                  <SelectTrigger className="text-xs" data-testid="select-pdd-plan" aria-label="Seleccionar Plan de Desarrollo">
                    <SelectValue placeholder="Seleccionar Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDD_2024_2027" className="text-xs">
                      2024–2027: Cartagena, Ciudad de Derechos
                    </SelectItem>
                    <SelectItem value="PDD_2020_2023" className="text-xs">
                      2020–2023: Salvemos Juntos a Cartagena
                    </SelectItem>
                    <SelectItem value="PDD_2016_2019" className="text-xs">
                      2016–2019: Primero la Gente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Línea Estratégica */}
              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Línea Estratégica / Pilar</Label>
                <Select value={lineaFiltro} onValueChange={setLineaFiltro}>
                  <SelectTrigger className="text-xs" data-testid="select-pdd-linea" aria-label="Filtrar por Línea Estratégica">
                    <SelectValue placeholder="Todas las líneas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">Todas las líneas</SelectItem>
                    <SelectItem value="Seguridad Humana" className="text-xs">Línea 1: Seguridad Humana</SelectItem>
                    <SelectItem value="Vida Digna" className="text-xs">Línea 2: Vida Digna</SelectItem>
                    <SelectItem value="Desarrollo Económico" className="text-xs">Línea 3: Desarrollo Económico</SelectItem>
                    <SelectItem value="Ciudad Conectada" className="text-xs">Línea 4: Ciudad Conectada</SelectItem>
                    <SelectItem value="Innovación Pública" className="text-xs">Línea 5: Innovación Pública</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Búsqueda de Macroproyectos */}
              <div className="min-w-[220px] flex-1">
                <Label className="text-[11px] text-text-muted mb-1 block">Buscar Macroproyecto / Entidad</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <Input
                    value={busquedaMacro}
                    onChange={(e) => setBusquedaMacro(e.target.value)}
                    placeholder="Filtrar por nombre (ej. Malecón, Drenajes, Cárcel, EPA)..."
                    className="pl-8 text-xs"
                    data-testid="input-pdd-busqueda"
                    aria-label="Buscar macroproyecto o entidad"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas KPI del Semáforo de Metas */}
          {resumenPlanActivo && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">Metas Formuladas</span>
                <p className="text-lg font-bold text-text-primary">
                  {resumenPlanActivo.metas_totales_unicas.toLocaleString()}
                </p>
                <span className="text-[10px] text-text-muted">{resumenPlanActivo.cuatrienio}</span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">En Ruta (≥ 75%)</span>
                <p className="text-lg font-bold text-success">
                  {resumenPlanActivo.metas_en_ruta_ge75.toLocaleString()}
                </p>
                <span className="text-[10px] text-success">
                  {resumenPlanActivo.porcentaje_en_ruta.toFixed(1)}% del total
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">Alerta Media (40–74%)</span>
                <p className="text-lg font-bold text-warning">
                  {resumenPlanActivo.metas_alerta_media_40_75.toLocaleString()}
                </p>
                <span className="text-[10px] text-warning">
                  {resumenPlanActivo.porcentaje_alerta_media.toFixed(1)}% atención
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">Rezago Crítico (&lt; 40%)</span>
                <p className="text-lg font-bold text-error">
                  {resumenPlanActivo.metas_rezago_critico_lt40.toLocaleString()}
                </p>
                <span className="text-[10px] text-error">
                  {resumenPlanActivo.porcentaje_rezago_critico.toFixed(1)}% crítico
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">Metas Huérfanas</span>
                <p className="text-lg font-bold text-text-muted">
                  {resumenPlanActivo.metas_huerfanas_sin_avance.toLocaleString()}
                </p>
                <span className="text-[10px] text-text-muted">
                  {resumenPlanActivo.porcentaje_huerfanas.toFixed(1)}% sin reporte
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">Avance Promedio</span>
                <p className="text-lg font-bold text-ember">
                  {resumenPlanActivo.avance_fisico_promedio_pct.toFixed(1)}%
                </p>
                <span className="text-[10px] text-text-muted">Ponderación física</span>
              </div>
            </div>
          )}

          {/* Foco Especial en Línea 1: «Seguridad Humana» (Acuerdo 139) */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-ember" />
                  <span>Foco Estratégico: Línea 1 «Seguridad Humana» (Acuerdo 139 de 2024 · 5 Componentes)</span>
                </h4>
                <p className="text-xs text-text-muted">
                  892 metas PDD y $3,456 Billones COP asignados. Seguimiento a los 5 Componentes Impulsores de Avance:
                </p>
              </div>
              <Badge variant="outline" className="border-ember/40 bg-ember/10 text-ember text-xs">
                27% del PPI Cuatrienal
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {datosCumplimiento.componentes_seguridad_humana.map((comp) => (
                <div
                  key={comp.codigo}
                  className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2 hover:border-ember/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-ember block">{comp.codigo}</span>
                      <h5 className="font-bold text-xs text-text-primary mt-0.5">{comp.nombre}</h5>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        comp.estado_semaforo === "EN_RUTA"
                          ? "border-success/40 bg-success/10 text-success text-[10px]"
                          : "border-warning/40 bg-warning/10 text-warning text-[10px]"
                      }
                    >
                      {comp.estado_semaforo}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-subtle">
                    <div>
                      <span className="text-[10px] text-text-muted block">Entidad Líder:</span>
                      <span className="font-semibold text-text-secondary">{comp.entidad_lider}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Presupuesto PPI:</span>
                      <span className="font-mono font-semibold text-text-primary">
                        ${(comp.presupuesto_ppi_mcop / 1_000).toFixed(1)} mil M
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Metas / Indicadores:</span>
                      <span className="font-bold text-text-secondary">
                        {comp.metas_cantidad} metas / {comp.indicadores_cantidad} ind.
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Avance Físico:</span>
                      <span className="font-bold text-ember">{comp.avance_promedio_pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seguimiento a 19 Macroproyectos Estratégicos (2024–2027) */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Target className="h-4 w-4 text-ember" />
                  <span>Seguimiento a los 19 Macroproyectos Estratégicos (Acuerdo 139 / 2024–2027)</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Grandes intervenciones de transformación urbana, drenajes, movilidad e inclusión social.
                </p>
              </div>
              <Badge variant="outline" className="border-border text-xs text-text-muted">
                {macroproyectosFiltrados.length} Proyectos
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Macroproyecto</th>
                    <th className="p-3">Línea Estratégica</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3 text-right">Inversión PPI ($M)</th>
                    <th className="p-3 text-center">Avance (%)</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {macroproyectosFiltrados.map((macro) => (
                    <tr key={macro.id} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text-primary block">{macro.nombre}</span>
                        <span className="text-[10px] text-text-muted block max-w-sm truncate">
                          {macro.descripcion}
                        </span>
                      </td>
                      <td className="p-3 text-text-secondary">{macro.linea_estrategica}</td>
                      <td className="p-3 font-semibold text-text-secondary">{macro.entidad_responsable}</td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        ${macro.inversion_ppi_mcop.toLocaleString("es-CO")}M
                      </td>
                      <td className="p-3 text-center font-bold text-ember">
                        {macro.avance_fisico_pct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            macro.estado === "EN_RUTA"
                              ? "border-success/40 bg-success/10 text-success text-[10px]"
                              : macro.estado === "ALERTA_MEDIA"
                              ? "border-warning/40 bg-warning/10 text-warning text-[10px]"
                              : "border-error/40 bg-error/10 text-error text-[10px]"
                          }
                        >
                          {macro.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seguimiento a los 3 Planes de Desarrollo Local (PDL 2024–2027) */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <MapPin className="h-4 w-4 text-info" />
              <span>Avance de los 3 Planes de Desarrollo Local (PDL 2024–2027) y Fondos de Desarrollo Local (FDL)</span>
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {datosCumplimiento.planes_locales.map((pdl) => (
                <div key={pdl.localidad_id} className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-info block">Localidad {pdl.localidad_id}</span>
                      <h5 className="font-bold text-xs text-text-primary">{pdl.nombre}</h5>
                    </div>
                    <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px]">
                      {pdl.estado}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary space-y-1">
                    <p><strong>Alcaldía:</strong> {pdl.alcaldia_local}</p>
                    <p><strong>FDL Presupuesto:</strong> ${pdl.presupuesto_fdl_mcop.toLocaleString("es-CO")}M COP</p>
                    <p><strong>Metas Locales:</strong> {pdl.metas_locales_cantidad} metas ({pdl.avance_promedio_pct.toFixed(1)}% avance)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 3: FRONTERA DEA DE PLANES DE DESARROLLO (CCR · BCC · SBM)   */}
      {/* ==================================================================== */}
      {subvistaPdd === "frontera_dea_pdd" && (
        <section
          data-testid="subvista-pdd-frontera-dea"
          aria-label="Frontera Eficiente DEA de los Planes de Desarrollo"
          className="space-y-6"
        >
          {/* Controles de Selección de Insumo y Plan */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Selector de Plan */}
              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Plan Evaluado en DEA</Label>
                <Select value={planDeaSeleccionado} onValueChange={setPlanDeaSeleccionado}>
                  <SelectTrigger className="text-xs" data-testid="select-pdd-dea-plan" aria-label="Seleccionar Plan para DEA">
                    <SelectValue placeholder="Seleccionar Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDD_2024_2027" className="text-xs">
                      2024–2027: Cartagena, Ciudad de Derechos
                    </SelectItem>
                    <SelectItem value="PDD_2020_2023" className="text-xs">
                      2020–2023: Salvemos Juntos a Cartagena
                    </SelectItem>
                    <SelectItem value="PDD_2016_2019" className="text-xs">
                      2016–2019: Primero la Gente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Insumo X1 */}
              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Insumo X1 (Presupuesto)</Label>
                <Select
                  value={insumoDeaSeleccionado}
                  onValueChange={(v) => setInsumoDeaSeleccionado(v as InsumoDeaPdd)}
                >
                  <SelectTrigger className="text-xs" data-testid="select-pdd-insumo" aria-label="Seleccionar Insumo DEA">
                    <SelectValue placeholder="Seleccionar Insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conciliado_ppi" className="text-xs">
                      PPI Conciliado (Acuerdo Distrital)
                    </SelectItem>
                    <SelectItem value="reportado" className="text-xs">
                      Presupuesto Reportado en Matrices
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Retornos de Escala */}
              <div className="w-[180px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Retornos a Escala (RTS)</Label>
                <Select value={filtroRetornosDea} onValueChange={setFiltroRetornosDea}>
                  <SelectTrigger className="text-xs" data-testid="select-pdd-filtro-retornos" aria-label="Filtrar por retornos">
                    <SelectValue placeholder="Todos los retornos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los retornos</SelectItem>
                    <SelectItem value="CRS" className="text-xs">CRS (Constantes)</SelectItem>
                    <SelectItem value="IRS" className="text-xs">IRS (Crecientes)</SelectItem>
                    <SelectItem value="DRS" className="text-xs">DRS (Decrecientes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Búsqueda DMU */}
              <div className="min-w-[200px] flex-1">
                <Label className="text-[11px] text-text-muted mb-1 block">Buscar Entidad / DMU</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <Input
                    value={busquedaDmu}
                    onChange={(e) => setBusquedaDmu(e.target.value)}
                    placeholder="Filtrar entidad o sigla (ej. DADIS, SED, PES, EPA)..."
                    className="pl-8 text-xs"
                    data-testid="input-pdd-dea-busqueda"
                    aria-label="Buscar entidad DMU"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas KPI DEA */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia Media BCC (VRS)</span>
              <p className="text-2xl font-extrabold text-success">
                {(datosFrontera.eficiencia_media_bcc_entidades * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-text-muted">Puntaje medio de entidades</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia Media CCR (CRS)</span>
              <p className="text-2xl font-extrabold text-info">
                {(datosFrontera.eficiencia_media_ccr_entidades * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-text-muted">Rendimientos globales</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Entidades en Frontera</span>
              <p className="text-2xl font-extrabold text-ember">
                {datosFrontera.entidades_en_frontera_cantidad} DMUs
              </p>
              <span className="text-[11px] text-text-muted">θ_BCC = 1.000 referentes</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Entidades Rezagadas</span>
              <p className="text-2xl font-extrabold text-error">
                {datosFrontera.entidades_rezagadas_cantidad} DMUs
              </p>
              <span className="text-[11px] text-text-muted">θ_BCC &lt; 0.80</span>
            </div>
          </div>

          {/* Tabla Dominio A: Frontera DEA por Entidad Responsable */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Compass className="h-4 w-4 text-ember" />
                  <span>Dominio A: Frontera Eficiente DEA por Entidad Responsable ({dmusDeaFiltradas.length} DMUs)</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Insumo: {insumoDeaSeleccionado === "conciliado_ppi" ? "PPI Conciliado MCOP (Base 2025)" : "Presupuesto Reportado MCOP"} | Outputs: Metas Cumplidas Eq. (Y1) e Indicadores Eficaces ≥ 75% (Y2).
                </p>
              </div>
              <Badge variant="outline" className="border-border text-xs text-text-muted">
                Regla de Cooper Cumplida (n ≥ 9)
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Entidad / DMU</th>
                    <th className="p-3 text-right">Insumo X1 ($M)</th>
                    <th className="p-3 text-right">Output Y1 (Metas Eq.)</th>
                    <th className="p-3 text-right">Output Y2 (Ind. ≥75%)</th>
                    <th className="p-3 text-center">θ_CCR</th>
                    <th className="p-3 text-center">θ_BCC</th>
                    <th className="p-3 text-center">SE</th>
                    <th className="p-3 text-center">RTS</th>
                    <th className="p-3 text-center">θ_SBM</th>
                    <th className="p-3 text-center">Bootstrap IC 95%</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dmusDeaFiltradas.map((dmu) => (
                    <tr
                      key={dmu.sigla}
                      className={
                        dmu.es_frontera
                          ? "bg-success/5 hover:bg-success/10 transition-colors"
                          : "hover:bg-surface-2 transition-colors"
                      }
                    >
                      <td className="p-3">
                        <span className="font-bold text-text-primary block">{dmu.entidad}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] border-border text-text-muted">
                            {dmu.sigla}
                          </Badge>
                          <span className="text-[10px] text-text-muted">{dmu.grupo_institucional}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        ${dmu.x1_ppi_conciliado_constante_2025_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        {dmu.y1_metas_pdd_cumplidas_equivalentes.toFixed(1)} / {dmu.total_metas_a_cargo}
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        {dmu.y2_indicadores_eficaces_ge75}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-info">
                        {dmu.theta_ccr.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-success">
                        {dmu.theta_bcc.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-text-muted">
                        {dmu.escala_eficiencia_se.toFixed(3)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            dmu.retornos_escala === "CRS"
                              ? "border-success/40 text-success text-[10px]"
                              : dmu.retornos_escala === "IRS"
                              ? "border-info/40 text-info text-[10px]"
                              : "border-warning/40 text-warning text-[10px]"
                          }
                        >
                          {dmu.retornos_escala}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-ember">
                        {dmu.theta_sbm.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-[10px] text-text-muted">
                        [{dmu.ic95_inf.toFixed(3)} – {dmu.ic95_sup.toFixed(3)}]
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDmuModal(dmu)}
                          className="text-[11px] gap-1"
                          data-testid={`btn-ver-slacks-pdd-${dmu.sigla}`}
                        >
                          <Target className="h-3 w-3" />
                          <span>Holguras</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla Dominio B: Frontera DEA por Línea Estratégica */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Layers className="h-4 w-4 text-info" />
                  <span>Dominio B: Frontera DEA Programática por Línea Estratégica del PDD</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Eficiencia comparada de conversión del PPI en metas e indicadores cumplidos.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Línea Estratégica</th>
                    <th className="p-3 text-right">PPI Asignado ($M)</th>
                    <th className="p-3 text-right">Metas Eq. Cumplidas (Y1)</th>
                    <th className="p-3 text-right">Indicadores Eficaces (Y2)</th>
                    <th className="p-3 text-center">θ_CCR</th>
                    <th className="p-3 text-center">θ_BCC</th>
                    <th className="p-3 text-center">SE</th>
                    <th className="p-3 text-center">RTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datosFrontera.ranking_lineas_estrategicas.map((linea) => (
                    <tr key={linea.linea_codigo} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text-primary block">{linea.linea_nombre}</span>
                        <span className="text-[10px] text-text-muted">{linea.linea_codigo}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        ${linea.x1_ppi_mcop_constante_2025.toLocaleString("es-CO")}M
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        {linea.y1_metas_cumplidas_equivalentes.toFixed(1)}
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        {linea.y2_indicadores_eficaces_ge75}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-info">
                        {linea.theta_ccr.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-success">
                        {linea.theta_bcc.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-text-muted">
                        {linea.escala_eficiencia_se.toFixed(3)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="border-border text-[10px]">
                          {linea.retornos_escala}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diálogo / Modal de Holguras y Metas Objetivo PDD (Slacks & Targets) */}
          {dmuModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-slacks-pdd-title"
              data-testid="modal-slacks-pdd"
            >
              <div className="max-w-xl w-full rounded-xl border border-border bg-surface-1 p-6 space-y-4 shadow-2xl">
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div>
                    <h3 id="modal-slacks-pdd-title" className="text-base font-bold text-text-primary">
                      Holguras y Metas Objetivo PDD (Slacks & Targets)
                    </h3>
                    <p className="text-xs text-text-muted">
                      {dmuModal.entidad} ({dmuModal.sigla}) · θ_BCC = {dmuModal.theta_bcc.toFixed(3)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDmuModal(null)}
                    data-testid="btn-cerrar-slacks-pdd"
                    aria-label="Cerrar modal de holguras"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-text-secondary leading-relaxed">
                    Prescripción matemática del solver HiGHS bajo formulación SBM / BCC para que la entidad alcance la frontera
                    envolvente de eficiencia (θ = 1.000):
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Insumo X1 (Presupuesto)</span>
                      <p className="text-sm font-bold text-text-primary">
                        ${dmuModal.x1_ppi_conciliado_constante_2025_mcop.toLocaleString("es-CO")}M
                      </p>
                      <div className="pt-1 text-[11px] text-error font-semibold">
                        Slack: -${dmuModal.slacks.slack_x1_mcop.toLocaleString("es-CO")}M
                      </div>
                      <div className="text-[11px] text-success font-semibold">
                        Target: ${dmuModal.targets.target_x1_mcop.toLocaleString("es-CO")}M
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Output Y1 (Metas PDD)</span>
                      <p className="text-sm font-bold text-text-primary">
                        {dmuModal.y1_metas_pdd_cumplidas_equivalentes.toFixed(1)} metas
                      </p>
                      <div className="pt-1 text-[11px] text-warning font-semibold">
                        Slack: +{dmuModal.slacks.slack_y1_metas.toFixed(1)} metas
                      </div>
                      <div className="text-[11px] text-success font-semibold">
                        Target: {dmuModal.targets.target_y1_metas.toFixed(1)} metas
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Output Y2 (Indicadores)</span>
                      <p className="text-sm font-bold text-text-primary">
                        {dmuModal.y2_indicadores_eficaces_ge75} eficaces
                      </p>
                      <div className="pt-1 text-[11px] text-warning font-semibold">
                        Slack: +{dmuModal.slacks.slack_y2_indicadores} eficaces
                      </div>
                      <div className="text-[11px] text-success font-semibold">
                        Target: {dmuModal.targets.target_y2_indicadores} eficaces
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1.5">
                    <span className="text-[10px] text-text-muted uppercase font-bold">
                      Pares Referentes en la Frontera (Lambda λ*)
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {dmuModal.peers.map((peer) => (
                        <Badge key={peer.sigla} variant="outline" className="border-info/40 bg-info/10 text-info text-xs gap-1">
                          <strong>{peer.sigla}:</strong> λ = {peer.lambda.toFixed(3)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setDmuModal(null)}>
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 4: ECONOMETRÍA COMPARADA, MALMQUIST, FDR & WILCOXON        */}
      {/* ==================================================================== */}
      {subvistaPdd === "econometria_comparada_pdd" && (
        <section
          data-testid="subvista-pdd-econometria"
          aria-label="Malmquist Inter-Planes, Correlaciones FDR, Desigualdad Gini y Prueba de Wilcoxon"
          className="space-y-6"
        >
          {/* Bloque 1: Índice Dinámico de Malmquist Inter-Planes */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-4">
            <div className="border-b border-border pb-3">
              <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-ember" />
                <span>Índice Dinámico de Malmquist Inter-Planes de Desarrollo (2016–2027)</span>
              </h4>
              <p className="text-xs text-text-muted">
                Descomposición con media geométrica: MPI = EFFCH (Catch-up de eficiencia) × TECHCH (Desplazamiento de frontera de metas).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {datosEconometria.malmquist_inter_planes.map((item) => (
                <div key={item.periodo_transicion} className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted block">Transición</span>
                      <h5 className="font-bold text-xs text-text-primary mt-0.5">{item.periodo_transicion}</h5>
                      <span className="text-[10px] text-text-muted">{item.plan_base} → {item.plan_comparado}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.mpi_medio_geometrico >= 1.0
                          ? "border-success/40 bg-success/10 text-success font-mono font-bold"
                          : "border-warning/40 bg-warning/10 text-warning font-mono font-bold"
                      }
                    >
                      MPI {item.mpi_medio_geometrico.toFixed(3)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border-subtle pt-2">
                    <div>
                      <span className="text-[10px] text-text-muted block">EFFCH (Catch-up):</span>
                      <span className="font-mono font-bold text-info">{item.effch_catch_up_medio.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">TECHCH (Frontera):</span>
                      <span className="font-mono font-bold text-ember">{item.techch_desplazamiento_medio.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Avance MPI:</span>
                      <span className="font-bold text-success">{item.entidades_con_avance_mpi} DMUs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Retroceso MPI:</span>
                      <span className="font-bold text-error">{item.entidades_con_retroceso_mpi} DMUs</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-secondary italic border-t border-border-subtle pt-2">
                    {item.diagnostico}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bloque 2: Matriz de Correlaciones con Control FDR Benjamini–Hochberg */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-info" />
                  <span>Matriz de Correlaciones con Control de Tasa de Falso Descubrimiento (FDR Benjamini–Hochberg)</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Control estricto de multiplicidad de contrastes (q-value ≤ 0.05).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Par de Variables Contrastadas</th>
                    <th className="p-3 text-center">Spearman (ρ)</th>
                    <th className="p-3 text-center">Pearson (r)</th>
                    <th className="p-3 text-center">N</th>
                    <th className="p-3 text-center">p-value</th>
                    <th className="p-3 text-center">q-value FDR</th>
                    <th className="p-3 text-center">Significancia</th>
                    <th className="p-3">Interpretación Pericial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datosEconometria.correlaciones_fdr.map((cor) => (
                    <tr key={cor.par_variables} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3 font-semibold text-text-primary">{cor.par_variables}</td>
                      <td className="p-3 text-center font-mono font-bold text-ember">
                        {cor.coeficiente_spearman.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-text-secondary">
                        {cor.coeficiente_pearson.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-text-muted">{cor.n_observaciones}</td>
                      <td className="p-3 text-center font-mono text-text-secondary">{cor.p_value.toFixed(4)}</td>
                      <td className="p-3 text-center font-mono font-bold text-info">{cor.q_value_fdr.toFixed(4)}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            cor.significativo_al_5pct
                              ? "border-success/40 bg-success/10 text-success text-[10px]"
                              : "border-border text-text-muted text-[10px]"
                          }
                        >
                          {cor.significativo_al_5pct ? "p < 0.05 (FDR)" : "No sign."}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-text-secondary">{cor.interpretacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque 3: Desigualdad Presupuestal del PPI (Gini & HHI) y Wilcoxon Pareado */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Concentración Gini y HHI */}
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Binary className="h-4 w-4 text-warning" />
                  <span>Concentración Presupuestal del PPI (Gini & HHI entre Planes)</span>
                </h4>
                <p className="text-xs text-text-muted">Desigualdad de distribución entre Líneas Estratégicas y Seguridad Humana</p>
              </div>

              <div className="p-4 space-y-3">
                {datosEconometria.desigualdad_gini_hhi.map((d) => (
                  <div key={d.plan_codigo} className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-text-primary">{d.nombre_plan} ({d.cuatrienio})</span>
                      <Badge variant="outline" className="text-[10px] border-border text-text-muted">
                        {d.tendencia_concentracion}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-text-muted block">Gini Líneas:</span>
                        <span className="font-mono font-bold text-ember">{d.gini_ppi_lineas.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">HHI Líneas:</span>
                        <span className="font-mono font-bold text-info">{d.hhi_ppi_lineas.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">Gini Dim. SHI:</span>
                        <span className="font-mono text-text-secondary">{d.gini_dimensiones_shi.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">Mayor Tajada:</span>
                        <span className="font-semibold text-text-primary">
                          {d.linea_mayor_participacion} ({d.pct_linea_mayor.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prueba Pareada de Wilcoxon */}
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-success" />
                  <span>Prueba Pareada No Paramétrica de Wilcoxon entre Gobiernos</span>
                </h4>
                <p className="text-xs text-text-muted">Contraste de hipótesis sobre las mismas entidades a través de los Planes</p>
              </div>

              <div className="p-4 space-y-3">
                {datosEconometria.pruebas_wilcoxon.map((w) => (
                  <div key={w.comparacion} className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-text-primary">{w.comparacion}</span>
                      <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px]">
                        p = {w.p_value.toFixed(4)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-text-muted block">W-Statistic:</span>
                        <span className="font-mono font-bold text-text-primary">{w.w_statistic.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">Z-Score:</span>
                        <span className="font-mono font-bold text-info">{w.z_score.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block">Dif. Mediana:</span>
                        <span className="font-bold text-success">{w.diferencia_mediana_pct > 0 ? `+${w.diferencia_mediana_pct}%` : `${w.diferencia_mediana_pct}%`}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-text-secondary italic border-t border-border-subtle pt-1.5">
                      {w.conclusion_estadistica}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
