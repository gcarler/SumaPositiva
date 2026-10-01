"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useFormularioDetalle } from "../services/use-formularios-queries";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SectionLabel } from "@/shared/components/participation-ui";
import { useId, useState } from "react";
import type { PreguntaFormulario } from "../models/formulario";

export function FormularioEditorPanel({ entryKey, props }: { entryKey: string, props: { formularioId?: string } }) {
  const { closeTop } = usePanels();
  const fieldId = useId();
  const { data: form, isLoading } = useFormularioDetalle(props.formularioId || "");
  const isEditing = !!props.formularioId;

  // Simple state for demo builder
  const [preguntas, setPreguntas] = useState<PreguntaFormulario[]>(form?.preguntas || []);

  const addPregunta = () => {
    setPreguntas([...preguntas, { id: `new_${Date.now()}`, tipo: "texto_corto", texto: "", obligatoria: false }]);
  };

  if (isEditing && isLoading) {
    return <PanelShell entryKey={entryKey} title="Cargando..." crumbs={[{ label: "Formularios" }]} onClose={closeTop} onCloseToKey={closeTop}><div/></PanelShell>;
  }

  return (
    <PanelShell
      entryKey={entryKey}
      title={isEditing ? "Editar Formulario" : "Nuevo Formulario"}
      crumbs={[{ label: "Formularios" }, { label: "Editor" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex flex-wrap justify-end gap-2 w-full">
          <Button variant="outline" onClick={closeTop}>Cancelar</Button>
          <Button>Guardar Formulario</Button>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <SectionLabel>Configuración General</SectionLabel>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-titulo`}>Título del Formulario</Label>
            <Input id={`${fieldId}-titulo`} defaultValue={form?.titulo} placeholder="Ej. Consulta Sectorial 2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-descripcion`}>Descripción</Label>
            <Input id={`${fieldId}-descripcion`} defaultValue={form?.descripcion} placeholder="Breve descripción..." />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <SectionLabel>Preguntas y Campos</SectionLabel>
            <Button size="sm" variant="outline" onClick={addPregunta}>Añadir Pregunta</Button>
          </div>

          <div className="space-y-4">
            {preguntas.map((p, index) => (
              <div key={p.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor={`${fieldId}-${p.id}-texto`}>Enunciado ({index + 1})</Label>
                    <Input id={`${fieldId}-${p.id}-texto`} defaultValue={p.texto} placeholder="Pregunta..." />
                  </div>
                  <div className="min-w-0 space-y-2 sm:w-1/3">
                    <Label htmlFor={`${fieldId}-${p.id}-tipo`}>Tipo ({index + 1})</Label>
                    <Select defaultValue="texto_corto">
                      <SelectTrigger id={`${fieldId}-${p.id}-tipo`} className="w-full min-w-0">
                        <SelectValue placeholder="Tipo de pregunta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto_corto">Texto Corto</SelectItem>
                        <SelectItem value="opcion_unica">Opción Única</SelectItem>
                        <SelectItem value="opcion_multiple">Opción Múltiple</SelectItem>
                        <SelectItem value="likert">Escala Likert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox id={`${fieldId}-req-${p.id}`} defaultChecked={p.obligatoria} />
                    <Label htmlFor={`${fieldId}-req-${p.id}`} className="font-normal text-xs text-[var(--text-secondary)]">Requerida</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id={`${fieldId}-enf-${p.id}`} defaultChecked={p.enfoqueDiferencial} />
                    <Label htmlFor={`${fieldId}-enf-${p.id}`} className="font-normal text-xs text-[var(--text-secondary)]">Aplica Enfoque Diferencial</Label>
                  </div>
                </div>
              </div>
            ))}
            {preguntas.length === 0 && (
              <p className="text-sm text-center text-[var(--text-tertiary)] py-4">No hay preguntas configuradas</p>
            )}
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
