import { beforeEach, describe, expect, test } from "vitest";
import {
  formularioVacio,
  type Formulario,
  type PreguntaFormulario,
  type TipoPregunta,
} from "../models/formulario";
import {
  condicionCumplida,
  preguntasVisibles,
  respuestasEfectivas,
  validarPregunta,
  validarFormulario,
  validarRespuestas,
  destinoSeccion,
  motivoCierre,
  mezclar,
} from "./formulario-engine";
import { calcularAnalitica, generarCsv } from "./formulario-analitica";
import { useFormulariosStore } from "../state/formularios-store";
import { BARRIOS_CARTAGENA } from "@/features/geovisor/data/barrios.data";
const pregunta = (
  tipo: TipoPregunta = "texto_corto",
  cambios: Partial<PreguntaFormulario> = {},
): PreguntaFormulario => ({
  id: "p",
  texto: "Pregunta",
  tipo,
  obligatoria: true,
  orden: 0,
  ...cambios,
});
const form = (preguntas: PreguntaFormulario[]): Formulario => ({
  ...formularioVacio(),
  id: "test",
  titulo: "Prueba",
  estado: "activo",
  preguntas,
});
beforeEach(() => useFormulariosStore.getState().reiniciarDemo());
describe("Validaciones de respuesta", () => {
  test.each([
    "texto_corto",
    "texto_largo",
    "opcion_unica",
    "opcion_multiple",
    "lista_desplegable",
    "likert",
    "escala_lineal",
    "fecha",
    "hora",
    "numero",
    "carga_archivo",
  ] as TipoPregunta[])("%s rechaza una respuesta obligatoria vacía", (tipo) =>
    expect(validarPregunta(pregunta(tipo), undefined)).toBeDefined(),
  );
  test("bloques informativos no exigen valor", () => {
    expect(validarPregunta(pregunta("seccion"), undefined)).toBeUndefined();
    expect(validarPregunta(pregunta("descripcion"), undefined)).toBeUndefined();
  });
  test("longitud, patrón y error personalizado", () => {
    const p = pregunta("texto_corto", {
      validacion: { minLongitud: 3, maxLongitud: 5, patron: "^[a-z]+$" },
    });
    expect(validarPregunta(p, "ab")).toBeDefined();
    expect(validarPregunta(p, "abcdef")).toBeDefined();
    expect(validarPregunta(p, "ABC")).toBeDefined();
    expect(validarPregunta(p, "abc")).toBeUndefined();
    expect(
      validarPregunta(
        { ...p, validacion: { mensajeError: "Mensaje", minLongitud: 5 } },
        "a",
      ),
    ).toBe("Mensaje");
  });
  test("números finitos, rango y paso", () => {
    const p = pregunta("numero", {
      validacion: { minValor: 0, maxValor: 3 },
      paso: 0.5,
    });
    for (const value of ["Infinity", "NaN", " ", "0x10", "-1", "4", ".1"])
      expect(validarPregunta(p, value)).toBeDefined();
    expect(validarPregunta(p, "2.5")).toBeUndefined();
  });
  test("fecha y hora reales", () => {
    expect(validarPregunta(pregunta("fecha"), "2026-02-30")).toBeDefined();
    expect(validarPregunta(pregunta("fecha"), "2028-02-29")).toBeUndefined();
    expect(validarPregunta(pregunta("hora"), "25:00")).toBeDefined();
    expect(validarPregunta(pregunta("hora"), "23:59")).toBeUndefined();
  });
  test("opciones válidas, multiselección y Otro con texto", () => {
    const p = pregunta("opcion_unica", {
      opciones: [
        { id: "a", texto: "A" },
        { id: "otro", texto: "Otro", esOtro: true },
      ],
    });
    expect(validarPregunta(p, "inventada")).toBeDefined();
    expect(validarPregunta(p, "otro:")).toBeDefined();
    expect(validarPregunta(p, "otro:Respuesta libre")).toBeUndefined();
    expect(
      validarPregunta({ ...p, tipo: "opcion_multiple" }, ["a", "a"]),
    ).toBeDefined();
    expect(
      validarPregunta({ ...p, tipo: "opcion_multiple" }, ["a", "otro:Texto"]),
    ).toBeUndefined();
  });
  test("archivos verifican tipo y tamaño", () => {
    const p = pregunta("carga_archivo", { tiposArchivo: "pdf" });
    const a = {
      nombre: "test.pdf",
      tipo: "application/pdf",
      bytes: 10,
      contenido: "data:application/pdf;base64,SG9sYQ==",
    };
    expect(validarPregunta(p, JSON.stringify(a))).toBeUndefined();
    expect(
      validarPregunta(p, JSON.stringify({ ...a, bytes: 3 * 1024 * 1024 })),
    ).toBeDefined();
    expect(
      validarPregunta({ ...p, tiposArchivo: "imagen" }, JSON.stringify(a)),
    ).toBeDefined();
    expect(validarPregunta(p, "not-json")).toBeDefined();
  });
});
describe("Lógica y secciones", () => {
  const regla = {
    preguntaOrigenId: "a",
    operador: "igual" as const,
    valor: "sí",
    accion: "mostrar" as const,
  };
  test("operadores, sin respuesta y opciones Otro", () => {
    expect(condicionCumplida(regla, {})).toBe(false);
    expect(
      condicionCumplida({ ...regla, valor: "otro" }, { a: "otro:Texto" }),
    ).toBe(true);
    expect(
      condicionCumplida(
        { ...regla, operador: "contiene", valor: "a" },
        { a: ["a", "b"] },
      ),
    ).toBe(true);
    expect(
      condicionCumplida(
        { ...regla, operador: "mayor_que", valor: "3" },
        { a: "4" },
      ),
    ).toBe(true);
    expect(
      condicionCumplida(
        { ...regla, operador: "menor_que", valor: "3" },
        { a: "2" },
      ),
    ).toBe(true);
    expect(
      condicionCumplida({ ...regla, operador: "no_igual" }, { a: "no" }),
    ).toBe(true);
  });
  test("ocultas no validan ni exportan respuestas anteriores; dependencias en cadena", () => {
    const f = form([
      pregunta("texto_corto", { id: "a" }),
      pregunta("texto_corto", { id: "b", orden: 1, logica: [regla] }),
      pregunta("texto_corto", {
        id: "c",
        orden: 2,
        logica: [{ ...regla, preguntaOrigenId: "b", valor: "antes" }],
      }),
    ]);
    expect(
      preguntasVisibles(f, { a: "no", b: "antes", c: "oculta" }).map(
        (p) => p.id,
      ),
    ).toEqual(["a"]);
    expect(
      respuestasEfectivas(f, { a: "no", b: "antes", c: "oculta" }),
    ).toEqual({ a: "no" });
    expect(validarRespuestas(f, { a: "no" })).toEqual({});
    expect(validarRespuestas(f, { a: "sí" }).b).toBeDefined();
  });
  test("rechaza ciclos y dependencias hacia páginas anteriores", () => {
    const f = form([
      pregunta("texto_corto", {
        id: "a",
        logica: [{ ...regla, preguntaOrigenId: "b" }],
      }),
      pregunta("texto_corto", { id: "b", orden: 1 }),
    ]);
    expect(validarFormulario(f).join(" ")).toContain("anterior");
  });
  test("salto excluye secciones omitidas y sus preguntas obligatorias", () => {
    const f = form([
      pregunta("texto_corto", { id: "a", seccionId: "s1" }),
      pregunta("descripcion", {
        id: "salto",
        orden: 1,
        seccionId: "s1",
        logica: [{ ...regla, accion: "ir_a_seccion", seccionDestinoId: "s3" }],
      }),
      pregunta("texto_corto", { id: "b", orden: 2, seccionId: "s2" }),
      pregunta("texto_corto", { id: "c", orden: 3, seccionId: "s3" }),
    ]);
    f.secciones = [
      { id: "s1", titulo: "Primera", orden: 0 },
      { id: "s2", titulo: "Segunda", orden: 1 },
      { id: "s3", titulo: "Tercera", orden: 2 },
    ];
    expect(validarFormulario(f)).toEqual([]);
    expect(destinoSeccion(f, { a: "sí" }, "s1")).toBe("s3");
    expect(validarRespuestas(f, { a: "sí", c: "final" })).toEqual({});
    expect(
      respuestasEfectivas(f, { a: "sí", b: "omitir", c: "final" }),
    ).toEqual({ a: "sí", c: "final" });
  });
  test("rangos, regex y saltos inválidos impiden guardar", () => {
    const f = form([
      pregunta("likert", {
        escalaMin: 5,
        escalaMax: 1,
        validacion: { patron: "[" },
      }),
    ]);
    expect(validarFormulario(f).length).toBe(2);
  });
  test("aleatorización no muta originales", () => {
    const items = [1, 2, 3];
    expect(mezclar(items, () => 0)).toEqual([2, 3, 1]);
    expect(items).toEqual([1, 2, 3]);
  });
});
describe("CRUD, envío y límites", () => {
  test("mocks incluyen todos los barrios y las siete dimensiones", () => {
    const s = useFormulariosStore.getState();
    expect(s.formularios[0].preguntas[0].opciones?.length).toBe(
      BARRIOS_CARTAGENA.length,
    );
    expect(
      s.formularios[1].preguntas.filter((p) => p.tipo === "escala_lineal")
        .length,
    ).toBe(7);
    for (const f of s.formularios) expect(validarFormulario(f)).toEqual([]);
  });
  test("CRUD conserva identificadores y no comparte referencias externas", () => {
    const s = useFormulariosStore.getState(),
      datos = form([pregunta()]);
    const f = s.crearFormulario(datos);
    datos.preguntas[0].texto = "Cambio externo";
    expect(f.preguntas[0].texto).toBe("Pregunta");
    s.actualizarFormulario(f.id, { id: "falso", titulo: "Actualizado" });
    expect(
      useFormulariosStore.getState().formularios.find((x) => x.id === f.id)
        ?.titulo,
    ).toBe("Actualizado");
    s.eliminarFormulario(f.id);
    expect(
      useFormulariosStore.getState().formularios.some((x) => x.id === f.id),
    ).toBe(false);
  });
  test("validación fallida no escribe ni incrementa; cupo y duplicados atómicos", () => {
    const s = useFormulariosStore.getState();
    const f = s.crearFormulario({
      ...form([pregunta()]),
      configuracion: {
        ...formularioVacio().configuracion,
        limiteRespuestas: 1,
      },
    });
    const before = useFormulariosStore.getState().respuestas.length;
    expect(() =>
      s.enviarRespuesta({ formularioId: f.id, sesionId: "x", respuestas: {} }),
    ).toThrow();
    expect(useFormulariosStore.getState().respuestas.length).toBe(before);
    s.enviarRespuesta({
      formularioId: f.id,
      sesionId: "x",
      respuestas: { p: "Bien" },
    });
    expect(() =>
      s.enviarRespuesta({
        formularioId: f.id,
        sesionId: "y",
        respuestas: { p: "Otra" },
      }),
    ).toThrow("límite");
    expect(
      useFormulariosStore.getState().formularios.find((x) => x.id === f.id)
        ?.respuestasCount,
    ).toBe(1);
  });
  test("edición reemplaza respuesta incluso con cupo lleno", () => {
    const s = useFormulariosStore.getState();
    const f = s.crearFormulario({
      ...form([pregunta()]),
      configuracion: {
        ...formularioVacio().configuracion,
        permitirEdicion: true,
        limiteRespuestas: 1,
      },
    });
    s.enviarRespuesta({
      formularioId: f.id,
      sesionId: "x",
      respuestas: { p: "Uno" },
    });
    s.enviarRespuesta({
      formularioId: f.id,
      sesionId: "x",
      respuestas: { p: "Dos" },
    });
    expect(
      useFormulariosStore
        .getState()
        .respuestas.filter((r) => r.formularioId === f.id),
    ).toHaveLength(1);
    expect(
      useFormulariosStore
        .getState()
        .respuestas.find((r) => r.formularioId === f.id)?.respuestas.p,
    ).toBe("Dos");
  });
  test("borrador, cierre y autenticación se comprueban al enviar", () => {
    const s = useFormulariosStore.getState();
    const f = s.crearFormulario({
      ...form([pregunta()]),
      configuracion: {
        ...formularioVacio().configuracion,
        requiereAutenticacion: true,
      },
    });
    expect(() =>
      s.enviarRespuesta({ formularioId: f.id, respuestas: { p: "Bien" } }),
    ).toThrow("sesión");
    s.actualizarFormulario(f.id, { estado: "cerrado" });
    expect(() =>
      s.enviarRespuesta({
        formularioId: f.id,
        respuestas: { p: "Bien" },
        autenticado: true,
      }),
    ).toThrow("cerrado");
    expect(motivoCierre({ ...f, estado: "borrador" })).toContain("publicado");
    expect(
      motivoCierre({
        ...f,
        configuracion: { ...f.configuracion, fechaCierre: "2020-01-01" },
      }),
    ).toContain("fecha");
  });
  test("preview no guarda respuestas", () => {
    const s = useFormulariosStore.getState();
    const n = s.respuestas.length;
    s.ponerPreview("editor", form([pregunta()]));
    expect(useFormulariosStore.getState().respuestas.length).toBe(n);
  });
});
describe("Analítica y CSV", () => {
  test("ceros, múltiples y promedio cero", () => {
    const f = form([
      pregunta("opcion_multiple", {
        opciones: [
          { id: "a", texto: "A" },
          { id: "b", texto: "B" },
        ],
      }),
      pregunta("numero", { id: "n", orden: 1 }),
    ]);
    expect(calcularAnalitica(f, []).totalRespuestas).toBe(0);
    const stats = calcularAnalitica(f, [
      {
        id: "r",
        formularioId: f.id,
        respuestas: { p: ["a", "b"], n: "0" },
        enviadoEn: "2026-01-01",
        enfoqueDiferencial: "Ley 1448/11",
      },
    ]);
    expect(stats.respuestasPorPregunta[0].conteo).toEqual({ A: 1, B: 1 });
    expect(stats.respuestasPorPregunta[1].promedio).toBe(0);
    expect(stats.porEnfoqueDiferencial["Ley 1448/11"]).toBe(1);
  });
  test("CSV incluye todas las respuestas, comillas, saltos y neutraliza fórmulas", () => {
    const f = form([pregunta()]);
    const csv = generarCsv(f, [
      {
        id: "r",
        formularioId: f.id,
        respuestas: { p: '=SUM(1,2)\n"texto"' },
        enviadoEn: "2026-01-01",
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=SUM(1,2)");
    expect(csv).toContain('""texto""');
  });
});

test("últimas respuestas ordenadas por envío, incluida edición", () => {
  const f = form([pregunta()]);
  const rows = Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    formularioId: f.id,
    respuestas: { p: String(i) },
    enviadoEn: `2026-10-0${i + 1}T00:00:00Z`,
  }));
  rows[0].enviadoEn = "2026-10-10T00:00:00Z";
  expect(calcularAnalitica(f, rows).respuestasPorPregunta[0].ultimas).toEqual([
    "0",
    "5",
    "4",
    "3",
    "2",
  ]);
});
