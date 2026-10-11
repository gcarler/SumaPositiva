"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";

/**
 * Footer minimalista — siempre pegado al fondo (flex + mt-auto).
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
      <div className="container-fluid flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded bg-[var(--text-primary)]">
            <Landmark className="size-3.5 text-[var(--text-inverse)]" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-primary)]">
              POLIS
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Participación ciudadana en políticas públicas
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Enlaces de pie de página">
          <Link
            href="/barrio"
            className="label-micro text-[var(--ember)] font-semibold transition-colors hover:underline"
          >
            Modo Barrio (Bajo consumo)
          </Link>
          {["Datos abiertos", "Trazabilidad", "Marco legal", "Contacto"].map((l) => (
            <a
              key={l}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="label-micro text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {l}
            </a>
          ))}
        </nav>

        <p className="text-[11px] text-[var(--text-tertiary)] tabular">
          © 2026 — Construido con la ciudadanía
        </p>
      </div>
    </footer>
  );
}
