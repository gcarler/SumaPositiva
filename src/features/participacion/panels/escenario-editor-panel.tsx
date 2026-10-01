"use client";

import { useId } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export function EscenarioEditorPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const fieldId = useId();

  return (
    <PanelShell
      entryKey={entryKey}
      title="Registrar Escenario Especial"
      subtitle="Captura de asistencia para foros, consultas previas y talleres"
      crumbs={[{ label: "Participación" }, { label: "Nuevo Escenario" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex flex-wrap justify-end gap-2 w-full">
          <Button variant="outline" onClick={closeTop}>Cancelar</Button>
          <Button>Guardar Escenario</Button>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <SectionLabel>Datos Generales</SectionLabel>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-titulo`}>Título del Escenario</Label>
            <Input id={`${fieldId}-titulo`} placeholder="Ej. Foro Sectorial de Movilidad Sostenible" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-tipo`}>Tipo de Escenario</Label>
              <Select defaultValue="foro_sectorial">
                <SelectTrigger id={`${fieldId}-tipo`} className="w-full min-w-0">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foro_sectorial">Foro Sectorial</SelectItem>
                  <SelectItem value="consulta_previa">Consulta Previa</SelectItem>
                  <SelectItem value="taller_juvenil">Taller Juvenil</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-fecha`}>Fecha</Label>
              <Input id={`${fieldId}-fecha`} type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-entidad`}>Entidad Convocante</Label>
            <Input id={`${fieldId}-entidad`} placeholder="Ej. Secretaría de Planeación" />
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel>Desglose de Asistencia (Estimado / Planillas)</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-hombres`}>Hombres</Label>
              <Input id={`${fieldId}-hombres`} type="number" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-mujeres`}>Mujeres</Label>
              <Input id={`${fieldId}-mujeres`} type="number" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-otros`}>Otros</Label>
              <Input id={`${fieldId}-otros`} type="number" min="0" defaultValue="0" />
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Población con Enfoque Diferencial (Total estimado)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-victimas`} className="text-xs text-[var(--text-secondary)]">Víctimas (Ley 1448)</Label>
                <Input id={`${fieldId}-victimas`} type="number" min="0" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-discapacidad`} className="text-xs text-[var(--text-secondary)]">Discapacidad (Ley 1618)</Label>
                <Input id={`${fieldId}-discapacidad`} type="number" min="0" defaultValue="0" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
