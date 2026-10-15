"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  FolderSync,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  Layers,
  Sparkles,
  ShieldCheck,
  Database,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  obtenerEstadoGoogleWorkspace,
  sincronizarGoogleWorkspace,
  ESTADO_WORKSPACE_INICIAL,
  type EstadoGoogleWorkspaceRespuesta,
} from "../services/google-workspace-api";
import {
  METRICAS_CIERRE_DOCUMENTAL_WORKSPACE,
  type MetricasCierreDocumentalWorkspace,
} from "../data/pdd-dea-cartagena.data";

export interface GoogleWorkspaceSyncCardProps {
  className?: string;
  metricas?: MetricasCierreDocumentalWorkspace;
  puedeEditar?: boolean;
}

export function GoogleWorkspaceSyncCard({
  className = "",
  metricas = METRICAS_CIERRE_DOCUMENTAL_WORKSPACE,
  puedeEditar = true,
}: GoogleWorkspaceSyncCardProps) {
  const [estado, setEstado] = useState<EstadoGoogleWorkspaceRespuesta>(ESTADO_WORKSPACE_INICIAL);
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [cargandoEstado, setCargandoEstado] = useState<boolean>(true);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const res = await obtenerEstadoGoogleWorkspace();
        if (activo) {
          setEstado(res);
        }
      } catch (err) {
        console.warn("Fallo carga estado Google Workspace:", err);
      } finally {
        if (activo) setCargandoEstado(false);
      }
    }
    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const res = await sincronizarGoogleWorkspace();
      if (res.exito) {
        toast.success(res.mensaje || "Sincronización con Google Workspace completada exitosamente.");
        // Refrescar estado tras sincronización
        const nuevoEstado = await obtenerEstadoGoogleWorkspace();
        setEstado(nuevoEstado);
      } else {
        toast.error("No se pudo completar la sincronización con Google Workspace.");
      }
    } catch {
      toast.error("Error de comunicación durante la sincronización.");
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div
      data-testid="google-workspace-sync-card"
      aria-label="Sincronización Nativa con Google Workspace"
      className={`rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-5 ${className}`}
    >
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-surface-2 p-2.5 text-ember border border-border">
            <FolderSync className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                Sincronización Nativa con Google Workspace — Carpeta Oficial PSHC (Google Sheets + Google Docs)
              </h3>
              <Badge variant="outline" className="border-success/40 bg-surface-2 text-success text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {cargandoEstado ? "Verificando..." : "Conectado"}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Conexión bidireccional automatizada con la Service Account{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono text-ember border border-border">
                {estado.service_account_email}
              </code>
            </p>
          </div>
        </div>

        {/* Botón de Sincronización */}
        <Button
          type="button"
          variant="ember"
          size="sm"
          data-testid="btn-sync-google-workspace"
          onClick={handleSincronizar}
          disabled={sincronizando || !puedeEditar}
          title={!puedeEditar ? "Modo de sólo lectura" : undefined}
          className="gap-2 shrink-0 font-semibold"
          aria-label="Sincronizar ahora con Google Sheets y Google Docs"
        >
          <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
          <span>{sincronizando ? "Sincronizando con Drive..." : "Sincronizar ahora con Google Sheets y Google Docs"}</span>
        </Button>
      </div>

      {/* Enlaces a Carpetas Oficiales de Google Drive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={estado.carpeta_pshc_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-4 w-4 text-ember group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-xs font-bold text-text-primary block">
                Carpeta Raíz PSHC (Drive)
              </span>
              <span className="text-[10px] text-text-muted font-mono truncate max-w-[220px] block">
                ID: {estado.carpeta_pshc_id}
              </span>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-text-secondary group-hover:text-text-primary" />
        </a>

        <a
          href={estado.subcarpeta_expediente_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-4 w-4 text-info group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-xs font-bold text-text-primary block">
                Subcarpeta Oficial 00_EXPEDIENTE_OFICIAL_POLIS_CSH
              </span>
              <span className="text-[10px] text-text-muted font-mono truncate max-w-[220px] block">
                ID: {estado.subcarpeta_expediente_id}
              </span>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-text-secondary group-hover:text-text-primary" />
        </a>
      </div>

      {/* Métricas de Cierre Documental y Deduplicación Canónica */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-ember" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Cierre Documental Canónico (Catálogo Drive 1.383 / 1.383 Cubierto al 100%)
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] border-ember/30 text-ember bg-surface-1">
            29 Entidades · 37 Mesas
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
              <Database className="h-3.5 w-3.5 text-info" />
              <span>Metas PDD Únicas</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary">
              {metricas.metas_unicas_deduplicadas.toLocaleString("es-CO")}
            </div>
            <p className="text-[10px] text-text-secondary">
              De {metricas.metas_totales_brutas.toLocaleString("es-CO")} brutas ({metricas.metas_duplicadas_consolidadas} duplicadas inter-fuente consolidadas)
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
              <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
              <span>Libros Excel Ingeridos</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary">
              {metricas.libros_excel_ingeridos.toLocaleString("es-CO")}
            </div>
            <p className="text-[10px] text-text-secondary">
              Planes de Acción DNP y matrices presupuestales
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
              <FileText className="h-3.5 w-3.5 text-warning" />
              <span>Informes PDF Ingeridos</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary">
              {metricas.pdfs_planes_accion_ingeridos}
            </div>
            <p className="text-[10px] text-text-secondary">
              Informes técnicos y PA 2018/2025 procesados
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
              <MapPin className="h-3.5 w-3.5 text-ember" />
              <span>Censo Territorial Mesas</span>
            </div>
            <div className="text-xl font-extrabold text-ember">
              {metricas.mesas_oficiales_censo}
            </div>
            <p className="text-[10px] text-text-secondary">
              15 corregimientos oficiales + 3 terr. + 8 pob. + 11 sec. ({metricas.agendas_oficiales_censo} agendas)
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Archivos Nativos de Google Detectados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-info" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Documentos Nativos Sincronizados en la Carpeta ({estado.archivos_nativos_detectados.length})
            </h4>
          </div>
          <span className="text-[11px] text-text-muted">
            {estado.hojas_calculo_count} Hojas de Cálculo · {estado.documentos_count} Documentos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {estado.archivos_nativos_detectados.map((archivo) => {
            const esSheet = archivo.tipo === "SPREADSHEET";
            return (
              <div
                key={archivo.id}
                className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        esSheet
                          ? "border-success/40 bg-surface-1 text-success"
                          : "border-info/40 bg-surface-1 text-info"
                      }`}
                    >
                      {esSheet ? "Google Sheet" : "Google Doc"}
                    </Badge>
                    <span className="text-[10px] text-text-muted">API Nativa</span>
                  </div>
                  <h5 className="text-xs font-bold text-text-primary line-clamp-2">
                    {archivo.name}
                  </h5>
                </div>

                <a
                  href={archivo.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ember hover:underline pt-2 border-t border-border mt-2"
                >
                  <span>Abrir en Google Drive</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estado del Último Sincronizado */}
      {estado.ultimo_resultado_sincronizacion && (
        <div className="p-3 rounded-lg border border-border bg-surface-2 flex items-start gap-2.5 text-xs text-text-secondary">
          <Sparkles className="h-4 w-4 text-ember shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-text-primary">
              Último informe de sincronización ({estado.ultimo_resultado_sincronizacion.fecha_iso}):
            </span>
            <p className="leading-relaxed">
              {estado.ultimo_resultado_sincronizacion.mensaje}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
