"use client";

import {
  BARRIOS_CARTAGENA,
  type BarrioCartagena,
} from "../data/barrios-cartagena";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { MapPin } from "lucide-react";

interface BarrioSelectorProps {
  barrioSeleccionado: BarrioCartagena;
  onCambiarBarrio: (barrio: BarrioCartagena) => void;
}

export function BarrioSelector({
  barrioSeleccionado,
  onCambiarBarrio,
}: BarrioSelectorProps) {
  const destacados = BARRIOS_CARTAGENA.filter((b) => b.destacado);

  const porLocalidad = {
    1: BARRIOS_CARTAGENA.filter((b) => b.localidadNumero === 1),
    2: BARRIOS_CARTAGENA.filter((b) => b.localidadNumero === 2),
    3: BARRIOS_CARTAGENA.filter((b) => b.localidadNumero === 3),
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--ember-soft)] text-[var(--ember)]">
            <MapPin className="size-4" strokeWidth={2} />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Tu territorio en Cartagena
            </span>
            <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">
              {barrioSeleccionado.nombre}
            </h2>
          </div>
        </div>

        {/* Dropdown canónico completo */}
        <div className="w-full sm:w-auto">
          <Select
            value={barrioSeleccionado.id}
            onValueChange={(val) => {
              const encontrado = BARRIOS_CARTAGENA.find((b) => b.id === val);
              if (encontrado) onCambiarBarrio(encontrado);
            }}
          >
            <SelectTrigger
              className="w-full sm:min-w-[220px] text-xs h-9"
              aria-label="Seleccionar barrio o corregimiento de Cartagena"
            >
              <SelectValue placeholder="Cambiar barrio..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-[11px] font-bold text-[var(--ember)]">
                  Localidad 2 — De la Virgen y Turística
                </SelectLabel>
                {porLocalidad[2].map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>

              <SelectGroup>
                <SelectLabel className="text-[11px] font-bold text-[var(--ember)]">
                  Localidad 3 — Industrial y de la Bahía
                </SelectLabel>
                {porLocalidad[3].map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>

              <SelectGroup>
                <SelectLabel className="text-[11px] font-bold text-[var(--ember)]">
                  Localidad 1 — Histórica y Caribe Norte
                </SelectLabel>
                {porLocalidad[1].map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chips de acceso rápido táctil para celulares */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-tertiary)] mr-1">
          Barrios populares:
        </span>
        {destacados.slice(0, 6).map((b) => {
          const activo = b.id === barrioSeleccionado.id;
          return (
            <Button
              key={b.id}
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => onCambiarBarrio(b)}
              aria-pressed={activo}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                activo
                  ? "bg-[var(--ember)] text-[var(--text-inverse)] shadow-xs"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border)]"
              }`}
            >
              {b.nombre}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
