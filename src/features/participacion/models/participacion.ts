export interface DesglosePoblacional {
  hombres?: number;
  mujeres?: number;
  otros?: number;
  jovenes?: number; // 14-28
  adultos?: number; // 29-59
  adultosMayores?: number; // 60+
  enfoqueDiferencial?: Record<string, number>;
  [key: string]: unknown;
}

export interface DesgloseTerritorialItem {
  territorio: string;
  codigo: string;
  total_participacion: number;
}

export interface TableroConsolidado {
  // Contrato canónico backend (FastAPI /participacion/consolidado)
  gran_total_participantes_distrital: number;
  participantes_unicos_identificados: number;
  total_canal_web: number;
  total_canal_mesas: number;
  total_canal_escenarios: number;
  porcentaje_canal_web: number;
  porcentaje_canal_mesas: number;
  porcentaje_canal_escenarios: number;
  desglose_territorial_agregado: DesgloseTerritorialItem[];
  fecha_corte: string;

  // Propiedades normalizadas / retrocompatibilidad UI
  totalCartageneros: number;
  participacionWeb: number;
  participacionMesas: number;
  participacionEscenarios: number;
  desglose?: DesglosePoblacional;
  ultimaActualizacion?: string;
}

export interface LineaEstrategicaWeb {
  linea_id: string;
  codigo: string;
  titulo: string;
  dimension_codigo: string;
  dimension_nombre: string;
  total_aportes: number;
  total_apoyos: number;
}

export interface DimensionWeb {
  dimension_id: string;
  codigo: string;
  nombre: string;
  total_aportes: number;
}

export interface TerritorioWeb {
  territorio_id: string;
  codigo: string;
  nombre: string;
  total_aportes: number;
}

export interface DesgloseWeb {
  // Contrato canónico backend (/participacion/canal-web)
  total_aportes: number;
  total_apoyos: number;
  total_respuestas_formularios: number;
  participantes_unicos_web: number;
  por_linea_estrategica: LineaEstrategicaWeb[];
  por_dimension: DimensionWeb[];
  por_territorio: TerritorioWeb[];

  // Retrocompatibilidad UI
  totalAportes: number;
  porLineaEstrategica?: Record<string, number>;
  porDimension?: Record<string, number>;
}

export interface SubmesaItem {
  id: string;
  codigo: string;
  nombre: string;
  path: string;
  tipo_mesa: string;
  asistentes_conteo: number;
}

export interface MesaJerarquiaItem {
  id: string;
  codigo: string;
  nombre: string;
  path: string;
  tipo_mesa: string;
  territorio?: string | null;
  territorio_nombre?: string | null;
  asistentes_conteo: number;
  acta_firmada: boolean;
  submesas: SubmesaItem[];
}

export interface DesgloseMesas {
  // Contrato canónico backend (/participacion/canal-mesas)
  total_mesas_principales: number;
  total_submesas: number;
  total_participantes: number;
  participantes_unicos_mesas: number;
  total_actas_cerradas: number;
  jerarquia_mesas: MesaJerarquiaItem[];

  // Retrocompatibilidad UI
  totalAsistentes: number;
  porMesa?: Record<string, number>;
}

export interface EscenarioEspecial {
  id: string;
  codigo_unico: string;
  nombre: string;
  tipo_escenario: string;
  territorio_id?: string | null;
  territorio_nombre?: string | null;
  fecha: string;
  lugar: string;
  entidad_convocante: string;
  total_asistentes: number;
  desglose_poblacional: Record<string, unknown>;
  sintesis_acuerdos?: string | null;
  url_evidencia?: string | null;
  estado: string;
  creado_en?: string;
  actualizado_en?: string;

  // Retrocompatibilidad UI
  titulo?: string;
  tipo?: string;
  territorioId?: string;
  entidadConvocante?: string;
  asistentes?: number;
  desglose?: DesglosePoblacional;
}

export interface DesgloseCanalEscenarios {
  total_escenarios: number;
  total_asistentes: number;
  por_tipo: Record<string, number>;
  escenarios: EscenarioEspecial[];
}

export interface EscenarioEspecialCrear {
  codigo_unico: string;
  nombre: string;
  tipo_escenario: string;
  territorio_id?: string | null;
  fecha: string;
  lugar: string;
  entidad_convocante: string;
  total_asistentes?: number;
  desglose_poblacional?: Record<string, unknown>;
  sintesis_acuerdos?: string | null;
  url_evidencia?: string | null;
  estado?: string;

  // Retrocompatibilidad
  titulo?: string;
  tipo?: string;
  territorioId?: string;
  entidadConvocante?: string;
  asistentes?: number;
  desglose?: DesglosePoblacional;
}
