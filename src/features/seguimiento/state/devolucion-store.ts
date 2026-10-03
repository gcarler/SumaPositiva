"use client";

import { create } from "zustand";
import type {
  PropuestaDevolucion,
  ConsolidadoParticipacionData,
  EstadoIncorporacion,
} from "../models/devolucion";
import {
  PROPUESTAS_DEVOLUCION_CARTAGENA,
  CONSOLIDADO_PARTICIPACION_FALLBACK,
  obtenerConsolidadoParticipacion,
  listarPropuestasDevolucion,
  evaluarDevolucionConIa,
} from "../services/devolucion-api";

export interface FiltrosDevolucion {
  busqueda: string;
  territorio: string | "todos";
  estado: EstadoIncorporacion | "todos";
}

export const FILTROS_INICIALES_DEVOLUCION: FiltrosDevolucion = {
  busqueda: "",
  territorio: "todos",
  estado: "todos",
};

export function filtrarPropuestas(
  propuestas: PropuestaDevolucion[],
  filtros: FiltrosDevolucion
): PropuestaDevolucion[] {
  return propuestas.filter((p) => {
    const q = filtros.busqueda.trim().toLowerCase();
    if (q) {
      const matchCod = p.codigo.toLowerCase().includes(q);
      const matchTit = p.titulo.toLowerCase().includes(q);
      const matchDesc = p.descripcion.toLowerCase().includes(q);
      const matchAut = p.autor_nombre.toLowerCase().includes(q);
      const matchTerr = p.territorio.toLowerCase().includes(q);
      const matchMotiv = (p.motivacion_sustancial ?? "").toLowerCase().includes(q);
      if (!matchCod && !matchTit && !matchDesc && !matchAut && !matchTerr && !matchMotiv) {
        return false;
      }
    }

    if (filtros.territorio !== "todos" && p.territorio !== filtros.territorio) {
      return false;
    }

    if (filtros.estado !== "todos" && p.estado_incorporacion !== filtros.estado) {
      return false;
    }

    return true;
  });
}

export interface DevolucionStoreState {
  propuestas: PropuestaDevolucion[];
  consolidado: ConsolidadoParticipacionData;
  cargando: boolean;
  error: string | null;
  filtros: FiltrosDevolucion;
  propuestaSeleccionadaId: string | null;
  evaluandoIa: boolean;
  resultadoIa: string | null;

  // Acciones
  cargarDatos: () => Promise<void>;
  setFiltros: (parcial: Partial<FiltrosDevolucion>) => void;
  limpiarFiltros: () => void;
  seleccionarPropuesta: (id: string | null) => void;
  getById: (id: string) => PropuestaDevolucion | undefined;
  ejecutarEvaluacionIa: () => Promise<boolean>;
  restablecer: () => void;
}

export const useDevolucionStore = create<DevolucionStoreState>((set, get) => ({
  propuestas: PROPUESTAS_DEVOLUCION_CARTAGENA,
  consolidado: CONSOLIDADO_PARTICIPACION_FALLBACK,
  cargando: false,
  error: null,
  filtros: FILTROS_INICIALES_DEVOLUCION,
  propuestaSeleccionadaId: null,
  evaluandoIa: false,
  resultadoIa: null,

  cargarDatos: async () => {
    set({ cargando: true, error: null });
    try {
      const [consolidado, propuestas] = await Promise.all([
        obtenerConsolidadoParticipacion(),
        listarPropuestasDevolucion(),
      ]);
      set({ consolidado, propuestas, cargando: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al cargar datos de devolución",
        cargando: false,
      });
    }
  },

  setFiltros: (parcial) => {
    set((state) => ({
      filtros: { ...state.filtros, ...parcial },
    }));
  },

  limpiarFiltros: () => {
    set({ filtros: FILTROS_INICIALES_DEVOLUCION });
  },

  seleccionarPropuesta: (id) => {
    set({ propuestaSeleccionadaId: id });
  },

  getById: (id) => {
    return get().propuestas.find((p) => p.id === id || p.codigo === id);
  },

  ejecutarEvaluacionIa: async () => {
    set({ evaluandoIa: true, resultadoIa: null });
    try {
      const noIncorporadas = get().propuestas.filter(
        (p) => p.estado_incorporacion === "NO_INCORPORADA_MOTIVADA"
      );

      const items = noIncorporadas.map((p) => ({
        propuesta_id: p.id,
        titulo: p.titulo,
        descripcion: p.descripcion,
        motivo_descarte_preliminar: p.motivacion_sustancial,
      }));

      const dictamen = await evaluarDevolucionConIa(items);
      set({
        evaluandoIa: false,
        resultadoIa: dictamen.resumen_pedagogico,
      });
      return true;
    } catch {
      set({
        evaluandoIa: false,
        resultadoIa: "Error al evaluar devolución con IA.",
      });
      return false;
    }
  },

  restablecer: () => {
    set({
      propuestas: PROPUESTAS_DEVOLUCION_CARTAGENA,
      consolidado: CONSOLIDADO_PARTICIPACION_FALLBACK,
      cargando: false,
      error: null,
      filtros: FILTROS_INICIALES_DEVOLUCION,
      propuestaSeleccionadaId: null,
      evaluandoIa: false,
      resultadoIa: null,
    });
  },
}));
