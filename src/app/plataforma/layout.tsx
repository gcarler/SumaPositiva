"use client";
import type { ReactNode } from "react";
import { PlataformaShell } from "@/features/plataforma/components/plataforma-shell";
export default function PlataformaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PlataformaShell>{children}</PlataformaShell>;
}
