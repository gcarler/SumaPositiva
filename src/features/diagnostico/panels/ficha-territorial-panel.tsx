"use client";

import {useEffect, useState} from "react";
import {toast} from "sonner";
import {
  Users,
  AlertTriangle,
  Building2,
  FileJson,
  ShieldAlert,
  GraduationCap,
  HeartPulse,
  Utensils,
  Radio,
  BadgeCheck
} from "lucide-react";
import {PanelShell} from "@/core/panels/panel-shell";
import {usePanels} from "@/core/panels/panel-store";
import type {PanelComponentProps} from "@/core/panels/panel-store";
import {Button} from "@/shared/ui/button";
import {Badge} from "@/shared/ui/badge";
import {obtenerFichaTerritorial} from "../services/territorios-api";
import type {FichaTerritorialDiagnostico} from "../models/territorio-diagnostico";

export function FichaTerritorialPanel({
  entryKey,
  props,
}: PanelComponentProps<"ficha-territorial">) {
  const { closeTop } = usePanels();
  const { territorioId } = props;

  const [ficha, setFicha] = useState<FichaTerritorialDiagnostico | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const data = await obtenerFichaTerritorial(territorioId);
        if (data) {
          setFicha(data);
        } else {
          toast.error("No se encontró la ficha territorial especificada.");
        }
      } catch {
        toast.error("Error al cargar datos del territorio.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [territorioId]);

  const handleExportarJson = () => {
    if (!ficha) return;
    const dataStr = JSON.stringify(ficha, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `ficha_territorial_${ficha.codigo.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Ficha territorial exportada exitosamente en formato JSON");
  };

  const badgeRiesgoClase = (nivel: string) => {
    switch (nivel) {
      case "ALTO":
        return "border-danger/30 bg-danger-soft text-danger";
      case "MEDIO":
        return "border-warning/30 bg-warning-soft text-warning";
      default:
        return "border-success/30 bg-success-soft text-success";
    }
  };

  if (cargando || !ficha) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Geodiagnóstico" }]}
        kicker="Diagnóstico Territorial · Cartagena 2026"
        title="Perfil Territorial de Vulnerabilidad"
        subtitle="Cargando información del territorio..."
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="flex h-64 items-center justify-center text-xs text-text-tertiary">
          Cargando ficha de vulnerabilidad...
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Geodiagnóstico" }]}
      kicker="Diagnóstico Territorial · Cartagena 2026"
      title={ficha.nombre}
      subtitle={`${ficha.codigo} · ${ficha.localidadNombre}`}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 pb-6 text-xs text-text-secondary">
        {/* Cabecera y Resumen de Vulnerabilidad */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`font-semibold text-2xs ${badgeRiesgoClase(ficha.nivelRiesgo)}`}
              >
                Riesgo {ficha.nivelRiesgo}
              </Badge>
              <Badge variant="outline" className="text-2xs font-mono">
                Zona {ficha.tipoZona}
              </Badge>
              {ficha.esEtnicoLey70 && (
                <Badge
                  variant="outline"
                  className="text-2xs border-ember/30 bg-ember-soft text-ember font-medium"
                >
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="size-3" aria-hidden="true" />
                    <span>Enfoque Étnico Ley 70/93</span>
                  </span>
                </Badge>
              )}
            </div>

            <span className="text-2xs text-text-tertiary font-mono">
              Código DANE/Distrito: {ficha.codigo}
            </span>
          </div>

          {ficha.nombreComunidadNegra && (
            <div className="rounded-lg border border-ember/20 bg-ember-soft/40 p-2.5 text-2xs text-text-primary font-medium">
              <span className="font-semibold block text-ember mb-0.5">
                Territorio Colectivo Titulado / En Proceso:
              </span>
              {ficha.nombreComunidadNegra}
            </div>
          )}

          {/* Métricas clave en Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-surface-2 p-2.5 space-y-0.5">
              <span className="text-2xs text-text-tertiary block">Población Total</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {ficha.poblacionEstimada.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="rounded-lg bg-surface-2 p-2.5 space-y-0.5">
              <span className="text-2xs text-text-tertiary block">Población Vulnerable</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {ficha.poblacionVulnerable.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="rounded-lg bg-surface-2 p-2.5 space-y-0.5">
              <span className="text-2xs text-text-tertiary block">Índice NBI</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {ficha.porcentajeNbi}%
              </span>
            </div>
            <div className="rounded-lg bg-surface-2 p-2.5 space-y-0.5">
              <span className="text-2xs text-text-tertiary block">Alertas SAT</span>
              <span className="text-sm font-bold text-danger tabular-nums">
                {ficha.alertasTempranasSat} Activas
              </span>
            </div>
          </div>

          {/* Barrios y UCGs */}
          <div className="space-y-1.5 pt-1">
            <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider block">
              Sectores y Barrios Representativos
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ficha.barriosPrincipales.map((b, i) => (
                <span
                  key={i}
                  className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-2xs text-text-secondary"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Problemáticas Críticas Priorizadas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-ember" aria-hidden="true" />
            <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
              Problemáticas Críticas Priorizadas ({ficha.problematicasPriorizadas.length})
            </h4>
          </div>

          <div className="space-y-2.5">
            {ficha.problematicasPriorizadas.map((prob, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-text-primary">
                    {idx + 1}. {prob.titulo}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-2xs font-semibold ${badgeRiesgoClase(prob.severidad)}`}
                  >
                    {prob.severidad}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {prob.descripcion}
                </p>
                <div className="text-2xs text-text-tertiary flex items-center gap-1.5">
                  <span className="font-medium text-text-secondary">Dimensión:</span>
                  <span>{prob.dimension}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipamientos y Déficit Institucional */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-ember" aria-hidden="true" />
            <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
              Equipamientos y Presencia Institucional
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-2.5">
              <ShieldAlert className="size-4 text-text-secondary shrink-0" aria-hidden="true" />
              <div>
                <span className="text-2xs text-text-tertiary block">CAIs / Estaciones</span>
                <span className="text-xs font-bold text-text-primary">
                  {ficha.equipamientos.caisOEstaciones}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-2.5">
              <HeartPulse className="size-4 text-text-secondary shrink-0" aria-hidden="true" />
              <div>
                <span className="text-2xs text-text-tertiary block">Puestos de Salud</span>
                <span className="text-xs font-bold text-text-primary">
                  {ficha.equipamientos.centrosSalud}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-2.5">
              <GraduationCap className="size-4 text-text-secondary shrink-0" aria-hidden="true" />
              <div>
                <span className="text-2xs text-text-tertiary block">Colegios Oficiales</span>
                <span className="text-xs font-bold text-text-primary">
                  {ficha.equipamientos.colegiosOficiales}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-2.5">
              <Utensils className="size-4 text-text-secondary shrink-0" aria-hidden="true" />
              <div>
                <span className="text-2xs text-text-tertiary block">Comedores</span>
                <span className="text-xs font-bold text-text-primary">
                  {ficha.equipamientos.comedoresComunitarios}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning-soft/30 p-3 space-y-1">
            <span className="font-semibold text-2xs text-warning flex items-center gap-1.5">
              <Radio className="size-3.5" aria-hidden="true" />
              <span>Déficit Institucional Identificado:</span>
            </span>
            <p className="text-xs text-text-secondary leading-snug">
              {ficha.equipamientos.deficitDetectado}
            </p>
          </div>
        </div>

        {/* Trazabilidad Participativa */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-ember" aria-hidden="true" />
            <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
              Trazabilidad de Participación Ciudadana
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-lg bg-surface-2 p-2.5">
              <span className="text-2xs text-text-tertiary block">Mesas de Trabajo</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {ficha.participacion.mesasRealizadas}
              </span>
            </div>
            <div className="rounded-lg bg-surface-2 p-2.5">
              <span className="text-2xs text-text-tertiary block">Propuestas Ciudadanas</span>
              <span className="text-sm font-bold text-ember tabular-nums">
                {ficha.participacion.propuestasRadicadas}
              </span>
            </div>
            <div className="rounded-lg bg-surface-2 p-2.5">
              <span className="text-2xs text-text-tertiary block">Testimonios Vivos</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {ficha.participacion.testimoniosRegistrados}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones y Exportación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarJson}
            className="w-full sm:w-auto h-8 text-xs gap-1.5"
          >
            <FileJson className="size-3.5 text-ember" aria-hidden="true" />
            <span>Exportar Ficha JSON</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={closeTop}
            className="w-full sm:w-auto h-8 text-xs"
          >
            Cerrar Ficha
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
