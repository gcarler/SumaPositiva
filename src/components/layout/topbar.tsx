"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Landmark } from "lucide-react";
import { usePoliticasStore } from "@/stores/politicas-store";
import type { VistaApp } from "@/stores/politicas-store";

/**
 * Topbar minimalista — wordmark, navegación de vistas y toggle de tema.
 */

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Alternar modo claro y oscuro"
      className="flex size-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
    >
      {/* Los iconos se resuelven por CSS: sin hidratación inconsistente */}
      <Sun className="hidden size-4 dark:block" strokeWidth={1.5} />
      <Moon className="block size-4 dark:hidden" strokeWidth={1.5} />
    </button>
  );
}

const NAV: { id: VistaApp; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "explorar", label: "Explorar políticas" },
];

export function Topbar() {
  const vista = usePoliticasStore((s) => s.vista);
  const setVista = usePoliticasStore((s) => s.setVista);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        {/* Wordmark */}
        <button
          type="button"
          onClick={() => setVista("inicio")}
          className="flex items-center gap-2.5"
          aria-label="POLIS — Inicio"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--text-primary)]">
            <Landmark className="size-4 text-[var(--text-inverse)]" strokeWidth={1.5} />
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-[15px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">
              POLIS
            </span>
            <span className="size-1 rounded-full bg-[var(--ember)]" aria-hidden />
          </span>
        </button>

        {/* Nav */}
        <nav className="flex items-center gap-1" aria-label="Navegación principal">
          {NAV.map((item) => {
            const active = vista === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setVista(item.id)}
                className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors md:text-[13px] ${
                  active
                    ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
