"use client";

import { motion } from "framer-motion";
import { X, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import type { ReactNode } from "react";
import { usePanelStore } from "@/stores/panel-store";

/**
 * PanelShell — contenedor base de todo panel Zero-Modals.
 * Header con breadcrumb + título, cuerpo scrollable y footer opcional.
 *
 * Controles de ventana (sin diálogos): Maximizar / Minimizar (restaurar
 * al ancho por defecto) y Cerrar. El estado vive en la entrada del
 * panel dentro del store global, por lo que sobrevive al apilado.
 */

export interface Crumb {
  label: string;
  /** key del panel al que se vuelve; undefined = no clicable */
  targetKey?: string;
}

interface PanelShellProps {
  entryKey: string;
  crumbs: Crumb[];
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  onCloseToKey: (key: string, inclusive?: boolean) => void;
  children: ReactNode;
}

export function PanelShell({
  entryKey,
  crumbs,
  kicker,
  title,
  subtitle,
  actions,
  footer,
  onClose,
  onCloseToKey,
  children,
}: PanelShellProps) {
  const maximized = usePanelStore(
    (s) => s.entries.find((e) => e.key === entryKey)?.maximized ?? false
  );
  const toggleMaximized = usePanelStore((s) => s.toggleMaximized);

  return (
    <div
      className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)]"
      role="dialog"
      aria-label={title}
    >
      {/* ---------- Header ---------- */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-0)]/95 backdrop-blur-sm">
        <div className="px-5 pt-5 sm:px-6 lg:px-8 2xl:px-10">
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-1">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    className="size-3 text-[var(--text-tertiary)]"
                    strokeWidth={1.5}
                  />
                )}
                {c.targetKey ? (
                  <button
                    type="button"
                    onClick={() => onCloseToKey(c.targetKey!)}
                    className="label-micro rounded-sm px-1 py-0.5 text-[var(--text-tertiary)] transition-colors hover:text-[var(--ember)]"
                  >
                    {c.label}
                  </button>
                ) : (
                  <span className="label-micro px-1 py-0.5 text-[var(--text-tertiary)]">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <ChevronRight className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
              <span
                className="label-micro rounded-sm bg-[var(--ember-soft)] px-1.5 py-0.5 text-[var(--ember)]"
                data-panel-current={entryKey}
              >
                Actual
              </span>
            </span>
          </nav>

          {/* Título */}
          <div className="mt-3 flex items-start justify-between gap-4 pb-4">
            <div className="min-w-0">
              {kicker && (
                <p className="label-micro mb-1.5 text-[var(--ember)]">{kicker}</p>
              )}
              <h2 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}

              {/* Maximizar / Minimizar (restaurar ancho por defecto) */}
              <button
                type="button"
                onClick={() => toggleMaximized(entryKey)}
                aria-label={maximized ? "Minimizar panel" : "Maximizar panel"}
                title={maximized ? "Minimizar — ancho por defecto" : "Maximizar — toda la pantalla"}
                className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                {maximized ? (
                  <Minimize2 className="size-4" strokeWidth={1.5} />
                ) : (
                  <Maximize2 className="size-4" strokeWidth={1.5} />
                )}
              </button>

              {/* Cerrar */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar panel"
                className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Cuerpo ---------- */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* ---------- Footer ---------- */}
      {footer && (
        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-0)] px-5 py-4 sm:px-6 lg:px-8 2xl:px-10">
          {footer}
        </footer>
      )}
    </div>
  );
}

/** Animación estándar de entrada/salida de paneles */
export const panelVariants = {
  initial: { x: "100%" },
  animate: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.9 },
  },
  exit: {
    x: "100%",
    transition: { type: "spring" as const, stiffness: 380, damping: 40, mass: 0.9 },
  },
};

/** Wrapper animado que usan los paneles dentro del stack */
export function AnimatedPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
