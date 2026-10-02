import { expect, test } from "vitest";
import { generarSlug, enlacesCompartir, urlFormulario } from "./formulario-url";
test("normaliza tildes y genera slugs distintos para el mismo título y milisegundo", () => {
  const ids = Array.from({ length: 1000 }, () =>
    generarSlug("Diagnóstico del Barrio: ¡Participación!"),
  );
  expect(new Set(ids).size).toBe(1000);
  expect(ids[0]).toMatch(/^diagnostico-del-barrio-participacion-[a-f0-9]{8}$/);
  expect(generarSlug("🗺️")).toMatch(/^formulario-/);
});
test("codifica título y URL sin romper enlaces de compartir", () => {
  const url = urlFormulario("consulta-2026");
  const title = "Salud & participación / Cartagena";
  const links = enlacesCompartir(title, url);
  expect(new URL(links.whatsapp).searchParams.get("text")).toBe(
    `Participa en "${title}"\n${url}`,
  );
  expect(new URL(links.telegram).searchParams.get("url")).toBe(url);
  expect(new URL(links.telegram).searchParams.get("text")).toBe(title);
  expect(new URL(links.correo).searchParams.get("subject")).toBe(title);
  expect(new URL(links.qr).searchParams.get("data")).toBe(url);
});
