export type TipoTerritorio = "LOCALIDAD" | "UCOMUNERA" | "CORREGIMIENTO" | "ISLA";

export type GeoJSONPosition = [number, number] | [number, number, number];
export type GeoJSONCoordinates =
  | GeoJSONPosition
  | GeoJSONPosition[]
  | GeoJSONPosition[][]
  | GeoJSONPosition[][][];

export interface GeoJSONGeometry {
  type: "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | string;
  coordinates: GeoJSONCoordinates;
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
  slug?: string;
  codigo?: string;
  nombre: string;
  descripcion: string;
  categoria?: string;
  tipo_geometria: "POLYGON" | "POINT" | "LINESTRING" | string;
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

export interface IndicadorMultifuente {
  id: string;
  territorio_id: string;
  dimension_id?: string | null;
  codigo_indicador: string;
  nombre_indicador: string;
  valor: number | string;
  unidad_medida: string;
  nivel_riesgo: "bajo" | "medio" | "alto" | "critico" | string;
  anio_corte: number;
  fuente_datos: string;
  metadatos?: {
    url_fuente?: string;
    nota_origen?: string;
    fecha_extraccion?: string;
    ambito?: string;
    subtipo?: string;
    dataset_id?: string;
    dimension_seguridad_humana?: string;
    [key: string]: unknown;
  } | null;
  codigo_territorio?: string;
  nombre_territorio?: string;
  codigo_dimension?: string;
  nombre_dimension?: string;
}

export interface IndicadorFiltros {
  limit?: number;
  offset?: number;
  dimension?: string;
  fuente_datos?: string;
  codigo_territorio?: string;
  territorio_id?: string;
  anio_corte?: number;
  busqueda?: string;
}

export interface RespuestaIndicadores {
  total: number;
  limit: number;
  offset: number;
  indicadores: IndicadorMultifuente[];
}

