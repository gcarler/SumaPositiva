"use client";
import { toast } from "sonner";
import { eliminarFormulario } from "../services/formularios-api";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useFormularios } from "../services/use-formularios-queries";
import { Button } from "@/shared/ui/button";
import { Plus, BarChart2, Edit2 } from "lucide-react";
import { useFormulariosStore } from "../state/formularios-store";
import { useState } from "react";
import { SectionLabel } from "@/shared/components/participation-ui";

export function FormulariosPanel({
  entryKey,
  props = {},
}: {
  entryKey: string;
  props?: { soloRespuesta?: boolean; soloLectura?: boolean };
}) {
  const { closeTop } = usePanels();
  return (
    <PanelShell
      entryKey={entryKey}
      title="Catálogo de Formularios"
      subtitle="Consultas ciudadanas e instrumentos de recolección"
      crumbs={[{ label: "Formularios" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <FormulariosContenido {...props} />
    </PanelShell>
  );
}

export function FormulariosContenido({
  soloRespuesta = false,
  soloLectura = false,
}: {
  soloRespuesta?: boolean;
  soloLectura?: boolean;
}) {
  const { openPanel } = usePanels();
  const { data: formularios, isLoading, error } = useFormularios();
  const [eliminarId, setEliminarId] = useState<string>();
  return (
    <div className="p-6 space-y-6">
      <p className="text-xs text-text-secondary">
        Los formularios y sus respuestas se conservan en la base de datos de
        POLIS.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          No se pudo consultar el catálogo guardado: {error.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <SectionLabel>Formularios Disponibles</SectionLabel>
        {!soloRespuesta && !soloLectura && (
          <Button size="sm" onClick={() => openPanel("formulario-editor", {})}>
            <Plus className="mr-2 size-4" />
            Crear Formulario
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--text-secondary)]">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {formularios
            ?.filter((form) => !soloRespuesta || form.estado !== "borrador")
            .map((form) => (
              <div
                key={form.id}
                className="flex flex-wrap gap-3 justify-between items-center p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
              >
                <div>
                  <h3 className="font-medium text-sm text-[var(--text-primary)]">
                    {form.titulo}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)] mt-1">
                    <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-2)]">
                      {form.estado}
                    </span>
                    <span>{form.respuestasCount} respuestas</span>
                    <span>Guardado en POLIS</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {soloLectura && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        useFormulariosStore
                          .getState()
                          .ponerPreview(form.id, form);
                        openPanel("formulario-preview", {
                          borradorId: form.id,
                        });
                      }}
                    >
                      Vista previa
                    </Button>
                  )}
                  {form.estado === "activo" && !soloLectura && (
                    <Button
                      size="sm"
                      onClick={() =>
                        openPanel("formulario-respuesta", {
                          formularioId: form.id,
                        })
                      }
                    >
                      Responder
                    </Button>
                  )}
                  {!soloRespuesta && (
                    <>
                      {!soloLectura && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Editar formulario: ${form.titulo}`}
                          onClick={() =>
                            openPanel("formulario-editor", {
                              formularioId: form.id,
                            })
                          }
                        >
                          <Edit2 aria-hidden="true" className="size-3.5" />
                        </Button>
                      )}
                      {form.estado === "activo" &&
                        form.configuracion.urlPublica && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPanel("formulario-analitica", {
                                formularioId: form.id,
                              })
                            }
                          >
                            Compartir
                          </Button>
                        )}
                      {form.estado !== "borrador" && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Ver estadísticas del formulario: ${form.titulo}`}
                          onClick={() =>
                            openPanel("formulario-analitica", {
                              formularioId: form.id,
                            })
                          }
                        >
                          <BarChart2 aria-hidden="true" className="size-3.5" />
                        </Button>
                      )}
                      {!soloLectura && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEliminarId(form.id)}
                          aria-label={`Eliminar formulario: ${form.titulo}`}
                        >
                          Eliminar
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {eliminarId === form.id && !soloLectura && (
                  <div className="w-full space-y-2">
                    <p className="text-sm">
                      Solo se eliminan formularios sin respuestas. Si ya tiene
                      respuestas, ciérralo para conservarlas. ¿Continuar?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {soloLectura && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            useFormulariosStore
                              .getState()
                              .ponerPreview(form.id, form);
                            openPanel("formulario-preview", {
                              borradorId: form.id,
                            });
                          }}
                        >
                          Vista previa
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await eliminarFormulario(form.id);
                            setEliminarId(undefined);
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "No se pudo eliminar el formulario",
                            );
                          }
                        }}
                      >
                        Confirmar eliminación
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEliminarId(undefined)}
                      >
                        Conservar formulario
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
