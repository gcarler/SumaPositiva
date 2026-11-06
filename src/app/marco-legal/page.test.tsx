import { describe, test, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import MarcoLegalPage, { metadata } from "./page";
import { MarcoLegalView } from "@/features/marco-legal/views/marco-legal-view";
import {
  PILARES_INFO,
  SECCIONES_MARCO_LEGAL,
} from "@/features/marco-legal/data/marcos-legales-data";

describe("Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302]", () => {
  test("1. Metadata configurada con diferenciación explícita de ambos marcos", () => {
    expect(metadata.title).toContain("Marcos Jurídicos, Doctrinales y Normativos");
    expect(metadata.description).toContain("Política Pública de Seguridad Humana de Cartagena");
    expect(metadata.description).toContain("Acuerdo 139/2024");
    expect(metadata.description).toContain("Decreto Nacional 0037/2026");
    expect(metadata.description).toContain("Decreto Distrital 0730/2023");
    expect(metadata.description).toContain("Decreto 1070/2021 como antecedente");
    expect(metadata.description).toContain("Ples SAS");
    expect(metadata.description).toContain("Ley 527/1999");
    expect(metadata.description).toContain("Ley 1581/2012");
  });

  test("2. Renderiza la estructura general con main accesible y pie fuera de main", () => {
    const html = renderToString(<MarcoLegalPage />);
    expect(html).toContain('id="main-content"');
    expect(html).toContain("<footer");
    // El footer no debe estar dentro del main
    const mainPos = html.indexOf('id="main-content"');
    const footerPos = html.indexOf("<footer");
    expect(mainPos).toBeGreaterThan(-1);
    expect(footerPos).toBeGreaterThan(mainPos);
  });

  test("3. Título principal institucional y tarjetas comparativas de los dos pilares", () => {
    const html = renderToString(<MarcoLegalView />);

    // Encabezado
    expect(html).toContain("Marcos Jurídicos, Doctrinales y Normativos");
    expect(html).toContain("Doble Marco Institucional Diferenciado");

    // Pilar A: Política Pública (Cartagena)
    expect(html).toContain(PILARES_INFO.politica.nombre);
    expect(html).toContain(PILARES_INFO.politica.entidad);
    expect(html).toContain("35 mesas programadas");
    expect(html).toContain("7 ejes POLIS");

    // Pilar B: Plataforma Digital (Ples SAS)
    expect(html).toContain(PILARES_INFO.plataforma.nombre);
    expect(html).toContain(PILARES_INFO.plataforma.entidad);
    expect(html).toContain("Ley 527 de 1999");
    expect(html).toContain("Ley 1581 (Habeas Data)");
    expect(html).toContain("Registro SHA-256");
  });

  test("4. Conmutador interactivo accesible (role='tablist', 'tab', 'tabpanel')", () => {
    const html = renderToString(<MarcoLegalView />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Perspectivas del marco normativo"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');

    // 3 opciones en el conmutador
    expect(html).toContain("Vista Integrada (Ambos Marcos)");
    expect(html).toContain("Política Pública de Seguridad Humana");
    expect(html).toContain("Plataforma POLIS (Ples SAS)");
  });

  test("5. Preservación estricta de anclas históricas y retrocompatibilidad URL (#distrital)", () => {
    const html = renderToString(<MarcoLegalView />);

    // Anclas históricas requeridas expresamente
    expect(html).toContain('id="distrital"');
    expect(html).toContain('id="constitucional"');
    expect(html).toContain('id="nacional"');
    expect(html).toContain('id="internacional"');
    expect(html).toContain('id="salvaguardas"');

    // Nuevas anclas de la plataforma
    expect(html).toContain('id="plataforma"');
    expect(html).toContain('id="fe-publica"');
    expect(html).toContain('id="datos-privacidad"');
    expect(html).toContain('id="gobernanza-tecnologica"');
    expect(html).toContain('id="ordenamiento-territorial"');
  });

  test("6. Presencia íntegra de normas distritales y de política pública", () => {
    const html = renderToString(<MarcoLegalView />);

    // Normas de Cartagena
    expect(html).toContain("Acuerdo Distrital 139 de 2024");
    expect(html).toContain("Decreto Nacional 0037 de 2026");
    expect(html).toContain("Decreto Distrital 1070 de 2021");
    expect(html).toContain("Secretaría de Planeación Distrital de Cartagena");

    // Constitución
    expect(html).toContain("Artículo 1 — Dignidad Humana y Democracia Participativa");
    expect(html).toContain("Artículo 2 — Fines Esenciales del Estado");
    expect(html).toContain("Artículo 11 — Derecho Fundamental a la Vida");
    expect(html).toContain("Artículo 22 — Derecho y Deber de la Paz");

    // Nacional e Internacional
    expect(html).toContain("Ley 2294 de 2023 — Plan Nacional de Desarrollo");
    expect(html).toContain("Resolución 66/290 de la Asamblea General de la ONU (2012)");
    expect(html).toContain("Informe sobre Desarrollo Humano del PNUD (1994)");
    expect(html).toContain("Libertad frente al Miedo, Necesidad y Vivir con Dignidad");
  });

  test("7. Presencia de referencias de la plataforma y límites de valoración documental", () => {
    const html = renderToString(<MarcoLegalView />);

    // Fe Pública y Mensajes de Datos
    expect(html).toContain("Ley 527 de 1999 — Mensajes de Datos y Firma Digital");
    expect(html).toContain("Un hash permite contrastar contenido");

    // Habeas Data y Privacidad
    expect(html).toContain("Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013");
    expect(html).toContain("Minimización de metadatos EXIF / GPS");

    // Gobernanza Tecnológica y Veeduría
    expect(html).toContain("Ley 1712 de 2014 — Transparencia y Acceso a la Información");
    expect(html).toContain("Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015");
    expect(html).toContain("Artículo 209 — Principios de la Función Administrativa");

    // Territorio y Finanzas
    expect(html).toContain("Ley 388 de 1997 y Ley 1454 de 2011 (LOOT)");
    expect(html).toContain("Convenio 169 de la OIT y Artículo 330 C.P. — Consulta Previa");
    expect(html).toContain("Fondos Territoriales de Seguridad y Vigencias Futuras");
  });

  test("8. Catálogo completo de secciones verificado (9 secciones en total)", () => {
    expect(SECCIONES_MARCO_LEGAL).toHaveLength(9);
    const politica = SECCIONES_MARCO_LEGAL.filter((s) => s.ambito === "politica");
    const plataforma = SECCIONES_MARCO_LEGAL.filter((s) => s.ambito === "plataforma");
    expect(politica).toHaveLength(5);
    expect(plataforma).toHaveLength(4);
  });

  test("9. Ausencia de enlaces http inseguros", () => {
    const html = renderToString(<MarcoLegalPage />);
    const matchHttpInseguro = html.match(/href="http:\/\/[^"]+"/g);
    expect(matchHttpInseguro).toBeNull();
  });
  test("10. Jurisdicción, sustitución y fuentes de las referencias corregidas", () => {
    const distrital = SECCIONES_MARCO_LEGAL.find((s) => s.id === "distrital")!;
    const nacional = SECCIONES_MARCO_LEGAL.find((s) => s.id === "nacional")!;
    expect(distrital.normas.some((n) => n.id === "decreto-037-2026")).toBe(false);
    expect(nacional.normas.find((n) => n.id === "decreto-037-2026")?.nivel).toBe("Decreto Nacional");
    expect(distrital.normas.find((n) => n.id === "decreto-1070-2021")?.nivel).toBe("Antecedente distrital");
    expect(distrital.normas.some((n) => n.id === "decreto-0730-2023")).toBe(true);
    for (const seccion of SECCIONES_MARCO_LEGAL) {
      expect(seccion.conteo).toBe(`${seccion.normas.length} referencias`);
      for (const norma of seccion.normas) {
        if (norma.fuenteUrl) expect(new URL(norma.fuenteUrl).protocol).toBe("https:");
      }
    }
    const html = renderToString(<MarcoLegalView />);
    expect(html).toContain("Consultar fuente oficial");
    expect(html).not.toContain("Decreto Distrital 037");
    expect(html).toContain("no constituye por sí solo certificación");
  });

});
