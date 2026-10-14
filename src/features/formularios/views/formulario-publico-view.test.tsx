import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormularioPublicoPage } from "./formulario-publico-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("FormularioPublicoPage — Navegación de Retorno [NAV-RETORNO-01]", () => {
  test("renderiza el logo institucional clicable y el botón 'Volver al inicio' en la cabecera", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <FormularioPublicoPage slug="diagnostico-comunitario" />
      </QueryClientProvider>
    );

    // Enlace de marca accesible al Home
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Ir a la página principal de POLIS"');
    expect(html).toContain("Política Pública de Seguridad Humana Integral — Cartagena 2026–2036");

    // Botón de retorno al inicio
    expect(html).toContain("Volver al inicio");
  });
});
