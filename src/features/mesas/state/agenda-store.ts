"use client";

import { create } from "zustand";
import {
  type MesaAgenda,
} from "@/features/mesas/data/agenda.data";
import {
  listarAgendas,
  actualizarAgendaRemota,
  crearAgendaRemota,
} from "@/features/mesas/services/agenda-api";

interface AgendaState {
  agendas: MesaAgenda[];
  cargando: boolean;
  error: string | null;

  cargarAgendas: (forzar?: boolean) => Promise<MesaAgenda[]>;
  actualizarAgenda: (
    id: string,
    cambios: Partial<MesaAgenda>
  ) => Promise<MesaAgenda>;
  crearAgenda: (
    datos: Partial<MesaAgenda> & { nombre: string; lugar: string; fecha: string }
  ) => Promise<MesaAgenda>;
  obtenerAgendaPorId: (id: string) => MesaAgenda | undefined;
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
  agendas: [],
  cargando: false,
  error: null,

  cargarAgendas: async () => {
    set({ cargando: true, error: null });
    try {
      const remotas = await listarAgendas();
      set({ agendas: remotas, cargando: false });
      return remotas;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al cargar agendas";
      set({
        error: mensaje,
        cargando: false,
      });
      throw err;
    }
  },

  actualizarAgenda: async (id, cambios) => {
    const estadoPrevio = get().agendas;
    // 1. Mutación optimista en el cliente
    set((state) => ({
      agendas: state.agendas.map((item) =>
        item.id === id ? { ...item, ...cambios } : item
      ),
    }));

    try {
      const persistida = await actualizarAgendaRemota(id, cambios);
      set((state) => ({
        agendas: state.agendas.map((item) =>
          item.id === id ? { ...item, ...persistida } : item
        ),
      }));
      return persistida;
    } catch (err) {
      // Revertir mutación optimista ante falla de persistencia en backend (H-04)
      set({ agendas: estadoPrevio });
      throw err;
    }
  },

  crearAgenda: async (datos) => {
    const creada = await crearAgendaRemota(datos);
    set((state) => ({
      agendas: [...state.agendas, creada],
    }));
    return creada;
  },

  obtenerAgendaPorId: (id) => {
    return get().agendas.find((a) => a.id === id);
  },
}));
