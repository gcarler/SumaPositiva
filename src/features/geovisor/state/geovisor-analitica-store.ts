"use client";

import { create } from "zustand";
import type { IndicadorMultifuente } from "../models/geovisor";
import type { FiltrosAnaliticaMultifuente } from "../models/analitica-multifuente";

export function normalizarCodigoTerritorio(codigo?: string): string | undefined {
  if (!codigo || ["todos", "todas"].includes(codigo.trim().toLowerCase())) return undefined;
  const normalizado = codigo.trim().toUpperCase();
  return ["13001", "DISTRITO"].includes(normalizado) ? "DISTRITO-CTG" : normalizado;
}

export function indicadorCumpleFiltros(indicador: IndicadorMultifuente, filtros: FiltrosAnaliticaMultifuente): boolean {
  const codigo = normalizarCodigoTerritorio(filtros.codigo_territorio);
  if (codigo && codigo !== normalizarCodigoTerritorio(indicador.codigo_territorio) && codigo !== indicador.territorio_id.toUpperCase()) return false;
  if (filtros.fuente_datos && ![indicador.fuente_datos, indicador.fuente_datos.split(" - ")[0]].includes(filtros.fuente_datos)) return false;
  if (filtros.anio_desde !== undefined && indicador.anio_corte < filtros.anio_desde) return false;
  if (filtros.anio_hasta !== undefined && indicador.anio_corte > filtros.anio_hasta) return false;
  if (!filtros.incluir_ediciones_previas && indicador.metadatos?.estado_cotejo_portal === "edicion_previa_no_sumar_con_portal") return false;
  if (filtros.busqueda && !`${indicador.nombre_indicador} ${indicador.codigo_indicador}`.toLocaleLowerCase("es").includes(filtros.busqueda.trim().toLocaleLowerCase("es"))) return false;
  if (filtros.dimension) {
    const clasificacion = indicador.metadatos?.clasificacion_7d;
    const alias: Record<string, string> = { personal: "PERS", comunitaria: "COM", ambiental: "AMB", economica: "ECON", salud: "SALUD", alimentaria: "SALUD", politica: "POL" };
    const declarada = typeof clasificacion === "object" && clasificacion !== null && "dimension" in clasificacion
      ? clasificacion.dimension
      : alias[String(indicador.metadatos?.dimension_seguridad_humana ?? indicador.codigo_dimension ?? "")];
    if (declarada !== filtros.dimension) return false;
  }
  return true;
}

interface EstadoAnalitica {
  filtros: FiltrosAnaliticaMultifuente;
  serieX: string | null;
  serieY: string | null;
  observacionId: string | null;
  setFiltros: (cambios: Partial<FiltrosAnaliticaMultifuente>) => void;
  setSerieX: (id: string | null) => void;
  setSerieY: (id: string | null) => void;
  seleccionarObservacion: (observacion: IndicadorMultifuente) => void;
  limpiar: () => void;
}

/** Estado de consulta en memoria: los datos remotos permanecen en TanStack Query. */
export const useGeovisorAnaliticaStore = create<EstadoAnalitica>((set) => ({
  filtros: { incluir_ediciones_previas: false },
  serieX: null,
  serieY: null,
  observacionId: null,
  setFiltros: (cambios) => set((estado) => {
    const cambioSerie = ["codigo_territorio", "fuente_datos", "dimension", "busqueda"]
      .some((clave) => Object.hasOwn(cambios, clave));
    return {
      filtros: { ...estado.filtros, ...cambios },
      ...(cambioSerie ? { serieX: null, serieY: null, observacionId: null } : {}),
    };
  }),
  setSerieX: (id) => set({ serieX: id, observacionId: null }),
  setSerieY: (id) => set({ serieY: id }),
  seleccionarObservacion: (observacion) => set((estado) => ({
    filtros: {
      ...estado.filtros,
      codigo_territorio: normalizarCodigoTerritorio(observacion.codigo_territorio ?? observacion.territorio_id),
      fuente_datos: observacion.fuente_datos.split(" - ")[0],
    },
    serieX: null,
    serieY: null,
    observacionId: observacion.id,
  })),
  limpiar: () => set({
    filtros: { incluir_ediciones_previas: false }, serieX: null, serieY: null, observacionId: null,
  }),
}));
