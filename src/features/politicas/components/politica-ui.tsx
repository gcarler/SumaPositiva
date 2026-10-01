"use client";

import {
  ESTADO_FASE_META,
  ESTADO_META,
  FASE_TIPO_META,
  SECTOR_META,
  type EstadoFase,
  type EstadoPolitica,
  type TipoAporte,
  type TipoFase,
} from "@/features/politicas/models/politicas";

import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";

const POLITICA_TONE: Record<EstadoPolitica, StatusTone> = {
  consulta_publica: "ember",
  en_deliberacion: "info",
  en_revision: "warning",
  aprobada: "success",
  implementacion: "neutral",
};
const FASE_TONE: Record<EstadoFase, StatusTone> = {
  activa: "ember",
  completada: "success",
  proxima: "neutral",
};
export function EstadoPoliticaChip({ estado }: { estado: EstadoPolitica }) {
  return (
    <StatusBadge tone={POLITICA_TONE[estado]}>
      {ESTADO_META[estado].label}
    </StatusBadge>
  );
}
export function EstadoFaseChip({ estado }: { estado: EstadoFase }) {
  return (
    <StatusBadge tone={FASE_TONE[estado]}>
      {ESTADO_FASE_META[estado].label}
    </StatusBadge>
  );
}

/* ---------- Etiquetas de sección ---------- */

export function SectorTag({ sector }: { sector: keyof typeof SECTOR_META }) {
  return (
    <span className="label-micro text-[var(--text-tertiary)]">
      {SECTOR_META[sector].label}
    </span>
  );
}

export function FaseTipoTag({ tipo }: { tipo: TipoFase }) {
  return (
    <span className="label-micro rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-secondary)]">
      {FASE_TIPO_META[tipo].label}
    </span>
  );
}

export function TipoAporteChip({ tipo }: { tipo: TipoAporte }) {
  const labels: Record<TipoAporte, string> = {
    propuesta: "Propuesta",
    anotacion: "Anotación",
    pregunta: "Pregunta",
  };
  return (
    <Badge variant={tipo === "propuesta" ? "ember" : "secondary"}>
      {labels[tipo]}
    </Badge>
  );
}
