import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AccesibilidadWidget as AccesibilidadWidgetUI } from "@/shared/ui/accesibilidad-widget";

describe("AccesibilidadWidget UI Component (A11Y-WIDGET-01b - Patrón Función Pública / GOV.CO)", () => {
  const defaultProps = {
    textSize: "100" as const,
    contrast: "normal" as const,
    grayscale: false,
    lineSpacing: "normal" as const,
    letterSpacing: "normal" as const,
    underlineLinks: false,
    reducedMotion: false,
    theme: "light",
    isOpen: false,
    isGeovisor: false,
    isCollapsed: false,
    ultimoAnuncio: "",
    onToggleCollapse: vi.fn(),
    onToggleOpen: vi.fn(),
    onClose: vi.fn(),
    onTextSizeChange: vi.fn(),
    onAumentarTextSize: vi.fn(),
    onDisminuirTextSize: vi.fn(),
    onContrastChange: vi.fn(),
    onToggleContrast: vi.fn(),
    onGrayscaleToggle: vi.fn(),
    onLineSpacingToggle: vi.fn(),
    onLetterSpacingToggle: vi.fn(),
    onUnderlineLinksToggle: vi.fn(),
    onReducedMotionToggle: vi.fn(),
    onThemeToggle: vi.fn(),
    onResetAll: vi.fn(),
  };

  test("renderiza la barra lateral adosada al borde derecho con <nav aria-label='Menú de accesibilidad'>", () => {
    const html = renderToString(<AccesibilidadWidgetUI {...defaultProps} />);

    expect(html).toContain('aria-label="Menú de accesibilidad"');
    expect(html).toContain("w-[52px]");
    expect(html).toContain("fixed top-1/2 right-0");
  });

  test("renderiza las acciones directas de la barra con expansión lateral al hover/focus", () => {
    const html = renderToString(<AccesibilidadWidgetUI {...defaultProps} />);

    // 1. Contraste directo con aria-pressed
    expect(html).toContain('aria-label="Activar alto contraste"');
    expect(html).toContain('aria-pressed="false"');

    // 2. Aumentar tamaño (A+)
    expect(html).toContain('aria-label="Aumentar tamaño de texto (actual 100%)"');
    expect(html).toContain("A+");

    // 3. Reducir tamaño (A−, deshabilitado al 100%)
    expect(html).toContain('aria-label="Reducir tamaño de texto (actual 100%)"');
    expect(html).toContain("A−");
    expect(html).toContain("disabled");

    // 4. Restablecer
    expect(html).toContain('aria-label="Restablecer todas las preferencias de accesibilidad"');
    expect(html).toContain("Restablecer");

    // 5. Más opciones con aria-expanded="false"
    expect(html).toContain('aria-label="Más opciones de accesibilidad"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="panel-mas-opciones-a11y"');

    // 6. Verificación de exclusión: Centro de Relevo ya no existe en la barra (A11Y-WIDGET-01c)
    expect(html).not.toContain("Centro de Relevo");
    expect(html).not.toContain("centroderelevo.gov.co");

    // Comportamiento de expansión (hover:w-[196px])
    expect(html).toContain("hover:w-[196px]");
    expect(html).toContain("focus-within:w-[196px]");
  });

  test("en modo alto contraste, el botón de contraste refleja aria-pressed='true' y etiqueta de desactivación", () => {
    const html = renderToString(
      <AccesibilidadWidgetUI {...defaultProps} contrast="alto" />
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Desactivar alto contraste (actual: activado)"');
    expect(html).toContain("Contraste normal");
  });

  test("al 200% de tamaño de texto, el botón A+ queda deshabilitado y A− habilitado", () => {
    const html = renderToString(
      <AccesibilidadWidgetUI {...defaultProps} textSize="200" />
    );

    expect(html).toContain('aria-label="Aumentar tamaño de texto (actual 200%)"');
    expect(html).toContain('aria-label="Reducir tamaño de texto (actual 200%)"');
    expect(html).toContain("Aumentar (200%)");
    expect(html).toContain("Reducir (200%)");
  });

  test("cuando isOpen es true, despliega el subpanel de Más Opciones a la izquierda con todos sus controles", () => {
    const html = renderToString(
      <AccesibilidadWidgetUI
        {...defaultProps}
        isOpen={true}
        textSize="125"
        contrast="alto"
        grayscale={true}
        lineSpacing="amplio"
        letterSpacing="amplio"
        underlineLinks={true}
        reducedMotion={true}
        ultimoAnuncio="Opciones abiertas"
      />
    );

    expect(html).toContain('id="panel-mas-opciones-a11y"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Controles adicionales de accesibilidad"');
    expect(html).toContain("Más opciones");

    // Controles del subpanel
    expect(html).toContain("Color y Tema");
    expect(html).toContain("Escala de grises");
    expect(html).toContain("Lectura y Movimiento");
    expect(html).toContain("Interlineado amplio");
    expect(html).toContain("Espaciado letras");
    expect(html).toContain("Subrayar enlaces");
    expect(html).toContain("Reducir movimiento");
    expect(html).toContain("Restablecer todo");

    // O1: Con el subpanel abierto se suprime la expansión lateral de botones (hover:w-[196px]) y el subpanel tiene z-20 frente a z-10 del nav
    expect(html).not.toContain("hover:w-[196px]");
    expect(html).toContain("z-20");
    expect(html).toContain("z-10");
  });

  test("en geovisor con isCollapsed=true renderiza únicamente la pestaña mínima compacta para no obstruir paneles", () => {
    const html = renderToString(
      <AccesibilidadWidgetUI
        {...defaultProps}
        isGeovisor={true}
        isCollapsed={true}
      />
    );

    expect(html).toContain('data-testid="accesibilidad-tab-container"');
    expect(html).toContain('aria-label="Abrir menú de accesibilidad"');
    expect(html).not.toContain('aria-label="Menú de accesibilidad"');
  });
});
