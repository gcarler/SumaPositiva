"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PanelType, PanelPropsMap } from "@/stores/panel-store";

/**
 * Registry tipado de paneles — mapa PanelType → Componente.
 * Carga diferida para mantener el bundle inicial ligero.
 */

export interface PanelComponentProps<K extends PanelType = PanelType> {
  entryKey: string;
  props: PanelPropsMap[K];
}

const PoliticaPanel = dynamic(
  () => import("@/features/politicas/panels/politica-panel").then((m) => m.PoliticaPanel),
  { ssr: false }
);
const FasePanel = dynamic(
  () => import("@/features/politicas/panels/fase-panel").then((m) => m.FasePanel),
  { ssr: false }
);
const LineaPanel = dynamic(
  () => import("@/features/politicas/panels/linea-panel").then((m) => m.LineaPanel),
  { ssr: false }
);
const AporteEditorPanel = dynamic(
  () => import("@/features/aportes/panels/aporte-editor-panel").then((m) => m.AporteEditorPanel),
  { ssr: false }
);
const SesionPanel = dynamic(
  () => import("@/features/sesion/panels/sesion-panel").then((m) => m.SesionPanel),
  { ssr: false }
);
const MesaPanel = dynamic(
  () => import("@/features/mesas/panels/mesa-panel").then((m) => m.MesaPanel),
  { ssr: false }
);
const PapelografoPanel = dynamic(
  () => import("@/features/mesas/panels/papelografo-panel").then((m) => m.PapelografoPanel),
  { ssr: false }
);
const MesaEditorPanel = dynamic(
  () => import("@/features/mesas/panels/mesa-editor-panel").then((m) => m.MesaEditorPanel),
  { ssr: false }
);

export const PANEL_REGISTRY: Record<
  PanelType,
  ComponentType<PanelComponentProps>
> = {
  politica: PoliticaPanel as ComponentType<PanelComponentProps>,
  fase: FasePanel as ComponentType<PanelComponentProps>,
  linea: LineaPanel as ComponentType<PanelComponentProps>,
  aporte: AporteEditorPanel as ComponentType<PanelComponentProps>,
  sesion: SesionPanel as ComponentType<PanelComponentProps>,
  mesa: MesaPanel as ComponentType<PanelComponentProps>,
  papelografo: PapelografoPanel as ComponentType<PanelComponentProps>,
  "mesa-editor": MesaEditorPanel as ComponentType<PanelComponentProps>,
};

/**
 * Ancho del panel por tipo — fluido y adaptativo a cualquier resolución:
 *   · Base: el ancho histórico (no cambia el look en portátiles 1280–1440).
 *   · Ideal: % del viewport → crece proporcionalmente en pantallas grandes.
 *   · Tope: límite de legibilidad en 4K / ultrawide.
 *   · min(..., 100vw): en móvil el panel siempre ocupa toda la pantalla.
 * El botón Maximizar sigue llevando el panel al 100% del viewport.
 */
export const PANEL_WIDTHS: Record<PanelType, string> = {
  politica: "min(clamp(780px, 52vw, 1120px), 100vw)",
  fase: "min(clamp(720px, 48vw, 1040px), 100vw)",
  linea: "min(clamp(720px, 48vw, 1040px), 100vw)",
  aporte: "min(clamp(640px, 44vw, 920px), 100vw)",
  sesion: "min(clamp(520px, 38vw, 760px), 100vw)",
  mesa: "min(clamp(820px, 56vw, 1240px), 100vw)",
  // el papelografo es el lienzo más ancho: el árbol necesita aire
  papelografo: "min(clamp(1080px, 82vw, 1760px), 100vw)",
  "mesa-editor": "min(clamp(560px, 42vw, 800px), 100vw)",
};
