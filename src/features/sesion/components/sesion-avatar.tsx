"use client";

import type { Sesion } from "@/features/sesion/models/sesion";
import { VenetianMask } from "lucide-react";
import { inicialesDe } from "@/shared/components/participation-ui";

export function SesionAvatar({
  sesion,
  size = "sm",
}: {
  sesion: Sesion | null;
  size?: "sm" | "md";
}) {
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
