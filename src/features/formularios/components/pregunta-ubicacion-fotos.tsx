"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { UbicacionPregunta } from "./ubicacion-pregunta";
import { FotosPregunta } from "./fotos-pregunta";
import type { PreguntaFormulario } from "../models/formulario";
import { fotosSchema } from "../services/fotos-respuesta";
import { leerPunto } from "../services/ubicacion-geografica";
import { barrioDelPunto } from "../services/barrios-punto";
const borrador = z
  .object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.union([z.number(), z.string()]),
      z.union([z.number(), z.string()]),
    ]),
    fotos: fotosSchema.optional(),
    referencia: z.string().optional(),
    origen: z.enum(["mapa", "gps", "coordenadas"]).optional(),
    barrio: z.string().optional(),
  })
  .passthrough();
function leer(valor: string) {
  try {
    const r = borrador.safeParse(JSON.parse(valor));
    if (r.success) return r.data;
  } catch {}
  return {
    type: "Point" as const,
    coordinates: ["", ""] as [string, string],
    fotos: [],
  };
}
export function PreguntaUbicacionFotos({
  pregunta,
  valor,
  cambiar,
  error,
  ocupado,
  dimension,
  cambiarLocalidad,
}: {
  pregunta: PreguntaFormulario;
  valor: string;
  cambiar: (valor: string) => void;
  error?: string;
  ocupado?: (v: boolean) => void;
  dimension?: string;
  cambiarLocalidad?: (v: string) => void;
}) {
  const actual = useRef(valor);
  const cambio = useRef(cambiar);
  const localidad = useRef(cambiarLocalidad);
  const [mensaje, setMensaje] = useState("");
  const pendientes = useRef({ mapa: false, fotos: false });
  useEffect(() => {
    actual.current = valor;
    cambio.current = cambiar;
    localidad.current = cambiarLocalidad;
  }, [valor, cambiar, cambiarLocalidad]);
  const escribir = useCallback((datos: ReturnType<typeof leer>) => {
    const p = leerPunto(JSON.stringify(datos));
    const valor = {
      lat: p?.coordinates[1],
      lng: p?.coordinates[0],
      barrio: datos.barrio,
      fotos: datos.fotos ?? [],
    };
    const serializado = JSON.stringify({
      ...datos,
      tipo: "ubicacion_geografica",
      valor,
    });
    actual.current = serializado;
    cambio.current(serializado);
  }, []);
  const p = leerPunto(valor),
    lon = p?.coordinates[0],
    lat = p?.coordinates[1];
  useEffect(() => {
    if (lon === undefined || lat === undefined) return;
    let activo = true;
    void barrioDelPunto([lon, lat])
      .then((r) => {
        if (!activo) return;
        setMensaje("");
        const ahora = leerPunto(actual.current);
        if (
          !ahora ||
          ahora.coordinates[0] !== lon ||
          ahora.coordinates[1] !== lat
        )
          return;
        const datos = leer(actual.current);
        escribir({ ...datos, barrio: r.barrio });
        if (r.localidad) localidad.current?.(r.localidad);
        setMensaje(
          r.barrio
            ? `Barrio identificado: ${r.barrio}.`
            : "Barrio no identificado por la cartografía. Puedes indicar una referencia y elegir la localidad.",
        );
      })
      .catch(() => {
        if (activo)
          setMensaje(
            "No se pudo consultar el barrio. El punto sigue disponible; puedes indicar una referencia y elegir la localidad.",
          );
      });
    return () => {
      activo = false;
    };
  }, [lon, lat, escribir]);
  const datos = leer(valor);
  const busy = (tipo: "mapa" | "fotos", v: boolean) => {
    pendientes.current[tipo] = v;
    ocupado?.(pendientes.current.mapa || pendientes.current.fotos);
  };
  return (
    <div className="min-w-0 space-y-4">
      <UbicacionPregunta
        pregunta={pregunta}
        valor={valor}
        error={error}
        dimension={dimension}
        cambiar={(v) => {
          const anterior = leer(actual.current);
          if (!v) {
            escribir({ ...anterior, coordinates: ["", ""], barrio: undefined });
            return;
          }
          escribir({ ...leer(v), fotos: anterior.fotos ?? [] });
        }}
        ocupado={(v) => busy("mapa", v)}
      />
      {mensaje && (
        <p role="status" className="text-sm text-text-secondary">
          {mensaje}
        </p>
      )}
      <FotosPregunta
        fotos={datos.fotos ?? []}
        label={pregunta.labelFotos}
        maxFotos={pregunta.maxFotos ?? 5}
        ocupado={(v) => busy("fotos", v)}
        cambiar={(fotos) => escribir({ ...leer(actual.current), fotos })}
      />
    </div>
  );
}
