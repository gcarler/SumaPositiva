"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useFormularios } from "../services/use-formularios-queries";
import { Button } from "@/shared/ui/button";
import { Plus, BarChart2, Edit2 } from "lucide-react";
import { SectionLabel } from "@/shared/components/participation-ui";

export function FormulariosPanel({ entryKey }: { entryKey: string }) {
  const { closeTop, openPanel } = usePanels();
  const { data: formularios, isLoading } = useFormularios();

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
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <SectionLabel>Formularios Disponibles</SectionLabel>
          <Button size="sm" onClick={() => openPanel("formulario-editor", {})}>
            <Plus className="mr-2 size-4" />
            Crear Formulario
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-[var(--text-secondary)]">Cargando...</div>
        ) : (
          <div className="space-y-4">
            {formularios?.map(form => (
              <div key={form.id} className="flex flex-wrap gap-3 justify-between items-center p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                <div>
                  <h4 className="font-medium text-sm text-[var(--text-primary)]">{form.titulo}</h4>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)] mt-1">
                    <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-2)]">
                      {form.estado}
                    </span>
                    <span>{form.respuestasCount} respuestas</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" aria-label={`Editar formulario: ${form.titulo}`} onClick={() => openPanel("formulario-editor", { formularioId: form.id })}>
                    <Edit2 aria-hidden="true" className="size-3.5" />
                  </Button>
                  {form.estado !== "borrador" && (
                    <Button variant="outline" size="sm" aria-label={`Ver estadísticas del formulario: ${form.titulo}`} onClick={() => openPanel("formulario-analitica", { formularioId: form.id })}>
                      <BarChart2 aria-hidden="true" className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
