import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ErrorBoundary } from "../error-boundary";

describe("Componente ErrorBoundary (OPS-OBSERVABILITY-01)", () => {
  const consoleErrorOriginal = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = consoleErrorOriginal;
  });

  it("renderiza los hijos normalmente cuando no hay excepciones", () => {
    const html = renderToString(
      <ErrorBoundary>
        <div>Contenido seguro de POLIS</div>
      </ErrorBoundary>
    );

    expect(html).toContain("Contenido seguro de POLIS");
  });

  it("getDerivedStateFromError actualiza hasError y guarda la instancia del error", () => {
    const errorPrueba = new Error("Simulación de fallo en renderizado");
    const state = ErrorBoundary.getDerivedStateFromError(errorPrueba);

    expect(state.hasError).toBe(true);
    expect(state.error).toBe(errorPrueba);
  });

  it("renderiza la UI de contingencia accesible cuando hasError es true", () => {
    const boundary = new ErrorBoundary({ children: <div>Contenido</div> });
    boundary.state = {
      hasError: true,
      error: new Error("Fallo temporal de carga"),
      errorInfo: null,
    };

    const ui = boundary.render();
    const html = renderToString(ui as React.ReactElement);

    expect(html).toContain("Se ha presentado una eventualidad en el módulo");
    expect(html).toContain("Tus datos locales y radicados territoriales permanecen protegidos");
    expect(html).toContain("Reintentar");
    expect(html).toContain("Volver al inicio");
  });

  it("permite renderizar un fallback personalizado si se especifica", () => {
    const fallback = <div>Fallback personalizado para POLIS</div>;
    const boundary = new ErrorBoundary({
      children: <div>Contenido</div>,
      fallback,
    });
    boundary.state = {
      hasError: true,
      error: new Error("Fallo"),
      errorInfo: null,
    };

    const ui = boundary.render();
    const html = renderToString(ui as React.ReactElement);

    expect(html).toContain("Fallback personalizado para POLIS");
    expect(html).not.toContain("Se ha presentado una eventualidad en el módulo");
  });

  it("handleReset reestablece el estado e invoca el callback onReset", () => {
    const mockReset = vi.fn();
    const boundary = new ErrorBoundary({
      children: <div>Contenido</div>,
      onReset: mockReset,
    });
    boundary.setState = vi.fn((updater) => {
      boundary.state = { ...boundary.state, ...(typeof updater === "function" ? (updater as (s: unknown) => unknown)(boundary.state) : updater) };
    });
    boundary.state = {
      hasError: true,
      error: new Error("Fallo"),
      errorInfo: null,
    };

    boundary.handleReset();

    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBeNull();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
