"use client";

import { useId, type ReactNode } from "react";
import { ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/shared/ui/button";

export interface PanelCrumb {
  label: string;
  onSelect?: () => void;
}

export interface SidePanelProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  breadcrumbs?: PanelCrumb[];
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maximized?: boolean;
  onToggleMaximized?: () => void;
  onClose: () => void;
  currentKey?: string;
}

/** Presentational panel. The application owns stacking, focus and navigation. */
export function SidePanel({
  title,
  subtitle,
  kicker,
  breadcrumbs = [],
  actions,
  footer,
  children,
  maximized,
  onToggleMaximized,
  onClose,
  currentKey,
}: SidePanelProps) {
  const titleId = useId();
  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-label={title}
      tabIndex={-1}
      className="flex h-full min-w-0 flex-col border-l border-border bg-surface-0 text-text-primary shadow-panel"
      data-slot="side-panel"
    >
      <div
        data-slot="panel-header"
        className="shrink-0 border-b border-border bg-surface-0 px-5 pb-5 pt-5 sm:px-6 lg:px-8"
      >
        {breadcrumbs.length > 0 && (
          <nav
            aria-label={`Ruta de navegación de ${title}`}
            className="mb-4 flex flex-wrap items-center gap-1"
          >
            {breadcrumbs.map((crumb, index) => (
              <span
                key={`${index}-${crumb.label}`}
                className="inline-flex items-center gap-1"
              >
                {index > 0 && (
                  <ChevronRight
                    className="size-3 text-text-tertiary"
                    aria-hidden="true"
                  />
                )}
                {crumb.onSelect ? (
                  <Button
                    variant="link"
                    size="unstyled"
                    className="label-micro px-1 py-1 text-text-tertiary"
                    onClick={crumb.onSelect}
                  >
                    {crumb.label}
                  </Button>
                ) : (
                  <span className="label-micro px-1 py-1 text-text-tertiary">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
            <ChevronRight
              className="size-3 text-text-tertiary"
              aria-hidden="true"
            />
            <span
              data-panel-current={currentKey}
              aria-current="step"
              className="label-micro rounded bg-ember-soft px-2 py-1 text-ember"
            >
              Actual
            </span>
          </nav>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {kicker && <p className="label-micro mb-2 text-ember">{kicker}</p>}
            <h2
              id={titleId}
              className="text-lg font-semibold leading-snug tracking-tight sm:text-xl"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            {onToggleMaximized && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleMaximized}
                aria-label={maximized ? "Minimizar panel" : "Maximizar panel"}
              >
                {maximized ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Cerrar panel"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={`Contenido de ${title}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
      {footer && (
        <div
          data-slot="panel-footer"
          className="ui-panel-footer shrink-0 border-t border-border bg-surface-0 px-5 py-4 sm:px-6 lg:px-8"
        >
          {footer}
        </div>
      )}
    </section>
  );
}
