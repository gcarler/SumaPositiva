import { apiFetch } from "@/core/http/api-client";

export type DelitoTipo = "HURTO MOTOCICLETA" | "HURTO RESIDENCIAS" | "HURTO COMERCIO";

export interface SerieTemporalItem {
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
}

export interface CategoriaConteo {
  categoria: string;
  cantidad: number;
  porcentaje: number;
}

export interface DistribucionZonaItem {
  zona: string;
  cantidad: number;
  porcentaje: number;
}

export interface ResumenHurtosResponse {
  total_casos: number;
  delito?: string | null;
  anio?: number | null;
  zona?: string | null;
  serie_anual: SerieTemporalItem[];
  serie_mensual: SerieTemporalItem[];
  top_armas: CategoriaConteo[];
  top_sitios: CategoriaConteo[];
  distribucion_zona: DistribucionZonaItem[];
}

export interface HurtoPoligonoProperties {
  poligono_id: number;
  codigo: string;
  nombre: string;
  zona: string;
  area_km2: number;
  total_casos: number;
  densidad_casos_km2: number;
  porcentaje_total: number;
  top_armas: Array<{ arma: string; cantidad: number; porcentaje: number }>;
  top_sitios: Array<{ sitio: string; cantidad: number; porcentaje: number }>;
}

export interface HurtoFeature {
  type: "Feature";
  id: number;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: HurtoPoligonoProperties;
}

export interface HurtosFeatureCollection {
  type: "FeatureCollection";
  features: HurtoFeature[];
}

export interface ParametrosFiltroHurtos {
  delito?: string | null;
  anio?: number | null;
  zona?: string | null;
}

export function normalizarDelitoParam(delito?: string | null): string | undefined {
  if (!delito || delito === "TODOS" || delito === "todos") return undefined;
  const d = delito.trim().toLowerCase();
  if (d.includes("moto")) return "HURTO MOTOCICLETA";
  if (d.includes("resid")) return "HURTO RESIDENCIAS";
  if (d.includes("comerc")) return "HURTO COMERCIO";
  return delito;
}

/**
 * Consulta el resumen analítico estructurado de hurtos 2018-2026.
 * GET /api/v1/geodatos/analitica/hurtos/resumen
 */
export async function obtenerResumenHurtos(
  filtros?: ParametrosFiltroHurtos
): Promise<ResumenHurtosResponse> {
  const params = new URLSearchParams();
  const delitoNorm = normalizarDelitoParam(filtros?.delito);
  if (delitoNorm) params.append("delito", delitoNorm);
  if (filtros?.anio !== undefined && filtros?.anio !== null && filtros.anio > 0) {
    params.append("anio", String(filtros.anio));
  }
  if (filtros?.zona && filtros.zona !== "TODAS") {
    params.append("zona", filtros.zona);
  }

  const query = params.toString();
  return apiFetch<ResumenHurtosResponse>(
    `/geodatos/analitica/hurtos/resumen${query ? `?${query}` : ""}`
  );
}

/**
 * Obtiene el FeatureCollection ligero (< 150 KB) con los polígonos urbano y rural
 * enriquecidos con métricas analíticas de delitos.
 * GET /api/v1/geodatos/analitica/hurtos/geojson
 */
export async function obtenerPoligonosHurtosGeojson(
  filtros?: ParametrosFiltroHurtos
): Promise<HurtosFeatureCollection> {
  const params = new URLSearchParams();
  const delitoNorm = normalizarDelitoParam(filtros?.delito);
  if (delitoNorm) params.append("delito", delitoNorm);
  if (filtros?.anio !== undefined && filtros?.anio !== null && filtros.anio > 0) {
    params.append("anio", String(filtros.anio));
  }
  if (filtros?.zona && filtros.zona !== "TODAS") {
    params.append("zona", filtros.zona);
  }

  const query = params.toString();
  return apiFetch<HurtosFeatureCollection>(
    `/geodatos/analitica/hurtos/geojson${query ? `?${query}` : ""}`
  );
}
