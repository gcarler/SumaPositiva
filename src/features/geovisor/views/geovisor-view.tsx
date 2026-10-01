"use client";

import { useState } from "react";
import { usePanels } from "@/core/panels/panel-store";
import { GeovisorMapa } from "../components/geovisor-mapa";
import { GeovisorControles } from "../components/geovisor-controles";
import { useTerritoriosGeoJSON } from "../services/use-geovisor-queries";
import type { FiltroTerritorial } from "../models/geovisor";

export function GeovisorView() {
  const { openPanel } = usePanels();
  const [filtros, setFiltros] = useState<FiltroTerritorial>({});
  const [capasActivas, setCapasActivas] = useState<string[]>([]);
  
  const { data: geoJson, isLoading } = useTerritoriosGeoJSON(filtros);

  const handleTerritorioClick = (id: string) => {
    openPanel("territorio", { territorioId: id });
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col">
      {/* Header bar or top context could go here if not in main layout */}
      <GeovisorControles 
        filtros={filtros} 
        onFiltrosChange={setFiltros} 
        capasActivas={capasActivas} 
        onCapasChange={setCapasActivas} 
      />
      
      <div className="flex-1 w-full h-full bg-[var(--surface-0)] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-secondary)]">
            Cargando capas geográficas...
          </div>
        ) : geoJson ? (
          <GeovisorMapa 
            geoJson={geoJson} 
            capasActivas={capasActivas} 
            onTerritorioClick={handleTerritorioClick} 
          />
        ) : null}
      </div>
    </div>
  );
}
