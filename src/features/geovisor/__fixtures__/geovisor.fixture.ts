import type { FeatureCollection, CapaEspacial } from "../models/geovisor";

export const MOCK_GEOJSON: FeatureCollection = {
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

export const MOCK_CAPAS: CapaEspacial[] = [
  { id: "c1", slug: "alertas_sat", nombre: "Alertas Tempranas (SAT)", descripcion: "Zonas con alertas tempranas vigentes", tipo_geometria: "POLYGON", color_hex: "var(--danger)", activa: false },
  { id: "c2", slug: "zona_etnica", nombre: "Zonas Étnicas", descripcion: "Asentamientos y resguardos", tipo_geometria: "POLYGON", color_hex: "var(--success)", activa: false },
  { id: "c3", slug: "cienaga", nombre: "Ciénaga de la Virgen", descripcion: "Ronda hídrica", tipo_geometria: "POLYGON", color_hex: "var(--info)", activa: false }
];
