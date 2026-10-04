"use client";

import { create } from "zustand";
import type {
  AmbitoFuente,
  EstadoEntrega,
  FuenteInformacion,
  TipoFuente,
} from "../models/fuente";
import { FUENTES_INICIALES } from "../data/fuentes-iniciales.data";

import {
  actualizarFuenteRemota,
  crearFuenteRemota,
  listarFuentes,
} from "../services/fuentes-api";

export interface FiltrosFuentes {
  busqueda: string;
  ambito: AmbitoFuente | "todos";
  estado: EstadoEntrega | "todos";
  dimension: string | "todas";
  tipo: TipoFuente | "todos";
}

const FILTROS_DEFECTO: FiltrosFuentes = {
  busqueda: "",
  ambito: "todos",
  estado: "todos",
  dimension: "todas",
  tipo: "todos",
};

export interface FuentesState {
  fuentes: FuenteInformacion[];
  filtros: FiltrosFuentes;
  cargando: boolean;
  error: string | null;
  setFiltros: (filtros: Partial<FiltrosFuentes>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => FuenteInformacion | undefined;
  cargarFuentes: () => Promise<void>;
  actualizarFuente: (id: string, cambios: Partial<FuenteInformacion>) => Promise<void>;
  agregarFuente: (fuente: Omit<FuenteInformacion, "id" | "actualizadoEn">) => Promise<FuenteInformacion>;
  resetearFuentes: () => void;
}

export const useFuentesStore = create<FuentesState>((set, get) => ({
  fuentes: FUENTES_INICIALES,
  filtros: FILTROS_DEFECTO,
  cargando: false,
  error: null,

  setFiltros: (cambios) =>
    set((state) => ({
      filtros: { ...state.filtros, ...cambios },
    })),

  limpiarFiltros: () =>
    set({
      filtros: FILTROS_DEFECTO,
    }),

  getById: (id) => get().fuentes.find((f) => f.id === id),

  cargarFuentes: async () => {
    set({ cargando: true, error: null });
    try {
      const datos = await listarFuentes();
      set({ fuentes: datos, cargando: false });
    } catch (_err) {
      set({
        error: "No se pudieron cargar las fuentes desde el servidor",
        cargando: false,
      });
    }
  },

  actualizarFuente: async (id, cambios) => {
    const estadoPrevio = get().fuentes;
    set((state) => ({
      fuentes: state.fuentes.map((f) =>
        f.id === id
          ? {
              ...f,
              ...cambios,
              actualizadoEn: new Date().toISOString(),
            }
          : f
      ),
    }));

    try {
      const remota = await actualizarFuenteRemota(id, cambios);
      set((state) => ({
        fuentes: state.fuentes.map((f) => (f.id === id ? remota : f)),
      }));
    } catch (err) {
      // Revertir mutación optimista ante error de backend (H-04)
      set({ fuentes: estadoPrevio });
      throw err;
    }
  },

  agregarFuente: async (datos) => {
    const remota = await crearFuenteRemota(datos);
    set((state) => ({
      fuentes: [remota, ...state.fuentes],
    }));
    return remota;
  },

  resetearFuentes: () =>
    set({
      fuentes: FUENTES_INICIALES,
      filtros: FILTROS_DEFECTO,
      cargando: false,
      error: null,
    }),
}));

export function useFuentesFiltradas(): FuenteInformacion[] {
  const fuentes = useFuentesStore((s) => s.fuentes);
  const filtros = useFuentesStore((s) => s.filtros);

  const busquedaNorm = filtros.busqueda.trim().toLowerCase();

  return fuentes.filter((fuente) => {
    if (filtros.ambito !== "todos" && fuente.ambito !== filtros.ambito) {
      return false;
    }
    if (filtros.estado !== "todos" && fuente.estadoEntrega !== filtros.estado) {
      return false;
    }
    if (filtros.dimension !== "todas" && fuente.dimensionSeguridad !== filtros.dimension) {
      return false;
    }
    if (filtros.tipo !== "todos" && fuente.tipo !== filtros.tipo) {
      return false;
    }
    if (busquedaNorm) {
      const texto = `${fuente.codigo} ${fuente.entidad} ${fuente.nombreFuente} ${fuente.radicadoSolicitud ?? ""} ${fuente.variablesSolicitadas.join(" ")}`.toLowerCase();
      if (!texto.includes(busquedaNorm)) {
        return false;
      }
    }
    return true;
  });
}

export function useFuentesMetricas() {
  const fuentes = useFuentesStore((s) => s.fuentes);

  const total = fuentes.length;
  const entregadas = fuentes.filter((f) => f.estadoEntrega === "entregada").length;
  const enTermino = fuentes.filter((f) => f.estadoEntrega === "en_termino").length;
  const incompletas = fuentes.filter((f) => f.estadoEntrega === "incompleta").length;
  const vencidas = fuentes.filter((f) => f.estadoEntrega === "vencida_sin_entrega").length;
  const requerimientoInsistencia = fuentes.filter(
    (f) => f.estadoEntrega === "requerimiento_insistencia"
  ).length;
  const atencionCritica = vencidas + requerimientoInsistencia;

  const porcentajeCumplimiento = total > 0 ? Math.round((entregadas / total) * 100) : 0;

  return {
    total,
    entregadas,
    enTermino,
    incompletas,
    vencidas,
    requerimientoInsistencia,
    atencionCritica,
    porcentajeCumplimiento,
  };
}
