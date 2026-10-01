import { apiFetch } from "@/core/http/api-client";

export type EstadoMesaGeovisor = "PROGRAMADA" | "CONVOCADA" | "EN_DELIBERACION" | "ACTA_CONCERTADA" | "FINALIZADA";

export interface FotoMesaGeovisor {
  id: string;
  archivo_url: string;
  descripcion: string;
}

export interface MesaGeovisor {
  id: string;
  nombre: string;
  fecha: string | null;
  horario: string | null;
  estado: EstadoMesaGeovisor;
  realizada: boolean;
  total_asistentes: number;
  territorio_id: string | null;
  territorio_nombre: string | null;
  territorio_codigo: string | null;
  longitud_referencia: number | null;
  latitud_referencia: number | null;
  tipo_ubicacion: "centroide_territorial_referencia" | null;
  fotos: FotoMesaGeovisor[];
}

const ESTADOS = new Set<EstadoMesaGeovisor>([
  "PROGRAMADA", "CONVOCADA", "EN_DELIBERACION", "ACTA_CONCERTADA", "FINALIZADA",
]);

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoNullable(valor: unknown, campo: string): string | null {
  if (valor === null) return null;
  if (typeof valor !== "string") throw new Error(`Respuesta de mesas inválida: ${campo}`);
  return valor;
}

function numeroNullable(valor: unknown, campo: string): number | null {
  if (valor === null) return null;
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw new Error(`Respuesta de mesas inválida: ${campo}`);
  return valor;
}

function validarFoto(valor: unknown): FotoMesaGeovisor {
  if (!esRegistro(valor) || typeof valor.id !== "string" || typeof valor.archivo_url !== "string" || typeof valor.descripcion !== "string") {
    throw new Error("Respuesta de fotos de mesa inválida");
  }
  return { id: valor.id, archivo_url: valor.archivo_url, descripcion: valor.descripcion };
}

function validarMesa(valor: unknown): MesaGeovisor {
  if (!esRegistro(valor) || typeof valor.id !== "string" || typeof valor.nombre !== "string") {
    throw new Error("Respuesta de mesa inválida");
  }
  if (typeof valor.estado !== "string" || !ESTADOS.has(valor.estado as EstadoMesaGeovisor)) {
    throw new Error("Estado de mesa desconocido");
  }
  if (typeof valor.realizada !== "boolean" || typeof valor.total_asistentes !== "number" || !Number.isInteger(valor.total_asistentes) || valor.total_asistentes < 0) {
    throw new Error("Resumen de mesa inválido");
  }
  if (!Array.isArray(valor.fotos)) throw new Error("La lista de fotos de mesa es inválida");
  const tipoUbicacion = valor.tipo_ubicacion;
  if (tipoUbicacion !== null && tipoUbicacion !== "centroide_territorial_referencia") {
    throw new Error("Tipo de ubicación de mesa desconocido");
  }
  const fecha = textoNullable(valor.fecha, "fecha");
  if (fecha !== null && Number.isNaN(Date.parse(fecha))) throw new Error("Fecha de mesa inválida");
  return {
    id: valor.id,
    nombre: valor.nombre,
    fecha,
    horario: textoNullable(valor.horario, "horario"),
    estado: valor.estado as EstadoMesaGeovisor,
    realizada: valor.realizada,
    total_asistentes: valor.total_asistentes,
    territorio_id: textoNullable(valor.territorio_id, "territorio_id"),
    territorio_nombre: textoNullable(valor.territorio_nombre, "territorio_nombre"),
    territorio_codigo: textoNullable(valor.territorio_codigo, "territorio_codigo"),
    longitud_referencia: numeroNullable(valor.longitud_referencia, "longitud_referencia"),
    latitud_referencia: numeroNullable(valor.latitud_referencia, "latitud_referencia"),
    tipo_ubicacion: tipoUbicacion,
    fotos: valor.fotos.map(validarFoto),
  };
}

export async function listarMesasGeovisor(): Promise<MesaGeovisor[]> {
  const payload: unknown = await apiFetch<unknown>("/mesas/geovisor");
  if (!Array.isArray(payload)) throw new Error("Respuesta del geovisor de mesas inválida");
  return payload.map(validarMesa);
}

export async function subirFotoMesa(mesaId: string, archivo: File, autorizacionImagen: boolean): Promise<void> {
  const contenido = new FormData();
  contenido.append("archivo", archivo);
  contenido.append("autorizacion_imagen", String(autorizacionImagen));
  await apiFetch<unknown>(`/mesas/${encodeURIComponent(mesaId)}/fotos`, {
    method: "POST",
    body: contenido,
    retry: { retries: 0 },
  });
}
