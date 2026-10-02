"use client";

import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  DEPENDENCIAS_CARTAGENA_2026,
  AVANCE_PROMEDIO_PDD_2026,
  FECHA_CORTE_AUDITORIA,
} from "../data/entidades-cartagena.data";

export function RendicionCuentasPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props?: { dependenciaId?: string };
}) {
  const { closeTop, closeToKey } = usePanels();
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas");
  const [semaforoFiltro, setSemaforoFiltro] = useState<"todos" | "verde" | "amarillo" | "rojo">("todos");
  const [dependenciaExpandidaId, setDependenciaExpandidaId] = useState<string | null>(
    props?.dependenciaId ?? null
  );

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

  // Métricas
  const conteoVerde = DEPENDENCIAS_CARTAGENA_2026.filter((d) => (d.avancePlanAccion2026 ?? 38.8) >= 40).length;
  const conteoAmarillo = DEPENDENCIAS_CARTAGENA_2026.filter((d) => (d.avancePlanAccion2026 ?? 38.8) >= 25 && (d.avancePlanAccion2026 ?? 38.8) < 40).length;
  const conteoRojo = DEPENDENCIAS_CARTAGENA_2026.filter((d) => (d.avancePlanAccion2026 ?? 38.8) < 25).length;

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Inicio" }, { label: "Rendición de Cuentas 2026" }]}
      title="Rendición de Cuentas y Cumplimiento 2026"
      kicker="Plan de Desarrollo 'Cartagena Ciudad de Derechos'"
      subtitle={`Informe Oficial de Avance a corte ${FECHA_CORTE_AUDITORIA} — 27 Dependencias Oficiales`}
      onClose={closeTop}
      onCloseToKey={closeToKey}
    >
      <div className="space-y-6 p-4 sm:p-6 min-w-0">
        {/* Banner Oficial Auditado */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ember)]">
                Seguimiento Institucional Formal
              </p>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Plan de Acción Distrital 2026
              </h3>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-[var(--ember)] tabular">
                {AVANCE_PROMEDIO_PDD_2026}%
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">Avance Promedio Distrital</p>
            </div>
          </div>

          {/* Barra Global de Avance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Ejecución del Plan a corte {FECHA_CORTE_AUDITORIA}</span>
              <span className="font-semibold text-[var(--text-primary)]">Meta Anual: 50.0% semestral</span>
            </div>
            <div className="h-3 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--ember)] transition-all"
                style={{ width: `${AVANCE_PROMEDIO_PDD_2026}%` }}
              />
            </div>
          </div>

          {/* Métrica de Semáforo */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setSemaforoFiltro(semaforoFiltro === "verde" ? "todos" : "verde")}
              className={`rounded-xl p-2.5 text-center transition-all ${
                semaforoFiltro === "verde" ? "bg-[var(--surface-3)] ring-2 ring-[var(--success)]" : "bg-[var(--surface-1)]"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--success)] font-bold text-sm">
                <CheckCircle2 className="size-4" />
                <span>{conteoVerde}</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">En meta (&gt;=40%)</p>
            </Button>

            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setSemaforoFiltro(semaforoFiltro === "amarillo" ? "todos" : "amarillo")}
              className={`rounded-xl p-2.5 text-center transition-all ${
                semaforoFiltro === "amarillo" ? "bg-[var(--surface-3)] ring-2 ring-[var(--warning)]" : "bg-[var(--surface-1)]"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--warning)] font-bold text-sm">
                <AlertTriangle className="size-4" />
                <span>{conteoAmarillo}</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">En curso (25–39%)</p>
            </Button>

            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setSemaforoFiltro(semaforoFiltro === "rojo" ? "todos" : "rojo")}
              className={`rounded-xl p-2.5 text-center transition-all ${
                semaforoFiltro === "rojo" ? "bg-[var(--surface-3)] ring-2 ring-[var(--danger)]" : "bg-[var(--surface-1)]"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--danger)] font-bold text-sm">
                <AlertCircle className="size-4" />
                <span>{conteoRojo}</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">En alerta (&lt;25%)</p>
            </Button>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" />
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
                    ? "bg-[var(--ember)] text-[var(--text-inverse)]"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
            const colorSemaforo = esVerde ? "var(--success)" : esAmarillo ? "var(--warning)" : "var(--danger)";
            const expandido = dependenciaExpandidaId === dep.id;

            return (
              <div
                key={dep.id}
                className={`rounded-2xl border transition-all ${
                  expandido
                    ? "border-[var(--ember)] bg-[var(--surface-2)] shadow-md"
                    : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-hover)]"
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
                        <span className="font-bold text-sm text-[var(--ember)]">
                          {dep.sigla ?? dep.codigo}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-tertiary)] border border-[var(--border)] uppercase">
                          {dep.tipo.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {dep.nombre}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="size-2 rounded-full" style={{ backgroundColor: colorSemaforo }} />
                        <span className="text-base font-extrabold tabular" style={{ color: colorSemaforo }}>
                          {av}%
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)]">Avance auditado</span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${av}%`, backgroundColor: colorSemaforo }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-2">
                    {dep.misionPlanAccion2026 ?? dep.competenciaSeguridadHumana}
                  </p>
                </div>

                {/* Detalle Desplegable */}
                {expandido && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-4 text-xs">
                    {/* Metas Priorizadas */}
                    {dep.metasPriorizadas && dep.metasPriorizadas.length > 0 && (
                      <div>
                        <p className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px] mb-2">
                          Metas Cuatrienales Priorizadas (2024–2027):
                        </p>
                        <ul className="space-y-1.5 text-[var(--text-secondary)]">
                          {dep.metasPriorizadas.map((m, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="size-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Presupuesto y Fuentes */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-1)] p-3 border border-[var(--border)]">
                      <div>
                        <span className="text-[10px] uppercase text-[var(--text-tertiary)] block">
                          Presupuesto 2026
                        </span>
                        <span className="font-bold text-[var(--text-primary)] text-sm">
                          {dep.presupuesto2026Cop ?? "$25.000 Millones"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[var(--text-tertiary)] block">
                          Fuentes Asignadas
                        </span>
                        <span className="text-[var(--text-secondary)] font-medium">
                          {dep.fuentesFinanciacion?.join(", ") ?? "ICLD, SGP"}
                        </span>
                      </div>
                    </div>

                    {/* Canales Oficiales */}
                    {dep.canalAtencion && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-[var(--text-secondary)]">
                        <p className="font-semibold text-[var(--text-primary)] text-[11px]">
                          Canal Oficial de Atención Ciudadana:
                        </p>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-[var(--ember)] shrink-0" />
                          <span>{dep.canalAtencion.direccion}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="size-3.5 text-[var(--ember)] shrink-0" />
                          <a href={`mailto:${dep.canalAtencion.email}`} className="hover:underline text-[var(--text-primary)]">
                            {dep.canalAtencion.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5 text-[var(--ember)] shrink-0" />
                          <span>{dep.canalAtencion.telefono}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {dependenciasFiltradas.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                No se encontraron dependencias que coincidan con los filtros aplicados.
              </p>
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
