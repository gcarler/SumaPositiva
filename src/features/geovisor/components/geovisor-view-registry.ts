import {
  BarChart2,
  BarChart3,
  FileText,
  Layers,
  MapPin,
  SlidersHorizontal,
  TableProperties,
  type LucideIcon,
} from "lucide-react";
import type { DockPanelId, GeovisorViewId } from "../state/geovisor-layout-store";

export interface GeovisorViewMeta {
  id: GeovisorViewId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Clase de color del ícono (token POLIS). */
  tone: string;
}

export const GEOVISOR_VIEW_META: Record<GeovisorViewId, GeovisorViewMeta> = {
  filtros: {
    id: "filtros",
    title: "Filtros & KPIs",
    description: "Ámbito, variable temática, exportación y KPIs distritales",
    icon: SlidersHorizontal,
    tone: "text-[var(--ember)]",
  },
  capas: {
    id: "capas",
    title: "Capas & Leyenda",
    description: "Capas SIG y leyenda de la variable activa",
    icon: Layers,
    tone: "text-[var(--ember)]",
  },
  mesas: {
    id: "mesas",
    title: "Directorio de Mesas",
    description: "Búsqueda y ubicación de las mesas de diálogo",
    icon: MapPin,
    tone: "text-[var(--info)]",
  },
  ficha: {
    id: "ficha",
    title: "Ficha Técnica",
    description: "Detalle, aforo, acuerdos y evidencia de la mesa seleccionada",
    icon: FileText,
    tone: "text-[var(--ember)]",
  },
  territorio: {
    id: "territorio",
    title: "Territorio & BI",
    description: "Ranking y analítica del territorio seleccionado",
    icon: BarChart3,
    tone: "text-[var(--info)]",
  },
  datagrid: {
    id: "datagrid",
    title: "DataGrid de Mesas",
    description: "Tabla interactiva de mesas con exportación",
    icon: TableProperties,
    tone: "text-[var(--ember)]",
  },
  graficos: {
    id: "graficos",
    title: "Gráficos",
    description: "Radar, evolución temporal y comparativas",
    icon: BarChart2,
    tone: "text-[var(--info)]",
  },
};

export const DOCK_LABELS: Record<DockPanelId, string> = {
  top: "Superior",
  left: "Izquierdo",
  right: "Derecho",
  bottom: "Inferior",
};
