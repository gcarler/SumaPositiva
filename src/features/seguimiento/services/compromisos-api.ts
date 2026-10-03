import { apiFetch } from "@/core/http/api-client";
import type {
  CompromisoInstitucional,
  CompromisoActualizarAvance,
} from "../models/compromiso";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

export interface ListadoCompromisosRespuesta {
  datos: CompromisoInstitucional[];
  esContingencia: boolean;
  origen: "backend" | "contingencia";
}

/**
 * Servicio API para Gestión y Persistencia de Compromisos del PAS (Hito PAS-1 / AUD-01).
 * Conecta con el backend PostgreSQL (/api/v1/compromisos).
 */

export async function listarCompromisosApi(filtros?: {
  busqueda?: string;
  entidad?: string;
  estado?: string;
}): Promise<ListadoCompromisosRespuesta> {
  try {
    const params = new URLSearchParams();
    if (filtros?.busqueda) params.set("busqueda", filtros.busqueda);
    if (filtros?.entidad && filtros.entidad !== "todas") params.set("entidad", filtros.entidad);
    if (filtros?.estado && filtros.estado !== "todos") params.set("estado", filtros.estado);

    const query = params.toString();
    const endpoint = `/api/v1/compromisos${query ? `?${query}` : ""}`;
    const data = await apiFetch<CompromisoInstitucional[]>(endpoint);
    // Si la API responde con un array (incluso vacío []), es respuesta legítima del backend
    if (Array.isArray(data)) {
      return {
        datos: data,
        esContingencia: false,
        origen: "backend",
      };
    }
    // Formato anómalo
    return {
      datos: COMPROMISOS_PAS_CANONICOS,
      esContingencia: true,
      origen: "contingencia",
    };
  } catch (error) {
    console.warn("Fallo al conectar con /api/v1/compromisos, utilizando catálogo de contingencia:", error);
    return {
      datos: COMPROMISOS_PAS_CANONICOS,
      esContingencia: true,
      origen: "contingencia",
    };
  }
}

export async function obtenerCompromisoApi(idOcodigo: string): Promise<CompromisoInstitucional> {
  return await apiFetch<CompromisoInstitucional>(`/api/v1/compromisos/${idOcodigo}`);
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
