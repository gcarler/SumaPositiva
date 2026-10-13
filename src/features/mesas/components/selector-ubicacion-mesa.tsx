"use client";

import "ol/ol.css";
import React, { useEffect, useRef, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { fromLonLat, toLonLat } from "ol/proj";
import { Button } from "@/shared/ui/button";
import { MapPin, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { CENTRO_CARTAGENA, type Coordenadas } from "../lib/coordenadas-parser";

export interface SelectorUbicacionMesaProps {
  coordenadas?: Coordenadas | null;
  onChange: (coordenadas: Coordenadas | null) => void;
  className?: string;
  altura?: string;
  soloLectura?: boolean;
}

export function SelectorUbicacionMesa({
  coordenadas,
  onChange,
  className = "",
  altura = "280px",
  soloLectura = false,
}: SelectorUbicacionMesaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<Map | null>(null);
  const fuenteRef = useRef<VectorSource<Feature<Point>> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Inicializar mapa OpenLayers
  useEffect(() => {
    if (!contenedorRef.current) return;

    const fuente = new VectorSource<Feature<Point>>();
    fuenteRef.current = fuente;

    const resolverColorToken = (token: string) => {
      if (typeof window === "undefined") return undefined;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      const val = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      if (!val) return undefined;
      ctx.fillStyle = val;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, 1];
    };

    const estiloMarcador = new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: resolverColorToken("--ember") || [234, 88, 12, 1] }),
        stroke: new Stroke({ color: resolverColorToken("--surface-0") || [255, 255, 255, 1], width: 2.5 }),
      }),
    });

    const capaVectorial = new VectorLayer({
      source: fuente,
      style: estiloMarcador,
    });

    const capaBase = new TileLayer({
      source: new OSM(),
    });

    const centroInicial: [number, number] = coordenadas
      ? [coordenadas.lng, coordenadas.lat]
      : CENTRO_CARTAGENA;

    const mapa = new Map({
      target: contenedorRef.current,
      controls: [], // Controles personalizados con botones POLIS
      layers: [capaBase, capaVectorial],
      view: new View({
        center: fromLonLat(centroInicial),
        zoom: coordenadas ? 16 : 13,
        minZoom: 10,
        maxZoom: 19,
      }),
    });

    mapaRef.current = mapa;

    // Colocar marcador inicial si ya existen coordenadas
    if (coordenadas && Number.isFinite(coordenadas.lat) && Number.isFinite(coordenadas.lng)) {
      fuente.addFeature(
        new Feature(new Point(fromLonLat([coordenadas.lng, coordenadas.lat])))
      );
    }

    // Manejar clic en el mapa para colocar/mover marcador
    if (!soloLectura) {
      mapa.on("click", (event) => {
        const [lng, lat] = toLonLat(event.coordinate);
        const latNorm = Number(lat.toFixed(6));
        const lngNorm = Number(lng.toFixed(6));

        fuente.clear();
        fuente.addFeature(new Feature(new Point(event.coordinate)));

        onChangeRef.current({ lat: latNorm, lng: lngNorm });
      });
    }

    // Observer para redimensionamiento fluido
    const resizeObserver = new ResizeObserver(() => {
      mapa.updateSize();
    });
    resizeObserver.observe(contenedorRef.current);

    return () => {
      resizeObserver.disconnect();
      mapa.setTarget(undefined);
      mapaRef.current = null;
      fuenteRef.current = null;
    };
  }, [soloLectura]);

  // Sincronizar marcador cuando coordenadas cambien desde el exterior (ej. URL o campos numéricos)
  useEffect(() => {
    if (!mapaRef.current || !fuenteRef.current) return;

    fuenteRef.current.clear();

    if (coordenadas && Number.isFinite(coordenadas.lat) && Number.isFinite(coordenadas.lng)) {
      const puntoLonLat = [coordenadas.lng, coordenadas.lat];
      const coordMercator = fromLonLat(puntoLonLat);
      fuenteRef.current.addFeature(new Feature(new Point(coordMercator)));

      // Recentrar suavemente en el nuevo punto
      mapaRef.current.getView().animate({
        center: coordMercator,
        duration: 250,
      });
    }
  }, [coordenadas]);

  const centrarEnCartagena = useCallback(() => {
    if (!mapaRef.current) return;
    mapaRef.current.getView().animate({
      center: fromLonLat(CENTRO_CARTAGENA),
      zoom: 13,
      duration: 300,
    });
  }, []);

  const limpiarUbicacion = useCallback(() => {
    if (fuenteRef.current) {
      fuenteRef.current.clear();
    }
    onChangeRef.current(null);
  }, []);

  const aplicarZoom = useCallback((delta: number) => {
    if (!mapaRef.current) return;
    const view = mapaRef.current.getView();
    const zoomActual = view.getZoom() ?? 13;
    view.animate({
      zoom: zoomActual + delta,
      duration: 200,
    });
  }, []);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] shadow-xs ${className}`}
      data-testid="selector-ubicacion-mesa"
    >
      {/* Contenedor del mapa OpenLayers */}
      <div
        ref={contenedorRef}
        style={{ height: altura }}
        className="w-full cursor-crosshair focus:outline-hidden"
        role="application"
        aria-label="Mapa interactivo para seleccionar la ubicación de la mesa de trabajo"
        tabIndex={0}
      />

      {/* Controles flotantes accesibles sobre el mapa */}
      <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 shadow-md">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => aplicarZoom(1)}
          className="size-8 p-0 bg-[var(--surface-0)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border)]"
          aria-label="Acercar mapa"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => aplicarZoom(-1)}
          className="size-8 p-0 bg-[var(--surface-0)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border)]"
          aria-label="Alejar mapa"
        >
          <ZoomOut className="size-4" />
        </Button>
      </div>

      {/* Barra inferior de estado y acciones rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="size-3.5 shrink-0 text-[var(--ember)]" />
          {coordenadas && Number.isFinite(coordenadas.lat) && Number.isFinite(coordenadas.lng) ? (
            <span className="truncate font-mono text-[11px] text-[var(--text-primary)] font-medium">
              {`${coordenadas.lat.toFixed(5)}, ${coordenadas.lng.toFixed(5)}`}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Haz clic en el mapa para marcar el punto de encuentro
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={centrarEnCartagena}
            className="h-7 px-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Centrar mapa en Cartagena"
          >
            <RotateCcw className="size-3 mr-1" />
            Cartagena
          </Button>

          {coordenadas && !soloLectura && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={limpiarUbicacion}
              className="h-7 px-2 text-[11px] text-[var(--text-secondary)] hover:text-destructive"
              aria-label="Limpiar punto seleccionado"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
