"use client";

import { useEffect, useId, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Notice } from "@/shared/ui/notice";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  ETAPAS_CRONOGRAMA,
  ESTADOS_TAREA,
  type EstadoTarea,
  type TareaComunicacion,
  type TareaComunicacionPayload,
} from "../models/tarea-comunicacion";
import {
  actualizarTareaComunicacion,
  crearTareaComunicacion,
} from "../services/comunicaciones-api";

export interface TareaComunicacionEditorProps {
  /** Tarea a editar; null indica creación de nueva tarea. */
  tarea: TareaComunicacion | null;
  ordenSugerido: number;
  /** Integración con la lista padre: reemplaza la fila guardada. */
  onGuardada: (tarea: TareaComunicacion) => void;
}

const RESPONSABLE_PREDETERMINADO = "Equipo de Comunicaciones";
const TERRITORIO_PREDETERMINADO = "Distrito de Cartagena";

export function TareaComunicacionPanel({ entryKey, props }: { entryKey: string; props: TareaComunicacionEditorProps }) {
  const { closeTop } = usePanels();
  const fieldId = useId();
  const { tarea, ordenSugerido, onGuardada } = props;

  const [formCodigo, setFormCodigo] = useState("");
  const [formTitulo, setFormTitulo] = useState("");
  const [formEtapa, setFormEtapa] = useState<string>(ETAPAS_CRONOGRAMA[0]);
  const [formTerritorio, setFormTerritorio] = useState("");
  const [formFechaInicio, setFormFechaInicio] = useState("");
  const [formFechaFin, setFormFechaFin] = useState("");
  const [formEstado, setFormEstado] = useState<EstadoTarea>("pendiente");
  const [formResponsable, setFormResponsable] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formEntregables, setFormEntregables] = useState("");
  const [formOrden, setFormOrden] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    if (tarea) {
      setFormCodigo(tarea.codigo);
      setFormTitulo(tarea.titulo);
      setFormEtapa(tarea.etapa);
      setFormTerritorio(tarea.territorio);
      setFormFechaInicio(tarea.fecha_inicio);
      setFormFechaFin(tarea.fecha_fin);
      setFormEstado(tarea.estado);
      setFormResponsable(tarea.responsable);
      setFormDescripcion(tarea.descripcion);
      setFormEntregables(tarea.entregables);
      setFormOrden(tarea.orden);
    } else {
      setFormCodigo("");
      setFormTitulo("");
      setFormEtapa(ETAPAS_CRONOGRAMA[0]);
      setFormTerritorio("");
      setFormFechaInicio(hoy);
      setFormFechaFin(hoy);
      setFormEstado("pendiente");
      setFormResponsable(RESPONSABLE_PREDETERMINADO);
      setFormDescripcion("");
      setFormEntregables("");
      setFormOrden(ordenSugerido);
    }
  }, [tarea, ordenSugerido]);

  const handleGuardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorForm(null);

    if (!formCodigo.trim()) {
      setErrorForm("El código de la tarea es obligatorio (ej. TC-01).");
      return;
    }
    if (!formTitulo.trim()) {
      setErrorForm("El título de la tarea es obligatorio.");
      return;
    }
    if (!formFechaInicio || !formFechaFin) {
      setErrorForm("Las fechas de inicio y culminación son obligatorias.");
      return;
    }
    if (formFechaFin < formFechaInicio) {
      setErrorForm("La fecha de culminación no puede ser anterior a la fecha de inicio.");
      return;
    }

    setGuardando(true);
    try {
      const payload: TareaComunicacionPayload = {
        codigo: formCodigo.trim(),
        titulo: formTitulo.trim(),
        etapa: formEtapa,
        territorio: formTerritorio.trim() || TERRITORIO_PREDETERMINADO,
        fecha_inicio: formFechaInicio,
        fecha_fin: formFechaFin,
        estado: formEstado,
        responsable: formResponsable.trim() || RESPONSABLE_PREDETERMINADO,
        descripcion: formDescripcion.trim(),
        entregables: formEntregables.trim(),
        orden: formOrden,
      };

      const guardada = tarea
        ? await actualizarTareaComunicacion(tarea.id, payload)
        : await crearTareaComunicacion(payload);

      onGuardada(guardada);
      toast.success(
        `Tarea ${guardada.codigo} guardada correctamente con fechas del ${guardada.fecha_inicio} al ${guardada.fecha_fin}.`,
      );
      closeTop();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar la tarea de comunicación.";
      setErrorForm(msg);
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  const estadoActual = ESTADOS_TAREA[formEstado] ?? ESTADOS_TAREA.pendiente;

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Comunicaciones" }, { label: tarea ? `Editar ${tarea.codigo}` : "Nueva Tarea" }]}
      kicker="Plan de Trabajo y Comunicaciones"
      title={tarea ? `Editar tarea ${tarea.codigo}` : "Nueva tarea de comunicación"}
      subtitle="Ajusta las fechas de inicio/fin, territorio, estado y entregables operativos."
      actions={
        <Badge variant={estadoActual.tone}>{estadoActual.label}</Badge>
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={closeTop} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={guardando} className="gap-2">
            <Save className="size-4" />
            {guardando ? "Guardando..." : "Guardar Tarea y Fechas"}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleGuardar} className="space-y-6 p-6">
        {errorForm && (
          <Notice tone="danger" title="Error en la tarea">
            {errorForm}
          </Notice>
        )}

        <section className="space-y-4">
          <SectionLabel>Datos Generales</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-codigo`}>Código identificador *</Label>
              <Input
                id={`${fieldId}-codigo`}
                value={formCodigo}
                onChange={(e) => setFormCodigo(e.target.value)}
                placeholder="Ej. TC-01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-estado`}>Estado de avance</Label>
              <Select value={formEstado} onValueChange={(val) => setFormEstado(val as EstadoTarea)}>
                <SelectTrigger id={`${fieldId}-estado`} aria-label="Estado de avance">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADOS_TAREA).map(([clave, cfg]) => (
                    <SelectItem key={clave} value={clave}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-titulo`}>Título de la actividad *</Label>
            <Input
              id={`${fieldId}-titulo`}
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              placeholder="Ej. Jornada de Campo 1: Entorno Urbano y Convivencia"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-etapa`}>Etapa del cronograma</Label>
              <Select value={formEtapa} onValueChange={(val) => setFormEtapa(val)}>
                <SelectTrigger id={`${fieldId}-etapa`} aria-label="Etapa del cronograma">
                  <SelectValue placeholder="Seleccionar etapa" />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS_CRONOGRAMA.map((etapa) => (
                    <SelectItem key={etapa} value={etapa}>
                      {etapa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-territorio`}>Territorio / Barrios</Label>
              <Input
                id={`${fieldId}-territorio`}
                value={formTerritorio}
                onChange={(e) => setFormTerritorio(e.target.value)}
                placeholder="Ej. Localidad 1: San Francisco y Canapote"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel>Fechas</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-inicio`}>Fecha de inicio (YYYY-MM-DD) *</Label>
              <Input
                id={`${fieldId}-inicio`}
                type="date"
                value={formFechaInicio}
                onChange={(e) => setFormFechaInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-fin`}>Fecha de culminación (YYYY-MM-DD) *</Label>
              <Input
                id={`${fieldId}-fin`}
                type="date"
                value={formFechaFin}
                onChange={(e) => setFormFechaFin(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-responsable`}>Responsable de entrega</Label>
              <Input
                id={`${fieldId}-responsable`}
                value={formResponsable}
                onChange={(e) => setFormResponsable(e.target.value)}
                placeholder="Ej. Equipo Audiovisual y Reportería Social"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-orden`}>Orden numérico</Label>
              <Input
                id={`${fieldId}-orden`}
                type="number"
                value={formOrden}
                onChange={(e) => setFormOrden(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel>Entregables</SectionLabel>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-descripcion`}>Descripción operativa de la actividad</Label>
            <Textarea
              id={`${fieldId}-descripcion`}
              rows={3}
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              placeholder="Detalla qué se hará en campo, temas de entrevistas, reuniones o cobertura..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-entregables`}>Entregables verificables</Label>
            <Textarea
              id={`${fieldId}-entregables`}
              rows={2}
              value={formEntregables}
              onChange={(e) => setFormEntregables(e.target.value)}
              placeholder="Ej. 15 fotos de alta resolución + 3 cápsulas de video con testimonios..."
            />
          </div>
        </section>
      </form>
    </PanelShell>
  );
}

const FORM_ID = "tarea-comunicacion-form";
