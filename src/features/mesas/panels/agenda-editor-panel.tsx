"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useAgendaStore } from "@/features/mesas/state/agenda-store";
import type { EstadoMesa } from "@/features/mesas/data/agenda.data";

export interface AgendaEditorPanelProps {
  agendaId?: string;
  onClose?: () => void;
  entryKey?: string;
  props?: { agendaId?: string };
}

export function AgendaEditorPanel({
  agendaId,
  onClose,
  entryKey = "agenda-editor",
  props,
}: AgendaEditorPanelProps) {
  const { closeTop, closeToKey } = usePanels();
  const handleClose = onClose ?? closeTop;
  const id = props?.agendaId ?? agendaId ?? "";

  const agenda = useAgendaStore((s) => s.obtenerAgendaPorId(id));
  const actualizarAgenda = useAgendaStore((s) => s.actualizarAgenda);

  const [estado, setEstado] = useState<EstadoMesa>(
    agenda?.estado || "programada"
  );
  // El flujo desde la ficha de Proyectos llega con el store de agendas frío:
  // sin carga, el formulario abriría vacío y el guardado fallaría por
  // "Datos incompletos" (fecha y lugar obligatorios).
  useEffect(() => {
    if (!agenda) void useAgendaStore.getState().cargarAgendas();
    // Solo a demanda: si la agenda ya está en el store no hay recarga.
  }, [agenda]);
  // Rehidratación del formulario en la carga inicial de la agenda
  // (de indefinida a datos); no toca los campos si el usuario ya editó.
  useEffect(() => {
    if (!agenda || !agenda.id) return;
    setEstado(agenda.estado || "programada");
    setFecha(agenda.fecha || "");
    setHoraInicio(agenda.horaInicio || "08:30");
    setHoraFin(agenda.horaFin || "12:00");
    setLugar(agenda.lugar || "");
    setTerritorio(agenda.territorio || "");
    setResponsable(agenda.responsable || "");
    setObservaciones(agenda.observaciones || "");
  }, [agenda?.id]);
  const [fecha, setFecha] = useState(agenda?.fecha || "");
  const [horaInicio, setHoraInicio] = useState(agenda?.horaInicio || "08:30");
  const [horaFin, setHoraFin] = useState(agenda?.horaFin || "12:00");
  const [lugar, setLugar] = useState(agenda?.lugar || "");
  const [territorio, setTerritorio] = useState(agenda?.territorio || "");
  const [responsable, setResponsable] = useState(agenda?.responsable || "");
  const [observaciones, setObservaciones] = useState(agenda?.observaciones || "");
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lugar.trim() || !fecha.trim()) {
      toast.error("Datos incompletos", {
        description: "Fecha y lugar son campos obligatorios.",
      });
      return;
    }

    setGuardando(true);
    try {
      await actualizarAgenda(id, {
        estado,
        fecha,
        horaInicio,
        horaFin,
        lugar: lugar.trim(),
        territorio: territorio.trim(),
        responsable: responsable.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });

      toast.success("Cronograma actualizado", {
        description: `La mesa '${agenda?.nombre || id}' quedó en estado ${estado}.`,
      });
      handleClose();
    } catch {
      toast.error("Error al actualizar", {
        description: "No se pudo sincronizar la reprogramación en el servidor.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Mesas de trabajo" }, { label: "Cronograma" }]}
      kicker="Gestión de Cronograma de Mesas"
      title={agenda ? agenda.nombre : `Programación — Mesa ${agendaId}`}
      subtitle="Actualiza la fecha de convocatoria, el lugar de encuentro o el estado de realización comunitaria."
      onClose={handleClose}
      onCloseToKey={closeToKey}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-agenda-editor"
            size="sm"
            loading={guardando}
            loadingLabel="Guardando…"
            className="gap-1.5"
          >
            <Check className="size-4" />
            Guardar cambios
          </Button>
        </div>
      }
    >
      <div className="ui-panel-body w-full space-y-6 px-4 py-2 sm:px-6">
        {estado === "reprogramada" && (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3.5 text-xs text-[var(--warning)]">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Mesa marcada como reprogramada</p>
              <p className="text-[var(--text-secondary)]">
                La nueva fecha y sede se reflejarán inmediatamente en el geovisor y en la planilla de asistencia.
              </p>
            </div>
          </div>
        )}

        <form
          id="form-agenda-editor"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Estado de la mesa */}
          <FormField
            id="agenda-estado"
            label="Estado de programación"
            required
            description="Controla si la mesa está convocada, en deliberación o si requirió ajuste de fecha."
          >
            {(controlProps) => (
              <Select
                value={estado}
                onValueChange={(val) => setEstado(val as EstadoMesa)}
              >
                <SelectTrigger id={controlProps.id} className="w-full">
                  <SelectValue placeholder="Selecciona el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programada">Programada</SelectItem>
                  <SelectItem value="reprogramada">Reprogramada</SelectItem>
                  <SelectItem value="en_curso">En curso (Deliberación activa)</SelectItem>
                  <SelectItem value="realizada">Realizada (Acta suscrita)</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>

          {/* Fecha y horarios */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              id="agenda-fecha"
              label="Fecha programada"
              required
            >
              {(controlProps) => (
                <div className="relative">
                  <Input
                    {...controlProps}
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </FormField>

            <FormField
              id="agenda-hora-inicio"
              label="Hora de inicio"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              )}
            </FormField>

            <FormField
              id="agenda-hora-fin"
              label="Hora de finalización"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              )}
            </FormField>
          </div>

          {/* Sede y Territorio */}
          <div className="space-y-4">
            <FormField
              id="agenda-lugar"
              label="Lugar o sede comunitaria"
              required
              description="Espacio físico donde se congrega la comunidad y el equipo facilitador."
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Ej.: SENA Plaza de la Aduana, Auditorio"
                />
              )}
            </FormField>

            <FormField
              id="agenda-territorio"
              label="Territorio o cobertura"
              description="Comuna, corregimiento, localidad o sector específico de Cartagena."
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={territorio}
                  onChange={(e) => setTerritorio(e.target.value)}
                  placeholder="Ej.: Localidad 1 — Histórica y del Caribe Norte"
                />
              )}
            </FormField>

            <FormField
              id="agenda-responsable"
              label="Dependencia o entidad responsable"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Ej.: Secretaría de Planeación Distrital"
                />
              )}
            </FormField>

            <FormField
              id="agenda-observaciones"
              label="Observaciones o notas metodológicas"
              description="Instrucciones para facilitadores, requerimientos de transporte o enfoque diferencial."
            >
              {(controlProps) => (
                <Textarea
                  {...controlProps}
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej.: Mesa con protocolo diferencial étnico — comunidad afrodescendiente."
                />
              )}
            </FormField>
          </div>
        </form>
      </div>
    </PanelShell>
  );
}
