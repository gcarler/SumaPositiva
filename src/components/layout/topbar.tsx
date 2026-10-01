"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Landmark, UserRound } from "lucide-react";
import { usePoliticasStore } from "@/stores/politicas-store";
import type { VistaApp } from "@/stores/politicas-store";
import { usePanels } from "@/stores/panel-store";
import { useSesionStore } from "@/stores/session-store";
import { SesionAvatar } from "@/features/politicas/components/ui-bits";

/**
 * Topbar minimalista — wordmark, navegación de vistas, sesión y toggle de tema.
 * El botón de sesión abre un panel (Zero-Modals): elegir anónimo o identidad.
 */

/** true solo tras la hidratación — evita mismatch con localStorage persistido */
const subscribeNoop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

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

function SesionButton() {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const mounted = useMounted();

  const abrir = () => openPanel("sesion", {});

  if (!mounted || !sesion) {
    return (
      <button
        type="button"
        onClick={abrir}
        aria-label="Abrir panel de sesión"
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--text-primary)] px-3 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 sm:px-3.5"
      >
        <UserRound className="size-3.5" strokeWidth={1.5} />
        <span className="hidden sm:inline">Participar</span>
      </button>
    );
  }

  const esIdentidad = sesion.modo === "identidad" && !!sesion.identidad;

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={esIdentidad ? `Sesión: ${sesion.identidad!.nombre}` : "Sesión: anónimo"}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] py-1 pl-1 pr-1 transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] sm:pr-3"
    >
      <SesionAvatar sesion={sesion} />
      <span className="hidden max-w-[110px] truncate text-xs font-medium text-[var(--text-primary)] sm:inline">
        {esIdentidad ? sesion.identidad!.nombre : "Anónimo"}
      </span>
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
      <div className="container-fluid flex h-16 items-center justify-between">
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
                className={`rounded-full px-2.5 py-2 text-[11px] font-medium transition-colors md:text-[13px] sm:px-3.5 ${
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
          <SesionButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
