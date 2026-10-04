"use client";

import { create } from "zustand";
import {
  AGENDA_MESAS,
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
  agendas: AGENDA_MESAS,
  cargando: false,
  error: null,

  cargarAgendas: async () => {
    set({ cargando: true, error: null });
    try {
      const remotas = await listarAgendas();
      if (Array.isArray(remotas) && remotas.length > 0) {
        set({ agendas: remotas, cargando: false });
        return remotas;
      }
      set({ cargando: false });
      return get().agendas;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al cargar agendas",
        cargando: false,
      });
      return get().agendas;
    }
  },

  actualizarAgenda: async (id, cambios) => {
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
      console.warn("No se pudo sincronizar agenda en el backend:", err);
      const actual = get().agendas.find((a) => a.id === id);
      if (actual) return actual;
      throw err;
    }
  },

  crearAgenda: async (datos) => {
    try {
      const creada = await crearAgendaRemota(datos);
      set((state) => ({
        agendas: [...state.agendas, creada],
      }));
      return creada;
    } catch (_err) {
      // Fallback local
      const id = datos.id || `ms-${Date.now().toString(36)}`;
      const nueva: MesaAgenda = {
        id,
        tipo: datos.tipo || "sectorial",
        nombre: datos.nombre,
        territorio: datos.territorio || "Distrito de Cartagena",
        lugar: datos.lugar,
        fecha: datos.fecha,
        horaInicio: datos.horaInicio || "08:30",
        horaFin: datos.horaFin || "12:00",
        estado: datos.estado || "programada",
        dimensionesONU: datos.dimensionesONU || ["Seguridad Personal"],
        responsable: datos.responsable,
        observaciones: datos.observaciones,
      };
      set((state) => ({
        agendas: [...state.agendas, nueva],
      }));
      return nueva;
    }
  },

  obtenerAgendaPorId: (id) => {
    return get().agendas.find((a) => a.id === id);
  },
}));
