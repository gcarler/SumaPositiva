"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Activity,
  Calculator,
  Database,
  Building2,
  Calendar,
  ShieldCheck,
  Save,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Layers,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { FormField } from "@/shared/ui/form-field";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { useCadenaValorStore } from "../state/cadena-valor-store";
import {
  calcularAvancePorcentaje,
  obtenerSemaforoAvance,
} from "../models/indicador-dnp";

export function IndicadorDetallePanel({
  entryKey,
  props,
}: PanelComponentProps<"indicador-detalle">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);

  const esAuditor =
    sesion?.rol === "auditor_forense" || Boolean(props?.soloLectura);

  const getIndicadorById = useCadenaValorStore((s) => s.getIndicadorById);
  const registrarMedicionStore = useCadenaValorStore((s) => s.registrarMedicion);

  const indicador = useMemo(() => {
    if (!props?.indicadorId) return null;
    return getIndicadorById(props.indicadorId);
  }, [props?.indicadorId, getIndicadorById]);

  // Estado del formulario de medición
  const [periodo, setPeriodo] = useState("2026-S1");
  const [fechaCorte, setFechaCorte] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [valorMedido, setValorMedido] = useState<number>(0);
  const [observaciones, setObservaciones] = useState("");
  const [urlEvidencia, setUrlEvidencia] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (indicador) {
      setValorMedido(Number(indicador.valor_actual));
    }
  }, [indicador]);

  const avanceSimulado = useMemo(() => {
    if (!indicador) return 0;
    return calcularAvancePorcentaje(
      valorMedido,
      Number(indicador.linea_base_valor),
      Number(indicador.meta_cuatrienio),
      indicador.sentido_esperado
    );
  }, [indicador, valorMedido]);

  const semaforo = useMemo(() => {
    if (!indicador) return obtenerSemaforoAvance(0);
    return obtenerSemaforoAvance(avanceSimulado);
  }, [indicador, avanceSimulado]);

  const handleGuardarMedicion = async () => {
    if (!indicador) return;
    if (isNaN(valorMedido)) {
      toast.error("El valor medido debe ser un número válido.");
      return;
    }

    setGuardando(true);
    try {
      const exito = await registrarMedicionStore(indicador.id, {
        periodo,
        fecha_corte: fechaCorte,
        valor_medido: valorMedido,
        observaciones: observaciones.trim() || undefined,
        evidencia_documental_url: urlEvidencia.trim() || undefined,
        registrado_por: sesion?.usuarioId ?? "Autoridad Distrital",
      });

      if (exito) {
        toast.success(
          `Medición para ${indicador.codigo} registrada exitosamente.`
        );
        props?.onMedicionGuardada?.();
        closeTop();
      } else {
        const errorMsg = useCadenaValorStore.getState().error;
        toast.error(errorMsg || "No fue posible guardar la medición del indicador.");
      }
    } catch (err) {
      toast.error((err as Error).message || "Error al procesar la medición.");
    } finally {
      setGuardando(false);
    }
  };

  if (!indicador) {
    return (
      <PanelShell
        entryKey={entryKey}
        title="Ficha Técnica DNP"
        subtitle="No se encontró el indicador seleccionado"
        crumbs={[{ label: "Seguimiento PAS" }, { label: "Cadena de Valor" }]}
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-text-muted">
          <p>No se especificó un indicador válido para consultar.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={closeTop}
            className="mt-4"
          >
            Cerrar panel
          </Button>
        </div>
      </PanelShell>
    );
  }

  const esAscendente = indicador.sentido_esperado === "ascendente";

  return (
    <PanelShell
      entryKey={entryKey}
      title={`Ficha Técnica DNP · ${indicador.codigo}`}
      subtitle={indicador.nombre}
      crumbs={[
        { label: "Seguimiento PAS" },
        { label: "Cadena de Valor SINERGIA" },
        { label: indicador.codigo },
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
                Modo de Inspección Pericial — Solo Lectura
              </span>
              <p className="mt-0.5 text-text-muted">
                Conforme al protocolo de auditoría forense EAF, la ficha técnica y registros históricos se encuentran en modo de consulta inmutable.
              </p>
            </div>
          </div>
        )}

        {/* Tarjeta de Metadatos Clave DNP */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              {(indicador.es_demostracion || (indicador.metadatos?.es_demostracion as boolean)) && (
                <Badge variant="warning" className="text-xs font-bold">
                  DATOS DE DEMOSTRACIÓN
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-xs uppercase">
                {indicador.tipo_indicador}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                {esAscendente ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span>Sentido Ascendente</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-info" />
                    <span>Sentido Descendente</span>
                  </>
                )}
              </Badge>
            </div>
            <span className="text-xs text-text-muted">
              Periodicidad: <strong className="text-text-primary">{indicador.periodicidad}</strong>
            </span>
          </div>

          {/* Grid de Atributos Institucionales */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <span className="text-text-muted">Responsable del Reporte</span>
                <p className="font-medium text-text-primary">{indicador.responsable_reporte}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <span className="text-text-muted">Fuente Oficial de Datos</span>
                <p className="font-medium text-text-primary">{indicador.fuente_datos}</p>
              </div>
            </div>
          </div>

          {/* Definición Metodológica */}
          <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <FileText className="h-3.5 w-3.5 text-ember" />
              <span>Definición Metodológica Oficial</span>
            </div>
            <p className="mt-1 leading-relaxed text-text-secondary">
              {indicador.definicion}
            </p>
          </div>

          {/* Método de Cálculo */}
          <div className="mt-3 rounded-lg border border-border bg-surface-2/60 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <Calculator className="h-3.5 w-3.5 text-ember" />
              <span>Método de Cálculo Matemático</span>
            </div>
            <code className="mt-1 block font-mono text-[11px] text-text-secondary">
              {indicador.metodo_calculo}
            </code>
          </div>
        </div>

        {/* Tarjeta de Línea Base vs Meta vs Avance Cuatrienal */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Activity className="h-4 w-4 text-ember" />
              <span>Balance de Cumplimiento Cuatrienal (2026–2029)</span>
            </h3>
            <Badge variant={semaforo.badgeVariant}>{semaforo.label}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-2 p-2.5">
              <span className="text-[11px] text-text-muted">Línea Base ({indicador.linea_base_anio})</span>
              <p className="mt-1 font-mono text-sm font-bold text-text-primary">
                {Number(indicador.linea_base_valor).toLocaleString("es-CO")}
              </p>
              <span className="text-[10px] text-text-muted">{indicador.unidad_medida}</span>
            </div>

            <div className="rounded-lg bg-surface-2 p-2.5">
              <span className="text-[11px] text-text-muted">Meta Cuatrienio</span>
              <p className="mt-1 font-mono text-sm font-bold text-ember">
                {Number(indicador.meta_cuatrienio).toLocaleString("es-CO")}
              </p>
              <span className="text-[10px] text-text-muted">{indicador.unidad_medida}</span>
            </div>

            <div className="rounded-lg bg-surface-2 p-2.5">
              <span className="text-[11px] text-text-muted">Valor Alcanzado</span>
              <p className="mt-1 font-mono text-sm font-bold text-text-primary">
                {valorMedido.toLocaleString("es-CO")}
              </p>
              <span className="text-[10px] text-text-muted">{indicador.unidad_medida}</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-muted">Porcentaje de Avance Acumulado:</span>
              <span className="font-mono font-bold text-text-primary">{avanceSimulado}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={avanceSimulado}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Porcentaje de avance acumulado"
              className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${semaforo.colorBarra}`}
                style={{ width: `${Math.min(100, Math.max(0, avanceSimulado))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sección de Registro de Nueva Medición */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Layers className="h-4 w-4 text-ember" />
            <h3 className="text-sm font-semibold text-text-primary">
              {esAuditor ? "Registro Oficial de Medición" : "Actualizar Medición de Avance"}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Período de Reporte">
              {({ id }) => (
                <Input
                  id={id}
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  disabled={esAuditor}
                  placeholder="Ej. 2026-S1, 2026-Q1"
                  className="text-xs"
                />
              )}
            </FormField>

            <FormField label="Fecha de Corte">
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  disabled={esAuditor}
                  className="text-xs"
                />
              )}
            </FormField>
          </div>

          <FormField
            label={`Valor Medido Actual (${indicador.unidad_medida})`}
            description="Ingrese el valor acumulado reportado por la entidad responsable."
          >
            {({ id }) => (
              <Input
                id={id}
                type="number"
                step="any"
                value={isNaN(valorMedido) ? "" : valorMedido}
                onChange={(e) => setValorMedido(parseFloat(e.target.value) || 0)}
                disabled={esAuditor}
                className="font-mono text-sm"
              />
            )}
          </FormField>

          <FormField
            label="Observaciones y Justificación Técnica"
            description="Explicación cualitativa de avances, hitos logrados o factores de rezago."
          >
            {({ id }) => (
              <Textarea
                id={id}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={esAuditor}
                rows={3}
                placeholder="Detalle los factores operativos, territoriales o administrativos que sustentan el avance..."
                className="text-xs"
              />
            )}
          </FormField>

          <FormField
            label="URL de Evidencia Documental"
            description="Enlace a repositorio oficial, informe técnico, acta o soporte pericial."
          >
            {({ id }) => (
              <div className="flex gap-2">
                <Input
                  id={id}
                  value={urlEvidencia}
                  onChange={(e) => setUrlEvidencia(e.target.value)}
                  disabled={esAuditor}
                  placeholder="https://cartagena.gov.co/evidencias/informe.pdf"
                  className="text-xs flex-1 font-mono"
                />
                {urlEvidencia.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Abrir enlace de evidencia en nueva pestaña"
                    className="shrink-0"
                    onClick={() => window.open(urlEvidencia, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </FormField>

          {!esAuditor && (
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={closeTop} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGuardarMedicion}
                disabled={guardando}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{guardando ? "Guardando..." : "Guardar Medición"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
