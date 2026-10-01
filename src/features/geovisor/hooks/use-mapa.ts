"use client";

import { useEffect, useRef } from "react";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { fromLonLat } from "ol/proj";
import type { Geometry } from "ol/geom";
import { TERRITORIOS_CARTAGENA } from "../data/territorios.data";
import type { Territorio } from "../data/territorios.data";

const COLORES_POR_LOCALIDAD: Record<string, string> = {
  "loc-1": "--info",
  "loc-2": "--warning",
  "loc-3": "--success",
};

const MAPA_NOMBRE_LOCALIDAD: Record<string, string> = {
  "HISTORICA Y DEL CARIBE NORTE": "loc-1",
  "DE LA VIRGEN Y TURISTICA": "loc-2",
  "INDUSTRIAL DE LA BAHIA": "loc-3",
};

const COLORES_POR_TIPO: Record<Territorio["tipo"], string> = {
  localidad: "--info",
  corregimiento: "--ember",
  isla: "--text-tertiary",
};

function colorToken(token: string): string {
  if (typeof window === "undefined") return "var(--ember)";
  const nombreVar = token.startsWith("--") ? token : token.replace(/^var\(/, "").replace(/\)$/, "");
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombreVar).trim();
  return valor || `var(${token.startsWith("--") ? token : `--${token}`})`;
}

function crearCapaTerritorios(
  tipo: Territorio["tipo"],
  localidadRef: { current: string },
): VectorLayer<VectorSource<Feature>> {
  const territorios = TERRITORIOS_CARTAGENA.filter((territorio) => territorio.tipo === tipo);
  const geojson = {
    type: "FeatureCollection",
    features: territorios.map((territorio) => ({
      type: "Feature",
      id: territorio.id,
      geometry: { type: "Point", coordinates: [territorio.lon, territorio.lat] },
      properties: {
        id: territorio.id,
        nombre: territorio.nombre,
        tipo: territorio.tipo,
        localidadId: territorio.localidadId,
      },
    })),
  };
  const features = new GeoJSON().readFeatures(geojson, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });
  const fuente = new VectorSource({ features });
  const ember = colorToken("--ember");
  const texto = colorToken("--text-primary");
  const superficie = colorToken("--surface-1");

  return new VectorLayer({
    source: fuente,
    zIndex: 10,
    declutter: true,
    style: (feature, resolution) => {
      if (
        localidadRef.current !== "todas" &&
        feature.get("localidadId") !== localidadRef.current
      ) {
        return undefined;
      }
      const islas = tipo === "isla";
      const localidadColor =
        COLORES_POR_LOCALIDAD[String(feature.get("localidadId"))] ?? COLORES_POR_TIPO[tipo];
      const color = colorToken(tipo === "localidad" ? localidadColor : COLORES_POR_TIPO[tipo]);
      return new Style({
        image: new CircleStyle({
          radius: islas ? 7 : tipo === "localidad" ? 10 : 6,
          fill: new Fill({ color: feature.get("hovered") ? ember : color }),
          stroke: new Stroke({ color: superficie, width: 2 }),
        }),
        text:
          resolution < 900
            ? new Text({
                text: String(feature.get("nombre") ?? ""),
                offsetY: islas ? 16 : -17,
                font: "600 12px Geist, sans-serif",
                fill: new Fill({ color: texto }),
                stroke: new Stroke({ color: superficie, width: 3 }),
                overflow: true,
              })
            : undefined,
      });
    },
  });
}

export interface UseMapaOptions {
  target: HTMLDivElement | null;
  onSelectTerritorio: (territorioId: string) => void;
  onHoverTerritorio: (territorioId: string | null) => void;
  localidadId: string;
  mostrarLocalidades?: boolean;
  mostrarCorregimientos?: boolean;
  mostrarBarrios?: boolean;
  barrioSeleccionado?: string | null;
}

