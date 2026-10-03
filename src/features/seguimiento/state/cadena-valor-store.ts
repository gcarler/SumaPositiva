"use client";

import { create } from "zustand";
import type {
  CadenaValorData,
  FichaIndicadorDnp,
  MedicionIndicadorInput,
} from "../models/indicador-dnp";
import {
  CADENA_VALOR_CANONICA_CARTAGENA,
  obtenerCadenaValor,
  registrarMedicionIndicador,
} from "../services/cadena-valor-api";
import { calcularAvancePorcentaje } from "../models/indicador-dnp";

export interface CadenaValorStoreState {
  cadenaValor: CadenaValorData;
  cargando: boolean;
  error: string | null;
  indicadorSeleccionadoId: string | null;

  // Acciones
  cargarCadenaValor: () => Promise<void>;
  seleccionarIndicador: (id: string | null) => void;
  registrarMedicion: (
    indicadorId: string,
    medicion: MedicionIndicadorInput
  ) => Promise<boolean>;
  getIndicadorById: (id: string) => FichaIndicadorDnp | undefined;
  restablecer: () => void;
}

export const useCadenaValorStore = create<CadenaValorStoreState>((set, get) => ({
  cadenaValor: CADENA_VALOR_CANONICA_CARTAGENA,
  cargando: false,
  error: null,
  indicadorSeleccionadoId: null,

  cargarCadenaValor: async () => {
    set({ cargando: true, error: null });
    try {
      const datos = await obtenerCadenaValor();
      set({ cadenaValor: datos, cargando: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al cargar la Cadena de Valor SINERGIA",
        cargando: false,
      });
    }
  },

  seleccionarIndicador: (id) => {
    set({ indicadorSeleccionadoId: id });
  },

  registrarMedicion: async (indicadorId, medicion) => {
    try {
      await registrarMedicionIndicador(indicadorId, medicion);

      // Actualizar localmente el estado reactivo del store
      const actual = get().cadenaValor;
      const actualizarLista = (lista: FichaIndicadorDnp[]) =>
        lista.map((ind) => {
          if (ind.id === indicadorId || ind.codigo === indicadorId) {
            const nuevoAvance = Number(medicion.valor_medido);
            const porcentaje = calcularAvancePorcentaje(
              nuevoAvance,
              Number(ind.linea_base_valor),
              Number(ind.meta_cuatrienio),
              ind.sentido_esperado
            );
            return {
              ...ind,
              valor_actual: nuevoAvance,
              porcentaje_avance: porcentaje,
              actualizado_en: new Date().toISOString(),
            };
          }
          return ind;
        });

      set({
        cadenaValor: {
          insumo: actualizarLista(actual.insumo),
          producto: actualizarLista(actual.producto),
          resultado: actualizarLista(actual.resultado),
        },
      });

      return true;
    } catch {
      return false;
    }
  },

  getIndicadorById: (id) => {
    const { cadenaValor } = get();
    const todos = [
      ...cadenaValor.insumo,
      ...cadenaValor.producto,
      ...cadenaValor.resultado,
    ];
    return todos.find((x) => x.id === id || x.codigo === id);
  },

  restablecer: () => {
    set({
      cadenaValor: CADENA_VALOR_CANONICA_CARTAGENA,
      cargando: false,
      error: null,
      indicadorSeleccionadoId: null,
    });
  },
}));
