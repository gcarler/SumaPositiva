import {useQuery} from "@tanstack/react-query";
import {listarTerritoriosGeoJSON, listarCapas, obtenerTerritorio} from "./geovisor-api";
import type {FiltroTerritorial} from "../models/geovisor";

export const GEOVISOR_KEYS = {
  geojson: (filtros?: FiltroTerritorial) => ["geovisor", "geojson", filtros] as const,
  capas: ["geovisor", "capas"] as const,
  detalle: (id: string) => ["geovisor", "detalle", id] as const,
};

export function useTerritoriosGeoJSON(filtros?: FiltroTerritorial) {
  return useQuery({
    queryKey: GEOVISOR_KEYS.geojson(filtros),
    queryFn: async () => {
      return await listarTerritoriosGeoJSON(filtros);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCapasGeovisor() {
  return useQuery({
    queryKey: GEOVISOR_KEYS.capas,
    queryFn: async () => {
      return await listarCapas();
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useTerritorioDetalle(id: string) {
  return useQuery({
    queryKey: GEOVISOR_KEYS.detalle(id),
    queryFn: async () => {
      return await obtenerTerritorio(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
