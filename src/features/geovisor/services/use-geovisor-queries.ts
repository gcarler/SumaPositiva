import { useQuery } from "@tanstack/react-query";
import {
  listarTerritoriosGeoJSON,
  listarCapas,
  obtenerTerritorio,
  listarIndicadores,
  listarIndicadoresTerritorio,
} from "./geovisor-api";
import type { FiltroTerritorial, IndicadorFiltros } from "../models/geovisor";

export const GEOVISOR_KEYS = {
  geojson: (filtros?: FiltroTerritorial) => ["geovisor", "geojson", filtros] as const,
  capas: ["geovisor", "capas"] as const,
  detalle: (id: string) => ["geovisor", "detalle", id] as const,
  indicadores: (filtros?: IndicadorFiltros) => ["geovisor", "indicadores", filtros] as const,
  indicadoresTerritorio: (id?: string) => ["geovisor", "territorio-indicadores", id] as const,
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

export function useIndicadoresGeovisor(filtros?: IndicadorFiltros) {
  return useQuery({
    queryKey: GEOVISOR_KEYS.indicadores(filtros),
    queryFn: async () => {
      return await listarIndicadores(filtros);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useIndicadoresTerritorio(territorioId?: string) {
  return useQuery({
    queryKey: GEOVISOR_KEYS.indicadoresTerritorio(territorioId),
    queryFn: async () => {
      if (!territorioId) return [];
      return await listarIndicadoresTerritorio(territorioId);
    },
    enabled: Boolean(territorioId),
    staleTime: 1000 * 60 * 5,
  });
}

