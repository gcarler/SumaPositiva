"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Paperclip,
  Pencil,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { tienePermiso, useSesionStore } from "@/features/sesion/state/session-store";
import {
  ESTADOS_CANONICOS,
  MODULOS_PROYECTOS,
  type ActividadProyecto,
  type AnexoActividad,
} from "../models/actividad-proyecto";
import {
  descargarAnexoActividad,
  eliminarAnexoActividad,
  listarAnexosActividad,
  subirAnexoActividad,
} from "../services/proyectos-api";

function formatoFecha(iso: string): string {
  const fecha = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatoFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ventanaDe(a: ActividadProyecto): string {
  const cierre = a.fecha_fin
    ? formatoFecha(a.fecha_fin)
    : "ventana abierta (sin fecha de cierre)";
  return `${formatoFecha(a.fecha_inicio)} – ${cierre}`;
}

function horarioDe(a: ActividadProyecto): string {
  if (!a.hora_inicio) return "";
  return a.hora_fin ? `${a.hora_inicio} – ${a.hora_fin}` : a.hora_inicio;
}

function obtenerIconoArchivo(tipoMime: string, nombre: string) {
  const ext = nombre.split(".").pop()?.toLowerCase();
  if (tipoMime.includes("pdf") || ext === "pdf") {
    return <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />;
  }
  if (
    tipoMime.includes("sheet") ||
    tipoMime.includes("excel") ||
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv"
  ) {
    return <FileSpreadsheet className="size-5 shrink-0 text-primary" aria-hidden="true" />;
  }
  if (
    tipoMime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "")
  ) {
    return <FileImage className="size-5 shrink-0 text-primary" aria-hidden="true" />;
  }
  if (
    tipoMime.includes("zip") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")
  ) {
    return <FileArchive className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />;
  }
  return <File className="size-5 shrink-0 text-text-tertiary" aria-hidden="true" />;
}

/** Fila de detalle con icono y etiqueta; el valor nunca se recorta.
 *  Las filas sin valor se omiten: un guión no ayuda a leer la ficha. */
function filaDetalle(
  icono: React.ReactNode,
  etiqueta: string,
  valor: string,
): React.ReactElement | null {
  if (!valor) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true">
        {icono}
      </span>
      <div className="min-w-0 space-y-0.5">
        <span className="block text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
          {etiqueta}
        </span>
        <p className="whitespace-normal break-words text-sm text-text-primary">{valor || "—"}</p>
      </div>
    </div>
  );
}

const ROLES_GESTION_PROYECTOS = [
  "administrador_identidades",
  "autoridad_distrital",
  "facilitador_mesa",
];

