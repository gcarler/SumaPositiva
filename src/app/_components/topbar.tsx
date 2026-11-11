"use client";

import Link from "next/link";
import { puedeEntrar, ROLES } from "@/features/plataforma/models/acceso";
import { Button } from "@/shared/ui/button";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, UserRound, BarChart3, Smartphone, BookOpen, KanbanSquare } from "lucide-react";
import { IsotipoPolis } from "@/shared/branding/logo-polis";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import type { VistaApp } from "@/core/navigation/navigation-store";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { SesionAvatar } from "@/features/sesion/components/sesion-avatar";
import { OfflineStatusBadge } from "@/shared/offline";

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
  const clientSesion = useSesionStore((s) => s.sesion);
  const sesion = typeof window === "undefined" ? useSesionStore.getState().sesion : clientSesion;
  const clientMounted = useMounted();
  const mounted = typeof window === "undefined" ? true : clientMounted;

  const abrir = () => openPanel("sesion", {});

  const esIdentidad = !!mounted && !!sesion && sesion.modo !== "anonimo" && !!sesion.identidad;

  if (!esIdentidad) {
    return (
      <Button
        variant="default"
        size="sm"
        type="button"
        onClick={abrir}
        aria-label="Iniciar sesión en POLIS"
        className="gap-1.5 font-semibold text-sm shadow-xs bg-[var(--brand-polis-blue)] text-[var(--text-inverse)] hover:bg-[var(--brand-polis-cyan)] hover:text-[var(--text-primary)] border-0"
      >
        <UserRound className="size-4" strokeWidth={2} aria-hidden="true" />
        <span>Iniciar sesión</span>
      </Button>
    );
  }

  const esCiudadano = sesion.rol === "ciudadano";
  const rolLabel = esCiudadano
    ? "Ciudadano"
    : (ROLES[sesion.rol ?? ""] ?? "Equipo Técnico");

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={abrir}
      className="gap-2 border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
      aria-label={`Sesión activa: ${sesion.identidad!.nombre} (${rolLabel})`}
    >
      <SesionAvatar sesion={sesion} />
      <span className="max-w-[120px] truncate text-sm font-medium text-[var(--text-primary)]">
        {sesion.identidad!.nombre}
      </span>
      <span
        className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
          esCiudadano
            ? "bg-[var(--surface-3)] text-[var(--text-secondary)]"
            : "bg-[var(--ember-soft)] text-[var(--ember)] border border-[var(--ember)]/30"
        }`}
      >
        {esCiudadano ? "Ciudadano" : "Técnico"}
      </span>
    </Button>
  );
}

const NAV: { id: VistaApp; label: string; labelCorto?: string; href?: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "explorar", label: "Líneas Estratégicas", labelCorto: "Líneas" },
  { id: "dimensiones", label: "Dimensiones y Entidades", labelCorto: "Dimensiones" },
  { id: "mesas", label: "Mesas de Trabajo", labelCorto: "Mesas" },
  { id: "noticias", label: "Noticias", labelCorto: "Noticias" },
  { id: "testimonios", label: "Testimonios", labelCorto: "Testimonios" },
  { id: "geovisor", label: "Datos", labelCorto: "Datos" },
  { id: "indicadores", label: "Indicadores", labelCorto: "Indicadores", href: "/indicadores" },
];

export function Topbar() {
  const vista = useNavigationStore((s) => s.vista);
  const setVista = useNavigationStore((s) => s.setVista);
  const clientSesion = useSesionStore((s) => s.sesion);
  const sesion = typeof window === "undefined" ? useSesionStore.getState().sesion : clientSesion;
  const { openPanel } = usePanels();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <div className="container-fluid flex h-16 items-center justify-between gap-2 sm:gap-4">
        {/* Marca Institucional POLIS */}
        <div className="flex shrink-0 items-center">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setVista("inicio")}
            className="group flex items-center gap-2 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-lg"
            aria-label="POLIS — Seguridad Humana Cartagena 2026–2036 — Inicio"
          >
            <div className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1 transition-all duration-200 group-hover:scale-105 group-hover:border-[var(--ember)] shadow-xs">
              <IsotipoPolis className="size-full" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold tracking-tight text-[var(--text-primary)]">
                  POLIS
                </span>
                <span
                  className="hidden text-xs font-medium text-[var(--text-tertiary)] xl:inline"
                  aria-hidden="true"
                >
                  •
                </span>
                <span className="hidden text-xs font-semibold text-[var(--text-secondary)] xl:inline">
                  Seguridad Humana
                </span>
                <span
                  className="size-1.5 rounded-full bg-[var(--ember)] animate-pulse"
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)] sm:text-[var(--text-tertiary)]">
                Cartagena 2026–2036
              </span>
            </div>
          </Button>
        </div>

        {/* Menú de Navegación Principal en una sola línea horizontal con scroll limpio en pantallas pequeñas */}
        <nav
          className="flex min-w-0 flex-1 items-center justify-start xl:justify-center gap-0.5 2xl:gap-1 overflow-x-auto no-scrollbar py-1 px-1"
          aria-label="Navegación principal"
        >
          {NAV.map((item) => {
            const active = vista === item.id;
            if (item.href) {
              return (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  key={item.id}
                  asChild
                  className={`shrink-0 rounded-full px-2 py-1.5 text-[13px] xl:text-sm font-medium transition-colors 2xl:px-3 ${
                    active
                      ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold border border-[var(--ember)]/40 shadow-2xs"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Link href={item.href}>
                    <span className="hidden 2xl:inline">{item.label}</span>
                    <span className="2xl:hidden">{item.labelCorto ?? item.label}</span>
                  </Link>
                </Button>
              );
            }
            return (
              <Button
                variant="unstyled"
                size="unstyled"
                key={item.id}
                type="button"
                onClick={() => setVista(item.id)}
                className={`shrink-0 rounded-full px-2 py-1.5 text-[13px] xl:text-sm font-medium transition-colors 2xl:px-3 ${
                  active
                    ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold border border-[var(--ember)]/40 shadow-2xs"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="hidden 2xl:inline">{item.label}</span>
                <span className="2xl:hidden">{item.labelCorto ?? item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Acciones principales: Iniciar Sesión garantizado y siempre visible */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <OfflineStatusBadge />

          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden 2xl:inline-flex gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Saber más sobre la Política de Seguridad Humana Integral (ONU Res. 66/290 y Caja de Herramientas)"
          >
            <Link href="/seguridad-humana">
              <BookOpen className="size-4 text-[var(--ember)]" />
              <span>Seguridad Humana</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Modo Barrio: vista ultraligera y bajo consumo de datos para celulares"
          >
            <Link href="/barrio">
              <Smartphone className="size-4 text-[var(--ember)]" />
              <span>Modo Barrio</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => openPanel("rendicion-cuentas", {})}
            className="hidden md:inline-flex gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Ver Semáforo de Cumplimiento Real 2026 de las dependencias distritales"
          >
            <BarChart3 className="size-4 text-[var(--ember)]" />
            <span>Rendición 2026</span>
          </Button>

          {puedeEntrar(sesion) && (
            <Button
              asChild
              variant="ember"
              size="sm"
              className="gap-1.5 text-sm font-semibold shadow-xs"
              title="Acceder al área de trabajo técnica para formuladores y autoridades de política pública"
            >
              <Link href="/plataforma">
                <KanbanSquare className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Área de Trabajo →</span>
                <span className="sm:hidden">Gestión</span>
              </Link>
            </Button>
          )}

          <SesionButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
