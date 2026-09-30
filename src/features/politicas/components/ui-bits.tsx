"use client";

import type { ReactNode } from "react";
import { VenetianMask } from "lucide-react";
import {
  ESTADO_FASE_META,
  ESTADO_META,
  FASE_TIPO_META,
  SECTOR_META,
  type EstadoFase,
  type EstadoPolitica,
  type TipoAporte,
  type TipoFase,
} from "@/types/domain";
import type { Sesion } from "@/stores/session-store";

/* ---------- Chips de estado (dot + label, monocromáticos) ---------- */

const ESTADO_POLITICA_DOT: Record<EstadoPolitica, string> = {
  consulta_publica: "bg-[var(--ember)]",
  en_deliberacion: "bg-[var(--info)]",
  en_revision: "bg-[var(--warning)]",
  aprobada: "bg-[var(--success)]",
  implementacion: "bg-[var(--text-primary)]",
};

export function EstadoPoliticaChip({ estado }: { estado: EstadoPolitica }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1">
      <span className={`size-1.5 rounded-full ${ESTADO_POLITICA_DOT[estado]}`} />
      <span className="label-micro text-[var(--text-secondary)]">
        {ESTADO_META[estado].label}
      </span>
    </span>
  );
}

const ESTADO_FASE_DOT: Record<EstadoFase, string> = {
  activa: "bg-[var(--ember)]",
  completada: "bg-[var(--success)]",
  proxima: "bg-[var(--text-tertiary)]",
};

export function EstadoFaseChip({ estado }: { estado: EstadoFase }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-1.5 rounded-full ${ESTADO_FASE_DOT[estado]} ${
          estado === "activa" ? "animate-pulse" : ""
        }`}
      />
      <span className="label-micro text-[var(--text-secondary)]">
        {ESTADO_FASE_META[estado].label}
      </span>
    </span>
  );
}

/* ---------- Etiquetas de sección ---------- */

export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="label-micro text-[var(--text-tertiary)]">{children}</h3>
      {right}
    </div>
  );
}

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

/* ---------- Avatar de iniciales ---------- */

export function inicialesDe(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function InitialAvatar({ name }: { name: string }) {
  const initials = inicialesDe(name);
  return (
    <span
      className="flex size-7 shrink-0 select-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[10px] font-semibold tracking-wide text-[var(--text-secondary)]"
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Avatar de aporte anónimo — máscara veneciana, monocromática */
export function AnonAvatar() {
  return (
    <span
      className="flex size-7 shrink-0 select-none items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-tertiary)]"
      aria-hidden
    >
      <VenetianMask className="size-3.5" strokeWidth={1.5} />
    </span>
  );
}

/** Avatar según la sesión actual (topbar, panel de sesión, editor) */
export function SesionAvatar({ sesion, size = "sm" }: { sesion: Sesion | null; size?: "sm" | "md" }) {
  const dim = size === "md" ? "size-9" : "size-7";
  if (!sesion || sesion.modo === "anonimo" || !sesion.identidad) {
    return (
      <span
        className={`flex ${dim} shrink-0 select-none items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-tertiary)]`}
        aria-hidden
      >
        <VenetianMask className={size === "md" ? "size-4" : "size-3.5"} strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <span
      className={`flex ${dim} shrink-0 select-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--ember-soft)] text-[10px] font-semibold tracking-wide text-[var(--ember)]`}
      aria-hidden
    >
      {inicialesDe(sesion.identidad.nombre)}
    </span>
  );
}

/* ---------- Chip de tipo de aporte ---------- */

export function TipoAporteChip({ tipo }: { tipo: TipoAporte }) {
  const styles: Record<TipoAporte, string> = {
    propuesta:
      "border-[var(--ember)]/30 bg-[var(--ember-soft)] text-[var(--ember)]",
    anotacion:
      "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
    pregunta:
      "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
  };
  const labels: Record<TipoAporte, string> = {
    propuesta: "Propuesta",
    anotacion: "Anotación",
    pregunta: "Pregunta",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${styles[tipo]}`}
    >
      {labels[tipo]}
    </span>
  );
}

/* ---------- Barra de progreso hairline ---------- */

export function HairlineProgress({ value }: { value: number }) {
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[var(--ember)] transition-[width] duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
