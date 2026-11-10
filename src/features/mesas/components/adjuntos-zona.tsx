"use client";

import { useRef, useState, type DragEvent, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImageIcon,
  Music,
  Paperclip,
  Plus,
  Presentation,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import type { AdjuntoMesa, TipoGoogleDrive } from "@/features/mesas/models/mesas";

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

function detectarTipoGoogle(url: string): { tipoGoogle: TipoGoogleDrive; label: string } {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/document")) {
    return { tipoGoogle: "google_doc", label: "Google Doc" };
  }
  if (u.includes("docs.google.com/spreadsheets")) {
    return { tipoGoogle: "google_sheet", label: "Google Sheet" };
  }
  if (u.includes("docs.google.com/presentation")) {
    return { tipoGoogle: "google_slide", label: "Google Slide" };
  }
  if (u.includes("drive.google.com/drive/folders") || (u.includes("drive.google.com") && u.includes("folders"))) {
    return { tipoGoogle: "google_drive_folder", label: "Carpeta Drive" };
  }
  return { tipoGoogle: "google_drive_file", label: "Archivo Drive" };
}

function renderIconoAdjunto(adjunto: AdjuntoMesa) {
  if (adjunto.proveedor === "google_drive" || adjunto.tipo === "google_drive") {
    switch (adjunto.tipoGoogle) {
      case "google_doc":
        return <FileText className="size-4 shrink-0 text-[var(--info)]" />;
      case "google_sheet":
        return <FileSpreadsheet className="size-4 shrink-0 text-[var(--success)]" />;
      case "google_slide":
        return <Presentation className="size-4 shrink-0 text-[var(--warning)]" />;
      case "google_drive_folder":
        return <FolderOpen className="size-4 shrink-0 text-[var(--accent)]" />;
      default:
        return <ExternalLink className="size-4 shrink-0 text-[var(--ember)]" />;
    }
  }
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
  const [formDriveAbierto, setFormDriveAbierto] = useState(false);
  const [urlDrive, setUrlDrive] = useState("");
  const [nombreDrive, setNombreDrive] = useState("");

  const handleVincularGoogleDrive = (e: FormEvent) => {
    e.preventDefault();
    const urlTrim = urlDrive.trim();
    if (!urlTrim) {
      toast.error("Por favor ingresa la URL de Google Drive, Doc, Sheet o Slide.");
      return;
    }
    if (!urlTrim.startsWith("http://") && !urlTrim.startsWith("https://")) {
      toast.error("El enlace debe iniciar con https:// o http://");
      return;
    }

    const { tipoGoogle, label } = detectarTipoGoogle(urlTrim);
    const nombreFinal = nombreDrive.trim() || `${label} institucional`;

    const nuevoAdjunto: AdjuntoMesa = {
      id: `adj-gdrive-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: nombreFinal,
      tipo: "google_drive",
      mimeType: "application/vnd.google-apps",
      tamaño: 0,
      url: urlTrim,
      subidoEn: new Date().toISOString(),
      proveedor: "google_drive",
      tipoGoogle,
    };

    onAgregar(nuevoAdjunto);
    toast.success(`"${nombreFinal}" vinculado correctamente.`);
    setUrlDrive("");
    setNombreDrive("");
    setFormDriveAbierto(false);
  };

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-[var(--text-tertiary)]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Adjuntos y Documentos ({adjuntos.length})
          </h4>
        </div>
        {!soloLectura && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setFormDriveAbierto((v) => !v)}
              className="gap-1.5 text-xs text-[var(--ember)] border-[var(--ember)]/30 hover:bg-[var(--ember)]/10"
            >
              <ExternalLink className="size-3.5" />
              <span>Google Drive / Docs</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              <span>Subir archivo</span>
            </Button>
          </div>
        )}
      </div>

      {/* Formulario para vincular Google Drive */}
      {!soloLectura && formDriveAbierto && (
        <form
          onSubmit={handleVincularGoogleDrive}
          className="space-y-3 rounded-lg border border-[var(--ember)]/40 bg-[var(--surface-2)] p-3.5 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
              <ExternalLink className="size-3.5 text-[var(--ember)]" />
              Vincular Google Workspace (Doc, Sheet, Slide, Drive)
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => setFormDriveAbierto(false)}
              className="text-[var(--text-tertiary)]"
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="url-gdrive" className="text-[11px] font-medium text-[var(--text-secondary)]">
                URL del Documento de Google Drive / Docs / Sheets / Slides *
              </Label>
              <Input
                id="url-gdrive"
                value={urlDrive}
                onChange={(e) => setUrlDrive(e.target.value)}
                placeholder="https://docs.google.com/document/d/... o https://drive.google.com/..."
                className="text-xs h-8"
                required
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="nombre-gdrive" className="text-[11px] font-medium text-[var(--text-secondary)]">
                Título o descripción del documento (opcional)
              </Label>
              <Input
                id="nombre-gdrive"
                value={nombreDrive}
                onChange={(e) => setNombreDrive(e.target.value)}
                placeholder="Ej.: Relatoría Comunitaria - Mesa Localidad Histórica"
                className="text-xs h-8"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setFormDriveAbierto(false)}
              className="text-xs h-7"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              className="text-xs h-7 gap-1"
            >
              <Plus className="size-3" />
              Vincular documento
            </Button>
          </div>
        </form>
      )}

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
                  {item.proveedor === "google_drive" || item.tipo === "google_drive" ? (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase bg-[var(--surface-1)]">
                        {item.tipoGoogle ? item.tipoGoogle.replace("google_", "") : "Google Drive"}
                      </Badge>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Enlace en la nube
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--text-tertiary)] tabular">
                      {formatearTamaño(item.tamaño)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => window.open(item.url, "_blank")}
                  title={item.proveedor === "google_drive" ? "Abrir en Google Drive / Docs" : "Descargar / Abrir adjunto"}
                  aria-label={`Abrir o descargar ${item.nombre}`}
                >
                  {item.proveedor === "google_drive" || item.tipo === "google_drive" ? (
                    <ExternalLink className="size-3.5 text-[var(--ember)]" />
                  ) : (
                    <Download className="size-3.5 text-[var(--text-secondary)]" />
                  )}
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
          Sin archivos ni documentos adjuntos aún.
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
