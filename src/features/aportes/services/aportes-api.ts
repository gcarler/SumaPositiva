/**
 * POLIS — Servicios de API para Aportes Ciudadanos y Sesión Anónima
 * Conectado a los endpoints FastAPI (/api/v1/aportes y /api/v1/sesion).
 */

import { apiFetch, setBearerToken } from "@/core/http/api-client";

export type TipoAporte =
  | "propuesta"
  | "observacion"
  | "alerta_comunitaria"
  | "anotacion"
  | "pregunta";

export interface MetadataEnfoque {
  etnia?: string | null;
  genero?: string | null;
  ciclo_vital?: string | null;
  es_victima_conflicto?: boolean;
  hecho_victimizante?: string | null;
  situacion_discapacidad?: boolean;
  tipo_discapacidad?: string | null;
  poblacion_campesina?: boolean;
  persona_cuidadora?: boolean;
  organizacion_social?: string | null;
  datos_adicionales?: Record<string, unknown>;
}

export interface PropuestaCiudadanaCreate {
  linea_id: string;
  dimension_id?: string | null;
  territorio_id?: string | null;
  tipo_aporte?: TipoAporte;
  titulo: string;
  descripcion: string;
  autor_nombre?: string;
  es_anonimo?: boolean;
  metadata_enfoque?: MetadataEnfoque;
  archivos_adjuntos?: unknown[];
  metadatos?: Record<string, unknown>;
  correo_contacto?: string;
}

export interface PropuestaCiudadanaRead {
  id: string;
  codigo_radicado: string;
  linea_id: string;
  dimension_id?: string | null;
  territorio_id?: string | null;
  tipo_aporte: TipoAporte;
  titulo: string;
  descripcion: string;
  autor_nombre: string;
  es_anonimo: boolean;
  metadata_enfoque: MetadataEnfoque;
  archivos_adjuntos: unknown[];
  metadatos: Record<string, unknown>;
  /* El backend retira sesion_id/huella_hash de las respuestas públicas: los
   * tipos del cliente los tratan como opcionales y los consumidores actuales
   * no dependen de ellos. */
  sesion_id?: string | null;
  huella_hash?: string | null;
  apoyos_contador: number;
  estado: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface PropuestasPaginadasRead {
  total: number;
  limite: number;
  desplazamiento: number;
  elementos: PropuestaCiudadanaRead[];
}

export interface SesionAnonimaRespuesta {
  token_acceso: string;
  tipo_token: string;
  expira_en_segundos: number;
  /* Opcional por la misma retirada de datos de sesión en respuestas
   * públicas; el cliente usa `?? ""` para no romper la continuidad. */
  sesion_id?: string;
  huella_hash?: string;
  rol: string;
}

export interface FiltrosAportes {
  dimension_id?: string;
  territorio_id?: string;
  linea_id?: string;
  tipo_aporte?: TipoAporte;
  estado?: string;
  grupo_etnico?: string;
  genero?: string;
  es_victima_conflicto?: boolean;
  sesion_id?: string;
  busqueda?: string;
  solo_activos?: boolean;
  limite?: number;
  desplazamiento?: number;
}

const STORAGE_KEY_TOKEN = "polis_sesion_token";

/**
 * Obtiene o emite una nueva sesión anónima firmada digitalmente con JWT.
 * Cumple con la Ley 1581 de 2012 (Habeas Data).
 */
export async function obtenerSesionAnonima(): Promise<SesionAnonimaRespuesta> {
  const sesion = await apiFetch<SesionAnonimaRespuesta>("/sesion/anonima", {
    method: "POST",
  });
  setBearerToken(sesion.token_acceso);
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch {
      /* localStorage no disponible */
    }
  }
  return sesion;
}

/**
 * Garantiza que exista un token Bearer en el cliente HTTP antes de enviar una petición autenticada.
 */
export async function asegurarSesionActiva(): Promise<string> {
  const { useSesionStore } = await import("@/features/sesion/state/session-store");
  const sesion = useSesionStore.getState().sesion;
  if (sesion?.token && sesion.expiraEn && Date.parse(sesion.expiraEn) > Date.now()) {
    setBearerToken(sesion.token);
    return sesion.token;
  }
  const nueva = await obtenerSesionAnonima();
  useSesionStore.getState().setSesionAnonima(nueva.token_acceso, nueva.sesion_id ?? "",
    new Date(Date.now() + nueva.expira_en_segundos * 1000).toISOString());
  return nueva.token_acceso;
}

