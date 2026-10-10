"use client";

import { create } from "zustand";
import type {
  AlternativaSolucion,
  EstadoAlternativa,
  SectorMGA,
} from "../models/alternativa";
import { ALTERNATIVAS_CANONICAS } from "../data/alternativas-canonicas.data";
import {
  listarAlternativasApi,
  crearAlternativaApi,
  actualizarAlternativaApi,
  eliminarAlternativaApi,
} from "../services/alternativas-api";

export interface FiltrosAlternativas {
  busqueda: string;
  sector: SectorMGA | "todos";
  linea: string | "todas";
  dimension: string | "todas";
  estado: EstadoAlternativa | "todos";
  enfoqueEtnico: "todos" | "solo_etnicos" | "no_etnicos";
}

export const FILTROS_DEFECTO_ALTERNATIVAS: FiltrosAlternativas = {
  busqueda: "",
  sector: "todos",
  linea: "todas",
  dimension: "todas",
  estado: "todos",
  enfoqueEtnico: "todos",
};

export interface KPIsAlternativas {
  total: number;
  inversionTotalCOP: number;
  viablesOPriorizadas: number;
  conEnfoqueEtnico: number;
  promedioHorizonte: number;
}

export function calcularKPIsAlternativas(
  alternativas: AlternativaSolucion[]
): KPIsAlternativas {
  const total = alternativas.length;
  if (total === 0) {
    return {
      total: 0,
      inversionTotalCOP: 0,
      viablesOPriorizadas: 0,
      conEnfoqueEtnico: 0,
      promedioHorizonte: 0,
    };
  }

  let inversionTotalCOP = 0;
  let viablesOPriorizadas = 0;
  let conEnfoqueEtnico = 0;
  let sumaHorizonte = 0;

  for (const alt of alternativas) {
    inversionTotalCOP += alt.costo_estimado_cop || 0;
    if (alt.estado === "priorizada" || alt.estado === "viable") {
      viablesOPriorizadas += 1;
    }
    if (alt.requiere_consulta_previa || alt.sector === "etnico_comunitario") {
      conEnfoqueEtnico += 1;
    }
    sumaHorizonte += alt.horizonte_anios || 0;
  }

  return {
    total,
    inversionTotalCOP,
    viablesOPriorizadas,
    conEnfoqueEtnico,
    promedioHorizonte: Math.round((sumaHorizonte / total) * 10) / 10,
  };
}

export function filtrarAlternativas(
  alternativas: AlternativaSolucion[],
  filtros: FiltrosAlternativas
): AlternativaSolucion[] {
  const q = filtros.busqueda.trim().toLowerCase();

  return alternativas.filter((alt) => {
    // Filtro por sector
    if (filtros.sector !== "todos" && alt.sector !== filtros.sector) {
      return false;
    }
    // Filtro por línea estratégica
    if (filtros.linea !== "todas" && alt.linea_estrategica_codigo !== filtros.linea) {
      return false;
    }
    // Filtro por dimensión ONU
    if (filtros.dimension !== "todas" && alt.dimension_id !== filtros.dimension) {
      return false;
    }
    // Filtro por estado
    if (filtros.estado !== "todos" && alt.estado !== filtros.estado) {
      return false;
    }
    // Filtro por enfoque étnico (Ley 70/93)
    if (filtros.enfoqueEtnico === "solo_etnicos" && !alt.requiere_consulta_previa && alt.sector !== "etnico_comunitario") {
      return false;
    }
    if (filtros.enfoqueEtnico === "no_etnicos" && (alt.requiere_consulta_previa || alt.sector === "etnico_comunitario")) {
      return false;
    }
    // Búsqueda textual
    if (q) {
      const matchCodigo = alt.codigo.toLowerCase().includes(q);
      const matchNombre = alt.nombre.toLowerCase().includes(q);
      const matchDesc = alt.descripcion.toLowerCase().includes(q);
      const matchTerritorio = alt.territorio_cobertura.toLowerCase().includes(q);
      const matchObjetivo = alt.objetivo_central_mga.toLowerCase().includes(q);
      if (!matchCodigo && !matchNombre && !matchDesc && !matchTerritorio && !matchObjetivo) {
        return false;
      }
    }

    return true;
  });
}

