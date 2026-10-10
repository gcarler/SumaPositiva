"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CheckSquare,
  Building,
  Target,
  Calendar,
  DollarSign,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileDown,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { useCompromisosStore } from "../state/compromisos-store";
import type { EstadoCompromiso } from "../models/compromiso";
import { ESTADOS_COMPROMISO, ENTIDADES_DISTRITALES_CARTAGENA } from "../models/compromiso";

export function CompromisoEditorPanel({
  entryKey,
  props,
}: PanelComponentProps<"compromiso-editor">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario = puedeEditar(sesion, "seguimiento");
  const esSoloLectura = props.soloLectura ?? !puedeEditarUsuario;

  const compromisoId = props.compromisoId;
  const compromiso = useCompromisosStore((s) =>
    compromisoId ? s.getById(compromisoId) : undefined
  );
  const actualizarAvance = useCompromisosStore((s) => s.actualizarAvance);
  const agregarCompromiso = useCompromisosStore((s) => s.agregarCompromiso);

  const esModoCrear = props.modo === "crear" || !compromiso;

  // Estados de Formulario de Actualización de Avance
  const [avanceValor, setAvanceValor] = useState<number>(
    compromiso?.avance_cuatrienal_valor ?? 0
  );
  const [estado, setEstado] = useState<EstadoCompromiso>(
    compromiso?.estado ?? "en_ejecucion"
  );
  const [fechaCorte, setFechaCorte] = useState<string>(
    compromiso?.fecha_corte_ultimo_reporte ?? new Date().toISOString().split("T")[0]
  );
  const [observacion, setObservacion] = useState<string>(
    compromiso?.metadatos?.observacion_cualitativa ? String(compromiso.metadatos.observacion_cualitativa) : ""
  );
  const [urlEvidencia, setUrlEvidencia] = useState<string>(
    compromiso?.metadatos?.url_evidencia ? String(compromiso.metadatos.url_evidencia) : ""
  );

  // Estados adicionales si es modo creación
  const [codigo, setCodigo] = useState<string>(
    `PAS-SEC-${Math.floor(10 + Math.random() * 90)}`
  );
  const [nombre, setNombre] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [entidad, setEntidad] = useState<string>(ENTIDADES_DISTRITALES_CARTAGENA[0]);
  const [metaValor, setMetaValor] = useState<number>(100);
  const [unidadMedida, setUnidadMedida] = useState<string>("Porcentaje");
  const [presupuestoAnual, setPresupuestoAnual] = useState<number>(1000000000);

  const formatoMoneda = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "No asignado";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const metaObjetivo = compromiso ? compromiso.meta_cuatrienal_valor : metaValor;
  const porcentajeCalculado = Math.min(
    100,
    Math.max(0, Math.round((avanceValor / (metaObjetivo || 1)) * 100))
  );

  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (esSoloLectura || guardando) return;

    setGuardando(true);
    try {
      if (esModoCrear) {
        if (!nombre.trim()) {
          toast.error("El nombre del compromiso es obligatorio.");
          setGuardando(false);
          return;
        }
        const creado = await agregarCompromiso({
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || nombre.trim(),
          entidad_responsable: entidad,
          linea_estrategica_codigo: "LE-01",
          alternativa_mga_codigo: "ALT-ESCNNA-01",
          indicador_asociado_codigo: "IND-PROD-01",
          meta_cuatrienal_descripcion: `Alcanzar ${metaValor} ${unidadMedida}`,
          meta_cuatrienal_valor: metaValor,
          unidad_medida: unidadMedida,
          avance_cuatrienal_valor: avanceValor,
          porcentaje_cumplimiento: porcentajeCalculado,
          presupuesto_anual_cop: presupuestoAnual,
          vigencias_programadas: [2026, 2027, 2028, 2029],
          estado,
          fecha_corte_ultimo_reporte: fechaCorte,
          metadatos: {
            observacion_cualitativa: observacion,
            url_evidencia: urlEvidencia,
            registrado_por: sesion?.usuario ?? "sistema",
          },
        });
        if (!creado) {
          const errMsg = useCompromisosStore.getState().error || "Fallo en la persistencia del backend";
          toast.error(`Error al registrar compromiso: ${errMsg}`);
          setGuardando(false);
          return;
        }
        toast.success(`Compromiso ${codigo} registrado en el Plan de Acción y Seguimiento.`);
      } else if (compromisoId) {
        const exito = await actualizarAvance(compromisoId, {
          avance_cuatrienal_valor: avanceValor,
          estado,
          fecha_corte_ultimo_reporte: fechaCorte,
          observacion_cualitativa: observacion,
          url_evidencia: urlEvidencia,
        });
        if (!exito) {
          const errMsg = useCompromisosStore.getState().error || "Fallo en la persistencia del backend";
          toast.error(`Error al actualizar avance: ${errMsg}`);
          setGuardando(false);
          return;
        }
        toast.success(
          `Avance de ${compromiso?.codigo} actualizado al ${porcentajeCalculado}% (${estado}).`
        );
      }

      props.onGuardado?.();
      closeTop();
    } catch (err) {
      toast.error(`Error al persistir compromiso: ${(err as Error).message || "Acción denegada"}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarJson = () => {
    const payload = compromiso ?? {
      codigo,
      nombre,
      entidad,
      avance_cuatrienal_valor: avanceValor,
      porcentaje_cumplimiento: porcentajeCalculado,
      estado,
      observacion,
      urlEvidencia,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compromiso-${compromiso?.codigo ?? codigo}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Expediente pericial del compromiso exportado.");
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Seguimiento PAS" }, { label: "Gestión de Compromiso" }]}
      kicker="Plan de Acción y Seguimiento Distrital"
      title={
        esModoCrear
          ? "Nuevo Compromiso Institucional PAS"
          : `Compromiso ${compromiso?.codigo}`
      }
      subtitle="Actualización de avance cuatrienal, verificación de metas físicas y trazabilidad de evidencias documentales"
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Banner de solo lectura para auditor forense */}
        {esSoloLectura && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-surface-2">
            <Lock className="size-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-primary">
                Modo de Supervisión Técnica Forense
              </p>
              <p className="text-xs text-text-secondary">
                Este formulario se encuentra inmutable para su perfil. Puede verificar la evolución de las metas, fechas de corte y soportes documentales con fines periciales.
              </p>
            </div>
          </div>
        )}

        {/* Identificación del Compromiso */}
        {!esModoCrear && compromiso ? (
          <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="size-3.5 text-ember" aria-hidden="true" />
                Compromiso Institucional
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-border text-text-primary font-mono text-[10px]">
                  {compromiso.codigo}
                </Badge>
                {compromiso.metadatos?.meta_validada === false && (
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/30 bg-warning/10 gap-1">
                    <AlertTriangle className="size-3 text-warning" aria-hidden="true" />
                    Meta propuesta (sin validar)
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-text-primary">
                {compromiso.nombre}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {compromiso.descripcion}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
              <Badge variant="outline" className="border-border text-text-secondary text-[11px] gap-1">
                <Building className="size-3 text-text-muted" aria-hidden="true" />
                {compromiso.entidad_responsable}
              </Badge>
              <Badge variant="outline" className="border-border text-text-secondary text-[11px] gap-1">
                <Target className="size-3 text-text-muted" aria-hidden="true" />
                Alternativa: {compromiso.alternativa_mga_codigo}
              </Badge>
              <Badge variant="outline" className="border-border text-text-secondary text-[11px] gap-1">
                <DollarSign className="size-3 text-text-muted" aria-hidden="true" />
                {formatoMoneda(compromiso.presupuesto_anual_cop)} / año
              </Badge>
              {compromiso.metadatos?.fuente && (
                <div className="w-full text-[11px] text-text-muted italic pt-1">
                  Fuente: {compromiso.metadatos.fuente}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="size-3.5 text-ember" aria-hidden="true" />
              Datos del Nuevo Compromiso PAS
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Código Oficial PAS" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    disabled={esSoloLectura}
                    placeholder="PAS-SEC-XX"
                    className="font-mono text-xs uppercase bg-surface-2 border-border"
                  />
                )}
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Entidad Distrital Responsable" required>
                  {({ id }) => (
                    <Select
                      value={entidad}
                      onValueChange={setEntidad}
                      disabled={esSoloLectura}
                    >
                      <SelectTrigger id={id} aria-label="Entidad Distrital Responsable" className="w-full text-xs bg-surface-2 border-border">
                        <SelectValue placeholder="Seleccione entidad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTIDADES_DISTRITALES_CARTAGENA.map((ent) => (
                          <SelectItem key={ent} value={ent} className="text-xs">
                            {ent}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              </div>
            </div>

            <FormField label="Nombre del Compromiso" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={esSoloLectura}
                  placeholder="Denominación institucional de la acción..."
                  className="text-xs bg-surface-2 border-border"
                />
              )}
            </FormField>

            <FormField label="Descripción Operativa">
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={esSoloLectura}
                  placeholder="Alcance, beneficiarios y actividades a ejecutar..."
                  className="text-xs bg-surface-2 border-border"
                />
              )}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Meta Cuatrienal (Valor)" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    value={metaValor}
                    onChange={(e) => setMetaValor(Number(e.target.value))}
                    disabled={esSoloLectura}
                    className="text-xs bg-surface-2 border-border font-mono"
                  />
                )}
              </FormField>

              <FormField label="Unidad de Medida" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    disabled={esSoloLectura}
                    placeholder="ej. Jóvenes certificados"
                    className="text-xs bg-surface-2 border-border"
                  />
                )}
              </FormField>

              <FormField label="Presupuesto Anual (COP)" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    step={10000000}
                    value={presupuestoAnual}
                    onChange={(e) => setPresupuestoAnual(Number(e.target.value))}
                    disabled={esSoloLectura}
                    className="text-xs bg-surface-2 border-border font-mono"
                  />
                )}
              </FormField>
            </div>
          </div>
        )}

        {/* Medición de Avance y Estado de Cumplimiento */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Target className="size-3.5 text-ember" aria-hidden="true" />
            Reporte de Avance Físico y Cumplimiento
          </span>

          <div className="p-3.5 rounded-lg border border-border bg-surface-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                Meta Cuatrienal: <strong>{metaObjetivo} {compromiso?.unidad_medida ?? unidadMedida}</strong>
              </span>
              <span className="font-bold text-text-primary">
                Avance: {avanceValor} ({porcentajeCalculado}%)
              </span>
            </div>

            {/* Barra de progreso interactiva */}
            <div
              role="progressbar"
              aria-valuenow={porcentajeCalculado}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Porcentaje de avance calculado"
              className="w-full h-2 rounded-full bg-surface-3 overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  porcentajeCalculado >= 100
                    ? "bg-success"
                    : porcentajeCalculado < 30
                      ? "bg-danger"
                      : porcentajeCalculado < 50
                        ? "bg-warning"
                        : "bg-accent"
                }`}
                style={{ width: `${Math.min(porcentajeCalculado, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Valor Acumulado Medido" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={avanceValor}
                  onChange={(e) => setAvanceValor(Number(e.target.value))}
                  disabled={esSoloLectura}
                  className="bg-surface-2 border-border text-xs font-mono"
                />
              )}
            </FormField>

            <FormField label="Estado de Cumplimiento" required>
              {({ id }) => (
                <Select
                  value={estado}
                  onValueChange={(val) => setEstado(val as EstadoCompromiso)}
                  disabled={esSoloLectura}
                >
                  <SelectTrigger id={id} aria-label="Estado de Cumplimiento" className="w-full bg-surface-2 border-border text-xs">
                    <SelectValue placeholder="Estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADOS_COMPROMISO).map(([k, info]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          <FormField label="Fecha de Corte del Reporte" required>
            {({ id }) => (
              <div className="relative">
                <Calendar className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <Input
                  id={id}
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  disabled={esSoloLectura}
                  className="pl-8 bg-surface-2 border-border text-xs font-mono"
                />
              </div>
            )}
          </FormField>
        </div>

        {/* Trazabilidad Pericial y Evidencias Documentales */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="size-3.5 text-ember" aria-hidden="true" />
            Trazabilidad Pericial y Evidencias
          </span>

          <FormField label="Observación Técnica / Reporte Cualitativo">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                placeholder="Detalle de actividades, operativos, beneficiarios e hitos alcanzados..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                disabled={esSoloLectura}
                className="bg-surface-2 border-border text-xs leading-relaxed"
              />
            )}
          </FormField>

          <FormField label="URL o Radicado de Evidencia Documental (Actas / Memorandos / SIGEP)">
            {({ id }) => (
              <div className="relative">
                <LinkIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <Input
                  id={id}
                  type="text"
                  placeholder="https://gestion.cartagena.gov.co/radicado-2026-..."
                  value={urlEvidencia}
                  onChange={(e) => setUrlEvidencia(e.target.value)}
                  disabled={esSoloLectura}
                  className="pl-8 bg-surface-2 border-border text-xs font-mono"
                />
              </div>
            )}
          </FormField>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportarJson}
            className="h-9 px-3 text-xs gap-1.5"
          >
            <FileDown className="size-3.5" aria-hidden="true" />
            <span>Exportar JSON</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closeTop}
            className="h-9 px-4 text-xs"
          >
            Cancelar
          </Button>

          {!esSoloLectura && (
            <Button
              type="submit"
              disabled={guardando}
              size="sm"
              className="h-9 px-4 text-xs gap-1.5 bg-ember hover:bg-ember/90 text-text-inverse font-semibold disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              <span>
                {guardando
                  ? "Guardando..."
                  : esModoCrear
                  ? "Registrar Compromiso"
                  : "Actualizar Avance Institucional"}
              </span>
            </Button>
          )}
        </div>
      </form>
    </PanelShell>
  );
}
