"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Music,
  Paperclip,
  Plus,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { AdjuntoMesa } from "@/features/mesas/models/mesas";

export interface AdjuntosZonaProps {
  adjuntos: AdjuntoMesa[];
  onAgregar: (adjunto: AdjuntoMesa) => void;
  onEliminar: (adjuntoId: string) => void;
  soloLectura?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatearTamaño(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clasificarTipo(mimeType: string, nombre: string): AdjuntoMesa["tipo"] {
  const mime = mimeType.toLowerCase();
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
    return "imagen";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
    return "audio";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("excel") ||
    mime.includes("sheet") ||
    ["pdf", "doc", "docx", "xls", "xlsx", "csv", "odt", "ods", "txt"].includes(ext)
  ) {
    return "documento";
  }
  return "otro";
}

function renderIconoAdjunto(adjunto: AdjuntoMesa) {
  switch (adjunto.tipo) {
    case "imagen":
      return <ImageIcon className="size-4 shrink-0 text-[var(--info)]" />;
    case "audio":
      return <Music className="size-4 shrink-0 text-[var(--warning)]" />;
    case "video":
      return <Video className="size-4 shrink-0 text-[var(--accent)]" />;
    case "documento":
      if (adjunto.nombre.match(/\.(xlsx?|csv|ods)$/i)) {
        return <FileSpreadsheet className="size-4 shrink-0 text-[var(--success)]" />;
      }
      return <FileText className="size-4 shrink-0 text-[var(--ember)]" />;
    default:
      return <Paperclip className="size-4 shrink-0 text-[var(--text-tertiary)]" />;
  }
}

export function AdjuntosZona({
  adjuntos,
  onAgregar,
  onEliminar,
  soloLectura = false,
}: AdjuntosZonaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const procesarArchivos = (archivos: FileList | File[]) => {
    let procesados = 0;
    Array.from(archivos).forEach((file) => {
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" supera el tamaño máximo permitido de 10 MB.`);
        return;
      }

      const tipo = clasificarTipo(file.type, file.name);
      const url = URL.createObjectURL(file);
      const nuevoAdjunto: AdjuntoMesa = {
        id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: file.name,
        tipo,
        mimeType: file.type || "application/octet-stream",
        tamaño: file.size,
        url,
        subidoEn: new Date().toISOString(),
      };

      onAgregar(nuevoAdjunto);
      procesados++;
    });

    if (procesados > 0) {
      toast.success(`${procesados} archivo${procesados > 1 ? "s" : ""} adjuntado${procesados > 1 ? "s" : ""}`);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      procesarArchivos(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!soloLectura) setArrastrando(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (soloLectura) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarArchivos(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
      {/* Input oculto para carga de archivos */}
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4,image/*,audio/*,video/*"
        className="hidden"
      />

      {/* Cabecera de la zona */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-[var(--text-tertiary)]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Adjuntos ({adjuntos.length})
          </h4>
        </div>
        {!soloLectura && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-3.5" />
            Adjuntar archivo
          </Button>
        )}
      </div>

      {/* Lista de archivos adjuntos */}
      {adjuntos.length > 0 ? (
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
          {adjuntos.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-[var(--surface-1)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.tipo === "imagen" ? (
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-1)]">
                    <img
                      src={item.url}
                      alt={item.nombre}
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)]">
                    {renderIconoAdjunto(item)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {item.nombre}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] tabular">
                    {formatearTamaño(item.tamaño)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => window.open(item.url, "_blank")}
                  title="Descargar / Abrir adjunto"
                  aria-label={`Descargar o abrir ${item.nombre}`}
                >
                  <Download className="size-3.5 text-[var(--text-secondary)]" />
                </Button>
                {!soloLectura && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => {
                      onEliminar(item.id);
                      toast.success(`"${item.nombre}" eliminado`);
                    }}
                    title="Eliminar adjunto"
                    aria-label={`Eliminar adjunto ${item.nombre}`}
                    className="text-[var(--text-tertiary)] hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] p-3.5 text-center text-xs text-[var(--text-tertiary)]">
          Sin archivos adjuntos aún.
        </p>
      )}

      {/* Zona drag and drop (visible si no es soloLectura) */}
      {!soloLectura && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-5 text-center transition-colors ${
            arrastrando
              ? "border-[var(--ember)] bg-[var(--ember-soft)]"
              : "border-[var(--border-strong)] bg-[var(--surface-2)] hover:border-[var(--ember)] hover:bg-[var(--surface-1)]"
          }`}
        >
          <UploadCloud className="size-5 text-[var(--text-tertiary)]" />
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Arrastra archivos aquí o haz clic para subir
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            PDF · Word · Excel · Imágenes · Audio · Video (máx. 10 MB)
          </p>
        </div>
      )}
    </div>
  );
}