export interface AlternativasState {
  alternativas: AlternativaSolucion[];
  filtros: FiltrosAlternativas;
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  esContingencia: boolean;

  setFiltros: (filtros: Partial<FiltrosAlternativas>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => AlternativaSolucion | undefined;
  cargarAlternativas: () => Promise<void>;
  agregarAlternativa: (
    datos: Omit<AlternativaSolucion, "id" | "creado_en" | "actualizado_en">
  ) => Promise<string | null>;
  actualizarAlternativa: (
    id: string,
    cambios: Partial<AlternativaSolucion>,
    justificacion?: string
  ) => Promise<boolean>;
  eliminarAlternativa: (id: string) => Promise<boolean>;
  cambiarEstado: (id: string, nuevoEstado: EstadoAlternativa) => Promise<boolean>;
  resetearAlternativas: () => void;
}

export const useAlternativasStore = create<AlternativasState>((set, get) => ({
  alternativas: ALTERNATIVAS_CANONICAS,
  filtros: FILTROS_DEFECTO_ALTERNATIVAS,
  cargando: false,
  guardando: false,
  error: null,
  esContingencia: false,

  setFiltros: (cambios) =>
    set((state) => ({
      filtros: { ...state.filtros, ...cambios },
    })),

  limpiarFiltros: () =>
    set({
      filtros: FILTROS_DEFECTO_ALTERNATIVAS,
    }),

  getById: (id) =>
    get().alternativas.find((a) => a.id === id || a.codigo === id),

  cargarAlternativas: async () => {
    set({ cargando: true, error: null });
    try {
      const res = await listarAlternativasApi(get().filtros);
      set({
        alternativas: res.datos,
        esContingencia: res.esContingencia,
        cargando: false,
      });
    } catch (err) {
      set({
        alternativas: ALTERNATIVAS_CANONICAS,
        esContingencia: true,
        error: (err as Error).message || "Fallo de conexión",
        cargando: false,
      });
    }
  },

  agregarAlternativa: async (datos) => {
    set({ guardando: true, error: null });
    try {
      const creada = await crearAlternativaApi(datos);
      set((state) => ({
        alternativas: [creada, ...state.alternativas],
        guardando: false,
      }));
      return creada.id;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al persistir alternativa en el servidor";
      set({ guardando: false, error: mensaje });
      // Prohibición absoluta de mutación silenciosa en error
      return null;
    }
  },

  actualizarAlternativa: async (id, cambios, justificacion) => {
    set({ guardando: true, error: null });
    try {
      const actualizada = await actualizarAlternativaApi(id, cambios, justificacion);
      set((state) => ({
        alternativas: state.alternativas.map((a) =>
          a.id === id || a.codigo === id ? actualizada : a
        ),
        guardando: false,
      }));
      return true;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al actualizar alternativa en el servidor";
      set({ guardando: false, error: mensaje });
      // Prohibición absoluta de mutación silenciosa en error
      return false;
    }
  },

  eliminarAlternativa: async (id) => {
    set({ guardando: true, error: null });
    try {
      await eliminarAlternativaApi(id);
      set((state) => ({
        alternativas: state.alternativas.filter((a) => a.id !== id && a.codigo !== id),
        guardando: false,
      }));
      return true;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al eliminar alternativa en el servidor";
      set({ guardando: false, error: mensaje });
      return false;
    }
  },

  cambiarEstado: async (id, nuevoEstado) => {
    return await get().actualizarAlternativa(
      id,
      { estado: nuevoEstado },
      `Cambio de estado a '${nuevoEstado}'`
    );
  },

  resetearAlternativas: () =>
    set({
      alternativas: ALTERNATIVAS_CANONICAS,
      filtros: FILTROS_DEFECTO_ALTERNATIVAS,
      error: null,
      esContingencia: false,
      cargando: false,
      guardando: false,
    }),
}));
