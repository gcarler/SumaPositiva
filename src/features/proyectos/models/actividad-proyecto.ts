export type ModuloDueno = "comunicaciones" | "mesas" | "formularios";

export type EstadoCanonico =
  | "pendiente"
  | "programada"
  | "en_progreso"
  | "completada"
  | "reprogramada"
  | "cancelada";

/** Anexo o evidencia documental adjunta a una actividad del proyecto. */
export interface AnexoActividad {
  id: string;
  actividad_id: string;
  nombre_archivo: string;
  tipo_mime: string;
  tamano_bytes: number;
  hash_sha256: string;
  descripcion?: string | null;
  subido_por?: string | null;
  creado_en: string;
  url_descarga: string;
}

/** Proyección agregada read-only del backend (`GET /api/v1/proyectos/actividades`).
 *  Solo formulación de la política pública: comunicaciones, agendas de mesas
 *  y formularios de consulta. El Plan de Acción no es fuente de esta vista. */
export interface ActividadProyecto {
  /** Clave compuesta `<modulo_dueno>:<recurso_id>`. */
  id: string;
  modulo_dueno: ModuloDueno;
  recurso_id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  etapa: string | null;
  territorio: string;
  lugar: string | null;
  fecha_inicio: string; // YYYY-MM-DD
  /** `null` = ventana abierta (p. ej. formulario sin fecha de cierre). */
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  /** Estado del módulo dueño, sin traducciones en el backend. */
  estado_nativo: string;
  /** Traducción al vocabulario común para Kanban/Gantt/Leyenda. */
  estado_canonico: EstadoCanonico;
  avance_pct: number;
  responsable: string;
  permiso_editar: string;
  total_anexos?: number;
}

export const MODULOS_PROYECTOS: Record<ModuloDueno, { label: string; rutaPlataforma: string }> = {
  comunicaciones: { label: "Comunicaciones", rutaPlataforma: "/plataforma/comunicaciones" },
  mesas: { label: "Mesas", rutaPlataforma: "/plataforma/mesas" },
  formularios: { label: "Formularios", rutaPlataforma: "/plataforma/formularios" },
};

export const MODULOS_PROYECTOS_ORDER: ModuloDueno[] = [
  "comunicaciones",
  "mesas",
  "formularios",
];

/** Guarda de datos: la respuesta de la API no se valida en red; si el backend
 *  sirviera una fuente no catalogada (p. ej. durante un despliegue con el
 *  frontend y el backend desincronizados), la vista la descarta en vez de
 *  caérsele el render al buscar su etiqueta en `MODULOS_PROYECTOS`. */
export function esModuloProyectos(valor: string): valor is ModuloDueno {
  return valor in MODULOS_PROYECTOS;
}

export const ESTADOS_CANONICOS: Record<
  EstadoCanonico,
  { label: string; tone: "outline" | "info" | "success" | "warning" | "ember" }
> = {
  pendiente: { label: "Pendiente", tone: "outline" },
  programada: { label: "Programada", tone: "outline" },
  en_progreso: { label: "En progreso", tone: "info" },
  completada: { label: "Completada", tone: "success" },
  reprogramada: { label: "Reprogramada", tone: "warning" },
  cancelada: { label: "Cancelada", tone: "ember" },
};

/** Orden canónico de columnas del Kanban y puntos de leyenda. */
export const ESTADOS_CANONICOS_ORDER: EstadoCanonico[] = [
  "pendiente",
  "programada",
  "en_progreso",
  "completada",
  "reprogramada",
  "cancelada",
];
