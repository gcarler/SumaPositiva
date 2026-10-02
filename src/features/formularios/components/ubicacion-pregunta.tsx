"use client";
import "ol/ol.css";
import { useEffect, useId, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle, Fill, Stroke, Style, Text } from "ol/style";
import Modify from "ol/interaction/Modify";
import { DIMENSIONES_REPORTE } from "../data/reporte-inseguridad";
import { fromLonLat, toLonLat } from "ol/proj";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import {
  leerPunto,
  textoPunto,
  type PuntoRespuesta,
} from "../services/ubicacion-geografica";
import type { PreguntaFormulario } from "../models/formulario";

const CENTRO_CARTAGENA = [-75.4794, 10.391];
const borradorSchema = z.object({
  coordinates: z.tuple([
    z.union([z.string(), z.number()]),
    z.union([z.string(), z.number()]),
  ]),
  referencia: z.string().optional(),
});
function borrador(valor: string) {
  try {
    const r = borradorSchema.safeParse(JSON.parse(valor));
    if (r.success) return r.data;
  } catch {
    /* Un punto sin respuesta comienza con coordenadas vacías. */
  }
  return { coordinates: ["", ""] as [string, string], referencia: "" };
}
/** El mapa y las coordenadas son dos entradas del mismo punto, en WGS84. */
export function UbicacionPregunta({
  pregunta,
  valor,
  error,
  cambiar,
  ocupado,
  dimension,
}: {
  pregunta: PreguntaFormulario;
  valor: string;
  error?: string;
  cambiar: (valor: string) => void;
  ocupado?: (valor: boolean) => void;
  dimension?: string;
}) {
  const id = useId();
  const target = useRef<HTMLDivElement>(null);
  const mapa = useRef<Map | null>(null);
  const fuente = useRef<VectorSource<Feature<Point>> | null>(null);
  const cambio = useRef(cambiar);
  const ocupacion = useRef(ocupado);
  const montado = useRef(true);
  const valorActual = useRef(valor);
  const dimensionActual = useRef(dimension);
  const actualizarEstilo = useRef<() => void>(() => {});
  const [gps, setGps] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [sinMapa, setSinMapa] = useState(false);
  const punto = leerPunto(valor);
  const coords = borrador(valor);
  useEffect(() => {
    ocupacion.current = ocupado;
    cambio.current = cambiar;
    valorActual.current = valor;
  }, [cambiar, valor, ocupado]);
  useEffect(() => {
    dimensionActual.current = dimension;
    actualizarEstilo.current();
  }, [dimension]);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      ocupacion.current?.(false);
    };
  }, []);
  useEffect(() => {
    if (!target.current) return;
    const source = new VectorSource<Feature<Point>>();
    fuente.current = source;
    const color = (token: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue(token)
        .trim();
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, 1];
    };
    const estilo = () => {
      const categoria = DIMENSIONES_REPORTE.find(
        (d) => d.id === dimensionActual.current,
      );
      return new Style({
        image: new Circle({
          radius: categoria ? 15 : 9,
          fill: new Fill({ color: color(categoria?.token ?? "--ember") }),
          stroke: new Stroke({ color: color("--surface-1"), width: 3 }),
        }),
        text: categoria
          ? new Text({
              text: categoria.icono,
              font: "16px sans-serif",
              fill: new Fill({ color: color("--text-primary") }),
            })
          : undefined,
      });
    };
    const layer = new VectorLayer({ source, style: estilo() });
    actualizarEstilo.current = () => layer.setStyle(estilo());
    const osm = new OSM();
    const tiles = new TileLayer({ source: osm });
    const tileError = () => setSinMapa(true);
    osm.on("tileloaderror", tileError);
    const inicial = leerPunto(valorActual.current);
    const actual = new Map({
      target: target.current,
      controls: [],
      layers: [tiles, layer],
      view: new View({
        center: fromLonLat(inicial?.coordinates ?? CENTRO_CARTAGENA),
        zoom: 13,
      }),
    });
    mapa.current = actual;
    const modificar = new Modify({ source, style: () => estilo() });
    actual.addInteraction(modificar);
    modificar.on("modifyend", () => {
      const geometria = source.getFeatures()[0]?.getGeometry();
      if (!geometria) return;
      cambio.current(
        JSON.stringify({
          type: "Point",
          coordinates: toLonLat(geometria.getCoordinates()).map((n) =>
            Number(n.toFixed(6)),
          ),
          origen: "mapa",
          referencia: borrador(valorActual.current).referencia,
        }),
      );
    });
    if (inicial)
      source.addFeature(
        new Feature(new Point(fromLonLat(inicial.coordinates))),
      );
    actual.on("singleclick", (event) => {
      const c = toLonLat(event.coordinate);
      const referencia = borrador(valorActual.current).referencia;
      cambio.current(
        JSON.stringify({
          type: "Point",
          coordinates: c.map((n) => Number(n.toFixed(6))),
          origen: "mapa",
          referencia,
        }),
      );
    });
    const resize = new ResizeObserver(() => actual.updateSize());
    resize.observe(target.current);
    const theme = new MutationObserver(() => layer.setStyle(estilo()));
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      resize.disconnect();
      theme.disconnect();
      osm.un("tileloaderror", tileError);
      actual.setTarget(undefined);
      mapa.current = null;
      fuente.current = null;
      actualizarEstilo.current = () => {};
    };
  }, []);
  useEffect(() => {
    const p = leerPunto(valor);
    fuente.current?.clear();
    if (p) {
      fuente.current?.addFeature(
        new Feature(new Point(fromLonLat(p.coordinates))),
      );
      mapa.current?.getView().setCenter(fromLonLat(p.coordinates));
    }
  }, [valor]);
  function escribir(indice: 0 | 1, texto: string) {
    const siguientes = [...coords.coordinates];
    siguientes[indice] =
      texto.trim() && Number.isFinite(Number(texto)) ? Number(texto) : texto;
    cambiar(
      JSON.stringify({
        type: "Point",
        coordinates: siguientes,
        origen: "coordenadas",
        referencia: coords.referencia ?? "",
      }),
    );
  }
  function ubicar() {
    setMensaje("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setMensaje(
        "La ubicación del dispositivo necesita acceso seguro (HTTPS). Puedes marcar el mapa o introducir coordenadas.",
      );
      return;
    }
    setGps(true);
    ocupacion.current?.(true);
    const valorInicial = valorActual.current;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        if (!montado.current) return;
        ocupacion.current?.(false);
        if (valorActual.current !== valorInicial) {
          setGps(false);
          return;
        }
        const dato: PuntoRespuesta = {
          type: "Point",
          coordinates: [posicion.coords.longitude, posicion.coords.latitude],
          origen: "gps",
          precisionMetros: posicion.coords.accuracy,
          referencia: coords.referencia,
        };
        cambio.current(JSON.stringify(dato));
        setGps(false);
      },
      () => {
        if (!montado.current) return;
        ocupacion.current?.(false);
        setMensaje(
          "No se pudo obtener tu ubicación. Puedes marcar el punto en el mapa o introducir coordenadas.",
        );
        setGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <section
      className="min-w-0 space-y-3"
      role="group"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={error ? `${id}-error` : undefined}
      data-dimension={dimension}
    >
      <h3 id={`${id}-titulo`} className="text-sm font-medium">
        {pregunta.texto}
        {pregunta.obligatoria ? " (obligatoria)" : ""}
      </h3>
      {pregunta.descripcion && (
        <p className="text-sm text-text-secondary">{pregunta.descripcion}</p>
      )}
      {dimension && (
        <p className="text-xs text-text-secondary">
          Categoría del marcador:{" "}
          {DIMENSIONES_REPORTE.find((d) => d.id === dimension)?.nombre ??
            "Sin categoría"}
        </p>
      )}
      <p id={`${id}-instrucciones`} className="text-xs text-text-secondary">
        Marca un punto de Cartagena. Con teclado, mueve el mapa con las flechas
        y pulsa «Marcar centro del mapa». También puedes introducir las
        coordenadas.
      </p>
      <div
        ref={target}
        tabIndex={0}
        role="region"
        aria-label={`Mapa para ${pregunta.texto}`}
        aria-describedby={`${id}-instrucciones`}
        className="h-72 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
      />
      <p className="text-xs text-text-secondary">
        Mapa: ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          OpenStreetMap
        </a>
      </p>
      {sinMapa && (
        <Notice title="Mapa base no disponible">
          Puedes registrar el punto con latitud y longitud.
        </Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            mapa.current
              ?.getView()
              .setZoom((mapa.current.getView().getZoom() ?? 13) + 1)
          }
          aria-label={`Acercar mapa de ${pregunta.texto}`}
        >
          Acercar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            mapa.current
              ?.getView()
              .setZoom((mapa.current.getView().getZoom() ?? 13) - 1)
          }
          aria-label={`Alejar mapa de ${pregunta.texto}`}
        >
          Alejar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-auto min-h-9 whitespace-normal"
          onClick={() => {
            const centro = mapa.current?.getView().getCenter();
            if (centro)
              cambiar(
                JSON.stringify({
                  type: "Point",
                  coordinates: toLonLat(centro).map((n) =>
                    Number(n.toFixed(6)),
                  ),
                  origen: "mapa",
                  referencia: coords.referencia,
                }),
              );
          }}
        >
          Marcar centro del mapa
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            mapa.current?.getView().setCenter(fromLonLat(CENTRO_CARTAGENA));
            mapa.current?.getView().setZoom(13);
          }}
        >
          Ver Cartagena
        </Button>
        <Button
          variant="outline"
          size="sm"
          loading={gps}
          loadingLabel="Ubicando…"
          onClick={ubicar}
        >
          Usar mi ubicación
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!valor}
          onClick={() => cambiar("")}
        >
          Quitar punto
        </Button>
      </div>
      {mensaje && <Notice title="Ubicación del dispositivo">{mensaje}</Notice>}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <FormField
          label="Latitud"
          id={`${id}-latitud`}
          description="Entre −90 y 90; Cartagena está cerca de 10.39."
        >
          {(control) => (
            <Input
              {...control}
              type="number"
              min={-90}
              max={90}
              step="any"
              value={coords.coordinates[1]}
              onChange={(e) => escribir(1, e.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Longitud"
          id={`${id}-longitud`}
          description="Entre −180 y 180; Cartagena está cerca de −75.51."
        >
          {(control) => (
            <Input
              {...control}
              type="number"
              min={-180}
              max={180}
              step="any"
              value={coords.coordinates[0]}
              onChange={(e) => escribir(0, e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormField label="Referencia del lugar (opcional)">
        {(control) => (
          <Input
            {...control}
            maxLength={240}
            value={coords.referencia ?? ""}
            placeholder="Calle, parque, esquina o lugar de referencia"
            onChange={(e) =>
              cambiar(
                JSON.stringify({
                  ...(punto ?? {
                    type: "Point",
                    coordinates: coords.coordinates,
                    origen: "coordenadas",
                  }),
                  referencia: e.target.value,
                }),
              )
            }
          />
        )}
      </FormField>
      <p role="status" className="break-words text-sm text-text-secondary">
        {punto ? textoPunto(valor) : "No hay un punto válido seleccionado."}
        {punto?.precisionMetros !== undefined
          ? ` Precisión estimada del dispositivo: ${Math.round(punto.precisionMetros)} m.`
          : ""}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
