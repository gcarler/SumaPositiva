import { create } from "zustand";
import type { TipoTestimonio } from "../models/testimonio";

/** Solo filtro visual; los relatos se obtienen y guardan mediante la API. */
interface TestimoniosState {
  filtroTipo: TipoTestimonio | "todos";
  setFiltro: (tipo: TipoTestimonio | "todos") => void;
}

export const useTestimoniosStore = create<TestimoniosState>((set) => ({
  filtroTipo: "todos",
  setFiltro: (filtroTipo) => set({ filtroTipo }),
}));
