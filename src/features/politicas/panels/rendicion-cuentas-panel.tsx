"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
  Layers,
  FileCheck2,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  DEPENDENCIAS_CARTAGENA_2026,
  AVANCE_PROMEDIO_PDD_2026,
  FECHA_CORTE_AUDITORIA,
} from "../data/entidades-cartagena.data";
import {
  obtenerMatrizPlanAccionApi,
  ACTIVIDADES_PA_CANONICAS,
  type ActividadPlanAccion,
} from "@/features/seguimiento/services/plan-accion-dnp-api";
import { TriadaMotoresTab } from "@/features/seguimiento/components/triada-motores-tab";

function formatearCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function capitalizarVerbo(verbo: string): string {
  if (!verbo) return "Gestionar";
  return verbo.charAt(0).toUpperCase() + verbo.slice(1).toLowerCase();
}

export function RendicionCuentasPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props?: {
    dependenciaId?: string;
    vistaInicial?: "dependencias" | "plan_accion_dnp" | "triada_motores";
  };
}) {
  const { closeTop, closeToKey } = usePanels();
  const [vistaActiva, setVistaActiva] = useState<"dependencias" | "plan_accion_dnp" | "triada_motores">(
    props?.vistaInicial ?? "dependencias"
  );

  // Estado vista 1: 27 Dependencias Distritales
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas");
  const [semaforoFiltro, setSemaforoFiltro] = useState<"todos" | "verde" | "amarillo" | "rojo">("todos");
  const [dependenciaExpandidaId, setDependenciaExpandidaId] = useState<string | null>(
    props?.dependenciaId ?? null
  );

  // Estado vista 2: Matriz Plan de Acción DNP 2026 (Ley 1474)
  const [actividadesPA, setActividadesPA] = useState<ActividadPlanAccion[]>(ACTIVIDADES_PA_CANONICAS);
  const [filtroLinea, setFiltroLinea] = useState<string>("todas");
  const [busquedaPA, setBusquedaPA] = useState<string>("");

  useEffect(() => {
    let montado = true;
    obtenerMatrizPlanAccionApi({ vigencia: 2026 })
      .then((res) => {
        if (montado && res?.hoja_1_plan_accion && res.hoja_1_plan_accion.length > 0) {
          setActividadesPA(res.hoja_1_plan_accion);
        }
      })
      .catch((err) => {
        console.warn("Fallo al sincronizar actividades del Plan de Acción DNP:", err);
      });
    return () => {
      montado = false;
    };
  }, []);

  const dependenciasFiltradas = useMemo(() => {
    return DEPENDENCIAS_CARTAGENA_2026.filter((dep) => {
      // Filtro tipo
      if (tipoFiltro !== "todas") {
        if (tipoFiltro === "secretaria" && dep.tipo !== "secretaria") return false;
        if (tipoFiltro === "ente_descentralizado" && !["ente_descentralizado", "empresa_industrial", "institucion_educativa"].includes(dep.tipo)) return false;
        if (tipoFiltro === "unidad_asesora" && dep.tipo !== "unidad_asesora") return false;
        if (tipoFiltro === "alcaldia_local" && dep.tipo !== "alcaldia_local") return false;
      }

      // Filtro semáforo
      const av = dep.avancePlanAccion2026 ?? 38.8;
      if (semaforoFiltro === "verde" && av < 40) return false;
      if (semaforoFiltro === "amarillo" && (av < 25 || av >= 40)) return false;
      if (semaforoFiltro === "rojo" && av >= 25) return false;

      // Filtro búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincide =
          dep.nombre.toLowerCase().includes(q) ||
          (dep.sigla?.toLowerCase() ?? "").includes(q) ||
          dep.codigo.toLowerCase().includes(q) ||
          dep.competenciaSeguridadHumana.toLowerCase().includes(q);
        if (!coincide) return false;
      }

      return true;
    });
  }, [tipoFiltro, semaforoFiltro, busqueda]);

  // Métricas Dependencias
  const conteoVerde = DEPENDENCIAS_CARTAGENA_2026.filter((d) => (d.avancePlanAccion2026 ?? 38.8) >= 40).length;
  const conteoAmarillo = DEPENDENCIAS_CARTAGENA_2026.filter((d) => (d.avancePlanAccion2026 ?? 38.8) >= 25 && (d.avancePlanAccion2026 ?? 38.8) < 40).length;
  const conteoRojo = DEPENDENCIAS_CARTAGENA_2026.filter((d) => (d.avancePlanAccion2026 ?? 38.8) < 25).length;

  // Métricas Plan de Acción DNP
  const totalActividades = actividadesPA.length;
  const verbosFuertesValidadosCount = useMemo(() => {
    return actividadesPA.filter((a) => {
      const v = (a.verbo_infinitivo || a.descripcion_actividad.trim().split(/\s+/)[0] || "").toLowerCase();
      return v.endsWith("ar") || v.endsWith("er") || v.endsWith("ir");
    }).length;
  }, [actividadesPA]);
  const porcentajeVerbosFuertes = totalActividades > 0 ? Math.round((verbosFuertesValidadosCount / totalActividades) * 100) : 100;

  const totalProgramadoCop = useMemo(() => {
    return actividadesPA.reduce((acc, a) => acc + (a.monto_programado_cop || 0), 0);
  }, [actividadesPA]);

  const recursosPropiosCop = useMemo(() => {
    return actividadesPA
      .filter((a) => a.fuente_financiacion === "RECURSOS_PROPIOS" || a.categoria_recursos === "FUNCIONAMIENTO")
      .reduce((acc, a) => acc + (a.monto_programado_cop || 0), 0);
  }, [actividadesPA]);

  const fuentesExternasCop = useMemo(() => {
    return Math.max(0, totalProgramadoCop - recursosPropiosCop);
  }, [totalProgramadoCop, recursosPropiosCop]);

  const avanceFisicoPromedio = useMemo(() => {
    if (totalActividades === 0) return 0;
    const suma = actividadesPA.reduce((acc, a) => acc + (a.porcentaje_avance_fisico || 0), 0);
    return Number((suma / totalActividades).toFixed(1));
  }, [actividadesPA, totalActividades]);

  // Filtrado Plan de Acción DNP
  const actividadesFiltradas = useMemo(() => {
    return actividadesPA.filter((act, idx) => {
      if (filtroLinea !== "todas" && act.linea_estrategica_codigo !== filtroLinea) {
        return false;
      }
      if (busquedaPA.trim()) {
        const q = busquedaPA.toLowerCase().trim();
        const codigoSecuencial = `pa-2026-${String(idx + 1).padStart(3, "0")}`;
        const coincide =
          act.codigo.toLowerCase().includes(q) ||
          codigoSecuencial.includes(q) ||
          act.descripcion_actividad.toLowerCase().includes(q) ||
          (act.verbo_infinitivo && act.verbo_infinitivo.toLowerCase().includes(q)) ||
          act.entidad_responsable.toLowerCase().includes(q) ||
          act.codigo_bpim.toLowerCase().includes(q) ||
          act.proyecto_nombre.toLowerCase().includes(q);
        if (!coincide) return false;
      }
      return true;
    });
  }, [actividadesPA, filtroLinea, busquedaPA]);

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Inicio" }, { label: "Rendición de Cuentas 2026" }]}
      title="Rendición de Cuentas y Cumplimiento 2026"
      kicker="Plan de Desarrollo 'Cartagena Ciudad de Derechos'"
      subtitle={
        vistaActiva === "dependencias"
          ? `Informe Oficial de Avance a corte ${FECHA_CORTE_AUDITORIA} — 27 Dependencias Oficiales`
          : vistaActiva === "plan_accion_dnp"
          ? "Matriz de Actividades DNP / SisPT 2026 — Publicación Oficial Ley 1474 Art. 74"
          : "Triada de Motores Articulados: Plan de Desarrollo · Plan de Acción Multiformato (2016–2026) · Inversión y Transparencia 4.1–4.4"
      }
      onClose={closeTop}
      onCloseToKey={closeToKey}
    >
      <div className="space-y-6 p-4 sm:p-6 min-w-0">
        {/* Selector de Vista: Dependencias vs Matriz Plan de Acción DNP vs Triada de Motores */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setVistaActiva("dependencias")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              vistaActiva === "dependencias"
                ? "bg-surface-3 text-text-primary border border-border shadow-xs"
                : "bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
            }`}
          >
            27 Dependencias Distritales
          </Button>

          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            data-testid="tab-publico-plan-accion-dnp"
            onClick={() => setVistaActiva("plan_accion_dnp")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              vistaActiva === "plan_accion_dnp"
                ? "bg-ember-soft text-ember border border-ember/30 shadow-xs"
                : "bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
            }`}
          >
            Matriz Plan de Acción DNP 2026 (Ley 1474)
          </Button>

          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            data-testid="tab-publico-triada-motores"
            onClick={() => setVistaActiva("triada_motores")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              vistaActiva === "triada_motores"
                ? "bg-ember-soft text-ember border border-ember/30 shadow-xs"
                : "bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
            }`}
          >
            Triada de Motores (PDD · PA · Inversión)
          </Button>
        </div>

        {/* VISTA 1: 27 DEPENDENCIAS DISTRITALES */}
        {vistaActiva === "dependencias" && (
          <>
            {/* Banner Oficial Auditado */}
            <div className="rounded-2xl border border-border bg-surface-2 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ember">
                    Seguimiento Institucional Formal
                  </p>
                  <h3 className="text-lg font-bold text-text-primary">
                    Plan de Acción Distrital 2026
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-ember tabular">
                    {`${AVANCE_PROMEDIO_PDD_2026}%`}
                  </span>
                  <p className="text-[11px] text-text-secondary">Avance Promedio Distrital</p>
                </div>
              </div>

              {/* Barra Global de Avance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Ejecución del Plan a corte {FECHA_CORTE_AUDITORIA}</span>
                  <span className="font-semibold text-text-primary">Meta Anual: 50.0% semestral</span>
                </div>
                <div className="h-3 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-ember transition-all"
                    style={{ width: `${AVANCE_PROMEDIO_PDD_2026}%` }}
                  />
                </div>
              </div>

              {/* Métrica de Semáforo */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => setSemaforoFiltro(semaforoFiltro === "verde" ? "todos" : "verde")}
                  className={`rounded-xl p-2.5 text-center transition-all ${
                    semaforoFiltro === "verde" ? "bg-surface-3 ring-2 ring-success" : "bg-surface-1"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-success font-bold text-sm">
                    <CheckCircle2 className="size-4" />
                    <span>{conteoVerde}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">En meta (&gt;=40%)</p>
                </Button>

                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => setSemaforoFiltro(semaforoFiltro === "amarillo" ? "todos" : "amarillo")}
                  className={`rounded-xl p-2.5 text-center transition-all ${
                    semaforoFiltro === "amarillo" ? "bg-surface-3 ring-2 ring-warning" : "bg-surface-1"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-warning font-bold text-sm">
                    <AlertTriangle className="size-4" />
                    <span>{conteoAmarillo}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">En curso (25–39%)</p>
                </Button>

                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => setSemaforoFiltro(semaforoFiltro === "rojo" ? "todos" : "rojo")}
                  className={`rounded-xl p-2.5 text-center transition-all ${
                    semaforoFiltro === "rojo" ? "bg-surface-3 ring-2 ring-destructive" : "bg-surface-1"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-destructive font-bold text-sm">
                    <AlertCircle className="size-4" />
                    <span>{conteoRojo}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">En alerta (&lt;25%)</p>
                </Button>
              </div>
            </div>

            {/* Buscador y Filtros */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
                <Input
                  type="text"
                  placeholder="Buscar por secretaría, sigla o competencia..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "todas", label: "Todas" },
                  { id: "secretaria", label: "Secretarías" },
                  { id: "ente_descentralizado", label: "Descentralizados" },
                  { id: "unidad_asesora", label: "Unidades Asesoras" },
                  { id: "alcaldia_local", label: "Alcaldías Locales" },
                ].map((f) => (
                  <Button
                    key={f.id}
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => setTipoFiltro(f.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      tipoFiltro === f.id
                        ? "bg-ember text-text-inverse"
                        : "bg-surface-2 text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Mosaico de las 27 Dependencias */}
            <div className="space-y-3">
              {dependenciasFiltradas.map((dep) => {
                const av = dep.avancePlanAccion2026 ?? 38.8;
                const esVerde = av >= 40;
                const esAmarillo = av >= 25 && av < 40;
                const colorClase = esVerde ? "text-success" : esAmarillo ? "text-warning" : "text-destructive";
                const bgBarraClase = esVerde ? "bg-success" : esAmarillo ? "bg-warning" : "bg-destructive";
                const expandido = dependenciaExpandidaId === dep.id;

                return (
                  <div
                    key={dep.id}
                    className={`rounded-2xl border transition-all ${
                      expandido
                        ? "border-ember bg-surface-2 shadow-md"
                        : "border-border bg-surface-1 hover:border-border-hover"
                    }`}
                  >
                    {/* Cabecera de la tarjeta */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setDependenciaExpandidaId(expandido ? null : dep.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-ember">
                              {dep.sigla ?? dep.codigo}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-tertiary border border-border uppercase">
                              {dep.tipo.replace("_", " ")}
                            </span>
                          </div>
                          <h4 className="mt-1 text-sm font-semibold text-text-primary">
                            {dep.nombre}
                          </h4>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className={`size-2 rounded-full ${bgBarraClase}`} />
                            <span className={`text-base font-extrabold tabular ${colorClase}`}>
                              {av}%
                            </span>
                          </div>
                          <span className="text-[10px] text-text-tertiary">Avance auditado</span>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-3 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${bgBarraClase}`}
                          style={{ width: `${av}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                        {dep.misionPlanAccion2026 ?? dep.competenciaSeguridadHumana}
                      </p>
                    </div>

                    {/* Detalle Desplegable */}
                    {expandido && (
                      <div className="px-4 pb-4 pt-2 border-t border-border space-y-4 text-xs">
                        {/* Metas Priorizadas */}
                        {dep.metasPriorizadas && dep.metasPriorizadas.length > 0 && (
                          <div>
                            <p className="font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-2">
                              Metas Cuatrienales Priorizadas (2024–2027):
                            </p>
                            <ul className="space-y-1.5 text-text-secondary">
                              {dep.metasPriorizadas.map((m, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Presupuesto y Fuentes */}
                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-1 p-3 border border-border">
                          <div>
                            <span className="text-[10px] uppercase text-text-tertiary block">
                              Presupuesto 2026
                            </span>
                            <span className="font-bold text-text-primary text-sm">
                              {dep.presupuesto2026Cop ?? "$25.000 Millones"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-text-tertiary block">
                              Fuentes Asignadas
                            </span>
                            <span className="text-text-secondary font-medium">
                              {dep.fuentesFinanciacion?.join(", ") ?? "ICLD, SGP"}
                            </span>
                          </div>
                        </div>

                        {/* Canales Oficiales */}
                        {dep.canalAtencion && (
                          <div className="space-y-1.5 pt-2 border-t border-border text-text-secondary">
                            <p className="font-semibold text-text-primary text-[11px]">
                              Canal Oficial de Atención Ciudadana:
                            </p>
                            <div className="flex items-center gap-2">
                              <MapPin className="size-3.5 text-ember shrink-0" />
                              <span>{dep.canalAtencion.direccion}</span>
                            </div>
                            {dep.canalAtencion.web && (
                              <div className="flex items-center gap-2">
                                <Globe className="size-3.5 text-ember shrink-0" />
                                <a
                                  href={dep.canalAtencion.web}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline text-text-primary flex items-center gap-1"
                                >
                                  <span>{dep.canalAtencion.web}</span>
                                  <ExternalLink className="size-3" aria-hidden="true" />
                                </a>
                              </div>
                            )}
                            <div className="text-[11px] text-text-tertiary pl-5.5">
                              {dep.canalAtencion.canalVirtual}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {dependenciasFiltradas.length === 0 && (
                <div className="rounded-2xl border border-border bg-surface-2 p-8 text-center">
                  <p className="text-sm text-text-secondary">
                    No se encontraron dependencias que coincidan con los filtros aplicados.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* VISTA 2: MATRIZ PLAN DE ACCIÓN DNP 2026 (LEY 1474) */}
        {vistaActiva === "plan_accion_dnp" && (
          <div className="space-y-6">
            {/* Tarjeta de Certificación Legal de Transparencia */}
            <div className="rounded-2xl border border-ember/30 bg-surface-2 p-5 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="size-6 text-ember shrink-0" />
                  <div>
                    <span className="inline-block rounded-md bg-ember-soft px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ember border border-ember/30">
                      PUBLICADO EL 31 DE ENERO DE 2026 — ESTATUTO ANTICORRUPCIÓN (LEY 1474 ART. 74)
                    </span>
                    <p className="text-xs text-text-secondary mt-1">
                      Certificación de Transparencia • Articulado al Art. 41 de la Ley 152 de 1994 y lineamientos DNP / SisPT
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-success/30 text-success bg-success-soft text-xs font-semibold">
                    Aprobado en Consejo de Gobierno
                  </Badge>
                </div>
              </div>

              {/* KPIs Resumidos de las 12 Actividades */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-text-secondary block">
                    Total Actividades Programadas
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-text-primary tabular">
                      {totalActividades}
                    </span>
                    <span className="text-[11px] text-text-tertiary">canónicas</span>
                  </div>
                  <p className="text-[10px] text-text-tertiary">Hoja 1 Plan_Accion</p>
                </div>

                <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-text-secondary block">
                    Verbos Fuertes Validados DNP
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-success tabular">
                      {`${porcentajeVerbosFuertes}%`}
                    </span>
                    <span className="text-[11px] text-text-tertiary">infinitivo</span>
                  </div>
                  <p className="text-[10px] text-text-tertiary">Regla de oro DNP (-ar/-er/-ir)</p>
                </div>

                <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-text-secondary block">
                    Inversión Total Programada 2026
                  </span>
                  <div className="text-sm sm:text-base font-extrabold text-ember tabular">
                    {formatearCOP(totalProgramadoCop)}
                  </div>
                  <div className="text-[10px] text-text-secondary space-y-0.5 pt-0.5">
                    <p>Recursos Propios POAI: <strong className="text-text-primary">{formatearCOP(recursosPropiosCop)}</strong></p>
                    <p>Fuentes Externas (SGR/PGN/Coop): <strong className="text-text-primary">{formatearCOP(fuentesExternasCop)}</strong></p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-text-secondary block">
                    Avance Físico Promedio Pond.
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-ember tabular">
                      {`${avanceFisicoPromedio}%`}
                    </span>
                    <span className="text-[11px] text-text-tertiary">a corte</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-ember transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, avanceFisicoPromedio))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buscador y Filtro por Línea Estratégica */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
                <Input
                  type="text"
                  placeholder="Buscar por actividad, verbo fuerte, dependencia, BPIM o código PA..."
                  value={busquedaPA}
                  onChange={(e) => setBusquedaPA(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-text-tertiary mr-1">Línea Estratégica:</span>
                {[
                  { id: "todas", label: "Todas" },
                  { id: "LE-01", label: "LE-01" },
                  { id: "LE-02", label: "LE-02" },
                  { id: "LE-03", label: "LE-03" },
                  { id: "LE-04", label: "LE-04" },
                  { id: "LE-05", label: "LE-05" },
                  { id: "LE-06", label: "LE-06" },
                  { id: "LE-07", label: "LE-07" },
                  { id: "LE-08", label: "LE-08" },
                ].map((f) => {
                  const esActivo = filtroLinea === f.id;
                  return (
                    <Button
                      key={f.id}
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      onClick={() => setFiltroLinea(f.id)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        esActivo
                          ? "bg-ember text-text-inverse"
                          : "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3"
                      }`}
                    >
                      {f.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Listado de Tarjetas para Control Social Ciudadano */}
            <div className="space-y-4">
              {actividadesFiltradas.map((act) => {
                const indexGlobal = actividadesPA.findIndex((a) => a.id === act.id);
                const codigoSecuencial = `PA-2026-${String(indexGlobal >= 0 ? indexGlobal + 1 : 1).padStart(3, "0")}`;
                const verbo = capitalizarVerbo(act.verbo_infinitivo || act.descripcion_actividad.trim().split(/\s+/)[0] || "");
                const tipoMetaEtiqueta =
                  act.tipo_meta === "META_PRODUCTO"
                    ? "PRODUCTO"
                    : act.tipo_meta === "META_GESTION"
                    ? "GESTIÓN"
                    : "ACTIVIDAD";
                const porcentajeFinanciero =
                  act.monto_programado_cop > 0
                    ? Number(((act.monto_ejecutado_cop / act.monto_programado_cop) * 100).toFixed(1))
                    : 0;

                return (
                  <div
                    key={act.id}
                    data-testid={`card-actividad-${act.codigo}`}
                    className="rounded-2xl border border-border bg-surface-1 hover:border-border-hover transition-all p-4 sm:p-5 space-y-3.5"
                  >
                    {/* Fila Superior: Códigos, Badges y Verbo Fuerte */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-ember">
                          {act.codigo}
                        </span>
                        <span className="text-[11px] font-mono text-text-tertiary">
                          {`(${codigoSecuencial})`}
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                          {`BPIM: ${act.codigo_bpim}`}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {tipoMetaEtiqueta}
                        </Badge>
                      </div>

                      <div>
                        <Badge variant="ember" className="text-[11px] font-bold">
                          {`Verbo DNP: ${verbo}`}
                        </Badge>
                      </div>
                    </div>

                    {/* Descripción Principal de la Actividad */}
                    <div>
                      <p className="text-sm font-semibold text-text-primary leading-relaxed">
                        {act.descripcion_actividad}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <span className="font-medium text-text-primary">{act.entidad_responsable}</span>
                        {act.lider_responsable && (
                          <>
                            <span className="text-text-tertiary">•</span>
                            <span className="text-text-tertiary">Líder: {act.lider_responsable}</span>
                          </>
                        )}
                        <span className="text-text-tertiary">•</span>
                        <span className="text-text-tertiary">Línea: {act.linea_estrategica_codigo}</span>
                      </div>
                    </div>

                    {/* Cruce Heredado de Hoja 2 Plan Indicativo */}
                    <div className="rounded-xl border border-border/60 bg-surface-2/60 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-text-tertiary font-semibold text-[10px] uppercase tracking-wider">
                        <Layers className="size-3 text-ember" />
                        <span>Articulación Hoja 2 Plan Indicativo PDD</span>
                      </div>
                      <div className="space-y-1 text-text-secondary">
                        <p>
                          <strong className="text-text-primary">Columna D (Programa):</strong>{" "}
                          {act.programa_nombre}
                        </p>
                        <p>
                          <strong className="text-text-primary">Columna E (Meta de Producto):</strong>{" "}
                          {act.meta_producto_vigencia}
                        </p>
                        <p className="text-[11px] text-text-tertiary">
                          Compromiso PAS Vinculado: <span className="font-mono font-bold text-text-secondary">{act.compromiso_pas_codigo}</span>
                        </p>
                      </div>
                    </div>

                    {/* Cuadrícula de Seguimiento Trimestral */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                      <div className="rounded-lg border border-border bg-surface-2 p-2">
                        <span className="text-[10px] text-text-tertiary uppercase block">T1</span>
                        <span className="text-xs font-bold text-text-primary tabular">{`${act.avance_t1}%`}</span>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-2 p-2">
                        <span className="text-[10px] text-text-tertiary uppercase block">T2</span>
                        <span className="text-xs font-bold text-text-primary tabular">{`${act.avance_t2}%`}</span>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-2 p-2">
                        <span className="text-[10px] text-text-tertiary uppercase block">T3</span>
                        <span className="text-xs font-bold text-text-primary tabular">{`${act.avance_t3}%`}</span>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-2 p-2">
                        <span className="text-[10px] text-text-tertiary uppercase block">T4</span>
                        <span className="text-xs font-bold text-text-primary tabular">{`${act.avance_t4}%`}</span>
                      </div>
                    </div>

                    {/* Avance Físico y Ejecución Financiera */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border text-xs">
                      <div>
                        <div className="flex items-center justify-between text-text-secondary mb-1">
                          <span>Avance Físico:</span>
                          <span className="font-extrabold text-ember tabular">
                            {`${act.porcentaje_avance_fisico}%`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-ember transition-all"
                            style={{ width: `${act.porcentaje_avance_fisico}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5 text-[11px] text-text-secondary">
                        <div className="flex justify-between">
                          <span>Inversión Programada:</span>
                          <span className="font-bold text-text-primary">{formatearCOP(act.monto_programado_cop)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{`Ejecutado (${porcentajeFinanciero}%):`}</span>
                          <span className="font-bold text-success">{formatearCOP(act.monto_ejecutado_cop)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-text-tertiary pt-0.5">
                          <span>Fuente: {act.fuente_financiacion}</span>
                          <span>Cat: {act.categoria_recursos}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {actividadesFiltradas.length === 0 && (
                <div className="rounded-2xl border border-border bg-surface-2 p-8 text-center space-y-2">
                  <FileCheck2 className="size-8 text-text-tertiary mx-auto" />
                  <p className="text-sm font-semibold text-text-primary">
                    No se encontraron actividades con los filtros aplicados.
                  </p>
                  <p className="text-xs text-text-secondary">
                    Prueba modificando el texto de búsqueda o seleccionando "Todas" las líneas estratégicas.
                  </p>
                </div>
              )}
            </div>

            {/* Pie: Enlace hacia el Workbench Técnico de Seguimiento */}
            <div className="rounded-xl border border-border bg-surface-2 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-text-primary">
                  Auditoría Técnica y Gestión DNP / SisPT
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Acceso para enlaces sectoriales, formuladores de planeación y control social avanzado.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                <Link href="/plataforma/seguimiento">
                  <span>Abrir Workbench Técnico DNP / SisPT en Plataforma</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* VISTA 3: TRIADA DE MOTORES (PDD · PLAN DE ACCIÓN MULTIFORMATO · INVERSIÓN) */}
        {vistaActiva === "triada_motores" && (
          <TriadaMotoresTab puedeEditar={false} />
        )}
      </div>
    </PanelShell>
  );
}