export function useMapa({
  target,
  onSelectTerritorio,
  onHoverTerritorio,
  localidadId,
  mostrarLocalidades = true,
  mostrarCorregimientos = true,
  mostrarBarrios = true,
  barrioSeleccionado = null,
}: UseMapaOptions) {
  const mapaRef = useRef<Map | null>(null);
  const localidadRef = useRef(localidadId);
  const mostrarLocalidadesRef = useRef(mostrarLocalidades);
  const mostrarCorregimientosRef = useRef(mostrarCorregimientos);
  const mostrarBarriosRef = useRef(mostrarBarrios);
  const barrioSeleccionadoRef = useRef(barrioSeleccionado);
  const fuenteBarriosRef = useRef<VectorSource<Feature> | null>(null);

  useEffect(() => {
    localidadRef.current = localidadId;
    mapaRef.current?.getLayers().forEach((layer) => layer.changed());
  }, [localidadId]);

  useEffect(() => {
    mostrarLocalidadesRef.current = mostrarLocalidades;
    mostrarCorregimientosRef.current = mostrarCorregimientos;
    mostrarBarriosRef.current = mostrarBarrios;
    barrioSeleccionadoRef.current = barrioSeleccionado;
    mapaRef.current?.getLayers().forEach((layer) => layer.changed());
  }, [mostrarLocalidades, mostrarCorregimientos, mostrarBarrios, barrioSeleccionado]);

  // Zoom / Fit automático cuando se busca un barrio específico
  useEffect(() => {
    if (!barrioSeleccionado || !mapaRef.current || !fuenteBarriosRef.current) return;
    const fuente = fuenteBarriosRef.current;
    const normalizar = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const targetNombre = normalizar(barrioSeleccionado);

    const featureEncontrada = fuente.getFeatures().find((f) => {
      const nom = normalizar(String(f.get("nombre") ?? ""));
      return nom.includes(targetNombre) || targetNombre.includes(nom);
    });

    if (featureEncontrada) {
      const geom = featureEncontrada.getGeometry();
      if (geom) {
        mapaRef.current.getView().fit(geom.getExtent(), {
          duration: 700,
          maxZoom: 16,
          padding: [80, 80, 80, 80],
        });
      }
    }
  }, [barrioSeleccionado]);

  useEffect(() => {
    if (!target) return;

    /* 1. Capa Poligonal de Localidades (GeoJSON) */
    const fuenteLocalidades = new VectorSource({
      url: "/geodatos/cartagena_localidades.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });

    const capaLocalidades = new VectorLayer({
      source: fuenteLocalidades,
      zIndex: 2,
      style: (feature) => {
        if (!mostrarLocalidadesRef.current) return undefined;
        const nombre = String(feature.get("nombre") ?? "");
        const locId = MAPA_NOMBRE_LOCALIDAD[nombre];
        const coincideLocalidad =
          localidadRef.current === "todas" || localidadRef.current === locId;

        const token = COLORES_POR_LOCALIDAD[locId] ?? "--info";
        const c = colorToken(token);
        const hovered = feature.get("hovered");

        return new Style({
          fill: new Fill({
            color: hovered
              ? `color-mix(in srgb, ${c} 30%, transparent)`
              : coincideLocalidad
                ? `color-mix(in srgb, ${c} 15%, transparent)`
                : `color-mix(in srgb, ${c} 4%, transparent)`,
          }),
          stroke: new Stroke({
            color: hovered ? colorToken("--ember") : c,
            width: hovered ? 3 : coincideLocalidad ? 2 : 1,
          }),
          text: new Text({
            text: nombre,
            font: "600 13px Geist, sans-serif",
            fill: new Fill({ color: colorToken("--text-primary") }),
            stroke: new Stroke({ color: colorToken("--surface-1"), width: 3.5 }),
            overflow: true,
          }),
        });
      },
    });

    /* 2. Capa Poligonal de Corregimientos (GeoJSON) */
    const fuenteCorregimientos = new VectorSource({
      url: "/geodatos/cartagena_corregimientos.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });

    const capaCorregimientos = new VectorLayer({
      source: fuenteCorregimientos,
      zIndex: 3,
      style: (feature) => {
        if (!mostrarCorregimientosRef.current) return undefined;
        const nombre = String(feature.get("nombre") ?? "");
        const hovered = feature.get("hovered");
        const c = colorToken("--ember");

        return new Style({
          fill: new Fill({
            color: hovered
              ? `color-mix(in srgb, ${c} 25%, transparent)`
              : `color-mix(in srgb, ${c} 8%, transparent)`,
          }),
          stroke: new Stroke({
            color: c,
            width: hovered ? 2.5 : 1.5,
            lineDash: [5, 4],
          }),
          text: new Text({
            text: nombre,
            font: "500 11px Geist, sans-serif",
            fill: new Fill({ color: colorToken("--text-secondary") }),
            stroke: new Stroke({ color: colorToken("--surface-1"), width: 2.5 }),
            overflow: true,
          }),
        });
      },
    });

    /* 3. Capa Poligonal de Barrios (217 barrios oficiales GeoJSON) */
    const fuenteBarrios = new VectorSource({
      url: "/geodatos/cartagena_barrios.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });
    fuenteBarriosRef.current = fuenteBarrios;

    const capaBarrios = new VectorLayer({
      source: fuenteBarrios,
      zIndex: 4,
      style: (feature, resolution) => {
        if (!mostrarBarriosRef.current) return undefined;
        const nombre = String(feature.get("nombre") ?? "");
        const hovered = feature.get("hovered");
        const normalizar = (s: string) =>
          s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const esSeleccionado =
          Boolean(barrioSeleccionadoRef.current) &&
          normalizar(nombre).includes(normalizar(barrioSeleccionadoRef.current ?? ""));

        const ember = colorToken("--ember");
        const borde = colorToken("--border-strong");

        if (esSeleccionado || hovered) {
          return new Style({
            fill: new Fill({
              color: `color-mix(in srgb, ${ember} 35%, transparent)`,
            }),
            stroke: new Stroke({
              color: ember,
              width: 2.5,
            }),
            text: new Text({
              text: nombre,
              font: "600 12px Geist, sans-serif",
              fill: new Fill({ color: colorToken("--text-primary") }),
              stroke: new Stroke({ color: colorToken("--surface-1"), width: 3.5 }),
              overflow: true,
            }),
          });
        }

        // A zoom alejado (resolution > 120), mostrar solo el contorno suave
        if (resolution > 120) {
          return new Style({
            stroke: new Stroke({
              color: `color-mix(in srgb, ${borde} 35%, transparent)`,
              width: 0.75,
            }),
          });
        }

        // A zoom cercano, mostrar nombre del barrio
        return new Style({
          fill: new Fill({
            color: "color-mix(in srgb, var(--surface-2) 10%, transparent)",
          }),
          stroke: new Stroke({
            color: `color-mix(in srgb, ${borde} 50%, transparent)`,
            width: 1,
          }),
          text: new Text({
            text: nombre,
            font: "500 10.5px Geist, sans-serif",
            fill: new Fill({ color: colorToken("--text-secondary") }),
            stroke: new Stroke({ color: colorToken("--surface-1"), width: 2.5 }),
            overflow: true,
          }),
        });
      },
    });

    /* 4. Capas de puntos de referencia */
    const capasPuntos = (["localidad", "corregimiento", "isla"] as const).map(
      (tipo) => crearCapaTerritorios(tipo, localidadRef),
    );

    const mapa = new Map({
      target,
      layers: [
        new TileLayer({ source: new OSM() }),
        capaLocalidades,
        capaCorregimientos,
        capaBarrios,
        ...capasPuntos,
      ],
      view: new View({
        center: fromLonLat([-75.5144, 10.391]),
        zoom: 11,
        minZoom: 9,
        maxZoom: 18,
      }),
    });
    mapaRef.current = mapa;

    const featureAtPixel = (pixel: number[]) => {
      let found: Feature<Geometry> | undefined;
      mapa.forEachFeatureAtPixel(pixel, (feature) => {
        found = feature as Feature<Geometry>;
        return true;
      });
      return found;
    };

    const handleClick = (event: { pixel: number[] }) => {
      const feature = featureAtPixel(event.pixel);
      if (!feature) return;

      const id = feature.get("id");
      if (typeof id === "string") {
        onSelectTerritorio(id);
        return;
      }

      // Si es un polígono de barrio o corregimiento o localidad
      const nombre = feature.get("nombre");
      if (typeof nombre === "string") {
        // Buscar si coincide con un territorio conocido
        const t = TERRITORIOS_CARTAGENA.find(
          (item) => item.nombre.toLowerCase() === nombre.toLowerCase(),
        );
        if (t) {
          onSelectTerritorio(t.id);
        }
      }
    };

    const handlePointerMove = (event: { pixel: number[] }) => {
      if (event.pixel === undefined) return;
      const feature = featureAtPixel(event.pixel);
      target.style.cursor = feature ? "pointer" : "grab";

      // Hover en capas poligonales y puntos
      const todasLasCapas = [capaLocalidades, capaCorregimientos, capaBarrios, ...capasPuntos];
      todasLasCapas.forEach((capa) => {
        capa.getSource()?.getFeatures().forEach((elemento) => {
          const hovered = elemento === feature;
          if (elemento.get("hovered") !== hovered) {
            elemento.set("hovered", hovered, true);
            elemento.changed();
          }
        });
      });

      const nombre = feature?.get("nombre");
      const id = feature?.get("id");
      onHoverTerritorio(typeof nombre === "string" ? nombre : typeof id === "string" ? id : null);
    };

    mapa.on("click", handleClick);
    mapa.on("pointermove", handlePointerMove);

    const observer = new ResizeObserver(() => mapa.updateSize());
    observer.observe(target);
    mapa.updateSize();

    return () => {
      observer.disconnect();
      mapa.un("click", handleClick);
      mapa.un("pointermove", handlePointerMove);
      mapa.setTarget(undefined);
      mapaRef.current = null;
    };
  }, [target, onSelectTerritorio, onHoverTerritorio]);
}
