export type TipoTerritorio = "LOCALIDAD" | "UCOMUNERA" | "CORREGIMIENTO" | "ISLA";

export interface GeoJSONGeometry {
  type: string;
  coordinates: any[];
}

export interface IndicadorSeguridad {
  dimension: string;
  valor: number;
  etiqueta: string;
  tendencia: "sube" | "baja" | "estable";
}

export interface TerritorioFeatureProperties {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoTerritorio;
  habitantes?: number;
  area_ha?: number;
  es_zona_etnica?: boolean;
  alerta_sat?: boolean;
  cienaga_virgen?: boolean;
  calor_ics?: number; // Índice de Calor de Seguridad 0-100
  color_hex?: string;
}

export interface TerritorioFeature {
  type: "Feature";
  id: string;
  geometry: GeoJSONGeometry;
  properties: TerritorioFeatureProperties;
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: TerritorioFeature[];
}

export interface CapaEspacial {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  tipo_geometria: "POLYGON" | "POINT" | "LINESTRING";
  color_hex: string;
  activa: boolean;
}

export interface FiltroTerritorial {
  tipo?: TipoTerritorio;
  es_zona_etnica?: boolean;
  alerta_sat?: boolean;
  busqueda?: string;
}

export interface TerritorioDetalle {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoTerritorio;
  habitantes: number;
  area_ha: number;
  indicadores: IndicadorSeguridad[];
  propuestas_count: number;
  descripcion: string;
}
