"use client";

import { useId, useState } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useCrearEscenario } from "../services/use-participacion-queries";

export function EscenarioEditorPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const fieldId = useId();

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("FORO_GREMIAL");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [entidad, setEntidad] = useState("");
  const [lugar, setLugar] = useState("Cartagena de Indias");
  const [sintesis, setSintesis] = useState("");

  const [hombres, setHombres] = useState(0);
  const [mujeres, setMujeres] = useState(0);
  const [otros, setOtros] = useState(0);
  const [victimas, setVictimas] = useState(0);
  const [discapacidad, setDiscapacidad] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const crearMutation = useCrearEscenario();

  const handleGuardar = async () => {
    if (!titulo.trim()) {
      setErrorMsg("El título del escenario es obligatorio.");
      return;
    }
    if (!entidad.trim()) {
      setErrorMsg("La entidad convocante es obligatoria.");
      return;
    }

    setErrorMsg(null);

    const totalAsistentes = Number(hombres) + Number(mujeres) + Number(otros);
    const codigoUnico = `ESC-${Date.now().toString().slice(-4)}`;

    try {
      await crearMutation.mutateAsync({
        codigo_unico: codigoUnico,
        nombre: titulo.trim(),
        tipo_escenario: tipo,
        fecha,
        lugar: lugar.trim() || "Cartagena de Indias",
        entidad_convocante: entidad.trim(),
        total_asistentes: totalAsistentes,
        desglose_poblacional: {
          hombres: Number(hombres),
          mujeres: Number(mujeres),
          otros: Number(otros),
          victimas: Number(victimas),
          discapacidad: Number(discapacidad),
        },
        sintesis_acuerdos: sintesis.trim() || null,
        estado: "REALIZADO",
      });
      closeTop();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Error al guardar el escenario. Verifique sus credenciales de acceso."
      );
    }
  };

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
          <Button variant="outline" onClick={closeTop} disabled={crearMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={crearMutation.isPending}>
            {crearMutation.isPending ? "Guardando..." : "Guardar Escenario"}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        {errorMsg && (
          <div className="p-3 text-xs bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/20 rounded-lg">
            {errorMsg}
          </div>
        )}

        <section className="space-y-4">
          <SectionLabel>Datos Generales</SectionLabel>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-titulo`}>Título del Escenario</Label>
            <Input
              id={`${fieldId}-titulo`}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Foro Sectorial de Movilidad Sostenible"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-tipo`}>Tipo de Escenario</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id={`${fieldId}-tipo`} className="w-full min-w-0">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORO_GREMIAL">Foro Gremial / Sectorial</SelectItem>
                  <SelectItem value="CONSULTA_PREVIA">Consulta Previa Étnica</SelectItem>
                  <SelectItem value="TALLER_FOCAL">Taller Focal</SelectItem>
                  <SelectItem value="ENCUENTRO_COMUNITARIO">Encuentro Comunitario</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-fecha`}>Fecha</Label>
              <Input
                id={`${fieldId}-fecha`}
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-entidad`}>Entidad Convocante</Label>
              <Input
                id={`${fieldId}-entidad`}
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                placeholder="Ej. Secretaría de Participación y Desarrollo Social"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-lugar`}>Lugar de Realización</Label>
              <Input
                id={`${fieldId}-lugar`}
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Ej. Centro de Convenciones Julio César Turbay"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-sintesis`}>Síntesis de Acuerdos / Conclusiones</Label>
            <Textarea
              id={`${fieldId}-sintesis`}
              value={sintesis}
              onChange={(e) => setSintesis(e.target.value)}
              placeholder="Principales consensos, acuerdos o solicitudes comunitarias..."
              rows={3}
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel>Desglose de Asistencia (Estimado / Planillas)</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-hombres`}>Hombres</Label>
              <Input
                id={`${fieldId}-hombres`}
                type="number"
                min="0"
                value={hombres}
                onChange={(e) => setHombres(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-mujeres`}>Mujeres</Label>
              <Input
                id={`${fieldId}-mujeres`}
                type="number"
                min="0"
                value={mujeres}
                onChange={(e) => setMujeres(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-otros`}>Otros</Label>
              <Input
                id={`${fieldId}-otros`}
                type="number"
                min="0"
                value={otros}
                onChange={(e) => setOtros(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Población con Enfoque Diferencial (Total estimado)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-victimas`} className="text-xs text-[var(--text-secondary)]">
                  Víctimas (Ley 1448)
                </Label>
                <Input
                  id={`${fieldId}-victimas`}
                  type="number"
                  min="0"
                  value={victimas}
                  onChange={(e) => setVictimas(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-discapacidad`} className="text-xs text-[var(--text-secondary)]">
                  Discapacidad (Ley 1618)
                </Label>
                <Input
                  id={`${fieldId}-discapacidad`}
                  type="number"
                  min="0"
                  value={discapacidad}
                  onChange={(e) => setDiscapacidad(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
