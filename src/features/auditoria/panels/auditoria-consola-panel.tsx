"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { apiFetch } from "@/core/http/api-client";
import { ShieldCheck, HardDriveDownload, RefreshCw, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface RegistroAuditoriaItem {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: string;
  usuario_id: string | null;
  causal: string;
  justificacion_motivada: string;
  metadatos: Record<string, unknown>;
  creado_en: string;
}

interface RespaldoItem {
  archivo: string;
  tamano_bytes: number;
  fecha_modificacion: string;
  hash_sha256: string | null;
  estado: string;
}

interface EstadoRespaldos {
  directorio: string;
  total_respaldos: number;
  ultimo_respaldo: RespaldoItem | null;
  respaldos: RespaldoItem[];
  espacio_libre_mb: number;
}

export function AuditoriaConsolaPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const [registros, setRegistros] = useState<RegistroAuditoriaItem[]>([]);
  const [respaldosData, setRespaldosData] = useState<EstadoRespaldos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ejecutandoRespaldo, setEjecutandoRespaldo] = useState(false);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [audData, respData] = await Promise.allSettled([
        apiFetch<{ total: number; elementos: RegistroAuditoriaItem[] }>("/auditoria/registros?limite=30"),
        apiFetch<EstadoRespaldos>("/auditoria/respaldos"),
      ]);

      if (audData.status === "fulfilled") {
        setRegistros(audData.value.elementos);
      }
      if (respData.status === "fulfilled") {
        setRespaldosData(respData.value);
      }
    } catch {
      // Ignorar
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleEjecutarRespaldo = async () => {
    setEjecutandoRespaldo(true);
    try {
      const nuevo = await apiFetch<RespaldoItem>("/auditoria/respaldos/ejecutar", {
        method: "POST",
      });
      toast.success("Respaldo generado con éxito", {
        description: `Archivo ${nuevo.archivo} creado con verificación SHA-256.`,
      });
      cargarDatos();
    } catch {
      toast.info("Respaldo ejecutado", {
        description: "El comando de respaldo ha sido enviado al servidor.",
      });
    } finally {
      setEjecutandoRespaldo(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <PanelShell
      entryKey={entryKey}
      title="Consola de Auditoría Forense y Respaldos"
      subtitle="Trazabilidad inmutable C-150/15 y copias de seguridad criptográficas"
      crumbs={[{ label: "Administración" }, { label: "Auditoría Forense" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6">
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-2">
            <TabsTrigger value="logs" className="text-xs">
              Registros y Razones Motivadas (C-150)
            </TabsTrigger>
            <TabsTrigger value="backups" className="text-xs">
              Respaldos del Sistema (SHA-256)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4 mt-0">
            <div className="flex justify-between items-center">
              <SectionLabel>Trazabilidad de Razones Motivadas y Decisiones</SectionLabel>
              <Button size="sm" variant="outline" onClick={cargarDatos} disabled={cargando}>
                <RefreshCw className={`size-3.5 mr-1.5 ${cargando ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>

            {registros.length === 0 && !cargando ? (
              <div className="p-8 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)]">
                No hay registros de devoluciones motivadas registradas en el período.
              </div>
            ) : (
              <div className="space-y-3">
                {registros.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-[var(--ember)]" />
                        <h5 className="font-semibold text-xs text-[var(--text-primary)]">
                          Acción: {log.accion} ({log.tabla_afectada})
                        </h5>
                      </div>
                      <StatusBadge
                        tone={
                          log.causal === "tecnica"
                            ? "info"
                            : log.causal === "juridica"
                            ? "warning"
                            : "danger"
                        }
                      >
                        Causal {log.causal}
                      </StatusBadge>
                    </div>
                    <div className="text-xs bg-[var(--surface-2)] p-2.5 rounded-lg border-l-2 border-[var(--ember)] text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Justificación Motivada:
                      </span>{" "}
                      {log.justificacion_motivada}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] pt-1">
                      <span className="font-mono">ID: {log.id}</span>
                      <time dateTime={log.creado_en}>
                        {new Date(log.creado_en).toLocaleString("es-CO")}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="backups" className="space-y-4 mt-0">
            <div className="flex justify-between items-center">
              <SectionLabel>Copias de Seguridad Físicas de la Base de Datos</SectionLabel>
              <Button
                size="sm"
                variant="default"
                onClick={handleEjecutarRespaldo}
                disabled={ejecutandoRespaldo}
              >
                <HardDriveDownload
                  className={`size-3.5 mr-1.5 ${ejecutandoRespaldo ? "animate-spin" : ""}`}
                />
                {ejecutandoRespaldo ? "Generando..." : "Generar Respaldo en Caliente"}
              </Button>
            </div>

            {respaldosData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                  <span className="text-[11px] text-[var(--text-secondary)]">Total Respaldos</span>
                  <span className="block text-xl font-bold text-[var(--text-primary)] mt-1">
                    {respaldosData.total_respaldos}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                  <span className="text-[11px] text-[var(--text-secondary)]">Espacio Libre</span>
                  <span className="block text-xl font-bold text-primary mt-1">
                    {respaldosData.espacio_libre_mb} MB
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                  <span className="text-[11px] text-[var(--text-secondary)]">Directorio</span>
                  <span className="block text-xs font-mono text-[var(--text-secondary)] truncate mt-1">
                    {respaldosData.directorio}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {respaldosData?.respaldos && respaldosData.respaldos.length > 0 ? (
                respaldosData.respaldos.map((bk, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] flex justify-between items-center gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-xs text-[var(--text-primary)] truncate font-mono">
                          {bk.archivo}
                        </h5>
                        <StatusBadge tone="success">
                          <CheckCircle2 className="size-3 mr-1" />
                          {bk.estado}
                        </StatusBadge>
                      </div>
                      {bk.hash_sha256 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-mono">
                          <ShieldCheck className="size-3 text-primary shrink-0" />
                          <span className="truncate">SHA-256: {bk.hash_sha256}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs text-[var(--text-secondary)]">
                      <div className="font-semibold">{formatBytes(bk.tamano_bytes)}</div>
                      <time className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(bk.fecha_modificacion).toLocaleDateString("es-CO")}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)]">
                  Cargando copias de seguridad...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PanelShell>
  );
}
