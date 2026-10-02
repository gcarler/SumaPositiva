"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Building2,
  ArrowRight,
  Search,
  Sparkles,
  Newspaper,
  Tag,
} from "lucide-react";
import { usePanels } from "@/core/panels/panel-store";
import { useNoticiasStore } from "../state/noticias-store";
import type { CategoriaNoticia, Noticia } from "../models/noticia";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";

const CATEGORIAS: { id: CategoriaNoticia | "todas"; label: string; tone: StatusTone }[] = [
  { id: "todas", label: "Todas las categorías", tone: "neutral" },
  { id: "avance_politica", label: "Avances de Política", tone: "ember" },
  { id: "mesa_realizada", label: "Mesas Realizadas", tone: "success" },
  { id: "acuerdo_distrital", label: "Acuerdos Distritales", tone: "info" },
  { id: "convocatoria", label: "Convocatorias", tone: "warning" },
  { id: "informe", label: "Informes Técnicos", tone: "neutral" },
  { id: "logro", label: "Logros Comunitarios", tone: "warning" },
];

export function NoticiasView() {
  const reducedMotion = useReducedMotion();
  const { openPanel } = usePanels();
  const noticias = useNoticiasStore((s) => s.noticias);
  const filtroCategoria = useNoticiasStore((s) => s.filtroCategoria);
  const setFiltro = useNoticiasStore((s) => s.setFiltro);
  const busqueda = useNoticiasStore((s) => s.busqueda);
  const setBusqueda = useNoticiasStore((s) => s.setBusqueda);

  // Noticia destacada para el Hero (primera destacada o primera del listado)
  const noticiaDestacada = useMemo(
    () => noticias.find((n) => n.destacada) || noticias[0],
    [noticias]
  );

  // Filtrado reactivo por categoría y texto de búsqueda
  const noticiasFiltradas = useMemo(() => {
    return noticias.filter((n) => {
      const matchCat =
        filtroCategoria === "todas" ? true : n.categoria === filtroCategoria;
      const matchSearch = busqueda.trim()
        ? n.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
          n.resumen.toLowerCase().includes(busqueda.toLowerCase()) ||
          n.etiquetas.some((t) => t.toLowerCase().includes(busqueda.toLowerCase()))
        : true;
      return matchCat && matchSearch;
    });
  }, [noticias, filtroCategoria, busqueda]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="container-fluid space-y-12 py-8 md:space-y-16 md:py-12">
      {/* ================= HERO NOTICIA DESTACADA ================= */}
      {noticiaDestacada && (
        <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            {/* Imagen portada */}
            <div className="relative h-64 sm:h-80 lg:col-span-7 lg:h-[420px] overflow-hidden">
              <img
                src={noticiaDestacada.imagenPortada}
                alt={noticiaDestacada.titulo}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/80 via-[var(--background)]/30 to-transparent lg:hidden" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge variant="ember" className="gap-1 shadow-md">
                  <Sparkles className="size-3" />
                  Noticia Destacada
                </Badge>
              </div>
            </div>

            {/* Contenido Hero */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 lg:p-10">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusBadge tone="ember">
                    {CATEGORIAS.find((c) => c.id === noticiaDestacada.categoria)?.label || "Avance"}
                  </StatusBadge>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Calendar className="size-3.5" />
                    {new Date(noticiaDestacada.publicadaEn).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-[1.85rem] leading-tight">
                  {noticiaDestacada.titulo}
                </h1>

                <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                  {noticiaDestacada.resumen}
                </p>

                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] pt-2">
                  <Building2 className="size-4 text-[var(--ember)]" />
                  <span>{noticiaDestacada.autor}</span>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => openPanel("noticia", { noticiaId: noticiaDestacada.id })}
                  className="group w-full sm:w-auto"
                >
                  <span>Leer artículo completo</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= BARRA DE FILTROS Y BÚSQUEDA ================= */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] md:text-2xl">
              Actualidad y Avances de la Política Pública
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Registro documental e institucional de las 33 mesas de trabajo en Cartagena
            </p>
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              type="search"
              placeholder="Buscar por palabra o etiqueta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Chips horizontales de categoría */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIAS.map((cat) => {
            const active = filtroCategoria === cat.id;
            return (
              <Button
                key={cat.id}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltro(cat.id)}
                className="shrink-0 text-xs rounded-full h-8 px-3.5"
                aria-pressed={active}
              >
                {cat.label}
              </Button>
            );
          })}
        </div>
      </section>

      {/* ================= GRID DE NOTICIAS ================= */}
      <section>
        {noticiasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-12 text-center space-y-3">
            <Newspaper className="size-10 text-[var(--text-tertiary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              No se encontraron noticias
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm">
              No hay publicaciones que coincidan con los criterios seleccionados. Prueba limpiando los filtros o el buscador.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiltro("todas");
                setBusqueda("");
              }}
            >
              Restablecer filtros
            </Button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {noticiasFiltradas.map((noticia) => (
              <NoticiaCard key={noticia.id} noticia={noticia} variants={itemVariants} />
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

function NoticiaCard({
  noticia,
  variants,
}: {
  noticia: Noticia;
  variants: any;
}) {
  const { openPanel } = usePanels();

  const meta = CATEGORIAS.find((c) => c.id === noticia.categoria) || {
    label: "Noticia",
    tone: "neutral" as StatusTone,
  };

  return (
    <motion.article
      variants={variants}
      onClick={() => openPanel("noticia", { noticiaId: noticia.id })}
      className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:border-[var(--border-strong)] hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Imagen de portada */}
        {noticia.imagenPortada && (
          <div className="relative h-48 w-full overflow-hidden bg-[var(--surface-2)]">
            <img
              src={noticia.imagenPortada}
              alt={noticia.titulo}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {noticia.destacada && (
              <div className="absolute top-2.5 right-2.5">
                <Badge variant="ember" className="text-[10px] shadow-sm">
                  Destacada
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-3">
          {/* Badge de categoría y fecha */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            <time className="text-[11px] text-[var(--text-tertiary)]" dateTime={noticia.publicadaEn}>
              {new Date(noticia.publicadaEn).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </div>

          {/* Título */}
          <h3 className="text-base font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--ember)] transition-colors line-clamp-2">
            {noticia.titulo}
          </h3>

          {/* Resumen */}
          <p className="text-xs leading-relaxed text-[var(--text-secondary)] line-clamp-3">
            {noticia.resumen}
          </p>
        </div>
      </div>

      {/* Footer de la Card */}
      <div className="p-5 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border)] text-xs">
          <span className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[170px]">
            {noticia.autor}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-[var(--ember)] group-hover:underline">
            <span>Leer más</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
