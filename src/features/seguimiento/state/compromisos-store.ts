"use client";

import { create } from "zustand";
import type {
  CompromisoInstitucional,
  EstadoCompromiso,
  CompromisoActualizarAvance,
  KpisSeguimiento,
} from "../models/compromiso";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";
import {
  listarCompromisosApi,
  crearCompromisoApi,
  actualizarAvanceCompromisoApi,
  eliminarCompromisoApi,
} from "../services/compromisos-api";

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
      compromisosConReporte: 0,
      compromisosSinReporte: 0,
      compromisosEnEjecucionOCumplidos: 0,
      compromisosEnRiesgoORetrasados: 0,
      promedioCumplimientoCuatrienal: null,
      presupuestoTotalAnualCop: 0,
    };
  }

  let enEjecucionOCumplidos = 0;
  let enRiesgoORetrasados = 0;
  let compromisosConReporte = 0;
  let sumaCumplimiento = 0;
  let sumaPresupuesto = 0;

  for (const c of compromisos) {
    if (c.estado === "cumplido" || c.estado === "en_ejecucion") {
      enEjecucionOCumplidos++;
    } else if (c.estado === "en_riesgo" || c.estado === "retrasado") {
      enRiesgoORetrasados++;
    }

    if (
      c.porcentaje_cumplimiento !== null &&
      c.porcentaje_cumplimiento !== undefined &&
      c.estado !== "sin_reporte"
    ) {
      compromisosConReporte++;
      sumaCumplimiento += c.porcentaje_cumplimiento;
    }

    if (c.presupuesto_anual_cop !== null && c.presupuesto_anual_cop !== undefined) {
      sumaPresupuesto += c.presupuesto_anual_cop;
    }
  }

  const compromisosSinReporte = total - compromisosConReporte;
  const promedio =
    compromisosConReporte > 0
      ? Math.round(sumaCumplimiento / compromisosConReporte)
      : null;

  return {
    totalCompromisos: total,
    compromisosConReporte,
    compromisosSinReporte,
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
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  esContingencia: boolean;

  // Acciones
  cargarCompromisos: () => Promise<void>;
  agregarCompromiso: (datos: Omit<CompromisoInstitucional, "id">) => Promise<CompromisoInstitucional | null>;
  actualizarAvance: (id: string, actualizacion: CompromisoActualizarAvance) => Promise<boolean>;
  cambiarEstado: (id: string, nuevoEstado: EstadoCompromiso) => Promise<boolean>;
  eliminarCompromiso: (id: string) => Promise<boolean>;
  setFiltros: (parcial: Partial<CompromisosFiltros>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => CompromisoInstitucional | undefined;
  restablecerCanonicos: () => void;
}

export const useCompromisosStore = create<CompromisosStoreState>((set, get) => ({
  compromisos: COMPROMISOS_PAS_CANONICOS,
  filtros: FILTROS_INICIALES_COMPROMISOS,
  cargando: false,
  guardando: false,
  error: null,
  esContingencia: false,

  cargarCompromisos: async () => {
    set({ cargando: true, error: null });
    try {
      const res = await listarCompromisosApi();
      set({
        compromisos: res.datos,
        esContingencia: res.esContingencia,
        cargando: false,
      });
    } catch (err) {
      set({
        compromisos: COMPROMISOS_PAS_CANONICOS,
        esContingencia: true,
        error: (err as Error).message || "Fallo de conexión",
        cargando: false,
      });
    }
  },

  agregarCompromiso: async (datos) => {
    set({ guardando: true, error: null });
    try {
      const creado = await crearCompromisoApi(datos);
      set((state) => ({
        compromisos: [creado, ...state.compromisos],
        guardando: false,
      }));
      return creado;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al persistir compromiso en backend";
      set({ guardando: false, error: mensaje });
      // OBS-01: Prohibido mutar estado local ante fallo en backend
      return null;
    }
  },

  actualizarAvance: async (id, actualizacion) => {
    const actual = get().getById(id);
    if (!actual) {
      set({ error: `Compromiso '${id}' no encontrado` });
      return false;
    }

    set({ guardando: true, error: null });
    try {
      const actualizado = await actualizarAvanceCompromisoApi(id, actualizacion);
      set((state) => ({
        compromisos: state.compromisos.map((c) =>
          c.id === id || c.codigo === id ? actualizado : c
        ),
        guardando: false,
      }));
      return true;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al actualizar avance en backend";
      set({ guardando: false, error: mensaje });
      // OBS-01: Prohibido mutar estado local ante fallo en backend
      return false;
    }
  },

  cambiarEstado: async (id, nuevoEstado) => {
    const actual = get().getById(id);
    if (!actual) {
      set({ error: `Compromiso '${id}' no encontrado` });
      return false;
    }

    set({ guardando: true, error: null });
    try {
      const actualizado = await actualizarAvanceCompromisoApi(id, {
        avance_cuatrienal_valor: actual.avance_cuatrienal_valor,
        estado: nuevoEstado,
      });
      set((state) => ({
        compromisos: state.compromisos.map((c) =>
          c.id === id || c.codigo === id ? actualizado : c
        ),
        guardando: false,
      }));
      return true;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al cambiar estado en backend";
      set({ guardando: false, error: mensaje });
      // OBS-01: Prohibido mutar estado local ante fallo en backend
      return false;
    }
  },

  eliminarCompromiso: async (id) => {
    const existe = get().getById(id);
    if (!existe) {
      set({ error: `Compromiso '${id}' no encontrado` });
      return false;
    }

    set({ guardando: true, error: null });
    try {
      await eliminarCompromisoApi(id);
      set((state) => ({
        compromisos: state.compromisos.filter((c) => c.id !== id && c.codigo !== id),
        guardando: false,
      }));
      return true;
    } catch (err) {
      const mensaje = (err as Error).message || "Error al eliminar compromiso en backend";
      set({ guardando: false, error: mensaje });
      // OBS-01: Prohibido mutar estado local ante fallo en backend
      return false;
    }
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
    return get().compromisos.find((c) => c.id === id || c.codigo === id);
  },

  restablecerCanonicos: () => {
    set({
      compromisos: COMPROMISOS_PAS_CANONICOS,
      filtros: FILTROS_INICIALES_COMPROMISOS,
      cargando: false,
      guardando: false,
      error: null,
      esContingencia: false,
    });
  },
}));
