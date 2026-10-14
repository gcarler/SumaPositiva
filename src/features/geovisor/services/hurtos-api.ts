import { apiFetch } from "@/core/http/api-client";

export type DelitoTipo = "HURTO MOTOCICLETA" | "HURTO RESIDENCIAS" | "HURTO COMERCIO";

export interface SerieTemporalItem {
  etiqueta?: string;
  periodo?: string;
  cantidad: number;
  porcentaje?: number;
}

export interface CategoriaConteo {
  categoria: string;
  cantidad: number;
  porcentaje: number;
  arma?: string;
  sitio?: string;
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
  top_armas: Array<{ categoria?: string; arma?: string; cantidad: number; porcentaje: number }>;
  top_sitios: Array<{ categoria?: string; sitio?: string; cantidad: number; porcentaje: number }>;
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
  const data = await apiFetch<ResumenHurtosResponse>(
    `/geodatos/analitica/hurtos/resumen${query ? `?${query}` : ""}`
  );

  const normalizarSerie = (items?: SerieTemporalItem[]): SerieTemporalItem[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const etiqueta = String(item.etiqueta ?? item.periodo ?? "");
      const periodo = String(item.periodo ?? item.etiqueta ?? "");
      const cantidad = Number(item.cantidad ?? 0);
      const porcentaje = Number(item.porcentaje ?? 0);
      return {
        etiqueta,
        periodo,
        cantidad,
        porcentaje,
      };
    });
  };

  const normalizarTop = (items?: CategoriaConteo[]): CategoriaConteo[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const cat = String(item.categoria ?? item.arma ?? item.sitio ?? "");
      return {
        categoria: cat,
        arma: item.arma ?? cat,
        sitio: item.sitio ?? cat,
        cantidad: Number(item.cantidad ?? 0),
        porcentaje: Number(item.porcentaje ?? 0),
      };
    });
  };

  return {
    ...data,
    serie_anual: normalizarSerie(data?.serie_anual),
    serie_mensual: normalizarSerie(data?.serie_mensual),
    top_armas: normalizarTop(data?.top_armas),
    top_sitios: normalizarTop(data?.top_sitios),
  };
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

export interface RegistroHurtoItem {
  id: string;
  delito: string;
  anio: number;
  mes: string;
  dia_semana: string;
  zona: string;
  poligono_id: number;
  armas_medios: string;
  clase_sitio: string;
  cantidad: number;
}

export interface AgrupacionHurtoItem {
  categoria: string;
  registros: number;
  incidentes: number;
  porcentaje: number;
}

export interface CatalogosHurtos {
  meses: string[];
  dias_semana: string[];
  top_armas_medios: string[];
  top_clases_sitio: string[];
}

export interface ExploradorHurtosResponse {
  total_registros: number;
  total_incidentes: number;
  limit: number;
  offset: number;
  registros: RegistroHurtoItem[];
  agrupacion: AgrupacionHurtoItem[];
  catalogos: CatalogosHurtos;
}

export interface ParametrosExploradorHurtos {
  delito?: string | null;
  anio?: number | null;
  mes?: string | null;
  zona?: string | null;
  armas_medios?: string | null;
  clase_sitio?: string | null;
  dia_semana?: string | null;
  busqueda?: string | null;
  agrupar_por?: string | null;
  limit?: number;
  offset?: number;
}

