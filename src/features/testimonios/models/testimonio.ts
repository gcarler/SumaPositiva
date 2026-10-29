export type TipoTestimonio = "ciudadano" | "lider_comunal" | "funcionario" | "academia";

export type EstadoTestimonio = "BORRADOR" | "PENDIENTE" | "APROBADO" | "DESTACADO" | "RECHAZADO";

export interface Testimonio {
  id: string;
  nombre: string;            // "María González" o "Anónimo"
  anonimo: boolean;
  barrio?: string;           // "Getsemaní"
  localidad?: string;        // "Localidad 1 — Histórica"
  tipo: TipoTestimonio;
  texto: string;             // El testimonio en sí (max 500 chars en card)
  textoCompleto?: string;    // Si es más largo, se muestra en panel
  foto?: string;             // URL foto de perfil (opcional)
  dimensionOnu?: string;     // A qué dimensión de seguridad se refiere
  verificado: boolean;       // Lo revisó el equipo de facilitación
  creadoEn: string;          // ISO date
  destacado: boolean;        // Aparece en home

  // Retrocompatibilidad con esquemas de backend / paneles de gestión
  codigo_unico?: string;
  nombre_autor?: string;
  organizacion_comunitaria?: string | null;
  territorio_id?: string | null;
  territorio_nombre?: string | null;
  dimension_id?: string | null;
  dimension_nombre?: string | null;
  titulo?: string;
  relato?: string;
  url_foto?: string | null;
  url_audio_video?: string | null;
  metadatos_enfoque?: Record<string, unknown>;
  estado?: EstadoTestimonio;
  motivo_moderacion?: string | null;
  creado_en?: string;
  actualizado_en?: string;
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
  estado?: EstadoTestimonio;
}

export interface TestimonioModeracionPeticion {
  estado: EstadoTestimonio;
  motivo_moderacion?: string | null;
}

export interface ResumenTestimonios {
  total_testimonios: number;
  borradores?: number;
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
