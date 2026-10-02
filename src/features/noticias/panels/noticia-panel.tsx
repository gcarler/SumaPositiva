"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Calendar,
  Share2,
  Tag,
  Check,
  Building2,
  Compass,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useNoticiasStore } from "../state/noticias-store";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import type { CategoriaNoticia } from "../models/noticia";

interface NoticiaPanelProps {
  entryKey: string;
  props: {
    noticiaId: string;
  };
}

const CATEGORIA_META: Record<
  CategoriaNoticia,
  { label: string; tone: StatusTone }
> = {
  avance_politica: { label: "Avance de Política", tone: "ember" },
  mesa_realizada: { label: "Mesa Realizada", tone: "success" },
  acuerdo_distrital: { label: "Acuerdo Distrital", tone: "info" },
  convocatoria: { label: "Convocatoria", tone: "warning" },
  informe: { label: "Informe Técnico", tone: "neutral" },
  logro: { label: "Logro Comunitario", tone: "warning" },
};

export function NoticiaPanel({ entryKey, props }: NoticiaPanelProps) {
  const { closeTop } = usePanels();
  const noticia = useNoticiasStore((s) =>
    s.noticias.find((n) => n.id === props.noticiaId)
  );

  const [copiado, setCopiado] = useState(false);

  const handleCompartir = async () => {
    if (!noticia) return;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/#noticia-${noticia.slug}`
      : "";
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiado(true);
      toast.success("Enlace copiado al portapapeles", {
        description: noticia.titulo,
      });
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.info("Enlace generado", { description: url });
    }
  };

  if (!noticia) {
    return (
      <PanelShell
        entryKey={entryKey}
        title="Noticia no encontrada"
        crumbs={[{ label: "Noticias" }, { label: "Detalle" }]}
        onClose={closeTop}
        onCloseToKey={closeTop}
      >
        <div className="p-8 text-center space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            El artículo institucional solicitado no está disponible o fue retirado.
          </p>
          <Button variant="outline" size="sm" onClick={closeTop}>
            Cerrar panel
          </Button>
        </div>
      </PanelShell>
    );
  }

  const meta = CATEGORIA_META[noticia.categoria];

  return (
    <PanelShell
      entryKey={entryKey}
      title={noticia.titulo}
      subtitle={noticia.resumen}
      crumbs={[{ label: "Noticias" }, { label: "Artículo" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleCompartir}
          className="gap-1.5"
          aria-label="Compartir noticia"
        >
          {copiado ? (
            <>
              <Check className="size-3.5 text-[var(--success)]" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Share2 className="size-3.5" />
              <span>Compartir</span>
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-6 p-6">
        {/* Imagen de portada */}
        {noticia.imagenPortada && (
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
            <img
              src={noticia.imagenPortada}
              alt={noticia.titulo}
              className="h-64 sm:h-72 w-full object-cover"
            />
            {noticia.destacada && (
              <div className="absolute top-3 right-3">
                <Badge variant="ember" className="shadow-sm">
                  Destacada
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Metadatos: Categoría, Fecha, Autor */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Calendar className="size-3.5" />
              {new Date(noticia.publicadaEn).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Building2 className="size-3.5 text-[var(--ember)]" />
            <span className="font-medium text-[var(--text-primary)]">
              {noticia.autor}
            </span>
          </div>
        </div>

        {/* Resumen institucional */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm leading-relaxed text-[var(--text-primary)] font-medium">
          {noticia.resumen}
        </div>

        {/* Contenido en Markdown */}
        <div className="prose prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed space-y-4 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-[var(--text-primary)] [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-[var(--text-primary)] [&>blockquote]:border-l-2 [&>blockquote]:border-[var(--ember)] [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-[var(--text-primary)] [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5">
          <ReactMarkdown>{noticia.contenido}</ReactMarkdown>
        </div>

        {/* Etiquetas */}
        {noticia.etiquetas && noticia.etiquetas.length > 0 && (
          <div className="border-t border-[var(--border)] pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
              <Tag className="size-3.5" />
              <span>Etiquetas temáticas</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noticia.etiquetas.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Barra de acción al final */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Compass className="size-4 text-[var(--ember)]" />
            <span>Proceso vinculado a la Sentencia C-150 de 2015</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompartir}
            className="gap-1.5"
          >
            <Share2 className="size-3.5" />
            <span>Compartir artículo</span>
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
