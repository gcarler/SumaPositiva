import "server-only";
import { cache } from "react";
import { FORMULARIOS_MOCK } from "../data/formularios.mock";
import { formularioSchema } from "./formulario-schema";
import type { Formulario } from "../models/formulario";
const base = () =>
  `${process.env.POLIS_BACKEND_URL ?? "http://127.0.0.1:8000"}/api/v1/formularios/publicos`;
export const obtenerFormularioPublico = cache(
  async (slug: string): Promise<Formulario | "borrador" | null> => {
    const ejemplo = FORMULARIOS_MOCK.find((f) => f.configuracion.slug === slug);
    if (ejemplo) return structuredClone(ejemplo);
    const r = await fetch(`${base()}/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (r.status === 404) return null;
    if (r.status === 403) return "borrador";
    if (!r.ok) throw new Error("No se pudo consultar el formulario publicado");
    return formularioSchema.parse(await r.json());
  },
);
export async function slugsPublicados(): Promise<string[]> {
  const r = await fetch(base(), { next: { revalidate: 60 } });
  if (!r.ok)
    throw new Error(
      "No se pudo consultar el catálogo público para generar páginas",
    );
  const forms = formularioSchema.array().parse(await r.json());
  return [
    ...new Set(
      [...FORMULARIOS_MOCK, ...forms]
        .filter((f) => f.estado === "activo")
        .map((f) => f.configuracion.slug),
    ),
  ];
}
