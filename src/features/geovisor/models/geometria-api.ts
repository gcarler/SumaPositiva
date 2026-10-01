import { z } from "zod";
export const geometriaApiSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: z
        .object({ type: z.string(), coordinates: z.array(z.unknown()) })
        .nullable(),
      properties: z
        .object({
          id: z.string(),
          nombre: z.string(),
          codigo: z.string(),
          tipo_territorio: z.string(),
        })
        .passthrough(),
    }),
  ),
});
export type GeometriaApi = z.infer<typeof geometriaApiSchema>;
