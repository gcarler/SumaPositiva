import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  normalizarConsolidado,
  normalizarDesgloseWeb,
  normalizarDesgloseMesas,
  normalizarEscenario,
  obtenerConsolidado,
  obtenerDesgloseWeb,
  obtenerDesgloseMesas,
  obtenerDesgloseEscenarios,
  listarEscenarios,
  guardarEscenario,
} from "./participacion-api";

describe("Participación Multicanal — Alineación de Rutas y Esquemas (EDIT-07)", () => {
  describe("Normalización de DTOs y Esquemas", () => {
    test("normalizarConsolidado preserva contrato backend y propiedades de retrocompatibilidad", () => {
      const raw = {
        gran_total_participantes_distrital: 968,
        participantes_unicos_identificados: 398,
        total_canal_web: 209,
        total_canal_mesas: 189,
        total_canal_escenarios: 570,
        porcentaje_canal_web: 21.59,
        porcentaje_canal_mesas: 19.52,
        porcentaje_canal_escenarios: 58.88,
        desglose_territorial_agregado: [
          { territorio: "Centro Histórico y San Diego", codigo: "BARRIO-CENTRO", total_participacion: 300 },
        ],
        fecha_corte: "2026-10-04T08:00:00Z",
      };

      const resultado = normalizarConsolidado(raw);

      // Verificación de contrato canónico
      expect(resultado.gran_total_participantes_distrital).toBe(968);
      expect(resultado.participantes_unicos_identificados).toBe(398);
      expect(resultado.total_canal_web).toBe(209);
      expect(resultado.total_canal_mesas).toBe(189);
      expect(resultado.total_canal_escenarios).toBe(570);
      expect(resultado.desglose_territorial_agregado.length).toBe(1);

      // Verificación de retrocompatibilidad
      expect(resultado.totalCartageneros).toBe(968);
      expect(resultado.participacionWeb).toBe(209);
      expect(resultado.participacionMesas).toBe(189);
      expect(resultado.participacionEscenarios).toBe(570);
      expect(resultado.desglose).toBeUndefined();
    });

    test("normalizarConsolidado preserva desglose demográfico real cuando viene en payload", () => {
      const raw: Parameters<typeof normalizarConsolidado>[0] = {
        gran_total_participantes_distrital: 100,
        desglose: { mujeres: 53, hombres: 46, noBinario: 1 },
      };
      const resultado = normalizarConsolidado(raw);
      expect(resultado.desglose?.hombres).toBe(46);
      expect(resultado.desglose?.mujeres).toBe(53);
    });

    test("normalizarDesgloseWeb mapea los 179 aportes reales y genera mapa por línea", () => {
      const raw = {
        total_aportes: 179,
        total_apoyos: 130,
        total_respuestas_formularios: 0,
        participantes_unicos_web: 209,
        por_linea_estrategica: [
          {
            linea_id: "linea-1",
            codigo: "LE-01",
            titulo: "Línea de Participación y Convivencia",
            dimension_codigo: "comunitaria",
            dimension_nombre: "Seguridad Comunitaria",
            total_aportes: 179,
            total_apoyos: 104,
          },
        ],
        por_dimension: [
          { dimension_id: "dim-1", codigo: "comunitaria", nombre: "Seguridad Comunitaria", total_aportes: 179 },
        ],
        por_territorio: [
          { territorio_id: "terr-1", codigo: "CORR-BOQUILLA", nombre: "La Boquilla", total_aportes: 28 },
        ],
      };

      const resultado = normalizarDesgloseWeb(raw);

      expect(resultado.total_aportes).toBe(179);
      expect(resultado.totalAportes).toBe(179);
      expect(resultado.por_linea_estrategica.length).toBe(1);
      expect(resultado.porLineaEstrategica?.["Línea de Participación y Convivencia"]).toBe(179);
      expect(resultado.porDimension?.["Seguridad Comunitaria"]).toBe(179);
      expect(resultado.por_territorio[0].nombre).toBe("La Boquilla");
    });

    test("normalizarDesgloseMesas estructura jerarquía y mapa de asistencia", () => {
      const raw = {
        total_mesas_principales: 36,
        total_submesas: 2,
        total_participantes: 189,
        participantes_unicos_mesas: 189,
        total_actas_cerradas: 5,
        jerarquia_mesas: [
          {
            id: "m-1",
            codigo: "MT-L01",
            nombre: "Mesa Territorial Centro",
            path: "csh.centro",
            tipo_mesa: "TERRITORIAL",
            territorio: "Centro Histórico",
            asistentes_conteo: 45,
            acta_firmada: true,
            submesas: [],
          },
        ],
      };

      const resultado = normalizarDesgloseMesas(raw);

      expect(resultado.total_mesas_principales).toBe(36);
      expect(resultado.total_submesas).toBe(2);
      expect(resultado.total_participantes).toBe(189);
      expect(resultado.totalAsistentes).toBe(189);
      expect(resultado.total_actas_cerradas).toBe(5);
      expect(resultado.porMesa?.["Mesa Territorial Centro"]).toBe(45);
    });

    test("normalizarEscenario unifica atributos canónicos y de visualización", () => {
      const raw = {
        id: "esc-100",
        codigo_unico: "ESC-001",
        nombre: "Consulta Previa Étnica de La Boquilla",
        tipo_escenario: "CONSULTA_PREVIA",
        territorio_nombre: "La Boquilla",
        fecha: "2026-08-15",
        lugar: "Salón Comunitario",
        entidad_convocante: "Alcaldía Mayor de Cartagena",
        total_asistentes: 150,
        desglose_poblacional: { afrocolombianos: 150, mujeres: 85 },
        sintesis_acuerdos: "Protección ambiental y pesca tradicional",
        estado: "REALIZADO",
      };

      const resultado = normalizarEscenario(raw);

      expect(resultado.id).toBe("esc-100");
      expect(resultado.codigo_unico).toBe("ESC-001");
      expect(resultado.nombre).toBe("Consulta Previa Étnica de La Boquilla");
      expect(resultado.titulo).toBe("Consulta Previa Étnica de La Boquilla");
      expect(resultado.tipo_escenario).toBe("CONSULTA_PREVIA");
      expect(resultado.tipo).toBe("CONSULTA_PREVIA");
      expect(resultado.total_asistentes).toBe(150);
      expect(resultado.asistentes).toBe(150);
      expect(resultado.sintesis_acuerdos).toBe("Protección ambiental y pesca tradicional");
    });
  });

  describe("Alineación de Endpoints HTTP (Cero 404)", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy.mockClear();
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    test("obtenerConsolidado invoca /participacion/consolidado correctamente", async () => {
      const mockBackend = {
        gran_total_participantes_distrital: 968,
        participantes_unicos_identificados: 398,
        total_canal_web: 209,
        total_canal_mesas: 189,
        total_canal_escenarios: 570,
        porcentaje_canal_web: 21.59,
        porcentaje_canal_mesas: 19.52,
        porcentaje_canal_escenarios: 58.88,
        desglose_territorial_agregado: [],
        fecha_corte: "2026-10-04T08:19:26.304934Z",
      };

      fetchSpy.mockClear();
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockBackend), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const data = await obtenerConsolidado();

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = (fetchSpy.mock.calls.find(([u]) => String(u).includes("/participacion/"))?.[0] ?? fetchSpy.mock.calls[0][0]) as string;
      expect(calledUrl).toContain("/participacion/consolidado");
      expect(data.gran_total_participantes_distrital).toBe(968);
    });

    test("obtenerDesgloseWeb invoca /participacion/canal-web (NO /participacion/web)", async () => {
      const mockWeb = {
        total_aportes: 179,
        total_apoyos: 130,
        total_respuestas_formularios: 0,
        participantes_unicos_web: 209,
        por_linea_estrategica: [],
        por_dimension: [],
        por_territorio: [],
      };

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockWeb), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const data = await obtenerDesgloseWeb();

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/participacion/canal-web");
      expect(calledUrl).not.toBe("/participacion/web");
      expect(data.total_aportes).toBe(179);
    });

    test("obtenerDesgloseMesas invoca /participacion/canal-mesas (NO /participacion/mesas)", async () => {
      const mockMesas = {
        total_mesas_principales: 36,
        total_submesas: 2,
        total_participantes: 189,
        participantes_unicos_mesas: 189,
        total_actas_cerradas: 0,
        jerarquia_mesas: [],
      };

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockMesas), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const data = await obtenerDesgloseMesas();

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/participacion/canal-mesas");
      expect(calledUrl).not.toBe("/participacion/mesas");
      expect(data.total_mesas_principales).toBe(36);
    });

    test("obtenerDesgloseEscenarios invoca /participacion/canal-escenarios", async () => {
      const mockEscenariosCanal = {
        total_escenarios: 3,
        total_asistentes: 570,
        por_tipo: { CONSULTA_PREVIA: 150, FORO_GREMIAL: 300, TALLER_FOCAL: 120 },
        escenarios: [],
      };

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockEscenariosCanal), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const data = await obtenerDesgloseEscenarios();

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/participacion/canal-escenarios");
      expect(data.total_escenarios).toBe(3);
      expect(data.total_asistentes).toBe(570);
    });

    test("listarEscenarios invoca /participacion/escenarios-especiales (NO /participacion/escenarios)", async () => {
      const mockLista = [
        {
          id: "esc-1",
          codigo_unico: "ESC-001",
          nombre: "Consulta Previa Étnica",
          tipo_escenario: "CONSULTA_PREVIA",
          fecha: "2026-08-15",
          lugar: "La Boquilla",
          entidad_convocante: "Secretaría del Interior",
          total_asistentes: 150,
          desglose_poblacional: {},
          estado: "REALIZADO",
        },
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLista), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const lista = await listarEscenarios();

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/participacion/escenarios-especiales");
      expect(calledUrl).not.toBe("/participacion/escenarios");
      expect(lista.length).toBe(1);
      expect(lista[0].codigo_unico).toBe("ESC-001");
    });

    test("guardarEscenario persiste vía POST a /participacion/escenarios-especiales", async () => {
      const mockCreado = {
        id: "esc-nuevo-id",
        codigo_unico: "ESC-999",
        nombre: "Nuevo Foro de Juventudes",
        tipo_escenario: "TALLER_FOCAL",
        fecha: "2026-10-10",
        lugar: "El Pozón",
        entidad_convocante: "Secretaría de Participación",
        total_asistentes: 80,
        desglose_poblacional: { jovenes: 80 },
        estado: "REALIZADO",
      };

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockCreado), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const resultado = await guardarEscenario({
        codigo_unico: "ESC-999",
        nombre: "Nuevo Foro de Juventudes",
        tipo_escenario: "TALLER_FOCAL",
        fecha: "2026-10-10",
        lugar: "El Pozón",
        entidad_convocante: "Secretaría de Participación",
        total_asistentes: 80,
        desglose_poblacional: { jovenes: 80 },
      });

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0];
      const calledUrl = call[0] as string;
      const options = call[1] as RequestInit;

      expect(calledUrl).toContain("/participacion/escenarios-especiales");
      expect(options.method).toBe("POST");
      expect(resultado.id).toBe("esc-nuevo-id");
      expect(resultado.total_asistentes).toBe(80);
    });

    test("erradicación de fallback: ante fallo de red propaga el error (H-04)", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network Error"));

      await expect(obtenerConsolidado()).rejects.toThrow("Network Error");
    });
  });
});
