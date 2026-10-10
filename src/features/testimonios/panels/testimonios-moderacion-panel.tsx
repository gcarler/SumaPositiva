"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import {
  useModerarTestimonio,
  useTestimoniosGestion,
} from "../services/use-testimonios-queries";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { CheckCircle2, Sparkles, XCircle, ShieldAlert, MapPin, Tag, Edit3, Plus } from "lucide-react";
import type { EstadoTestimonio } from "../models/testimonio";

import { FotosMesasModeracion } from "@/features/evidencias/components/fotos-mesas-moderacion";

export function TestimoniosModeracionPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const [seccion, setSeccion] = useState<"testimonios" | "fotos_mesas">("testimonios");

  return (
    <PanelShell
      entryKey={entryKey}
      title="Curaduría y Moderación Institucional"
      subtitle="Filtro ético institucional para testimonios ciudadanos y evidencias fotográficas de mesas"
      crumbs={[{ label: "Memoria Social" }, { label: "Curaduría Institucional" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="border-b border-border px-4 sm:px-6 pt-3 pb-2 flex gap-2">
        <Button
          variant={seccion === "testimonios" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSeccion("testimonios")}
          className="text-xs"
        >
          Testimonios Ciudadanos
        </Button>
        <Button
          variant={seccion === "fotos_mesas" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSeccion("fotos_mesas")}
          className="text-xs"
        >
          Fotos de Mesas Territoriales
        </Button>
      </div>

      {seccion === "testimonios" ? (
        <TestimoniosModeracionContenido />
      ) : (
        <FotosMesasModeracion />
      )}
    </PanelShell>
  );
}

export function TestimoniosModeracionContenido() {
  const { openPanel } = usePanels();
  const [tabEstado, setTabEstado] = useState<string>("PENDIENTE");
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string>("");

  const {
    data: testimonios,
    isLoading,
    isError,
    refetch,
  } = useTestimoniosGestion({
    estado: tabEstado === "TODOS" ? undefined : tabEstado,
  });

  const moderarMutation = useModerarTestimonio();

  const handleModerar = async (
    id: string,
    nuevoEstado: EstadoTestimonio,
    motivo?: string
  ) => {
    try {
      await moderarMutation.mutateAsync({
        id,
        moderacion: {
          estado: nuevoEstado,
          motivo_moderacion: motivo || null,
        },
      });

      const label =
        nuevoEstado === "APROBADO"
          ? "aprobado para publicación"
          : nuevoEstado === "DESTACADO"
          ? "marcado como destacado"
          : "rechazado con motivo justificado";

      toast.success("Moderación aplicada", {
        description: `El testimonio ha sido ${label}.`,
      });

      setRechazandoId(null);
      setMotivoRechazo("");
    } catch {
      toast.error("Error al moderar", {
        description: "No fue posible aplicar la moderación. Verifica tus permisos institucionales.",
      });
    }
  };

  return (
      <div className="space-y-6 p-4 sm:p-6">
        {isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-text-primary">
            <p role="alert">No se pudieron cargar los testimonios para moderación.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        <Tabs value={tabEstado} onValueChange={setTabEstado} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="PENDIENTE" className="text-xs">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="APROBADO" className="text-xs">
              Aprobados
            </TabsTrigger>
            <TabsTrigger value="DESTACADO" className="text-xs">
              Destacados
            </TabsTrigger>
            <TabsTrigger value="RECHAZADO" className="text-xs">
              Rechazados
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tabEstado} className="mt-0 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] animate-pulse"
                  />
                ))}
              </div>
            ) : testimonios && testimonios.length > 0 ? (
              testimonios.map((t) => (
                <article
                  key={t.id}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                          {t.nombre_autor}
                        </h4>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] px-1.5 py-0.5 rounded bg-[var(--surface-2)]">
                          {t.codigo_unico}
                        </span>
                      </div>
                      {t.organizacion_comunitaria && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {t.organizacion_comunitaria}
                        </p>
                      )}
                    </div>

                    <EstadoBadge estado={t.estado || "PENDIENTE"} />
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                      {t.titulo}
                    </h5>
                    <blockquote className="text-xs text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--border)] pl-2.5">
                      &ldquo;{t.relato}&rdquo;
                    </blockquote>
                  </div>

                  {t.motivo_moderacion && (
                    <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Motivo de Moderación:
                      </span>{" "}
                      {t.motivo_moderacion}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
                    <div className="flex items-center gap-3">
                      {t.territorio_nombre && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-[var(--ember)]" />
                          {t.territorio_nombre}
                        </span>
                      )}
                      {t.dimension_nombre && (
                        <span className="flex items-center gap-1">
                          <Tag className="size-3" />
                          {t.dimension_nombre}
                        </span>
                      )}
                    </div>

                    <time dateTime={t.creado_en || t.creadoEn}>
                      {new Date(t.creado_en || t.creadoEn).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>

                  {/* Bloque de Acciones de Moderación */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPanel("testimonio-editor", { testimonioId: t.id })} className="text-xs h-8">
                      <Edit3 className="mr-1 size-3.5" />
                      Editar contenido
                    </Button>
                    {t.estado !== "APROBADO" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={moderarMutation.isPending}
                        onClick={() => handleModerar(t.id, "APROBADO")}
                        className="text-xs h-8"
                      >
                        <CheckCircle2 className="mr-1 size-3.5 text-primary" />
                        Aprobar
                      </Button>
                    )}

                    {t.estado !== "DESTACADO" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={moderarMutation.isPending}
                        onClick={() => handleModerar(t.id, "DESTACADO")}
                        className="text-xs h-8 text-[var(--ember)] border-[var(--border)]"
                      >
                        <Sparkles className="mr-1 size-3.5" />
                        Destacar
                      </Button>
                    )}

                    {t.estado !== "RECHAZADO" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={moderarMutation.isPending}
                        onClick={() => {
                          setRechazandoId(rechazandoId === t.id ? null : t.id);
                          setMotivoRechazo("");
                        }}
                        className="text-xs h-8 text-destructive border-[var(--border)] hover:bg-destructive/10"
                      >
                        <XCircle className="mr-1 size-3.5" />
                        Rechazar
                      </Button>
                    )}
                  </div>

                  {/* Subformulario desplegable de Rechazo con Motivo Obligatorio */}
                  {rechazandoId === t.id && (
                    <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2 mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                        <ShieldAlert className="size-4" />
                        Justificación Obligatoria del Rechazo
                      </div>
                      <FormField
                        label="Motivo del rechazo"
                        description="Explica la razón ética o de pertinencia (mínimo 5 caracteres)."
                        error={motivoRechazo.trim().length > 0 && motivoRechazo.trim().length < 5
                          ? "Escribe al menos 5 caracteres."
                          : undefined}
                      >
                        {(control) => (
                          <Textarea
                            {...control}
                            rows={2}
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            className="text-xs"
                          />
                        )}
                      </FormField>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={moderarMutation.isPending}
                          onClick={() => setRechazandoId(null)}
                          className="text-xs h-7"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={motivoRechazo.trim().length < 5 || moderarMutation.isPending}
                          onClick={() => handleModerar(t.id, "RECHAZADO", motivoRechazo.trim())}
                          className="text-xs h-7"
                        >
                          Confirmar Rechazo
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="p-8 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)] space-y-3">
                <p>No hay testimonios en estado {tabEstado.toLowerCase()} en este momento.</p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPanel("testimonio-editor", {})}
                    className="text-xs"
                  >
                    <Plus className="mr-1.5 size-3.5 text-[var(--ember)]" />
                    Registrar Testimonio Comunitario
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}

function EstadoBadge({ estado }: { estado: EstadoTestimonio }) {
  switch (estado) {
    case "DESTACADO":
      return <StatusBadge tone="ember">Destacado</StatusBadge>;
    case "APROBADO":
      return <StatusBadge tone="success">Aprobado</StatusBadge>;
    case "PENDIENTE":
      return <StatusBadge tone="warning">Pendiente</StatusBadge>;
    case "RECHAZADO":
      return <StatusBadge tone="danger">Rechazado</StatusBadge>;
  }
}