export function FichaActividadPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props?: { actividad: ActividadProyecto; onEditar?: () => void; seccionInicial?: "anexos" };
}) {
  const { closeTop, closeToKey } = usePanels();
  const router = useRouter();
  const sesion = useSesionStore((s) => s.sesion);
  const a = props?.actividad;

  // Estado de anexos
  const [anexos, setAnexos] = useState<AnexoActividad[]>([]);
  const [cargandoAnexos, setCargandoAnexos] = useState(false);
  const [errorAnexos, setErrorAnexos] = useState<string | null>(null);

  // Estado del formulario de subida
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [descripcionAnexo, setDescripcionAnexo] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const anexosRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (props?.seccionInicial === "anexos") {
      anexosRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [props?.seccionInicial, a?.id]);

  useEffect(() => {
    if (!a?.id) return;
    let cancelado = false;

    async function cargar() {
      if (!a) return;
      setCargandoAnexos(true);
      setErrorAnexos(null);
      try {
        const items = await listarAnexosActividad(a.id);
        if (!cancelado) {
          setAnexos(items);
        }
      } catch (err) {
        if (!cancelado) {
          const mensaje = err instanceof Error ? err.message : "Error al cargar anexos";
          setErrorAnexos(mensaje);
        }
      } finally {
        if (!cancelado) {
          setCargandoAnexos(false);
        }
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [a?.id]);

  if (!a) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Proyectos" }, { label: "Actividad" }]}
        kicker="Ficha de actividad"
        title="Actividad no disponible"
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <EmptyState
          icon={<FileText />}
          title="No hay actividad seleccionada"
          description="Vuelve a la lista y elige una actividad para ver su ficha."
        />
      </PanelShell>
    );
  }

  const modulo = MODULOS_PROYECTOS[a.modulo_dueno];
  const estado = ESTADOS_CANONICOS[a.estado_canonico];

  const puedeEditar =
    !!sesion &&
    (tienePermiso(sesion, a.permiso_editar) ||
      tienePermiso(sesion, "proyectos:escribir") ||
      (!!sesion.rol && ROLES_GESTION_PROYECTOS.includes(sesion.rol)));

  const manejarSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (subiendo) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      setArchivoSeleccionado(files[0]);
    }
  };

  const manejarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (!puedeEditar || subiendo) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setArchivoSeleccionado(files[0]);
    }
  };

  const manejarDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (puedeEditar && !subiendo) {
      setArrastrando(true);
    }
  };

  const manejarDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const manejarSubir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subiendo) return;
    if (!archivoSeleccionado) {
      toast.error("Selecciona un archivo antes de subir.");
      return;
    }

    if (archivoSeleccionado.size > 25 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo permitido de 25 MB.");
      return;
    }

    if (archivoSeleccionado.size === 0) {
      toast.error("El archivo seleccionado está vacío.");
      return;
    }

    setSubiendo(true);
    try {
      const nuevoAnexo = await subirAnexoActividad(
        a.id,
        archivoSeleccionado,
        descripcionAnexo || undefined,
      );
      setAnexos((prev) => [nuevoAnexo, ...prev]);
      setArchivoSeleccionado(null);
      setDescripcionAnexo("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Anexo adjuntado exitosamente.");
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al subir el anexo";
      toast.error(mensaje);
    } finally {
      setSubiendo(false);
    }
  };

  const manejarDescargar = async (anexo: AnexoActividad) => {
    setDescargandoId(anexo.id);
    try {
      await descargarAnexoActividad(a.id, anexo.id, anexo.nombre_archivo);
      toast.success("Descarga iniciada.");
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al descargar el archivo";
      toast.error(mensaje);
    } finally {
      setDescargandoId(null);
    }
  };

  const manejarEliminar = async (anexoId: string) => {
    setEliminandoId(anexoId);
    try {
      await eliminarAnexoActividad(a.id, anexoId);
      setAnexos((prev) => prev.filter((item) => item.id !== anexoId));
      setConfirmarEliminarId(null);
      toast.success("Anexo eliminado de la actividad.");
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al eliminar el anexo";
      toast.error(mensaje);
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Proyectos" }, { label: modulo.label }]}
      kicker="Ficha de actividad"
      title={a.titulo}
      subtitle={a.etapa || undefined}
      onClose={closeTop}
      onCloseToKey={closeToKey}
      actions={
        puedeEditar && props?.onEditar ? (
          <Button type="button" size="sm" onClick={props.onEditar} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar en {modulo.label}
          </Button>
        ) : null
      }
    >
      <div className="w-full space-y-6 px-5 py-6 sm:px-6">
        {/* ================= IDENTIDAD Y ESTADO ================= */}
        <section
          aria-label="Identidad de la actividad"
          className="rounded-xl border border-border bg-surface-1 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-bold text-primary">{a.codigo}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {modulo.label}
              </Badge>
              <Badge variant={estado.tone} className="text-[10px]">
                {estado.label}
              </Badge>
            </div>
          </div>
          {a.avance_pct > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-2xs text-text-secondary">
                <span>Avance reportado por el módulo dueño</span>
                <span className="font-semibold tabular-nums">{Math.round(a.avance_pct)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={`Avance ${Math.round(a.avance_pct)}%`}
                aria-valuenow={Math.round(a.avance_pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(Math.round(a.avance_pct), 100)}%` }}
                />
              </div>
            </div>
          )}
          {!puedeEditar && (
            <p className="mt-3 text-2xs text-text-tertiary">
              Lectura institucional: tu rol no tiene permisos de edición sobre esta actividad. Los
              archivos adjuntos están disponibles para consulta y descarga con tu sesión.
            </p>
          )}
        </section>

        {/* ================= UBICACIÓN Y VENTANA ================= */}
        <section
          aria-label="Ubicación y ventana de la actividad"
          className="grid gap-4 rounded-xl border border-border bg-surface-1 p-4 sm:grid-cols-2"
        >
          {filaDetalle(<MapPin className="size-4" />, "Territorio", a.territorio)}
          {filaDetalle(<MapPin className="size-4" />, "Lugar", a.lugar ?? "")}
          {filaDetalle(<Clock className="size-4" />, "Ventana temporal", ventanaDe(a))}
          {filaDetalle(<Clock className="size-4" />, "Horario", horarioDe(a))}
          {filaDetalle(<FileText className="size-4" />, "Responsable", a.responsable)}
        </section>

        {/* ================= DESCRIPCIÓN COMPLETA ================= */}
        <section aria-label="Descripción de la actividad" className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Descripción
          </h3>
          <p className="whitespace-normal break-words text-sm leading-relaxed text-text-secondary">
            {a.descripcion || "El módulo dueño no registró descripción para esta actividad."}
          </p>
        </section>

        {/* ================= ANEXOS Y ARCHIVOS ADJUNTOS ================= */}
        <section
          ref={anexosRef}
          aria-label="Anexos y archivos adjuntos"
          className="space-y-4 rounded-xl border border-border bg-surface-1 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text-primary">
                Anexos y Archivos Adjuntos
              </h3>
              <Badge variant="outline" className="text-xs font-mono">
                {anexos.length}
              </Badge>
            </div>
            {puedeEditar && (
              <span className="text-2xs text-text-tertiary">
                Máximo 25 MB (PDF, Word, Excel, PowerPoint, imágenes)
              </span>
            )}
          </div>

          {/* Formulario de subida de archivos (solo para usuarios con permisos) */}
          {puedeEditar ? (
            <form onSubmit={manejarSubir} className="space-y-3">
              <div
                onDrop={manejarDrop}
                onDragOver={manejarDragOver}
                onDragLeave={manejarDragLeave}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                  arrastrando
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface-2/50 hover:bg-surface-2"
                }`}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Archivo adjunto de la actividad"
                  className="hidden"
                  onChange={manejarSeleccionarArchivo}
                  disabled={subiendo}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif,.svg"
                />

                {!archivoSeleccionado ? (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="size-6 text-text-tertiary" aria-hidden="true" />
                    <span className="text-xs font-medium text-text-primary">
                      Arrastra un archivo aquí o selecciónalo desde tu equipo.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={subiendo}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Seleccionar archivo
                    </Button>
                    <span className="text-2xs text-text-tertiary">
                      Formatos: Documentos oficiales, hojas de cálculo, presentaciones o evidencias fotográficas
                    </span>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-between gap-3 text-left">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {obtenerIconoArchivo(archivoSeleccionado.type, archivoSeleccionado.name)}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-text-primary">
                          {archivoSeleccionado.name}
                        </p>
                        <p className="text-2xs text-text-tertiary">
                          {formatoTamano(archivoSeleccionado.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setArchivoSeleccionado(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="size-7 p-0 text-text-tertiary hover:text-text-primary"
                      title="Quitar archivo"
                      aria-label="Quitar archivo seleccionado"
                      disabled={subiendo}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>

              {archivoSeleccionado && (
                <div className="space-y-2">
                  <FormField
                    label="Descripción del adjunto"
                    description="Opcional. Indica el contenido o propósito del documento."
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        value={descripcionAnexo}
                        onChange={(e) => setDescripcionAnexo(e.target.value)}
                        placeholder="Por ejemplo: acta firmada o lista de asistencia"
                        maxLength={250}
                        disabled={subiendo}
                        className="text-xs"
                      />
                    )}
                  </FormField>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setArchivoSeleccionado(null);
                        setDescripcionAnexo("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={subiendo}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={subiendo} className="gap-1.5">
                      {subiendo ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="size-3.5" aria-hidden="true" />
                          Adjuntar a actividad
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            <p className="text-2xs text-text-tertiary">
              Modo consulta institucional: los archivos adjuntos a esta actividad están disponibles para descarga técnica y auditoría.
            </p>
          )}

          {/* Lista de anexos existentes */}
          {cargandoAnexos ? (
            <div className="flex items-center justify-center py-6 text-text-tertiary">
              <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
              <span className="text-xs">Cargando anexos...</span>
            </div>
          ) : errorAnexos ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{errorAnexos}</span>
            </div>
          ) : anexos.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-surface-2/30 py-6 text-center text-xs text-text-tertiary">
              No hay archivos adjuntos en esta actividad.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {anexos.map((anexo) => {
                const esDescargando = descargandoId === anexo.id;
                const esEliminando = eliminandoId === anexo.id;
                const enConfirmacion = confirmarEliminarId === anexo.id;

                return (
                  <li
                    key={anexo.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-3 transition-colors hover:bg-surface-2/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {obtenerIconoArchivo(anexo.tipo_mime, anexo.nombre_archivo)}
                        <div className="min-w-0">
                          <p
                            className="truncate text-xs font-semibold text-text-primary"
                            title={anexo.nombre_archivo}
                          >
                            {anexo.nombre_archivo}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-2xs text-text-tertiary">
                            <span>{formatoTamano(anexo.tamano_bytes)}</span>
                            <span>•</span>
                            <span>{formatoFechaHora(anexo.creado_en)}</span>
                            {anexo.subido_por && (
                              <>
                                <span>•</span>
                                <span>Por: {anexo.subido_por}</span>
                              </>
                            )}
                          </div>
                          {anexo.descripcion && (
                            <p className="mt-1 text-2xs italic text-text-secondary">
                              &ldquo;{anexo.descripcion}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => manejarDescargar(anexo)}
                          disabled={esDescargando}
                          className="size-8 p-0"
                          title="Descargar archivo"
                          aria-label={`Descargar ${anexo.nombre_archivo}`}
                        >
                          {esDescargando ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Download className="size-3.5" aria-hidden="true" />
                          )}
                        </Button>

                        {puedeEditar && (
                          <>
                            {enConfirmacion ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => manejarEliminar(anexo.id)}
                                  disabled={esEliminando}
                                  className="h-8 px-2 text-2xs"
                                >
                                  {esEliminando ? "..." : "Confirmar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmarEliminarId(null)}
                                  className="size-8 p-0"
                                  aria-label={`Cancelar eliminación de ${anexo.nombre_archivo}`}
                                >
                                  <X className="size-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmarEliminarId(anexo.id)}
                                disabled={esEliminando}
                                className="size-8 p-0 text-text-tertiary hover:text-destructive"
                                title="Eliminar anexo"
                                aria-label={`Eliminar ${anexo.nombre_archivo}`}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ================= MÓDULO DUEÑO ================= */}
        <section
          aria-label="Módulo dueño"
          className="rounded-xl border border-border bg-surface-1 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-xs text-text-secondary">
              La gestión nativa vive en <span className="font-semibold">{modulo.label}</span>; esta
              ficha solo proyecta el agregado read-only y sus evidencias documentales adjuntas.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(modulo.rutaPlataforma)}
              className="shrink-0 gap-1.5"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Abrir {modulo.label}
            </Button>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
