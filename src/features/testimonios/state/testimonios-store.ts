import { create } from "zustand";
import { TESTIMONIOS_MOCK } from "../data/testimonios.mock";
import type { Testimonio, TipoTestimonio } from "../models/testimonio";

export interface TestimoniosState {
  testimonios: Testimonio[];
  filtroTipo: TipoTestimonio | "todos";
  setFiltro: (t: TipoTestimonio | "todos") => void;
  agregarTestimonio: (nuevo: {
    nombre: string;
    anonimo: boolean;
    barrio?: string;
    localidad?: string;
    tipo: TipoTestimonio;
    texto: string;
    dimensionOnu?: string;
  }) => Testimonio;
}

export const useTestimoniosStore = create<TestimoniosState>((set) => ({
  testimonios: TESTIMONIOS_MOCK,
  filtroTipo: "todos",
  setFiltro: (filtroTipo) => set({ filtroTipo }),
  agregarTestimonio: (nuevo) => {
    const id = `testimonio-${Date.now()}`;
    const isoDate = new Date().toISOString();
    const item: Testimonio = {
      id,
      nombre: nuevo.anonimo ? "Anónimo" : (nuevo.nombre || "Anónimo"),
      anonimo: nuevo.anonimo,
      barrio: nuevo.barrio,
      localidad: nuevo.localidad,
      tipo: nuevo.tipo,
      texto: nuevo.texto,
      textoCompleto: nuevo.texto,
      dimensionOnu: nuevo.dimensionOnu,
      verificado: false,
      creadoEn: isoDate,
      destacado: false,

      // Retrocompatibilidad con esquemas de backend / paneles de gestión
      codigo_unico: `TEST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      nombre_autor: nuevo.anonimo ? "Anónimo" : (nuevo.nombre || "Anónimo"),
      relato: nuevo.texto,
      titulo: nuevo.texto.slice(0, 40) + "...",
      estado: "PENDIENTE",
      creado_en: isoDate,
      actualizado_en: isoDate,
    };
    set((state) => ({
      testimonios: [item, ...state.testimonios],
    }));
    return item;
  },
}));
