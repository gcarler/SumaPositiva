import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { obtenerConsolidado, obtenerDesgloseWeb, obtenerDesgloseMesas, listarEscenarios, guardarEscenario } from "./participacion-api";
import type { TableroConsolidado, DesgloseWeb, DesgloseMesas, EscenarioEspecial } from "../models/participacion";

export const PARTICIPACION_KEYS = {
  all: ["participacion"] as const,
  consolidado: ["participacion", "consolidado"] as const,
  web: ["participacion", "web"] as const,
  mesas: ["participacion", "mesas"] as const,
  escenarios: ["participacion", "escenarios"] as const,
};

const MOCK_CONSOLIDADO: TableroConsolidado = {
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

const MOCK_WEB: DesgloseWeb = {
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

const MOCK_MESAS: DesgloseMesas = {
  totalAsistentes: 5100,
  porMesa: {
    "Plenaria 1": 1500,
    "Mesa de Educación": 800,
    "Mesa de Salud": 1200,
    "Mesa de Cultura": 600,
    "Mesa de Deporte": 1000
  }
};

const MOCK_ESCENARIOS: EscenarioEspecial[] = [
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

export function useTableroConsolidado() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.consolidado,
    queryFn: async () => {
      try {
        return await obtenerConsolidado();
      } catch {
        return MOCK_CONSOLIDADO;
      }
    },
  });
}

export function useDesgloseWeb() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.web,
    queryFn: async () => {
      try {
        return await obtenerDesgloseWeb();
      } catch {
        return MOCK_WEB;
      }
    },
  });
}

export function useDesgloseMesas() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.mesas,
    queryFn: async () => {
      try {
        return await obtenerDesgloseMesas();
      } catch {
        return MOCK_MESAS;
      }
    },
  });
}

export function useEscenariosEspeciales() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.escenarios,
    queryFn: async () => {
      try {
        return await listarEscenarios();
      } catch {
        return MOCK_ESCENARIOS;
      }
    },
  });
}
