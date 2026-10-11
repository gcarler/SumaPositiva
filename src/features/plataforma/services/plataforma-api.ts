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
const databaseQueryStat = z.object({
  query: z.string(),
  calls: z.number(),
  total_ms: z.number(),
  mean_ms: z.number(),
  rows: z.number(),
  hit_ratio_pct: z.number(),
});

const databaseTelemetryResponse = z.object({
  status: z.enum(["ok", "degraded", "unavailable"]),
  timestamp: z.string(),
  total_queries_recorded: z.number(),
  cache_hit_ratio_pct: z.number(),
  top_queries: z.array(databaseQueryStat),
});

export type DatabaseQueryStat = z.infer<typeof databaseQueryStat>;
export type DatabaseTelemetryResponse = z.infer<typeof databaseTelemetryResponse>;

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
  telemetriaSql: (
    limite = 10,
    ordenarPor: "tiempo_total" | "tiempo_medio" | "llamadas" = "tiempo_total",
  ) =>
    leer(
      `/health/database/queries?limite=${limite}&ordenar_por=${ordenarPor}`,
      databaseTelemetryResponse,
    ),
};

