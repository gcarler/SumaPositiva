"use client";

import { Layers, Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  type VariableMapa,
  VARIABLE_META,
  ESCALA_CHOROPLETH_PASOS,
  ESTADISTICAS_TERRITORIOS,
  obtenerValorVariable,
} from "../data/estadisticas.data";

export interface CapasConfig {
  localidades: boolean;
  corregimientos: boolean;
  barrios: boolean;
  puntos: boolean;
  etiquetas: boolean;
}

interface GeovisorControlesProps {
  capas: CapasConfig;
  onToggleCapa: (capa: keyof CapasConfig) => void;
  variableMapa: VariableMapa;
}

export function GeovisorControles({
  capas,
  onToggleCapa,
  variableMapa,
}: GeovisorControlesProps) {
  const meta = VARIABLE_META[variableMapa];

  // Cálculo de min y max para la leyenda dinámica
  const valores = ESTADISTICAS_TERRITORIOS.map((t) => obtenerValorVariable(t, variableMapa));
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
        <Layers className="size-4 text-[var(--ember)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Control de Capas SIG
        </h3>
      </div>

      {/* Lista de Toggles de Capas */}
      <div className="space-y-2.5 text-xs">
        <Label htmlFor="capa-localidades" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.localidades}
              onCheckedChange={() => onToggleCapa("localidades")}
              id="capa-localidades"
            />
            <span className="font-medium text-xs">Localidades (3)</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#e85d04" }} />
        </Label>

        <Label htmlFor="capa-corregimientos" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.corregimientos}
              onCheckedChange={() => onToggleCapa("corregimientos")}
              id="capa-corregimientos"
            />
            <span className="font-medium text-xs">Corregimientos e Islas</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#6d6875" }} />
        </Label>

        <Label htmlFor="capa-barrios" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.barrios}
              onCheckedChange={() => onToggleCapa("barrios")}
              id="capa-barrios"
            />
            <span className="font-medium text-xs">Barrios Catastrales (217)</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#3a86ff" }} />
        </Label>

        <Label htmlFor="capa-puntos" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.puntos}
              onCheckedChange={() => onToggleCapa("puntos")}
              id="capa-puntos"
            />
            <span className="font-medium text-xs">Puntos de Alerta SAT</span>
          </div>
          <span className="size-2 rounded-full" style={{ backgroundColor: "#d62828" }} />
        </Label>

        <Label htmlFor="capa-etiquetas" className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={capas.etiquetas}
              onCheckedChange={() => onToggleCapa("etiquetas")}
              id="capa-etiquetas"
            />
            <span className="font-medium text-xs">Etiquetas y Nombres</span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)]">Aa</span>
        </Label>
      </div>

      {/* Leyenda Dinámica Coroplética */}
      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-primary)] truncate">
            {meta.label}
          </span>
          <span className="text-[11px] font-medium text-[var(--text-tertiary)] shrink-0">
            {meta.unidad}
          </span>
        </div>

        {/* Gradiente de 5 pasos */}
        <div className="grid grid-cols-5 gap-1 h-3 rounded overflow-hidden">
          {ESCALA_CHOROPLETH_PASOS.map((color, idx) => (
            <div
              key={idx}
              className="h-full w-full"
              style={{ backgroundColor: color }}
              title={`Nivel ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] tabular">
          <span>Min: {minVal.toLocaleString("es-CO")}</span>
          <span>Max: {maxVal.toLocaleString("es-CO")}</span>
        </div>
      </div>
    </div>
  );
}
