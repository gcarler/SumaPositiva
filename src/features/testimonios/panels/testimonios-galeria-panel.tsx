"use client";

import { useState } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore, esInstitucional } from "@/features/sesion/state/session-store";
import { useTestimoniosPublicos, useResumenTestimonios } from "../services/use-testimonios-queries";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Quote, Sparkles, Plus, ShieldCheck, MapPin, Tag, User } from "lucide-react";
import type { Testimonio } from "../models/testimonio";

export function TestimoniosGaleriaPanel({ entryKey }: { entryKey: string }) {
  const { closeTop, openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const esFuncionario = esInstitucional(sesion);

  const [territorioFiltro, setTerritorioFiltro] = useState<string>("todos");
  const [soloDestacados, setSoloDestacados] = useState<boolean>(false);

  const { data: testimonios, isLoading, error } = useTestimoniosPublicos({
    territorioId: territorioFiltro === "todos" ? undefined : territorioFiltro,
    destacados: soloDestacados || undefined,
  });

  const { data: resumen } = useResumenTestimonios();

  return (
    <PanelShell
      entryKey={entryKey}
      title="Memoria Social y Testimonios"
      subtitle="Relatos vivos de las comunidades de Cartagena de Indias"
      crumbs={[{ label: "Memoria Social" }, { label: "Galería de Testimonios" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6 space-y-6">
        {/* Cabecera con Métricas y Botones de Acción */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
          <div className="flex items-center gap-6">
            <div>
              <span className="block text-2xl font-bold text-[var(--ember)]">
                {resumen?.aprobados ?? (testimonios?.length ?? 0)}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">Relatos Públicos</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <span className="block text-2xl font-bold text-[var(--text-primary)]">
                {resumen?.destacados ?? 0}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">Destacados</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => openPanel("testimonio-editor", {})}
            >
              <Plus className="mr-1.5 size-4" />
              Compartir Testimonio
            </Button>

            {esFuncionario && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPanel("testimonios-moderacion", {})}
              >
                <ShieldCheck className="mr-1.5 size-4" />
                Curaduría Institucional
              </Button>
            )}
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <FormField label="Filtrar testimonios por territorio" className="w-full min-w-0 sm:w-56">
              {(control) => <Select value={territorioFiltro} onValueChange={setTerritorioFiltro}>
                <SelectTrigger {...control} size="sm" className="w-full min-w-0">
                  <SelectValue placeholder="Todos los Territorios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Territorios</SelectItem>
                  {resumen?.por_territorio.map((t) => (
                    <SelectItem key={t.territorio_id} value={t.territorio_id}>
                      {t.nombre} ({t.total_testimonios})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>}
            </FormField>

            <Button
              variant={soloDestacados ? "default" : "outline"}
              size="sm"
              aria-pressed={soloDestacados}
              onClick={() => setSoloDestacados(!soloDestacados)}
              className="text-xs h-8"
            >
              <Sparkles className="mr-1 size-3.5" />
              Solo Destacados
            </Button>
          </div>

          <span className="text-xs text-[var(--text-secondary)]">
            {testimonios?.length ?? 0} relatos encontrados
          </span>
        </div>

        {/* Listado de Relatos */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)]">
            No fue posible cargar los testimonios comunitarios. Intente nuevamente.
          </div>
        ) : testimonios && testimonios.length > 0 ? (
          <div className="space-y-4">
            {testimonios.map((testimonio) => (
              <TestimonioCard key={testimonio.id} testimonio={testimonio} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
            <Quote className="mx-auto size-8 text-[var(--text-secondary)] opacity-50" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No hay testimonios disponibles en esta selección
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Sé la primera persona en compartir la voz y vivencia comunitaria de tu barrio o
              corregimiento.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openPanel("testimonio-editor", {})}
            >
              <Plus className="mr-1.5 size-4" />
              Aportar Testimonio
            </Button>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

function TestimonioCard({ testimonio }: { testimonio: Testimonio }) {
  const esDestacado = testimonio.estado === "DESTACADO";

  return (
    <article
      className={`p-5 rounded-xl border transition-all ${
        esDestacado
          ? "border-[var(--border)] bg-[var(--surface-2)] shadow-sm"
          : "border-[var(--border)] bg-[var(--surface-1)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
            {testimonio.url_foto ? (
              <img
                src={testimonio.url_foto}
                alt={testimonio.nombre_autor}
                className="size-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <User className="size-5" />
            )}
          </div>

          <div className="min-w-0 break-words">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
              {testimonio.nombre_autor}
            </h3>
            {testimonio.organizacion_comunitaria && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {testimonio.organizacion_comunitaria}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {esDestacado && (
            <StatusBadge tone="ember">
              Destacado
            </StatusBadge>
          )}
          <span className="text-[10px] font-mono text-[var(--text-secondary)] px-1.5 py-0.5 rounded bg-[var(--surface-2)]">
            {testimonio.codigo_unico}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)]">
          {testimonio.titulo}
        </h4>
        <blockquote className="text-xs text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--border)] pl-3">
          &ldquo;{testimonio.relato}&rdquo;
        </blockquote>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
        <div className="flex flex-wrap items-center gap-3">
          {testimonio.territorio_nombre && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3 text-[var(--ember)]" />
              {testimonio.territorio_nombre}
            </span>
          )}
          {testimonio.dimension_nombre && (
            <span className="flex items-center gap-1">
              <Tag className="size-3" />
              {testimonio.dimension_nombre}
            </span>
          )}
        </div>

        <time dateTime={testimonio.creado_en || testimonio.creadoEn}>
          {new Date(testimonio.creado_en || testimonio.creadoEn).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
      </div>
    </article>
  );
}
