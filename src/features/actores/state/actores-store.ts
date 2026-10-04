"use client";

import { create } from "zustand";
import type {
  ActorEstrategico,
  CuadranteMatriz,
  NivelInteres,
  NivelPoder,
  PosturaActor,
  TerritorioActor,
  TipoActor,
} from "../models/actor";
import { ACTORES_INICIALES } from "../data/actores-iniciales.data";
import {
  actualizarActorApi,
  crearActorApi,
  eliminarActorApi,
  listarActoresApi,
} from "../services/actores-api";

export function calcularCuadrante(
  poder: NivelPoder,
  interes: NivelInteres
): CuadranteMatriz {
  const esAltoPoder = poder === "alto";
  const esAltoInteres = interes === "alto";

  if (esAltoPoder && esAltoInteres) return "aliados_clave";
  if (esAltoPoder && !esAltoInteres) return "incidencia_estrategica";
  if (!esAltoPoder && esAltoInteres) return "base_social";
  return "monitoreo";
}

export interface FiltrosActores {
  busqueda: string;
  tipo: TipoActor | "todos";
  territorio: TerritorioActor | "todos";
  postura: PosturaActor | "todos";
  cuadrante: CuadranteMatriz | "todos";
  dimension: string | "todas";
}

const FILTROS_DEFECTO: FiltrosActores = {
  busqueda: "",
  tipo: "todos",
  territorio: "todos",
  postura: "todos",
  cuadrante: "todos",
  dimension: "todas",
};

export interface ActoresState {
  actores: ActorEstrategico[];
  cargando: boolean;
  error: string | null;
  filtros: FiltrosActores;
  setFiltros: (filtros: Partial<FiltrosActores>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => ActorEstrategico | undefined;
  cargarActores: () => Promise<void>;
  agregarActor: (actor: Omit<ActorEstrategico, "id" | "actualizadoEn">) => Promise<boolean>;
  actualizarActor: (id: string, cambios: Partial<ActorEstrategico>) => Promise<boolean>;
  eliminarActor: (id: string) => Promise<boolean>;
  resetearActores: () => void;
}

export const useActoresStore = create<ActoresState>((set, get) => ({
  actores: ACTORES_INICIALES,
  cargando: false,
  error: null,
  filtros: FILTROS_DEFECTO,

  setFiltros: (cambios) =>
    set((state) => ({
      filtros: { ...state.filtros, ...cambios },
    })),

  limpiarFiltros: () =>
    set({
      filtros: FILTROS_DEFECTO,
    }),

  getById: (id) => get().actores.find((a) => a.id === id),

  cargarActores: async () => {
    set({ cargando: true, error: null });
    try {
      const lista = await listarActoresApi();
      set({ actores: lista, cargando: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar actores";
      set({ error: msg, cargando: false });
    }
  },

  agregarActor: async (datos) => {
    try {
      const nuevo = await crearActorApi(datos);
      set((state) => ({
        actores: [nuevo, ...state.actores],
      }));
      return true;
    } catch (err) {
      console.error("Error al registrar actor estratégico:", err);
      return false;
    }
  },

  actualizarActor: async (id, cambios) => {
    try {
      const actualizado = await actualizarActorApi(id, cambios);
      set((state) => ({
        actores: state.actores.map((a) => (a.id === id ? actualizado : a)),
      }));
      return true;
    } catch (err) {
      console.error("Error al actualizar actor estratégico:", err);
      return false;
    }
  },

  eliminarActor: async (id) => {
    try {
      await eliminarActorApi(id);
      set((state) => ({
        actores: state.actores.filter((a) => a.id !== id),
      }));
      return true;
    } catch (err) {
      console.error("Error al eliminar actor estratégico:", err);
      return false;
    }
  },

  resetearActores: () =>
    set({
      actores: ACTORES_INICIALES,
      filtros: FILTROS_DEFECTO,
      error: null,
    }),
}));

export function useActoresFiltrados(): ActorEstrategico[] {
  const actores = useActoresStore((s) => s.actores);
  const filtros = useActoresStore((s) => s.filtros);

  const busquedaNorm = filtros.busqueda.trim().toLowerCase();

  return actores.filter((actor) => {
    if (filtros.tipo !== "todos" && actor.tipo !== filtros.tipo) {
      return false;
    }
    if (filtros.territorio !== "todos" && actor.territorio !== filtros.territorio) {
      return false;
    }
    if (filtros.postura !== "todos" && actor.postura !== filtros.postura) {
      return false;
    }
    if (filtros.dimension !== "todas" && !actor.dimensionesPrincipales.includes(filtros.dimension)) {
      return false;
    }
    if (filtros.cuadrante !== "todos") {
      const cuadranteActor = calcularCuadrante(actor.nivelPoder, actor.nivelInteres);
      if (cuadranteActor !== filtros.cuadrante) {
        return false;
      }
    }
    if (busquedaNorm) {
      const nombreLider = actor.contacto?.nombreLider ?? "";
      const cargo = actor.contacto?.cargo ?? "";
      const organizacion = actor.contacto?.organizacion ?? "";
      const texto = `${actor.codigo} ${actor.nombre} ${actor.barrioVereda ?? ""} ${nombreLider} ${cargo} ${organizacion} ${actor.expectativasPrincipales} ${actor.dimensionesPrincipales.join(" ")}`.toLowerCase();
      if (!texto.includes(busquedaNorm)) {
        return false;
      }
    }
    return true;
  });
}

export function useActoresMetricas() {
  const actores = useActoresStore((s) => s.actores);

  const total = actores.length;
  let aliadosClave = 0;
  let incidenciaEstrategica = 0;
  let baseSocial = 0;
  let monitoreo = 0;
  let promotores = 0;
  let propuestasTotales = 0;

  for (const a of actores) {
    const c = calcularCuadrante(a.nivelPoder, a.nivelInteres);
    if (c === "aliados_clave") aliadosClave++;
    else if (c === "incidencia_estrategica") incidenciaEstrategica++;
    else if (c === "base_social") baseSocial++;
    else monitoreo++;

    if (a.postura === "promotor_aliado") promotores++;
    if (a.propuestasRadicadas) propuestasTotales += a.propuestasRadicadas;
  }

  const porcentajePromotores = total > 0 ? Math.round((promotores / total) * 100) : 0;

  return {
    total,
    aliadosClave,
    incidenciaEstrategica,
    baseSocial,
    monitoreo,
    promotores,
    porcentajePromotores,
    propuestasTotales,
  };
}
