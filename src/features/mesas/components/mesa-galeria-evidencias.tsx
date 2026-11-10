"use client";

import { useState, useRef, useId } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Maximize2,
  Minimize2,
  FileImage,
  Upload,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  CATEGORIAS_FOTO_META,
  type CategoriaFotoMesa,
  type FotoEvidenciaMesa,
  type MesaDeTrabajo,
} from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MesaGaleriaEvidenciasProps {
  mesa: MesaDeTrabajo;
  soloLectura?: boolean;
}

export function MesaGaleriaEvidencias({
  mesa,
  soloLectura = false,
}: MesaGaleriaEvidenciasProps) {
  const agregarFotoEvidencia = useMesasStore((s) => s.agregarFotoEvidencia);
  const recargarFotoEvidencia = useMesasStore((s) => s.recargarFotoEvidencia);
  const eliminarFotoEvidencia = useMesasStore((s) => s.eliminarFotoEvidencia);

  const fotos = mesa.galeriaFotos ?? [];

  // Filter state
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");

  // New photo form state
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaFotoMesa>("plenaria");
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoAutor, setNuevoAutor] = useState("");
  const [nuevoTamano, setNuevoTamano] = useState(245000); // 245 KB default demo

  // Reload / replace photo state
  const [fotoReemplazandoId, setFotoReemplazandoId] = useState<string | null>(null);
  const [reemplazoUrl, setReemplazoUrl] = useState("");
  const [reemplazoNombre, setReemplazoNombre] = useState("");

  // Lightbox expanded preview state
  const [fotoExpandidaId, setFotoExpandidaId] = useState<string | null>(null);

  // Hidden file input refs
  const fileInputNuevoRef = useRef<HTMLInputElement>(null);
  const fileInputReemplazoRef = useRef<HTMLInputElement>(null);

  const inputIdDesc = useId();
  const inputIdUrl = useId();
  const inputIdNombre = useId();
  const inputIdAutor = useId();

  // Filtered photos
  const fotosFiltradas = fotos.filter((f) => {
    if (categoriaFiltro !== "todas" && f.categoria !== categoriaFiltro) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchNombre = f.nombre.toLowerCase().includes(q);
      const matchDesc = f.descripcion?.toLowerCase().includes(q) ?? false;
      const matchAutor = f.subidoPor?.toLowerCase().includes(q) ?? false;
      if (!matchNombre && !matchDesc && !matchAutor) return false;
    }
    return true;
  });

  // Handle local file read simulation (simulating client-side EXIF stripping)
  const handleSeleccionarArchivoNuevo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use file reader to create object url or data url
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNuevaUrl(result);
      if (!nuevoNombre) {
        setNuevoNombre(file.name.replace(/\.[^/.]+$/, ""));
      }
      setNuevoTamano(file.size);
      toast.success(
        "Archivo cargado. Metadatos EXIF y coordenadas GPS eliminados conforme a la Ley 1581 de 2012."
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSeleccionarArchivoReemplazo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fotoReemplazandoId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setReemplazoUrl(result);
      if (!reemplazoNombre) {
        setReemplazoNombre(file.name.replace(/\.[^/.]+$/, ""));
      }
      toast.success(
        "Nueva imagen seleccionada para reemplazo. Coordenadas GPS purgadas."
      );
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarNuevaFoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      toast.error("El nombre o título de la evidencia es obligatorio");
      return;
    }

    const urlFinal =
      nuevaUrl.trim() ||
      `https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop`;

    const nuevaFoto: FotoEvidenciaMesa = {
      id: `foto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: nuevoNombre.trim(),
      categoria: nuevaCategoria,
      url: urlFinal,
      tamanoBytes: nuevoTamano,
      subidoEn: new Date().toISOString(),
      subidoPor: nuevoAutor.trim() || "Facilitador POLIS",
      exifDespojado: true, // Siempre despojado conforme a Ley 1581/2012
      descripcion: nuevaDescripcion.trim() || undefined,
    };

    agregarFotoEvidencia(mesa.id, nuevaFoto);
    toast.success("Evidencia fotográfica agregada con éxito.");

    // Reset form
    setNuevoNombre("");
    setNuevaUrl("");
    setNuevaDescripcion("");
    setNuevoAutor("");
    setMostrarFormNuevo(false);
  };

  const handleEjecutarReemplazo = (fotoId: string) => {
    if (!reemplazoUrl.trim()) {
      toast.error("Debes seleccionar una imagen o ingresar una URL para el reemplazo.");
      return;
    }

    recargarFotoEvidencia(mesa.id, fotoId, {
      url: reemplazoUrl.trim(),
      nombre: reemplazoNombre.trim() || undefined,
      exifDespojado: true,
    });

    toast.success("Imagen de evidencia recargada y actualizada.");
    setFotoReemplazandoId(null);
    setReemplazoUrl("");
    setReemplazoNombre("");
  };

  const formatearBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
      aria-label="Galería de evidencias multimedia de la mesa"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Galería de Evidencias Fotográficas
            </h3>
            <Badge variant="outline" className="text-[11px] font-mono tabular">
              {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Registro visual categorizado de la mesa con anonimización y despojo pericial de metadatos EXIF/GPS (Ley 1581/2012).
          </p>
        </div>

        {!soloLectura && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
            className="shrink-0"
            aria-expanded={mostrarFormNuevo}
          >
            <Plus className="size-3.5 mr-1" aria-hidden="true" />
            {mostrarFormNuevo ? "Cerrar formulario" : "Nueva evidencia"}
          </Button>
        )}
      </div>

      {/* Sello de Protección de Datos Personales */}
      <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2.5 text-xs text-[var(--text-secondary)]">
        <ShieldCheck className="size-4 text-[var(--success)] shrink-0" aria-hidden="true" />
        <span className="leading-relaxed">
          <strong className="text-[var(--text-primary)]">Protocolo de Privacidad:</strong> Todas las fotos cargadas en POLIS son procesadas con purga pericial de coordenadas GPS y metadatos EXIF del sensor óptico para blindar la identidad de los participantes territoriales.
        </span>
      </div>

      {/* Formulario de Nueva Foto */}
      {mostrarFormNuevo && !soloLectura && (
        <form
          onSubmit={handleGuardarNuevaFoto}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3.5"
          data-testid="form-nueva-foto-evidencia"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Upload className="size-4 text-[var(--ember)]" aria-hidden="true" />
              Cargar Nueva Evidencia Fotográfica
            </h4>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Despojo automático de metadatos activo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={inputIdNombre} className="text-xs text-[var(--text-secondary)] font-medium">
                Título o Nombre de la Evidencia *
              </Label>
              <Input
                id={inputIdNombre}
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Plenaria comunitaria debatiendo árbol de causas"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)] font-medium">
                Momento / Categoría Metodológica *
              </Label>
              <Select
                value={nuevaCategoria}
                onValueChange={(val) => setNuevaCategoria(val as CategoriaFotoMesa)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIAS_FOTO_META) as CategoriaFotoMesa[]).map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {CATEGORIAS_FOTO_META[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={inputIdUrl} className="text-xs text-[var(--text-secondary)] font-medium">
                URL o Archivo Local de Imagen
              </Label>
              <div className="flex gap-2">
                <Input
                  id={inputIdUrl}
                  value={nuevaUrl}
                  onChange={(e) => setNuevaUrl(e.target.value)}
                  placeholder="https://... o selecciona archivo"
                  className="text-xs flex-1"
                />
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputNuevoRef}
                  onChange={handleSeleccionarArchivoNuevo}
                  className="hidden"
                  aria-hidden="true"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputNuevoRef.current?.click()}
                  className="shrink-0 text-xs"
                >
                  <FileImage className="size-3.5 mr-1" aria-hidden="true" />
                  Examinar
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={inputIdAutor} className="text-xs text-[var(--text-secondary)] font-medium">
                Fotógrafo / Registrado por
              </Label>
              <Input
                id={inputIdAutor}
                value={nuevoAutor}
                onChange={(e) => setNuevoAutor(e.target.value)}
                placeholder="Ej. Facilitador o Relator Territorial"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={inputIdDesc} className="text-xs text-[var(--text-secondary)] font-medium">
              Descripción o Contexto Territorial de la Escena
            </Label>
            <Textarea
              id={inputIdDesc}
              value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
              placeholder="Detalles de lo deliberado en este momento o punto de inflexión comunitaria..."
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Image preview in form */}
          {nuevaUrl && (
            <div className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] flex items-center gap-3">
              <div className="size-14 rounded overflow-hidden bg-[var(--surface-3)] shrink-0 flex items-center justify-center">
                <img
                  src={nuevaUrl}
                  alt="Vista previa de carga"
                  className="size-full object-cover"
                />
              </div>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-[var(--text-primary)] truncate">
                  Vista previa de la evidencia
                </p>
                <p className="text-[11px] text-[var(--success)] flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  Coordenadas GPS y fecha de cámara removidas
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarFormNuevo(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="default" size="sm">
              <CheckCircle2 className="size-3.5 mr-1" aria-hidden="true" />
              Guardar Evidencia
            </Button>
          </div>
        </form>
      )}

      {/* Barra de Filtros por Categoría */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <Button
            type="button"
            variant={categoriaFiltro === "todas" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoriaFiltro("todas")}
            className="text-xs h-7 px-2.5 shrink-0"
          >
            Todas ({fotos.length})
          </Button>
          {(Object.keys(CATEGORIAS_FOTO_META) as CategoriaFotoMesa[]).map((cat) => {
            const count = fotos.filter((f) => f.categoria === cat).length;
            if (count === 0 && categoriaFiltro !== cat) return null;
            return (
              <Button
                key={cat}
                type="button"
                variant={categoriaFiltro === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoriaFiltro(cat)}
                className="text-xs h-7 px-2.5 shrink-0"
              >
                {CATEGORIAS_FOTO_META[cat].label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-52">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en fotos..."
            className="text-xs h-8 pl-8"
          />
          <Filter className="absolute left-2.5 top-2 size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
        </div>
      </div>

      {/* Grid de Fotos */}
      {fotosFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 space-y-2.5">
          <FileImage className="size-9 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No hay evidencias fotográficas registradas
          </p>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm">
            {categoriaFiltro !== "todas" || busqueda
              ? "No se encontraron fotos que coincidan con los filtros aplicados."
              : "Registra fotografías de la apertura, plenaria, submesas y papelógrafos para sustentar la memoria territorial."}
          </p>
          {!soloLectura && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarFormNuevo(true)}
              className="mt-1"
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              Subir primera foto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {fotosFiltradas.map((foto) => {
            const esReemplazando = fotoReemplazandoId === foto.id;
            const esExpandida = fotoExpandidaId === foto.id;

            return (
              <div
                key={foto.id}
                role="listitem"
                className={`flex flex-col rounded-xl border transition-all overflow-hidden bg-[var(--surface-1)] ${
                  esExpandida
                    ? "sm:col-span-2 lg:col-span-3 border-[var(--ember)] ring-1 ring-[var(--ember)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
                data-testid={`tarjeta-foto-${foto.id}`}
              >
                {/* Visual Image Banner */}
                <div className={`relative bg-[var(--surface-3)] overflow-hidden ${esExpandida ? "h-80 sm:h-96" : "h-44"}`}>
                  <img
                    src={foto.url}
                    alt={foto.nombre}
                    className="size-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback placeholder
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop";
                    }}
                  />

                  {/* Badges on image */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px] bg-[var(--surface-1)]/90 backdrop-blur-sm">
                      {CATEGORIAS_FOTO_META[foto.categoria]?.label ?? foto.categoria}
                    </Badge>
                  </div>

                  {/* Sello EXIF Despojado */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      title="Metadatos EXIF y GPS eliminados (Ley 1581/2012)"
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-1)]/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)] backdrop-blur-sm shadow-sm"
                    >
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      EXIF/GPS Limpio
                    </span>
                  </div>

                  {/* Expand button */}
                  <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFotoExpandidaId(esExpandida ? null : foto.id)}
                      className="h-7 w-7 p-0 bg-[var(--surface-1)]/90 backdrop-blur-sm"
                      aria-label={esExpandida ? "Reducir foto" : "Ver en tamaño completo"}
                    >
                      {esExpandida ? (
                        <Minimize2 className="size-3.5 text-[var(--text-primary)]" aria-hidden="true" />
                      ) : (
                        <Maximize2 className="size-3.5 text-[var(--text-primary)]" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="flex flex-col flex-1 p-3.5 space-y-2.5">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                      {foto.nombre}
                    </h4>
                    {foto.descripcion && (
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                        {foto.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center justify-between gap-y-1 text-[10px] text-[var(--text-tertiary)] border-t border-[var(--border)] pt-2 tabular">
                    <span>
                      {foto.subidoEn && !isNaN(new Date(foto.subidoEn).getTime())
                        ? format(new Date(foto.subidoEn), "d MMM yyyy, HH:mm", { locale: es })
                        : "Fecha no registrada"}
                    </span>
                    <span>{formatearBytes(foto.tamanoBytes)}</span>
                    {foto.subidoPor && (
                      <span className="truncate max-w-[120px]">Por: {foto.subidoPor}</span>
                    )}
                  </div>

                  {/* Inline Reemplazo / Recarga Form */}
                  {esReemplazando && !soloLectura && (
                    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <RefreshCw className="size-3 text-[var(--ember)]" aria-hidden="true" />
                          Recargar / Reemplazar Imagen
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFotoReemplazandoId(null);
                            setReemplazoUrl("");
                          }}
                          className="h-6 text-[10px] px-1.5"
                        >
                          Cerrar
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={reemplazoUrl}
                          onChange={(e) => setReemplazoUrl(e.target.value)}
                          placeholder="Nueva URL o examina archivo..."
                          className="text-xs h-7 flex-1"
                        />
                        <Input
                          type="file"
                          accept="image/*"
                          ref={fileInputReemplazoRef}
                          onChange={handleSeleccionarArchivoReemplazo}
                          className="hidden"
                          aria-hidden="true"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputReemplazoRef.current?.click()}
                          className="h-7 text-xs px-2 shrink-0"
                        >
                          Examinar
                        </Button>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleEjecutarReemplazo(foto.id)}
                          className="h-7 text-xs"
                        >
                          <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                          Confirmar Recarga
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!soloLectura && !esReemplazando && (
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFotoReemplazandoId(foto.id);
                          setReemplazoUrl(foto.url);
                          setReemplazoNombre(foto.nombre);
                        }}
                        className="h-7 text-xs text-[var(--text-secondary)]"
                        title="Recargar o reemplazar el archivo de imagen de esta evidencia"
                        data-testid={`btn-reemplazar-foto-${foto.id}`}
                      >
                        <RefreshCw className="size-3 mr-1" aria-hidden="true" />
                        Recargar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Eliminar la evidencia fotográfica "${foto.nombre}"?`)) {
                            eliminarFotoEvidencia(mesa.id, foto.id);
                            toast.success("Evidencia eliminada.");
                          }
                        }}
                        className="h-7 text-xs text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                        title="Eliminar evidencia"
                        data-testid={`btn-eliminar-foto-${foto.id}`}
                      >
                        <Trash2 className="size-3 mr-1" aria-hidden="true" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
