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
  FolderTree,
  Crosshair,
  Flame,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
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
  obtenerExploradorProgramasYSeguridadHumanaApi,
  obtenerCatalogoYConciliacionPpiLocal,
  obtenerCumplimientoMetasPddLocal,
  obtenerFronteraDeaPddLocal,
  obtenerEconometriaComparadaPddLocal,
  obtenerExploradorProgramasYSeguridadHumanaLocal,
  type CatalogoYConciliacionPpiRespuesta,
  type CumplimientoMetasPddRespuesta,
  type FronteraDeaPddRespuesta,
  type EconometriaComparadaPddRespuesta,
  type ExploradorProgramasYSeguridadHumanaRespuesta,
  type InsumoDeaPdd,
  type NivelDeaPdd,
  type ModoImputacionPdd,
  type DmuDeaPddEntidad,
  type PlanDesarrolloInfo,
  type FondoDesarrolloLocalDetalle,
  type ImpulsorProgramaInfo,
} from "../services/plan-accion-dnp-api";

export interface PddDeaEvaluacionPanelProps {
  puedeEditar?: boolean;
}

export type SubvistaPddTipo =
  | "catalogo_y_ppi"
  | "explorador_programas"
  | "cumplimiento_metas"
  | "monitor_seguridad_humana"
  | "frontera_dea_pdd"
  | "econometria_comparada_pdd";

