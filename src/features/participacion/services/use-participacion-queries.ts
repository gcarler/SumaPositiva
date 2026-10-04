import { useQuery } from "@tanstack/react-query";
import { obtenerConsolidado, obtenerDesgloseWeb, obtenerDesgloseMesas, listarEscenarios } from "./participacion-api";
import type { TableroConsolidado, DesgloseWeb, DesgloseMesas, EscenarioEspecial } from "../models/participacion";

export const PARTICIPACION_KEYS = {
  all: ["participacion"] as const,
  consolidado: ["participacion", "consolidado"] as const,
  web: ["participacion", "web"] as const,
  mesas: ["participacion", "mesas"] as const,
  escenarios: ["participacion", "escenarios"] as const,
};

export function useTableroConsolidado() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.consolidado,
    queryFn: async (): Promise<TableroConsolidado> => {
      return await obtenerConsolidado();
    },
  });
}

export function useDesgloseWeb() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.web,
    queryFn: async (): Promise<DesgloseWeb> => {
      return await obtenerDesgloseWeb();
    },
  });
}

export function useDesgloseMesas() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.mesas,
    queryFn: async (): Promise<DesgloseMesas> => {
      return await obtenerDesgloseMesas();
    },
  });
}

export function useEscenariosEspeciales() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.escenarios,
    queryFn: async (): Promise<EscenarioEspecial[]> => {
      return await listarEscenarios();
    },
  });
}
