"use client";

import Link from "next/link";
import { puedeEntrar } from "@/features/plataforma/models/acceso";
import { Button } from "@/shared/ui/button";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, UserRound, BarChart3, Smartphone, BookOpen } from "lucide-react";
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
        aria-label="Iniciar sesión"
      >
        <UserRound className="size-3.5" strokeWidth={1.5} />
        <span>Iniciar sesión</span>
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

const NAV: { id: VistaApp; label: string; labelCorto?: string; href?: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "explorar", label: "Líneas Estratégicas", labelCorto: "Explorar" },
  { id: "dimensiones", label: "Dimensiones y Entidades", labelCorto: "Dimensiones" },
  { id: "mesas", label: "Mesas de Trabajo", labelCorto: "Mesas" },
  { id: "noticias", label: "Noticias", labelCorto: "Noticias" },
  { id: "testimonios", label: "Testimonios", labelCorto: "Testimonios" },
  { id: "geovisor", label: "Datos", labelCorto: "Datos" },
  { id: "indicadores", label: "Catálogo de Indicadores", labelCorto: "Catálogo", href: "/indicadores" },
];

export function Topbar() {
  const vista = useNavigationStore((s) => s.vista);
  const setVista = useNavigationStore((s) => s.setVista);
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      {/* min-h en lugar de altura fija: al envolver la navegación en anchos
          intermedios (TCA-01) la banda crece sin superponer el wordmark ni
          desbordar el contenido bajo la cabecera pegajosa. */}
      <div className="container-fluid grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-center gap-y-3 py-3 md:flex md:min-h-20 md:flex-wrap md:justify-between md:gap-x-4 md:py-0">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {/* Marca Institucional POLIS */}
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setVista("inicio")}
            className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-lg"
            aria-label="POLIS — Seguridad Humana Cartagena 2026–2036 — Inicio"
          >
            <div className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1 transition-all duration-200 group-hover:scale-105 group-hover:border-[var(--ember)] shadow-xs">
              <IsotipoPolis className="size-full" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
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
                  className="size-1.5 rounded-full bg-[var(--ember)] animate-pulse"
                  aria-hidden="true"
                />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] sm:text-[var(--text-tertiary)]">
                Cartagena 2026–2036
              </span>
            </div>
          </Button>
        </div>

        {/* Nav */}
        <nav
          className="order-3 col-span-1 sm:col-span-2 flex min-w-0 flex-wrap items-center gap-1 md:order-none"
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
                  className={`rounded-full border px-3 py-2.5 text-xs font-medium transition-colors md:text-sm sm:px-3.5 ${
                    active
                      ? "border-[var(--ember)] bg-[var(--surface-3)] text-[var(--text-primary)]"
                      : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--ember)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Link href={item.href}>
                    <span className="hidden md:inline">{item.label}</span>
                    <span className="md:hidden">
                      {item.labelCorto ?? item.label}
                    </span>
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <OfflineStatusBadge />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Conocer más acerca de POLIS, su marco doctrinal y titularidad de Ples SAS"
          >
            <Link href="/acerca">
              <span className="hidden sm:inline">Acerca de POLIS</span>
              <span className="sm:hidden">Acerca</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Saber más sobre la Política de Seguridad Humana Integral (ONU Res. 66/290 y Caja de Herramientas)"
          >
            <Link href="/seguridad-humana">
              <BookOpen className="size-3.5 text-[var(--ember)]" />
              <span className="hidden xl:inline">Saber más sobre Seguridad Humana</span>
              <span className="xl:hidden hidden sm:inline">Seguridad Humana</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Modo Barrio: vista ultraligera y bajo consumo de datos para celulares"
          >
            <Link href="/barrio">
              <Smartphone className="size-3.5 text-[var(--ember)]" />
              <span className="hidden sm:inline">Modo Barrio</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => openPanel("rendicion-cuentas", {})}
            className="gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]"
            title="Ver Semáforo de Cumplimiento Real 2026 de las 27 dependencias"
          >
            <BarChart3 className="size-3.5 text-[var(--ember)]" />
            <span className="hidden sm:inline">Rendición 2026</span>
          </Button>
          {puedeEntrar(sesion) && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-auto min-h-9 whitespace-normal text-center"
            >
              <Link href="/plataforma">Ir a la Plataforma →</Link>
            </Button>
          )}
          <SesionButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
