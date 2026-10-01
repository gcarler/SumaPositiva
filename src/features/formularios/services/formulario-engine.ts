import { leerPunto } from "./ubicacion-geografica";
import type {
  ArchivoRespuesta,
  Formulario,
  LogicaCondicional,
  PreguntaFormulario,
  ValoresRespuesta,
} from "../models/formulario";

export const esInformativa = (p: PreguntaFormulario) =>
  p.tipo === "seccion" || p.tipo === "descripcion";
export function imagenSegura(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
export function condicionCumplida(
  regla: LogicaCondicional,
  respuestas: ValoresRespuesta,
): boolean {
  const dato = respuestas[regla.preguntaOrigenId];
  if (
    dato === undefined ||
    dato === "" ||
    (Array.isArray(dato) && !dato.length)
  )
    return false;
  const valores = Array.isArray(dato) ? dato : [dato];
  const iguales = valores.some(
    (v) => v === regla.valor || v.startsWith(regla.valor + ":"),
  );
  switch (regla.operador) {
    case "igual":
      return iguales;
    case "no_igual":
      return !iguales;
    case "contiene":
      return valores.some((v) => v.includes(regla.valor));
    case "mayor_que":
      return (
        !Array.isArray(dato) &&
        Number.isFinite(Number(dato)) &&
        Number(dato) > Number(regla.valor)
      );
    case "menor_que":
      return (
        !Array.isArray(dato) &&
        Number.isFinite(Number(dato)) &&
        Number(dato) < Number(regla.valor)
      );
  }
}
/** Evaluate in dependency order; editor rejects forward/cyclic dependencies. */
export function preguntasVisibles(
  form: Formulario,
  respuestas: ValoresRespuesta,
): PreguntaFormulario[] {
  const ordenadas = [...form.preguntas].sort((a, b) => a.orden - b.orden);
  const visibles: PreguntaFormulario[] = [];
  const efectivas: ValoresRespuesta = {};
  for (const p of ordenadas) {
    const reglas = form.preguntas.flatMap((q) =>
      (q.logica ?? []).filter((r) => (r.preguntaDestinoId ?? q.id) === p.id),
    );
    const mostrar = reglas.filter((r) => r.accion === "mostrar");
    const ocultar = reglas.filter((r) => r.accion === "ocultar");
    if (
      mostrar.every((r) => condicionCumplida(r, efectivas)) &&
      !ocultar.some((r) => condicionCumplida(r, efectivas))
    ) {
      visibles.push(p);
      if (respuestas[p.id] !== undefined) efectivas[p.id] = respuestas[p.id];
    }
  }
  return visibles;
}
export function destinoSeccion(
  form: Formulario,
  respuestas: ValoresRespuesta,
  seccionId: string | undefined,
) {
  const visibles = preguntasVisibles(form, respuestas);
  const efectivas = Object.fromEntries(
    visibles.map((p) => [p.id, respuestas[p.id]]),
  );
  for (const p of visibles.filter((p) => p.seccionId === seccionId)) {
    const r = p.logica?.find(
      (r) => r.accion === "ir_a_seccion" && condicionCumplida(r, efectivas),
    );
    if (r?.seccionDestinoId) return r.seccionDestinoId;
  }
}
export function respuestasEfectivas(
  form: Formulario,
  respuestas: ValoresRespuesta,
): ValoresRespuesta {
  const visibles = preguntasVisibles(form, respuestas);
  const sections = [...form.secciones].sort((a, b) => a.orden - b.orden);
  const accesibles = new Set<string | undefined>([undefined]);
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    accesibles.add(s.id);
    const destino = destinoSeccion(form, respuestas, s.id);
    if (destino) {
      const next = sections.findIndex((s) => s.id === destino);
      if (next > i) i = next - 1;
    }
  }
  return Object.fromEntries(
    visibles
      .filter(
        (p) =>
          !esInformativa(p) &&
          accesibles.has(p.seccionId) &&
          respuestas[p.id] !== undefined,
      )
      .map((p) => [p.id, respuestas[p.id]]),
  );
}
export function validarPregunta(
  p: PreguntaFormulario,
  valor: string | string[] | undefined,
): string | undefined {
  if (esInformativa(p)) return;
  const v = p.validacion ?? {};
  const vacio =
    valor === undefined ||
    valor === "" ||
    (Array.isArray(valor) && !valor.length);
  const error = (mensaje: string) => v.mensajeError || mensaje;
  if (vacio)
    return p.obligatoria || v.obligatoria
      ? error("Esta pregunta es obligatoria.")
      : undefined;
  if (p.tipo === "opcion_multiple") {
    if (
      !Array.isArray(valor) ||
      valor.some(
        (x) =>
          !p.opciones?.some(
            (o) => o.id === x || (o.esOtro && x.startsWith(o.id + ":")),
          ),
      )
    )
      return error("Selecciona opciones válidas.");
    if (new Set(valor).size !== valor.length)
      return error("No repitas opciones.");
    if (
      valor.some(
        (x) => x.includes(":") && !x.split(":").slice(1).join(":").trim(),
      )
    )
      return error("Escribe el texto de Otro.");
    return;
  }
  if (typeof valor !== "string")
    return error("El valor no corresponde al tipo de pregunta.");
  if (["opcion_unica", "lista_desplegable"].includes(p.tipo)) {
    if (
      !p.opciones?.some(
        (o) => o.id === valor || (o.esOtro && valor.startsWith(o.id + ":")),
      )
    )
      return error("Selecciona una opción válida.");
    if (
      p.opciones?.some((o) => o.esOtro && valor === o.id) ||
      (valor.includes(":") && !valor.split(":").slice(1).join(":").trim())
    )
      return error("Escribe el texto de Otro.");
  }
  if (["texto_corto", "texto_largo"].includes(p.tipo)) {
    if (!valor.trim() && (p.obligatoria || v.obligatoria))
      return error("Esta pregunta es obligatoria.");
    if (v.minLongitud !== undefined && valor.length < v.minLongitud)
      return error(`Mínimo ${v.minLongitud} caracteres.`);
    if (v.maxLongitud !== undefined && valor.length > v.maxLongitud)
      return error(`Máximo ${v.maxLongitud} caracteres.`);
    if (v.patron) {
      try {
        if (!new RegExp(v.patron).test(valor))
          return error("El texto no cumple el patrón indicado.");
      } catch {
        return error("El patrón del formulario no es válido.");
      }
    }
  }
  if (["numero", "likert", "escala_lineal"].includes(p.tipo)) {
    const n = Number(valor);
    if (
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(valor) ||
      !Number.isFinite(n)
    )
      return error("Introduce un número válido.");
    const min = p.tipo === "numero" ? v.minValor : (p.escalaMin ?? 1);
    const max = p.tipo === "numero" ? v.maxValor : (p.escalaMax ?? 5);
    if (min !== undefined && n < min) return error(`El mínimo es ${min}.`);
    if (max !== undefined && n > max) return error(`El máximo es ${max}.`);
    const paso = p.paso ?? 1;
    const desplazamiento = (n - (min ?? 0)) * 1e9;
    const pasoEscalado = paso * 1e9;
    if (
      !(
        Math.abs(
          desplazamiento -
            Math.round(desplazamiento / pasoEscalado) * pasoEscalado,
        ) < 1
      )
    )
      return error(`Usa incrementos de ${paso}.`);
  }
  if (p.tipo === "fecha") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
      !Number.isFinite(Date.parse(valor)) ||
      new Date(valor).toISOString().slice(0, 10) !== valor
    )
      return error("Introduce una fecha válida.");
  }
  if (p.tipo === "hora" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor))
    return error("Introduce una hora válida.");
  if (p.tipo === "ubicacion_geografica" && !leerPunto(valor))
    return error(
      "Selecciona un punto válido o introduce latitud y longitud válidas.",
    );
  if (p.tipo === "carga_archivo") {
    const a = leerArchivo(valor);
    if (!a) return error("Selecciona un archivo válido.");
    if (a.bytes > 2 * 1024 * 1024) return error("El archivo supera 2 MB.");
    if (p.tiposArchivo === "pdf" && a.tipo !== "application/pdf")
      return error("Selecciona un PDF.");
    if (
      (p.tiposArchivo ?? "imagen") === "imagen" &&
      !/^image\/(png|jpeg|webp|gif)$/.test(a.tipo)
    )
      return error("Selecciona una imagen PNG, JPEG, WebP o GIF.");
  }
}
export function leerArchivo(valor: string): ArchivoRespuesta | undefined {
  try {
    const a: unknown = JSON.parse(valor);
    if (
      typeof a === "object" &&
      a !== null &&
      "nombre" in a &&
      typeof a.nombre === "string" &&
      "tipo" in a &&
      typeof a.tipo === "string" &&
      "bytes" in a &&
      typeof a.bytes === "number" &&
      a.bytes > 0 &&
      "contenido" in a &&
      typeof a.contenido === "string" &&
      a.contenido.startsWith(`data:${a.tipo};base64,`)
    )
      return {
        nombre: a.nombre,
        tipo: a.tipo,
        bytes: a.bytes,
        contenido: a.contenido,
      };
  } catch {
    return;
  }
}
export function validarRespuestas(
  form: Formulario,
  respuestas: ValoresRespuesta,
): Record<string, string> {
  const efectivas = respuestasEfectivas(form, respuestas);
  // Determine reachable sections even when required questions are empty.
  const reach = respuestasEfectivas(
    form,
    Object.fromEntries(
      form.preguntas.map((p) => [p.id, respuestas[p.id] ?? ""]),
    ),
  );
  return Object.fromEntries(
    preguntasVisibles(form, respuestas)
      .filter((p) => p.id in reach)
      .flatMap((p) => {
        const error = validarPregunta(p, efectivas[p.id]);
        return error ? [[p.id, error]] : [];
      }),
  );
}
export function validarFormulario(form: Formulario): string[] {
  const errors: string[] = [];
  if (!form.titulo.trim()) errors.push("Escribe el título del formulario.");
  if (!form.preguntas.some((p) => !esInformativa(p)))
    errors.push("Añade al menos una pregunta de respuesta.");
  const ids = new Set(form.preguntas.map((p) => p.id));
  const sections = new Set(form.secciones.map((s) => s.id));
  if (
    ids.size !== form.preguntas.length ||
    sections.size !== form.secciones.length
  )
    errors.push("Los identificadores deben ser únicos.");
  if (form.secciones.some((s) => !s.titulo.trim()))
    errors.push("Todas las secciones necesitan título.");
  for (const p of form.preguntas) {
    const name = p.texto || "Pregunta sin título";
    if (!p.texto.trim())
      errors.push("Todas las preguntas necesitan enunciado.");
    if (p.seccionId && !sections.has(p.seccionId))
      errors.push(`${name}: sección inexistente.`);
    if (p.imagenUrl && !imagenSegura(p.imagenUrl))
      errors.push(`${name}: la imagen necesita una URL HTTP(S).`);
    if (
      ["opcion_unica", "opcion_multiple", "lista_desplegable"].includes(
        p.tipo,
      ) &&
      (!p.opciones?.length ||
        p.opciones.some((o) => !o.texto.trim()) ||
        new Set(p.opciones.map((o) => o.id)).size !== p.opciones.length)
    )
      errors.push(`${name}: completa las opciones.`);
    const v = p.validacion ?? {};
    if (
      v.minLongitud !== undefined &&
      v.maxLongitud !== undefined &&
      v.minLongitud > v.maxLongitud
    )
      errors.push(`${name}: longitud mínima mayor al máximo.`);
    if (
      [v.minLongitud, v.maxLongitud].some(
        (x) => x !== undefined && (!Number.isInteger(x) || x < 0),
      )
    )
      errors.push(`${name}: las longitudes deben ser enteros positivos.`);
    if (
      v.minValor !== undefined &&
      v.maxValor !== undefined &&
      v.minValor > v.maxValor
    )
      errors.push(`${name}: mínimo mayor al máximo.`);
    if (p.paso !== undefined && (!Number.isFinite(p.paso) || p.paso <= 0))
      errors.push(`${name}: paso inválido.`);
    if (v.patron) {
      try {
        new RegExp(v.patron);
      } catch {
        errors.push(`${name}: patrón regular inválido.`);
      }
    }
    if (
      ["likert", "escala_lineal"].includes(p.tipo) &&
      (!Number.isInteger(p.escalaMin ?? 1) ||
        !Number.isInteger(p.escalaMax ?? 5) ||
        (p.escalaMin ?? 1) >= (p.escalaMax ?? 5) ||
        (p.escalaMax ?? 5) - (p.escalaMin ?? 1) > 100)
    )
      errors.push(`${name}: escala inválida (máximo 100 intervalos).`);
    for (const r of p.logica ?? []) {
      const origen = form.preguntas.find((x) => x.id === r.preguntaOrigenId);
      const destino = r.preguntaDestinoId
        ? form.preguntas.find((q) => q.id === r.preguntaDestinoId)
        : p;
      const indiceSeccion = (q: PreguntaFormulario) =>
        q.seccionId
          ? (form.secciones.find((s) => s.id === q.seccionId)?.orden ??
            Infinity)
          : -1;
      if (
        !destino ||
        !origen ||
        esInformativa(origen) ||
        origen.orden >= destino.orden ||
        indiceSeccion(origen) > indiceSeccion(destino)
      )
        errors.push(
          `${name}: la lógica debe depender de una pregunta anterior.`,
        );
      if (!r.valor.trim())
        errors.push(`${name}: la condición necesita un valor.`);
      if (r.accion === "ir_a_seccion") {
        const from = form.secciones.find((s) => s.id === p.seccionId);
        const to = form.secciones.find((s) => s.id === r.seccionDestinoId);
        if (!from || !to || to.orden <= from.orden)
          errors.push(`${name}: el salto debe ir a una sección posterior.`);
      }
    }
  }
  const c = form.configuracion;
  if (!c.mensajeConfirmacion.trim())
    errors.push("Escribe el mensaje de confirmación.");
  if (
    c.limiteRespuestas !== undefined &&
    (!Number.isInteger(c.limiteRespuestas) || c.limiteRespuestas < 1)
  )
    errors.push("El límite debe ser un entero mayor que cero.");
  if (c.fechaCierre && !Number.isFinite(Date.parse(c.fechaCierre)))
    errors.push("Fecha de cierre inválida.");
  return errors;
}
export function motivoCierre(form: Formulario, ahora = Date.now()) {
  if (form.estado !== "activo")
    return form.estado === "borrador"
      ? "Este formulario aún no está publicado."
      : "Este formulario está cerrado.";
  if (
    form.configuracion.fechaCierre &&
    Date.parse(form.configuracion.fechaCierre) <= ahora
  )
    return "Se alcanzó la fecha de cierre.";
  if (
    form.configuracion.limiteRespuestas !== undefined &&
    form.respuestasCount >= form.configuracion.limiteRespuestas
  )
    return "Se alcanzó el límite de respuestas.";
}
export function mezclar<T>(
  items: T[],
  random: () => number = Math.random,
): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
