import { textoPunto } from "./ubicacion-geografica";
import type {
  AnaliticaFormulario,
  Formulario,
  PreguntaFormulario,
  RespuestaCiudadana,
} from "../models/formulario";
import { esInformativa, leerArchivo } from "./formulario-engine";
export function textoRespuesta(
  p: PreguntaFormulario,
  valor: string | string[] | undefined,
): string {
  if (valor === undefined) return "";
  if (Array.isArray(valor))
    return valor.map((v) => textoRespuesta(p, v)).join("; ");
  if (p.tipo === "ubicacion_geografica") return textoPunto(valor);
  if (p.tipo === "carga_archivo") return leerArchivo(valor)?.nombre ?? "";
  const opcion = p.opciones?.find(
    (o) => o.id === valor || (o.esOtro && valor.startsWith(o.id + ":")),
  );
  return opcion
    ? opcion.esOtro
      ? `${opcion.texto}: ${valor.split(":").slice(1).join(":")}`
      : opcion.texto
    : valor;
}
export function calcularAnalitica(
  form: Formulario,
  todas: RespuestaCiudadana[],
): AnaliticaFormulario {
  const rows = todas
    .filter((r) => r.formularioId === form.id)
    .sort((a, b) => Date.parse(a.enviadoEn) - Date.parse(b.enviadoEn));
  const enfoque: Record<string, number> = {};
  for (const r of rows) {
    const key = r.enfoqueDiferencial || "Ninguno";
    enfoque[key] = (enfoque[key] ?? 0) + 1;
  }
  return {
    formularioId: form.id,
    totalRespuestas: rows.length,
    porEnfoqueDiferencial: enfoque,
    respuestasPorPregunta: form.preguntas
      .filter((p) => !esInformativa(p))
      .map((p) => {
        const valores = rows
          .map((r) => r.respuestas[p.id])
          .filter(
            (v) =>
              v !== undefined && v !== "" && (!Array.isArray(v) || v.length),
          );
        const conteo: Record<string, number> = {};
        for (const valor of valores) {
          for (const v of Array.isArray(valor) ? valor : [valor]) {
            const texto = textoRespuesta(p, v);
            conteo[texto] = (conteo[texto] ?? 0) + 1;
          }
        }
        const nums = ["likert", "escala_lineal", "numero"].includes(p.tipo)
          ? valores
              .filter((v): v is string => typeof v === "string")
              .map(Number)
              .filter(Number.isFinite)
          : [];
        const promedio = nums.length
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : undefined;
        return {
          preguntaId: p.id,
          conteo,
          total: valores.length,
          promedio,
          promedioLikert: p.tipo === "likert" ? promedio : undefined,
          minimo: nums.length ? Math.min(...nums) : undefined,
          maximo: nums.length ? Math.max(...nums) : undefined,
          ultimas: valores
            .slice(-5)
            .reverse()
            .map((v) => textoRespuesta(p, v)),
        };
      }),
  };
}
/** Escape delimiters and prevent formula execution in spreadsheet consumers. */
export function celdaCsv(valor: string) {
  const seguro = /^[\s]*[=+@-]/.test(valor) ? "'" + valor : valor;
  return '"' + seguro.replaceAll('"', '""') + '"';
}
export function generarCsv(
  form: Formulario,
  todas: RespuestaCiudadana[],
): string {
  const preguntas = [...form.preguntas]
    .sort((a, b) => a.orden - b.orden)
    .filter((p) => !esInformativa(p));
  const rows = [
    [
      "ID",
      "Fecha de envío",
      "Enfoque diferencial",
      ...preguntas.map((p) => p.texto),
    ],
    ...todas
      .filter((r) => r.formularioId === form.id)
      .map((r) => [
        r.id,
        r.enviadoEn,
        r.enfoqueDiferencial ?? "Ninguno",
        ...preguntas.map((p) => textoRespuesta(p, r.respuestas[p.id])),
      ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(celdaCsv).join(",")).join("\r\n");
}
export function descargarCsv(
  form: Formulario,
  respuestas: RespuestaCiudadana[],
) {
  const blob = new Blob([generarCsv(form, respuestas)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `formulario-${form.id}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
