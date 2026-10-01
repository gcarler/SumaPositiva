import { TextoFormato } from "./texto-formato";
import { useId, useState, useRef } from "react";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { ChoiceGroup } from "@/shared/ui/choice-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { PreguntaFormulario } from "../models/formulario";
import {
  imagenSegura,
  leerArchivo,
  mezclar,
  esInformativa,
} from "../services/formulario-engine";

export function PreguntaRespuesta({
  pregunta: p,
  valor,
  error,
  cambiar,
  ocupado,
}: {
  pregunta: PreguntaFormulario;
  valor: string | string[] | undefined;
  error?: string;
  cambiar: (v: string | string[]) => void;
  ocupado: (v: boolean) => void;
}) {
  const id = useId();
  const archivoInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const [opciones] = useState(() =>
    p.opcionesAleatorias ? mezclar(p.opciones ?? []) : (p.opciones ?? []),
  );
  const text = typeof valor === "string" ? valor : "";
  const values = Array.isArray(valor) ? valor : [];
  const opcionOtro = opciones.find((o) => o.esOtro);
  const selected = text.split(":")[0];
  const otroSeleccionado =
    opcionOtro &&
    (selected === opcionOtro.id ||
      values.some(
        (x) => x === opcionOtro.id || x.startsWith(opcionOtro.id + ":"),
      ));
  const textoOtro = opcionOtro
    ? (p.tipo === "opcion_multiple"
        ? (values.find((x) => x.startsWith(opcionOtro.id + ":")) ?? "")
        : text
      )
        .split(":")
        .slice(1)
        .join(":")
    : "";
  const elegir = (v: string) =>
    cambiar(opciones.some((o) => o.id === v && o.esOtro) ? v + ":" : v);
  const archivo = text ? leerArchivo(text) : undefined;
  if (esInformativa(p))
    return (
      <section className="space-y-2 border-l-2 border-ember pl-4">
        {p.imagenUrl && imagenSegura(p.imagenUrl) && (
          <img
            src={p.imagenUrl}
            alt={`Ilustración: ${p.texto}`}
            className="max-h-48 max-w-full rounded-lg object-contain"
          />
        )}
        <h3 className="font-semibold">
          <TextoFormato texto={p.texto} />
        </h3>
        {p.descripcion && (
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            <TextoFormato texto={p.descripcion} />
          </p>
        )}
      </section>
    );
  const min = p.escalaMin ?? 1,
    max = p.escalaMax ?? 5;
  return (
    <div className="space-y-3 min-w-0">
      {p.imagenUrl && imagenSegura(p.imagenUrl) && (
        <img
          src={p.imagenUrl}
          alt={`Ilustración: ${p.texto}`}
          className="max-h-48 max-w-full rounded-lg object-contain"
        />
      )}
      <FormField
        id={id}
        label={p.texto}
        required={p.obligatoria || p.validacion?.obligatoria}
        description={p.descripcion}
        error={fileError ?? error}
      >
        {(control) => {
          switch (p.tipo) {
            case "texto_corto":
              return (
                <Input
                  {...control}
                  placeholder={p.placeholder}
                  value={text}
                  minLength={p.validacion?.minLongitud}
                  maxLength={p.validacion?.maxLongitud}
                  onChange={(e) => cambiar(e.target.value)}
                />
              );
            case "texto_largo":
              return (
                <Textarea
                  {...control}
                  placeholder={p.placeholder}
                  value={text}
                  minLength={p.validacion?.minLongitud}
                  maxLength={p.validacion?.maxLongitud}
                  onChange={(e) => cambiar(e.target.value)}
                />
              );
            case "opcion_unica":
              return (
                <ChoiceGroup
                  {...control}
                  label={p.texto}
                  options={opciones.map((o) => ({
                    value: o.id,
                    label: o.texto,
                  }))}
                  value={selected}
                  onValueChange={elegir}
                />
              );
            case "opcion_multiple":
              return (
                <div
                  role="group"
                  aria-label={p.texto}
                  aria-describedby={control["aria-describedby"]}
                  className="space-y-3"
                >
                  {opciones.map((o, i) => {
                    const v = values.find(
                      (x) => x === o.id || x.startsWith(o.id + ":"),
                    );
                    return (
                      <div key={o.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`${id}-opcion-${i}`}
                          aria-invalid={control["aria-invalid"]}
                          aria-describedby={control["aria-describedby"]}
                          checked={!!v}
                          onCheckedChange={(checked) =>
                            cambiar(
                              checked
                                ? [...values, o.esOtro ? o.id + ":" : o.id]
                                : values.filter((x) => x !== v),
                            )
                          }
                        />
                        <Label
                          className="min-w-0 text-sm leading-5"
                          htmlFor={`${id}-opcion-${i}`}
                        >
                          {o.texto}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              );
            case "lista_desplegable":
              return (
                <Select value={selected} onValueChange={elegir}>
                  <SelectTrigger {...control} className="w-full min-w-0">
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {opciones.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.texto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            case "likert":
              return (
                <div className="space-y-2">
                  <ChoiceGroup
                    {...control}
                    label={p.texto}
                    className="grid-cols-3 sm:grid-cols-5"
                    value={text}
                    onValueChange={cambiar}
                    options={Array.from({ length: max - min + 1 }, (_, i) => ({
                      value: String(min + i),
                      label: String(min + i),
                    }))}
                  />
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary">
                    <span>
                      {min}: {p.etiquetaMin}
                    </span>
                    <span>
                      {max}: {p.etiquetaMax}
                    </span>
                  </div>
                </div>
              );
            case "escala_lineal":
              return (
                <div className="space-y-2">
                  <Input
                    {...control}
                    type="range"
                    min={min}
                    max={max}
                    step={p.paso ?? 1}
                    value={text || String(min)}
                    onChange={(e) => cambiar(e.target.value)}
                  />
                  <p className="text-sm" aria-live="polite">
                    Valor: {text || "Sin respuesta"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cambiar(text || String(min))}
                  >
                    Usar valor mostrado ({text || min})
                  </Button>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary">
                    <span>
                      {min}: {p.etiquetaMin}
                    </span>
                    <span>
                      {max}: {p.etiquetaMax}
                    </span>
                  </div>
                </div>
              );
            case "numero":
              return (
                <Input
                  {...control}
                  type="number"
                  min={p.validacion?.minValor}
                  max={p.validacion?.maxValor}
                  step={p.paso ?? 1}
                  value={text}
                  onChange={(e) => cambiar(e.target.value)}
                />
              );
            case "fecha":
              return (
                <Input
                  {...control}
                  type="date"
                  value={text}
                  onChange={(e) => cambiar(e.target.value)}
                />
              );
            case "hora":
              return (
                <Input
                  {...control}
                  type="time"
                  value={text}
                  onChange={(e) => cambiar(e.target.value)}
                />
              );
            case "carga_archivo":
              return (
                <div className="space-y-2">
                  <Input
                    {...control}
                    ref={archivoInput}
                    type="file"
                    disabled={cargando}
                    accept={
                      p.tiposArchivo === "pdf"
                        ? "application/pdf"
                        : p.tiposArchivo === "cualquiera"
                          ? undefined
                          : "image/png,image/jpeg,image/webp,image/gif"
                    }
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      setFileError(undefined);
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        cambiar("archivo-invalido");
                        setFileError("El archivo supera 2 MB.");
                        e.target.value = "";
                        return;
                      }
                      if (
                        (p.tiposArchivo ?? "imagen") === "imagen" &&
                        !/^image\/(png|jpeg|webp|gif)$/.test(file.type)
                      ) {
                        cambiar("archivo-invalido");
                        setFileError(
                          "Selecciona una imagen PNG, JPEG, WebP o GIF.",
                        );
                        e.target.value = "";
                        return;
                      }
                      if (
                        p.tiposArchivo === "pdf" &&
                        file.type !== "application/pdf"
                      ) {
                        cambiar("archivo-invalido");
                        setFileError("Selecciona un PDF.");
                        e.target.value = "";
                        return;
                      }
                      setCargando(true);
                      ocupado(true);
                      try {
                        const contenido = await new Promise<string>(
                          (resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () =>
                              typeof reader.result === "string"
                                ? resolve(reader.result)
                                : reject(
                                    new Error("No se pudo leer el archivo."),
                                  );
                            reader.onerror = () =>
                              reject(new Error("No se pudo leer el archivo."));
                            reader.readAsDataURL(file);
                          },
                        );
                        cambiar(
                          JSON.stringify({
                            nombre: file.name,
                            tipo: file.type || "application/octet-stream",
                            bytes: file.size,
                            contenido,
                          }),
                        );
                      } catch (e) {
                        setFileError(
                          e instanceof Error
                            ? e.message
                            : "No se pudo leer el archivo.",
                        );
                      } finally {
                        setCargando(false);
                        ocupado(false);
                      }
                    }}
                  />
                  <p className="text-xs text-text-secondary">
                    Máximo 2 MB. Archivo de prueba, conservado solo en esta
                    sesión.
                  </p>
                  {fileError && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        cambiar("");
                        setFileError(undefined);
                      }}
                    >
                      Descartar archivo inválido
                    </Button>
                  )}
                  {cargando && <p role="status">Leyendo archivo…</p>}
                  {archivo && (
                    <>
                      <p className="break-words text-xs">{archivo.nombre}</p>
                      {/^image\/(png|jpeg|webp|gif)$/.test(archivo.tipo) && (
                        <img
                          src={archivo.contenido}
                          alt={`Vista previa de ${archivo.nombre}`}
                          className="max-h-40 max-w-full rounded-lg"
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          cambiar("");
                          if (archivoInput.current)
                            archivoInput.current.value = "";
                          setFileError(undefined);
                        }}
                      >
                        Quitar archivo
                      </Button>
                    </>
                  )}
                </div>
              );
          }
        }}
      </FormField>
      {otroSeleccionado && opcionOtro && (
        <FormField label={`Otro: ${p.texto}`} required>
          {(control) => (
            <Input
              {...control}
              value={textoOtro}
              onChange={(e) =>
                p.tipo === "opcion_multiple"
                  ? cambiar(
                      values.map((v) =>
                        v === opcionOtro.id || v.startsWith(opcionOtro.id + ":")
                          ? opcionOtro.id + ":" + e.target.value
                          : v,
                      ),
                    )
                  : cambiar(opcionOtro.id + ":" + e.target.value)
              }
            />
          )}
        </FormField>
      )}
    </div>
  );
}
