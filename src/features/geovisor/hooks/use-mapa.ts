"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import Point from "ol/geom/Point";
import { GEOJSON_TERRITORIOS } from "../data/territorios.geojson";
import {
  type VariableMapa,
  VARIABLE_META,
  ESTADISTICAS_TERRITORIOS,
  obtenerValorVariable,
  interpolarColor,
  type EstadisticasTerritorio,
} from "../data/estadisticas.data";
import { BARRIOS_CARTAGENA, type Barrio } from "../data/barrios.data";
import type { CapasConfig } from "../components/geovisor-controles";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";

export interface HoverInfo {
  id: string;
  nombre: string;
  tipo: "localidad" | "corregimiento" | "isla" | "barrio" | "mesa";
  ish?: number;
  poblacion?: number;
  aportes?: number;
  alertas?: number;
  homicidios?: number;
  mesas?: number;
  variableValor?: number;
  variableNombre?: string;
  variableUnidad?: string;
  pixel: [number, number];
  mesaDetalle?: {
    territorio: string;
    fecha: string;
    horario: string;
    asistentes: number;
    aforo: number;
    estado: string;
    realizada: boolean;
  };
}

export interface UseMapaOptions {
  target: HTMLDivElement | null;
  onSelectTerritorio: (territorioId: string) => void;
  onSelectBarrio?: (barrioNombre: string) => void;
  onHoverInfo: (info: HoverInfo | null) => void;
  localidadId: string;
  barrioSeleccionado?: string | null;
  variableMapa?: VariableMapa;
  capasVisibles?: CapasConfig;
  mesas?: MesaGeovisor[];
  mesaSeleccionadaId?: string | null;
  onSelectMesa?: (mesaId: string) => void;
}

/**
 * Constantes hex obligatorias para capas cartográficas de OpenLayers.
 * Excepción explícita al no-hardcode-colors para garantizar compatibilidad nativa con Canvas 2D.
 */
export const COLORES_MAPA = {
  loc1: "#e85d04",
  loc2: "#f48c06",
  loc3: "#dc2f02",
  corregimiento: "#6d6875",
  barrio: "#3a86ff",
  barrioHover: "#023e8a",
  hover: "#023e8a",
  stroke: "#ffffff",
  strokeHover: "#1a1a2e",
  heatHigh: "#d62828",
  heatMid: "#f77f00",
  heatLow: "#fcbf49",
} as const;

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const MAPA_BARRIOS_METADATOS: Record<string, Barrio> = {};
BARRIOS_CARTAGENA.forEach((b) => {
  MAPA_BARRIOS_METADATOS[normalizar(b.barrio)] = b;
});

function crearCapaPuntosAlertas(
  localidadRef: { current: string },
  capasRef: { current: CapasConfig },
): VectorLayer<VectorSource<Feature>> {
  const puntos = ESTADISTICAS_TERRITORIOS.filter((t) => t.tipo !== "localidad");
  const geojson = {
    type: "FeatureCollection",
    features: puntos.map((t) => ({
      type: "Feature",
      id: t.id,
      geometry: { type: "Point", coordinates: [t.lon, t.lat] },
      properties: {
        id: t.id,
        nombre: t.nombre,
        tipo: t.tipo,
        alertas: t.alertas,
      },
    })),
  };
  const features = new GeoJSON().readFeatures(geojson, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });
  const fuente = new VectorSource({ features });

  return new VectorLayer({
    source: fuente,
    zIndex: 10,
    declutter: true,
    style: (feature) => {
      if (!capasRef.current.puntos) return undefined;
      const alertas = Number(feature.get("alertas") ?? 0);
      const colorPunto =
        alertas >= 5
          ? COLORES_MAPA.heatHigh
          : alertas >= 3
            ? COLORES_MAPA.heatMid
            : COLORES_MAPA.heatLow;

      const hovered = feature.get("hovered");

      return new Style({
        image: new CircleStyle({
          radius: hovered ? 9 : 7,
          fill: new Fill({ color: colorPunto }),
          stroke: new Stroke({ color: COLORES_MAPA.stroke, width: 2 }),
        }),
        text: capasRef.current.etiquetas
          ? new Text({
              text: String(feature.get("nombre") ?? ""),
              offsetY: -16,
              font: "600 11px Geist, sans-serif",
              fill: new Fill({ color: COLORES_MAPA.strokeHover }),
              stroke: new Stroke({ color: COLORES_MAPA.stroke, width: 3 }),
              overflow: true,
            })
          : undefined,
      });
    },
  });
}

