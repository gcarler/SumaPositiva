"use client";

import { Button } from "@/shared/ui/button";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Landmark, UserRound } from "lucide-react";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import type { VistaApp } from "@/core/navigation/navigation-store";
import { usePanels } from "@/core/panels/panel-store";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { useSesionStore, esInstitucional } from "@/features/sesion/state/session-store";
import { SesionAvatar } from "@/features/sesion/components/sesion-avatar";

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
    () => false,
  );

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Alternar modo claro y oscuro"
      className="flex size-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
    >
      {/* Los iconos se resuelven por CSS: sin hidratación inconsistente */}
      <Sun className="hidden size-4 dark:block" strokeWidth={1.5} />
      <Moon className="block size-4 dark:hidden" strokeWidth={1.5} />
    </Button>
  );
}

function SesionButton() {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const mounted = useMounted();

  const abrir = () => openPanel("sesion", {});

  if (!mounted || !sesion) {
    return (
      <Button
        variant="default"
        size="sm"
        type="button"
        onClick={abrir}
        aria-label="Abrir panel de sesión"
      >
        <UserRound className="size-3.5" strokeWidth={1.5} />
        <span className="hidden sm:inline">Participar</span>
      </Button>
    );
  }

  const esIdentidad = sesion.modo !== "anonimo" && !!sesion.identidad;

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={abrir}
      aria-label={
        esIdentidad ? `Sesión: ${sesion.identidad!.nombre}` : "Sesión: anónimo"
      }
    >
      <SesionAvatar sesion={sesion} />
      <span className="hidden max-w-[110px] truncate text-xs font-medium text-[var(--text-primary)] sm:inline">
        {esIdentidad ? sesion.identidad!.nombre : "Anónimo"}
      </span>
    </Button>
  );
}

const NAV: { id: VistaApp; label: string; labelCorto?: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "explorar", label: "Explorar políticas", labelCorto: "Explorar" },
  { id: "mesas", label: "Mesas de trabajo", labelCorto: "Mesas" },
  { id: "geovisor", label: "Geovisor Territorial", labelCorto: "Geovisor" },
];

export function Topbar() {
  const vista = useNavigationStore((s) => s.vista);
  const setVista = useNavigationStore((s) => s.setVista);
  const sesion = useSesionStore((s) => s.sesion);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="container-fluid grid grid-cols-[1fr_auto] items-center gap-y-3 py-3 md:flex md:h-20 md:justify-between md:py-0">
        <div className="flex items-center gap-3">
          {esInstitucional(sesion) && <SidebarTrigger className="-ml-2" />}
          {/* Wordmark */}
          <Button
            variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => setVista("inicio")}
          className="flex items-center gap-2.5"
          aria-label="POLIS — Inicio"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--text-primary)]">
            <Landmark
              className="size-4 text-[var(--text-inverse)]"
              strokeWidth={1.5}
            />
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-[15px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">
              POLIS
            </span>
            <span
              className="size-1 rounded-full bg-[var(--ember)]"
              aria-hidden
            />
          </span>
        </Button>
        </div>

        {/* Nav */}
        <nav
          className="order-3 col-span-2 flex items-center gap-1 overflow-x-auto md:order-none"
          aria-label="Navegación principal"
        >
          {NAV.map((item) => {
            const active = vista === item.id;
            return (
              <Button
                variant="unstyled"
                size="unstyled"
                key={item.id}
                type="button"
                onClick={() => setVista(item.id)}
                className={`rounded-full px-3 py-2.5 text-xs font-medium transition-colors md:text-sm sm:px-3.5 ${
                  active
                    ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">
                  {item.labelCorto ?? item.label}
                </span>
              </Button>
            );
          })}
        </nav>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2">
          <SesionButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
