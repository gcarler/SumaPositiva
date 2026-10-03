"use client";

import { create } from "zustand";
import type {
  CompromisoInstitucional,
  EstadoCompromiso,
  CompromisoActualizarAvance,
  KpisSeguimiento,
} from "../models/compromiso";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

export interface CompromisosFiltros {
  busqueda: string;
  entidad: string | "todas";
  linea: string | "todas";
  estado: EstadoCompromiso | "todos";
}

export const FILTROS_INICIALES_COMPROMISOS: CompromisosFiltros = {
  busqueda: "",
  entidad: "todas",
  linea: "todas",
  estado: "todos",
};

export function calcularKpisSeguimiento(
  compromisos: CompromisoInstitucional[]
): KpisSeguimiento {
  const total = compromisos.length;
  if (total === 0) {
    return {
      totalCompromisos: 0,
      compromisosEnEjecucionOCumplidos: 0,
      compromisosEnRiesgoORetrasados: 0,
      promedioCumplimientoCuatrienal: 0,
      presupuestoTotalAnualCop: 0,
    };
  }

  let enEjecucionOCumplidos = 0;
  let enRiesgoORetrasados = 0;
  let sumaCumplimiento = 0;
  let sumaPresupuesto = 0;

  for (const c of compromisos) {
    if (c.estado === "cumplido" || c.estado === "en_ejecucion") {
      enEjecucionOCumplidos++;
    } else if (c.estado === "en_riesgo" || c.estado === "retrasado") {
      enRiesgoORetrasados++;
    }

    sumaCumplimiento += c.porcentaje_cumplimiento;
    sumaPresupuesto += c.presupuesto_anual_cop;
  }

  const promedio = Math.round(sumaCumplimiento / total);

  return {
    totalCompromisos: total,
    compromisosEnEjecucionOCumplidos: enEjecucionOCumplidos,
    compromisosEnRiesgoORetrasados: enRiesgoORetrasados,
    promedioCumplimientoCuatrienal: promedio,
    presupuestoTotalAnualCop: sumaPresupuesto,
  };
}

export function filtrarCompromisos(
  compromisos: CompromisoInstitucional[],
  filtros: CompromisosFiltros
): CompromisoInstitucional[] {
  return compromisos.filter((item) => {
    const q = filtros.busqueda.trim().toLowerCase();
    if (q) {
      const matchCod = item.codigo.toLowerCase().includes(q);
      const matchNom = item.nombre.toLowerCase().includes(q);
      const matchEnt = item.entidad_responsable.toLowerCase().includes(q);
      const matchAlt = item.alternativa_mga_codigo.toLowerCase().includes(q);
      const matchInd = item.indicador_asociado_codigo.toLowerCase().includes(q);
      const matchMeta = item.meta_cuatrienal_descripcion.toLowerCase().includes(q);
      if (!matchCod && !matchNom && !matchEnt && !matchAlt && !matchInd && !matchMeta) {
        return false;
      }
    }

    if (filtros.entidad !== "todas" && item.entidad_responsable !== filtros.entidad) {
      return false;
    }

    if (filtros.linea !== "todas" && item.linea_estrategica_codigo !== filtros.linea) {
      return false;
    }

    if (filtros.estado !== "todos" && item.estado !== filtros.estado) {
      return false;
    }

    return true;
  });
}

export interface CompromisosStoreState {
  compromisos: CompromisoInstitucional[];
  filtros: CompromisosFiltros;

  // Acciones
  agregarCompromiso: (datos: Omit<CompromisoInstitucional, "id">) => CompromisoInstitucional;
  actualizarAvance: (id: string, actualizacion: CompromisoActualizarAvance) => boolean;
  cambiarEstado: (id: string, nuevoEstado: EstadoCompromiso) => boolean;
  eliminarCompromiso: (id: string) => boolean;
  setFiltros: (parcial: Partial<CompromisosFiltros>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => CompromisoInstitucional | undefined;
  restablecerCanonicos: () => void;
}

export const useCompromisosStore = create<CompromisosStoreState>((set, get) => ({
  compromisos: COMPROMISOS_PAS_CANONICOS,
  filtros: FILTROS_INICIALES_COMPROMISOS,

  agregarCompromiso: (datos) => {
    const nuevo: CompromisoInstitucional = {
      ...datos,
      id: `pas-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => ({
      compromisos: [nuevo, ...state.compromisos],
    }));
    return nuevo;
  },

  actualizarAvance: (id, actualizacion) => {
    const actual = get().getById(id);
    if (!actual) return false;

    const nuevoAvance = actualizacion.avance_cuatrienal_valor;
    const meta = actual.meta_cuatrienal_valor || 1;
    const porcentaje = Math.min(100, Math.max(0, Math.round((nuevoAvance / meta) * 100)));

    let nuevoEstado: EstadoCompromiso = actualizacion.estado ?? actual.estado;
    if (!actualizacion.estado) {
      if (porcentaje >= 100) nuevoEstado = "cumplido";
      else if (porcentaje < 30) nuevoEstado = "retrasado";
      else if (porcentaje < 50) nuevoEstado = "en_riesgo";
      else nuevoEstado = "en_ejecucion";
    }

    set((state) => ({
      compromisos: state.compromisos.map((c) =>
        c.id === id
          ? {
              ...c,
              avance_cuatrienal_valor: nuevoAvance,
              porcentaje_cumplimiento: porcentaje,
              estado: nuevoEstado,
              fecha_corte_ultimo_reporte:
                actualizacion.fecha_corte_ultimo_reporte ??
                new Date().toISOString().split("T")[0],
              metadatos: {
                ...c.metadatos,
                ...(actualizacion.observacion_cualitativa
                  ? { observacion_cualitativa: actualizacion.observacion_cualitativa }
                  : {}),
                ...(actualizacion.url_evidencia
                  ? { url_evidencia: actualizacion.url_evidencia }
                  : {}),
                fecha_modificacion: new Date().toISOString(),
              },
            }
          : c
      ),
    }));
    return true;
  },

  cambiarEstado: (id, nuevoEstado) => {
    const existe = get().getById(id);
    if (!existe) return false;

    set((state) => ({
      compromisos: state.compromisos.map((c) =>
        c.id === id ? { ...c, estado: nuevoEstado } : c
      ),
    }));
    return true;
  },

  eliminarCompromiso: (id) => {
    const existe = get().getById(id);
    if (!existe) return false;

    set((state) => ({
      compromisos: state.compromisos.filter((c) => c.id !== id),
    }));
    return true;
  },

  setFiltros: (parcial) => {
    set((state) => ({
      filtros: { ...state.filtros, ...parcial },
    }));
  },

  limpiarFiltros: () => {
    set({ filtros: FILTROS_INICIALES_COMPROMISOS });
  },

  getById: (id) => {
    return get().compromisos.find((c) => c.id === id);
  },

  restablecerCanonicos: () => {
    set({ compromisos: COMPROMISOS_PAS_CANONICOS, filtros: FILTROS_INICIALES_COMPROMISOS });
  },
}));
