"use client";

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
  props?: { soloRespuesta?: boolean };
}) {
  const { closeTop, openPanel } = usePanels();
  const { data: formularios, isLoading } = useFormularios();
  const [eliminarId, setEliminarId] = useState<string>();

  return (
    <PanelShell
      entryKey={entryKey}
      title="Catálogo de Formularios"
      subtitle="Consultas ciudadanas e instrumentos de recolección"
      crumbs={[{ label: "Formularios" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6 space-y-6">
        <p className="text-xs text-text-secondary">
          Demostración: formularios y respuestas de prueba de esta sesión. No se
          registran oficialmente.
        </p>
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <SectionLabel>Formularios Disponibles</SectionLabel>
          {!props.soloRespuesta && (
            <Button
              size="sm"
              onClick={() => openPanel("formulario-editor", {})}
            >
              <Plus className="mr-2 size-4" />
              Crear Formulario
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-sm text-[var(--text-secondary)]">
            Cargando...
          </div>
        ) : (
          <div className="space-y-4">
            {formularios
              ?.filter(
                (form) => !props.soloRespuesta || form.estado !== "borrador",
              )
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
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.estado === "activo" && (
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
                    {!props.soloRespuesta && (
                      <>
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
                            <BarChart2
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEliminarId(form.id)}
                          aria-label={`Eliminar formulario: ${form.titulo}`}
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                  {eliminarId === form.id && (
                    <div className="w-full space-y-2">
                      <p className="text-sm">
                        Se eliminarán el formulario y sus respuestas de prueba.
                        ¿Continuar?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            useFormulariosStore
                              .getState()
                              .eliminarFormulario(form.id);
                            setEliminarId(undefined);
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
    </PanelShell>
  );
}
