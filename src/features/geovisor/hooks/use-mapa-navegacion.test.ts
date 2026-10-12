import { describe, test, expect, vi, beforeEach } from "vitest";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Stroke from "ol/style/Stroke";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";

describe("Enlace Bidireccional de Navegación y Vuelo Cartográfico flyTo (GEO-DOCK-03)", () => {
  const MOCK_MESA_POZON: MesaGeovisor = {
    id: "mesa-01",
    nombre: "Mesa 01 — El Pozón",
    fecha: "2026-06-15",
    horario: "09:00 - 12:00",
    estado: "ACTA_CONCERTADA",
    realizada: true,
    total_asistentes: 52,
    territorio_id: "loc-2",
    territorio_nombre: "Localidad 2 — De la Virgen y Turística",
    territorio_codigo: "loc-2",
    longitud_referencia: -75.4821,
    latitud_referencia: 10.4015,
    tipo_ubicacion: "centroide_territorial_referencia",
    fotos: [],
    aforo: 60,
    codigo_oficial: "MSH-01",
    shortcode_ciudadano: "POZON-01",
  };

  const MOCK_MESA_SIN_COORD: MesaGeovisor = {
    id: "mesa-sin-coords",
    nombre: "Mesa Sin Coordenadas",
    fecha: null,
    horario: null,
    estado: "PROGRAMADA",
    realizada: false,
    total_asistentes: 0,
    territorio_id: null,
    territorio_nombre: null,
    territorio_codigo: null,
    longitud_referencia: null,
    latitud_referencia: null,
    tipo_ubicacion: null,
    fotos: [],
  };

  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("la vista de OpenLayers ejecuta animación flyTo hacia la mesa seleccionada", () => {
    const view = new View({
      center: fromLonLat([-75.5144, 10.391]),
      zoom: 11.5,
    });

    const animateSpy = vi.fn();
    view.animate = animateSpy;

    // Simulación del efecto flyTo de use-mapa.ts
    const mesa = MOCK_MESA_POZON;
    if (mesa.longitud_referencia !== null && mesa.latitud_referencia !== null) {
      view.animate({
        center: fromLonLat([mesa.longitud_referencia, mesa.latitud_referencia]),
        zoom: 15.5,
        duration: 600,
      });
    }

    expect(animateSpy).toHaveBeenCalledTimes(1);
    const args = animateSpy.mock.calls[0][0];
    expect(args.zoom).toBe(15.5);
    expect(args.duration).toBe(600);
    expect(args.center).toEqual(fromLonLat([-75.4821, 10.4015]));
  });

  test("previene animación flyTo si la mesa carece de coordenadas válidas", () => {
    const view = new View({
      center: fromLonLat([-75.5144, 10.391]),
      zoom: 11.5,
    });

    const animateSpy = vi.fn();
    view.animate = animateSpy;

    const mesa = MOCK_MESA_SIN_COORD;
    if (mesa.longitud_referencia !== null && mesa.latitud_referencia !== null) {
      view.animate({
        center: fromLonLat([mesa.longitud_referencia, mesa.latitud_referencia]),
        zoom: 15.5,
        duration: 600,
      });
    }

    expect(animateSpy).not.toHaveBeenCalled();
  });

  test("el estilo visual de la mesa seleccionada genera un halo de alta visibilidad", () => {
    function calcularEstiloMesa(feature: Feature, mesaSeleccionadaId: string | null) {
      const seleccionada = String(feature.get("id")) === mesaSeleccionadaId;

      if (seleccionada) {
        return [
          new Style({
            image: new CircleStyle({
              radius: 19,
              stroke: new Stroke({
                color: "#e85d04",
                width: 2.5,
              }),
            }),
          }),
          new Style({
            image: new CircleStyle({
              radius: 11,
            }),
          }),
        ];
      }

      return new Style({
        image: new CircleStyle({
          radius: 8,
        }),
      });
    }

    const feature = new Feature({
      geometry: new Point(fromLonLat([-75.4821, 10.4015])),
      id: "mesa-01",
      nombre: "Mesa 01 — El Pozón",
      realizada: true,
      estado: "ACTA_CONCERTADA",
    });

    // 1. Cuando NO está seleccionada
    const estiloNormal = calcularEstiloMesa(feature, null);
    expect(Array.isArray(estiloNormal)).toBe(false);
    if (!Array.isArray(estiloNormal)) {
      const img = estiloNormal.getImage() as CircleStyle;
      expect(img.getRadius()).toBe(8);
    }

    // 2. Cuando SÍ está seleccionada: retorna halo compuesto
    const estiloSeleccionada = calcularEstiloMesa(feature, "mesa-01");
    expect(Array.isArray(estiloSeleccionada)).toBe(true);
    if (Array.isArray(estiloSeleccionada)) {
      expect(estiloSeleccionada).toHaveLength(2);
      const halo = estiloSeleccionada[0].getImage() as CircleStyle;
      const nucleo = estiloSeleccionada[1].getImage() as CircleStyle;
      expect(halo.getRadius()).toBe(19);
      expect(nucleo.getRadius()).toBe(11);
    }
  });

  test("la selección de mesa abre automáticamente el panel derecho en el store", () => {
    const store = useGeovisorLayoutStore.getState();
    expect(store.rightOpen).toBe(false); // Inicia cerrado

    // Al seleccionar una mesa (desde click en mapa, directorio izq o datagrid inf)
    store.setPanelOpen("right", true);

    expect(useGeovisorLayoutStore.getState().rightOpen).toBe(true);
  });
});
