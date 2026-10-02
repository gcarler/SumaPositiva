"use client";

import { useState, useId } from "react";
import { toast } from "sonner";
import {
  Save,
  Trash2,
  Image as ImageIcon,
  Film,
  Plus,
  X,
  Sparkles,
  Layers,
  Tag,
  Eye,
  FileEdit,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useNoticiasStore } from "../state/noticias-store";
import type {
  CategoriaNoticia,
  EstadoNoticia,
  NoticiaInput,
} from "../models/noticia";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { NoticiaVideoPlayer } from "../components/noticia-video-player";

interface NoticiaEditorPanelProps {
  entryKey: string;
  props?: {
    noticiaId?: string;
  };
}

const CATEGORIAS: { id: CategoriaNoticia; label: string }[] = [
  { id: "avance_politica", label: "Avance de Política" },
  { id: "mesa_realizada", label: "Mesa Realizada" },
  { id: "acuerdo_distrital", label: "Acuerdo Distrital" },
  { id: "convocatoria", label: "Convocatoria" },
  { id: "informe", label: "Informe Técnico" },
  { id: "logro", label: "Logro Comunitario" },
];

export function NoticiaEditorPanel({ entryKey, props }: NoticiaEditorPanelProps) {
  const fileInputId = useId();
  const galleryInputId = useId();
  const { closeTop } = usePanels();
  const noticiaId = props?.noticiaId;

  const noticiaExistente = useNoticiasStore((s) =>
    noticiaId ? s.noticias.find((n) => n.id === noticiaId) : undefined
  );
  const crearNoticia = useNoticiasStore((s) => s.crearNoticia);
  const actualizarNoticia = useNoticiasStore((s) => s.actualizarNoticia);
  const eliminarNoticia = useNoticiasStore((s) => s.eliminarNoticia);

  const esEdicion = Boolean(noticiaExistente);

  // Estados del formulario
  const [titulo, setTitulo] = useState(noticiaExistente?.titulo ?? "");
  const [resumen, setResumen] = useState(noticiaExistente?.resumen ?? "");
  const [contenido, setContenido] = useState(
    noticiaExistente?.contenido ??
      "## Introducción\n\nDescribe aquí el desarrollo de la noticia o acuerdo...\n\n### Puntos Clave\n\n- Punto 1\n- Punto 2"
  );
  const [categoria, setCategoria] = useState<CategoriaNoticia>(
    noticiaExistente?.categoria ?? "avance_politica"
  );
  const [autor, setAutor] = useState(
    noticiaExistente?.autor ?? "Secretaría de Planeación Distrital"
  );
  const [estado, setEstado] = useState<EstadoNoticia>(
    noticiaExistente?.estado ?? "publicada"
  );
  const [ordenPrioridad, setOrdenPrioridad] = useState<number>(
    noticiaExistente?.ordenPrioridad ?? 1
  );
  const [destacada, setDestacada] = useState<boolean>(
    noticiaExistente?.destacada ?? false
  );
  const [imagenPortada, setImagenPortada] = useState<string>(
    noticiaExistente?.imagenPortada ?? ""
  );
  const [videoUrl, setVideoUrl] = useState<string>(
    noticiaExistente?.videoUrl ?? ""
  );
  const [galeria, setGaleria] = useState<string[]>(
    noticiaExistente?.galeria ?? []
  );
  const [nuevaFotoUrl, setNuevaFotoUrl] = useState("");
  const [etiquetas, setEtiquetas] = useState<string[]>(
    noticiaExistente?.etiquetas ?? ["cartagena-2026", "participacion"]
  );
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manejo de carga de imagen de portada (File)
  const handleCargarPortada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen supera los 8MB permitidos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImagenPortada(event.target.result);
        toast.success("Imagen de portada cargada");
      }
    };
    reader.readAsDataURL(file);
  };

  // Manejo de carga de fotos a galería (File)
  const handleCargarGaleria = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setGaleria((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success("Foto(s) agregada(s) a la galería");
  };

  const handleAgregarFotoUrl = () => {
    if (!nuevaFotoUrl.trim()) return;
    setGaleria((prev) => [...prev, nuevaFotoUrl.trim()]);
    setNuevaFotoUrl("");
  };

  const handleRemoverFotoGaleria = (index: number) => {
    setGaleria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAgregarEtiqueta = () => {
    const tag = nuevaEtiqueta.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!tag) return;
    if (!etiquetas.includes(tag)) {
      setEtiquetas([...etiquetas, tag]);
    }
    setNuevaEtiqueta("");
  };

  const handleRemoverEtiqueta = (tagToRemove: string) => {
    setEtiquetas(etiquetas.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (!resumen.trim()) {
      toast.error("El resumen es obligatorio para las cards informativas");
      return;
    }

    if (!contenido.trim()) {
      toast.error("El contenido en Markdown no puede estar vacío");
      return;
    }

    setIsSubmitting(true);
    try {
      const datos: NoticiaInput = {
        titulo: titulo.trim(),
        resumen: resumen.trim(),
        contenido: contenido.trim(),
        categoria,
        autor: autor.trim() || "Secretaría de Planeación Distrital",
        estado,
        ordenPrioridad: Math.max(1, Number(ordenPrioridad) || 1),
        destacada,
        imagenPortada: imagenPortada.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        galeria: galeria.length > 0 ? galeria : undefined,
        etiquetas,
      };

      if (esEdicion && noticiaId) {
        actualizarNoticia(noticiaId, datos);
        toast.success("Noticia actualizada con éxito", {
          description: titulo,
        });
      } else {
        crearNoticia(datos);
        toast.success("Nueva noticia creada y registrada", {
          description: titulo,
        });
      }

      closeTop();
    } catch {
      toast.error("No se pudo guardar la noticia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = () => {
    if (!noticiaId) return;
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente esta noticia?")) {
      eliminarNoticia(noticiaId);
      toast.success("Noticia eliminada correctamente");
      closeTop();
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      title={esEdicion ? "Editar Noticia o Comunicado" : "Nueva Noticia Institucional"}
      subtitle="Gestión editorial, priorización y publicación multimedia de la política"
      crumbs={[
        { label: "Noticias" },
        { label: esEdicion ? "Editor" : "Crear" },
      ]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      actions={
        esEdicion ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEliminar}
            className="gap-1.5"
            aria-label="Eliminar noticia"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        ) : undefined
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Título Principal */}
        <div className="space-y-2">
          <Label htmlFor="titulo" className="text-xs font-semibold text-[var(--text-primary)]">
            Título de la Noticia <span className="text-[var(--ember)]">*</span>
          </Label>
          <Input
            id="titulo"
            type="text"
            placeholder="Ej. Cartagena inicia su proceso de Seguridad Humana..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        {/* Resumen para Cards y OG */}
        <div className="space-y-2">
          <Label htmlFor="resumen" className="text-xs font-semibold text-[var(--text-primary)]">
            Resumen o Copete (1 a 2 párrafos) <span className="text-[var(--ember)]">*</span>
          </Label>
          <Textarea
            id="resumen"
            rows={3}
            placeholder="Resumen ejecutivo que aparecerá en las tarjetas de la galería pública y el home..."
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            required
          />
        </div>

        {/* Controles de Publicación y Prioridad */}
        <div className="grid gap-4 sm:grid-cols-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          {/* Estado de Publicación */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--text-primary)]">
              Estado de Publicación <span className="text-[var(--ember)]">*</span>
            </Label>
            <Select
              value={estado}
              onValueChange={(val) => setEstado(val as EstadoNoticia)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publicada">🟢 Publicada (Visible)</SelectItem>
                <SelectItem value="borrador">🟡 Borrador (Oculto)</SelectItem>
                <SelectItem value="archivada">⚪ Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orden de Prioridad */}
          <div className="space-y-1.5">
            <Label htmlFor="ordenPrioridad" className="text-xs font-semibold text-[var(--text-primary)]">
              Orden de Prioridad <span className="text-[var(--ember)]">*</span>
            </Label>
            <Input
              id="ordenPrioridad"
              type="number"
              min={1}
              max={999}
              value={ordenPrioridad}
              onChange={(e) => setOrdenPrioridad(parseInt(e.target.value, 10) || 1)}
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">
              1 = Máxima prioridad (sale de primero)
            </p>
          </div>

          {/* Toggle Destacada en Home */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <Label htmlFor="toggle-destacada" className="text-xs font-semibold text-[var(--text-primary)]">
              Destacar en Hero del Home
            </Label>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="toggle-destacada"
                checked={destacada}
                onCheckedChange={setDestacada}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {destacada ? "Sí, destacada" : "Estándar"}
              </span>
            </div>
          </div>
        </div>

        {/* Categoría y Autor */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--text-primary)]">
              Categoría Temática <span className="text-[var(--ember)]">*</span>
            </Label>
            <Select
              value={categoria}
              onValueChange={(val) => setCategoria(val as CategoriaNoticia)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="autor" className="text-xs font-semibold text-[var(--text-primary)]">
              Autor / Dependencia Responsable
            </Label>
            <Input
              id="autor"
              type="text"
              placeholder="Ej. Secretaría de Planeación Distrital"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
            />
          </div>
        </div>

        {/* Sección Multimedia: Portada y Video */}
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <ImageIcon className="size-4 text-[var(--ember)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Multimedia Principal (Portada y Video)
            </h3>
          </div>

          {/* Imagen de Portada */}
          <div className="space-y-2">
            <Label htmlFor="imagenPortada" className="text-xs font-semibold text-[var(--text-primary)]">
              URL Imagen de Portada
            </Label>
            <div className="flex gap-2">
              <Input
                id="imagenPortada"
                type="text"
                placeholder="https://images.unsplash.com/... o cargar archivo"
                value={imagenPortada}
                onChange={(e) => setImagenPortada(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => document.getElementById(fileInputId)?.click()}
                className="shrink-0"
              >
                Cargar Foto
              </Button>
              <Input
                id={fileInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCargarPortada}
              />
            </div>

            {imagenPortada && (
              <div className="relative mt-2 h-40 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                <img
                  src={imagenPortada}
                  alt="Vista previa de portada"
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setImagenPortada("")}
                  className="absolute top-2 right-2 size-7 p-0"
                  aria-label="Quitar portada"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Video URL */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <Label htmlFor="videoUrl" className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Film className="size-3.5 text-[var(--ember)]" />
              <span>URL de Video (YouTube, Vimeo o enlace directo MP4)</span>
            </Label>
            <Input
              id="videoUrl"
              type="text"
              placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {videoUrl && (
              <div className="pt-2">
                <p className="text-[11px] text-[var(--text-secondary)] mb-1">
                  Vista previa del reproductor:
                </p>
                <NoticiaVideoPlayer url={videoUrl} />
              </div>
            )}
          </div>
        </div>

        {/* Galería de Fotos de Soporte */}
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[var(--ember)]" />
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Galería de Fotos de Soporte ({galeria.length})
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(galleryInputId)?.click()}
              className="gap-1.5 text-xs h-7"
            >
              <Plus className="size-3.5" />
              <span>Cargar archivos</span>
            </Button>
            <Input
              id={galleryInputId}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleCargarGaleria}
            />
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="O pega URL de foto para agregar a la galería..."
              value={nuevaFotoUrl}
              onChange={(e) => setNuevaFotoUrl(e.target.value)}
              className="text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAgregarFotoUrl}
              className="shrink-0"
            >
              Agregar URL
            </Button>
          </div>

          {galeria.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
              {galeria.map((foto, index) => (
                <div
                  key={index}
                  className="relative group h-20 rounded-md overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]"
                >
                  <img src={foto} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoverFotoGaleria(index)}
                    className="absolute top-1 right-1 size-5 p-0 opacity-80 hover:opacity-100"
                    aria-label={`Quitar foto ${index + 1}`}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contenido en Markdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="contenido" className="text-xs font-semibold text-[var(--text-primary)]">
              Contenido Completo del Artículo (Markdown) <span className="text-[var(--ember)]">*</span>
            </Label>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Soporta títulos (#), listas, negritas y citas (&gt;)
            </span>
          </div>
          <Textarea
            id="contenido"
            rows={10}
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            className="font-mono text-xs leading-relaxed"
            required
          />
        </div>

        {/* Etiquetas Temáticas */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Tag className="size-3.5 text-[var(--ember)]" />
            <span>Etiquetas Temáticas</span>
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ej. seguridad, mesas, localidad-1..."
              value={nuevaEtiqueta}
              onChange={(e) => setNuevaEtiqueta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAgregarEtiqueta();
                }
              }}
              className="text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAgregarEtiqueta}
              className="shrink-0"
            >
              Añadir
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {etiquetas.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                #{tag}
                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => handleRemoverEtiqueta(tag)}
                  className="rounded-full p-0.5 hover:bg-[var(--surface-3)]"
                  aria-label={`Eliminar etiqueta ${tag}`}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Barra de Acciones del Formulario */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={closeTop}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="default"
            size="default"
            disabled={isSubmitting}
            className="gap-2"
          >
            <Save className="size-4" />
            <span>{esEdicion ? "Actualizar Noticia" : "Publicar Noticia"}</span>
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}
