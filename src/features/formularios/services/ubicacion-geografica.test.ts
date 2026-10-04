import { describe, expect, test } from "vitest";
import { formularioVacio, type Formulario } from "../models/formulario";
import { validarPregunta, respuestasEfectivas } from "./formulario-engine";
import { generarGeoJson, leerPunto } from "./ubicacion-geografica";
import { generarCsv } from "./formulario-analitica";
import { useFormulariosDemoStore as useFormulariosStore } from "../__fixtures__/formularios-demo-store";
const p = {
  id: "punto",
  tipo: "ubicacion_geografica" as const,
  texto: "¿Dónde ocurre?",
  obligatoria: true,
  orden: 0,
};
const punto = JSON.stringify({
  type: "Point",
  coordinates: [-75.5144, 10.391],
  origen: "mapa",
  referencia: "Parque",
});
const form: Formulario = {
  ...formularioVacio(),
  id: "geo",
  titulo: "Reporte geográfico",
  estado: "activo",
  preguntas: [p],
};
describe("Punto geográfico en formularios", () => {
  test.each([
    undefined,
    "",
    "no-json",
    "[]",
    '{"type":"Polygon","coordinates":[0,0]}',
    '{"type":"Point","coordinates":[-181,10]}',
    '{"type":"Point","coordinates":[-75,91]}',
    '{"type":"Point","coordinates":["-75",10]}',
    '{"type":"Point","coordinates":[-75,null]}',
    '{"type":"Point","coordinates":[-75,10,4]}',
  ])("rechaza coordenadas o formato inválidos: %s", (valor) => {
    expect(validarPregunta(p, valor)).toBeDefined();
  });
  test("punto válido, origen GPS, precisión y respuesta opcional", () => {
    expect(validarPregunta(p, punto)).toBeUndefined();
    expect(validarPregunta({ ...p, obligatoria: false }, "")).toBeUndefined();
    expect(
      leerPunto(
        JSON.stringify({
          type: "Point",
          coordinates: [-75, 10],
          origen: "gps",
          precisionMetros: 15,
        }),
      ),
    ).toMatchObject({ precisionMetros: 15 });
    expect(
      leerPunto(
        JSON.stringify({
          type: "Point",
          coordinates: [-75, 10],
          precisionMetros: -1,
        }),
      ),
    ).toBeUndefined();
  });
  test("el punto oculto se excluye como cualquier pregunta condicional", () => {
    const f = {
      ...form,
      preguntas: [
        {
          id: "control",
          tipo: "opcion_unica" as const,
          texto: "¿Reportar?",
          obligatoria: true,
          orden: 0,
        },
        {
          ...p,
          orden: 1,
          logica: [
            {
              preguntaOrigenId: "control",
              operador: "igual" as const,
              valor: "si",
              accion: "mostrar" as const,
            },
          ],
        },
      ],
    };
    expect(respuestasEfectivas(f, { control: "no", punto })).toEqual({
      control: "no",
    });
  });
  test("exporta solo puntos válidos del formulario con longitud antes de latitud", () => {
    const respuestas = [
      {
        id: "r1",
        formularioId: "geo",
        enviadoEn: "2026-10-01",
        respuestas: { punto },
      },
      {
        id: "r2",
        formularioId: "otro",
        enviadoEn: "2026-10-01",
        respuestas: { punto },
      },
      {
        id: "r3",
        formularioId: "geo",
        enviadoEn: "2026-10-01",
        respuestas: { punto: "inválido" },
      },
    ];
    const geo = generarGeoJson(form, respuestas);
    expect(geo.features).toHaveLength(1);
    expect(geo.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [-75.5144, 10.391],
    });
    expect(geo.features[0].properties).toMatchObject({
      respuestaId: "r1",
      preguntaId: "punto",
    });
    expect(generarCsv(form, respuestas)).toContain(
      "Latitud: 10.391000; Longitud: -75.514400; Parque",
    );
  });
  test("guarda el punto vinculado al registro ciudadano de demostración", () => {
    const anterior = useFormulariosStore.getState();
    try {
      useFormulariosStore.setState({
        formularios: [structuredClone(form)],
        respuestas: [],
      });
      useFormulariosStore.getState().enviarRespuesta({
        formularioId: "geo",
        respuestas: { punto },
        enfoqueDiferencial: "Ninguno",
      });
      const [r] = useFormulariosStore.getState().respuestas;
      expect(r.formularioId).toBe("geo");
      expect(leerPunto(r.respuestas.punto)?.coordinates).toEqual([
        -75.5144, 10.391,
      ]);
    } finally {
      useFormulariosStore.setState(anterior);
    }
  });
});
