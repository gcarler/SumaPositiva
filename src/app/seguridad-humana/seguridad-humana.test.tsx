import { describe, test, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import SeguridadHumanaPage, { metadata } from "./page";
import { SeguridadHumanaView } from "@/features/seguridad-humana/views/seguridad-humana-view";
import {
  DIMENSIONES,
  PILARES_ONU,
  COMPARATIVA_PARADIGMA,
  DOCUMENTOS_DESCARGABLES,
  PREGUNTAS_ABC,
} from "@/features/seguridad-humana/data/seguridad-humana.data";
import { Footer } from "@/shared/layout/footer";

describe("Página interactiva de Seguridad Humana y Caja de Herramientas [ENC-293]", () => {
  test("1. Metadata de la página configurada correctamente con SEO y OpenGraph", () => {
    expect(metadata.title).toContain("¿Qué es la Seguridad Humana Integral?");
    expect(metadata.description).toContain("3 pilares ONU");
    expect(metadata.description).toContain("7 dimensiones");
  });

  test("2. Renderiza la vista principal con el lema y pilares de la ONU", () => {
    const html = renderToString(<SeguridadHumanaView />);

    // Lema y titular
    expect(html).toContain("¿Qué es la Seguridad Humana Integral?");
    expect(html).toContain("Poner la vida y la dignidad en el centro del territorio");
    expect(html).toContain("Resolución 66/290 de las Naciones Unidas");

    // 3 Pilares ONU
    for (const pilar of PILARES_ONU) {
      expect(html).toContain(pilar.titulo);
      expect(html).toContain(pilar.subtitulo);
    }
  });

  test("3. Renderiza las 7 dimensiones temáticas y sus entidades líderes", () => {
    const html = renderToString(<SeguridadHumanaView />);

    expect(DIMENSIONES).toHaveLength(7);
    for (const dim of DIMENSIONES) {
      expect(html).toContain(dim.nombreCorto);
      expect(html).toContain(dim.codigo);
    }

    // Comprobar la dimensión activa por defecto (DIM-01 Personal)
    const dimInicial = DIMENSIONES[0];
    expect(html).toContain(dimInicial.nombre);
    expect(html).toContain(dimInicial.entidadLider);
    expect(html).toContain(dimInicial.desafioCartagena);
  });

  test("4. Renderiza la matriz comparativa de paradigma: ¿Qué NO es vs. ¿Qué SÍ es?", () => {
    const html = renderToString(<SeguridadHumanaView />);

    expect(html).toContain("¿Qué NO es vs. ¿Qué SÍ es la Seguridad Humana?");
    expect(html).toContain("¿Qué NO es la Política de Seguridad Humana?");
    expect(html).toContain("¿Qué SÍ es la Seguridad Humana Integral?");

    expect(COMPARATIVA_PARADIGMA.length).toBeGreaterThanOrEqual(5);
    for (const item of COMPARATIVA_PARADIGMA) {
      expect(html).toContain(item.noEs);
      expect(html).toContain(item.siEs);
    }
  });

  test("5. Caja de Herramientas: renderiza enlaces de descarga y verifica existencia de los 4 PDFs", () => {
    const html = renderToString(<SeguridadHumanaView />);

    expect(html).toContain("Caja de Herramientas Pedagógica y Documental");
    expect(DOCUMENTOS_DESCARGABLES).toHaveLength(4);

    const publicDocsDir = path.resolve(process.cwd(), "public/docs");
    expect(fs.existsSync(publicDocsDir)).toBe(true);

    for (const doc of DOCUMENTOS_DESCARGABLES) {
      // Enlace presente en la vista
      expect(html).toContain(doc.archivoUrl);
      expect(html).toContain(doc.nombreDescarga);

      // Archivo físico existente en public/docs/ y con tamaño no nulo (> 1KB)
      const filePath = path.join(publicDocsDir, path.basename(doc.archivoUrl));
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });

  test("6. Renderiza las 10 Preguntas Clave del ABC Ciudadano", () => {
    const html = renderToString(<SeguridadHumanaView />);

    expect(html).toContain("Las Diez (10) Preguntas Clave del ABC");
    expect(PREGUNTAS_ABC).toHaveLength(10);

    for (const faq of PREGUNTAS_ABC) {
      expect(html).toContain(faq.pregunta);
    }
    // La respuesta del ítem 0 abierto por defecto
    expect(html).toContain(PREGUNTAS_ABC[0].respuesta);
  });

  test("7. Renderiza la página completa incluyendo el footer integrado", () => {
    const html = renderToString(<SeguridadHumanaPage />);

    expect(html).toContain("¿Qué es la Seguridad Humana Integral?");
    expect(html).toContain("Caja de Herramientas Pedagógica y Documental");
    expect(html).toContain("© 2026 — Construido con la ciudadanía");
  });

  test("8. Footer del sitio público incluye enlace directo a /seguridad-humana", () => {
    const html = renderToString(<Footer />);

    expect(html).toContain('href="/seguridad-humana"');
    expect(html).toContain("¿Qué es Seguridad Humana?");
  });

  test("9. Encargo 294: Presentación de Diagnóstico Barrial en formato diapositivas ejecutivas visuales", () => {
    const filePath = path.resolve(process.cwd(), "public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf");
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    // Debe tener tamaño representativo de un deck ejecutivo multi-página (> 20KB)
    expect(stat.size).toBeGreaterThan(20000);

    const info = execSync(`pdfinfo "${filePath}"`).toString();
    expect(info).toContain("Pages:           10");
    expect(info).toContain("792 x 612 pts (letter)");

    const text = execSync(`pdftotext "${filePath}" -`).toString();
    expect(text).toContain("POLIS CARTAGENA DE INDIAS");
    expect(text).toContain("DIAGNÓSTICO MULTIDIMENSIONAL DE SEGURIDAD HUMANA");
    expect(text).toContain("Diapositiva 2 de 10");
    expect(text).toContain("Diapositiva 9 de 10");
    expect(text).toContain("¡Cartagena se Transforma con la Fuerza de sus Barrios!");
    // Cifras verificadas del banco de fuentes oficiales (DANE, Policía Nacional)
    expect(text).toContain("14,1%");
    expect(text).toContain("28,1%");
    expect(text).toContain("35,4");
    expect(text).toContain("34,6%");
  });

  test("10. Los documentos de la caja de herramientas no contienen cifras sin fuente ni dominio ajeno", () => {
    const docs = [
      "ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf",
      "PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf",
      "MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf",
      "GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf",
    ];
    // Cifras y afirmaciones que se inventaron en versiones previas y no tienen fuente.
    const prohibidos = [
      "28.4%",
      "38.0%",
      "68 Puntos",
      "72%",
      "120.000",
      "15.000 raciones",
      "500 propuestas",
      "polis.cartagena.gov.co",
      "@cartagena.gov.co",
      "ALCALDÍA MAYOR DE CARTAGENA DE INDIAS",
      "Edición Oficial",
      "Documento Oficial",
      "Comité Distrital de Seguridad Humana",
    ];
    for (const nombre of docs) {
      const filePath = path.resolve(process.cwd(), "public/docs", nombre);
      const text = execSync(`pdftotext "${filePath}" -`).toString();
      for (const frase of prohibidos) {
        expect(`${nombre}: ${text.includes(frase)}`).toBe(`${nombre}: false`);
      }
    }
  });
});
