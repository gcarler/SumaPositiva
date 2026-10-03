"use client";

import { toast } from "sonner";
import {
  FileText,
  MapPin,
  Calendar,
  User,
  Radio,
  Scale,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Download,
  ShieldCheck,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { useDevolucionStore } from "../state/devolucion-store";
import {
  ESTADOS_INCORPORACION_INFO,
  CAUSALES_DESCARTE_INFO,
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
          <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3.5 text-xs text-text-primary">
            <ShieldCheck className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <span className="font-semibold text-accent">
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
              <span className="font-mono text-xs font-semibold text-accent">
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
            <FileText className="h-4 w-4 text-accent" />
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

          {/* Caso 1: Incorporada Total o Parcial */}
          {propuesta.estado_incorporacion !== "NO_INCORPORADA_MOTIVADA" ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success-soft p-3.5 text-xs text-text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                <div>
                  <span className="font-semibold text-success">
                    Propuesta Acogida en el Plan de Acción y Seguimiento
                  </span>
                  <p className="mt-1 text-text-secondary leading-relaxed">
                    {propuesta.motivacion_sustancial}
                  </p>
                </div>
              </div>

              {propuesta.compromiso_pas_codigo && (
                <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
                  <span className="text-text-muted text-[11px]">Compromiso Institucional Articulado:</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-accent">
                      {propuesta.compromiso_pas_codigo}
                    </span>
                    <span className="text-text-primary font-medium truncate">
                      {propuesta.compromiso_pas_nombre}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
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

              {causalInfo && (
                <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-2">
                  <div>
                    <span className="text-[11px] text-text-muted">Causal Jurídica Taxativa:</span>
                    <p className="font-semibold text-text-primary mt-0.5">{causalInfo.label}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted">Fundamento Legal / Constitucional:</span>
                    <p className="font-mono text-[11px] text-text-secondary mt-0.5">
                      {propuesta.norma_invocada ?? causalInfo.norma}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted">Ruta o Canal de Gestión Alternativo:</span>
                    <p className="text-text-primary font-medium mt-0.5">
                      {propuesta.ruta_alternativa ?? causalInfo.canalSugerido}
                    </p>
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
