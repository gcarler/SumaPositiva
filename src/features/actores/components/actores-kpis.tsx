"use client";

import { useEffect } from "react";
import { Users, Star, HeartHandshake, CheckCircle2, FileText } from "lucide-react";
import { useActoresMetricas, useActoresStore } from "../state/actores-store";

export function ActoresKpis() {
  const cargarKpis = useActoresStore((s) => s.cargarKpis);

  useEffect(() => {
    void cargarKpis();
  }, [cargarKpis]);

  const {
    total,
    aliadosClave,
    baseSocial,
    porcentajePromotores,
    propuestasTotales,
  } = useActoresMetricas();

  const tarjetas = [
    {
      titulo: "Actores Caracterizados",
      valor: total,
      subtexto: "Mapeo multiactoral distrital",
      icono: Users,
      variante: "info" as const,
    },
    {
      titulo: "Aliados Clave",
      valor: aliadosClave,
      subtexto: "Alto Poder / Alto Interés",
      icono: Star,
      variante: "ember" as const,
    },
    {
      titulo: "Base Social",
      valor: baseSocial,
      subtexto: "Comunidades y veedurías",
      icono: HeartHandshake,
      variante: "success" as const,
    },
    {
      titulo: "Postura Favorable",
      valor: `${porcentajePromotores}%`,
      subtexto: "Actores promotores y aliados",
      icono: CheckCircle2,
      variante: "success" as const,
    },
    {
      titulo: "Propuestas Radicadas",
      valor: propuestasTotales,
      subtexto: "Aportes en mesas de trabajo",
      icono: FileText,
      variante: "info" as const,
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
                    : t.variante === "ember"
                    ? "bg-ember-soft text-ember"
                    : "bg-info-soft text-info"
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
