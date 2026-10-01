"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MessageSquare, Users } from "lucide-react";
import { usePanels } from "@/core/panels/panel-store";
import {
  ESTADO_META,
  SECTOR_META,
  totalAportes,
  type PoliticaPublica,
} from "@/features/politicas/models/politicas";
import { EstadoPoliticaChip } from "./politica-ui";

/**
 * Tarjeta de Política Pública — entrada al sistema Zero-Modals (abre panel L1).
 */

interface PoliticaCardProps {
  politica: PoliticaPublica;
  index?: number;
}

export function PoliticaCard({ politica, index = 0 }: PoliticaCardProps) {
  const reducedMotion = useReducedMotion();
  const { openPanel } = usePanels();
  const activa = politica.fases.find((f) => f.estado === "activa");
  const aportes = totalAportes(politica);

  return (
    <motion.button
      type="button"
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => openPanel("politica", { politicaId: politica.id })}
      className="ui-interactive-card group relative flex h-full w-full flex-col p-6 text-left"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3">
        <span className="label-micro text-[var(--text-tertiary)]">
          {SECTOR_META[politica.sector].label}
        </span>
        <ArrowUpRight
          className="size-4 text-[var(--text-tertiary)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          strokeWidth={1.5}
        />
      </div>

      {/* Contenido */}
      <h3 className="mt-4 text-base font-semibold leading-snug tracking-tight text-[var(--text-primary)]">
        {politica.titulo}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        {politica.resumen}
      </p>

      {/* Pie */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <EstadoPoliticaChip estado={politica.estado} />
        <div className="flex items-center gap-3.5 text-[11px] text-[var(--text-tertiary)] tabular">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" strokeWidth={1.5} />
            {politica.participantes.toLocaleString("es-CO")}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" strokeWidth={1.5} />
            {aportes}
          </span>
        </div>
      </div>

      {/* Fase activa (si la hay) */}
      {activa && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="size-1 animate-pulse rounded-full bg-[var(--ember)]" aria-hidden />
          <span className="text-[11px] text-[var(--text-secondary)]">
            {ESTADO_META[politica.estado].label === "Consulta pública" ? "Consulta abierta en" : "Participa en"}{" "}
            <span className="font-medium text-[var(--text-primary)]">{activa.nombre}</span>
          </span>
        </div>
      )}
    </motion.button>
  );
}
