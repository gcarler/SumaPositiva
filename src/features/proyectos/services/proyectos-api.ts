import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  ActividadProyecto,
  AnexoActividad,
  ModuloDueno,
} from "../models/actividad-proyecto";

export interface ResumenProyectos {
  total_actividades: number;
  por_modulo: Record<string, number>;
  por_estado_canonico: Record<string, number>;
}

function cabeceras(): Record<string, string> | undefined {
  const token = useSesionStore.getState().sesion?.token;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/**
 * Proyección agregada read-only de las actividades de la política:
 * comunicaciones, agendas de mesas y formularios.
 * La edición sigue ocurriendo en cada módulo dueño.
 */
export async function listarActividadesProyectos(filtros?: {
  modulo?: ModuloDueno | "todos";
  fecha_desde?: string;
  fecha_hasta?: string;
}): Promise<ActividadProyecto[]> {
  const query = new URLSearchParams();
  if (filtros?.modulo && filtros.modulo !== "todos") {
    query.set("modulo", filtros.modulo);
  }
  if (filtros?.fecha_desde) query.set("fecha_desde", filtros.fecha_desde);
  if (filtros?.fecha_hasta) query.set("fecha_hasta", filtros.fecha_hasta);

  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ActividadProyecto[]>(`/api/v1/proyectos/actividades${qs}`, {
    headers: cabeceras(),
  });
}

export async function resumenProyectos(): Promise<ResumenProyectos> {
  return apiFetch<ResumenProyectos>("/api/v1/proyectos/resumen", {
    headers: cabeceras(),
  });
}

/**
 * Lista todos los anexos o evidencias documentales adjuntos a una actividad.
 */
export async function listarAnexosActividad(
  actividadId: string,
): Promise<AnexoActividad[]> {
  return apiFetch<AnexoActividad[]>(
    `/api/v1/proyectos/actividades/${encodeURIComponent(actividadId)}/anexos`,
    {
      headers: cabeceras(),
    },
  );
}

/**
 * Carga un anexo a la actividad usando FormData multipart.
 */
export async function subirAnexoActividad(
  actividadId: string,
  archivo: File,
  descripcion?: string,
): Promise<AnexoActividad> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  if (descripcion && descripcion.trim()) {
    formData.append("descripcion", descripcion.trim());
  }

  return apiFetch<AnexoActividad>(
    `/api/v1/proyectos/actividades/${encodeURIComponent(actividadId)}/anexos`,
    {
      method: "POST",
      body: formData,
      headers: cabeceras(),
      timeoutMs: 120_000,
      retry: { retries: 0 },
    },
  );
}

/**
 * Descarga el archivo de un anexo directamente en el navegador con autenticación.
 */
export async function descargarAnexoActividad(
  actividadId: string,
  anexoId: string,
  nombreArchivo: string,
): Promise<void> {
  const token = useSesionStore.getState().sesion?.token;
  const res = await fetch(
    `/api/v1/proyectos/actividades/${encodeURIComponent(actividadId)}/anexos/${encodeURIComponent(anexoId)}/archivo`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!res.ok) {
    throw new Error(`Error al descargar el archivo (${res.status} ${res.statusText})`);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = blobUrl;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Elimina un anexo adjunto a la actividad.
 */
export async function eliminarAnexoActividad(
  actividadId: string,
  anexoId: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/proyectos/actividades/${encodeURIComponent(actividadId)}/anexos/${encodeURIComponent(anexoId)}`,
    {
      method: "DELETE",
      headers: cabeceras(),
    },
  );
}
