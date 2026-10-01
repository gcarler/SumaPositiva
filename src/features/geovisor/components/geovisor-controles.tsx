"use client";

import { useCapasGeovisor } from "../services/use-geovisor-queries";
import type { FiltroTerritorial, TipoTerritorio } from "../models/geovisor";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";

interface GeovisorControlesProps {
  filtros: FiltroTerritorial;
  onFiltrosChange: (filtros: FiltroTerritorial) => void;
  capasActivas: string[];
  onCapasChange: (capas: string[]) => void;
}

export function GeovisorControles({
  filtros,
  onFiltrosChange,
  capasActivas,
  onCapasChange
}: GeovisorControlesProps) {
  const { data: capas } = useCapasGeovisor();

  const toggleCapa = (id: string) => {
    if (capasActivas.includes(id)) {
      onCapasChange(capasActivas.filter(c => c !== id));
    } else {
      onCapasChange([...capasActivas, id]);
    }
  };

  const setTipo = (tipo: TipoTerritorio | undefined) => {
    onFiltrosChange({ ...filtros, tipo });
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-72 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg p-4 space-y-4">
      <h3 className="font-semibold text-sm text-[var(--text-primary)]">Controles Geovisor</h3>
      
      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)]">Filtro Territorial</Label>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filtros.tipo === undefined ? "default" : "outline"} 
            size="sm" 
            className="text-xs"
            onClick={() => setTipo(undefined)}
          >Todos</Button>
          <Button 
            variant={filtros.tipo === "LOCALIDAD" ? "default" : "outline"} 
            size="sm" 
            className="text-xs"
            onClick={() => setTipo("LOCALIDAD")}
          >Localidades</Button>
          <Button 
            variant={filtros.tipo === "CORREGIMIENTO" ? "default" : "outline"} 
            size="sm" 
            className="text-xs"
            onClick={() => setTipo("CORREGIMIENTO")}
          >Corregimientos</Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)]">Capas Temáticas</Label>
        <div className="flex flex-col gap-2">
          {capas?.map(capa => (
            <div key={capa.id} className="flex items-center gap-2">
              <Checkbox 
                id={`capa-${capa.id}`}
                checked={capasActivas.includes(capa.slug)}
                onCheckedChange={() => toggleCapa(capa.slug)}
              />
              <Label htmlFor={`capa-${capa.id}`} className="flex items-center gap-1.5 cursor-pointer text-xs font-normal">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: capa.color_hex }} />
                {capa.nombre}
              </Label>
            </div>
          ))}
          <div className="flex items-center gap-2">
              <Checkbox 
                id="capa-calor-ics"
                checked={capasActivas.includes("calor_ics")}
                onCheckedChange={() => toggleCapa("calor_ics")}
              />
              <Label htmlFor="capa-calor-ics" className="flex items-center gap-1.5 cursor-pointer text-xs font-normal">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "color-mix(in srgb, var(--danger) 50%, transparent)" }} />
                Mapa de Calor ICS
              </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
