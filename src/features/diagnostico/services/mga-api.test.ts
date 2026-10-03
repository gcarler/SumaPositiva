import { describe, expect, test } from "vitest";
import {
  normalizarNodo,
  normalizarInstrumento,
  normalizarArbol,
  obtenerInstrumentos,
  obtenerArbol,
  validarSintaxisLocal,
  generarDiagnosticoDeterminista,
  evaluarDiagnosticoIA,
} from "./mga-api";
import type { EntradaDiagnostico } from "../models/mga";

describe("Diagnóstico MGA y Agente IA DNP", () => {
  describe("Normalización de estructuras MGA", () => {
    test("normalizarNodo procesa un nodo plano y sus hijos recursivamente", () => {
      const raw = {
        id: "nodo-1",
        tipo_nodo: "CAUSA_DIRECTA",
        tipo_relacion: "CAUSA",
        nivel: 1,
        orden: 1,
        contenido: "Insuficiencia de recursos de inspección",
        hijos: [
          {
            id: "nodo-1-1",
            tipo_nodo: "CAUSA_INDIRECTA",
            tipo_relacion: "CAUSA",
            nivel: 2,
            orden: 1,
            contenido: "Déficit presupuestal para comisarías de familia",
            hijos: [],
          },
        ],
      };

      const normalizado = normalizarNodo(raw);
      expect(normalizado.id).toBe("nodo-1");
      expect(normalizado.tipo_nodo).toBe("CAUSA_DIRECTA");
      expect(normalizado.hijos.length).toBe(1);
      expect(normalizado.hijos[0].id).toBe("nodo-1-1");
      expect(normalizado.hijos[0].tipo_nodo).toBe("CAUSA_INDIRECTA");
    });

    test("normalizarInstrumento asigna valores por defecto seguros", () => {
      const raw = {
        id: "inst-100",
        nombre: "Plan Distrital de Seguridad Cartagena",
        tipo_instrumento: "ARBOL_PROBLEMAS",
      };

      const inst = normalizarInstrumento(raw);
      expect(inst.id).toBe("inst-100");
      expect(inst.nombre).toBe("Plan Distrital de Seguridad Cartagena");
      expect(inst.tipo_instrumento).toBe("ARBOL_PROBLEMAS");
      expect(inst.estado).toBe("EN_CONSTRUCCION");
      expect(inst.metadatos).toEqual({});
    });

    test("normalizarArbol estructura correctamente nodo central, causas y efectos", () => {
      const raw = {
        instrumento: {
          id: "inst-1",
          nombre: "Seguridad Humana",
          tipo_instrumento: "ARBOL_PROBLEMAS",
        },
        nodo_central: {
          id: "central-1",
          tipo_nodo: "PROBLEMA_CENTRAL",
          contenido: "Alta incidencia de delitos en el centro histórico",
        },
        causas_o_medios: [
          {
            id: "c-1",
            tipo_nodo: "CAUSA_DIRECTA",
            contenido: "Déficit de patrullaje policial preventivo",
          },
        ],
        efectos_o_fines: [
          {
            id: "e-1",
            tipo_nodo: "EFECTO_DIRECTO",
            contenido: "Deterioro de la percepción de seguridad turística",
          },
        ],
        total_nodos: 3,
      };

      const arbol = normalizarArbol(raw);
      expect(arbol.instrumento.id).toBe("inst-1");
      expect(arbol.nodo_central?.id).toBe("central-1");
      expect(arbol.causas_o_medios.length).toBe(1);
      expect(arbol.efectos_o_fines.length).toBe(1);
      expect(arbol.total_nodos).toBe(3);
    });
  });

  describe("Consultas a catálogo oficial / contingencia", () => {
    test("obtenerInstrumentos retorna instrumentos oficiales de Cartagena", async () => {
      const instrumentos = await obtenerInstrumentos();
      expect(instrumentos.length).toBeGreaterThanOrEqual(1);

      // Debe incluir al menos una iniciativa de Cartagena (ej. ESCNNA o Convivencia)
      const tieneCartagena = instrumentos.some(
        (i) =>
          i.nombre.includes("Cartagena") ||
          i.nombre.includes("ESCNNA") ||
          i.nombre.includes("Virgen")
      );
      expect(tieneCartagena).toBe(true);
    });

    test("obtenerArbol resuelve el árbol canónico de ESCNNA Centro Histórico", async () => {
      const arbol = await obtenerArbol("01a0f682-524a-748c-ac6c-470d890927ea");
      expect(arbol.nodo_central).toBeDefined();
      expect(arbol.nodo_central?.tipo_nodo).toBe("PROBLEMA_CENTRAL");
      expect(arbol.causas_o_medios.length).toBeGreaterThanOrEqual(2);
      expect(arbol.efectos_o_fines.length).toBeGreaterThanOrEqual(2);
      expect(arbol.total_nodos).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Validador sintáctico y motor causal DNP", () => {
    test("detecta alerta metodológica de solución disfrazada (falta de / construir)", () => {
      const analisis = validarSintaxisLocal(
        "Falta de un CAI móvil en el sector turístico",
        "PROBLEMA_CENTRAL"
      );
      expect(analisis.cumple_sintaxis).toBe(false);
      expect(analisis.observacion_metodologica).toContain("ALERTA DNP");
      expect(analisis.observacion_metodologica).toContain("solución disfrazada");
    });

    test("valida positivamente problemas formulados con sustantivos negativos", () => {
      const analisis = validarSintaxisLocal(
        "Alta vulnerabilidad y desarticulación en rutas de protección",
        "CAUSA_DIRECTA"
      );
      expect(analisis.cumple_sintaxis).toBe(true);
      expect(analisis.observacion_metodologica).toContain("Cumple el estándar DNP");
    });

    test("valida objetivos formulados con verbos en infinitivo", () => {
      const analisis = validarSintaxisLocal(
        "Reducir los índices de violencia intrafamiliar en El Pozón",
        "OBJETIVO_CENTRAL"
      );
      expect(analisis.cumple_sintaxis).toBe(true);
      expect(analisis.observacion_metodologica).toContain("Cumple directriz DNP");
    });

    test("genera diagnóstico determinista completo bajo directrices DNP", () => {
      const entrada: EntradaDiagnostico = {
        politica_id: "pol-escnna-01",
        titulo: "Prevención de ESCNNA Centro Histórico",
        problema_central:
          "Persistencia de redes de explotación comercial de menores en el Centro",
        causas_directas: [
          "Insuficiencia de inspección y control en hostales y plataformas",
          "Condiciones de vulnerabilidad extrema en barrios periféricos",
        ],
        causas_indirectas: [
          "Déficit de articulación interinstitucional entre Policía y Comisarías",
        ],
        efectos_directos: [
          "Vulneración sistemática de derechos fundamentales en la niñez",
        ],
        efectos_indirectos: [
          "Deterioro de la seguridad ciudadana y fractura del tejido social",
        ],
      };

      const resultado = generarDiagnosticoDeterminista(entrada);

      expect(resultado.es_valido).toBe(true);
      expect(resultado.puntaje_coherencia).toBeGreaterThanOrEqual(65);
      expect(resultado.problema_central_optimizado).toBeDefined();
      expect(resultado.objetivo_central_derivado).toContain("Reducir");
      expect(resultado.analisis_sintaxis.length).toBe(6);
      expect(resultado.recomendaciones_dnp.length).toBeGreaterThan(0);
      expect(resultado.resumen_ejecutivo).toContain("Concepto Pericial DNP");
    });

    test("evaluarDiagnosticoIA responde con estructura de dictamen pericial", async () => {
      const entrada: EntradaDiagnostico = {
        titulo: "Mitigación de Contaminación Ciénaga de la Virgen",
        problema_central:
          "Deterioro hidroambiental progresivo en los asentamientos informales",
        causas_directas: [
          "Vertimiento de aguas residuales domiciliarias sin tratamiento",
        ],
        causas_indirectas: [
          "Déficit en cobertura de alcantarillado sanitario",
        ],
        efectos_directos: [
          "Pérdida de biodiversidad de manglares en la Ciénaga",
        ],
        efectos_indirectos: [
          "Proliferación de enfermedades gastrointestinales",
        ],
      };

      const resultado = await evaluarDiagnosticoIA(entrada);
      expect(resultado.evaluacion_id).toBeDefined();
      expect(resultado.puntaje_coherencia).toBeGreaterThan(0);
      expect(resultado.analisis_sintaxis.length).toBeGreaterThanOrEqual(4);
    });
  });
});
