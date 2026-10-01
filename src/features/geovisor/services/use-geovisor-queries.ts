import { useQuery } from "@tanstack/react-query";
import { listarTerritoriosGeoJSON, listarCapas, obtenerTerritorio } from "./geovisor-api";
import type { FeatureCollection, CapaEspacial, FiltroTerritorial, TerritorioDetalle } from "../models/geovisor";

export const GEOVISOR_KEYS = {
  geojson: (filtros?: FiltroTerritorial) => ["geovisor", "geojson", filtros] as const,
  capas: ["geovisor", "capas"] as const,
  detalle: (id: string) => ["geovisor", "detalle", id] as const,
};

const MOCK_GEOJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "t1",
      geometry: { type: "Polygon", coordinates: [[[-75.50, 10.40], [-75.45, 10.40], [-75.45, 10.35], [-75.50, 10.35], [-75.50, 10.40]]] },
      properties: {
        id: "t1",
        codigo: "LOC-01",
        nombre: "Histórica y del Caribe Norte",
        tipo: "LOCALIDAD",
        habitantes: 350000,
        area_ha: 1500,
        es_zona_etnica: false,
        alerta_sat: true,
        cienaga_virgen: false,
        calor_ics: 65,
      }
    },
    {
      type: "Feature",
      id: "t2",
      geometry: { type: "Polygon", coordinates: [[[-75.52, 10.35], [-75.45, 10.35], [-75.45, 10.30], [-75.52, 10.30], [-75.52, 10.35]]] },
      properties: {
        id: "t2",
        codigo: "LOC-02",
        nombre: "De la Virgen y Turística",
        tipo: "LOCALIDAD",
        habitantes: 420000,
        area_ha: 2200,
        es_zona_etnica: true,
        alerta_sat: true,
        cienaga_virgen: true,
        calor_ics: 82,
      }
    }
  ]
};

const MOCK_CAPAS: CapaEspacial[] = [
  { id: "c1", slug: "alertas_sat", nombre: "Alertas Tempranas (SAT)", descripcion: "Zonas con alertas tempranas vigentes", tipo_geometria: "POLYGON", color_hex: "var(--danger)", activa: false },
  { id: "c2", slug: "zona_etnica", nombre: "Zonas Étnicas", descripcion: "Asentamientos y resguardos", tipo_geometria: "POLYGON", color_hex: "var(--success)", activa: false },
  { id: "c3", slug: "cienaga", nombre: "Ciénaga de la Virgen", descripcion: "Ronda hídrica", tipo_geometria: "POLYGON", color_hex: "var(--info)", activa: false }
];

export function useTerritoriosGeoJSON(filtros?: FiltroTerritorial) {
  return useQuery({
    queryKey: GEOVISOR_KEYS.geojson(filtros),
    queryFn: async () => {
      try {
        return await listarTerritoriosGeoJSON(filtros);
      } catch {
        return MOCK_GEOJSON;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCapasGeovisor() {
  return useQuery({
    queryKey: GEOVISOR_KEYS.capas,
    queryFn: async () => {
      try {
        return await listarCapas();
      } catch {
        return MOCK_CAPAS;
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useTerritorioDetalle(id: string) {
  return useQuery({
    queryKey: GEOVISOR_KEYS.detalle(id),
    queryFn: async () => {
      try {
        return await obtenerTerritorio(id);
      } catch {
        const feature = MOCK_GEOJSON.features.find(f => f.id === id);
        if (!feature) throw new Error("Not found");
        const detalle: TerritorioDetalle = {
          id: feature.properties.id,
          codigo: feature.properties.codigo,
          nombre: feature.properties.nombre,
          tipo: feature.properties.tipo,
          habitantes: feature.properties.habitantes || 0,
          area_ha: feature.properties.area_ha || 0,
          propuestas_count: 15,
          descripcion: "Descripción simulada del territorio para desarrollo.",
          indicadores: [
            { dimension: "Seguridad Ciudadana", valor: feature.properties.calor_ics || 50, etiqueta: "Índice", tendencia: "estable" }
          ]
        };
        return detalle;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
