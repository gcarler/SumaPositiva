/**
 * POLIS — Modelos de Datos para Geodiagnóstico Territorial de Cartagena
 * Conforme a Ley 1617 de 2013, Sentencia C-150 de 2015 y Enfoque Étnico Ley 70 de 1993.
 */

export type NivelRiesgo = "ALTO" | "MEDIO" | "MODERADO";

export type TipoZonaTerritorio =
  | "URBANA"
  | "RURAL"
  | "INSULAR"
  | "ETNICA_LEY_70";

export type LocalidadCartagena =
  | "LOCALIDAD_1"
  | "LOCALIDAD_2"
  | "LOCALIDAD_3"
  | "CORREGIMENTAL_INSULAR";

export interface ProblematicaTerritorial {
  titulo: string;
  descripcion: string;
  dimension: string;
  severidad: NivelRiesgo;
}

export interface EquipamientosTerritoriales {
  caisOEstaciones: number;
  centrosSalud: number;
  colegiosOficiales: number;
  comedoresComunitarios: number;
  deficitDetectado: string;
}

export interface ParticipacionTerritorial {
  mesasRealizadas: number;
  propuestasRadicadas: number;
  testimoniosRegistrados: number;
}

export interface FichaTerritorialDiagnostico {
  id: string;
  codigo: string;
  nombre: string;
  localidad: LocalidadCartagena;
  localidadNombre: string;
  tipoZona: TipoZonaTerritorio;
  esEtnicoLey70: boolean;
  nombreComunidadNegra?: string;
  ucgsAbarcadas: string[];
  barriosPrincipales: string[];
  poblacionEstimada: number;
  poblacionVulnerable: number;
  porcentajeNbi: number;
  nivelRiesgo: NivelRiesgo;
  tasaHomicidiosPorCienMil?: number;
  alertasTempranasSat: number;
  problematicasPriorizadas: ProblematicaTerritorial[];
  equipamientos: EquipamientosTerritoriales;
  participacion: ParticipacionTerritorial;
}