export function PddDeaEvaluacionPanel({ puedeEditar: _puedeEditar = false }: PddDeaEvaluacionPanelProps) {
  // Navegación entre las 6 sub-vistas del Panel PDD
  const [subvistaPdd, setSubvistaPdd] = useState<SubvistaPddTipo>("catalogo_y_ppi");

  // Estado con fallback local inmediato (SSR y tolerancia a desconexión)
  const [datosCatalogo, setDatosCatalogo] = useState<CatalogoYConciliacionPpiRespuesta>(
    obtenerCatalogoYConciliacionPpiLocal
  );
  const [datosCumplimiento, setDatosCumplimiento] = useState<CumplimientoMetasPddRespuesta>(() =>
    obtenerCumplimientoMetasPddLocal({ plan: "PDD_2024_2027" })
  );
  const [datosFrontera, setDatosFrontera] = useState<FronteraDeaPddRespuesta>(() =>
    obtenerFronteraDeaPddLocal({ plan: "PDD_2024_2027", insumo: "conciliado_ppi", nivel: "ENTIDADES" })
  );
  const [datosEconometria, setDatosEconometria] = useState<EconometriaComparadaPddRespuesta>(
    obtenerEconometriaComparadaPddLocal
  );
  const [datosExplorador, setDatosExplorador] = useState<ExploradorProgramasYSeguridadHumanaRespuesta>(
    obtenerExploradorProgramasYSeguridadHumanaLocal
  );

  // Sub-vista 2: Explorador de Programas
  const [busquedaExplorador, setBusquedaExplorador] = useState<string>("");
  const [planExplorador, setPlanExplorador] = useState<string>("TODOS");

  // Sub-vista 3: Cumplimiento de Metas & Imputación Tripartita
  const [planCumplimiento, setPlanCumplimiento] = useState<string>("PDD_2024_2027");
  const [lineaFiltro, setLineaFiltro] = useState<string>("TODAS");
  const [busquedaMacro, setBusquedaMacro] = useState<string>("");
  const [modoImputacion, setModoImputacion] = useState<ModoImputacionPdd>("directa");

  // Sub-vista 5: Frontera DEA Multi-Nivel
  const [nivelDeaSeleccionado, setNivelDeaSeleccionado] = useState<NivelDeaPdd>("ENTIDADES");
  const [planDeaSeleccionado, _setPlanDeaSeleccionado] = useState<string>("PDD_2024_2027");
  const [insumoDeaSeleccionado, setInsumoDeaSeleccionado] = useState<InsumoDeaPdd>("conciliado_ppi");
  const [filtroRetornosDea, setFiltroRetornosDea] = useState<string>("TODOS");
  const [busquedaDmu, setBusquedaDmu] = useState<string>("");
  const [dmuModal, setDmuModal] = useState<DmuDeaPddEntidad | null>(null);

  // Carga asíncrona no bloqueante desde API
  useEffect(() => {
    let activo = true;

    async function cargarDatosBackend() {
      try {
        const [catRes, cumRes, froRes, ecoRes, expRes] = await Promise.all([
          obtenerCatalogoYConciliacionPpiApi(),
          obtenerCumplimientoMetasPddApi({ plan: planCumplimiento, linea: lineaFiltro, imputacion: modoImputacion }),
          obtenerFronteraDeaPddApi({ plan: planDeaSeleccionado, insumo: insumoDeaSeleccionado, nivel: nivelDeaSeleccionado }),
          obtenerEconometriaComparadaPddApi(),
          obtenerExploradorProgramasYSeguridadHumanaApi(),
        ]);

        if (activo) {
          if (catRes) setDatosCatalogo(catRes);
          if (cumRes) setDatosCumplimiento(cumRes);
          if (froRes) setDatosFrontera(froRes);
          if (ecoRes) setDatosEconometria(ecoRes);
          if (expRes) setDatosExplorador(expRes);
        }
      } catch (err) {
        console.warn("Uso de datos locales auditados para PDD-DEA y PPI:", err);
      }
    }

    void cargarDatosBackend();

    return () => {
      activo = false;
    };
  }, [planCumplimiento, lineaFiltro, modoImputacion, planDeaSeleccionado, insumoDeaSeleccionado, nivelDeaSeleccionado]);

  // Sub-vista 2: Árbol Programático Filtrado
  const programasFiltrados = useMemo(() => {
    let list = datosExplorador.arbol_impulsores_programas || [];
    if (planExplorador !== "TODOS") {
      list = list.filter((p) => p.plan_asociado === planExplorador);
    }
    if (busquedaExplorador.trim() !== "") {
      const q = busquedaExplorador.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre_impulsor.toLowerCase().includes(q) ||
          p.codigo_impulsor.toLowerCase().includes(q) ||
          (p.nombre_programa && p.nombre_programa.toLowerCase().includes(q)) ||
          (p.codigo_programa && p.codigo_programa.toLowerCase().includes(q)) ||
          p.entidad_responsable.toLowerCase().includes(q) ||
          p.linea_nombre.toLowerCase().includes(q)
      );
    }
    return list;
  }, [datosExplorador, planExplorador, busquedaExplorador]);

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
      aria-label="Centro de Mando de Planes de Desarrollo, Conciliación PPI y DEA Cartagena (2012–2027 + 3 PDL)"
    >
      {/* ==================================================================== */}
      {/* CABECERA GENERAL DEL CENTRO DE MANDO PDD & DEA                        */}
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
            Centro de Mando Integral: auditoría de <strong>3.170 metas PDD</strong>, reconciliación de las{" "}
            <strong>99.424 filas de bd_csh</strong> con <strong>imputación tripartita</strong> (PDD ↔ PA ↔ BPIM), conciliación del{" "}
            <strong>PPI oficial ($12,801B COP)</strong>, los <strong>3 PDL ($304,98 mil millones)</strong>, monitor de la{" "}
            <strong>Línea 1 «Seguridad Humana» ($5,67B)</strong> y frontera DEA multi-nivel con HiGHS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Acuerdo 139/2024 · 3 PDL 004/2024</span>
          </Badge>
          <Badge variant="outline" className="border-ember/30 bg-ember/10 text-xs text-text-primary gap-1">
            <Sparkles className="h-3.5 w-3.5 text-ember" />
            <span>HiGHS Solver · Base 2025</span>
          </Badge>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* NAVEGACIÓN ENTRE LAS 6 SUB-PESTAÑAS DEL PANEL PDD                    */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          id="pdd-tab-ppi"
          variant={subvistaPdd === "catalogo_y_ppi" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("catalogo_y_ppi")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-catalogo-ppi"
          aria-pressed={subvistaPdd === "catalogo_y_ppi"}
        >
          <Building2 className="h-4 w-4" />
          <span>1. Catálogo (5 PDD + 3 PDL) & Conciliación PPI</span>
        </Button>

        <Button
          id="pdd-tab-explorador"
          variant={subvistaPdd === "explorador_programas" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("explorador_programas")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-explorador"
          aria-pressed={subvistaPdd === "explorador_programas"}
        >
          <FolderTree className="h-4 w-4" />
          <span>2. Explorador de Líneas, Impulsores y Programas</span>
        </Button>

        <Button
          id="pdd-tab-cumplimiento"
          variant={subvistaPdd === "cumplimiento_metas" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("cumplimiento_metas")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-cumplimiento"
          aria-pressed={subvistaPdd === "cumplimiento_metas"}
        >
          <Activity className="h-4 w-4" />
          <span>3. Cumplimiento de Metas & Imputación Tripartita</span>
        </Button>

        <Button
          id="pdd-tab-seguridad-humana"
          variant={subvistaPdd === "monitor_seguridad_humana" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("monitor_seguridad_humana")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-seguridad-humana"
          aria-pressed={subvistaPdd === "monitor_seguridad_humana"}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>4. Monitor Línea 1: Seguridad Humana ($5,67B COP)</span>
        </Button>

        <Button
          id="pdd-tab-frontera"
          variant={subvistaPdd === "frontera_dea_pdd" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("frontera_dea_pdd")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-frontera-dea"
          aria-pressed={subvistaPdd === "frontera_dea_pdd"}
        >
          <Compass className="h-4 w-4" />
          <span>5. Frontera DEA Multi-Nivel (Entidades, Líneas & PDL)</span>
        </Button>

        <Button
          id="pdd-tab-econometria"
          variant={subvistaPdd === "econometria_comparada_pdd" ? "ember" : "outline"}
          size="sm"
          onClick={() => setSubvistaPdd("econometria_comparada_pdd")}
          className="gap-2 text-xs font-medium"
          data-testid="tab-pdd-econometria"
          aria-pressed={subvistaPdd === "econometria_comparada_pdd"}
        >
          <Calculator className="h-4 w-4" />
          <span>6. Econometría Comparada & Malmquist LP</span>
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
                Conciliación Presupuestal Oficial del Plan Plurianual de Inversiones (PPI 2012–2027 + 3 PDL)
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Auditoría comparada entre los acuerdos de adopción oficial en Concejo Distrital y Juntas Administradoras Locales
              versus las matrices operacionales de <strong>bd_csh</strong> (99.424 filas de motor PLAN_DESARROLLO).
              El <strong>Acuerdo Distrital 139 del 29 de mayo de 2024</strong> fijó un PPI cuatrienal de{" "}
              <strong>$12,801 Billones COP</strong>, mientras que el recién extraído PPI de <strong>PDD 2013–2015</strong> («Ahora Sí Cartagena», Acuerdo 016)
              totalizó <strong>$1.874.167.605.000 COP</strong> ($1.874,17 M COP) y los <strong>3 Planes Locales (PDL 2024–2027)</strong> sumaron{" "}
              <strong>$304.981.037.938 COP</strong> en Fondos de Desarrollo Local.
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
              <span className="text-[10px] uppercase font-bold text-text-muted">PPI PDD 2013–2015</span>
              <p className="text-xl font-extrabold text-success">$1.874,17 M COP</p>
              <span className="text-[11px] text-text-muted">Acuerdo 016/2013 (Ahora Sí Cartagena)</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Fondos Locales (3 PDL)</span>
              <p className="text-xl font-extrabold text-warning">$304,98 Mil Millones</p>
              <span className="text-[11px] text-text-muted">Acuerdos Locales 004/2024 (Loc 1, 2 y 3)</span>
            </div>
          </div>

          {/* Catálogo Canónico de los 5 Planes Distritales + 3 Planes Locales */}
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
                      <strong>Alcalde / Responsable:</strong> {plan.alcalde}
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

          {/* Tabla de los 3 Fondos de Desarrollo Local (PDL 2024–2027) */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-warning" />
                  <span>Los 3 Planes de Desarrollo Local (PDL 2024–2027) — Fondos FDL Oficiales ($304,98 Mil Millones)</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Acuerdos Locales 004 de 2024 adoptados por las Juntas Administradoras Locales (JAL).
                </p>
              </div>
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-xs self-start">
                Ley 1617 de 2013
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Localidad</th>
                    <th className="p-3">Acuerdo Local</th>
                    <th className="p-3 text-right">FDL Total ($M)</th>
                    <th className="p-3 text-right">2024 ($M)</th>
                    <th className="p-3 text-right">2025 ($M)</th>
                    <th className="p-3 text-right">2026 ($M)</th>
                    <th className="p-3 text-right">2027 ($M)</th>
                    <th className="p-3 text-center">Líneas</th>
                    <th className="p-3 text-center">Tablas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datosCatalogo.fondos_desarrollo_local.map((fdl: FondoDesarrolloLocalDetalle) => (
                    <tr key={fdl.localidad_id} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text-primary block">{fdl.nombre_localidad}</span>
                        <span className="text-[10px] text-text-muted italic">{fdl.nombre_plan}</span>
                      </td>
                      <td className="p-3 text-text-secondary">{fdl.acuerdo_local}</td>
                      <td className="p-3 text-right font-mono font-bold text-ember">
                        ${fdl.total_fdl_mcop.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${(fdl.anual_corriente_mcop[2024] || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${(fdl.anual_corriente_mcop[2025] || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${(fdl.anual_corriente_mcop[2026] || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </td>
                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${(fdl.anual_corriente_mcop[2027] || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </td>
                      <td className="p-3 text-center font-bold text-info">{fdl.lineas_estrategicas_count}</td>
                      <td className="p-3 text-center text-text-muted">{fdl.filas_tablas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla Oficial del Plan Plurianual de Inversiones (PPI Anual) */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Coins className="h-4 w-4 text-ember" />
                  <span>Tabla Oficial Anualizada del PPI (2014–2027) en Pesos Corrientes y Constantes Base 2025</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Serie que incluye PDD 2013–2015 ($1.874,17 M COP), PDD 2020–2023 ($6.022,98 M COP) y PDD 2024–2027 ($12.800,85 M COP).
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
                        ) : item.vigencia >= 2020 ? (
                          <Badge variant="outline" className="ml-1 text-[9px] border-info/40 text-info">
                            Salvemos Juntos
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-1 text-[9px] border-success/40 text-success">
                            Ahora Sí Cart.
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
      {/* SUB-VISTA 2: EXPLORADOR DE LÍNEAS, IMPULSORES Y PROGRAMAS             */}
      {/* ==================================================================== */}
      {subvistaPdd === "explorador_programas" && (
        <section
          data-testid="subvista-pdd-explorador"
          aria-label="Explorador Oficial de Líneas, Impulsores y Programas"
          className="space-y-6"
        >
          {/* Banner Metodológico */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-ember" />
              <h3 className="text-sm font-bold text-text-primary">
                Explorador de los 42 Impulsores de Avance y 172 Programas Oficiales (Acuerdo 139 y Precedentes)
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Árbol de navegación programática extraído directamente de las bases técnicas y ponencias de segundo debate.
              Permite inspeccionar los techos presupuestales cuatrienales, metas de bienestar, metas de producto e indicadores
              focalizados por entidad líder y línea estratégica.
            </p>
          </div>

          {/* Controles de Filtrado */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-[260px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Plan de Desarrollo / Ámbito</Label>
                <Select value={planExplorador} onValueChange={setPlanExplorador}>
                  <SelectTrigger className="text-xs" data-testid="select-explorador-plan" aria-label="Filtrar por Plan de Desarrollo">
                    <SelectValue placeholder="Todos los Planes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los Planes</SelectItem>
                    <SelectItem value="PDD_2024_2027" className="text-xs">2024–2027: Cartagena, Ciudad de Derechos</SelectItem>
                    <SelectItem value="PDD_2020_2023" className="text-xs">2020–2023: Salvemos Juntos a Cartagena</SelectItem>
                    <SelectItem value="PDD_2013_2015" className="text-xs">2013–2015: Ahora Sí Cartagena</SelectItem>
                    <SelectItem value="PDL_2024_2027" className="text-xs">2024–2027: Planes de Desarrollo Local (PDL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[260px] flex-1">
                <Label className="text-[11px] text-text-muted mb-1 block">Buscar Impulsor, Programa o Entidad</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <Input
                    value={busquedaExplorador}
                    onChange={(e) => setBusquedaExplorador(e.target.value)}
                    placeholder="Filtrar por nombre, código o entidad (ej. Titán 24, Salud, Educación, DADIS)..."
                    className="pl-8 text-xs"
                    data-testid="input-explorador-busqueda"
                    aria-label="Buscar impulsor o programa"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Impulsores y Programas */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Layers className="h-4 w-4 text-ember" />
                  <span>Catálogo Programático Oficial ({programasFiltrados.length} componentes encontrados)</span>
                </h4>
                <p className="text-xs text-text-muted">Desglose de techos cuatrienales, metas formuladas y entidad responsable.</p>
              </div>
              <Badge variant="outline" className="border-border text-xs text-text-muted">
                42 Impulsores · 172 Programas
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Impulsor / Programa</th>
                    <th className="p-3">Línea Estratégica</th>
                    <th className="p-3">Entidad Responsable</th>
                    <th className="p-3 text-right">Presupuesto ($M)</th>
                    <th className="p-3 text-center">Metas Bienestar</th>
                    <th className="p-3 text-center">Metas Producto</th>
                    <th className="p-3 text-center">Indicadores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {programasFiltrados.map((item: ImpulsorProgramaInfo) => (
                    <tr key={item.id} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3 font-mono font-bold text-ember">
                        {item.codigo_impulsor}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-text-primary block">{item.nombre_impulsor}</span>
                        {item.nombre_programa && (
                          <span className="text-[11px] text-text-muted block mt-0.5">
                            Prog: {item.codigo_programa} · {item.nombre_programa}
                          </span>
                        )}
                        {item.nombre_impulsor.includes("Titán 24") && (
                          <Badge variant="outline" className="mt-1 text-[9px] border-error/40 bg-error/10 text-error">
                            Plan Titán 24
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-text-secondary">{item.linea_nombre}</td>
                      <td className="p-3 font-medium text-text-primary">{item.entidad_responsable}</td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        ${item.presupuesto_cuatrienio_mcop.toLocaleString("es-CO", { maximumFractionDigits: 1 })}M
                      </td>
                      <td className="p-3 text-center font-bold text-info">{item.metas_bienestar_count}</td>
                      <td className="p-3 text-center font-bold text-success">{item.metas_producto_count}</td>
                      <td className="p-3 text-center text-text-muted">{item.indicadores_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 3: CUMPLIMIENTO DE METAS & IMPUTACIÓN TRIPARTITA           */}
      {/* ==================================================================== */}
      {subvistaPdd === "cumplimiento_metas" && (
        <section
          data-testid="subvista-pdd-cumplimiento"
          aria-label="Cumplimiento de Metas PDD e Imputación Tripartita"
          className="space-y-6"
        >
          {/* Banner Metodológico con Switch de Imputación Tripartita */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-ember" />
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Reconciliación Semántica e Imputación Tripartita (PDD ↔ PA ↔ BPIM)
                  </h3>
                  <p className="text-xs text-text-muted">
                    Conmuta entre el reporte crudo de la matriz PDD y la imputación verificada contra Plan de Acción e Inversión Presupuestal.
                  </p>
                </div>
              </div>

              {/* Botones de Toggle Directo vs Tripartito */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
                <Button
                  variant={modoImputacion === "directa" ? "ember" : "ghost"}
                  size="sm"
                  onClick={() => setModoImputacion("directa")}
                  className="text-xs h-7 px-3"
                  data-testid="btn-imputacion-directa"
                >
                  Avance Directo PDD
                </Button>
                <Button
                  variant={modoImputacion === "tripartita" ? "ember" : "ghost"}
                  size="sm"
                  onClick={() => setModoImputacion("tripartita")}
                  className="text-xs h-7 px-3 gap-1"
                  data-testid="btn-imputacion-tripartita"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Consolidado Tripartito</span>
                </Button>
              </div>
            </div>

            {/* Estadísticas del Cruce Tripartito */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs pt-2 border-t border-border-subtle">
              <div className="rounded-lg bg-surface-2 p-2.5">
                <span className="text-[10px] text-text-muted block">Filas Matriz PDD</span>
                <span className="font-bold text-text-primary font-mono">
                  {datosExplorador.cruce_tripartito.filas_totales_pdd.toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg bg-surface-2 p-2.5">
                <span className="text-[10px] text-text-muted block">Avance Propio PDD</span>
                <span className="font-bold text-info font-mono">
                  {datosExplorador.cruce_tripartito.filas_avance_propio_pdd.toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg bg-surface-2 p-2.5">
                <span className="text-[10px] text-text-muted block">Rescatadas en Plan Acción</span>
                <span className="font-bold text-success font-mono">
                  +{datosExplorador.cruce_tripartito.filas_con_avance_en_pa.toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg bg-surface-2 p-2.5">
                <span className="text-[10px] text-text-muted block">Soporte Inversión Presup.</span>
                <span className="font-bold text-warning font-mono">
                  +{datosExplorador.cruce_tripartito.filas_con_soporte_presupuestal.toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg bg-surface-2 p-2.5">
                <span className="text-[10px] text-text-muted block">Filas Saneadas Limpias</span>
                <span className="font-bold text-ember font-mono">
                  {datosExplorador.cruce_tripartito.filas_saneadas_linea_estrategica.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Controles de Filtrado */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-4">
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

              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Línea Estratégica Canónica</Label>
                <Select value={lineaFiltro} onValueChange={setLineaFiltro}>
                  <SelectTrigger className="text-xs" data-testid="select-pdd-linea" aria-label="Filtrar por Línea Estratégica">
                    <SelectValue placeholder="Todas las líneas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">Todas las líneas canónicas</SelectItem>
                    <SelectItem value="Seguridad Humana" className="text-xs">1. Seguridad Humana</SelectItem>
                    <SelectItem value="Vida Digna" className="text-xs">2. Vida Digna</SelectItem>
                    <SelectItem value="Desarrollo Económico" className="text-xs">3. Desarrollo Económico Equitativo</SelectItem>
                    <SelectItem value="Ciudad Conectada" className="text-xs">4. Ciudad Conectada y Sostenible</SelectItem>
                    <SelectItem value="Innovación Pública" className="text-xs">5. Innovación Pública y Participación</SelectItem>
                    <SelectItem value="Pueblos y Comunidades Étnicas" className="text-xs">6. Pueblos y Comunidades Étnicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  {modoImputacion === "tripartita"
                    ? datosExplorador.cruce_tripartito.metas_huerfanas_remanentes
                    : resumenPlanActivo.metas_huerfanas_sin_avance.toLocaleString()}
                </p>
                <span className="text-[10px] text-text-muted">
                  {modoImputacion === "tripartita"
                    ? `${datosExplorador.cruce_tripartito.metas_huerfanas_tripartitas_resueltas} resueltas`
                    : `${resumenPlanActivo.porcentaje_huerfanas.toFixed(1)}% sin reporte`}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-text-muted">Avance Promedio</span>
                <p className="text-lg font-bold text-ember">
                  {modoImputacion === "tripartita"
                    ? `${datosExplorador.cruce_tripartito.avance_consolidado_tripartito_pct.toFixed(1)}%`
                    : `${resumenPlanActivo.avance_fisico_promedio_pct.toFixed(1)}%`}
                </p>
                <span className="text-[10px] text-text-muted">
                  {modoImputacion === "tripartita" ? "Imputación tripartita" : "Ponderación directa"}
                </span>
              </div>
            </div>
          )}

          {/* Seguimiento a los 19 Macroproyectos Estratégicos */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Flame className="h-4 w-4 text-ember" />
                  <span>Seguimiento a los 19 Macroproyectos de Ciudad ({macroproyectosFiltrados.length} listados)</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Obras de gran impacto cuatrienal: Malecón del Mar, Drenajes Pluviales, Ciénaga de la Virgen, Perimetral y Cárcel Distrital.
                </p>
              </div>
              <Badge variant="outline" className="border-border text-xs text-text-muted self-start">
                Acuerdo 139 / 2024–2027
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Macroproyecto</th>
                    <th className="p-3">Línea Estratégica</th>
                    <th className="p-3">Entidad Responsable</th>
                    <th className="p-3 text-right">Inversión PPI ($M)</th>
                    <th className="p-3 text-center">Avance Físico</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {macroproyectosFiltrados.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-2 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text-primary block">{m.nombre}</span>
                        <span className="text-[10px] text-text-muted block mt-0.5 line-clamp-1">{m.descripcion}</span>
                      </td>
                      <td className="p-3 text-text-secondary">{m.linea_estrategica}</td>
                      <td className="p-3 font-semibold text-text-primary">{m.entidad_responsable}</td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        ${m.inversion_ppi_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-bold text-ember">{m.avance_fisico_pct.toFixed(1)}%</span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            m.estado === "EN_RUTA"
                              ? "border-success/40 bg-success/10 text-success text-[10px]"
                              : "border-warning/40 bg-warning/10 text-warning text-[10px]"
                          }
                        >
                          {m.estado}
                        </Badge>
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
      {/* SUB-VISTA 4: MONITOR LÍNEA 1: SEGURIDAD HUMANA                       */}
      {/* ==================================================================== */}
      {subvistaPdd === "monitor_seguridad_humana" && (
        <section
          data-testid="subvista-pdd-seguridad-humana"
          aria-label="Monitor Especializado Línea 1: Seguridad Humana ($5,67B COP)"
          className="space-y-6"
        >
          {/* Banner Principal de Seguridad Humana */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ember/20 text-ember">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Monitor Especializado Línea 1: «Seguridad Humana» (Acuerdo 139 de 2024)
                  </h3>
                  <p className="text-xs text-text-muted">
                    Asignación cuatrienal de <strong>$5.666.917.744.338 COP</strong> (<strong>44,27% del PDD total</strong>),
                    compuesta por $5.658,53 M COP ordinarios y $8.384 M SGR.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-ember/40 bg-ember/10 text-ember font-bold text-xs self-start">
                44,27% del PDD · 5 Impulsores
              </Badge>
            </div>

            {/* Los 5 Impulsores de la Línea 1 */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5 pt-2">
              {datosExplorador.monitor_seguridad_humana.impulsores.map((imp) => (
                <div key={imp.codigo} className="rounded-lg border border-border bg-surface-2 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-ember">{imp.codigo}</span>
                    <Badge variant="outline" className="text-[9px] border-success/40 text-success">
                      {imp.estado_semaforo}
                    </Badge>
                  </div>
                  <h5 className="font-bold text-xs text-text-primary line-clamp-2 leading-snug">
                    {imp.nombre}
                  </h5>
                  <p className="text-[10px] text-text-muted">{imp.entidad_lider}</p>
                  <div className="pt-1 text-xs font-mono font-bold text-ember">
                    ${imp.presupuesto_ppi_mcop.toLocaleString("es-CO", { maximumFractionDigits: 1 })}M
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {imp.metas_cantidad} metas · Avance {imp.avance_promedio_pct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cuadrícula de Cruces Multidimensionales */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Cruce 8 Dimensiones PNUD de la Seguridad Humana */}
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-info" />
                  <span>Articulación con las 8 Dimensiones PNUD de la Seguridad Humana</span>
                </h4>
                <p className="text-xs text-text-muted">Distribución de recursos y metas según el marco internacional de Naciones Unidas.</p>
              </div>

              <div className="p-4 space-y-2.5">
                {datosExplorador.monitor_seguridad_humana.dimensiones_pnud.map((dim) => (
                  <div key={dim.dimension} className="rounded-lg border border-border bg-surface-2 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-text-primary block">{dim.dimension}</span>
                      <span className="text-[10px] text-text-muted">{dim.descripcion}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-ember block">
                        ${dim.presupuesto_asociado_mcop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}M
                      </span>
                      <span className="text-[10px] text-text-muted">{dim.metas_asociadas} metas</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cruce con Mesas Territoriales, PAS y Registros de Delincuencia */}
            <div className="space-y-4">
              {/* 33 Mesas Territoriales */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-ember" />
                    <span>33 Mesas Territoriales de Seguridad Ciudadana</span>
                  </h4>
                  <Badge variant="outline" className="border-info/40 text-info text-xs">
                    3 Localidades
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Seguimiento continuo en las 3 localidades de Cartagena, con{" "}
                  <strong>{datosExplorador.monitor_seguridad_humana.mesas_territoriales.demandas_priorizadas_seguridad} demandas comunitarias priorizadas</strong> y{" "}
                  <strong>{datosExplorador.monitor_seguridad_humana.mesas_territoriales.compromisos_activos} compromisos activos</strong> bajo vigilancia comunitaria.
                </p>
              </div>

              {/* 10 Compromisos PAS */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>10 Compromisos del Plan de Acción de Seguridad (PAS 2024–2027)</span>
                  </h4>
                  <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-xs">
                    100% Articulación Titán 24
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Articulación estricta entre la Secretaría del Interior y la Policía Metropolitana:{" "}
                  <strong>{datosExplorador.monitor_seguridad_humana.compromisos_pas.compromisos_vinculados_linea1} de {datosExplorador.monitor_seguridad_humana.compromisos_pas.total_compromisos} compromisos PAS</strong> se
                  ejecutan de forma coordinada con las fuerzas de seguridad distritales.
                </p>
              </div>

              {/* 12.280 Registros de Delincuencia & Hurtos */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span>12.280 Filas de Delincuencia y Hurtos Georreferenciados</span>
                  </h4>
                  <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-xs">
                    14 Zonas Críticas
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  La matriz territorial de <strong>bd_csh</strong> analiza{" "}
                  <strong>{datosExplorador.monitor_seguridad_humana.delincuencia_hurtos.total_registros_georreferenciados.toLocaleString()} registros</strong> geolocalizados,
                  focalizando el patrullaje Titán 24 en los{" "}
                  <strong>{datosExplorador.monitor_seguridad_humana.delincuencia_hurtos.zonas_criticas_focalizadas} cuadrantes de mayor incidencia</strong> del Centro Histórico, Bazurto, Olaya Herrera y El Pozón.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 5: FRONTERA DEA MULTI-NIVEL (ENTIDADES, LÍNEAS & PDL)       */}
      {/* ==================================================================== */}
      {subvistaPdd === "frontera_dea_pdd" && (
        <section
          data-testid="subvista-pdd-frontera"
          aria-label="Frontera DEA Multi-Nivel (Entidades, Líneas Estratégicas y Localidades PDL)"
          className="space-y-6"
        >
          {/* Banner Metodológico */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-ember" />
              <h3 className="text-sm font-bold text-text-primary">
                Frontera Eficiente DEA Multi-Nivel con HiGHS Solver (CCR · BCC · SBM · Slacks & Targets)
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Formulación DEA no paramétrica orientada a insumos con rendimientos constantes (CCR) y variables (BCC),
              eficiencia de escala (SE = θ_CCR / θ_BCC), modelo no radial basado en holguras (SBM de Tone) y corrección por sesgo
              mediante remuestreo Bootstrap (B=200 réplicas con intervalos de confianza al 95%). Permite conmutar entre Entidades,
              Líneas Estratégicas y los 3 Planes de Desarrollo Local.
            </p>
          </div>

          {/* Controles de Selección de Nivel y Filtros */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Selector de Nivel DEA */}
              <div className="w-[240px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Nivel de Evaluación DEA</Label>
                <Select
                  value={nivelDeaSeleccionado}
                  onValueChange={(val: NivelDeaPdd) => setNivelDeaSeleccionado(val)}
                >
                  <SelectTrigger className="text-xs" data-testid="select-pdd-nivel-dea" aria-label="Seleccionar Nivel DEA">
                    <SelectValue placeholder="Nivel DEA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTIDADES" className="text-xs">
                      1. Por Entidad DMU (28 Entidades Distritales)
                    </SelectItem>
                    <SelectItem value="LINEAS_ESTRATEGICAS" className="text-xs">
                      2. Por Línea Estratégica PDD (6 Líneas)
                    </SelectItem>
                    <SelectItem value="LOCALIDADES_PDL" className="text-xs">
                      3. Por Localidad PDL (3 Planes Locales)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Insumo */}
              <div className="w-[200px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Insumo Financiero (X1)</Label>
                <Select
                  value={insumoDeaSeleccionado}
                  onValueChange={(val: InsumoDeaPdd) => setInsumoDeaSeleccionado(val)}
                >
                  <SelectTrigger className="text-xs" data-testid="select-pdd-insumo-dea" aria-label="Seleccionar Insumo">
                    <SelectValue placeholder="Seleccionar Insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conciliado_ppi" className="text-xs">PPI Conciliado (Deflactado 2025)</SelectItem>
                    <SelectItem value="reportado" className="text-xs">Presupuesto Reportado bd_csh</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Retornos a Escala (solo para Entidades) */}
              {nivelDeaSeleccionado === "ENTIDADES" && (
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
              )}

              {/* Búsqueda DMU */}
              {nivelDeaSeleccionado === "ENTIDADES" && (
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
              )}
            </div>
          </div>

          {/* Tarjetas KPI DEA */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia Media BCC (VRS)</span>
              <p className="text-2xl font-extrabold text-success">
                {(datosFrontera.eficiencia_media_bcc_entidades * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-text-muted">Puntaje medio relativo</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia Media CCR (CRS)</span>
              <p className="text-2xl font-extrabold text-info">
                {(datosFrontera.eficiencia_media_ccr_entidades * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-text-muted">Rendimientos globales</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Unidades en Frontera</span>
              <p className="text-2xl font-extrabold text-ember">
                {datosFrontera.entidades_en_frontera_cantidad} DMUs
              </p>
              <span className="text-[11px] text-text-muted">θ_BCC = 1.000 referentes</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Unidades Rezagadas</span>
              <p className="text-2xl font-extrabold text-error">
                {datosFrontera.entidades_rezagadas_cantidad} DMUs
              </p>
              <span className="text-[11px] text-text-muted">θ_BCC &lt; 0.80</span>
            </div>
          </div>

          {/* TABLA NIVEL 1: ENTIDADES DMU */}
          {nivelDeaSeleccionado === "ENTIDADES" && (
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Compass className="h-4 w-4 text-ember" />
                    <span>Frontera Eficiente DEA por Entidad Responsable ({dmusDeaFiltradas.length} DMUs)</span>
                  </h4>
                  <p className="text-xs text-text-muted">
                    Insumo: {insumoDeaSeleccionado === "conciliado_ppi" ? "PPI Conciliado MCOP (Base 2025)" : "Presupuesto Reportado MCOP"} | Outputs: Metas Cumplidas Eq. (Y1) e Indicadores Eficaces ≥ 75% (Y2).
                  </p>
                </div>
                <Badge variant="outline" className="border-border text-xs text-text-muted">
                  Regla de Cooper Cumplida (n=28 ≥ 9)
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
          )}

          {/* TABLA NIVEL 2: LÍNEAS ESTRATÉGICAS */}
          {nivelDeaSeleccionado === "LINEAS_ESTRATEGICAS" && (
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Layers className="h-4 w-4 text-info" />
                    <span>Frontera DEA Programática por Línea Estratégica del PDD (6 Líneas)</span>
                  </h4>
                  <p className="text-xs text-text-muted">
                    Eficiencia de conversión del PPI en metas e indicadores cumplidos a nivel macro-sectorial.
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
          )}

          {/* TABLA NIVEL 3: LOCALIDADES PDL */}
          {nivelDeaSeleccionado === "LOCALIDADES_PDL" && (
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-warning" />
                    <span>Frontera DEA Territorial por Fondo de Desarrollo Local (3 PDL 2024–2027)</span>
                  </h4>
                  <p className="text-xs text-text-muted">
                    Eficiencia relativa de las 3 Localidades distritales con base en su FDL ($304,98 Mil Millones COP).
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3">Localidad PDL</th>
                      <th className="p-3">Alcaldía Local</th>
                      <th className="p-3 text-right">FDL Insumo ($M)</th>
                      <th className="p-3 text-right">Metas Eq. Cumplidas (Y1)</th>
                      <th className="p-3 text-right">Indicadores Eficaces (Y2)</th>
                      <th className="p-3 text-center">θ_CCR</th>
                      <th className="p-3 text-center">θ_BCC</th>
                      <th className="p-3 text-center">SE</th>
                      <th className="p-3 text-center">RTS</th>
                      <th className="p-3 text-center">θ_SBM</th>
                      <th className="p-3 text-center">Bootstrap IC 95%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {datosFrontera.ranking_localidades_pdl.map((loc) => (
                      <tr key={loc.localidad_id} className="hover:bg-surface-2 transition-colors">
                        <td className="p-3 font-bold text-text-primary">
                          {loc.nombre}
                        </td>
                        <td className="p-3 text-text-secondary">{loc.alcaldia}</td>
                        <td className="p-3 text-right font-mono font-semibold text-text-primary">
                          ${loc.x1_fdl_presupuesto_constante_2025_mcop.toLocaleString("es-CO")}M
                        </td>
                        <td className="p-3 text-right font-mono text-text-secondary">
                          {loc.y1_metas_locales_cumplidas_eq.toFixed(1)}
                        </td>
                        <td className="p-3 text-right font-mono text-text-secondary">
                          {loc.y2_indicadores_eficaces}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-info">
                          {loc.theta_ccr.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-success">
                          {loc.theta_bcc.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono text-text-muted">
                          {loc.escala_se.toFixed(3)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="border-border text-[10px]">
                            {loc.retornos}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-ember">
                          {loc.theta_sbm.toFixed(3)}
                        </td>
                        <td className="p-3 text-center font-mono text-[10px] text-text-muted">
                          [{loc.ic95_bootstrap[0].toFixed(3)} – {loc.ic95_bootstrap[1].toFixed(3)}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
      {/* SUB-VISTA 6: ECONOMETRÍA COMPARADA & MALMQUIST LP                     */}
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
