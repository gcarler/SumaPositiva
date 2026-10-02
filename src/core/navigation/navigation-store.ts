"use client";

import { create } from "zustand";

export type VistaApp = "inicio" | "explorar" | "mesas" | "geovisor" | "noticias" | "testimonios" | "dimensiones";

interface NavigationState {
  vista: VistaApp;
  setVista: (vista: VistaApp) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  vista: "inicio",
  setVista: (vista) => set({ vista }),
}));
