import { create } from "zustand";
import type { CategoriaNoticia, Noticia } from "../models/noticia";

/** Solo filtros de interfaz; el contenido editorial vive en la API. */
interface NoticiasState {
  filtroCategoria: CategoriaNoticia | "todas";
  busqueda: string;
  setFiltro: (categoria: CategoriaNoticia | "todas") => void;
  setBusqueda: (busqueda: string) => void;
}

export const useNoticiasStore = create<NoticiasState>((set) => ({
  filtroCategoria: "todas",
  busqueda: "",
  setFiltro: (filtroCategoria) => set({ filtroCategoria }),
  setBusqueda: (busqueda) => set({ busqueda }),
}));

export function noticiasPublicadasOrdenadas(noticias: Noticia[]): Noticia[] {
  return noticias
    .filter((noticia) => noticia.estado === "publicada")
    .slice()
    .sort((a, b) => {
      const prioridad = (a.ordenPrioridad ?? 999) - (b.ordenPrioridad ?? 999);
      return prioridad || new Date(b.publicadaEn).getTime() - new Date(a.publicadaEn).getTime();
    });
}
