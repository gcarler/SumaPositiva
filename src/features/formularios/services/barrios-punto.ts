import GeoJSON from "ol/format/GeoJSON";
import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
let capas:
  | Promise<{ barrios: Feature<Geometry>[]; localidades: Feature<Geometry>[] }>
  | undefined;
async function cargar(ruta: string) {
  const r = await fetch(ruta, { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error("No se pudo consultar la cartografía");
  return new GeoJSON().readFeatures(await r.json(), {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:4326",
  });
}
export async function barrioDelPunto(coordinates: [number, number]) {
  capas ??= Promise.all([
    cargar("/geodatos/cartagena_barrios.geojson"),
    cargar("/geodatos/cartagena_localidades.geojson"),
  ])
    .then(([barrios, localidades]) => ({ barrios, localidades }))
    .catch((e: unknown) => {
      capas = undefined;
      throw e;
    });
  const data = await capas;
  const barrio = data.barrios
    .find((f) => f.getGeometry()?.intersectsCoordinate(coordinates))
    ?.get("nombre");
  const nombre = data.localidades
    .find((f) => f.getGeometry()?.intersectsCoordinate(coordinates))
    ?.get("nombre");
  const localidad =
    nombre === "HISTORICA Y DEL CARIBE NORTE"
      ? "localidad-1"
      : nombre === "DE LA VIRGEN Y TURISTICA"
        ? "localidad-2"
        : nombre === "INDUSTRIAL DE LA BAHIA"
          ? "localidad-3"
          : undefined;
  return { barrio: typeof barrio === "string" ? barrio : undefined, localidad };
}
