export type EstadoTestimonio = "PENDIENTE" | "APROBADO" | "DESTACADO" | "RECHAZADO";

export interface Testimonio {
  id: string;
  codigo_unico: string;
  nombre_autor: string;
  organizacion_comunitaria?: string | null;
  territorio_id?: string | null;
  territorio_nombre?: string | null;
  dimension_id?: string | null;
  dimension_nombre?: string | null;
  titulo: string;
  relato: string;
  url_foto?: string | null;
  url_audio_video?: string | null;
  metadatos_enfoque: Record<string, unknown>;
  estado: EstadoTestimonio;
  motivo_moderacion?: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface TestimonioCrearPeticion {
  nombre_autor: string;
  organizacion_comunitaria?: string | null;
  territorio_id?: string | null;
  dimension_id?: string | null;
  titulo: string;
  relato: string;
  url_foto?: string | null;
  url_audio_video?: string | null;
  metadatos_enfoque?: Record<string, unknown>;
}

export interface TestimonioModeracionPeticion {
  estado: EstadoTestimonio;
  motivo_moderacion?: string | null;
}

export interface ResumenTestimonios {
  total_testimonios: number;
  aprobados: number;
  destacados: number;
  pendientes: number;
  rechazados: number;
  por_territorio: Array<{
    territorio_id: string;
    codigo: string;
    nombre: string;
    total_testimonios: number;
  }>;
}
