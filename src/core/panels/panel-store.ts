"use client";

import { create } from "zustand";

/**
 * POLIS — Núcleo del patrón Zero-Modals
 * Un único store global controla la pila de paneles laterales.
 * Cualquier vista puede hacer push de un panel; los paneles se apilan
 * para navegación anidada (Política → Fase → Línea → Aporte).
 */

export type PanelType =
  | "politica"
  | "fase"
  | "linea-editor"
  | "linea"
  | "aporte"
  | "sesion"
  | "usuarios"
  | "mesa"
  | "papelografo"
  | "mesa-editor"
  | "territorio"
  | "formularios"
  | "formulario-editor"
  | "formulario-analitica"
  | "formulario-preview"
  | "formulario-respuesta"
  | "participacion-multicanal"
  | "escenario-editor"
  | "testimonios-galeria"
  | "testimonio-editor"
  | "testimonios-moderacion"
  | "fases-control"
  | "auditoria-consola"
  | "usuario-invitar"
  | "usuario-editor"
  | "usuario-detalle"
  | "noticia"
  | "noticia-editor"
  | "testimonio-nuevo"
  | "mesa-acta";

/** Árbol que se diligencia en el papelografo */
export type ArbolPanel = "problemas" | "soluciones";

/** Props tipadas por tipo de panel — imposible abrir un panel con props inválidas */
export interface PanelPropsMap {
  politica: { politicaId: string };
  fase: { politicaId: string; faseId: string };
  "linea-editor": { lineaId?: string };
  linea: { politicaId: string; faseId: string; lineaId: string };
  aporte: { politicaId: string; faseId: string; lineaId: string };
  /** Panel de sesión/identidad — no requiere props */
  sesion: { accion?: "recuperar" | "verificar"; token?: string };
  usuarios: Record<string, never>;
  /** Área de trabajo: detalle de una mesa (plenaria + submesas) */
  mesa: { mesaId: string; soloLectura?: boolean };
  /** Papelografo: editor de árbol de problemas / soluciones de una submesa */
  papelografo: {
    mesaId: string;
    submesaId: string;
    arbol: ArbolPanel;
    /** key del panel de mesa para el breadcrumb de regreso */
    fromKey?: string;
  };
  /** Crear (sin mesaId) o editar una mesa de trabajo */
  "mesa-editor": { mesaId?: string };
  /** Ficha técnica del territorio en el geovisor */
  territorio: { territorioId: string };
  formularios: { soloRespuesta?: boolean; soloLectura?: boolean };
  "formulario-editor": { formularioId?: string };
  "formulario-analitica": { formularioId: string };
  "formulario-preview": { borradorId: string };
  "formulario-respuesta": { formularioId: string };
  "participacion-multicanal": { canalInicial?: string };
  "escenario-editor": Record<string, never>;
  "testimonios-galeria": { territorioId?: string };
  "testimonio-editor": Record<string, never>;
  "testimonios-moderacion": { estadoInicial?: string };
  "fases-control": Record<string, never>;
  "auditoria-consola": Record<string, never>;
  "usuario-invitar": Record<string, never>;
  "usuario-editor": { usuarioId: string };
  "usuario-detalle": { usuarioId: string };
  noticia: { noticiaId: string };
  "noticia-editor": { noticiaId?: string };
  "testimonio-nuevo": Record<string, never>;
  "mesa-acta": { mesaId: string };
}

export type PanelEntry<T extends PanelType = PanelType> = {
  /** clave única de instancia (permite dos paneles del mismo tipo si hiciera falta) */
  key: string;
  type: T;
  props: PanelPropsMap[T];
  /** el panel del tope puede maximizarse a toda la pantalla */
  maximized: boolean;
};

interface PanelState {
  entries: PanelEntry[];
  /** índice (desde el tope) del panel activo — 0 = tope */
  openPanel: <T extends PanelType>(type: T, props: PanelPropsMap[T]) => void;
  closeTop: () => void;
  /** cierra la pila hasta cierto panel (inclusive si `inclusive`), usado por breadcrumbs */
  closeToKey: (key: string, inclusive?: boolean) => void;
  closeAll: () => void;
  /** alterna maximizado del panel por clave (uso previsto: panel del tope) */
  toggleMaximized: (key: string) => void;
}

let seq = 0;
const nextKey = (type: string) => `${type}-${++seq}-${Date.now()}`;

export const usePanelStore = create<PanelState>((set) => ({
  entries: [],

  openPanel: (type, props) =>
    set((s) => ({
      // límite de seguridad: máximo 5 paneles apilados
      entries: [
        ...s.entries.slice(-4),
        { key: nextKey(type), type, props, maximized: false } as PanelEntry,
      ],
    })),

  closeTop: () => set((s) => ({ entries: s.entries.slice(0, -1) })),

  closeToKey: (key, inclusive = false) =>
    set((s) => {
      const idx = s.entries.findIndex((e) => e.key === key);
      if (idx === -1) return { entries: [] };
      return { entries: s.entries.slice(0, inclusive ? idx : idx + 1) };
    }),

  closeAll: () => set({ entries: [] }),

  toggleMaximized: (key) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.key === key ? { ...e, maximized: !e.maximized } : e,
      ),
    })),
}));

/** Hook ergonómico para abrir paneles desde cualquier componente */
export function usePanels() {
  const openPanel = usePanelStore((s) => s.openPanel);
  const closeTop = usePanelStore((s) => s.closeTop);
  const closeAll = usePanelStore((s) => s.closeAll);
  const closeToKey = usePanelStore((s) => s.closeToKey);
  return { openPanel, closeTop, closeAll, closeToKey };
}
