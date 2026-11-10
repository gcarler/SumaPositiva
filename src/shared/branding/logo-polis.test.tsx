import { describe, test, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { IsotipoPolis, LogoPolis, MarcaPolisHeader } from "./logo-polis";

describe("POLIS Branding — Componentes Oficiales de Marca e Isotipo", () => {
  test("1. IsotipoPolis renderiza la geometría concéntrica del isotipo P con variables CSS", () => {
    const html = renderToString(<IsotipoPolis className="size-8" />);
    expect(html).toContain("<svg");
    expect(html).toContain("viewBox=\"26 4 172 190\"");
    expect(html).toContain("var(--brand-polis-blue)");
    expect(html).toContain("var(--brand-polis-sky)");
    expect(html).toContain("var(--brand-polis-cyan)");
    expect(html).toContain("var(--brand-polis-light)");
    expect(html).toContain("var(--brand-polis-core)");
  });

  test("2. IsotipoPolis con withBackground renderiza el contenedor squircle institucional", () => {
    const html = renderToString(<IsotipoPolis withBackground />);
    expect(html).toContain("viewBox=\"0 0 128 128\"");
    expect(html).toContain("rx=\"28\"");
    expect(html).toContain("var(--surface-2)");
    expect(html).toContain("var(--border-strong)");
  });

  test("3. LogoPolis renderiza la marca completa con letras OLIS adaptativas currentColor", () => {
    const html = renderToString(<LogoPolis />);
    expect(html).toContain("viewBox=\"0 0 445 165\"");
    expect(html).toContain("aria-label=\"POLIS — Plataforma de Participación Ciudadana\"");
    // Letras O, L, I, S con stroke='currentColor' para adaptarse a light/dark mode
    expect(html).toContain("stroke=\"currentColor\"");
    // Núcleo de la O con el azul distintivo de Ples
    expect(html).toContain("var(--brand-ples-blue)");
  });

  test("4. MarcaPolisHeader renderiza el bloque unificado con POLIS y Cartagena 2026–2036", () => {
    const html = renderToString(
      <MarcaPolisHeader
        iniciativa="Seguridad Humana"
        subtitulo="Cartagena 2026–2036"
      />
    );
    expect(html).toContain("POLIS");
    expect(html).toContain("Seguridad Humana");
    expect(html).toContain("Cartagena 2026–2036");
  });

  test("5. Archivos de Favicon e iconografía existen con formato válido", () => {
    const root = process.cwd();
    const faviconSvg = path.join(root, "public/favicon.svg");
    const faviconIco = path.join(root, "public/favicon.ico");
    const appIconSvg = path.join(root, "src/app/icon.svg");
    const appleTouchIcon = path.join(root, "public/apple-touch-icon.png");
    const icon192 = path.join(root, "public/icon-192.png");
    const icon512 = path.join(root, "public/icon-512.png");

    expect(fs.existsSync(faviconSvg)).toBe(true);
    expect(fs.existsSync(faviconIco)).toBe(true);
    expect(fs.existsSync(appIconSvg)).toBe(true);
    expect(fs.existsSync(appleTouchIcon)).toBe(true);
    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.existsSync(icon512)).toBe(true);

    const svgContent = fs.readFileSync(faviconSvg, "utf8");
    expect(svgContent).toContain("viewBox=\"0 0 128 128\"");
    expect(svgContent).toContain('fill="#0C0D29"');
    expect(svgContent).toContain('stroke="#E78B26"');
  });

  test("6. Manifest PWA y layout.tsx están sincronizados con la iconografía oficial", () => {
    const root = process.cwd();
    const manifestPath = path.join(root, "public/manifest.json");
    const layoutPath = path.join(root, "src/app/layout.tsx");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const icons = manifest.icons.map((i: { src: string }) => i.src);
    expect(icons).toContain("/favicon.svg");
    expect(icons).toContain("/icon-192.png");
    expect(icons).toContain("/icon-512.png");

    const layoutContent = fs.readFileSync(layoutPath, "utf8");
    expect(layoutContent).toContain("/favicon.svg");
    expect(layoutContent).toContain("/favicon.ico");
    expect(layoutContent).toContain("/apple-touch-icon.png");
  });

  test("7. Footer renderiza el Isotipo POLIS oficial y no contiene Landmark", () => {
    const footerPath = path.join(process.cwd(), "src/shared/layout/footer.tsx");
    const footerContent = fs.readFileSync(footerPath, "utf8");

    expect(footerContent).toContain("IsotipoPolis");
    expect(footerContent).toContain("@/shared/branding/logo-polis");
    expect(footerContent).not.toContain("Landmark");
  });

  test("8. FormularioPublicoPage renderiza el Isotipo POLIS oficial en su cabecera", () => {
    const formPath = path.join(
      process.cwd(),
      "src/features/formularios/views/formulario-publico-view.tsx"
    );
    const formContent = fs.readFileSync(formPath, "utf8");

    expect(formContent).toContain("IsotipoPolis");
    expect(formContent).toContain("@/shared/branding/logo-polis");
    expect(formContent).not.toContain("<Landmark");
  });
});
