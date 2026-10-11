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

export interface TerritorioResultadoCoordenada {
  id: string;
  codigo: string;
  nombre: string;
  tipo_territorio: string;
  territorio_padre_id?: string | null;
  poblacion_estimada?: number | null;
  estrato_predominante?: number | null;
  es_zona_etnica?: boolean;
  nombre_consejo_comunitario?: string | null;
  coordenadas_centroide?: [number, number] | null;
  metadatos?: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
}

/**
 * Georreferenciación Territorial Inversa:
 * Ubica la división territorial (distrito, localidad, barrio, corregimiento) a partir de coordenadas WGS84 (EPSG:4326).
 * Conecta con backend FastAPI: GET /api/v1/geodatos/territorios/buscar-por-coordenada
 */
export async function buscarTerritorioPorCoordenada(
  lat: number,
  lon: number
): Promise<TerritorioResultadoCoordenada[]> {
  try {
    return await apiFetch<TerritorioResultadoCoordenada[]>(
      `/geodatos/territorios/buscar-por-coordenada?lon=${lon}&lat=${lat}`
    );
  } catch (err) {
    console.warn("Fallo al consultar /geodatos/territorios/buscar-por-coordenada:", err);
    return [];
  }
}

export interface CoordenadasAproximadas {
  latitud: number;
  longitud: number;
}

export interface DireccionEstandarizada {
  direccion_original: string;
  direccion_normalizada: string;
  tipo_via?: string | null;
  numero_principal?: string | null;
  numero_secundario?: string | null;
  sector_o_barrio?: string | null;
  territorio_id?: string | null;
  coordenadas_aproximadas?: CoordenadasAproximadas | null;
  confianza: number;
}

/**
 * Normalizador Inteligente de Direcciones Cartageneras:
 * Estandariza nomenclaturas formales (CL, CR, DG, AV) y sectores populares (Olaya, Pozón, etc.)
 * vinculando coordenadas de referencia y territorio_id distrital.
 * Conecta con backend FastAPI: POST /api/v1/geodatos/estandarizar-direccion
 */
export async function estandarizarDireccion(
  direccionRaw: string
): Promise<DireccionEstandarizada | null> {
  const limpia = direccionRaw?.trim();
  if (!limpia) {
    return null;
  }
  try {
    return await apiFetch<DireccionEstandarizada>("/geodatos/estandarizar-direccion", {
      method: "POST",
      body: JSON.stringify({ direccion_raw: limpia }),
    });
  } catch (err) {
    console.warn("Fallo al estandarizar dirección:", err);
    return null;
  }
}