export function useMapa({
  target,
  onSelectTerritorio,
  onSelectBarrio,
  onHoverInfo,
  localidadId,
  barrioSeleccionado = null,
  variableMapa = "ish",
  capasVisibles = {
    localidades: true,
    corregimientos: true,
    barrios: true,
    puntos: true,
    etiquetas: true,
  },
  mesas = [],
  mesaSeleccionadaId = null,
  onSelectMesa,
}: UseMapaOptions) {
  const mapaRef = useRef<Map | null>(null);
  const [cargando, setCargando] = useState(true);

  const localidadRef = useRef(localidadId);
  const barrioRef = useRef(barrioSeleccionado);
  const variableRef = useRef(variableMapa);
  const capasRef = useRef(capasVisibles);

  const fuenteTerritoriosRef = useRef<VectorSource<Feature> | null>(null);
  const fuenteBarriosRef = useRef<VectorSource<Feature> | null>(null);
  const fuentePuntosRef = useRef<VectorSource<Feature> | null>(null);
  const fuenteMesasRef = useRef<VectorSource<Feature> | null>(null);
  const mesasRef = useRef(mesas);
  const mesaSeleccionadaRef = useRef(mesaSeleccionadaId);

  useEffect(() => {
    localidadRef.current = localidadId;
    barrioRef.current = barrioSeleccionado;
    variableRef.current = variableMapa;
    capasRef.current = capasVisibles;
    mesasRef.current = mesas;
    mesaSeleccionadaRef.current = mesaSeleccionadaId;

    if (fuenteMesasRef.current) {
      fuenteMesasRef.current.clear(true);
      const features = new GeoJSON().readFeatures({
        type: "FeatureCollection",
        features: mesas.map((mesa) => ({
          type: "Feature",
          id: mesa.id,
          geometry: mesa.longitud_referencia !== null && mesa.latitud_referencia !== null
            ? { type: "Point", coordinates: [mesa.longitud_referencia, mesa.latitud_referencia] }
            : null,
          properties: {
            id: mesa.id,
            nombre: mesa.nombre,
            realizada: mesa.realizada,
            estado: mesa.estado,
            total_asistentes: mesa.total_asistentes,
            horario: mesa.horario,
            fecha: mesa.fecha,
            territorio_nombre: mesa.territorio_nombre,
            aforo: mesa.aforo ?? 80,
            tipo: "mesa",
          },
        })).filter((feature) => feature.geometry !== null),
      }, { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" });
      fuenteMesasRef.current.addFeatures(features);
    }
    mapaRef.current?.getLayers().forEach((layer) => layer.changed());
  }, [localidadId, barrioSeleccionado, variableMapa, capasVisibles, mesas, mesaSeleccionadaId]);

  // Manejo de foco al cambiar localidad
  useEffect(() => {
    if (!mapaRef.current || !fuenteTerritoriosRef.current) return;
    if (localidadId === "todas") {
      mapaRef.current.getView().animate({
        center: fromLonLat([-75.5144, 10.391]),
        zoom: 11.5,
        duration: 500,
      });
      return;
    }
    const features = fuenteTerritoriosRef.current.getFeatures();
    const targetFeature = features.find((f) => f.get("id") === localidadId);
    if (targetFeature) {
      const geom = targetFeature.getGeometry();
      if (geom) {
        mapaRef.current.getView().fit(geom.getExtent(), {
          duration: 600,
          maxZoom: 13.5,
          padding: [60, 60, 60, 60],
        });
      }
      return;
    }
    const punto = fuentePuntosRef.current?.getFeatures().find((feature) => feature.get("id") === localidadId);
    const geometriaPunto = punto?.getGeometry();
    const coordenada = geometriaPunto instanceof Point ? geometriaPunto.getCoordinates() : undefined;
    if (coordenada) mapaRef.current.getView().animate({ center: coordenada, zoom: 13.5, duration: 500 });
  }, [localidadId]);

  // Manejo de foco al seleccionar un barrio
  useEffect(() => {
    if (!barrioSeleccionado || !mapaRef.current || !fuenteBarriosRef.current) return;
    const targetNombre = normalizar(barrioSeleccionado);
    const featureEncontrada = fuenteBarriosRef.current.getFeatures().find((f) => {
      const nom = normalizar(String(f.get("nombre") ?? ""));
      return nom.includes(targetNombre) || targetNombre.includes(nom);
    });

    if (featureEncontrada) {
      const geom = featureEncontrada.getGeometry();
      if (geom) {
        mapaRef.current.getView().fit(geom.getExtent(), {
          duration: 600,
          maxZoom: 16,
          padding: [80, 80, 80, 80],
        });
      }
    }
  }, [barrioSeleccionado]);

  // Montaje de OpenLayers y capas coropléticas
  useEffect(() => {
    if (!target) return;

    /* 1. Capa Poligonal Coroplética de Territorios (GEOJSON_TERRITORIOS) */
    const format = new GeoJSON();
    const featsTerritorios = format.readFeatures(GEOJSON_TERRITORIOS, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
    const fuenteTerritorios = new VectorSource({ features: featsTerritorios });
    fuenteTerritoriosRef.current = fuenteTerritorios;

    const capaTerritorios = new VectorLayer({
      source: fuenteTerritorios,
      zIndex: 2,
      style: (feature) => {
        const id = String(feature.get("id") ?? "");
        const nombre = String(feature.get("nombre") ?? "");
        const esRural = id === "rural-insular";

        if (esRural && !capasRef.current.corregimientos) return undefined;
        if (!esRural && !capasRef.current.localidades) return undefined;

        const stats = ESTADISTICAS_TERRITORIOS.find((t) => t.id === id);
        const valores = ESTADISTICAS_TERRITORIOS.map((t) =>
          obtenerValorVariable(t, variableRef.current),
        );
        const minVal = Math.min(...valores);
        const maxVal = Math.max(...valores);

        const val = stats ? obtenerValorVariable(stats, variableRef.current) : 0;
        const colorChoropleth = interpolarColor(val, minVal, maxVal);

        const coincideLocalidad =
          localidadRef.current === "todas" || localidadRef.current === id;
        const hovered = feature.get("hovered");
        const esSeleccionado = localidadRef.current === id;

        const colorRelleno = hovered
          ? `${COLORES_MAPA.hover}99`
          : coincideLocalidad
            ? `${colorChoropleth}cc`
            : `${colorChoropleth}33`;

        const colorBorde =
          hovered || esSeleccionado ? COLORES_MAPA.strokeHover : COLORES_MAPA.stroke;

        const meta = VARIABLE_META[variableRef.current];

        return new Style({
          fill: new Fill({ color: colorRelleno }),
          stroke: new Stroke({
            color: colorBorde,
            width: hovered || esSeleccionado ? 3 : 1.5,
          }),
          text: capasRef.current.etiquetas
            ? new Text({
                text: `${nombre}\n${meta.label}: ${val.toLocaleString("es-CO")} ${meta.unidad}`,
                font: "600 11.5px Geist, sans-serif",
                fill: new Fill({ color: COLORES_MAPA.strokeHover }),
                stroke: new Stroke({ color: COLORES_MAPA.stroke, width: 3.5 }),
                overflow: true,
              })
            : undefined,
        });
      },
    });

    /* 2. Capa de Barrios (217 polígonos catastrales) */
    const fuenteBarrios = new VectorSource();
    fuenteBarriosRef.current = fuenteBarrios;

    const capaBarrios = new VectorLayer({
      source: fuenteBarrios,
      zIndex: 4,
      style: (feature, resolution) => {
        if (!capasRef.current.barrios) return undefined;
        const nombre = String(feature.get("nombre") ?? "");
        const hovered = feature.get("hovered");
        const targetNombre = normalizar(barrioRef.current ?? "");
        const esSeleccionado =
          Boolean(barrioRef.current) &&
          (normalizar(nombre).includes(targetNombre) || targetNombre.includes(normalizar(nombre)));

        if (esSeleccionado || hovered) {
          return new Style({
            fill: new Fill({ color: `${COLORES_MAPA.barrioHover}55` }),
            stroke: new Stroke({ color: COLORES_MAPA.barrioHover, width: 2.5 }),
            text: new Text({
              text: nombre,
              font: "600 11.5px Geist, sans-serif",
              fill: new Fill({ color: COLORES_MAPA.strokeHover }),
              stroke: new Stroke({ color: COLORES_MAPA.stroke, width: 3 }),
              overflow: true,
            }),
          });
        }

        // Mostrar barrios a resolución detallada (zoom >= 13)
        if (resolution > 60) {
          return new Style({
            stroke: new Stroke({ color: `${COLORES_MAPA.barrio}33`, width: 0.75 }),
          });
        }

        return new Style({
          fill: new Fill({ color: `${COLORES_MAPA.barrio}15` }),
          stroke: new Stroke({ color: `${COLORES_MAPA.barrio}88`, width: 1 }),
          text: new Text({
            text: nombre,
            font: "500 10px Geist, sans-serif",
            fill: new Fill({ color: COLORES_MAPA.strokeHover }),
            stroke: new Stroke({ color: COLORES_MAPA.stroke, width: 2.5 }),
            overflow: true,
          }),
        });
      },
    });

    /* 3. Capa de Puntos de Alertas SAT */
    const capaPuntos = crearCapaPuntosAlertas(localidadRef, capasRef);
    fuentePuntosRef.current = capaPuntos.getSource() ?? null;
    const fuenteMesas = new VectorSource<Feature>();
    fuenteMesasRef.current = fuenteMesas;
    const puntosMesas = new GeoJSON().readFeatures({
      type: "FeatureCollection",
      features: mesasRef.current.map((mesa) => ({
        type: "Feature",
        id: mesa.id,
        geometry: mesa.longitud_referencia !== null && mesa.latitud_referencia !== null
          ? { type: "Point", coordinates: [mesa.longitud_referencia, mesa.latitud_referencia] }
          : null,
        properties: {
          id: mesa.id,
          nombre: mesa.nombre,
          realizada: mesa.realizada,
          estado: mesa.estado,
          total_asistentes: mesa.total_asistentes,
          horario: mesa.horario,
          fecha: mesa.fecha,
          territorio_nombre: mesa.territorio_nombre,
          aforo: mesa.aforo ?? 80,
          tipo: "mesa",
        },
      })).filter((feature) => feature.geometry !== null),
    }, { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" });
    fuenteMesas.addFeatures(puntosMesas);
    const capaMesas = new VectorLayer({
      source: fuenteMesas,
      zIndex: 20,
      declutter: true,
      style: (feature) => {
        const estado = String(feature.get("estado") ?? "").toUpperCase();
        const realizada =
          feature.get("realizada") === true ||
          estado === "FINALIZADA" ||
          estado === "ACTA_CONCERTADA" ||
          estado === "REALIZADA";
        const enCurso = estado === "EN_DELIBERACION" || estado === "EN_CURSO";
        const seleccionada = String(feature.get("id")) === mesaSeleccionadaRef.current;
        const hovered = feature.get("hovered") === true;

        // Semáforo:
        // 🟢 Verde: Mesa Realizada / Cerrada
        // 🔵 Azul: Mesa en Curso
        // 🟡 Amarillo / Ember: Mesa Programada
        const color = realizada
          ? "#16a34a"
          : enCurso
          ? "#2563eb"
          : "#e85d04";

        const radius = seleccionada ? 12 : hovered ? 10 : 8;

        return new Style({
          image: new CircleStyle({
            radius,
            fill: new Fill({ color }),
            stroke: new Stroke({
              color: "#ffffff",
              width: seleccionada ? 3.5 : hovered ? 2.5 : 2,
            }),
          }),
          text: capasRef.current.etiquetas
            ? new Text({
                text: String(feature.get("nombre") ?? "Mesa"),
                offsetY: -18,
                font: "600 11px Geist, sans-serif",
                fill: new Fill({ color: "#111827" }),
                stroke: new Stroke({ color: "#ffffff", width: 3 }),
                overflow: true,
              })
            : undefined,
        });
      },
    });

    const mapa = new Map({
      target,
      layers: [
        new TileLayer({ source: new OSM() }),
        capaTerritorios,
        capaBarrios,
        capaPuntos,
        capaMesas,
      ],
      view: new View({
        center: fromLonLat([-75.5144, 10.391]),
        zoom: 11.5,
        minZoom: 9,
        maxZoom: 18,
      }),
    });
    mapaRef.current = mapa;

    // Cargar barrios en background
    let cancelado = false;
    fetch("/geodatos/cartagena_barrios.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((resBarrios) => {
        if (!resBarrios || cancelado) return;
        const featsBarrios = format.readFeatures(resBarrios, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });
        fuenteBarrios.addFeatures(featsBarrios);
        setCargando(false);
      })
      .catch(() => {
        if (!cancelado) setCargando(false);
      });

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
      if (feature.get("tipo") === "mesa") {
        const idMesa = feature.get("id");
        if (typeof idMesa === "string") onSelectMesa?.(idMesa);
        return;
      }

      const id = feature.get("id");
      if (typeof id === "string") {
        onSelectTerritorio(id);
        return;
      }

      const nombre = feature.get("nombre");
      if (typeof nombre === "string") {
        const t = ESTADISTICAS_TERRITORIOS.find(
          (item) => item.nombre.toLowerCase() === nombre.toLowerCase(),
        );
        if (t) {
          onSelectTerritorio(t.id);
          return;
        }

        const meta = MAPA_BARRIOS_METADATOS[normalizar(nombre)];
        if (meta && onSelectBarrio) {
          onSelectBarrio(meta.barrio);
          onSelectTerritorio(meta.localidadId);
        }
      }
    };

    const handlePointerMove = (event: { pixel: number[] }) => {
      if (event.pixel === undefined) return;
      const pixel = event.pixel as [number, number];
      const feature = featureAtPixel(pixel);
      target.style.cursor = feature ? "pointer" : "grab";

      const todasLasCapas = [capaTerritorios, capaBarrios, capaPuntos, capaMesas];
      todasLasCapas.forEach((capa) => {
        capa.getSource()?.getFeatures().forEach((elemento) => {
          const hovered = elemento === feature;
          if (elemento.get("hovered") !== hovered) {
            elemento.set("hovered", hovered, true);
            elemento.changed();
          }
        });
      });

      if (!feature) {
        onHoverInfo(null);
        return;
      }

      const id = String(feature.get("id") ?? "");
      const nombre = String(feature.get("nombre") ?? "");
      if (feature.get("tipo") === "mesa") {
        const mesa = mesasRef.current.find((item) => item.id === id);
        if (mesa) {
          onHoverInfo({
            id: mesa.id,
            nombre: mesa.nombre,
            tipo: "mesa",
            pixel,
            mesaDetalle: {
              territorio: mesa.territorio_nombre || "Distrito de Cartagena",
              fecha: mesa.fecha || "Por confirmar",
              horario: mesa.horario || "08:30 – 12:00",
              asistentes: mesa.total_asistentes,
              aforo: mesa.aforo ?? 80,
              estado: mesa.estado,
              realizada: mesa.realizada,
            },
          });
          return;
        }
      }
      const stats = ESTADISTICAS_TERRITORIOS.find((t) => t.id === id || t.nombre === nombre);

      if (stats) {
        const meta = VARIABLE_META[variableRef.current];
        const val = obtenerValorVariable(stats, variableRef.current);
        onHoverInfo({
          id: stats.id,
          nombre: stats.nombre,
          tipo: stats.tipo,
          ish: stats.ish,
          poblacion: stats.poblacion,
          aportes: stats.aportesCiudadanos,
          alertas: stats.alertas,
          homicidios: stats.homicidios,
          mesas: stats.mesasRealizadas,
          variableValor: val,
          variableNombre: meta.label,
          variableUnidad: meta.unidad,
          pixel,
        });
        return;
      }

      // Barrio
      const metaBarrio = MAPA_BARRIOS_METADATOS[normalizar(nombre)];
      onHoverInfo({
        id: nombre,
        nombre: metaBarrio ? metaBarrio.barrio : nombre,
        tipo: "barrio",
        pixel,
      });
    };

    mapa.on("click", handleClick);
    mapa.on("pointermove", handlePointerMove);

    const observer = new ResizeObserver(() => mapa.updateSize());
    observer.observe(target);
    mapa.updateSize();

    return () => {
      cancelado = true;
      observer.disconnect();
      mapa.un("click", handleClick);
      mapa.un("pointermove", handlePointerMove);
      mapa.setTarget(undefined);
      mapaRef.current = null;
      fuenteMesasRef.current = null;
      fuentePuntosRef.current = null;
    };
  }, [target, onSelectTerritorio, onSelectBarrio, onHoverInfo, onSelectMesa]);

  // Controles del mapa
  const zoomIn = useCallback(() => {
    if (!mapaRef.current) return;
    const view = mapaRef.current.getView();
    view.animate({ zoom: (view.getZoom() ?? 11) + 1, duration: 250 });
  }, []);

  const zoomOut = useCallback(() => {
    if (!mapaRef.current) return;
    const view = mapaRef.current.getView();
    view.animate({ zoom: (view.getZoom() ?? 11) - 1, duration: 250 });
  }, []);

  const centrarCartagena = useCallback(() => {
    if (!mapaRef.current) return;
    mapaRef.current.getView().animate({
      center: fromLonLat([-75.5144, 10.391]),
      zoom: 11.5,
      duration: 500,
    });
  }, []);

  const exportarPng = useCallback(() => {
    if (!mapaRef.current) return;
    mapaRef.current.once("rendercomplete", () => {
      const canvas = document.querySelector(".ol-viewport canvas") as HTMLCanvasElement;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `geovisor-cartagena-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
    mapaRef.current.renderSync();
  }, []);

  return { cargando, zoomIn, zoomOut, centrarCartagena, exportarPng };
}
