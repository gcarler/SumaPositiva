export type TipoActor =
  | "institucional"
  | "comunitario"
  | "sociedad_civil"
  | "gremial_privado"
  | "academia"
  | "poblacional_diferencial"
  | "cooperacion_internacional";

export type NivelPoder = "alto" | "medio" | "bajo";
export type NivelInteres = "alto" | "medio" | "bajo";

export type PosturaActor =
  | "promotor_aliado"
  | "neutral_expectante"
  | "critico_opositor"
  | "vulnerable_reclamante";

export type TerritorioActor =
  | "distrital"
  | "localidad_1"
  | "localidad_2"
  | "localidad_3"
  | "rural_insular";

export type CuadranteMatriz =
  | "aliados_clave"          // Alto poder / Alto interés (Gestionar de cerca)
  | "incidencia_estrategica"  // Alto poder / Bajo o medio interés (Mantener satisfechos)
  | "base_social"            // Bajo o medio poder / Alto interés (Mantener informados)
  | "monitoreo";             // Bajo o medio poder / Bajo o medio interés (Monitorear)

export interface ContactoActor {
  nombreLider: string;
  cargo: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  organizacion: string;
}

export interface ActorEstrategico {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoActor;
  territorio: TerritorioActor;
  barrioVereda?: string;
  dimensionesPrincipales: string[]; // de las 7 dimensiones ONU ("personal", "comunitaria", etc.)
  nivelPoder: NivelPoder;
  nivelInteres: NivelInteres;
  postura: PosturaActor;
  contacto: ContactoActor;
  mesasAsistidas?: string[];
  propuestasRadicadas?: number;
  expectativasPrincipales: string;
  accionesInvolucramiento: string; // estrategia de relacionamiento
  actualizadoEn: string;
}
