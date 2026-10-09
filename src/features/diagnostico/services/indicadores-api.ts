import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  FichaIndicador,
  FichaIndicadorCrearPayload,
  FichaIndicadorActualizarPayload,
  MedicionIndicadorCrear,
  MedicionIndicadorRespuesta,
} from "../models/indicador";

export function normalizarFicha(item: Record<string, unknown>): FichaIndicador {
  return {
    id: String(item.id ?? ""),
    codigo: String(item.codigo ?? ""),
    nombre: String(item.nombre ?? ""),
    tipo_indicador: (item.tipo_indicador as FichaIndicador["tipo_indicador"]) ?? "resultado",
    linea_estrategica_id: item.linea_estrategica_id ? String(item.linea_estrategica_id) : null,
    dimension_id: item.dimension_id ? String(item.dimension_id) : null,
    nodo_instrumento_id: item.nodo_instrumento_id ? String(item.nodo_instrumento_id) : null,
    definicion: String(item.definicion ?? ""),
    metodo_calculo: String(item.metodo_calculo ?? ""),
    unidad_medida: String(item.unidad_medida ?? ""),
    sentido_esperado: (item.sentido_esperado as FichaIndicador["sentido_esperado"]) ?? "ascendente",
    periodicidad: String(item.periodicidad ?? "Anual"),
    linea_base_valor: item.linea_base_valor !== undefined ? String(item.linea_base_valor) : "0",
    linea_base_anio: Number(item.linea_base_anio ?? 2023),
    meta_cuatrienio: item.meta_cuatrienio !== undefined ? String(item.meta_cuatrienio) : "0",
    meta_anualizada: (item.meta_anualizada as Record<string, unknown>) ?? {},
    fuente_datos: String(item.fuente_datos ?? "Distrito de Cartagena"),
    responsable_reporte: String(item.responsable_reporte ?? "Secretaría del Interior"),
    metadatos: (item.metadatos as Record<string, unknown>) ?? {},
    valor_actual: item.valor_actual !== undefined ? String(item.valor_actual) : "0",
    porcentaje_avance: item.porcentaje_avance !== undefined ? String(item.porcentaje_avance) : "0",
    creado_en: item.creado_en ? String(item.creado_en) : undefined,
    actualizado_en: item.actualizado_en ? String(item.actualizado_en) : undefined,
  };
}

/**
 * Consulta el catálogo de fichas de indicadores desde PostgreSQL (/api/v1/indicadores/fichas).
 * Backend es la fuente de verdad. Erradicado fallback silencioso (H-04).
 */
export async function listarFichasIndicadores(): Promise<FichaIndicador[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/indicadores/fichas");
  if (Array.isArray(raw)) {
    return raw.map(normalizarFicha);
  }
  return [];
}

/**
 * Consulta el detalle de una ficha técnica de indicador por ID desde PostgreSQL.
 * Erradicado fallback silencioso (H-04).
 */
export async function obtenerFichaIndicador(id: string): Promise<FichaIndicador> {
  const raw = await apiFetch<Record<string, unknown>>(`/indicadores/fichas/${id}`);
  if (raw && raw.id) {
    return normalizarFicha(raw);
  }
  throw new Error(`Ficha de indicador ${id} no encontrada`);
}

export async function registrarMedicionIndicador(
  fichaId: string,
  datos: MedicionIndicadorCrear
): Promise<MedicionIndicadorRespuesta> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return await apiFetch<MedicionIndicadorRespuesta>(
    `/indicadores/fichas/${fichaId}/mediciones`,
    {
      method: "POST",
      body: datos,
      headers,
    }
  );
}

export async function crearFichaIndicador(
  datos: FichaIndicadorCrearPayload
): Promise<FichaIndicador> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const raw = await apiFetch<Record<string, unknown>>("/indicadores/fichas", {
    method: "POST",
    body: datos,
    headers,
  });
  return normalizarFicha(raw);
}

export async function actualizarFichaIndicador(
  id: string,
  datos: FichaIndicadorActualizarPayload
): Promise<FichaIndicador> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const raw = await apiFetch<Record<string, unknown>>(`/indicadores/fichas/${id}`, {
    method: "PATCH",
    body: datos,
    headers,
  });
  return normalizarFicha(raw);
}
