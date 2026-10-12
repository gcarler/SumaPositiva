import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GeovisorPublicPage from "@/app/geovisor/page";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

describe("GeovisorPublicPage /geovisor (GEO-FULL-01)", () => {
  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("renderiza en pantalla completa sin Topbar ni Footer del portal", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <GeovisorPublicPage />
      </QueryClientProvider>
    );

    // Enlace de salto accesible conservado
    expect(html).toContain('class="ui-skip-link"');
    expect(html).toContain("Saltar al contenido");

    // Espacio de trabajo presente
    expect(html).toContain('data-testid="geovisor-workspace-layout"');
    expect(html).toContain('data-testid="geovisor-btn-volver-inicio"');

    // NO debe contener elementos de Topbar (como navegación principal institucional)
    expect(html).not.toContain('aria-label="Navegación principal"');
    expect(html).not.toContain("Seguridad Humana Cartagena 2026–2036 — Inicio");
    expect(html).not.toContain("Líneas Estratégicas");

    // NO debe contener Footer del sitio
    expect(html).not.toContain("Alcaldía Mayor de Cartagena de Indias • Secretaría del Interior");

    // Contenedor principal a pantalla completa 100dvh x 100vw
    expect(html).toContain("h-dvh");
    expect(html).toContain("w-screen");
  });
});
