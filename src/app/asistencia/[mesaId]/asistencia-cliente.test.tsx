import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AsistenciaCliente } from "./asistencia-cliente";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("AsistenciaCliente — Navegación de Retorno [NAV-RETORNO-01]", () => {
  test("renderiza el enlace al inicio (href='/') en el encabezado institucional", () => {
    const html = renderToString(<AsistenciaCliente mesaId="mt-l01-01" />);

    // Logo / bloque de marca clicable hacia Home
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Ir a la página principal de POLIS"');
    expect(html).toContain("Alcaldía Mayor de Cartagena de Indias");
    expect(html).toContain("Secretaría del Interior y Convivencia • POLIS");

    // Botón de retorno al inicio en la cabecera
    expect(html).toContain("Volver al inicio");
  });

  test("renderiza la barra de navegación de retorno sobre la tarjeta de mesa", () => {
    const html = renderToString(<AsistenciaCliente mesaId="mt-l01-01" />);

    // Barra de migas / retorno
    expect(html).toContain('aria-label="Navegación de retorno"');
    expect(html).toContain("Volver a la plataforma POLIS");
    expect(html).toContain("Mesas Territoriales");
  });

  test("renderiza enlace de retorno oficial en el pie de página", () => {
    const html = renderToString(<AsistenciaCliente mesaId="mt-l01-01" />);

    // Enlace en footer hacia Home
    expect(html).toContain("Regresar al portal principal de Seguridad Humana Integral (POLIS)");
  });
});
