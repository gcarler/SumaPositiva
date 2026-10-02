import { create } from "zustand";
import { NOTICIAS_MOCK } from "../data/noticias.mock";
import type {
  Noticia,
  NoticiaInput,
  CategoriaNoticia,
  EstadoNoticia,
} from "../models/noticia";

export interface NoticiasState {
  noticias: Noticia[];
  filtroCategoria: CategoriaNoticia | "todas";
  busqueda: string;
  setFiltro: (c: CategoriaNoticia | "todas") => void;
  setBusqueda: (q: string) => void;
  crearNoticia: (input: NoticiaInput) => Noticia;
  actualizarNoticia: (id: string, patch: Partial<Noticia>) => void;
  eliminarNoticia: (id: string) => void;
  cambiarEstado: (id: string, estado: EstadoNoticia) => void;
  reordenarPrioridad: (id: string, nuevoOrden: number) => void;
}

export const useNoticiasStore = create<NoticiasState>((set) => ({
  noticias: NOTICIAS_MOCK,
  filtroCategoria: "todas",
  busqueda: "",
  setFiltro: (filtroCategoria) => set({ filtroCategoria }),
  setBusqueda: (busqueda) => set({ busqueda }),
  crearNoticia: (input) => {
    const id = `noticia-${Date.now()}`;
    const slug = input.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const nueva: Noticia = {
      ...input,
      id,
      slug: slug || id,
      publicadaEn: new Date().toISOString(),
    };
    set((state) => ({ noticias: [nueva, ...state.noticias] }));
    return nueva;
  },
  actualizarNoticia: (id, patch) => {
    set((state) => ({
      noticias: state.noticias.map((n) =>
        n.id === id ? { ...n, ...patch } : n
      ),
    }));
  },
  eliminarNoticia: (id) => {
    set((state) => ({
      noticias: state.noticias.filter((n) => n.id !== id),
    }));
  },
  cambiarEstado: (id, estado) => {
    set((state) => ({
      noticias: state.noticias.map((n) =>
        n.id === id ? { ...n, estado } : n
      ),
    }));
  },
  reordenarPrioridad: (id, nuevoOrden) => {
    set((state) => ({
      noticias: state.noticias.map((n) =>
        n.id === id ? { ...n, ordenPrioridad: nuevoOrden } : n
      ),
    }));
  },
}));

/**
 * Selector helper: retorna las noticias con estado "publicada",
 * ordenadas por `ordenPrioridad ASC` (1 primero), y luego por `publicadaEn DESC`.
 */
export function noticiasPublicadasOrdenadas(noticias: Noticia[]): Noticia[] {
  return noticias
    .filter((n) => n.estado === "publicada")
    .sort((a, b) => {
      const ordA = a.ordenPrioridad ?? 999;
      const ordB = b.ordenPrioridad ?? 999;
      if (ordA !== ordB) {
        return ordA - ordB;
      }
      return new Date(b.publicadaEn).getTime() - new Date(a.publicadaEn).getTime();
    });
}
