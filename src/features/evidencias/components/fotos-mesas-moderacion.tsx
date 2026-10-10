"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Camera, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

import {
  listarFotosMesasPendientes,
  moderarFotoMesa,
  type FotoMesaRevision,
} from "../services/evidencias-api";

export function FotosMesasModeracion() {
  const [fotos, setFotos] = useState<FotoMesaRevision[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarFotosMesasPendientes();
      setFotos(data);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al cargar fotografías pendientes de moderación.";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const handleModerar = async (fotoId: string, estado: "APROBADA" | "RECHAZADA") => {
    setProcesandoId(fotoId);
    try {
      await moderarFotoMesa(fotoId, {
        estado,
        observacion: observaciones[fotoId] || undefined,
      });

      toast.success(
        estado === "APROBADA"
          ? "Fotografía aprobada para publicación en el Geovisor"
          : "Fotografía rechazada con motivo institucional",
        {
          description: `ID: ${fotoId.slice(0, 8)}...`,
        }
      );

      setFotos((prev) => prev.filter((f) => f.id !== fotoId));
      setObservaciones((prev) => {
        const next = { ...prev };
        delete next[fotoId];
        return next;
      });
    } catch (err) {
      console.error("Error al moderar fotografía:", err);
      toast.error("Error al registrar dictamen de moderación", {
        description: err instanceof Error ? err.message : "Error de comunicación con el servidor.",
      });
    } finally {
      setProcesandoId(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-text-tertiary">
        <RefreshCw className="size-6 animate-spin text-ember mb-3" aria-hidden="true" />
        <p>Cargando fotografías pendientes de revisión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-xs text-text-primary">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-danger" aria-hidden="true" />
            <p>{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (fotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-surface-2 border border-border text-text-tertiary mb-3">
          <Camera className="size-6 text-ember" aria-hidden="true" />
        </div>
        <h4 className="text-sm font-bold text-text-primary">
          Cero Fotografías Pendientes
        </h4>
        <p className="mt-1 text-xs text-text-tertiary max-w-sm">
          Todas las evidencias fotográficas de las mesas territoriales han sido revisadas y dictaminadas conforme al marco ético institucional.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void cargar()}
          className="mt-4 text-xs"
        >
          <RefreshCw className="size-3.5 mr-1.5" />
          Actualizar Listado
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            Evidencias Fotográficas de Mesas Territoriales
          </h3>
          <p className="text-2xs text-text-tertiary">
            Curaduría ética y control de consentimiento para publicación en Geovisor ({fotos.length} pendientes)
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void cargar()} className="text-xs">
          <RefreshCw className="size-3.5 mr-1.5" />
          Refrescar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {fotos.map((foto) => {
          const procesando = procesandoId === foto.id;
          let fechaTexto = foto.creada_en;
          try {
            fechaTexto = format(new Date(foto.creada_en), "d 'de' MMMM, yyyy HH:mm", { locale: es });
          } catch {
            // No parseable
          }

          return (
            <div
              key={foto.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 space-y-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-text-primary block">
                      {foto.mesa_nombre || `Mesa ${foto.mesa_id.slice(0, 8)}`}
                    </span>
                    <span className="text-2xs text-text-tertiary block">
                      Archivo: {foto.nombre_archivo_original} · {fechaTexto}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-3xs font-semibold ${
                      foto.autorizacion_imagen
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-warning/30 bg-warning-soft text-warning"
                    }`}
                  >
                    {foto.autorizacion_imagen ? "Consentimiento OK" : "Sin Consentimiento"}
                  </Badge>
                </div>

                {/* Previsualización de Imagen */}
                <div className="relative overflow-hidden rounded-lg border border-border bg-surface-2 aspect-video flex items-center justify-center">
                  <img
                    src={foto.archivo_revision_url}
                    alt={foto.nombre_archivo_original}
                    className="max-h-full max-w-full object-contain"
                  />
                  <a
                    href={foto.archivo_revision_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-surface-0/80 text-text-primary hover:bg-surface-0 shadow-sm transition-colors"
                    title="Ver archivo completo"
                  >
                    <Eye className="size-3.5" aria-hidden="true" />
                  </a>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor={`obs-${foto.id}`}
                    className="text-2xs font-medium text-text-tertiary"
                  >
                    Observación de curaduría institucional (opcional / justificación):
                  </Label>
                  <Textarea
                    id={`obs-${foto.id}`}
                    value={observaciones[foto.id] || ""}
                    onChange={(e) =>
                      setObservaciones((prev) => ({
                        ...prev,
                        [foto.id]: e.target.value,
                      }))
                    }
                    placeholder="Escriba motivo técnico o ético de la decisión..."
                    className="text-xs h-16 resize-none"
                    disabled={procesando}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleModerar(foto.id, "RECHAZADA")}
                  disabled={procesando}
                  className="text-xs text-danger hover:bg-danger-soft hover:text-danger hover:border-danger/30"
                >
                  <XCircle className="size-3.5 mr-1.5" />
                  Rechazar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => void handleModerar(foto.id, "APROBADA")}
                  disabled={procesando}
                  className="text-xs font-semibold"
                >
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Aprobar Foto
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
