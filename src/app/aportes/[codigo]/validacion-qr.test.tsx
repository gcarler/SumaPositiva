import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { ValidacionRadicadoCliente } from "./validacion-cliente";
import { Footer } from "@/shared/layout/footer";
import type { ConsultaRadicadoRespuesta } from "@/features/notificaciones/services/notificaciones-api";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Sistema de Validación Pública de Códigos QR y Fe Pública [QR-VAL-282]", () => {
  const radicadoEjemplo: ConsultaRadicadoRespuesta = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    codigo_radicado: "POL-2026-0001",
    titulo: "Instalación de luminarias y cámaras en San Francisco",
    descripcion:
      "Propuesta comunitaria concertada en la Mesa Territorial 04 para la mitigación del hurto y mejora del alumbrado público.",
    tipo_aporte: "propuesta_ciudadana",
    autor_nombre: "Junta de Acción Comunal San Francisco",
    estado: "radicado",
    territorio_nombre: "Comuna 4 - San Francisco",
    creado_en: "2026-10-31T14:30:00Z",
    actualizado_en: "2026-10-31T14:30:00Z",
  };

  test("1. Renderiza la tarjeta oficial y solemne de fe pública distrital con radicado auténtico", () => {
    const html = renderToString(
      <ValidacionRadicadoCliente
        codigoInicial="POL-2026-0001"
        radicadoInicial={radicadoEjemplo}
      />
    );

    // Sello y encabezado solemne institucional
    expect(html).toContain("Alcaldía Mayor de Cartagena de Indias");
    expect(html).toContain("Secretaría del Interior y Convivencia");
    expect(html).toContain("Constancia Auténtica de Radicación Ciudadana");
    expect(html).toContain("Registro Auténtico Certificado");
    expect(html).toContain("Fe pública distrital verificada");

    // Código de radicado oficial destacado
    expect(html).toContain("Código de Radicado Oficial");
    expect(html).toContain("POL-2026-0001");
    expect(html).toContain("Copiar código");

    // Contenido del aporte
    expect(html).toContain("Instalación de luminarias y cámaras en San Francisco");
    expect(html).toContain("Propuesta comunitaria concertada en la Mesa Territorial 04");

    // Metadatos esenciales del despacho legal
    expect(html).toContain("Junta de Acción Comunal San Francisco");
    expect(html).toContain("Comuna 4 - San Francisco");
    expect(html).toContain("propuesta ciudadana");
    expect(html).toContain("Fecha y Hora de Despacho Legal");

    // Estado institucional
    expect(html).toContain("Radicado Oficial");

    // Garantía jurídica y trazabilidad Ley 1757 / C-150
    expect(html).toContain("Garantía de Participación y No Revictimización");
    expect(html).toContain("Ley Estatutaria 1757 de 2015");
    expect(html).toContain("Sentencia C-150 de 2015");

    // Enlaces de retorno y trazabilidad
    expect(html).toContain('href="/"');
    expect(html).toContain("Volver al inicio");
    expect(html).toContain("Volver al portal principal");
    expect(html).toContain('href="/trazabilidad"');
    expect(html).toContain("Ver trazabilidad completa");
  });

  test("2. Resuelve correctamente badges y estados institucionales diferenciados", () => {
    // Estado: En evaluación técnica
    const radicadoEvaluacion: ConsultaRadicadoRespuesta = {
      ...radicadoEjemplo,
      codigo_radicado: "POL-2026-0002",
      estado: "en_tramite",
    };
    const htmlEval = renderToString(
      <ValidacionRadicadoCliente
        codigoInicial="POL-2026-0002"
        radicadoInicial={radicadoEvaluacion}
      />
    );
    expect(htmlEval).toContain("En Evaluación Técnica");

    // Estado: Priorizado e incorporado
    const radicadoPriorizado: ConsultaRadicadoRespuesta = {
      ...radicadoEjemplo,
      codigo_radicado: "POL-2026-0003",
      estado: "priorizado",
    };
    const htmlPrio = renderToString(
      <ValidacionRadicadoCliente
        codigoInicial="POL-2026-0003"
        radicadoInicial={radicadoPriorizado}
      />
    );
    expect(htmlPrio).toContain("Priorizado e Incorporado");

    // Estado: No viable / archivado
    const radicadoRechazado: ConsultaRadicadoRespuesta = {
      ...radicadoEjemplo,
      codigo_radicado: "POL-2026-0004",
      estado: "rechazado",
    };
    const htmlRech = renderToString(
      <ValidacionRadicadoCliente
        codigoInicial="POL-2026-0004"
        radicadoInicial={radicadoRechazado}
      />
    );
    expect(htmlRech).toContain("No Viable / Archivado");
  });

  test("3. Muestra mensaje amigable de verificación fallida y campo de búsqueda cuando el radicado no existe", () => {
    const html = renderToString(
      <ValidacionRadicadoCliente
        codigoInicial="POL-INEXISTENTE-9999"
        radicadoInicial={null}
        errorInicial="El código POL-INEXISTENTE-9999 no figura en el registro oficial de fe pública distrital."
      />
    );

    // Mensaje claro de no autenticidad
    expect(html).toContain("Constancia no verificada o radicado no encontrado");
    expect(html).toContain("POL-INEXISTENTE-9999");

    // Campo interactivo de búsqueda
    expect(html).toContain("Buscar o validar otro código de radicado:");
    expect(html).toContain('id="input-nuevo-radicado"');
    expect(html).toContain("Validar radicado");

    // Enlace de retorno al inicio
    expect(html).toContain("Volver a la plataforma principal");
    expect(html).toContain('href="/"');
  });

  test("4. Muestra indicador de carga accesible mientras se consulta el registro distrital", () => {
    const html = renderToString(
      <ValidacionRadicadoCliente
        codigoInicial="POL-2026-PENDIENTE"
        radicadoInicial={null}
        errorInicial={null}
      />
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Consultando registro oficial distrital...");
    expect(html).toContain("POL-2026-PENDIENTE");
  });

  test("5. Footer incluye atribución explícita a Ples SAS y enlace a /acerca", () => {
    const html = renderToString(<Footer />);

    expect(html).toContain("POLIS es una plataforma de participación ciudadana y gobernanza desarrollada y de propiedad de");
    expect(html).toContain("Ples SAS");
    expect(html).toContain('href="https://ples.com.co"');
    expect(html).toContain('href="/acerca"');
    expect(html).toContain("Acerca de POLIS");
  });

  test("6. Verifica que logo-polis.svg tiene trazos blancos (#FFFFFF) en las letras OLIS para legibilidad", () => {
    const svgPath = path.resolve(process.cwd(), "public/logo-polis.svg");
    expect(fs.existsSync(svgPath)).toBe(true);

    const svgContent = fs.readFileSync(svgPath, "utf-8");

    // Trazo de la letra O
    expect(svgContent).toContain('circle cx="215" cy="96" r="40" stroke="#FFFFFF"');
    // Trazo de las letras L, I, S
    expect(svgContent).toContain('path d="M283 22 V118 C283 131 292 138 305 138" stroke="#FFFFFF"');
    expect(svgContent).toContain('path d="M335 62 V138" stroke="#FFFFFF"');
    expect(svgContent).toContain('path d="M425 66 C417 58 406 54 394 54 C376 54 364 63 364 76 C364 102 426 90 426 117 C426 130 412 138 393 138 C378 138 367 133 361 125" stroke="#FFFFFF"');

    // No debe contener stroke negro #000000
    expect(svgContent).not.toContain('stroke="#000000"');
  });
});
