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
  guardando: boolean;
  error: string | null;
  esContingencia: boolean;
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
  guardando: false,
  error: null,
  esContingencia: false,
  indicadorSeleccionadoId: null,

  cargarCadenaValor: async () => {
    set({ cargando: true, error: null });
    try {
      const res = await obtenerCadenaValor();
      set({
        cadenaValor: res.datos,
        esContingencia: res.esContingencia,
        cargando: false,
        error: res.esContingencia
          ? "Modo contingencia: utilizando catálogo local de indicadores"
          : null,
      });
    } catch (err) {
      set({
        cadenaValor: CADENA_VALOR_CANONICA_CARTAGENA,
        esContingencia: true,
        error:
          err instanceof Error
            ? err.message
            : "Error al cargar la Cadena de Valor SINERGIA",
        cargando: false,
      });
    }
  },

  seleccionarIndicador: (id) => {
    set({ indicadorSeleccionadoId: id });
  },

  registrarMedicion: async (indicadorId, medicion) => {
    set({ guardando: true, error: null });
    try {
      await registrarMedicionIndicador(indicadorId, medicion);

      // AUD-02: Actualizar localmente el estado reactivo del store SOLO si la API tuvo éxito
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
              tiene_mediciones: true,
              fecha_corte_ultimo_reporte: medicion.fecha_corte,
              periodo_ultimo_reporte: medicion.periodo,
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
        guardando: false,
        error: null,
      });

      return true;
    } catch (err) {
      // AUD-02: Prohibido mutar estado local ante fallo en backend
      const mensaje =
        err instanceof Error ? err.message : "Error al registrar medición en backend";
      set({ guardando: false, error: mensaje });
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
      guardando: false,
      error: null,
      esContingencia: false,
      indicadorSeleccionadoId: null,
    });
  },
}));
