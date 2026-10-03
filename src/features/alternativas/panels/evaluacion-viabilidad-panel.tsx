"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Scale,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Layers,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import { useAlternativasStore } from "../state/alternativas-store";
import type { EvaluacionViabilidadIntegral } from "../models/viabilidad";
import { evaluarViabilidadIntegral } from "../services/viabilidad-api";

export function EvaluacionViabilidadPanel({
  entryKey,
  props,
}: PanelComponentProps<"evaluacion-viabilidad">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeEditarUsuario = puedeEditar(sesion, "alternativas") && !props.soloLectura;

  const alternativaId = props.alternativaId;
  const alternativa = useAlternativasStore((s) => s.getById(alternativaId));
  const cambiarEstado = useAlternativasStore((s) => s.cambiarEstado);

  const [evaluacion, setEvaluacion] = useState<EvaluacionViabilidadIntegral | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;

    async function ejecutarEvaluacion() {
      if (!alternativa) {
        setCargando(false);
        return;
      }
      setCargando(true);
      try {
        const resultado = await evaluarViabilidadIntegral(alternativa);
        if (!cancelado) {
          setEvaluacion(resultado);
        }
      } catch (err) {
        if (!cancelado) {
          toast.error("Error al procesar la evaluación con los Agentes de IA.");
          console.error(err);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    ejecutarEvaluacion();

    return () => {
      cancelado = true;
    };
  }, [alternativa]);

  const handleExportarJson = () => {
    if (!evaluacion) return;
    const blob = new Blob([JSON.stringify(evaluacion, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dictamen_viabilidad_${evaluacion.codigoAlternativa}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Dictamen pericial exportado a JSON.");
  };

  const handleAplicarVeredicto = () => {
    if (!evaluacion || !alternativa || !puedeEditarUsuario) return;

    let nuevoEstado: "viable" | "requiere_ajustes" | "descartada" = "viable";
    if (evaluacion.veredictoConsolidado === "VIABLE") {
      nuevoEstado = "viable";
    } else if (evaluacion.veredictoConsolidado === "VIABLE CON CONDICIONES") {
      nuevoEstado = "requiere_ajustes";
    } else {
      nuevoEstado = "descartada";
    }

    cambiarEstado(alternativa.id, nuevoEstado);
    toast.success(
      `Estado de la alternativa ${alternativa.codigo} actualizado a '${nuevoEstado}'.`
    );
  };

  if (!alternativa) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Banco de Alternativas MGA" }]}
        kicker="Evaluación Pericial IA · MGA DNP"
        title="Alternativa No Encontrada"
        subtitle="No se encontró la iniciativa seleccionada en el banco distrital."
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="p-6 text-center text-sm text-text-muted">
          La alternativa solicitada no existe o fue retirada del sistema.
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[
        { label: "Banco de Alternativas MGA" },
        { label: alternativa.codigo },
      ]}
      kicker="Agentes Multi-IA · AgenteJuridico & AgenteFiscal"
      title={`Dictamen Pericial de Viabilidad · ${alternativa.codigo}`}
      subtitle={alternativa.nombre}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 p-4">
        {/* Cabecera de la Alternativa y Veredicto */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
            <div>
              <span className="font-mono text-xs font-semibold text-text-muted uppercase">
                {alternativa.codigo} · Sector {alternativa.sector}
              </span>
              <h3 className="text-base font-bold text-text-primary">
                {alternativa.nombre}
              </h3>
              <p className="mt-1 text-xs text-text-muted">
                {alternativa.territorio_cobertura} · {alternativa.poblacion_objetivo_estimada.toLocaleString("es-CO")} personas beneficiarias
              </p>
            </div>

            {/* Veredicto Consolidado */}
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-[11px] font-semibold text-text-muted">
                Veredicto Consolidado MGA
              </span>
              {cargando ? (
                <span className="text-xs text-text-muted animate-pulse">
                  Evaluando con Agentes IA...
                </span>
              ) : evaluacion ? (
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold border ${
                    evaluacion.veredictoConsolidado === "VIABLE"
                      ? "bg-success-soft text-success border-success/30"
                      : evaluacion.veredictoConsolidado === "VIABLE CON CONDICIONES"
                      ? "bg-warning-soft text-warning border-warning/30"
                      : "bg-danger-soft text-danger border-danger/30"
                  }`}
                >
                  {evaluacion.veredictoConsolidado}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 text-xs sm:grid-cols-4">
            <div>
              <span className="text-text-muted block">Inversión Cuatrienal</span>
              <strong className="text-text-primary font-mono">
                $ {alternativa.costo_estimado_cop.toLocaleString("es-CO")} COP
              </strong>
            </div>
            <div>
              <span className="text-text-muted block">Horizonte Temporal</span>
              <strong className="text-text-primary">
                {alternativa.horizonte_anios} años
              </strong>
            </div>
            <div>
              <span className="text-text-muted block">Línea Estratégica</span>
              <strong className="text-text-primary">
                {alternativa.linea_estrategica_codigo}
              </strong>
            </div>
            <div>
              <span className="text-text-muted block">Salvaguarda Étnica</span>
              <strong className={alternativa.requiere_consulta_previa ? "text-warning" : "text-text-primary"}>
                {alternativa.requiere_consulta_previa ? "Ley 70 / OIT 169" : "General"}
              </strong>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-accent animate-spin" />
            <h4 className="text-sm font-semibold text-text-primary">
              Consultando AgenteJuridico y AgenteFiscal en el backend...
            </h4>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Analizando competencias bajo la Ley Orgánica 1454 de 2011 (LOOT), salvaguardas de Consulta Previa (Convenio 169 OIT), restricciones de no regresividad DESCA y reglas de Vigencias Futuras (Ley 1483 de 2011).
            </p>
          </div>
        ) : evaluacion ? (
          <>
            {/* 1. Módulo de Dictamen Jurídico y Constitucional */}
            <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Scale className="h-4 w-4 text-accent" />
                  Dictamen Jurídico y Constitucional (AgenteJuridico)
                </h4>
                <Badge
                  variant={evaluacion.juridico.es_viable ? "default" : "destructive"}
                  className="text-xs"
                >
                  {evaluacion.juridico.es_viable ? "Viabilidad Jurídica Superada" : "Inviable"}
                </Badge>
              </div>

              {/* Competencias bajo LOOT y Ley 1617/13 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
                  <span className="font-semibold text-text-muted block">
                    Titularidad de Competencia (Ley 1454/11 LOOT)
                  </span>
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <Building2 className="h-3.5 w-3.5 text-accent" />
                    <span>Nivel {evaluacion.juridico.nivel_competencia.toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {evaluacion.juridico.fundamento_competencia}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
                  <span className="font-semibold text-text-muted block">
                    Instrumento de Adopción Normativa
                  </span>
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <BookOpen className="h-3.5 w-3.5 text-ember" />
                    <span>{evaluacion.juridico.instrumento_adopcion_recomendado}</span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Exige trámite reglamentario ante el Concejo o Decreto de la Alcaldía de Cartagena.
                  </p>
                </div>
              </div>

              {/* Alerta de Consulta Previa Convenio 169 OIT */}
              {evaluacion.juridico.alerta_consulta_previa.requiere_consulta_previa ? (
                <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-warning">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>SALVAGUARDA ÉTNICA ACTIVA: Consulta Previa Preceptiva Obligatoria</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    {evaluacion.juridico.alerta_consulta_previa.criterio_afectacion_directa}
                  </p>
                  <div className="text-[11px] text-text-muted pt-1 border-t border-warning/20">
                    <strong>Fundamento Constitucional:</strong> {evaluacion.juridico.alerta_consulta_previa.fundamento_constitucional}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-text-muted">
                  <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                  <span>
                    No se identificó afectación directa sobre territorios de comunidades étnicas con titulación colectiva protegida.
                  </span>
                </div>
              )}

              {/* Concepto Jurídico Motivado */}
              <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-xs space-y-1">
                <span className="font-semibold text-text-primary block">
                  Concepto Jurídico Motivado:
                </span>
                <p className="text-text-secondary leading-relaxed">
                  {evaluacion.juridico.concepto_juridico_motivado}
                </p>
              </div>

              {/* Recomendaciones Jurídicas */}
              {evaluacion.juridico.recomendaciones_juridicas.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-text-primary">
                    Recomendaciones Jurídicas del Agente:
                  </span>
                  <ul className="list-disc pl-4 text-xs text-text-muted space-y-1">
                    {evaluacion.juridico.recomendaciones_juridicas.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 2. Módulo de Dictamen Fiscal y Presupuestal */}
            <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <DollarSign className="h-4 w-4 text-success" />
                  Dictamen Fiscal y Presupuestal (AgenteFiscal)
                </h4>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    evaluacion.fiscal.riesgo_fiscal === "bajo"
                      ? "bg-success-soft text-success border-success/30"
                      : evaluacion.fiscal.riesgo_fiscal === "medio"
                      ? "bg-warning-soft text-warning border-warning/30"
                      : "bg-danger-soft text-danger border-danger/30"
                  }`}
                >
                  Riesgo Fiscal {evaluacion.fiscal.riesgo_fiscal.toUpperCase()}
                </span>
              </div>

              {/* Desglose de Fuentes de Financiación */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-success" />
                  Estructura de Financiación Distrital Recomendada:
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {evaluacion.fiscal.fuentes_recomendadas.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-surface-2 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-text-primary">{f.fuente}</span>
                        <span className="font-mono text-success">
                          {f.porcentaje}% · $ {f.monto_estimado_cop.toLocaleString("es-CO")}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        <strong>Base:</strong> {f.base_legal}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        <strong>Destinación:</strong> {f.destinacion_permitida}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerta de Vigencias Futuras Excepcionales */}
              {evaluacion.fiscal.alerta_vigencias_futuras.trasciende_periodo_gobierno ? (
                <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-warning">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>ALERTA LEY 1483/11: Vigencias Futuras Excepcionales Requeridas</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    El proyecto tiene un horizonte de {alternativa.horizonte_anios} años y trasciende el período de gobierno distrital en curso.
                    Exige autorización previa mediante Proyecto de Acuerdo ante el <strong>Concejo Distrital de Cartagena</strong> y concepto favorable del <strong>CONFIS Distrital</strong>.
                  </p>
                  <div className="text-[11px] text-text-muted pt-1 border-t border-warning/20">
                    <strong>Plazo Máximo Legal:</strong> {evaluacion.fiscal.alerta_vigencias_futuras.ano_maximo_compromiso_concejo}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-text-muted">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span>
                    El horizonte de ejecución ({alternativa.horizonte_anios} años) se encuentra acotado al período de gobierno ordinario.
                  </span>
                </div>
              )}

              {/* Dictamen Fiscal Motivado */}
              <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-xs space-y-1">
                <span className="font-semibold text-text-primary block">
                  Dictamen Presupuestal Motivado:
                </span>
                <p className="text-text-secondary leading-relaxed">
                  {evaluacion.fiscal.dictamen_fiscal_motivado}
                </p>
              </div>

              {/* Recomendaciones Presupuestales */}
              {evaluacion.fiscal.recomendaciones_presupuestales.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-text-primary">
                    Recomendaciones Fiscales del Agente:
                  </span>
                  <ul className="list-disc pl-4 text-xs text-text-muted space-y-1">
                    {evaluacion.fiscal.recomendaciones_presupuestales.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Barra de Acciones Resolutivas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportarJson}
            disabled={!evaluacion}
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Exportar Dictamen JSON</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={closeTop}
            >
              Cerrar
            </Button>

            {puedeEditarUsuario && evaluacion && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1.5 text-xs font-medium"
                onClick={handleAplicarVeredicto}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Aplicar Veredicto MGA</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
