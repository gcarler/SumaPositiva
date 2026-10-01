"use client";

import { useMemo } from "react";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  Compass,
  Layers,
  Download,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  type VariableMapa,
  VARIABLE_META,
  ESTADISTICAS_TERRITORIOS,
} from "../data/estadisticas.data";

interface GeovisorKpiBarProps {
  territorioId: string;
  onTerritorioChange: (id: string) => void;
  variableMapa: VariableMapa;
  onVariableChange: (v: VariableMapa) => void;
  onExportarPng?: () => void;
}

const OPCIONES_TERRITORIO = [
  { id: "todas", nombre: "Distrito Completo de Cartagena" },
  { id: "loc-1", nombre: "Localidad 1 — Histórica y del Caribe Norte" },
  { id: "loc-2", nombre: "Localidad 2 — De la Virgen y Turística" },
  { id: "loc-3", nombre: "Localidad 3 — Industrial y de la Bahía" },
  { id: "rural-insular", nombre: "Zona Corregimental e Insular" },
] as const;

export function GeovisorKpiBar({
  territorioId,
  onTerritorioChange,
  variableMapa,
  onVariableChange,
  onExportarPng,
}: GeovisorKpiBarProps) {
  // Cálculos globales
  const kpisGlobales = useMemo(() => {
    const macros = ESTADISTICAS_TERRITORIOS.filter((t) =>
      ["loc-1", "loc-2", "loc-3", "rural-insular"].includes(t.id),
    );

    const totalAportes = macros.reduce((acc, t) => acc + t.aportesCiudadanos, 0);
    const totalAlertas = macros.reduce((acc, t) => acc + t.alertas, 0);
    const pobTotal = macros.reduce((acc, t) => acc + t.poblacion, 0);
    const ishPonderado = Math.round(
      macros.reduce((acc, t) => acc + t.ish * t.poblacion, 0) / (pobTotal || 1),
    );

    return {
      ciudadanos: 8420,
      totalAportes,
      totalAlertas,
      ishPromedio: ishPonderado,
    };
  }, []);

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm md:p-5">
      {/* Controles de Ámbito, Variable Temática y Exportar PNG */}
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Ámbito */}
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-[var(--ember)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Ámbito:
            </span>
          </div>

          <Select value={territorioId} onValueChange={onTerritorioChange}>
            <SelectTrigger className="w-full sm:w-[280px] h-9 text-xs" aria-label="Seleccionar territorio">
              <SelectValue placeholder="Seleccionar ámbito" />
            </SelectTrigger>
            <SelectContent>
              {OPCIONES_TERRITORIO.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selector de Variable Temática */}
          <div className="flex items-center gap-2 ml-0 sm:ml-2">
            <Layers className="size-4 text-[var(--info)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Variable:
            </span>
          </div>

          <Select value={variableMapa} onValueChange={(val) => onVariableChange(val as VariableMapa)}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-xs" aria-label="Seleccionar variable temática">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VARIABLE_META) as VariableMapa[]).map((v) => (
                <SelectItem key={v} value={v}>
                  {VARIABLE_META[v].label} ({VARIABLE_META[v].unidad})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botón Exportar Mapa a PNG */}
        {onExportarPng && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportarPng}
            className="h-9 gap-2 text-xs"
            aria-label="Exportar mapa como imagen PNG"
          >
            <Download className="size-3.5 text-[var(--ember)]" />
            <span>Exportar PNG</span>
          </Button>
        )}
      </div>

      {/* 4 KPI Chips Globales */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Chip 1: Ciudadanos Participando */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface-1)] shadow-sm">
            <Users className="size-5 text-[var(--ember)]" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-tertiary)] block">
              Ciudadanos Participando
            </span>
            <span className="text-lg font-bold tabular text-[var(--text-primary)]">
              {kpisGlobales.ciudadanos.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Chip 2: Aportes Radicados */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface-1)] shadow-sm">
            <MessageSquare className="size-5 text-[var(--info)]" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-tertiary)] block">
              Aportes Radicados
            </span>
            <span className="text-lg font-bold tabular text-[var(--text-primary)]">
              {kpisGlobales.totalAportes.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Chip 3: Alertas SAT Activas */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface-1)] shadow-sm">
            <AlertTriangle className="size-5 text-[var(--warning)]" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-tertiary)] block">
              Alertas SAT Activas
            </span>
            <span className="text-lg font-bold tabular text-[var(--warning)]">
              {kpisGlobales.totalAlertas}
            </span>
          </div>
        </div>

        {/* Chip 4: ISH Promedio Distrital */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface-1)] shadow-sm">
            <ShieldCheck className="size-5 text-[var(--success)]" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-tertiary)] block">
              ISH Promedio Distrital
            </span>
            <span className="text-lg font-bold tabular text-[var(--text-primary)]">
              {kpisGlobales.ishPromedio} / 100
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
