import { describe, expect, test } from "vitest";
import {
  generarDictamenJuridicoDeterminista,
  generarDictamenFiscalDeterminista,
  evaluarViabilidadIntegral,
} from "./viabilidad-api";
import { ALTERNATIVAS_CANONICAS } from "../data/alternativas-canonicas.data";
import type { EntradaJuridica, EntradaFiscal } from "../models/viabilidad";

describe("Evaluación de Viabilidad Jurídica y Fiscal con IA (Hito F-2)", () => {
  describe("Motor Jurídico y Constitucional (LOOT y OIT 169)", () => {
    test("valida competencia distrital de Cartagena y no regresividad DESCA", () => {
      const entrada: EntradaJuridica = {
        politica_id: "01a0f820-e5ca-7001-a000-000000000001",
        titulo: "Ruta Segura contra ESCNNA en Cartagena",
        descripcion: "Protección integral de NNA en zonas turísticas y escolares.",
        lineas_accion: ["Erradicar la explotación sexual comercial"],
        territorios_afectados: ["Centro Histórico", "Bocagrande"],
        es_territorio_etnico: false,
        poblacion_objetivo: "14.500 menores",
        modifica_beneficios_existentes: false,
        sector_tematico: "proteccion_nna",
      };

      const resultado = generarDictamenJuridicoDeterminista(entrada);

      expect(resultado.es_viable).toBe(true);
      expect(resultado.es_competencia_distrital_cartagena).toBe(true);
      expect(resultado.nivel_competencia).toBe("distrital");
      expect(resultado.fundamento_competencia).toContain("1454");
      expect(resultado.control_regresividad.existe_riesgo_regresividad).toBe(false);
      expect(resultado.control_regresividad.supera_test_progresividad).toBe(true);
      expect(resultado.alerta_consulta_previa.requiere_consulta_previa).toBe(false);
    });

    test("activa salvaguarda obligatoria de Consulta Previa ante intervención en territorios étnicos de Cartagena", () => {
      const entradaEtnica: EntradaJuridica = {
        politica_id: "01a0f820-e5ca-7001-a000-000000000005",
        titulo: "Centro de Formación Tecnológica para Jóvenes de Tierrabomba",
        descripcion: "Capacitación en territorios insulares de comunidades negras.",
        lineas_accion: ["Formación técnica y oficios marino-costeros"],
        territorios_afectados: ["Isla de Tierrabomba", "Barú"],
        es_territorio_etnico: true,
        poblacion_objetivo: "8.500 jóvenes",
        modifica_beneficios_existentes: false,
        sector_tematico: "educacion_cultura",
      };

      const resultado = generarDictamenJuridicoDeterminista(entradaEtnica);

      expect(resultado.es_viable).toBe(true);
      expect(resultado.alerta_consulta_previa.requiere_consulta_previa).toBe(true);
      expect(resultado.alerta_consulta_previa.fundamento_constitucional).toContain("Convenio 169");
      expect(resultado.recomendaciones_juridicas.some((r) => r.includes("Consulta Previa"))).toBe(true);
    });
  });

  describe("Motor Fiscal y Presupuestal (MFMP y Vigencias Futuras)", () => {
    test("evalúa sostenibilidad financiera y asigna fuentes oficiales (FONSET/SGP)", () => {
      const entrada: EntradaFiscal = {
        politica_id: "01a0f820-e5ca-7001-a000-000000000002",
        titulo: "Jóvenes Constructores de Paz",
        costo_estimado_total_cop: 6200000000,
        horizonte_anos: 4,
        sector_inversion: "seguridad_convivencia",
        fuentes_propuestas: ["FONSET", "SGP"],
        cuenta_con_declaratoria_estrategica: true,
      };

      const resultado = generarDictamenFiscalDeterminista(entrada);

      expect(resultado.es_viable).toBe(true);
      expect(resultado.consistencia_mfmp).toBe(true);
      expect(resultado.costo_total_validado_cop).toBe(6200000000);
      expect(resultado.fuentes_recomendadas.some((f) => f.fuente === "FONSET")).toBe(true);
      expect(resultado.alerta_vigencias_futuras.trasciende_periodo_gobierno).toBe(false);
      expect(resultado.alerta_vigencias_futuras.tipo_vigencia).toBe("ordinaria");
    });

    test("dispara alerta pericial de Vigencias Futuras Excepcionales (Ley 1483/11) cuando trasciende el cuatrienio", () => {
      const entradaPlurianual: EntradaFiscal = {
        politica_id: "01a0f820-e5ca-7001-a000-000000000003",
        titulo: "Plan Ecoterritorial Ciénaga de la Virgen",
        costo_estimado_total_cop: 12000000000,
        horizonte_anos: 5,
        sector_inversion: "ambiente_habitat",
        fuentes_propuestas: ["SGR", "ICLD"],
        cuenta_con_declaratoria_estrategica: true,
      };

      const resultado = generarDictamenFiscalDeterminista(entradaPlurianual);

      expect(resultado.es_viable).toBe(true);
      expect(resultado.alerta_vigencias_futuras.trasciende_periodo_gobierno).toBe(true);
      expect(resultado.alerta_vigencias_futuras.tipo_vigencia).toBe("excepcional");
      expect(resultado.alerta_vigencias_futuras.requiere_acuerdo_concejo).toBe(true);
      expect(resultado.alerta_vigencias_futuras.fundamento_legal).toContain("1483");
      expect(resultado.riesgo_fiscal).toBe("medio");
    });
  });

  describe("Orquestador Integral de Viabilidad", () => {
    test("ejecuta dictamen integral sobre iniciativa ordinaria (ALT-ESCNNA-01)", async () => {
      const alt = ALTERNATIVAS_CANONICAS[0]; // ALT-ESCNNA-01 (4 años, sin consulta previa)
      const evaluacion = await evaluarViabilidadIntegral(alt);

      expect(evaluacion.alternativaId).toBe(alt.id);
      expect(evaluacion.codigoAlternativa).toBe("ALT-ESCNNA-01");
      expect(evaluacion.veredictoConsolidado).toBe("VIABLE");
      expect(evaluacion.juridico.es_viable).toBe(true);
      expect(evaluacion.fiscal.es_viable).toBe(true);
    });

    test("emite veredicto VIABLE CON CONDICIONES en alternativas con salvaguarda étnica o vigencias futuras (ALT-INS-05)", async () => {
      const alt = ALTERNATIVAS_CANONICAS[4]; // ALT-INS-05 (requiere consulta previa)
      const evaluacion = await evaluarViabilidadIntegral(alt);

      expect(evaluacion.codigoAlternativa).toBe("ALT-INS-05");
      expect(evaluacion.veredictoConsolidado).toBe("VIABLE CON CONDICIONES");
      expect(evaluacion.juridico.alerta_consulta_previa.requiere_consulta_previa).toBe(true);
    });
  });
});
