import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {
  listarMesas,
  obtenerMesa,
  actualizarAcuerdosPlenaria,
  actualizarInformeMesa,
  crearSubMesa,
  actualizarSubMesa
} from "./mesas-api";
import type {SubMesa} from "@/features/mesas/models/mesas";
import {useMesasStore} from "@/features/mesas/state/mesas-store";
import {apiFetch} from "@/core/http/api-client";

export const MESAS_KEYS = {
  all: ["mesas"] as const,
  detail: (id: string) => ["mesas", id] as const,
};

export function useMesas() {
  return useQuery({
    queryKey: MESAS_KEYS.all,
    queryFn: async () => {
      const data = await listarMesas();
      useMesasStore.getState().setMesas(data || []);
      return data || [];
    },
    staleTime: 1000 * 60,
  });
}

export function useMesaQuery(mesaId: string) {
  return useQuery({
    queryKey: MESAS_KEYS.detail(mesaId),
    queryFn: async () => {
      return await obtenerMesa(mesaId);
    },
    staleTime: 1000 * 30,
    enabled: !!mesaId,
  });
}

export function useActualizarAcuerdos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mesaId, acuerdos }: { mesaId: string; acuerdos: string }) => {
      return actualizarAcuerdosPlenaria(mesaId, acuerdos);
    },
    onSuccess: (_, { mesaId }) => {
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.detail(mesaId) });
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
    },
  });
}

export function useActualizarInforme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mesaId, informe }: { mesaId: string; informe: string }) => {
      return actualizarInformeMesa(mesaId, informe);
    },
    onSuccess: (_, { mesaId }) => {
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.detail(mesaId) });
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
    },
  });
}

export function useCrearSubMesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mesaId,
      datos,
    }: {
      mesaId: string;
      datos: { nombre: string; tema: string; participantes?: number | null };
    }) => {
      return crearSubMesa(mesaId, datos);
    },
    onError: () => {
      toast.error("No se pudo crear la submesa", {
        description: "El servidor no confirmó la creación.",
      });
    },
    onSuccess: (_, { mesaId }) => {
      // Actualizar el cache de TanStack Query con los datos del store
      const mesaActualizada = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      if (mesaActualizada) {
        queryClient.setQueryData(MESAS_KEYS.detail(mesaId), mesaActualizada);
      }
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
    },
  });
}

export function useActualizarAsistentesPlenaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mesaId, cantidad }: { mesaId: string; cantidad: number | null }) => {
      useMesasStore.getState().setAsistentesPlenaria(mesaId, cantidad);
      try {
        await apiFetch(`/api/v1/mesas/${mesaId}`, {
          method: "PATCH",
          body: JSON.stringify({ metadatos: { asistentesPlenaaria: cantidad } }),
        });
      } catch {}
      return cantidad;
    },
    onSuccess: (_, { mesaId }) => {
      const mesaActualizada = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      if (mesaActualizada) {
        queryClient.setQueryData(MESAS_KEYS.detail(mesaId), mesaActualizada);
      }
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.detail(mesaId) });
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all });
    },
  });
}

import {toast} from "sonner";

export function useActualizarSubMesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mesaId, subMesaId, subMesa }: { mesaId: string; subMesaId: string; subMesa: SubMesa }) => {
      try {
        return await actualizarSubMesa(mesaId, subMesaId, subMesa);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "status" in err &&
          ((err as { status: number }).status === 409 || (err as { status: number }).status === 412)
        ) {
          toast.error("Conflicto de edición", {
            description: "El contenido fue modificado en otra sesión. Por favor recarga para sincronizar los cambios.",
            duration: 8000,
            action: {
              label: "Recargar",
              onClick: () => window.location.reload(),
            },
          });
          throw err;
        }
        toast.error("No se pudo guardar la submesa", {
          description: "El servidor no confirmó el guardado. Los cambios no se han persistido.",
        });
        throw err;
      }
    },
    onSuccess: (_, { mesaId }) => {
      queryClient.invalidateQueries({ queryKey: MESAS_KEYS.detail(mesaId) });
    },
  });
}
