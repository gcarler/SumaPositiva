"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import type { FeatureCollection, TerritorioFeature, GeoJSONPosition } from "../models/geovisor";

interface GeovisorMapaProps {
  geoJson: FeatureCollection;
  onTerritorioClick?: (territorioId: string) => void;
  capasActivas: string[];
}

export function GeovisorMapa({ geoJson, onTerritorioClick, capasActivas }: GeovisorMapaProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Cartagena projection simplified bounds
  const minLon = -75.80;
  const maxLon = -75.35;
  const minLat = 10.15;
  const maxLat = 10.50;

  const width = 800;
  const height = 800;

  const project = (lon: number, lat: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return [x, y];
  };

  const getPath = (feature: TerritorioFeature) => {
    if (feature.geometry.type === "Polygon") {
      const polygonCoords = feature.geometry.coordinates as GeoJSONPosition[][];
      const coords = polygonCoords[0];
      if (!coords) return "";
      return (
        coords
          .map((coord: GeoJSONPosition, i: number) => {
            const [x, y] = project(coord[0], coord[1]);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ") + " Z"
      );
    }
    if (feature.geometry.type === "MultiPolygon") {
      const multiCoords = feature.geometry.coordinates as GeoJSONPosition[][][];
      return multiCoords
        .map((poly: GeoJSONPosition[][]) => {
          const coords = poly[0];
          if (!coords) return "";
          return (
            coords
              .map((coord: GeoJSONPosition, i: number) => {
                const [x, y] = project(coord[0], coord[1]);
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ") + " Z"
          );
        })
        .join(" ");
    }
    return "";
  };

  const getColor = (feature: TerritorioFeature) => {
    if (capasActivas.includes("alertas_sat") && feature.properties.alerta_sat) return "var(--danger)";
    if (capasActivas.includes("zona_etnica") && feature.properties.es_zona_etnica) return "var(--success)";
    if (capasActivas.includes("cienaga") && feature.properties.cienaga_virgen) return "var(--info)";
    if (capasActivas.includes("calor_ics") && feature.properties.calor_ics) {
       return `color-mix(in srgb, var(--danger) ${feature.properties.calor_ics}%, transparent)`;
    }
    return "var(--surface-2)";
  };

  return (
    <div className="relative flex w-full h-full min-h-0 flex-col bg-[var(--surface-0)]">
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full min-h-0 flex-1 cursor-crosshair drop-shadow-md"
        preserveAspectRatio="xMidYMid meet"
      >
        {geoJson.features.map(feature => {
          const isHovered = hoveredId === feature.id;
          return (
            <path
              key={feature.id}
              d={getPath(feature)}
              fill={getColor(feature)}
              stroke={isHovered ? "var(--ember)" : "var(--border-strong)"}
              strokeWidth={isHovered ? 3 : 1}
              className="transition-colors duration-200 cursor-pointer hover:opacity-90"
              onMouseEnter={() => setHoveredId(feature.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onTerritorioClick?.(feature.properties.id)}
            >
              <title>{feature.properties.nombre} ({feature.properties.tipo})</title>
            </path>
          );
        })}
      </svg>
      {onTerritorioClick && (
        <div role="group" aria-label="Explorar territorios del mapa" className="flex max-h-40 shrink-0 flex-wrap gap-2 overflow-y-auto border-t border-border bg-surface-1 p-3">
          {geoJson.features.map((feature) => (
            <Button
              key={feature.id}
              variant="outline"
              size="sm"
              aria-label={`Explorar territorio: ${feature.properties.nombre} (${feature.properties.tipo})`}
              className="h-auto min-h-9 max-w-full whitespace-normal text-left"
              onFocus={() => setHoveredId(feature.id)}
              onBlur={() => setHoveredId(null)}
              onClick={() => onTerritorioClick(feature.properties.id)}
            >
              {feature.properties.nombre} ({feature.properties.tipo})
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
