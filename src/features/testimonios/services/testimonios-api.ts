import { apiFetch } from "@/core/http/api-client";
import type {
  ResumenTestimonios,
  Testimonio,
  TestimonioCrearPeticion,
  TestimonioModeracionPeticion,
} from "../models/testimonio";

export async function listarTestimoniosPublicos(filtros?: {
  territorioId?: string | null;
  dimensionId?: string | null;
  destacados?: boolean;
}): Promise<Testimonio[]> {
  const params = new URLSearchParams();
  if (filtros?.territorioId) params.append("territorio_id", filtros.territorioId);
  if (filtros?.dimensionId) params.append("dimension_id", filtros.dimensionId);
  if (filtros?.destacados) params.append("destacados", "true");

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Testimonio[]>(`/testimonios${query}`);
}

export async function obtenerResumenTestimonios(): Promise<ResumenTestimonios> {
  return apiFetch<ResumenTestimonios>("/testimonios/resumen");
}

export async function obtenerTestimonioPorId(id: string): Promise<Testimonio> {
  return apiFetch<Testimonio>(`/testimonios/${id}`);
}

export async function obtenerTestimonioGestion(id: string): Promise<Testimonio> {
  return apiFetch<Testimonio>(`/testimonios/gestion/${id}`);
}

export async function crearTestimonio(datos: TestimonioCrearPeticion): Promise<Testimonio> {
  return apiFetch<Testimonio>("/testimonios", {
    method: "POST",
    body: datos,
  });
}

export async function listarTestimoniosGestion(filtros?: {
  estado?: string | null;
  territorioId?: string | null;
}): Promise<Testimonio[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.append("estado", filtros.estado);
  if (filtros?.territorioId) params.append("territorio_id", filtros.territorioId);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Testimonio[]>(`/testimonios/gestion${query}`);
}

export async function moderarTestimonio(
  id: string,
  moderacion: TestimonioModeracionPeticion
): Promise<Testimonio> {
  return apiFetch<Testimonio>(`/testimonios/${id}/moderar`, {
    method: "PUT",
    body: moderacion,
  });
}

export type TestimonioEdicionPeticion = Omit<TestimonioCrearPeticion, "metadatos_enfoque"> & {
  metadatos_enfoque: Record<string, unknown>;
};

export async function editarTestimonio(id: string, datos: TestimonioEdicionPeticion): Promise<Testimonio> {
  return apiFetch<Testimonio>(`/testimonios/${id}`, { method: "PUT", body: datos });
}
