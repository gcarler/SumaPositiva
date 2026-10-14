import { describe, expect, test } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  validarRedaccionLocal,
  normalizarPalabra,
  calcularResumenEjecutivoLocal,
  VERBOS_DEBILES_PROHIBIDOS_DNP,
  ACTIVIDADES_PA_CANONICAS,
  BANCO_CONOCIMIENTO_CANONICO,
} from "../services/plan-accion-dnp-api";
import { BancoConocimientoDNPTab } from "./banco-conocimiento-dnp-tab";
import { MotorPlanAccionTab } from "./motor-plan-accion-tab";

describe("Motor de Planes de Acción DNP y Banco de Conocimiento (Hito PA-BANCO-MOTOR-01)", () => {
  describe("1. Validador Lingüístico Oficial DNP (Pág. 12 Instructivo Kit Financiero)", () => {
    test("rechaza taxativamente los 16 verbos débiles prohibidos por el DNP", () => {
      expect(VERBOS_DEBILES_PROHIBIDOS_DNP.length).toBe(16);

      for (const verbo of VERBOS_DEBILES_PROHIBIDOS_DNP) {
        const frase = `${verbo.charAt(0).toUpperCase() + verbo.slice(1)} la red distrital comunitaria`;
        const res = validarRedaccionLocal(frase, "NORMATIVA");

        expect(res.es_valida).toBe(false);
        expect(res.es_verbo_debil_prohibido).toBe(true);
        expect(res.verbo_detectado).toBe(verbo);
        expect(res.mensaje_dnp).toContain("lista negra oficial");
        expect(res.verbos_fuertes_sugeridos.length).toBeGreaterThan(0);
      }
    });

    test("rechaza redacciones que inicien con sustantivos o palabras que no sean infinitivos", () => {
      const frasesInvalidas = [
        "Ruta distrital para la protección de la infancia",
        "Construcción de 50 kilómetros de vías",
        "Apoyo integral a los líderes comunitarios",
        "Plan de acción para la seguridad territorial",
        "",
      ];

      for (const frase of frasesInvalidas) {
        const res = validarRedaccionLocal(frase);
        expect(res.es_valida).toBe(false);
        expect(res.es_verbo_debil_prohibido).toBe(false);
      }
    });

    test("aprueba redacciones que inicien con verbos fuertes en infinitivo", () => {
      const casosValidos = [
        { frase: "Expedir el protocolo de atención inmediata", verbo: "expedir" },
        { frase: "Instalar 85 cámaras de videovigilancia LPR", verbo: "instalar" },
        { frase: "Diseñar la malla curricular técnica en logística", verbo: "diseñar" },
        { frase: "Adecuar los canales pluviales de la Ciénaga", verbo: "adecuar" },
        { frase: "Ejecutar 48 jornadas territoriales de diálogo", verbo: "ejecutar" },
        { frase: "Crear el fondo rotatorio de microcréditos", verbo: "crear" },
        { frase: "Adoptar el modelo de operación del cuidado", verbo: "adoptar" },
        { frase: "Firmar acuerdos de articulación administrativa", verbo: "firmar" },
        { frase: "Verificar el estado operacional de los radios", verbo: "verificar" },
        { frase: "Notificar a los 24 centros de salud de primer nivel", verbo: "notificar" },
        { frase: "Colocar 1.200 luminarias LED de 150W", verbo: "colocar" },
        { frase: "Identificar 120 productores campesinos locales", verbo: "identificar" },
      ];

      for (const { frase, verbo } of casosValidos) {
        const res = validarRedaccionLocal(frase, "NORMATIVA");
        expect(res.es_valida).toBe(true);
        expect(res.es_infinitivo).toBe(true);
        expect(res.es_verbo_debil_prohibido).toBe(false);
        expect(res.verbo_detectado).toBe(verbo);
        expect(res.verbos_fuertes_sugeridos.length).toBe(0);
      }
    });

    test("normalizarPalabra limpia tildes y preserva la letra ñ del idioma español", () => {
      expect(normalizarPalabra("DISEÑAR")).toBe("diseñar");
      expect(normalizarPalabra("ejecución,")).toBe("ejecucion");
      expect(normalizarPalabra("¡Expedir!")).toBe("expedir");
    });
  });

  describe("2. Resumen Ejecutivo y Cálculo de KPIs del Plan de Acción", () => {
    test("calcula métricas consolidadas sobre las 12 actividades canónicas", () => {
      const resumen = calcularResumenEjecutivoLocal(ACTIVIDADES_PA_CANONICAS);

      expect(resumen.total_actividades).toBe(12);
      expect(resumen.total_metas_producto).toBeGreaterThan(0);
      expect(resumen.total_metas_gestion).toBeGreaterThan(0);
      expect(resumen.total_actividades_tipo).toBeGreaterThan(0);
      expect(resumen.avance_fisico_promedio).toBeGreaterThan(80);
      expect(resumen.presupuesto_total_programado_cop).toBeGreaterThan(10000000000);
      expect(resumen.presupuesto_total_ejecutado_cop).toBeGreaterThan(8000000000);
      expect(resumen.porcentaje_ejecucion_financiera).toBeGreaterThan(70);

      // Semáforo de alertas
      expect(resumen.semaforo_alertas.en_meta).toBeGreaterThan(0);
      expect(resumen.semaforo_alertas.alerta_preventiva).toBeDefined();
      expect(resumen.semaforo_alertas.rezago_critico).toBeDefined();
    });

    test("el catálogo canónico cubre las 8 líneas estratégicas y fuentes DNP", () => {
      expect(ACTIVIDADES_PA_CANONICAS.length).toBe(12);
      const lineas = new Set(ACTIVIDADES_PA_CANONICAS.map((a) => a.linea_estrategica_codigo));
      expect(lineas.has("LE-01")).toBe(true);
      expect(lineas.has("LE-02")).toBe(true);
      expect(lineas.has("LE-03")).toBe(true);
      expect(lineas.has("LE-04")).toBe(true);
      expect(lineas.has("LE-05")).toBe(true);
      expect(lineas.has("LE-06")).toBe(true);

      const fuentes = new Set(ACTIVIDADES_PA_CANONICAS.map((a) => a.fuente_financiacion));
      expect(fuentes.has("SGP")).toBe(true);
      expect(fuentes.has("REGALIAS")).toBe(true);
      expect(fuentes.has("RECURSOS_PROPIOS")).toBe(true);
      expect(fuentes.has("COFINANCIACION")).toBe(true);
      expect(fuentes.has("GASTOS_GENERALES")).toBe(true);
      expect(fuentes.has("GESTION_NO_PRESUPUESTAL")).toBe(true);
    });
  });

  describe("3. Componente BancoConocimientoDNPTab", () => {
    test("renderiza el marco normativo de la Ley 152/94 y Ley 1474/11", () => {
      const html = renderToString(<BancoConocimientoDNPTab />);
      expect(html).toContain("Marco Normativo y Principios de Formulación Territorial");
      expect(html).toContain("Ley 152 de 1994, Art. 41");
      expect(html).toContain("Ley 152 de 1994, Art. 29");
      expect(html).toContain("Ley 1474 de 2011, Art. 74");
      expect(html).toContain("31 de enero");
    });

    test("renderiza los 7 pasos de la ruta metodológica DNP y el simulador lingüístico", () => {
      const html = renderToString(<BancoConocimientoDNPTab />);
      expect(html).toContain("Ruta Metodológica de 7 Pasos para Elaborar el Plan de Acción");
      expect(html).toContain("Paso 1");
      expect(html).toContain("Paso 7");
      expect(html).toContain("Simulador y Validador Lingüístico DNP de Actividades");
      expect(html).toContain("Redacción de la Actividad");
      expect(html).toContain("Lista Negra Oficial de 16 Verbos Débiles Prohibidos");
    });

    test("muestra la lista negra de los 16 verbos débiles prohibidos", () => {
      const html = renderToString(<BancoConocimientoDNPTab />);
      for (const verbo of BANCO_CONOCIMIENTO_CANONICO.regla_linguistica_dnp.verbos_debiles_prohibidos) {
        expect(html).toContain(verbo);
      }
    });
  });

  describe("4. Componente MotorPlanAccionTab", () => {
    test("renderiza los KPIs ejecutivos del Plan de Acción 2026", () => {
      const html = renderToString(<MotorPlanAccionTab puedeEditar={false} />);
      expect(html).toContain("Motor de Procesamiento de Planes de Acción");
      expect(html).toContain("Actividades Programadas");
      expect(html).toContain("Avance Físico Ponderado");
      expect(html).toContain("Ejecución Financiera");
      expect(html).toContain("Semáforo de Alertas DNP");
    });

    test("renderiza la Hoja 1 Matriz Plan de Acción con botones de exportación", () => {
      const html = renderToString(<MotorPlanAccionTab puedeEditar={false} />);
      expect(html).toContain("Exportar Matriz DNP (CSV)");
      expect(html).toContain("Exportar JSON SisPT");
      expect(html).toContain("Hoja 1: Matriz Plan de Acción");
      expect(html).toContain("Hoja 2: Plan Indicativo Vinculado");
    });

    test("renderiza el botón de programar actividad cuando el usuario tiene permisos", () => {
      const htmlConPermiso = renderToString(<MotorPlanAccionTab puedeEditar={true} />);
      expect(htmlConPermiso).toContain("Programar Actividad");
      expect(htmlConPermiso).toContain("Asistente DNP (6 Pasos)");

      const htmlSinPermiso = renderToString(<MotorPlanAccionTab puedeEditar={false} />);
      expect(htmlSinPermiso).not.toContain("Programar Actividad");
      expect(htmlSinPermiso).not.toContain("Asistente DNP (6 Pasos)");
    });
  });
});
