"use client";
import { useState, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { FormField } from "@/shared/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { PreguntaRespuesta } from "./pregunta-respuesta";
import type { Formulario, ValoresRespuesta } from "../models/formulario";
import {
  destinoSeccion,
  esInformativa,
  mezclar,
  preguntasVisibles,
  validarPregunta,
  validarRespuestas,
  respuestasEfectivas,
} from "../services/formulario-engine";

export function FormularioRuntime({
  form,
  inicial = {},
  enviar,
  preview = false,
}: {
  form: Formulario;
  inicial?: ValoresRespuesta;
  preview?: boolean;
  enviar: (respuestas: ValoresRespuesta, enfoque: string) => Promise<void>;
}) {
  const [respuestas, setRespuestas] = useState<ValoresRespuesta>(() =>
    structuredClone(inicial),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(0);
  const [historial, setHistorial] = useState<number[]>([]);
  const [ocupados, setOcupados] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enfoque, setEnfoque] = useState("Ninguno");
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [orden] = useState(() => mezclar(form.preguntas).map((p) => p.id));
  const sections = [...form.secciones].sort((a, b) => a.orden - b.orden);
  const paginas = [
    ...(form.preguntas.some((p) => !p.seccionId) || !sections.length
      ? [{ id: undefined, titulo: "Preguntas", descripcion: undefined }]
      : []),
    ...sections,
  ];
  const actual = paginas[pagina] ?? paginas[0];
  const visibles = preguntasVisibles(form, respuestas);
  const porPagina = visibles
    .filter((p) => p.seccionId === actual?.id)
    .sort((a, b) =>
      form.configuracion.ordenAleatorio
        ? orden.indexOf(a.id) - orden.indexOf(b.id)
        : a.orden - b.orden,
    );
  const efectivas = respuestasEfectivas(
    form,
    Object.fromEntries(
      form.preguntas.map((p) => [p.id, respuestas[p.id] ?? ""]),
    ),
  );
  const requeridas = visibles.filter(
    (p) => !esInformativa(p) && p.id in efectivas,
  );
  const respondidas = requeridas.filter((p) => {
    const v = respuestas[p.id];
    return (
      v !== undefined &&
      v !== "" &&
      (!Array.isArray(v) || v.length > 0) &&
      !validarPregunta(p, v)
    );
  }).length;
  const porcentaje = requeridas.length
    ? Math.round((respondidas / requeridas.length) * 100)
    : 0;
  const cambiar = (id: string, valor: string | string[]) => {
    const siguientes = { ...respuestas, [id]: valor };
    setRespuestas(siguientes);
    setErrores((prev) => {
      const next = { ...prev };
      for (const p of preguntasVisibles(form, siguientes)) {
        const e = validarPregunta(p, siguientes[p.id]);
        if (p.id === id || p.id in prev) {
          if (e) next[p.id] = e;
          else delete next[p.id];
        }
      }
      return next;
    });
  };
  const validarPagina = () => {
    const errors = validarRespuestas(form, respuestas);
    setErrores(errors);
    return !porPagina.some((p) => errors[p.id]);
  };
  const avanzar = () => {
    if (!validarPagina()) return;
    const id = destinoSeccion(form, respuestas, actual?.id);
    const siguiente = id ? paginas.findIndex((s) => s.id === id) : pagina + 1;
    setHistorial((h) => [...h, pagina]);
    setPagina(siguiente);
    requestAnimationFrame(() => tituloRef.current?.focus());
  };
  const confirmar = async () => {
    const errors = validarRespuestas(form, respuestas);
    setErrores(errors);
    setErrorEnvio("");
    const primera = form.preguntas.find((p) => errors[p.id]);
    if (primera) {
      setPagina(
        Math.max(
          0,
          paginas.findIndex((s) => s.id === primera.seccionId),
        ),
      );
      requestAnimationFrame(() => tituloRef.current?.focus());
      return;
    }
    setEnviando(true);
    try {
      if (!preview)
        await enviar(respuestasEfectivas(form, respuestas), enfoque);
      setEnviado(true);
    } catch (e) {
      setErrorEnvio(
        e instanceof Error
          ? e.message
          : "No se pudo enviar. Tus respuestas se conservan.",
      );
    } finally {
      setEnviando(false);
    }
  };
  if (enviado)
    return (
      <div
        role="status"
        className="space-y-4 rounded-xl border border-border bg-surface-1 p-5"
      >
        <h3 className="font-semibold">
          {preview ? "Simulación completada" : "Respuesta de prueba recibida"}
        </h3>
        <p className="whitespace-pre-wrap text-sm">
          {form.configuracion.mensajeConfirmacion}
        </p>
        {preview && (
          <p className="text-xs text-text-secondary">
            La vista previa no registra respuestas.
          </p>
        )}
      </div>
    );
  return (
    <div className="space-y-6">
      {preview && (
        <p className="text-xs text-text-secondary">
          Vista previa interactiva. No se guardará ninguna respuesta.
        </p>
      )}
      {form.configuracion.mostrarBarraProgreso && (
        <div className="space-y-2">
          <p className="text-xs text-text-secondary">
            {respondidas} de {requeridas.length} preguntas respondidas ·{" "}
            {porcentaje}%
          </p>
          <Progress aria-label="Progreso del formulario" value={porcentaje} />
        </div>
      )}
      <section className="space-y-2">
        <h3
          ref={tituloRef}
          tabIndex={-1}
          className="text-base font-semibold focus-visible:outline-2 focus-visible:outline-ring"
        >
          {actual?.titulo}
        </h3>
        {actual?.descripcion && (
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            {actual.descripcion}
          </p>
        )}
        <p className="text-xs text-text-secondary">
          Sección {pagina + 1} de {paginas.length}
        </p>
      </section>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pagina < paginas.length - 1) avanzar();
          else void confirmar();
        }}
        className="space-y-6"
      >
        {porPagina.map((p) => (
          <div
            key={p.id}
            className="min-w-0 rounded-xl border border-border bg-surface-1 p-4"
          >
            <PreguntaRespuesta
              pregunta={p}
              valor={respuestas[p.id]}
              error={errores[p.id]}
              cambiar={(v) => cambiar(p.id, v)}
              ocupado={(v) => setOcupados((o) => ({ ...o, [p.id]: v }))}
            />
          </div>
        ))}
        {!porPagina.length && (
          <p className="text-sm text-text-secondary">
            Esta sección no tiene preguntas visibles.
          </p>
        )}
        {pagina === paginas.length - 1 && (
          <FormField label="Población diferencial (opcional)">
            {(control) => (
              <Select value={enfoque} onValueChange={setEnfoque}>
                <SelectTrigger {...control} className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Ninguno",
                    "Ley 1448/11",
                    "Ley 1618/13",
                    "Población étnica",
                    "Otra",
                  ].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
        {errorEnvio && (
          <p role="alert" className="text-sm text-danger">
            {errorEnvio}
          </p>
        )}
        {Object.keys(errores).length > 0 && (
          <p role="alert" className="text-sm text-danger">
            Revisa las preguntas indicadas antes de continuar.
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="outline"
            disabled={!historial.length}
            onClick={() => {
              setPagina(historial[historial.length - 1]);
              setHistorial((h) => h.slice(0, -1));
              requestAnimationFrame(() => tituloRef.current?.focus());
            }}
          >
            Anterior
          </Button>
          <Button
            type="submit"
            loading={enviando}
            disabled={Object.values(ocupados).some(Boolean)}
          >
            {pagina < paginas.length - 1
              ? "Siguiente"
              : preview
                ? "Simular envío"
                : "Enviar respuestas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
