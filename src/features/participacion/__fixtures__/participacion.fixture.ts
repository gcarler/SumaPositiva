import type { TableroConsolidado, DesgloseWeb, DesgloseMesas, EscenarioEspecial } from "../models/participacion";

export const MOCK_CONSOLIDADO: TableroConsolidado = {
  totalCartageneros: 15420,
  participacionWeb: 8200,
  participacionMesas: 5100,
  participacionEscenarios: 2120,
  desglose: {
    hombres: 7100,
    mujeres: 8200,
    otros: 120,
    jovenes: 4500,
    adultos: 8000,
    adultosMayores: 2920,
    enfoqueDiferencial: {
      "Ley 1448 (Víctimas)": 1500,
      "Ley 1618 (Discapacidad)": 450,
      "Comunidades Negras": 3200,
      "Indígenas": 120
    }
  },
  ultimaActualizacion: new Date().toISOString()
};

export const MOCK_WEB: DesgloseWeb = {
  totalAportes: 12500,
  porLineaEstrategica: {
    "Seguridad Humana": 4500,
    "Desarrollo Económico": 3200,
    "Infraestructura": 2800,
    "Sostenibilidad": 2000
  },
  porDimension: {
    "Educación": 3000,
    "Salud": 2500,
    "Seguridad": 4000,
    "Vivienda": 3000
  }
};

export const MOCK_MESAS: DesgloseMesas = {
  totalAsistentes: 5100,
  porMesa: {
    "Plenaria 1": 1500,
    "Mesa de Educación": 800,
    "Mesa de Salud": 1200,
    "Mesa de Cultura": 600,
    "Mesa de Deporte": 1000
  }
};

export const MOCK_ESCENARIOS: EscenarioEspecial[] = [
  {
    id: "e1",
    titulo: "Foro Sectorial de Movilidad",
    tipo: "foro_sectorial",
    entidadConvocante: "DATT",
    fecha: "2026-09-15T10:00:00Z",
    asistentes: 450,
    desglose: {
      hombres: 250, mujeres: 190, otros: 10,
      jovenes: 100, adultos: 300, adultosMayores: 50,
      enfoqueDiferencial: { "Ninguno": 400, "Discapacidad": 50 }
    }
  }
];
