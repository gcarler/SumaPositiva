import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  obtenerConsolidado,
  obtenerDesgloseWeb,
  obtenerDesgloseMesas,
  obtenerDesgloseEscenarios,
  listarEscenarios,
  guardarEscenario,
} from "./participacion-api";
import type {
  TableroConsolidado,
  DesgloseWeb,
  DesgloseMesas,
  EscenarioEspecial,
  DesgloseCanalEscenarios,
  EscenarioEspecialCrear,
} from "../models/participacion";

export const PARTICIPACION_KEYS = {
  all: ["participacion"] as const,
  consolidado: ["participacion", "consolidado"] as const,
  web: ["participacion", "canal-web"] as const,
  mesas: ["participacion", "canal-mesas"] as const,
  escenarios: ["participacion", "canal-escenarios"] as const,
  escenariosLista: ["participacion", "escenarios-especiales"] as const,
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

export function useDesgloseEscenarios() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.escenarios,
    queryFn: async (): Promise<DesgloseCanalEscenarios> => {
      return await obtenerDesgloseEscenarios();
    },
  });
}

export function useEscenariosEspeciales() {
  return useQuery({
    queryKey: PARTICIPACION_KEYS.escenariosLista,
    queryFn: async (): Promise<EscenarioEspecial[]> => {
      return await listarEscenarios();
    },
  });
}

export function useCrearEscenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: Partial<EscenarioEspecial> | EscenarioEspecialCrear) => {
      return await guardarEscenario(datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTICIPACION_KEYS.all });
    },
  });
}
