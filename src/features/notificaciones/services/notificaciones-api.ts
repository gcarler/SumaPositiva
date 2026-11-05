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
  intentos?: number;
  proximo_intento?: string | null;
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
  estado_envio?: string;
}

export type EstadoSaludHerald = "saludable" | "degradado" | "critico";

export interface ResumenPorTipoSalud {
  tipo_evento: string;
  enviados: number;
  fallidos: number;
  pendientes: number;
}

export interface SaludHeraldRespuesta {
  estado: EstadoSaludHerald;
  motivos: string[];
  smtp_configurado: boolean;
  ejecutor: {
    activo: boolean;
    ultimo_latido: string | null;
    ultimo_ciclo: string | null;
  };
  cola: {
    pendientes: number;
    procesando: number;
    fallidos_reintentables: number;
    agotados: number;
    mas_antiguo_segundos: number | null;
  };
  ultimas_24h: {
    enviados: number;
    simulados: number;
    fallidos: number;
    tasa_exito: number;
    latencia_p50_s: number | null;
    latencia_p95_s: number | null;
  };
  por_tipo: ResumenPorTipoSalud[];
}

export interface ReintentarNotificacionRespuesta {
  id: string;
  estado_envio: string;
  intentos: number;
  proximo_intento?: string | null;
  mensaje?: string;
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
  if (filtros.estado_envio) params.set("estado_envio", filtros.estado_envio.trim());

  const query = params.toString();
  return apiFetch<HistorialNotificacionesPaginado>(
    query ? `/notificaciones/historial?${query}` : "/notificaciones/historial"
  );
}

/**
 * Consulta el estado de salud operativa de POLIS Herald (cola, latencias, latido).
 * Requiere permiso 'auditoria:leer' o rol administrativo.
 */
export async function obtenerSaludHerald(): Promise<SaludHeraldRespuesta> {
  return apiFetch<SaludHeraldRespuesta>("/notificaciones/salud");
}

/**
 * Reintenta manualmente una notificación que haya quedado en estado fallido.
 * Requiere permiso 'auditoria:leer' o rol administrativo.
 */
export async function reintentarNotificacion(
  id: string
): Promise<ReintentarNotificacionRespuesta> {
  return apiFetch<ReintentarNotificacionRespuesta>(
    `/notificaciones/${encodeURIComponent(id)}/reintentar`,
    {
      method: "POST",
    }
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
