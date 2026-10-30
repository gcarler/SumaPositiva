/**
 * POLIS — Servicios de API para Notificaciones Transaccionales y Fe Pública
 * Conectado al backend FastAPI (/api/v1/notificaciones).
 */

import { apiFetch } from "@/core/http/api-client";

export interface NotificacionLectura {
  id: string;
  codigo_radicado: string;
  destinatario_correo: string;
  tipo_evento: string;
  asunto: string;
  estado_envio: "pendiente" | "enviado" | "simulado" | "fallido" | string;
  error_detalle?: string | null;
  creado_en: string;
  enviado_en?: string | null;
}

export interface HistorialNotificacionesPaginado {
  total: number;
  limite: number;
  desplazamiento: number;
  elementos: NotificacionLectura[];
}

export interface FiltrosHistorialNotificaciones {
  limite?: number;
  desplazamiento?: number;
  codigo_radicado?: string;
  tipo_evento?: string;
}

export interface ConsultaRadicadoRespuesta {
  id: string;
  codigo_radicado: string;
  titulo: string;
  descripcion: string;
  tipo_aporte: string;
  autor_nombre: string;
  estado: string;
  territorio_nombre?: string | null;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Consulta el historial forense de notificaciones emitidas por POLIS Herald.
 * Requiere permiso 'auditoria:leer' o rol administrativo.
 */
export async function listarHistorialNotificaciones(
  filtros: FiltrosHistorialNotificaciones = {}
): Promise<HistorialNotificacionesPaginado> {
  const params = new URLSearchParams();
  if (filtros.limite) params.set("limite", String(filtros.limite));
  if (filtros.desplazamiento) params.set("desplazamiento", String(filtros.desplazamiento));
  if (filtros.codigo_radicado) params.set("codigo_radicado", filtros.codigo_radicado.trim());
  if (filtros.tipo_evento) params.set("tipo_evento", filtros.tipo_evento.trim());

  const query = params.toString();
  return apiFetch<HistorialNotificacionesPaginado>(
    query ? `/notificaciones/historial?${query}` : "/notificaciones/historial"
  );
}

/**
 * Consulta pública del estado de radicación ciudadana por radicado oficial.
 */
export async function consultarRadicado(
  codigoRadicado: string
): Promise<ConsultaRadicadoRespuesta> {
  return apiFetch<ConsultaRadicadoRespuesta>(
    `/notificaciones/radicado/${encodeURIComponent(codigoRadicado.trim().toUpperCase())}`
  );
}
