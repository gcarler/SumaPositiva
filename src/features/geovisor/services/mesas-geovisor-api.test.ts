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

    test("resuelve correctamente las mesas de Barú e insulares (mr-007, mr-012, mr-013, mr-014, mr-015)", () => {
      const geo007 = buscarCoordenadasMesa({ id: "mr-007" });
      const geo012 = buscarCoordenadasMesa({ id: "mr-012" });
      const geo013 = buscarCoordenadasMesa({ id: "mr-013" });
      const geo014 = buscarCoordenadasMesa({ id: "mr-014" });
      const geo015 = buscarCoordenadasMesa({ id: "mr-015" });

      expect(geo007).toBeDefined();
      expect(geo012).toBeDefined();
      expect(geo013).toBeDefined();
      expect(geo014).toBeDefined();
      expect(geo015).toBeDefined();

      expect(geo007?.territorioNombre).toContain("Santa Ana");
      expect(geo012?.territorioNombre).toContain("Barú");
      expect(geo013?.territorioNombre).toContain("Ararca");
      expect(geo014?.territorioNombre).toContain("Caño del Oro");
      expect(geo015?.territorioNombre).toContain("Pontezuela");
    });

    test("mapeo cubre exactamente las 37 mesas canónicas oficiales", () => {
      const codigosOficiales = Object.keys(MAPA_CODIGO_OFICIAL_A_AGENDA);
      expect(codigosOficiales.length).toBe(37);

      const shortcodes = Object.keys(MAPA_SHORTCODE_A_AGENDA);
      expect(shortcodes.length).toBe(37);

      const uuids = Object.keys(MAPA_UUID_A_AGENDA);
      expect(uuids.length).toBe(37);
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

    test("respeta tipo_ubicacion 'coordenada_registrada' y no sobreescribe coordenadas propias [MESA-UBIC-01]", async () => {
      const mockBackendMesas = [
        {
          id: "01a0f5fe-86df-717b-a4d0-5b6605bdf993",
          nombre: "Mesa Territorial con Coordenadas Propias Registradas",
          fecha: "2026-10-15",
          horario: "08:30 – 12:00",
          estado: "PROGRAMADA",
          realizada: false,
          total_asistentes: 0,
          territorio_id: "01a0f5f0-0000-0000-0000-000000000001",
          territorio_nombre: "Centro Histórico",
          territorio_codigo: "loc-1",
          longitud_referencia: -75.5489,
          latitud_referencia: 10.4201,
          tipo_ubicacion: "coordenada_registrada",
          fotos: [],
          codigo_oficial: "MT-L01-01",
          shortcode_ciudadano: "MT101",
          url_mapa: "https://www.google.com/maps/@10.4201,-75.5489,17z",
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
      expect(m.tipo_ubicacion).toBe("coordenada_registrada");
      expect(m.latitud_referencia).toBe(10.4201);
      expect(m.longitud_referencia).toBe(-75.5489);
      expect(m.url_mapa).toBe("https://www.google.com/maps/@10.4201,-75.5489,17z");
    });
  });
});
