import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  listarMesasGeovisor,
} from "./mesas-geovisor-api";
import {
  buscarCoordenadasMesa,
  MAPA_CODIGO_OFICIAL_A_AGENDA,
  MAPA_SHORTCODE_A_AGENDA,
  MAPA_UUID_A_AGENDA,
} from "../data/mesas-geovisor.data";

describe("Geovisor Territorial — Resolución Multiclave de Coordenadas (H-05)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("buscarCoordenadasMesa", () => {
    test("resuelve coordenadas por código de agenda directo (ej. mt-001)", () => {
      const geo = buscarCoordenadasMesa({ id: "mt-001" });
      expect(geo).toBeDefined();
      expect(geo?.lat).toBe(10.4236);
      expect(geo?.lng).toBe(-75.5506);
      expect(geo?.territorioCodigo).toBe("loc-1");
    });

    test("resuelve coordenadas por código oficial canónico (ej. MT-L01-01)", () => {
      const geo = buscarCoordenadasMesa({
        id: "algún-id-arbitrario",
        codigo_oficial: "MT-L01-01",
      });
      expect(geo).toBeDefined();
      expect(geo?.lat).toBe(10.4236);
      expect(geo?.lng).toBe(-75.5506);
    });

    test("resuelve coordenadas por shortcode ciudadano (ej. MT101)", () => {
      const geo = buscarCoordenadasMesa({
        id: "otro-id",
        shortcode_ciudadano: "MT101",
      });
      expect(geo).toBeDefined();
      expect(geo?.lat).toBe(10.4236);
      expect(geo?.lng).toBe(-75.5506);
    });

    test("resuelve coordenadas por UUID canónico de PostgreSQL", () => {
      const canonicalUuid = "01a0f5fe-86df-717b-a4d0-5b6605bdf993"; // MT-L01-01
      const geo = buscarCoordenadasMesa({ id: canonicalUuid });
      expect(geo).toBeDefined();
      expect(geo?.lat).toBe(10.4236);
      expect(geo?.lng).toBe(-75.5506);
    });

    test("resuelve correctamente las mesas de Barú (mr-007, mr-007b, mr-012)", () => {
      const geo007 = buscarCoordenadasMesa({ id: "mr-007" });
      const geo007b = buscarCoordenadasMesa({ id: "mr-007b" });
      const geo012 = buscarCoordenadasMesa({ id: "mr-012" });

      expect(geo007).toBeDefined();
      expect(geo007b).toBeDefined();
      expect(geo012).toBeDefined();

      // Las tres apuntan al territorio de Barú
      expect(geo007?.territorioNombre).toContain("Santa Ana");
      expect(geo007b?.territorioNombre).toContain("Barú");
      expect(geo012?.territorioNombre).toContain("Barú");
    });

    test("mapeo cubre exactamente las 33 mesas canónicas oficiales", () => {
      const codigosOficiales = Object.keys(MAPA_CODIGO_OFICIAL_A_AGENDA);
      expect(codigosOficiales.length).toBe(33);

      const shortcodes = Object.keys(MAPA_SHORTCODE_A_AGENDA);
      expect(shortcodes.length).toBe(33);

      const uuids = Object.keys(MAPA_UUID_A_AGENDA);
      expect(uuids.length).toBe(33);
    });
  });

  describe("listarMesasGeovisor con API", () => {
    test("enriquece mesas sin coordenadas desde el backend usando buscarCoordenadasMesa", async () => {
      const mockBackendMesas = [
        {
          id: "01a0f5fe-86df-717b-a4d0-5b6605bdf993",
          nombre: "Mesa Territorial Localidad Histórica y del Caribe Norte",
          fecha: "2026-10-15",
          horario: "08:30 – 12:00",
          estado: "PROGRAMADA",
          realizada: false,
          total_asistentes: 0,
          territorio_id: null,
          territorio_nombre: null,
          territorio_codigo: null,
          longitud_referencia: null,
          latitud_referencia: null,
          tipo_ubicacion: null,
          fotos: [],
          codigo_oficial: "MT-L01-01",
          shortcode_ciudadano: "MT101",
        },
      ];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockBackendMesas,
      } as Response);

      const mesas = await listarMesasGeovisor();
      expect(mesas).toHaveLength(1);
      const m = mesas[0];
      expect(m.id).toBe("01a0f5fe-86df-717b-a4d0-5b6605bdf993");
      expect(m.longitud_referencia).toBe(-75.5506);
      expect(m.latitud_referencia).toBe(10.4236);
      expect(m.codigo_oficial).toBe("MT-L01-01");
      expect(m.shortcode_ciudadano).toBe("MT101");
    });
  });
});
