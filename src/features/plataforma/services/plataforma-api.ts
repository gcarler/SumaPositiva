import { z } from "zod";
import { geometriaApiSchema } from "@/features/geovisor/models/geometria-api";
import { apiFetch } from "@/core/http/api-client";
const territorio = z.object({
  id: z.string(),
  nombre: z.string(),
  codigo: z.string(),
  tipo_territorio: z.string(),
  poblacion_estimada: z.number().nullable().optional(),
});
const fase = z.object({
  id: z.string(),
  nombre: z.string(),
  codigo: z.string(),
  estado: z.string(),
  progreso_porcentaje: z.union([z.number(), z.string()]),
  reglas_participacion: z.record(z.string(), z.unknown()).optional(),
});
const linea = z.object({
  id: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  fase_id: z.string(),
  entidad_lider: z.string(),
});
const aportes = z.object({
  total: z.number(),
  elementos: z.array(
    z.object({
      id: z.string(),
      titulo: z.string(),
      descripcion: z.string().optional(),
      tipo_aporte: z.string(),
      estado: z.string(),
      creado_en: z.string(),
    }),
  ),
});
async function leer<T>(ruta: string, schema: z.ZodType<T>) {
  return schema.parse(await apiFetch<unknown>(ruta));
}
export const plataformaApi = {
  territorios: () => leer("/geodatos/territorios", z.array(territorio)),
  geometria: () => leer("/geodatos/territorios/geojson", geometriaApiSchema),
  fases: () => leer("/politicas/fases", z.array(fase)),
  lineas: () => leer("/politicas/lineas", z.array(linea)),
  aportes: (alertas = false) =>
    leer(
      `/aportes?limite=${alertas ? 5 : 20}${alertas ? "&tipo_aporte=alerta_comunitaria" : ""}`,
      aportes,
    ),
};