/**
 * Lista propuestas ciudadanas con filtros opcionales y paginación.
 */
export async function listarAportes(
  filtros: FiltrosAportes = {}
): Promise<PropuestasPaginadasRead> {
  const params = new URLSearchParams();
  if (filtros.dimension_id) params.set("dimension_id", filtros.dimension_id);
  if (filtros.territorio_id) params.set("territorio_id", filtros.territorio_id);
  if (filtros.linea_id) params.set("linea_id", filtros.linea_id);
  if (filtros.tipo_aporte) params.set("tipo_aporte", filtros.tipo_aporte);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.grupo_etnico) params.set("grupo_etnico", filtros.grupo_etnico);
  if (filtros.genero) params.set("genero", filtros.genero);
  if (filtros.es_victima_conflicto !== undefined) {
    params.set("es_victima_conflicto", String(filtros.es_victima_conflicto));
  }
  if (filtros.sesion_id) params.set("sesion_id", filtros.sesion_id);
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.solo_activos !== undefined) {
    params.set("solo_activos", String(filtros.solo_activos));
  }
  if (filtros.limite) params.set("limite", String(filtros.limite));
  if (filtros.desplazamiento) {
    params.set("desplazamiento", String(filtros.desplazamiento));
  }

  const query = params.toString();
  const endpoint = query ? `/aportes?${query}` : "/aportes";
  return apiFetch<PropuestasPaginadasRead>(endpoint);
}

/**
 * Crea una nueva propuesta ciudadana con trazabilidad obligatoria de sesión.
 */
export async function crearAporte(
  datos: PropuestaCiudadanaCreate
): Promise<PropuestaCiudadanaRead> {
  await asegurarSesionActiva();
  return apiFetch<PropuestaCiudadanaRead>("/aportes", {
    method: "POST",
    body: datos,
  });
}

export interface RespuestaToggleApoyo {
  propuesta_id: string;
  apoyado: boolean;
  apoyos_contador: number;
  mensaje: string;
}

export interface MisApoyosRespuesta {
  propuestas_apoyadas: string[];
}

/**
 * Alterna el respaldo ciudadano (suma si no existe, retira si ya existe).
 */
export async function alternarApoyoAporte(
  aporteId: string
): Promise<RespuestaToggleApoyo> {
  await asegurarSesionActiva();
  return apiFetch<RespuestaToggleApoyo>(`/aportes/${aporteId}/apoyar`, {
    method: "POST",
  });
}

/**
 * Retira explícitamente el respaldo ciudadano de una propuesta.
 */
export async function retirarApoyoAporte(
  aporteId: string
): Promise<PropuestaCiudadanaRead> {
  await asegurarSesionActiva();
  return apiFetch<PropuestaCiudadanaRead>(`/aportes/${aporteId}/apoyar`, {
    method: "DELETE",
  });
}

/**
 * Consulta la lista de identificadores de propuestas respaldadas por la sesión actual.
 */
export async function obtenerMisApoyos(): Promise<string[]> {
  await asegurarSesionActiva();
  const res = await apiFetch<MisApoyosRespuesta>("/aportes/mis-apoyos");
  return res.propuestas_apoyadas ?? [];
}

/**
 * Registra un respaldo popular (voto positivo) para una propuesta ciudadana.
 * (Mantenido por retrocompatibilidad con componentes existentes).
 */
export async function respaldarAporte(
  aporteId: string
): Promise<PropuestaCiudadanaRead> {
  await asegurarSesionActiva();
  return apiFetch<PropuestaCiudadanaRead>(`/aportes/${aporteId}/apoyar`, {
    method: "POST",
  });
}

export interface ConsultaRadicadoRespuesta {
  id: string;
  codigo_radicado: string;
  titulo: string;
  descripcion: string;
  tipo_aporte: TipoAporte;
  autor_nombre: string;
  estado: string;
  territorio_nombre?: string | null;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Consulta pública del estado de tramitación ciudadana por radicado POL-2026-XXXX.
 */
export async function consultarRadicadoPublico(
  codigoRadicado: string
): Promise<ConsultaRadicadoRespuesta> {
  return apiFetch<ConsultaRadicadoRespuesta>(
    `/notificaciones/radicado/${encodeURIComponent(codigoRadicado.trim().toUpperCase())}`
  );
}

