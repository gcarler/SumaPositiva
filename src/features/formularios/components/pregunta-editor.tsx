import { Button } from "@/shared/ui/button";
import { ArrowUp, ArrowDown, Trash2, Copy } from "lucide-react";
import { TextoEditor, OpcionEditor, MarcaEditor } from "./editor-fields";
import {
  TIPOS_PREGUNTA,
  type PreguntaFormulario,
  type Formulario,
  type TipoPregunta,
  type LogicaCondicional,
} from "../models/formulario";
import { esInformativa } from "../services/formulario-engine";

export function PreguntaEditor({
  pregunta: p,
  form,
  index,
  cambiar,
  mover,
  eliminar,
  duplicar,
}: {
  pregunta: PreguntaFormulario;
  form: Formulario;
  index: number;
  cambiar: (p: PreguntaFormulario) => void;
  mover: (direccion: number) => void;
  eliminar: () => void;
  duplicar: () => void;
}) {
  const patch = (changes: Partial<PreguntaFormulario>) =>
    cambiar({ ...p, ...changes });
  const numero = (value: string) => (value === "" ? undefined : Number(value));
  const valida = (
    key: keyof NonNullable<PreguntaFormulario["validacion"]>,
    value: string | number | undefined,
  ) => patch({ validacion: { ...p.validacion, [key]: value } });
  const opciones = [
    "opcion_unica",
    "opcion_multiple",
    "lista_desplegable",
  ].includes(p.tipo);
  const mismaSeccion = form.preguntas
    .filter((q) => q.seccionId === p.seccionId)
    .sort((a, b) => a.orden - b.orden);
  const posicion = mismaSeccion.findIndex((q) => q.id === p.id);
  return (
    <article className="space-y-4 rounded-xl border border-border bg-surface-1 p-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pregunta {index + 1}</h3>
        <div className="flex flex-wrap gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Subir pregunta ${index + 1}`}
            disabled={posicion === 0}
            onClick={() => mover(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Bajar pregunta ${index + 1}`}
            disabled={posicion === mismaSeccion.length - 1}
            onClick={() => mover(1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Duplicar pregunta ${index + 1}`}
            onClick={duplicar}
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Eliminar pregunta ${index + 1}`}
            onClick={eliminar}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      {esInformativa(p) && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => patch({ texto: `**${p.texto}**` })}
          >
            Negrita
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => patch({ texto: `*${p.texto}*` })}
          >
            Cursiva
          </Button>
          <p className="w-full text-xs text-text-secondary">
            Texto enriquecido seguro: **negrita**, *cursiva* y saltos de línea;
            sin HTML.
          </p>
        </div>
      )}
      <TextoEditor
        label={`Enunciado (${index + 1})`}
        value={p.texto}
        onChange={(texto) => patch({ texto })}
        multiline={esInformativa(p)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <OpcionEditor
          label={`Tipo (${index + 1})`}
          value={p.tipo}
          opciones={Object.entries(TIPOS_PREGUNTA).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(tipo) =>
            patch({
              tipo: tipo as TipoPregunta,
              opciones: p.opciones ?? [
                { id: crypto.randomUUID(), texto: "Opción 1" },
                { id: crypto.randomUUID(), texto: "Opción 2" },
              ],
              escalaMin: p.escalaMin ?? 1,
              escalaMax: p.escalaMax ?? 5,
            })
          }
        />
        <OpcionEditor
          label={`Sección (${index + 1})`}
          value={p.seccionId ?? "sin"}
          opciones={[
            { value: "sin", label: "Sin sección" },
            ...form.secciones.map((s) => ({
              value: s.id,
              label: s.titulo || "Sección sin título",
            })),
          ]}
          onChange={(s) => patch({ seccionId: s === "sin" ? undefined : s })}
        />
      </div>
      <TextoEditor
        label={`Ayuda (${index + 1})`}
        value={p.descripcion}
        onChange={(descripcion) => patch({ descripcion })}
        multiline
      />
      <TextoEditor
        label={`URL de imagen (${index + 1})`}
        value={p.imagenUrl}
        onChange={(imagenUrl) => patch({ imagenUrl })}
        type="url"
      />
      {!esInformativa(p) && (
        <div className="flex flex-wrap gap-4">
          <MarcaEditor
            label={`Requerida (${index + 1})`}
            value={p.obligatoria}
            onChange={(obligatoria) => patch({ obligatoria })}
          />
          <MarcaEditor
            label={`Enfoque diferencial (${index + 1})`}
            value={!!p.enfoqueDiferencial}
            onChange={(enfoqueDiferencial) => patch({ enfoqueDiferencial })}
          />
        </div>
      )}
      {p.tipo === "ubicacion_geografica" && (
        <p className="text-sm text-text-secondary">
          La persona puede marcar un punto en el mapa de Cartagena, introducir
          coordenadas o usar su ubicación. El punto se vincula a las demás
          respuestas.
        </p>
      )}
      {["texto_corto", "texto_largo"].includes(p.tipo) && (
        <>
          <TextoEditor
            label={`Placeholder (${index + 1})`}
            value={p.placeholder}
            onChange={(placeholder) => patch({ placeholder })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextoEditor
              label={`Longitud mínima (${index + 1})`}
              type="number"
              value={p.validacion?.minLongitud}
              onChange={(v) => valida("minLongitud", numero(v))}
            />
            <TextoEditor
              label={`Longitud máxima (${index + 1})`}
              type="number"
              value={p.validacion?.maxLongitud}
              onChange={(v) => valida("maxLongitud", numero(v))}
            />
          </div>
          <TextoEditor
            label={`Patrón regular (${index + 1})`}
            value={p.validacion?.patron}
            onChange={(v) => valida("patron", v)}
          />
        </>
      )}
      {opciones && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            Opciones de pregunta {index + 1}
          </legend>
          {p.opciones?.map((o, i) => (
            <div key={o.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextoEditor
                  label={`Opción ${i + 1} de pregunta ${index + 1}`}
                  value={o.texto}
                  onChange={(texto) =>
                    patch({
                      opciones: p.opciones?.map((x) =>
                        x.id === o.id ? { ...x, texto } : x,
                      ),
                    })
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar opción ${i + 1} de pregunta ${index + 1}`}
                onClick={() =>
                  patch({ opciones: p.opciones?.filter((x) => x.id !== o.id) })
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patch({
                  opciones: [
                    ...(p.opciones ?? []),
                    { id: crypto.randomUUID(), texto: "" },
                  ],
                })
              }
            >
              Añadir opción
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={p.opciones?.some((o) => o.esOtro)}
              onClick={() =>
                patch({
                  opciones: [
                    ...(p.opciones ?? []),
                    { id: crypto.randomUUID(), texto: "Otro", esOtro: true },
                  ],
                })
              }
            >
              Añadir Otro
            </Button>
          </div>
          <MarcaEditor
            label={`Orden aleatorio de opciones (${index + 1})`}
            value={!!p.opcionesAleatorias}
            onChange={(opcionesAleatorias) => patch({ opcionesAleatorias })}
          />
        </fieldset>
      )}
      {["numero", "likert", "escala_lineal"].includes(p.tipo) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextoEditor
            label={`Mínimo (${index + 1})`}
            type="number"
            value={
              p.tipo === "numero" ? p.validacion?.minValor : (p.escalaMin ?? 1)
            }
            onChange={(v) =>
              p.tipo === "numero"
                ? valida("minValor", numero(v))
                : patch({ escalaMin: numero(v) })
            }
          />
          <TextoEditor
            label={`Máximo (${index + 1})`}
            type="number"
            value={
              p.tipo === "numero" ? p.validacion?.maxValor : (p.escalaMax ?? 5)
            }
            onChange={(v) =>
              p.tipo === "numero"
                ? valida("maxValor", numero(v))
                : patch({ escalaMax: numero(v) })
            }
          />
          {p.tipo !== "likert" && (
            <TextoEditor
              label={`Paso (${index + 1})`}
              type="number"
              value={p.paso ?? 1}
              onChange={(v) => patch({ paso: numero(v) })}
            />
          )}
          {p.tipo !== "numero" && (
            <>
              <TextoEditor
                label={`Etiqueta mínima (${index + 1})`}
                value={p.etiquetaMin}
                onChange={(etiquetaMin) => patch({ etiquetaMin })}
              />
              <TextoEditor
                label={`Etiqueta máxima (${index + 1})`}
                value={p.etiquetaMax}
                onChange={(etiquetaMax) => patch({ etiquetaMax })}
              />
            </>
          )}
        </div>
      )}
      {p.tipo === "carga_archivo" && (
        <OpcionEditor
          label={`Tipos de archivo (${index + 1})`}
          value={p.tiposArchivo ?? "imagen"}
          opciones={[
            { value: "imagen", label: "Imagen (PNG, JPEG, WebP, GIF)" },
            { value: "pdf", label: "PDF" },
            { value: "cualquiera", label: "Cualquiera" },
          ]}
          onChange={(t) =>
            patch({ tiposArchivo: t as PreguntaFormulario["tiposArchivo"] })
          }
        />
      )}
      {!esInformativa(p) && (
        <TextoEditor
          label={`Mensaje de error (${index + 1})`}
          value={p.validacion?.mensajeError}
          onChange={(v) => valida("mensajeError", v)}
        />
      )}
      <details className="space-y-3">
        <summary className="cursor-pointer text-sm font-medium">
          Lógica de pregunta {index + 1}
        </summary>
        <p className="text-xs text-text-secondary">
          Usa preguntas anteriores. Mostrar requiere todas las condiciones;
          ocultar se aplica si alguna coincide. Los saltos solo van a secciones
          posteriores.
        </p>
        {(p.logica ?? []).map((r, i) => {
          const update = (changes: Partial<LogicaCondicional>) =>
            patch({
              logica: p.logica?.map((x, j) =>
                j === i ? { ...x, ...changes } : x,
              ),
            });
          return (
            <fieldset
              key={i}
              className="space-y-3 rounded-lg border border-border p-3"
            >
              <legend className="text-xs">Regla {i + 1}</legend>
              <OpcionEditor
                label={`Origen de regla ${i + 1}, pregunta ${index + 1}`}
                value={r.preguntaOrigenId || "sin"}
                opciones={[
                  { value: "sin", label: "Selecciona una pregunta" },
                  ...form.preguntas
                    .filter((q) => q.orden < p.orden && !esInformativa(q))
                    .map((q) => ({
                      value: q.id,
                      label: q.texto || "Sin título",
                    })),
                ]}
                onChange={(id) =>
                  update({ preguntaOrigenId: id === "sin" ? "" : id })
                }
              />
              <OpcionEditor
                label={`Acción de regla ${i + 1}, pregunta ${index + 1}`}
                value={r.accion}
                opciones={[
                  { value: "mostrar", label: "Mostrar esta pregunta" },
                  { value: "ocultar", label: "Ocultar esta pregunta" },
                  { value: "ir_a_seccion", label: "Ir a sección" },
                ]}
                onChange={(accion) =>
                  update({ accion: accion as LogicaCondicional["accion"] })
                }
              />
              <OpcionEditor
                label={`Operador de regla ${i + 1}, pregunta ${index + 1}`}
                value={r.operador}
                opciones={[
                  { value: "igual", label: "Igual" },
                  { value: "no_igual", label: "No igual" },
                  { value: "contiene", label: "Contiene" },
                  { value: "mayor_que", label: "Mayor que" },
                  { value: "menor_que", label: "Menor que" },
                ]}
                onChange={(operador) =>
                  update({
                    operador: operador as LogicaCondicional["operador"],
                  })
                }
              />
              <OpcionEditor
                label={`Valor de opción de regla ${i + 1}, pregunta ${index + 1}`}
                value={r.valor || "__texto"}
                opciones={[
                  { value: "__texto", label: "Valor libre" },
                  ...(
                    form.preguntas.find((q) => q.id === r.preguntaOrigenId)
                      ?.opciones ?? []
                  ).map((o) => ({ value: o.id, label: o.texto })),
                ]}
                onChange={(valor) =>
                  update({ valor: valor === "__texto" ? "" : valor })
                }
              />
              <TextoEditor
                label={`Valor de regla ${i + 1}, pregunta ${index + 1}`}
                value={r.valor}
                onChange={(valor) => update({ valor })}
              />
              {r.accion === "ir_a_seccion" && (
                <OpcionEditor
                  label={`Destino de regla ${i + 1}, pregunta ${index + 1}`}
                  value={r.seccionDestinoId ?? "sin"}
                  opciones={[
                    { value: "sin", label: "Selecciona sección posterior" },
                    ...form.secciones
                      .filter(
                        (s) =>
                          s.orden >
                          (form.secciones.find((s) => s.id === p.seccionId)
                            ?.orden ?? Infinity),
                      )
                      .map((s) => ({ value: s.id, label: s.titulo })),
                  ]}
                  onChange={(id) =>
                    update({ seccionDestinoId: id === "sin" ? undefined : id })
                  }
                />
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({ logica: p.logica?.filter((_, j) => j !== i) })
                }
              >
                Eliminar regla {i + 1}
              </Button>
            </fieldset>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            patch({
              logica: [
                ...(p.logica ?? []),
                {
                  preguntaOrigenId: "",
                  operador: "igual",
                  valor: "",
                  accion: "mostrar",
                },
              ],
            })
          }
        >
          Añadir regla
        </Button>
      </details>
    </article>
  );
}
