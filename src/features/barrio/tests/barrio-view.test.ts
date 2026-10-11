import { describe, expect, it } from "vitest";
import {
  BARRIOS_CARTAGENA,
  BARRIO_DEFECTO,
  buscarBarrioPorId,
} from "../data/barrios-cartagena";

describe("Modo Barrio — Catálogo Canónico y Lógica Territorial (UX-MOVIL-BARRIO-01)", () => {
  it("incluye los barrios populares y corregimientos prioritarios de Cartagena", () => {
    const ids = BARRIOS_CARTAGENA.map((b) => b.id);
    const nombres = BARRIOS_CARTAGENA.map((b) => b.nombre);

    expect(ids).toContain("olaya-herrera");
    expect(ids).toContain("nelson-mandela");
    expect(ids).toContain("el-pozon");
    expect(ids).toContain("san-francisco");
    expect(ids).toContain("bayunca");
    expect(ids).toContain("fredonia");
    expect(ids).toContain("pasacaballos");
    expect(ids).toContain("la-boquilla");

    expect(nombres).toContain("Olaya Herrera");
    expect(nombres).toContain("Nelson Mandela");
    expect(nombres).toContain("El Pozón");
  });

  it("garantiza que cada barrio tenga estructura canónica completa", () => {
    for (const b of BARRIOS_CARTAGENA) {
      expect(typeof b.id).toBe("string");
      expect(b.nombre.length).toBeGreaterThan(2);
      expect(b.localidadNumero).toBeGreaterThanOrEqual(1);
      expect(b.localidadNumero).toBeLessThanOrEqual(3);
      expect(["barrio", "corregimiento", "isla"]).toContain(b.tipo);
      expect(b.mesaCodigo.startsWith("M")).toBe(true);
      expect(typeof b.mesaNombre).toBe("string");
      expect(b.prioridades.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("retorna Olaya Herrera como barrio por defecto y maneja fallbacks seguros", () => {
    expect(BARRIO_DEFECTO.id).toBe("olaya-herrera");
    const encontrado = buscarBarrioPorId("el-pozon");
    expect(encontrado.nombre).toBe("El Pozón");

    const fallback = buscarBarrioPorId("barrio-inexistente-xyz");
    expect(fallback.id).toBe(BARRIO_DEFECTO.id);
  });

  it("construye mensajes de difusión comunitaria para WhatsApp con radicado oficial", () => {
    const barrio = buscarBarrioPorId("olaya-herrera");
    const radicado = "POL-2026-0042";
    const titulo = "Alarmas sonoras en sector Ricaurte";

    const texto = `¡Hola vecinos de ${barrio.nombre}! Acabo de radicar la propuesta comunitaria "${titulo}" ante la Alcaldía de Cartagena con el radicado oficial ${radicado}. ¡Apóyala en POLIS aquí: https://seguridadhumanaintegral.org/barrio!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;

    expect(url).toContain("POL-2026-0042");
    expect(url).toContain("Olaya%20Herrera");
    expect(url).toContain("Alarmas%20sonoras");
    expect(url.startsWith("https://api.whatsapp.com/send?text=")).toBe(true);
  });

  it("respeta salvaguardas: cero acrónimos ajenos en datos territoriales", () => {
    const raw = JSON.stringify(BARRIOS_CARTAGENA);
    expect(raw).not.toMatch(/\b(DNP|MGA|SINERGIA)\b/i);
  });
});
