"use client";

import Link from "next/link";
import { IsotipoPolis } from "@/shared/branding/logo-polis";

/**
 * Footer minimalista — siempre pegado al fondo (flex + mt-auto).
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
      <div className="container-fluid flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            href="/"
            aria-label="Ir a la página principal de POLIS"
            className="group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-lg"
          >
            <div className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1 transition-all duration-200 group-hover:scale-105 group-hover:border-[var(--ember)] shadow-xs">
              <IsotipoPolis className="size-full" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[14px] font-extrabold tracking-tight text-[var(--text-primary)]">
                  POLIS
                </span>
                <span
                  className="hidden text-[11px] font-medium text-[var(--text-tertiary)] sm:inline"
                  aria-hidden="true"
                >
                  •
                </span>
                <span className="hidden text-[12px] font-semibold text-[var(--text-secondary)] sm:inline">
                  Seguridad Humana
                </span>
                <span
                  className="size-1.5 rounded-full bg-[var(--ember)]"
                  aria-hidden="true"
                />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] sm:text-[var(--text-tertiary)]">
                Cartagena 2026–2036
              </span>
            </div>
          </Link>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Participación ciudadana en políticas públicas
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Enlaces de pie de página">
          <Link
            href="/acerca"
            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
          >
            Acerca de POLIS
          </Link>
          <Link
            href="/seguridad-humana"
            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
          >
            ¿Qué es Seguridad Humana?
          </Link>
          <Link
            href="/barrio"
            className="label-micro text-[var(--ember)] font-semibold transition-colors hover:underline"
          >
            Modo Barrio (Bajo consumo)
          </Link>
          <Link
            href="/geovisor"
            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
          >
            Datos abiertos
          </Link>
          <Link
            href="/trazabilidad"
            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
          >
            Trazabilidad
          </Link>
          <Link
            href="/marco-legal"
            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
          >
            Marco legal
          </Link>
          <Link
            href="/contacto"
            className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
          >
            Contacto
          </Link>
        </nav>

        <div className="flex flex-col gap-1 text-[11px] text-[var(--text-tertiary)] tabular">
          <p>
            POLIS es una plataforma de participación ciudadana y gobernanza desarrollada y de propiedad de{" "}
            <a
              href="https://ples.com.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--text-secondary)] underline decoration-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Ples SAS
            </a>
            .
          </p>
          <p>© 2026 — Construido con la ciudadanía</p>
        </div>
      </div>
    </footer>
  );
}
