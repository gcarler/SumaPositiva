"use client";

import type { ReactNode } from "react";
import { Progress } from "@/shared/ui/progress";
import { VenetianMask } from "lucide-react";

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

/** Progreso compacto para las fases de una política. */
export function HairlineProgress({ value }: { value: number }) {
  return <Progress className="h-1" value={Math.min(100, Math.max(0, value))} aria-label="Progreso de la fase" />;
}
