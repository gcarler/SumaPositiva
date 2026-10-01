"use client";
import { v4 as uuid } from "uuid";
import { useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import {
  TextoEditor,
  OpcionEditor,
  MarcaEditor,
} from "../components/editor-fields";
import { PreguntaEditor } from "../components/pregunta-editor";
import {
  formularioVacio,
  type Formulario,
  type PreguntaFormulario,
} from "../models/formulario";
import { validarFormulario } from "../services/formulario-engine";
import {
  useFormularioDetalle,
  useGuardarFormulario,
} from "../services/use-formularios-queries";
import { useFormulariosStore } from "../state/formularios-store";

function fechaLocal(iso?: string) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) return "";
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function FormularioEditorPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { formularioId?: string };
}) {
  const { closeTop } = usePanels();
  const { data, error } = useFormularioDetalle(props.formularioId ?? "");
  if (props.formularioId && !data)
    return (
      <PanelShell
        entryKey={entryKey}
        title="Editor de formulario"
        crumbs={[{ label: "Formularios" }]}
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <p role="alert" className="p-6">
          {error?.message ?? "Cargando formulario…"}
        </p>
      </PanelShell>
    );
  return (
    <Constructor
      key={props.formularioId ?? "nuevo"}
      entryKey={entryKey}
      inicial={data ?? formularioVacio()}
      editando={!!props.formularioId}
    />
  );
}
function Constructor({
  entryKey,
  inicial,
  editando,
}: {
  entryKey: string;
  inicial: Formulario;
  editando: boolean;
}) {
  const { closeTop, openPanel } = usePanels();
  const [form, setForm] = useState(() => structuredClone(inicial));
  const [errores, setErrores] = useState<string[]>([]);
  const guardar = useGuardarFormulario();
  const patch = (v: Partial<Formulario>) => setForm((f) => ({ ...f, ...v }));
  const normalizar = (preguntas: PreguntaFormulario[]) =>
    preguntas.map((p, orden) => ({ ...p, orden }));
  const cambiarPregunta = (p: PreguntaFormulario) =>
    patch({ preguntas: form.preguntas.map((q) => (q.id === p.id ? p : q)) });
  const mover = (id: string, d: number) => {
    const p = form.preguntas.find((p) => p.id === id);
    if (!p) return;
    const grupo = form.preguntas.filter((q) => q.seccionId === p.seccionId);
    const destino = grupo[grupo.findIndex((q) => q.id === id) + d];
    if (!destino) return;
    const items = [...form.preguntas];
    const a = items.findIndex((q) => q.id === id),
      b = items.findIndex((q) => q.id === destino.id);
    [items[a], items[b]] = [items[b], items[a]];
    patch({ preguntas: normalizar(items) });
  };
  const confirmar = async () => {
    const errors = validarFormulario(form);
    setErrores(errors);
    if (errors.length) return;
    try {
      await guardar.mutateAsync({
        id: editando ? form.id : undefined,
        datos: form,
      });
      toast.success("Formulario de demostración guardado");
      closeTop();
    } catch (e) {
      setErrores([
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Tus cambios siguen en el editor.",
      ]);
    }
  };
  return (
    <PanelShell
      entryKey={entryKey}
      title={editando ? "Editar Formulario" : "Nuevo Formulario"}
      subtitle="Constructor de instrumentos de participación"
      crumbs={[{ label: "Formularios" }, { label: "Editor" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              useFormulariosStore
                .getState()
                .ponerPreview(entryKey, structuredClone(form));
              openPanel("formulario-preview", { borradorId: entryKey });
            }}
          >
            Vista Previa
          </Button>
          <Button variant="outline" onClick={closeTop}>
            Cancelar
          </Button>
          <Button loading={guardar.isPending} onClick={confirmar}>
            Guardar Formulario
          </Button>
        </div>
      }
    >
      <div className="space-y-6 p-6">
        <p className="text-xs text-text-secondary">
          Demostración: los formularios y respuestas de prueba se conservan
          durante esta sesión de la aplicación; no se registran oficialmente.
        </p>
        {!!errores.length && (
          <div
            role="alert"
            className="rounded-lg border border-danger p-4 text-sm"
          >
            <ul className="list-disc pl-4">
              {errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <section className="space-y-4">
          <h3 className="font-semibold text-sm">Configuración General</h3>
          <TextoEditor
            label="Título del Formulario"
            value={form.titulo}
            onChange={(titulo) => patch({ titulo })}
          />
          <TextoEditor
            label="Descripción"
            value={form.descripcion}
            onChange={(descripcion) => patch({ descripcion })}
            multiline
          />
          <OpcionEditor
            label="Estado del formulario"
            value={form.estado}
            opciones={[
              { value: "borrador", label: "Borrador" },
              { value: "activo", label: "Activo" },
              { value: "cerrado", label: "Cerrado" },
            ]}
            onChange={(estado) =>
              patch({ estado: estado as Formulario["estado"] })
            }
          />
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <h3 className="text-sm font-semibold">Secciones</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patch({
                  secciones: [
                    ...form.secciones,
                    {
                      id: uuid(),
                      titulo: `Sección ${form.secciones.length + 1}`,
                      descripcion: "",
                      orden: form.secciones.length,
                    },
                  ],
                })
              }
            >
              Añadir Sección
            </Button>
          </div>
          {form.secciones.map((s, i) => (
            <div
              key={s.id}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <TextoEditor
                label={`Título de sección ${i + 1}`}
                value={s.titulo}
                onChange={(titulo) =>
                  patch({
                    secciones: form.secciones.map((x) =>
                      x.id === s.id ? { ...x, titulo } : x,
                    ),
                  })
                }
              />
              <TextoEditor
                label={`Descripción de sección ${i + 1}`}
                value={s.descripcion}
                onChange={(descripcion) =>
                  patch({
                    secciones: form.secciones.map((x) =>
                      x.id === s.id ? { ...x, descripcion } : x,
                    ),
                  })
                }
                multiline
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  patch({
                    secciones: form.secciones
                      .filter((x) => x.id !== s.id)
                      .map((x, orden) => ({ ...x, orden })),
                    preguntas: form.preguntas.map((p) =>
                      p.seccionId === s.id ? { ...p, seccionId: undefined } : p,
                    ),
                  })
                }
              >
                Eliminar sección {i + 1}
              </Button>
            </div>
          ))}
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Preguntas y Campos</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patch({
                  preguntas: [
                    ...form.preguntas,
                    {
                      id: uuid(),
                      tipo: "texto_corto",
                      texto: "",
                      obligatoria: false,
                      orden: form.preguntas.length,
                      seccionId: form.secciones[0]?.id,
                    },
                  ],
                })
              }
            >
              Añadir Pregunta
            </Button>
          </div>
          {form.preguntas.map((p, index) => (
            <PreguntaEditor
              key={p.id}
              pregunta={p}
              form={form}
              index={index}
              cambiar={cambiarPregunta}
              mover={(d) => mover(p.id, d)}
              eliminar={() =>
                patch({
                  preguntas: normalizar(
                    form.preguntas.filter((q) => q.id !== p.id),
                  ),
                })
              }
              duplicar={() => {
                const items = [...form.preguntas];
                items.splice(index + 1, 0, {
                  ...structuredClone(p),
                  id: uuid(),
                  texto: p.texto + " (copia)",
                });
                patch({ preguntas: normalizar(items) });
              }}
            />
          ))}
          {!form.preguntas.length && (
            <p className="text-sm text-text-secondary">
              No hay preguntas configuradas
            </p>
          )}
        </section>
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Configuración</h3>
          <TextoEditor
            label="Mensaje de confirmación"
            value={form.configuracion.mensajeConfirmacion}
            multiline
            onChange={(mensajeConfirmacion) =>
              patch({
                configuracion: { ...form.configuracion, mensajeConfirmacion },
              })
            }
          />
          <TextoEditor
            label="Límite de respuestas (vacío: ilimitado)"
            type="number"
            value={form.configuracion.limiteRespuestas}
            onChange={(v) =>
              patch({
                configuracion: {
                  ...form.configuracion,
                  limiteRespuestas: v === "" ? undefined : Number(v),
                },
              })
            }
          />
          <TextoEditor
            label="Fecha de cierre"
            type="datetime-local"
            value={fechaLocal(form.configuracion.fechaCierre)}
            onChange={(fechaCierre) =>
              patch({
                configuracion: {
                  ...form.configuracion,
                  fechaCierre: fechaCierre
                    ? new Date(fechaCierre).toISOString()
                    : undefined,
                },
              })
            }
          />
          <MarcaEditor
            label="Mostrar barra de progreso"
            value={form.configuracion.mostrarBarraProgreso}
            onChange={(mostrarBarraProgreso) =>
              patch({
                configuracion: { ...form.configuracion, mostrarBarraProgreso },
              })
            }
          />
          <MarcaEditor
            label="Requerir autenticación para responder"
            value={form.configuracion.requiereAutenticacion}
            onChange={(requiereAutenticacion) =>
              patch({
                configuracion: { ...form.configuracion, requiereAutenticacion },
              })
            }
          />
          <MarcaEditor
            label="Permitir editar respuesta y responder de nuevo"
            value={form.configuracion.permitirEdicion}
            onChange={(permitirEdicion) =>
              patch({
                configuracion: { ...form.configuracion, permitirEdicion },
              })
            }
          />
          <MarcaEditor
            label="Orden aleatorio de preguntas"
            value={form.configuracion.ordenAleatorio}
            onChange={(ordenAleatorio) =>
              patch({
                configuracion: { ...form.configuracion, ordenAleatorio },
              })
            }
          />
        </section>
      </div>
    </PanelShell>
  );
}
