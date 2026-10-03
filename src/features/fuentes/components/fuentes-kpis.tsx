"use client";

import { useFuentesMetricas } from "../state/fuentes-store";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Percent,
} from "lucide-react";

export function FuentesKpis() {
  const {
    total,
    entregadas,
    enTermino,
    incompletas,
    atencionCritica,
    porcentajeCumplimiento,
  } = useFuentesMetricas();

  const tarjetas = [
    {
      titulo: "Entregadas",
      valor: entregadas,
      subtexto: `${entregadas} de ${total} fuentes radicadas`,
      icono: CheckCircle2,
      variante: "success" as const,
    },
    {
      titulo: "En Término",
      valor: enTermino,
      subtexto: "Dentro del plazo legal de respuesta",
      icono: Clock,
      variante: "info" as const,
    },
    {
      titulo: "Incompletas",
      valor: incompletas,
      subtexto: "Requieren ampliación o geodatos",
      icono: AlertTriangle,
      variante: "warning" as const,
    },
    {
      titulo: "Vencidas / Insistencia",
      valor: atencionCritica,
      subtexto: "Término vencido o reiterado",
      icono: AlertOctagon,
      variante: "danger" as const,
    },
    {
      titulo: "Tasa de Cumplimiento",
      valor: `${porcentajeCumplimiento}%`,
      subtexto: "Meta de rigor pericial: ≥ 80%",
      icono: Percent,
      variante: "ember" as const,
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
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-secondary">
                {t.titulo}
              </span>
              <span
                className={`flex size-7 items-center justify-center rounded-lg ${
                  t.variante === "success"
                    ? "bg-success-soft text-success"
                    : t.variante === "info"
                    ? "bg-info-soft text-info"
                    : t.variante === "warning"
                    ? "bg-warning-soft text-warning"
                    : t.variante === "danger"
                    ? "bg-danger-soft text-danger"
                    : "bg-ember-soft text-ember"
                }`}
              >
                <Icono className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-text-primary">
                {t.valor}
              </div>
              <p className="mt-1 text-xs text-text-tertiary">{t.subtexto}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
