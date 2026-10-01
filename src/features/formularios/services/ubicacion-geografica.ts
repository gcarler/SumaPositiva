import { z } from "zod";
import type { Formulario, RespuestaCiudadana } from "../models/formulario";

const puntoSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([
    z.number().finite().min(-180).max(180),
    z.number().finite().min(-90).max(90),
  ]),
  origen: z.enum(["mapa", "coordenadas", "gps"]).optional(),
  precisionMetros: z.number().finite().nonnegative().optional(),
  referencia: z.string().max(240).optional(),
});
export type PuntoRespuesta = z.infer<typeof puntoSchema>;
export function leerPunto(
  valor: string | string[] | undefined,
): PuntoRespuesta | undefined {
  if (typeof valor !== "string" || !valor) return;
  try {
    const dato: unknown = JSON.parse(valor);
    const resultado = puntoSchema.safeParse(dato);
    return resultado.success ? resultado.data : undefined;
  } catch {
    return;
  }
}
export function textoPunto(valor: string | string[] | undefined): string {
  const p = leerPunto(valor);
  if (!p) return "";
  return `Latitud: ${p.coordinates[1].toFixed(6)}; Longitud: ${p.coordinates[0].toFixed(6)}${p.referencia ? `; ${p.referencia}` : ""}`;
}
export function generarGeoJson(
  form: Formulario,
  respuestas: RespuestaCiudadana[],
) {
  const preguntas = form.preguntas.filter(
    (p) => p.tipo === "ubicacion_geografica",
  );
  return {
    type: "FeatureCollection" as const,
    features: respuestas
      .filter((r) => r.formularioId === form.id)
      .flatMap((r) =>
        preguntas.flatMap((p) => {
          const punto = leerPunto(r.respuestas[p.id]);
          return punto
            ? [
                {
                  type: "Feature" as const,
                  geometry: {
                    type: "Point" as const,
                    coordinates: punto.coordinates,
                  },
                  properties: {
                    respuestaId: r.id,
                    preguntaId: p.id,
                    pregunta: p.texto,
                    enviadoEn: r.enviadoEn,
                    referencia: punto.referencia ?? "",
                    origen: punto.origen ?? "coordenadas",
                    precisionMetros: punto.precisionMetros ?? null,
                  },
                },
              ]
            : [];
        }),
      ),
  };
}
export function descargarGeoJson(
  form: Formulario,
  respuestas: RespuestaCiudadana[],
) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(generarGeoJson(form, respuestas), null, 2)], {
      type: "application/geo+json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `formulario-${form.id}-puntos.geojson`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
