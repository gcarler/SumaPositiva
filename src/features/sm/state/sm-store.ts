/**
 * Store Zustand reactivo para la gestión operativa de SM Core.
 */

import { create } from "zustand";
import type {
  SMEventoIn,
  SMFiltrosMensajes,
  SMMensaje,
  SMResumenProcesamiento,
  SMSalud,
} from "../models/sm-types";
import {
  ejecutarWorkerSM,
  ingestarEventoSM,
  listarMensajesSM,
  obtenerSaludSM,
} from "../api/sm-api";

interface SMStoreState {
  salud: SMSalud | null;
  mensajes: SMMensaje[];
  cargando: boolean;
  ejecutandoWorker: boolean;
  ultimoResumenWorker: SMResumenProcesamiento | null;
  error: string | null;
  filtros: SMFiltrosMensajes;

  // Acciones
  setFiltros: (filtros: Partial<SMFiltrosMensajes>) => void;
  cargarSalud: () => Promise<void>;
  cargarMensajes: () => Promise<void>;
  recargarTodo: () => Promise<void>;
  ejecutarOutbox: (limite?: number) => Promise<SMResumenProcesamiento>;
  dispararEvento: (evento: SMEventoIn) => Promise<SMMensaje>;
}

export const useSMStore = create<SMStoreState>((set, get) => ({
  salud: null,
  mensajes: [],
  cargando: false,
  ejecutandoWorker: false,
  ultimoResumenWorker: null,
  error: null,
  filtros: {
    canal: "todos",
    estado: "todos",
    limite: 50,
  },

  setFiltros: (nuevosFiltros) => {
    set((state) => ({
      filtros: { ...state.filtros, ...nuevosFiltros },
    }));
    void get().cargarMensajes();
  },

  cargarSalud: async () => {
    try {
      const salud = await obtenerSaludSM();
      set({ salud, error: null });
    } catch (err) {
      // No conservar una salud anterior: sería mostrar un estado que ya no se puede acreditar.
      set({
        salud: null,
        error: err instanceof Error ? err.message : "Error al obtener salud de SM Core",
      });
    }
  },

  cargarMensajes: async () => {
    set({ cargando: true });
    try {
      const { filtros } = get();
      const mensajes = await listarMensajesSM(filtros);
      set({ mensajes, cargando: false, error: null });
    } catch (err) {
      set({
        cargando: false,
        mensajes: [],
        error: err instanceof Error ? err.message : "Error al listar mensajes del outbox",
      });
    }
  },

  recargarTodo: async () => {
    set({ cargando: true });
    try {
      const [salud, mensajes] = await Promise.all([
        obtenerSaludSM(),
        listarMensajesSM(get().filtros),
      ]);
      set({ salud, mensajes, cargando: false, error: null });
    } catch (err) {
      set({
        cargando: false,
        salud: null,
        mensajes: [],
        error: err instanceof Error ? err.message : "Error al recargar subsistema SM",
      });
    }
  },

  ejecutarOutbox: async (limite = 25) => {
    set({ ejecutandoWorker: true });
    try {
      const resumen = await ejecutarWorkerSM(limite);
      set({
        ultimoResumenWorker: resumen,
        ejecutandoWorker: false,
      });
      // Recargar datos tras ejecutar ronda
      await get().recargarTodo();
      return resumen;
    } catch (err) {
      set({ ejecutandoWorker: false });
      throw err;
    }
  },

  dispararEvento: async (evento: SMEventoIn) => {
    const mensaje = await ingestarEventoSM(evento);
    // Refrescar mensajes en segundo plano
    void get().recargarTodo();
    return mensaje;
  },
}));
