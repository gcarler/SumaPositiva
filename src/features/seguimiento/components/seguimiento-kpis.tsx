"use client";

import { CheckSquare, Activity, AlertTriangle, Percent } from "lucide-react";
import type { KpisSeguimiento } from "../models/compromiso";

interface SeguimientoKpisProps {
  kpis: KpisSeguimiento;
}

export function formatCopMilesMillones(cop: number): string {
  if (!cop || cop === 0) return "$0";
  const milesMillones = cop / 1000000000;
  return `$ ${milesMillones.toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MM COP`;
}

export function SeguimientoKpis({ kpis }: SeguimientoKpisProps) {
  const tarjetas = [
    {
      titulo: "Total Compromisos PAS",
      valor: kpis.totalCompromisos,
      subtexto:
        kpis.presupuestoTotalAnualCop > 0
          ? `Presupuesto anual: ${formatCopMilesMillones(kpis.presupuestoTotalAnualCop)}`
          : "Sin presupuesto oficial reportado",
      icono: CheckSquare,
      estiloIcono: "text-accent bg-accent-soft",
    },
    {
      titulo: "En Ejecución / Cumplidos",
      valor: `${kpis.compromisosEnEjecucionOCumplidos} / ${kpis.totalCompromisos}`,
      subtexto: `${kpis.compromisosConReporte} de ${kpis.totalCompromisos} con reporte oficial`,
      icono: Activity,
      estiloIcono: "text-success bg-success-soft",
    },
    {
      titulo: "En Riesgo o Retrasados",
      valor: kpis.compromisosEnRiesgoORetrasados,
      subtexto:
        kpis.compromisosEnRiesgoORetrasados > 0
          ? "Requieren ajuste o alerta temprana"
          : "Sin rezago crítico detectado",
      icono: AlertTriangle,
      estiloIcono:
        kpis.compromisosEnRiesgoORetrasados > 0
          ? "text-danger bg-danger-soft"
          : "text-text-muted bg-surface-2",
    },
    {
      titulo: "Cumplimiento Cuatrienal",
      valor:
        kpis.promedioCumplimientoCuatrienal !== null
          ? `${kpis.promedioCumplimientoCuatrienal}%`
          : "Sin reporte",
      subtexto:
        kpis.promedioCumplimientoCuatrienal !== null
          ? "Promedio de compromisos con reporte"
          : `${kpis.compromisosConReporte} de ${kpis.totalCompromisos} con reporte`,
      icono: Percent,
      estiloIcono: "text-ember bg-ember-soft",
      mostrarProgreso: kpis.promedioCumplimientoCuatrienal !== null,
      progreso: kpis.promedioCumplimientoCuatrienal,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tarjetas.map((t) => {
        const Icono = t.icono;
        return (
          <div
            key={t.titulo}
            className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 transition-colors hover:border-border-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-text-muted">
                {t.titulo}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.estiloIcono}`}
                aria-hidden="true"
              >
                <Icono className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-text-primary">
                {t.valor}
              </div>
              {t.mostrarProgreso && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-ember transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, t.progreso ?? 0))}%` }}
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-text-muted">{t.subtexto}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
