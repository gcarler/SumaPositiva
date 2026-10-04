"use client";

import {useState, useEffect} from "react";
import {toast} from "sonner";
import {
  FileText,
  MapPin,
  Calendar,
  User,
  Radio,
  Scale,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Download,
  ShieldCheck,
  Send,
  Clock
} from "lucide-react";
import {PanelShell} from "@/core/panels/panel-shell";
import {usePanels} from "@/core/panels/panel-store";
import type {PanelComponentProps} from "@/app/_composition/panel-registry";
import {Button} from "@/shared/ui/button";
import {Badge} from "@/shared/ui/badge";
import {Label} from "@/shared/ui/label";
import {Textarea} from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {useDevolucionStore} from "../state/devolucion-store";
import {
  ESTADOS_INCORPORACION_INFO,
  CAUSALES_DESCARTE_INFO
} from "../models/devolucion";

export function DevolucionDetallePanel({
  entryKey,
  props,
}: PanelComponentProps<"devolucion-detalle">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const esAuditor =
    sesion?.rol === "auditor_forense" || Boolean(props?.soloLectura);

  const propuestaId = props?.propuestaId;
  const propuesta = useDevolucionStore((s) =>
    propuestaId
      ? s.propuestas.find((p) => p.id === propuestaId || p.codigo === propuestaId) ?? null
      : null
  );

  const registrarDevolucionMotivada = useDevolucionStore((s) => s.registrarDevolucionMotivada);
  const cargarHistorialDevolucion = useDevolucionStore((s) => s.cargarHistorialDevolucion);
  const historialDevoluciones = useDevolucionStore((s) => s.historialDevoluciones);
  const guardando = useDevolucionStore((s) => s.guardando);

  const [causalSeleccionada, setCausalSeleccionada] = useState<string>("tecnica");
  const [justificacionTexto, setJustificacionTexto] = useState<string>("");

  useEffect(() => {
    if (propuesta?.id) {
      cargarHistorialDevolucion(propuesta.id);
    }
  }, [propuesta?.id, cargarHistorialDevolucion]);

  const handleRadicarDevolucion = async () => {
    if (!propuesta) return;
    if (justificacionTexto.trim().length < 20) {
      toast.error("La justificación motivada debe contener al menos 20 caracteres sustanciales.");
      return;
    }

    const res = await registrarDevolucionMotivada(propuesta.id, {
      causal: causalSeleccionada,
      justificacion_motivada: justificacionTexto.trim(),
    });

    if (res.exito) {
      toast.success("Devolución motivada radicada y registrada en auditoría forense conforme a la Sentencia C-150/15.");
      setJustificacionTexto("");
    } else {
      toast.error(res.error || "No fue posible radicar la devolución motivada.");
    }
  };

  const exportarExpedienteJSON = () => {
    if (!propuesta) return;
    try {
      const blob = new Blob([JSON.stringify(propuesta, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expediente_devolucion_${propuesta.codigo}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Expediente pericial de devolución exportado.");
    } catch {
      toast.error("Error al exportar expediente.");
    }
  };

  if (!propuesta) {
    return (
      <PanelShell
        entryKey={entryKey}
        title="Ficha de Devolución C-150"
        subtitle="Propuesta no encontrada"
        crumbs={[{ label: "Seguimiento PAS" }, { label: "Devolución Ciudadana" }]}
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-text-muted">
          <HelpCircle className="h-10 w-10 text-text-muted" />
          <p className="mt-3">No se especificó una propuesta válida para consultar.</p>
          <Button variant="outline" size="sm" onClick={closeTop} className="mt-4">
            Cerrar panel
          </Button>
        </div>
      </PanelShell>
    );
  }

  const estadoInfo = ESTADOS_INCORPORACION_INFO[propuesta.estado_incorporacion];
  const causalInfo = propuesta.causal_descarte
    ? CAUSALES_DESCARTE_INFO[propuesta.causal_descarte]
    : null;

  return (
    <PanelShell
      entryKey={entryKey}
      title={`Ficha de Devolución Motivada · ${propuesta.codigo}`}
      subtitle={propuesta.titulo}
      crumbs={[
        { label: "Seguimiento PAS" },
        { label: "Rendición de Cuentas" },
        { label: propuesta.codigo },
      ]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* Banner de Modo Solo Lectura para Auditor Forense */}
        {esAuditor && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3.5 text-xs text-text-primary">
            <ShieldCheck className="h-5 w-5 shrink-0 text-ember" />
            <div>
              <span className="font-semibold text-text-primary">
                Inspección Pericial — Solo Lectura
              </span>
              <p className="mt-0.5 text-text-muted">
                Expediente ciudadano inmutable conforme a los estándares de veeduría y control forense EAF.
              </p>
            </div>
          </div>
        )}

        {/* Encabezado con Estado y Metadatos de Radicación */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-text-primary">
                {propuesta.codigo}
              </span>
              <Badge variant={estadoInfo.badgeVariant}>
                {estadoInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              <span>Radicado: {propuesta.fecha_radicacion}</span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="text-text-primary font-medium">{propuesta.territorio}</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <Radio className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span>Canal: <strong className="text-text-primary uppercase">{propuesta.canal_origen}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted truncate">
              <User className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{propuesta.autor_nombre}</span>
            </div>
          </div>
        </div>

        {/* Contenido Original de la Propuesta Ciudadana */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
            <FileText className="h-4 w-4 text-ember" />
            <span>Texto Original de la Propuesta Radicada</span>
          </div>
          <div className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-text-secondary">
            {propuesta.descripcion}
          </div>
        </div>

        {/* Dictamen Institucional y Motivación C-150 */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
              <Scale className="h-4 w-4 text-ember" />
              <span>Devolución Motivada (Sentencia C-150 de 2015)</span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Ley 1757 de 2015
            </Badge>
          </div>

          {/* Caso 1: Sin Respuesta (Pendiente de Motivación C-150) */}
          {propuesta.estado_incorporacion === "SIN_RESPUESTA" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3.5 text-xs text-text-primary">
                <Clock className="h-5 w-5 shrink-0 text-warning mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-warning">
                    Propuesta Ciudadana Pendiente de Respuesta
                  </span>
                  <p className="text-text-secondary leading-relaxed pt-0.5">
                    Esta iniciativa comunitaria no cuenta aún con respuesta formal. Conforme al deber de motivación sustancial (Sentencia C-150 de 2015), la administración distrital no puede descartar silenciosamente este aporte ciudadano.
                  </p>
                </div>
              </div>

              {esAuditor ? (
                <div className="rounded-lg border border-dashed border-border bg-surface-2 p-3 text-[11px] text-text-muted">
                  Modo Auditor: La emisión de devoluciones motivadas está reservada a la autoridad distrital competente.
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface-2/60 p-4 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-text-primary">
                    <Scale className="h-4 w-4 text-ember" />
                    <span>Radicar Devolución Motivada (C-150/15)</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Seleccione la causal jurídica o técnica taxativa y redacte los fundamentos sustanciales que motivan la no incorporación en el PAS.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-text-secondary">
                      Causal Taxativa de No Incorporación:
                    </Label>
                    <Select
                      value={causalSeleccionada}
                      onValueChange={setCausalSeleccionada}
                    >
                      <SelectTrigger aria-label="Causal Taxativa de No Incorporación" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnica" className="text-xs">
                          Inconsistencia Técnica / Metodológica (MGA)
                        </SelectItem>
                        <SelectItem value="juridica" className="text-xs">
                          Incompetencia Legal / Restricción Jurídica (LOOT)
                        </SelectItem>
                        <SelectItem value="presupuestal" className="text-xs">
                          Restricción Presupuestal / Fiscal (MFMP)
                        </SelectItem>
                        <SelectItem value="INCOMPETENCIA_LEGAL_LOOT" className="text-xs">
                          Incompetencia Legal LOOT (Ley 1454/11)
                        </SelectItem>
                        <SelectItem value="RESTRICCION_FISCAL_MFMP" className="text-xs">
                          Restricción Fiscal MFMP (Ley 819/03)
                        </SelectItem>
                        <SelectItem value="REQUERIMIENTO_CONSULTA_PREVIA" className="text-xs">
                          Requiere Consulta Previa (Convenio 169 OIT)
                        </SelectItem>
                        <SelectItem value="DUPLICIDAD_PROGRAMATICA" className="text-xs">
                          Duplicidad Programática (Ley 489/98)
                        </SelectItem>
                        <SelectItem value="INCOMPATIBILIDAD_NORMATIVA" className="text-xs">
                          Incompatibilidad Normativa (Ley 1801/16)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-text-secondary">
                      Justificación Sustancial Motivada (mínimo 20 caracteres):
                    </Label>
                    <Textarea
                      value={justificacionTexto}
                      onChange={(e) => setJustificacionTexto(e.target.value)}
                      placeholder="Redacte la motivación sustantiva y el fundamento legal que justifica la no incorporación..."
                      className="text-xs min-h-[90px]"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted">
                      <span>{justificacionTexto.trim().length} / 20 caracteres mínimos</span>
                      {justificacionTexto.trim().length < 20 && (
                        <span className="text-warning">Mínimo 20 caracteres requeridos</span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleRadicarDevolucion}
                    disabled={guardando || justificacionTexto.trim().length < 20}
                    className="w-full gap-2 text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{guardando ? "Radicando Devolución..." : "Radicar Devolución en Auditoría Forense"}</span>
                  </Button>
                </div>
              )}
            </div>
          ) : propuesta.estado_incorporacion === "NO_INCORPORADA_MOTIVADA" ? (
            /* Caso 2: No Incorporada con Causal Taxativa */
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft p-3.5 text-xs text-text-primary">
                <ShieldAlert className="h-5 w-5 shrink-0 text-danger mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-danger">
                      No Incorporada con Motivación Expresa (Proscripción del Descarte Silencioso)
                    </span>
                  </div>
                  <p className="text-text-secondary leading-relaxed pt-1">
                    {propuesta.motivacion_sustancial}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-2">
                <div>
                  <span className="text-[11px] text-text-muted">Causal Jurídica Taxativa:</span>
                  <p className="font-semibold text-text-primary mt-0.5">{causalInfo?.label ?? "Causal no registrada"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-text-muted">Fundamento Legal / Constitucional:</span>
                  <p className="font-mono text-[11px] text-text-secondary mt-0.5">
                    {propuesta.norma_invocada ?? causalInfo?.norma ?? "Pendiente de tipificación motivada (Sentencia C-150 de 2015)"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-text-muted">Ruta o Canal de Gestión Alternativo:</span>
                  <p className="text-text-primary font-medium mt-0.5">
                    {propuesta.ruta_alternativa ?? causalInfo?.canalSugerido ?? "Secretaría de Participación y Desarrollo Social"}
                  </p>
                </div>
              </div>

              {/* Trazabilidad Forense de Auditoría */}
              {historialDevoluciones[propuesta.id] && historialDevoluciones[propuesta.id].length > 0 && (
                <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-2">
                  <span className="text-[11px] font-semibold text-text-primary">
                    Registro Forense de Devolución (PostgreSQL):
                  </span>
                  {historialDevoluciones[propuesta.id].map((reg) => (
                    <div key={reg.id} className="border-t border-border pt-1.5 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between text-text-muted">
                        <span>Acción: <strong className="text-text-primary">{reg.accion}</strong></span>
                        <span>{new Date(reg.creado_en).toLocaleString("es-CO")}</span>
                      </div>
                      <div className="text-text-secondary">
                        Causal: <strong className="text-text-primary uppercase">{reg.causal}</strong>
                      </div>
                      <p className="text-text-muted italic">{reg.justificacion_motivada}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Caso 3: Incorporada Total o Parcial */
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success-soft p-3.5 text-xs text-text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                <div>
                  <span className="font-semibold text-success">
                    Propuesta Acogida en el Plan de Acción y Seguimiento
                  </span>
                  <p className="mt-1 text-text-secondary leading-relaxed">
                    {propuesta.motivacion_sustancial || "Iniciativa comunitaria articulada a los compromisos del PAS."}
                  </p>
                </div>
              </div>

              {propuesta.compromiso_pas_codigo && (
                <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
                  <span className="text-text-muted text-[11px]">Compromiso Institucional Articulado:</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-text-primary">
                      {propuesta.compromiso_pas_codigo}
                    </span>
                    <span className="text-text-primary font-medium truncate">
                      {propuesta.compromiso_pas_nombre}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Salvaguarda Institucional de Transparencia */}
        <div className="rounded-lg border border-dashed border-border bg-surface-2/60 p-3 text-[11px] text-text-muted leading-relaxed">
          <strong>Mandato de la Sentencia C-150 de 2015:</strong> La administración distrital garantiza que ninguna iniciativa comunitaria radicada en el marco de la formulación y seguimiento de la Política Pública de Seguridad Humana de Cartagena de Indias es excluida sin justificación expresa. Toda devolución queda radicada en el archivo de memoria institucional.
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExpedienteJSON}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar Expediente JSON</span>
          </Button>

          <Button variant="default" size="sm" onClick={closeTop}>
            Cerrar
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
