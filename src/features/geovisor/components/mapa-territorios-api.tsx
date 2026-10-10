"use client";
import "ol/ol.css";
import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Circle } from "ol/style";
import { isEmpty } from "ol/extent";
import { toLonLat } from "ol/proj";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import type { GeometriaApi } from "../models/geometria-api";
import { buscarTerritorioPorCoordenada } from "../services/geovisor-api";

/** Geometrías de FastAPI, sin capas o estadísticas simuladas como fallback. */
export function MapaTerritoriosApi({
  datos,
  seleccionar,
}: {
  datos: GeometriaApi;
  seleccionar: (id: string) => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const mapa = useRef<Map | null>(null);
  const fuente = useRef<VectorSource | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!target.current) return;
    let observer: ResizeObserver | undefined;
    let tema: MutationObserver | undefined;
    let actual: Map | undefined;
    try {
      const features = new GeoJSON().readFeatures(datos, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      const source = new VectorSource({ features });
      fuente.current = source;
      const color = (token: string, alpha: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("No se pudo preparar el mapa.");
        ctx.fillStyle = getComputedStyle(document.documentElement)
          .getPropertyValue(token)
          .trim();
        ctx.fillRect(0, 0, 1, 1);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        return [pixel[0], pixel[1], pixel[2], alpha];
      };
      const estilo = () =>
        new Style({
          fill: new Fill({ color: color("--ember", 0.18) }),
          stroke: new Stroke({ color: color("--ember", 1), width: 2 }),
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: color("--ember", 1) }),
          }),
        });
      const layer = new VectorLayer({ source, style: estilo() });
      actual = new Map({
        target: target.current,
        layers: [layer],
        controls: [],
        view: new View({ center: [0, 0], zoom: 2 }),
      });
      mapa.current = actual;
      const ajustar = () => {
        actual?.updateSize();
        const extent = source.getExtent();
        if (extent && !isEmpty(extent))
          actual?.getView().fit(extent, {
            padding: [24, 24, 24, 24],
            maxZoom: 15,
          });
      };
      ajustar();
      observer = new ResizeObserver(() => actual?.updateSize());
      observer.observe(target.current);
      tema = new MutationObserver(() => layer.setStyle(estilo()));
      tema.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      actual.on("singleclick", (event) => {
        const feature = actual?.forEachFeatureAtPixel(event.pixel, (f) => f);
        const id = feature?.get("id");
        if (typeof id === "string") {
          seleccionar(id);
          return;
        }
        if (event.coordinate) {
          const [lon, lat] = toLonLat(event.coordinate);
          buscarTerritorioPorCoordenada(lat, lon)
            .then((res) => {
              if (res && res.length > 0) {
                seleccionar(res[0].id);
              }
            })
            .catch(() => {});
        }
      });

    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Geometría inválida.";
      queueMicrotask(() => setError(mensaje));
    }
    return () => {
      observer?.disconnect();
      tema?.disconnect();
      actual?.setTarget(undefined);
      mapa.current = null;
      fuente.current = null;
    };
  }, [datos, seleccionar]);
  return (
    <div className="space-y-3">
      {error && (
        <Notice tone="danger" title="No se pudo dibujar el mapa">
          {error}
        </Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const view = mapa.current?.getView();
            view?.setZoom((view.getZoom() ?? 2) + 1);
          }}
        >
          Acercar mapa
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const view = mapa.current?.getView();
            view?.setZoom((view.getZoom() ?? 2) - 1);
          }}
        >
          Alejar mapa
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const extent = fuente.current?.getExtent();
            if (extent && !isEmpty(extent))
              mapa.current
                ?.getView()
                .fit(extent, { padding: [24, 24, 24, 24], maxZoom: 15 });
          }}
        >
          Encuadrar territorios
        </Button>
      </div>
      <div
        ref={target}
        role="region"
        aria-label="Mapa de territorios registrados; la lista inferior ofrece selección accesible"
        className="h-80 min-w-0 overflow-hidden rounded-xl border border-border bg-surface-2 sm:h-[28rem]"
      />
    </div>
  );
}