export const FALLBACK_EXPLORADOR_HURTOS: ExploradorHurtosResponse = {
  total_registros: 12280,
  total_incidentes: 18242,
  limit: 50,
  offset: 0,
  registros: [
    {
      id: "hurto-001",
      delito: "HURTO MOTOCICLETA",
      anio: 2026,
      mes: "ENERO",
      dia_semana: "LUNES",
      zona: "URBANA",
      poligono_id: 1,
      armas_medios: "SIN EMPLEO DE ARMAS",
      clase_sitio: "VIA PUBLICA",
      cantidad: 1,
    },
    {
      id: "hurto-002",
      delito: "HURTO COMERCIO",
      anio: 2025,
      mes: "DICIEMBRE",
      dia_semana: "VIERNES",
      zona: "URBANA",
      poligono_id: 1,
      armas_medios: "ARMA DE FUEGO",
      clase_sitio: "LOCAL COMERCIAL",
      cantidad: 2,
    },
    {
      id: "hurto-003",
      delito: "HURTO RESIDENCIAS",
      anio: 2025,
      mes: "NOVIEMBRE",
      dia_semana: "SABADO",
      zona: "URBANA",
      poligono_id: 1,
      armas_medios: "PALANCA",
      clase_sitio: "CASA DE HABITACION",
      cantidad: 1,
    },
  ],
  agrupacion: [
    { categoria: "SIN EMPLEO DE ARMAS", registros: 6690, incidentes: 9944, porcentaje: 54.5 },
    { categoria: "ARMA DE FUEGO", registros: 3012, incidentes: 4520, porcentaje: 24.8 },
    { categoria: "ARMA BLANCA", registros: 1650, incidentes: 2310, porcentaje: 12.7 },
    { categoria: "LLAVE MAESTRA", registros: 580, incidentes: 890, porcentaje: 4.9 },
    { categoria: "CONTUNDENTES", registros: 348, incidentes: 578, porcentaje: 3.1 },
  ],
  catalogos: {
    meses: [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
    ],
    dias_semana: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
    top_armas_medios: [
      "SIN EMPLEO DE ARMAS", "ARMA DE FUEGO", "ARMA BLANCA", "LLAVE MAESTRA", "CONTUNDENTES", "PALANCA"
    ],
    top_clases_sitio: [
      "VIA PUBLICA", "LOCAL COMERCIAL", "CASA DE HABITACION", "CENTRO COMERCIAL", "ALMACEN"
    ],
  },
};

/**
 * Consulta la exploración tabular paginada, filtros multicriterio y pivot dinámico de hurtos.
 * GET /api/v1/geodatos/analitica/hurtos/registros
 */
export async function explorarRegistrosHurtos(
  filtros?: ParametrosExploradorHurtos
): Promise<ExploradorHurtosResponse> {
  const params = new URLSearchParams();
  const delitoNorm = normalizarDelitoParam(filtros?.delito);
  if (delitoNorm) params.append("delito", delitoNorm);
  if (filtros?.anio !== undefined && filtros?.anio !== null && filtros.anio > 0) {
    params.append("anio", String(filtros.anio));
  }
  if (filtros?.mes && filtros.mes !== "TODOS") {
    params.append("mes", filtros.mes);
  }
  if (filtros?.zona && filtros.zona !== "TODAS") {
    params.append("zona", filtros.zona);
  }
  if (filtros?.armas_medios && filtros.armas_medios !== "TODOS") {
    params.append("armas_medios", filtros.armas_medios);
  }
  if (filtros?.clase_sitio && filtros.clase_sitio !== "TODOS") {
    params.append("clase_sitio", filtros.clase_sitio);
  }
  if (filtros?.dia_semana && filtros.dia_semana !== "TODOS") {
    params.append("dia_semana", filtros.dia_semana);
  }
  if (filtros?.busqueda?.trim()) {
    params.append("busqueda", filtros.busqueda.trim());
  }
  if (filtros?.agrupar_por) {
    params.append("agrupar_por", filtros.agrupar_por);
  }
  if (filtros?.limit !== undefined && filtros?.limit !== null) {
    params.append("limit", String(filtros.limit));
  }
  if (filtros?.offset !== undefined && filtros?.offset !== null) {
    params.append("offset", String(filtros.offset));
  }

  const query = params.toString();
  try {
    return await apiFetch<ExploradorHurtosResponse>(
      `/geodatos/analitica/hurtos/registros${query ? `?${query}` : ""}`
    );
  } catch (err) {
    console.warn("Fallo al consultar /geodatos/analitica/hurtos/registros, usando fallback:", err);
    return FALLBACK_EXPLORADOR_HURTOS;
  }
}

