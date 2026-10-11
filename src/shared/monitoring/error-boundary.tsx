"use client";

import React, { Component, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary institucional para captura y contención de excepciones en frontend.
 * Previene pantallas en blanco, protege el estado de IndexedDB y preserva la experiencia ciudadana.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Telemetría segura a Sentry / GlitchTip si está configurado en el entorno
    if (typeof window !== "undefined") {
      const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
      if (sentryDsn) {
        const win = window as unknown as {
          Sentry?: {
            captureException: (err: Error, ctx?: unknown) => void;
          };
        };
        win.Sentry?.captureException(error, {
          extra: {
            componentStack: errorInfo.componentStack?.slice(0, 500),
            url: window.location.pathname,
          },
        });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-[340px] w-full flex-col items-center justify-center p-6 text-center"
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--destructive)]/10 text-[var(--destructive)] shadow-sm">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
            Se ha presentado una eventualidad en el módulo
          </h2>

          <p className="mt-2 max-w-md text-xs text-[var(--text-secondary)] sm:text-sm">
            Tus datos locales y radicados territoriales permanecen protegidos.
            Puedes reintentar cargar esta sección o regresar al inicio de POLIS.
          </p>

          {process.env.NODE_ENV !== "production" && this.state.error && (
            <div className="mt-4 max-w-lg overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left font-mono text-[11px] text-[var(--text-tertiary)]">
              <p className="font-bold text-[var(--destructive)]">
                {this.state.error.name}: {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="mt-1 whitespace-pre-wrap text-[10px]">
                  {this.state.error.stack.split("\n").slice(0, 4).join("\n")}
                </pre>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="gap-2 text-xs"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Reintentar</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={this.handleGoHome}
              className="gap-2 text-xs"
            >
              <Home className="size-3.5" aria-hidden="true" />
              <span>Volver al inicio</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
