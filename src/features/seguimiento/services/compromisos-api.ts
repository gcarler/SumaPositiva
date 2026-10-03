import { apiFetch } from "@/core/http/api-client";
import type {
  CompromisoInstitucional,
  CompromisoActualizarAvance,
} from "../models/compromiso";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

/**
 * Servicio API para Gestión y Persistencia de Compromisos del PAS (Hito PAS-1 / AUD-01).
 * Conecta con el backend PostgreSQL (/api/v1/compromisos) con fallback al catálogo canónico.
 */

export async function listarCompromisosApi(filtros?: {
  busqueda?: string;
  entidad?: string;
  estado?: string;
}): Promise<CompromisoInstitucional[]> {
  try {
    const params = new URLSearchParams();
    if (filtros?.busqueda) params.set("busqueda", filtros.busqueda);
    if (filtros?.entidad && filtros.entidad !== "todas") params.set("entidad", filtros.entidad);
    if (filtros?.estado && filtros.estado !== "todos") params.set("estado", filtros.estado);

    const query = params.toString();
    const endpoint = `/api/v1/compromisos${query ? `?${query}` : ""}`;
    const data = await apiFetch<CompromisoInstitucional[]>(endpoint);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return COMPROMISOS_PAS_CANONICOS;
  } catch (error) {
    console.warn("Fallo al conectar con /api/v1/compromisos, utilizando catálogo canónico fallback:", error);
    return COMPROMISOS_PAS_CANONICOS;
  }
}

export async function obtenerCompromisoApi(idOcodigo: string): Promise<CompromisoInstitucional> {
  try {
    return await apiFetch<CompromisoInstitucional>(`/api/v1/compromisos/${idOcodigo}`);
  } catch {
    const fallback = COMPROMISOS_PAS_CANONICOS.find((c) => c.id === idOcodigo || c.codigo === idOcodigo);
    if (fallback) return fallback;
    throw new Error(`Compromiso '${idOcodigo}' no encontrado.`);
  }
}

export async function crearCompromisoApi(
  datos: Omit<CompromisoInstitucional, "id">
): Promise<CompromisoInstitucional> {
  return await apiFetch<CompromisoInstitucional>("/api/v1/compromisos", {
    method: "POST",
    body: datos,
  });
}

export async function actualizarAvanceCompromisoApi(
  idOcodigo: string,
  actualizacion: CompromisoActualizarAvance
): Promise<CompromisoInstitucional> {
  return await apiFetch<CompromisoInstitucional>(`/api/v1/compromisos/${idOcodigo}/avance`, {
    method: "PATCH",
    body: actualizacion,
  });
}

export async function eliminarCompromisoApi(idOcodigo: string): Promise<void> {
  await apiFetch<void>(`/api/v1/compromisos/${idOcodigo}`, {
    method: "DELETE",
  });
}
