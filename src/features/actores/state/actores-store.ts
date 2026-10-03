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
  filtros: FiltrosActores;
  setFiltros: (filtros: Partial<FiltrosActores>) => void;
  limpiarFiltros: () => void;
  getById: (id: string) => ActorEstrategico | undefined;
  agregarActor: (actor: Omit<ActorEstrategico, "id" | "actualizadoEn">) => void;
  actualizarActor: (id: string, cambios: Partial<ActorEstrategico>) => void;
  eliminarActor: (id: string) => void;
  resetearActores: () => void;
}

export const useActoresStore = create<ActoresState>((set, get) => ({
  actores: ACTORES_INICIALES,
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

  agregarActor: (datos) =>
    set((state) => {
      const nuevoId = `act-${Date.now()}`;
      const nuevoActor: ActorEstrategico = {
        ...datos,
        id: nuevoId,
        actualizadoEn: new Date().toISOString(),
      };
      return {
        actores: [nuevoActor, ...state.actores],
      };
    }),

  actualizarActor: (id, cambios) =>
    set((state) => ({
      actores: state.actores.map((a) =>
        a.id === id
          ? {
              ...a,
              ...cambios,
              actualizadoEn: new Date().toISOString(),
            }
          : a
      ),
    })),

  eliminarActor: (id) =>
    set((state) => ({
      actores: state.actores.filter((a) => a.id !== id),
    })),

  resetearActores: () =>
    set({
      actores: ACTORES_INICIALES,
      filtros: FILTROS_DEFECTO,
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
      const texto = `${actor.codigo} ${actor.nombre} ${actor.barrioVereda ?? ""} ${actor.contacto.nombreLider} ${actor.contacto.cargo} ${actor.contacto.organizacion} ${actor.expectativasPrincipales} ${actor.dimensionesPrincipales.join(" ")}`.toLowerCase();
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
