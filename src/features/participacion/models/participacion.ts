export interface DesglosePoblacional {
  hombres: number;
  mujeres: number;
  otros: number;
  jovenes: number; // 14-28
  adultos: number; // 29-59
  adultosMayores: number; // 60+
  enfoqueDiferencial: Record<string, number>;
}

export interface TableroConsolidado {
  totalCartageneros: number;
  participacionWeb: number;
  participacionMesas: number;
  participacionEscenarios: number;
  desglose: DesglosePoblacional;
  ultimaActualizacion: string;
}

export interface DesgloseWeb {
  totalAportes: number;
  porLineaEstrategica: Record<string, number>;
  porDimension: Record<string, number>;
}

export interface DesgloseMesas {
  totalAsistentes: number;
  porMesa: Record<string, number>;
}

export interface EscenarioEspecial {
  id: string;
  titulo: string;
  tipo: "consulta_previa" | "foro_sectorial" | "taller_juvenil" | "otro";
  territorioId?: string;
  entidadConvocante: string;
  fecha: string;
  asistentes: number;
  desglose: DesglosePoblacional;
}
