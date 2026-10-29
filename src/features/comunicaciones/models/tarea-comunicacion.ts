export type EstadoTarea =
  | "pendiente"
  | "en_progreso"
  | "completada"
  | "reprogramada";

export interface TareaComunicacion {
  id: string;
  codigo: string;
  etapa: string;
  territorio: string;
  titulo: string;
  descripcion: string;
  entregables: string;
  fecha_inicio: string; // Formato YYYY-MM-DD
  fecha_fin: string;    // Formato YYYY-MM-DD
  estado: EstadoTarea;
  responsable: string;
  orden: number;
  creado_en?: string;
  actualizado_en?: string;
}

export type TareaComunicacionPayload = Omit<
  TareaComunicacion,
  "id" | "creado_en" | "actualizado_en"
>;

export const ETAPAS_CRONOGRAMA = [
  "Etapa 1: Pre-Producción y Banco de Evidencias",
  "Etapa 2: Gran Hito Inaugural",
  "Etapa 3: Despliegue Territorial y Temático",
  "Etapa 4: Sistematización y Devolución",
] as const;

export const ESTADOS_TAREA: Record<
  EstadoTarea,
  { label: string; tone: "outline" | "info" | "success" | "warning" }
> = {
  pendiente: { label: "Pendiente", tone: "outline" },
  en_progreso: { label: "En progreso", tone: "info" },
  completada: { label: "Completada", tone: "success" },
  reprogramada: { label: "Reprogramada", tone: "warning" },
};

/** Orden canónico de columnas del tablero kanban. */
export const ESTATES_ORDER: EstadoTarea[] = [
  "pendiente",
  "en_progreso",
  "completada",
  "reprogramada",
];
