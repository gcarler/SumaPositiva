import { describe, test, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { RendicionCuentasPanel } from "../panels/rendicion-cuentas-panel";
import { ACTIVIDADES_PA_CANONICAS } from "@/features/seguimiento/services/plan-accion-dnp-api";
import { DEPENDENCIAS_CARTAGENA_2026 } from "../data/entidades-cartagena.data";

describe("RendicionCuentasPanel — Visor Ciudadano Ley 1474 / DNP [PA-TRANSPARENCIA-03]", () => {
  describe("1. Vista por Defecto: 27 Dependencias Distritales", () => {
    test("renderiza el mosaico completo de las 27 dependencias oficiales con sus semáforos y KPIs", () => {
      const html = renderToString(
        <RendicionCuentasPanel entryKey="rendicion-cuentas-test" />
      );

      // Verificación de títulos y encabezados de la vista institucional
      expect(html).toContain("Rendición de Cuentas y Cumplimiento 2026");
      expect(html).toContain("27 Dependencias Oficiales");
      expect(html).toContain("Plan de Acción Distrital 2026");
      expect(html).toContain("Avance Promedio Distrital");

      // Verificación del selector de vista
      expect(html).toContain("27 Dependencias Distritales");
      expect(html).toContain('data-testid="tab-publico-plan-accion-dnp"');
      expect(html).toContain("Matriz Plan de Acción DNP 2026 (Ley 1474)");

      // Verificación de dependencias canónicas
      expect(html).toContain("Secretaría del Interior");
      expect(html).toContain("Distriseguridad");
      expect(html).toContain("DADIS");
      expect(DEPENDENCIAS_CARTAGENA_2026.length).toBeGreaterThanOrEqual(27);

      // Los semáforos deben estar visibles
      expect(html).toContain("En meta");
      expect(html).toContain("En curso");
      expect(html).toContain("En alerta");
    });
  });

  describe("2. Vista Ciudadana DNP: Matriz Plan de Acción 2026 (Ley 1474)", () => {
    test("muestra el sello legal de publicación a 31 de enero de 2026 bajo el Estatuto Anticorrupción", () => {
      const html = renderToString(
        <RendicionCuentasPanel
          entryKey="rendicion-cuentas-dnp-test"
          props={{ vistaInicial: "plan_accion_dnp" }}
        />
      );

      // Sello legal de publicación y marco normativo
      expect(html).toContain("PUBLICADO EL 31 DE ENERO DE 2026 — ESTATUTO ANTICORRUPCIÓN (LEY 1474 ART. 74)");
      expect(html).toContain("LEY 1474 ART. 74");
      expect(html).toContain("Ley 152 de 1994");
      expect(html).toContain("Consejo de Gobierno");
    });

    test("renderiza los KPIs ejecutivos consolidados sobre las 12 actividades canónicas", () => {
      const html = renderToString(
        <RendicionCuentasPanel
          entryKey="rendicion-cuentas-dnp-test"
          props={{ vistaInicial: "plan_accion_dnp" }}
        />
      );

      // KPIs de certificación
      expect(html).toContain("Total Actividades Programadas");
      expect(html).toContain("12");
      expect(html).toContain("Verbos Fuertes Validados DNP");
      expect(html).toContain("100%");
      expect(html).toContain("Inversión Total Programada 2026");
      expect(html).toContain("Recursos Propios POAI");
      expect(html).toContain("Fuentes Externas");
      expect(html).toContain("Avance Físico Promedio Pond.");
    });

    test("contiene los filtros por Línea Estratégica desde LE-01 hasta LE-08 y buscador de texto", () => {
      const html = renderToString(
        <RendicionCuentasPanel
          entryKey="rendicion-cuentas-dnp-test"
          props={{ vistaInicial: "plan_accion_dnp" }}
        />
      );

      // Filtros rápidos por línea
      expect(html).toContain("Todas");
      expect(html).toContain("LE-01");
      expect(html).toContain("LE-02");
      expect(html).toContain("LE-03");
      expect(html).toContain("LE-04");
      expect(html).toContain("LE-05");
      expect(html).toContain("LE-06");
      expect(html).toContain("LE-07");
      expect(html).toContain("LE-08");

      // Buscador con placeholder
      expect(html).toContain("Buscar por actividad, verbo fuerte, dependencia, BPIM o código PA...");
    });

    test("renderiza las 12 actividades del Plan de Acción con códigos PA, códigos BPIM y verbos fuertes DNP", () => {
      const html = renderToString(
        <RendicionCuentasPanel
          entryKey="rendicion-cuentas-dnp-test"
          props={{ vistaInicial: "plan_accion_dnp" }}
        />
      );

      expect(ACTIVIDADES_PA_CANONICAS.length).toBe(12);

      // Verificación de códigos canónicos y secuenciales PA-2026-001..012
      for (let i = 1; i <= 12; i++) {
        const codigoSec = `PA-2026-${String(i).padStart(3, "0")}`;
        expect(html).toContain(codigoSec);
      }

      // Verificación de códigos canónicos y BPIM de las actividades
      for (const act of ACTIVIDADES_PA_CANONICAS) {
        expect(html).toContain(act.codigo);
        expect(html).toContain(act.codigo_bpim);
        expect(html).toContain(act.entidad_responsable);
      }

      // Verificación de badges de verbos fuertes DNP en infinitivo
      expect(html).toContain("Verbo DNP: Expedir");
      expect(html).toContain("Verbo DNP: Instalar");
      expect(html).toContain("Verbo DNP: Colocar");
      expect(html).toContain("Verbo DNP: Verificar");
      expect(html).toContain("Verbo DNP: Diseñar");
      expect(html).toContain("Verbo DNP: Ejecutar");
      expect(html).toContain("Verbo DNP: Adecuar");
      expect(html).toContain("Verbo DNP: Crear");
      expect(html).toContain("Verbo DNP: Adoptar");
      expect(html).toContain("Verbo DNP: Firmar");
      expect(html).toContain("Verbo DNP: Identificar");
      expect(html).toContain("Verbo DNP: Notificar");
    });

    test("muestra la articulación con Hoja 2 Plan Indicativo PDD (Columnas D y E) y avance trimestral", () => {
      const html = renderToString(
        <RendicionCuentasPanel
          entryKey="rendicion-cuentas-dnp-test"
          props={{ vistaInicial: "plan_accion_dnp" }}
        />
      );

      // Cruce con Hoja 2
      expect(html).toContain("Articulación Hoja 2 Plan Indicativo PDD");
      expect(html).toContain("Columna D (Programa):");
      expect(html).toContain("Columna E (Meta de Producto):");
      expect(html).toContain("Compromiso PAS Vinculado:");

      // Avance trimestral y financiero
      expect(html).toContain("T1");
      expect(html).toContain("T2");
      expect(html).toContain("T3");
      expect(html).toContain("T4");
      expect(html).toContain("Avance Físico:");
      expect(html).toContain("Inversión Programada:");
    });

    test("incluye al pie el botón de enlace directo al Workbench Técnico DNP en Plataforma", () => {
      const html = renderToString(
        <RendicionCuentasPanel
          entryKey="rendicion-cuentas-dnp-test"
          props={{ vistaInicial: "plan_accion_dnp" }}
        />
      );

      expect(html).toContain("Auditoría Técnica y Gestión DNP / SisPT");
      expect(html).toContain("Abrir Workbench Técnico DNP / SisPT en Plataforma");
      expect(html).toContain("/plataforma/seguimiento");
    });
  });
});
