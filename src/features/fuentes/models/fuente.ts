export type TipoFuente = "primaria" | "secundaria";
export type AmbitoFuente = "local" | "nacional" | "internacional";
export type EstadoEntrega =
  | "por_solicitar"
  | "entregada"
  | "en_termino"
  | "incompleta"
  | "vencida_sin_entrega"
  | "requerimiento_insistencia";

export interface ResponsableContacto {
  nombre: string;
  cargo: string;
  email: string;
  telefono?: string;
}

export interface FuenteInformacion {
  id: string;
  codigo: string;
  entidad: string;
  nombreFuente: string;
  tipo: TipoFuente;
  ambito: AmbitoFuente;
  dimensionSeguridad: string; // "personal", "comunitaria", "ambiental", "economica", "alimentaria", "salud", "politica", "crisis"
  periodicidad: "mensual" | "trimestral" | "semestral" | "anual" | "por_demanda";
  radicadoSolicitud?: string;
  fechaSolicitud?: string;
  fechaLimiteRespuesta?: string;
  estadoEntrega: EstadoEntrega;
  variablesSolicitadas: string[];
  datosEntregadosResumen?: string;
  archivoAdjuntoUrl?: string;
  responsableContacto?: ResponsableContacto;
  observacionesCalidad?: string;
  actualizadoEn: string;
}
