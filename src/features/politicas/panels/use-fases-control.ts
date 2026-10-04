"use client";

import { useEffect, useState, useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { POLITICAS_QUERY_KEYS } from "@/features/politicas/services/use-politicas-queries";
import {
  listarFasesControlApi,
  conmutarFaseApi,
  clasificarErrorConmutacion,
  type FaseControlApi,
} from "@/features/politicas/services/politicas-api";

export interface UseFasesControlOptions {
  queryClient?: Pick<QueryClient, "invalidateQueries"> | null;
  notificador?: typeof toast;
  autoCargar?: boolean;
}

export function useFasesControl(options?: UseFasesControlOptions) {
  const queryClient = options?.queryClient;
  const notificador = options?.notificador ?? toast;
  const autoCargar = options?.autoCargar ?? true;

  const [fases, setFases] = useState<FaseControlApi[]>([]);
  const [cargando, setCargando] = useState(autoCargar);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [conmutandoIds, setConmutandoIds] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const datos = await listarFasesControlApi();
      setFases(datos);
    } catch (err) {
      const errorInfo = clasificarErrorConmutacion(err);
      setErrorCarga(errorInfo.descripcion);
      setFases([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (autoCargar) {
      cargar();
    }
  }, [autoCargar, cargar]);

  const toggleFase = useCallback(
    async (id: string, current: boolean): Promise<boolean> => {
      if (conmutandoIds.has(id)) return false;
      const nuevoValor = !current;

      // 1. Actualización optimista inmediata en UI
      setFases((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, habilitada_web: nuevoValor } : f
        )
      );
      setConmutandoIds((prev) => new Set(prev).add(id));

      try {
        // 2. Persistencia en backend FastAPI
        const respuesta = await conmutarFaseApi(id, nuevoValor);

        // 3. Confirmación con la respuesta autorizada del servidor
        setFases((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  habilitada_web: respuesta.habilitada_web,
                  estado: respuesta.estado || f.estado,
                  progreso_porcentaje:
                    respuesta.progreso_porcentaje ?? f.progreso_porcentaje,
                }
              : f
          )
        );

        // 4. Invalidar queries de React Query para sincronizar la aplicación
        if (queryClient) {
          queryClient.invalidateQueries({
            queryKey: POLITICAS_QUERY_KEYS.fases,
          });
          queryClient.invalidateQueries({
            queryKey: POLITICAS_QUERY_KEYS.todas,
          });
        }

        notificador.success(
          respuesta.habilitada_web
            ? "Participación web habilitada"
            : "Participación web suspendida",
          {
            description:
              "Los cambios se aplican inmediatamente a toda la ciudadanía.",
          }
        );
        return true;
      } catch (err) {
        // 5. REVERSIÓN INMEDIATA DEL ESTADO AL VALOR PREVIO (AUD-04)
        setFases((prev) =>
          prev.map((f) => (f.id === id ? { ...f, habilitada_web: current } : f))
        );

        // 6. Mensaje de error real y diferenciado (401/403/404/422/5xx) sin 'modo simulación'
        const errorClasificado = clasificarErrorConmutacion(err);
        notificador.error(errorClasificado.titulo, {
          description: errorClasificado.descripcion,
        });
        return false;
      } finally {
        setConmutandoIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [conmutandoIds, notificador, queryClient]
  );

  return {
    fases,
    setFases,
    cargando,
    errorCarga,
    conmutandoIds,
    cargar,
    toggleFase,
  };
}
