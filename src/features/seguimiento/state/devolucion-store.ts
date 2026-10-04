"use client";

import { create } from "zustand";
import type {
  PropuestaDevolucion,
  ConsolidadoParticipacionData,
  EstadoIncorporacion,
  CausalDescarteTaxativa,
} from "../models/devolucion";
import { CAUSALES_DESCARTE_INFO } from "../models/devolucion";
import {
  PROPUESTAS_DEVOLUCION_CARTAGENA,
  CONSOLIDADO_PARTICIPACION_FALLBACK,
  obtenerConsolidadoParticipacion,
  listarAportesReales,
  consultarDevolucionAporteApi,
  registrarDevolucionMotivadaApi,
  evaluarDevolucionConIa,
  type DevolucionRazonItem,
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
  guardando: boolean;
  error: string | null;
  esContingencia: boolean;
  origenDatos: "api" | "contingencia";
  totalAportes: number;
  totalRespondidos: number;
  totalPendientes: number;
  tasaRespuestaMotivada: number;
  filtros: FiltrosDevolucion;
  propuestaSeleccionadaId: string | null;
  historialDevoluciones: Record<string, DevolucionRazonItem[]>;
  evaluandoIa: boolean;
  resultadoIa: string | null;

  // Acciones
  cargarDatos: () => Promise<void>;
  setFiltros: (parcial: Partial<FiltrosDevolucion>) => void;
  limpiarFiltros: () => void;
  seleccionarPropuesta: (id: string | null) => void;
  getById: (id: string) => PropuestaDevolucion | undefined;
  cargarHistorialDevolucion: (aporteId: string) => Promise<DevolucionRazonItem[]>;
  registrarDevolucionMotivada: (
    aporteId: string,
    datos: {
      causal: "tecnica" | "juridica" | "presupuestal" | string;
      justificacion_motivada: string;
      metadatos?: Record<string, unknown>;
    }
  ) => Promise<{ exito: boolean; error?: string }>;
  ejecutarEvaluacionIa: () => Promise<boolean>;
  restablecer: () => void;
}

export const useDevolucionStore = create<DevolucionStoreState>((set, get) => ({
  propuestas: PROPUESTAS_DEVOLUCION_CARTAGENA,
  consolidado: CONSOLIDADO_PARTICIPACION_FALLBACK,
  cargando: false,
  guardando: false,
  error: null,
  esContingencia: false,
  origenDatos: "api",
  totalAportes: PROPUESTAS_DEVOLUCION_CARTAGENA.length,
  totalRespondidos: PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
    (p) => p.estado_incorporacion !== "SIN_RESPUESTA"
  ).length,
  totalPendientes: PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
    (p) => p.estado_incorporacion === "SIN_RESPUESTA"
  ).length,
  tasaRespuestaMotivada: 62.5,
  filtros: FILTROS_INICIALES_DEVOLUCION,
  propuestaSeleccionadaId: null,
  historialDevoluciones: {},
  evaluandoIa: false,
  resultadoIa: null,

  cargarDatos: async () => {
    set({ cargando: true, error: null });
    try {
      const [consolidado, resAportes] = await Promise.all([
        obtenerConsolidadoParticipacion(),
        listarAportesReales(),
      ]);

      set({
        consolidado: {
          ...consolidado,
          total_propuestas: resAportes.total,
          total_no_incorporadas: resAportes.respondidos,
          total_incorporadas: 0,
          tasa_incorporacion_efectiva: resAportes.tasaRespuesta,
        },
        propuestas: resAportes.propuestas,
        totalAportes: resAportes.total,
        totalRespondidos: resAportes.respondidos,
        totalPendientes: resAportes.pendientes,
        tasaRespuestaMotivada: resAportes.tasaRespuesta,
        esContingencia: resAportes.esContingencia,
        origenDatos: resAportes.origen,
        cargando: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al cargar datos de devolución",
        cargando: false,
        esContingencia: true,
        origenDatos: "contingencia",
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

  cargarHistorialDevolucion: async (aporteId: string) => {
    try {
      const items = await consultarDevolucionAporteApi(aporteId);
      set((s) => ({
        historialDevoluciones: {
          ...s.historialDevoluciones,
          [aporteId]: items,
        },
      }));
      return items;
    } catch {
      return [];
    }
  },

  registrarDevolucionMotivada: async (aporteId, datos) => {
    set({ guardando: true, error: null });
    try {
      const registro = await registrarDevolucionMotivadaApi(aporteId, datos);

      // Mutación inmutable en el estado local tras confirmación de la persistencia
      const estadoActual = get();
      const nuevasPropuestas = estadoActual.propuestas.map((p) => {
        if (p.id === aporteId || p.codigo === aporteId) {
          const causalTipada = datos.causal as CausalDescarteTaxativa;
          const causalInfo = CAUSALES_DESCARTE_INFO[causalTipada];
          return {
            ...p,
            estado_incorporacion: "NO_INCORPORADA_MOTIVADA" as EstadoIncorporacion,
            causal_descarte: causalTipada,
            motivacion_sustancial: datos.justificacion_motivada,
            norma_invocada: causalInfo?.norma ?? p.norma_invocada,
            ruta_alternativa: causalInfo?.canalSugerido ?? p.ruta_alternativa,
          };
        }
        return p;
      });

      const respondidos = nuevasPropuestas.filter(
        (p) => p.estado_incorporacion !== "SIN_RESPUESTA"
      ).length;
      const pendientes = nuevasPropuestas.length - respondidos;
      const tasaRespuesta =
        nuevasPropuestas.length > 0
          ? Math.round((respondidos / nuevasPropuestas.length) * 1000) / 10
          : 0;

      const prevHistorial = estadoActual.historialDevoluciones[aporteId] ?? [];
      const nuevoHistorial = {
        ...estadoActual.historialDevoluciones,
        [aporteId]: [registro, ...prevHistorial],
      };

      set({
        propuestas: nuevasPropuestas,
        totalRespondidos: respondidos,
        totalPendientes: pendientes,
        tasaRespuestaMotivada: tasaRespuesta,
        historialDevoluciones: nuevoHistorial,
        guardando: false,
      });

      return { exito: true };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al registrar devolución motivada en el servidor";
      // Principio EAF: al fallar la API, NO mutar el estado local de propuestas
      set({
        guardando: false,
        error: errorMsg,
      });
      return { exito: false, error: errorMsg };
    }
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
      guardando: false,
      error: null,
      esContingencia: false,
      origenDatos: "api",
      totalAportes: PROPUESTAS_DEVOLUCION_CARTAGENA.length,
      totalRespondidos: PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
        (p) => p.estado_incorporacion !== "SIN_RESPUESTA"
      ).length,
      totalPendientes: PROPUESTAS_DEVOLUCION_CARTAGENA.filter(
        (p) => p.estado_incorporacion === "SIN_RESPUESTA"
      ).length,
      tasaRespuestaMotivada: 62.5,
      filtros: FILTROS_INICIALES_DEVOLUCION,
      propuestaSeleccionadaId: null,
      historialDevoluciones: {},
      evaluandoIa: false,
      resultadoIa: null,
    });
  },
}));
