"use client";

import { create } from "zustand";
import type {
  AlternativaSolucion,
  EstadoAlternativa,
  SectorMGA,
} from "../models/alternativa";
import { ALTERNATIVAS_CANONICAS } from "../data/alternativas-canonicas.data";

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
    if (filtros.enfoqueEtnico === "solo_etnicos" && !alt.requiere_consulta_previa) {
      return false;
    }
    if (filtros.enfoqueEtnico === "no_etnicos" && alt.requiere_consulta_previa) {
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
  setFiltros: (filtros: Partial<FiltrosAlternativas>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => AlternativaSolucion | undefined;
  agregarAlternativa: (
    datos: Omit<AlternativaSolucion, "id" | "creado_en" | "actualizado_en">
  ) => string;
  actualizarAlternativa: (
    id: string,
    cambios: Partial<AlternativaSolucion>
  ) => void;
  eliminarAlternativa: (id: string) => void;
  cambiarEstado: (id: string, nuevoEstado: EstadoAlternativa) => void;
  resetearAlternativas: () => void;
}

export const useAlternativasStore = create<AlternativasState>((set, get) => ({
  alternativas: ALTERNATIVAS_CANONICAS,
  filtros: FILTROS_DEFECTO_ALTERNATIVAS,

  setFiltros: (cambios) =>
    set((state) => ({
      filtros: { ...state.filtros, ...cambios },
    })),

  limpiarFiltros: () =>
    set({
      filtros: FILTROS_DEFECTO_ALTERNATIVAS,
    }),

  getById: (id) => get().alternativas.find((a) => a.id === id),

  agregarAlternativa: (datos) => {
    const nuevoId = `alt-${Date.now()}`;
    const ahora = new Date().toISOString();
    const nuevaAlternativa: AlternativaSolucion = {
      ...datos,
      id: nuevoId,
      creado_en: ahora,
      actualizado_en: ahora,
    };
    set((state) => ({
      alternativas: [nuevaAlternativa, ...state.alternativas],
    }));
    return nuevoId;
  },

  actualizarAlternativa: (id, cambios) =>
    set((state) => ({
      alternativas: state.alternativas.map((a) =>
        a.id === id
          ? {
              ...a,
              ...cambios,
              actualizado_en: new Date().toISOString(),
            }
          : a
      ),
    })),

  eliminarAlternativa: (id) =>
    set((state) => ({
      alternativas: state.alternativas.filter((a) => a.id !== id),
    })),

  cambiarEstado: (id, nuevoEstado) =>
    set((state) => ({
      alternativas: state.alternativas.map((a) =>
        a.id === id
          ? {
              ...a,
              estado: nuevoEstado,
              actualizado_en: new Date().toISOString(),
            }
          : a
      ),
    })),

  resetearAlternativas: () =>
    set({
      alternativas: ALTERNATIVAS_CANONICAS,
      filtros: FILTROS_DEFECTO_ALTERNATIVAS,
    }),
}));
