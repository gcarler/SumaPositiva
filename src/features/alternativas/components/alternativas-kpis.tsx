"use client";

import { Lightbulb, DollarSign, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import type { KPIsAlternativas } from "../state/alternativas-store";

interface AlternativasKpisProps {
  kpis: KPIsAlternativas;
}

export function formatCopMilesMillones(cop: number): string {
  if (!cop || cop === 0) return "$0";
  const milesMillones = cop / 1000000000;
  return `$ ${milesMillones.toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MM COP`;
}

export function AlternativasKpis({ kpis }: AlternativasKpisProps) {
  const tarjetas = [
    {
      titulo: "Alternativas Formuladas",
      valor: kpis.total,
      subtexto: "Iniciativas en Banco Distrital MGA",
      icono: Lightbulb,
      estiloIcono: "text-accent bg-accent-soft",
    },
    {
      titulo: "Inversión Proyectada",
      valor: formatCopMilesMillones(kpis.inversionTotalCOP),
      subtexto: "Costeo cuatrienal consolidado",
      icono: DollarSign,
      estiloIcono: "text-success bg-success-soft",
    },
    {
      titulo: "Viables o Priorizadas",
      valor: `${kpis.viablesOPriorizadas} / ${kpis.total}`,
      subtexto: `${kpis.total > 0 ? Math.round((kpis.viablesOPriorizadas / kpis.total) * 100) : 0}% con viabilidad técnica`,
      icono: CheckCircle2,
      estiloIcono: "text-ember bg-ember-soft",
    },
    {
      titulo: "Enfoque Étnico Ley 70/93",
      valor: kpis.conEnfoqueEtnico,
      subtexto: "Consulta previa en territorios colectivos",
      icono: ShieldCheck,
      estiloIcono: "text-warning bg-warning-soft",
    },
    {
      titulo: "Horizonte Promedio",
      valor: `${kpis.promedioHorizonte} años`,
      subtexto: "Plazo de ejecución técnica",
      icono: Clock,
      estiloIcono: "text-text-muted bg-surface-2",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <p className="mt-1 text-xs text-text-muted">{t.subtexto}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
