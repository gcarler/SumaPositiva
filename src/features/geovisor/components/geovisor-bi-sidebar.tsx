"use client";

import { useMemo } from "react";
import {
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Users,
  TrendingUp,
  BarChart3,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  type VariableMapa,
  VARIABLE_META,
  ESTADISTICAS_TERRITORIOS,
  obtenerValorVariable,
  type EstadisticasTerritorio,
} from "../data/estadisticas.data";
import { BARRIOS_CARTAGENA, type Barrio } from "../data/barrios.data";

interface GeovisorBiSidebarProps {
  territorioId: string;
  onSelectTerritorio: (id: string) => void;
  variableMapa: VariableMapa;
  onOpenDetalleDrawer?: (territorioId: string) => void;
}

function Sparkline({ datos }: { datos: number[] }) {
  const max = Math.max(...datos, 1);
  const w = 120;
  const h = 32;
  const pad = 3;
  const pts = datos
    .map((v, i) => {
      const x = pad + (i / (datos.length - 1)) * (w - pad * 2);
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--ember)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GeovisorBiSidebar({
  territorioId,
  onSelectTerritorio,
  variableMapa,
  onOpenDetalleDrawer,
}: GeovisorBiSidebarProps) {
  const meta = VARIABLE_META[variableMapa];

  // Territorio activo (por defecto loc-1 si es 'todas')
  const territorioActivo = useMemo(() => {
    return (
      ESTADISTICAS_TERRITORIOS.find((t) => t.id === territorioId) ??
      ESTADISTICAS_TERRITORIOS[0]
    );
  }, [territorioId]);

  // Territorios macro ordenados por la variable seleccionada
  const territoriosOrdenados = useMemo(() => {
    const macros = ESTADISTICAS_TERRITORIOS.filter((t) =>
      ["loc-1", "loc-2", "loc-3", "rural-insular"].includes(t.id),
    );
    return [...macros].sort(
      (a, b) => obtenerValorVariable(b, variableMapa) - obtenerValorVariable(a, variableMapa),
    );
  }, [variableMapa]);

  const valorMaxMacro = useMemo(() => {
    const vals = territoriosOrdenados.map((t) => obtenerValorVariable(t, variableMapa));
    return Math.max(...vals, 1);
  }, [territoriosOrdenados, variableMapa]);

  // Top 5 barrios del territorio activo
  const topBarrios = useMemo(() => {
    const targetLocId = territorioActivo.id === "rural-insular" ? "loc-1" : territorioActivo.id;
    const barrios = BARRIOS_CARTAGENA.filter((b) => b.localidadId === targetLocId);
    return barrios.slice(0, 5);
  }, [territorioActivo]);

  // Color semántico para ISH
  const ishColor =
    territorioActivo.ish >= 70
      ? "var(--success)"
      : territorioActivo.ish >= 50
        ? "var(--warning)"
        : "var(--danger)";

  const ishNivel =
    territorioActivo.ish >= 70
      ? "Favorable"
      : territorioActivo.ish >= 50
        ? "Moderado"
        : "Crítico";

  return (
    <aside
      className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm overflow-hidden"
      aria-label="Panel analítico de inteligencia territorial"
    >
      {/* Header del Panel */}
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4 bg-[var(--surface-2)]/40">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Analítica Territorial
          </span>
          <h2 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[240px]">
            {territorioActivo.nombre}
          </h2>
        </div>
        {onOpenDetalleDrawer && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDetalleDrawer(territorioActivo.id)}
            className="h-7 gap-1 px-2 text-xs"
            aria-label={`Abrir ficha de diagnóstico para ${territorioActivo.nombre}`}
          >
            <span>Ficha</span>
            <ExternalLink className="size-3" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4 space-y-6">
        {/* ================= 3.1 KPIs DEL TERRITORIO ================= */}
        <section aria-labelledby="kpi-territorio-heading" className="space-y-3">
          <h3 id="kpi-territorio-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Indicadores Clave
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {/* KPI ISH */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>ISH</span>
                <ShieldCheck className="size-3.5 text-[var(--ember)]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold tabular text-[var(--text-primary)]">
                  {territorioActivo.ish}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">/100</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--surface-1)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${territorioActivo.ish}%`, backgroundColor: ishColor }}
                />
              </div>
              <span className="mt-1 block text-[10px] font-medium" style={{ color: ishColor }}>
                {ishNivel}
              </span>
            </div>

            {/* KPI Aportes */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>Aportes</span>
                <MessageSquare className="size-3.5 text-[var(--info)]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold tabular text-[var(--text-primary)]">
                  {territorioActivo.aportesCiudadanos.toLocaleString("es-CO")}
                </span>
              </div>
              <span className="mt-2 block text-[10px] text-[var(--text-tertiary)]">
                Propuestas registradas
              </span>
            </div>

            {/* KPI Alertas */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>Alertas SAT</span>
                <AlertTriangle className="size-3.5 text-[var(--warning)]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold tabular text-[var(--warning)]">
                  {territorioActivo.alertas}
                </span>
              </div>
              <span className="mt-2 block text-[10px] text-[var(--text-tertiary)]">
                {territorioActivo.escnna} ESCNNA
              </span>
            </div>

            {/* KPI Mesas */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>Mesas</span>
                <Users className="size-3.5 text-[var(--success)]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold tabular text-[var(--text-primary)]">
                  {territorioActivo.mesasRealizadas}
                </span>
              </div>
              <span className="mt-2 block text-[10px] text-[var(--text-tertiary)]">
                Actas concertadas
              </span>
            </div>
          </div>
        </section>

        {/* ================= 3.2 COMPARATIVA TERRITORIAL (BARRAS CSS) ================= */}
        <section aria-labelledby="comparativa-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 id="comparativa-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Comparativa por {meta.label}
            </h3>
            <span className="text-[10px] text-[var(--text-tertiary)]">{meta.unidad}</span>
          </div>

          <div className="space-y-2">
            {territoriosOrdenados.map((t) => {
              const val = obtenerValorVariable(t, variableMapa);
              const pct = (val / valorMaxMacro) * 100;
              const activo = territorioActivo.id === t.id;

              return (
                <Button
                  key={t.id}
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => onSelectTerritorio(t.id)}
                  className={`w-full rounded-lg border p-2 text-left transition-all ${
                    activo
                      ? "border-[var(--ember)] bg-[var(--surface-2)]"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]/50"
                  }`}
                  aria-label={`Seleccionar ${t.nombre}: ${val} ${meta.unidad}`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[var(--text-primary)] truncate max-w-[170px]">
                      {t.nombre}
                    </span>
                    <span className="tabular font-bold text-[var(--text-primary)]">
                      {val.toLocaleString("es-CO")}
                    </span>
                  </div>
                  {/* Barra CSS Pura */}
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: activo ? "var(--ember)" : "var(--info)",
                      }}
                    />
                  </div>
                </Button>
              );
            })}
          </div>
        </section>

        {/* ================= 3.3 TENDENCIA TEMPORAL (SPARKLINE SVG) ================= */}
        <section aria-labelledby="tendencia-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 id="tendencia-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Tendencia (Mayo – Octubre 2026)
            </h3>
            <TrendingUp className="size-3.5 text-[var(--ember)]" />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[var(--text-tertiary)]">Aportes mensuales:</span>
                <span className="block text-sm font-bold tabular text-[var(--text-primary)]">
                  {territorioActivo.tendenciaAportes[territorioActivo.tendenciaAportes.length - 1]} en octubre
                </span>
              </div>
              <Sparkline datos={territorioActivo.tendenciaAportes} />
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-[var(--text-tertiary)]">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Ago</span>
              <span>Sep</span>
              <span>Oct</span>
            </div>
          </div>
        </section>

        {/* ================= 3.4 RANKING DE BARRIOS (TOP 5) ================= */}
        <section aria-labelledby="ranking-barrios-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 id="ranking-barrios-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Barrios del Territorio
            </h3>
            <span className="text-[10px] text-[var(--text-tertiary)]">Top 5</span>
          </div>

          <div className="space-y-1.5">
            {topBarrios.map((b, idx) => (
              <div
                key={b.barrio}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-4 shrink-0 rounded-full bg-[var(--surface-1)] text-center text-[10px] font-bold leading-4 text-[var(--text-tertiary)]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block font-semibold truncate text-[var(--text-primary)]">
                      {b.barrio}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {b.ucg ? `UCG ${b.ucg}` : "Sin UCG"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                    {b.estratoNum ? `E${b.estratoNum}` : b.estrato}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollArea>
    </aside>
  );
}
