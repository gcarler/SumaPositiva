import { describe, expect, it } from "vitest";
import {
  esEnlaceCorto,
  parsearCoordenadasUrl,
  parsearTextoCoordenadas,
  validarLimitesCartagena,
  validarRangoWgs84,
  generarUrlComoLlegar,
} from "./coordenadas-parser";

describe("coordenadas-parser — Parseo de URLs y Coordenadas Planas [MESA-UBIC-01]", () => {
  describe("esEnlaceCorto", () => {
    it("detecta enlaces cortos de Google Maps", () => {
      expect(esEnlaceCorto("https://maps.app.goo.gl/wS3x8bF19D")).toBe(true);
      expect(esEnlaceCorto("https://goo.gl/maps/abc123xyz")).toBe(true);
    });

    it("detecta otros acortadores conocidos", () => {
      expect(esEnlaceCorto("https://bit.ly/cartagena-mesa")).toBe(true);
      expect(esEnlaceCorto("https://tinyurl.com/mesa-ctg")).toBe(true);
    });

    it("no marca URLs completas como enlaces cortos", () => {
      expect(esEnlaceCorto("https://www.google.com/maps/@10.39972,-75.51444,15z")).toBe(false);
      expect(esEnlaceCorto("https://www.openstreetmap.org/#map=16/10.3997/-75.5144")).toBe(false);
    });
  });

  describe("parsearCoordenadasUrl", () => {
    it("ignora enlaces cortos para evitar SSRF en servidor", () => {
      expect(parsearCoordenadasUrl("https://maps.app.goo.gl/wS3x8bF19D")).toBeNull();
    });

    it("parsea Google Maps con arroba (@lat,lng)", () => {
      const url = "https://www.google.com/maps/@10.39972,-75.51444,15z";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.39972, 4);
      expect(coords?.lng).toBeCloseTo(-75.51444, 4);
    });

    it("parsea Google Maps con place y data parameters (!3dLAT!4dLNG)", () => {
      const url = "https://www.google.com/maps/place/Plaza+de+la+Aduana/@10.421523,-75.551982,17z/data=!3m1!4b1!4m6!3m5!1s0x8ef62f7411234567:0x123456789abcdef!8m2!3d10.421523!4d-75.551982!16s%2Fg%2F11b6s_3q9r";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.421523, 4);
      expect(coords?.lng).toBeCloseTo(-75.551982, 4);
    });

    it("parsea Google Maps con parámetro ?q=lat,lng", () => {
      const url = "https://maps.google.com/?q=10.4050,-75.5200";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.4050, 4);
      expect(coords?.lng).toBeCloseTo(-75.5200, 4);
    });

    it("parsea Google Maps con parámetro &query=lat,lng", () => {
      const url = "https://www.google.com/maps/search/?api=1&query=10.4123,-75.5345";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.4123, 4);
      expect(coords?.lng).toBeCloseTo(-75.5345, 4);
    });

    it("parsea Waze con parámetro ?ll=lat,lng", () => {
      const url = "https://waze.com/ul?ll=10.3955,-75.4988&navigate=yes";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.3955, 4);
      expect(coords?.lng).toBeCloseTo(-75.4988, 4);
    });

    it("parsea OpenStreetMap con hash #map=zoom/lat/lon", () => {
      const url = "https://www.openstreetmap.org/#map=16/10.4011/-75.5022";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.4011, 4);
      expect(coords?.lng).toBeCloseTo(-75.5022, 4);
    });

    it("parsea OpenStreetMap con mlat y mlon", () => {
      const url = "https://www.openstreetmap.org/?mlat=10.4011&mlon=-75.5022#map=16/10.4011/-75.5022";
      const coords = parsearCoordenadasUrl(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.4011, 4);
      expect(coords?.lng).toBeCloseTo(-75.5022, 4);
    });

    it("retorna null ante URL vacía o sin coordenadas reconocibles", () => {
      expect(parsearCoordenadasUrl("")).toBeNull();
      expect(parsearCoordenadasUrl("https://example.com")).toBeNull();
      expect(parsearCoordenadasUrl("https://google.com/search?q=cartagena")).toBeNull();
    });
  });

  describe("parsearTextoCoordenadas", () => {
    it("parsea formato estándar separado por coma", () => {
      const coords = parsearTextoCoordenadas("10.39972, -75.51444");
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.39972, 4);
      expect(coords?.lng).toBeCloseTo(-75.51444, 4);
    });

    it("parsea formato separado por punto y coma", () => {
      const coords = parsearTextoCoordenadas("10.39972; -75.51444");
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.39972, 4);
      expect(coords?.lng).toBeCloseTo(-75.51444, 4);
    });

    it("parsea formato separado por espacio", () => {
      const coords = parsearTextoCoordenadas("10.39972   -75.51444");
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.39972, 4);
      expect(coords?.lng).toBeCloseTo(-75.51444, 4);
    });

    it("parsea formato etiquetado lat/lng", () => {
      const coords = parsearTextoCoordenadas("lat: 10.39972, lng: -75.51444");
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(10.39972, 4);
      expect(coords?.lng).toBeCloseTo(-75.51444, 4);
    });

    it("retorna null si las coordenadas están fuera de rango WGS84", () => {
      expect(parsearTextoCoordenadas("95.0, -75.51444")).toBeNull(); // lat > 90
      expect(parsearTextoCoordenadas("10.39, -195.51444")).toBeNull(); // lng < -180
    });

    it("retorna null si el texto no contiene dos números", () => {
      expect(parsearTextoCoordenadas("")).toBeNull();
      expect(parsearTextoCoordenadas("solo texto")).toBeNull();
      expect(parsearTextoCoordenadas("10.39972")).toBeNull();
    });
  });

  describe("validarLimitesCartagena", () => {
    it("confirma coordenadas dentro del Distrito de Cartagena", () => {
      // Centro Histórico
      expect(validarLimitesCartagena(10.4215, -75.5519).dentroDeCartagena).toBe(true);
      // El Pozón
      expect(validarLimitesCartagena(10.3997, -75.4650).dentroDeCartagena).toBe(true);
      // Barú
      expect(validarLimitesCartagena(10.2200, -75.6100).dentroDeCartagena).toBe(true);
    });

    it("emite advertencia no bloqueante para coordenadas fuera de Cartagena", () => {
      // Bogotá
      const resBogota = validarLimitesCartagena(4.7110, -74.0721);
      expect(resBogota.dentroDeCartagena).toBe(false);
      expect(resBogota.advertencia).toContain("fuera del Distrito de Cartagena");

      // Medellín
      const resMedellin = validarLimitesCartagena(6.2442, -75.5812);
      expect(resMedellin.dentroDeCartagena).toBe(false);
      expect(resMedellin.advertencia).toBeDefined();
    });
  });

  describe("validarRangoWgs84", () => {
    it("valida rangos latitud y longitud wgs84", () => {
      expect(validarRangoWgs84(10.39, -75.51)).toBe(true);
      expect(validarRangoWgs84(95, -75.51)).toBe(false);
      expect(validarRangoWgs84(10.39, 185)).toBe(false);
    });
  });

  describe("generarUrlComoLlegar", () => {
    it("genera enlace universal a Google Maps para navegación", () => {
      const url = generarUrlComoLlegar(10.39972, -75.51444);
      expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=10.39972,-75.51444");
    });
  });
});
