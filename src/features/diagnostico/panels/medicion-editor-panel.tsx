"use client";

import {useState, type FormEvent} from "react";
import {toast} from "sonner";
import {Lock, CheckCircle2} from "lucide-react";
import {PanelShell} from "@/core/panels/panel-shell";
import {usePanels} from "@/core/panels/panel-store";
import type {PanelComponentProps} from "@/app/_composition/panel-registry";
import {Button} from "@/shared/ui/button";
import {FormField} from "@/shared/ui/form-field";
import {Input} from "@/shared/ui/input";
import {Textarea} from "@/shared/ui/textarea";
import {Badge} from "@/shared/ui/badge";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {puedeEditar} from "@/features/plataforma/models/acceso";
import {registrarMedicionIndicador} from "../services/indicadores-api";

export function MedicionEditorPanel({
  entryKey,
  props,
}: PanelComponentProps<"medicion-editor">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const editable = puedeEditar(sesion, "diagnostico") && !props.soloLectura;

  const { fichaId, codigoIndicador, nombreIndicador, unidadMedida } = props;

  const [periodo, setPeriodo] = useState("2026-Q1");
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10));
  const [valorMedido, setValorMedido] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [evidenciaUrl, setEvidenciaUrl] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editable) {
      toast.error("No tienes permisos para registrar mediciones en este módulo.");
      return;
    }

    const valorNum = parseFloat(valorMedido);
    if (isNaN(valorNum)) {
      toast.error("Por favor ingresa un valor medido numérico válido.");
      return;
    }

    if (!periodo.trim()) {
      toast.error("El periodo es obligatorio (ej. 2026-Q1).");
      return;
    }

    setGuardando(true);
    try {
      const nombreRegistrador =
        [sesion?.usuario?.nombres, sesion?.usuario?.apellidos]
          .filter(Boolean)
          .join(" ") || "Funcionario Autorizado";

      await registrarMedicionIndicador(fichaId, {
        periodo: periodo.trim(),
        fecha_corte: fechaCorte,
        valor_medido: valorNum,
        observaciones: observaciones.trim() || undefined,
        evidencia_documental_url: evidenciaUrl.trim() || undefined,
        registrado_por: nombreRegistrador,
      });

      toast.success("Medición técnica radicada exitosamente en el sistema oficial.");
      closeTop();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar la medición";
      toast.error(`No se pudo radicar la medición: ${msg}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Línea Base de Diagnóstico" }]}
      kicker="Seguimiento Cuantitativo · Indicadores de Política"
      title="Registrar Medición de Línea Base"
      subtitle={`${codigoIndicador ?? "IND"} · ${nombreIndicador ?? "Indicador"}`}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        {/* Banner de solo lectura para auditor */}
        {!editable && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-surface-2 p-3.5 text-xs text-text-secondary">
            <Lock className="size-4 shrink-0 text-warning mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-text-primary font-semibold">
                Modo de Solo Consulta Pericial
              </strong>
              <p className="mt-0.5">
                Tu perfil de usuario está en modo auditoría. Los controles de ingreso de nuevas mediciones se encuentran inhabilitados.
              </p>
            </div>
          </div>
        )}

        {/* Ficha resumen del indicador */}
        <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-text-primary">
              {codigoIndicador ?? "INDICADOR"}
            </span>
            {unidadMedida && (
              <Badge variant="outline" className="text-[11px]">
                Unidad: {unidadMedida}
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {nombreIndicador ?? "Ficha técnica de indicador oficial"}
          </p>
        </div>

        {/* Datos de la medición */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Periodo de medición" required>
              {(field) => (
                <Input
                  {...field}
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  placeholder="ej. 2026-Q1, 2026-03"
                  disabled={!editable || guardando}
                  maxLength={20}
                />
              )}
            </FormField>

            <FormField label="Fecha de corte oficial" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  disabled={!editable || guardando}
                />
              )}
            </FormField>
          </div>

          <FormField
            label={`Valor medido en el periodo (${unidadMedida ?? "unidades"})`}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                step="any"
                value={valorMedido}
                onChange={(e) => setValorMedido(e.target.value)}
                placeholder="ej. 28.5"
                disabled={!editable || guardando}
              />
            )}
          </FormField>

          <FormField label="Observaciones metodológicas o técnicas">
            {(field) => (
              <Textarea
                {...field}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Anotaciones sobre consistencia del dato, limitaciones de la muestra o novedades operativas..."
                disabled={!editable || guardando}
                rows={3}
              />
            )}
          </FormField>

          <FormField label="URL de evidencia documental / boletín técnico">
            {(field) => (
              <Input
                {...field}
                type="url"
                value={evidenciaUrl}
                onChange={(e) => setEvidenciaUrl(e.target.value)}
                placeholder="https://datos.cartagena.gov.co/boletin_2026_q1.pdf"
                disabled={!editable || guardando}
                maxLength={500}
              />
            )}
          </FormField>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeTop}
            disabled={guardando}
          >
            Cancelar
          </Button>
          {editable && (
            <Button
              type="submit"
              size="sm"
              disabled={guardando}
              className="gap-2 bg-ember text-text-inverse hover:bg-ember-hover"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span>{guardando ? "Radicando..." : "Radicar Medición"}</span>
            </Button>
          )}
        </div>
      </form>
    </PanelShell>
  );
}
