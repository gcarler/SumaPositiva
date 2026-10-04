import { apiFetch } from "@/core/http/api-client";
import type {
  AlternativaSolucion,
  EstadoAlternativa,
  SectorMGA,
} from "../models/alternativa";
import { ALTERNATIVAS_CANONICAS } from "../data/alternativas-canonicas.data";
import type { FiltrosAlternativas } from "../state/alternativas-store";

export interface AlternativaApiRespuesta {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  sector: string;
  linea_estrategica_id?: string | null;
  linea_estrategica_codigo?: string | null;
  dimension_id?: string | null;
  dimension_codigo?: string | null;
  costo_estimado_cop: number | string;
  horizonte_anios: number;
  estado: string;
  requiere_consulta_previa: boolean;
  territorios_focalizados?: unknown[];
  territorio_cobertura?: string | null;
  poblacion_objetivo_estimada: number;
  objetivo_central?: string | null;
  fuentes_financiacion_sugeridas?: string[];
  metadatos?: Record<string, unknown>;
  creado_en: string;
  actualizado_en: string;
}

export function mapearAlternativaDesdeApi(
  api: AlternativaApiRespuesta
): AlternativaSolucion {
  return {
    id: api.id,
    codigo: api.codigo,
    nombre: api.nombre,
    descripcion: api.descripcion || "",
    sector: api.sector as SectorMGA,
    linea_estrategica_codigo: api.linea_estrategica_codigo || "LE-01",
    dimension_id: api.dimension_codigo || "personal",
    objetivo_central_mga: api.objetivo_central || "",
    territorio_cobertura: api.territorio_cobertura || "",
    poblacion_objetivo_estimada: Number(api.poblacion_objetivo_estimada) || 0,
    costo_estimado_cop: Number(api.costo_estimado_cop) || 0,
    horizonte_anios: Number(api.horizonte_anios) || 4,
    fuentes_financiacion_sugeridas: Array.isArray(api.fuentes_financiacion_sugeridas)
      ? api.fuentes_financiacion_sugeridas
      : [],
    estado: api.estado as EstadoAlternativa,
    requiere_consulta_previa: Boolean(api.requiere_consulta_previa),
    metadatos: api.metadatos || {},
    creado_en: api.creado_en,
    actualizado_en: api.actualizado_en,
  };
}

export function mapearAlternativaHaciaPayload(
  datos: Partial<AlternativaSolucion> & { justificacion_motivada?: string }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (datos.codigo !== undefined) payload.codigo = datos.codigo;
  if (datos.nombre !== undefined) payload.nombre = datos.nombre;
  if (datos.descripcion !== undefined) payload.descripcion = datos.descripcion;
  if (datos.sector !== undefined) payload.sector = datos.sector;
  if (datos.linea_estrategica_codigo !== undefined)
    payload.linea_estrategica_codigo = datos.linea_estrategica_codigo;
  if (datos.dimension_id !== undefined)
    payload.dimension_codigo = datos.dimension_id;
  if (datos.objetivo_central_mga !== undefined)
    payload.objetivo_central = datos.objetivo_central_mga;
  if (datos.territorio_cobertura !== undefined)
    payload.territorio_cobertura = datos.territorio_cobertura;
  if (datos.poblacion_objetivo_estimada !== undefined)
    payload.poblacion_objetivo_estimada = Number(datos.poblacion_objetivo_estimada);
  if (datos.costo_estimado_cop !== undefined)
    payload.costo_estimado_cop = Number(datos.costo_estimado_cop);
  if (datos.horizonte_anios !== undefined)
    payload.horizonte_anios = Number(datos.horizonte_anios);
  if (datos.fuentes_financiacion_sugeridas !== undefined)
    payload.fuentes_financiacion_sugeridas = datos.fuentes_financiacion_sugeridas;
  if (datos.estado !== undefined) payload.estado = datos.estado;
  if (datos.requiere_consulta_previa !== undefined)
    payload.requiere_consulta_previa = datos.requiere_consulta_previa;
  if (datos.metadatos !== undefined) payload.metadatos = datos.metadatos;
  if (datos.justificacion_motivada !== undefined)
    payload.justificacion_motivada = datos.justificacion_motivada;

  return payload;
}

export async function listarAlternativasApi(
  filtros?: Partial<FiltrosAlternativas>
): Promise<{ datos: AlternativaSolucion[]; esContingencia: boolean }> {
  try {
    const params = new URLSearchParams();
    if (filtros?.busqueda?.trim()) params.set("busqueda", filtros.busqueda.trim());
    if (filtros?.sector && filtros.sector !== "todos") params.set("sector", filtros.sector);
    if (filtros?.linea && filtros.linea !== "todas") params.set("linea", filtros.linea);
    if (filtros?.dimension && filtros.dimension !== "todas")
      params.set("dimension", filtros.dimension);
    if (filtros?.estado && filtros.estado !== "todos") params.set("estado", filtros.estado);
    if (filtros?.enfoqueEtnico && filtros.enfoqueEtnico !== "todos")
      params.set("enfoque_etnico", filtros.enfoqueEtnico);

    const query = params.toString() ? `?${params.toString()}` : "";
    const items = await apiFetch<AlternativaApiRespuesta[]>(`/alternativas${query}`);
    return {
      datos: items.map(mapearAlternativaDesdeApi),
      esContingencia: false,
    };
  } catch (error) {
    console.warn(
      "Aviso de contingencia: no fue posible conectar con el servidor para consultar alternativas MGA. Usando catálogo local.",
      error
    );
    return {
      datos: ALTERNATIVAS_CANONICAS,
      esContingencia: true,
    };
  }
}

export async function obtenerAlternativaApi(
  idOCodigo: string
): Promise<AlternativaSolucion> {
  const item = await apiFetch<AlternativaApiRespuesta>(
    `/alternativas/${encodeURIComponent(idOCodigo)}`
  );
  return mapearAlternativaDesdeApi(item);
}

export async function crearAlternativaApi(
  datos: Omit<AlternativaSolucion, "id" | "creado_en" | "actualizado_en">
): Promise<AlternativaSolucion> {
  const payload = mapearAlternativaHaciaPayload(datos);
  const creado = await apiFetch<AlternativaApiRespuesta>("/alternativas", {
    method: "POST",
    body: payload,
  });
  return mapearAlternativaDesdeApi(creado);
}

export async function actualizarAlternativaApi(
  id: string,
  cambios: Partial<AlternativaSolucion>,
  justificacion?: string
): Promise<AlternativaSolucion> {
  const payload = mapearAlternativaHaciaPayload({
    ...cambios,
    justificacion_motivada: justificacion,
  });
  const actualizado = await apiFetch<AlternativaApiRespuesta>(
    `/alternativas/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: payload,
    }
  );
  return mapearAlternativaDesdeApi(actualizado);
}

export async function eliminarAlternativaApi(id: string): Promise<boolean> {
  await apiFetch(`/alternativas/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return true;
}
