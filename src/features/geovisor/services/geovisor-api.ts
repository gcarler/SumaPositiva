import { apiFetch } from "@/core/http/api-client";
import type { FeatureCollection, CapaEspacial, TerritorioDetalle, FiltroTerritorial } from "../models/geovisor";

export async function listarTerritoriosGeoJSON(filtros?: FiltroTerritorial): Promise<FeatureCollection> {
  const params = new URLSearchParams();
  if (filtros?.tipo) params.append("tipo", filtros.tipo);
  if (filtros?.es_zona_etnica) params.append("es_zona_etnica", "true");
  if (filtros?.alerta_sat) params.append("alerta_sat", "true");
  if (filtros?.busqueda) params.append("busqueda", filtros.busqueda);
  
  const query = params.toString();
  return apiFetch<FeatureCollection>(`/geodatos/territorios/geojson${query ? `?${query}` : ""}`);
}

export async function listarCapas(): Promise<CapaEspacial[]> {
  return apiFetch<CapaEspacial[]>("/geodatos/capas");
}

export async function obtenerTerritorio(id: string): Promise<TerritorioDetalle> {
  return apiFetch<TerritorioDetalle>(`/geodatos/territorios/${id}`);
}
