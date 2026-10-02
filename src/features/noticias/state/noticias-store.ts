import { create } from "zustand";
import { NOTICIAS_MOCK } from "../data/noticias.mock";
import type { Noticia, CategoriaNoticia } from "../models/noticia";

export interface NoticiasState {
  noticias: Noticia[];
  filtroCategoria: CategoriaNoticia | "todas";
  busqueda: string;
  setFiltro: (c: CategoriaNoticia | "todas") => void;
  setBusqueda: (q: string) => void;
}

export const useNoticiasStore = create<NoticiasState>((set) => ({
  noticias: NOTICIAS_MOCK,
  filtroCategoria: "todas",
  busqueda: "",
  setFiltro: (filtroCategoria) => set({ filtroCategoria }),
  setBusqueda: (busqueda) => set({ busqueda }),
}));
