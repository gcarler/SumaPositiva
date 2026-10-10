"use client";

import { BarChart3, Target, TrendingUp, Database } from "lucide-react";
import type { FichaIndicador } from "../models/indicador";

interface DiagnosticoKpisProps {
  indicadores: FichaIndicador[];
}

export function DiagnosticoKpis({ indicadores }: DiagnosticoKpisProps) {
  const total = indicadores.length;
  const resultadoImpacto = indicadores.filter(
    (i) => i.tipo_indicador === "resultado" || i.tipo_indicador === "impacto"
  ).length;

  const conAvance = indicadores.filter((i) => {
    const p = parseFloat(String(i.porcentaje_avance || 0));
    return p > 0;
  }).length;

  const fuentesUnicas = new Set(
    indicadores.map((i) => i.fuente_datos.trim().toLowerCase())
  ).size;

  const tarjetas = [
    {
      titulo: "Línea Base de Diagnóstico",
      valor: total,
      subtexto: "Fichas técnicas oficiales registradas",
      icono: BarChart3,
      variante: "info" as const,
    },
    {
      titulo: "Resultado e Impacto",
      valor: resultadoImpacto,
      subtexto: "Reducción de homicidios, hurtos e inseguridad",
      icono: Target,
      variante: "ember" as const,
    },
    {
      titulo: "Metas con Avance",
      valor: conAvance,
      subtexto: `${total > 0 ? Math.round((conAvance / total) * 100) : 0}% de indicadores con reporte activo`,
      icono: TrendingUp,
      variante: "success" as const,
    },
    {
      titulo: "Fuentes Oficiales",
      valor: fuentesUnicas,
      subtexto: "Medicina Legal, SIEDCO, Sisbén, CCV",
      icono: Database,
      variante: "info" as const,
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
