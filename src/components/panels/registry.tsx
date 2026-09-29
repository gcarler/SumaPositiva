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

export const PANEL_REGISTRY: Record<
  PanelType,
  ComponentType<PanelComponentProps>
> = {
  politica: PoliticaPanel as ComponentType<PanelComponentProps>,
  fase: FasePanel as ComponentType<PanelComponentProps>,
  linea: LineaPanel as ComponentType<PanelComponentProps>,
  aporte: AporteEditorPanel as ComponentType<PanelComponentProps>,
};

/** Ancho del panel por tipo (px) — el stack decide responsividad */
export const PANEL_WIDTHS: Record<PanelType, number> = {
  politica: 780,
  fase: 720,
  linea: 720,
  aporte: 640,
};
