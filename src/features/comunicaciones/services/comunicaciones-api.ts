import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  TareaComunicacion,
  TareaComunicacionPayload,
} from "../models/tarea-comunicacion";

export async function listarTareasComunicacion(filtros?: {
  etapa?: string;
  estado?: string;
}): Promise<TareaComunicacion[]> {
  const token = useSesionStore.getState().sesion?.token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const query = new URLSearchParams();
  if (filtros?.etapa && filtros.etapa !== "todas") {
    query.set("etapa", filtros.etapa);
  }
  if (filtros?.estado && filtros.estado !== "todos") {
    query.set("estado", filtros.estado);
  }

  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<TareaComunicacion[]>(`/api/v1/comunicaciones/tareas${qs}`, {
    headers,
  });
}

export async function obtenerTareaComunicacion(
  id: string,
): Promise<TareaComunicacion> {
  const token = useSesionStore.getState().sesion?.token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return apiFetch<TareaComunicacion>(`/api/v1/comunicaciones/tareas/${id}`, {
    headers,
  });
}

export async function crearTareaComunicacion(
  datos: TareaComunicacionPayload,
): Promise<TareaComunicacion> {
  const token = useSesionStore.getState().sesion?.token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return apiFetch<TareaComunicacion>("/api/v1/comunicaciones/tareas", {
    method: "POST",
    headers,
    body: datos,
  });
}

export async function actualizarTareaComunicacion(
  id: string,
  datos: Partial<TareaComunicacionPayload>,
): Promise<TareaComunicacion> {
  const token = useSesionStore.getState().sesion?.token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return apiFetch<TareaComunicacion>(`/api/v1/comunicaciones/tareas/${id}`, {
    method: "PUT",
    headers,
    body: datos,
  });
}

export async function eliminarTareaComunicacion(id: string): Promise<void> {
  const token = useSesionStore.getState().sesion?.token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  await apiFetch<void>(`/api/v1/comunicaciones/tareas/${id}`, {
    method: "DELETE",
    headers,
  });
}
