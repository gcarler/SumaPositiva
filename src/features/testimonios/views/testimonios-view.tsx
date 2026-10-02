"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Quote,
  Plus,
  ShieldCheck,
  MapPin,
  Sparkles,
  User,
  HeartHandshake,
  CheckCircle2,
} from "lucide-react";
import { usePanels } from "@/core/panels/panel-store";
import { useTestimoniosStore } from "../state/testimonios-store";
import type { TipoTestimonio, Testimonio } from "../models/testimonio";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";

const TIPOS: { id: TipoTestimonio | "todos"; label: string }[] = [
  { id: "todos", label: "Todos los testimonios" },
  { id: "ciudadano", label: "Ciudadanía" },
  { id: "lider_comunal", label: "Líderes Comunales & JAC" },
  { id: "funcionario", label: "Servidores Públicos" },
  { id: "academia", label: "Academia & Expertos" },
];

const TIPO_LABELS: Record<TipoTestimonio, string> = {
  ciudadano: "Habitante / Ciudadano(a)",
  lider_comunal: "Líder Comunitario / JAC",
  funcionario: "Servidor(a) Público(a)",
  academia: "Investigación / Academia",
};

export function TestimoniosView() {
  const reducedMotion = useReducedMotion();
  const { openPanel } = usePanels();
  const testimonios = useTestimoniosStore((s) => s.testimonios);
  const filtroTipo = useTestimoniosStore((s) => s.filtroTipo);
  const setFiltro = useTestimoniosStore((s) => s.setFiltro);

  const testimoniosFiltrados = useMemo(() => {
    if (filtroTipo === "todos") return testimonios;
    return testimonios.filter((t) => t.tipo === filtroTipo);
  }, [testimonios, filtroTipo]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="container-fluid space-y-12 py-8 md:space-y-16 md:py-12">
      {/* ================= HEADER PRINCIPAL ================= */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 sm:p-12">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-60 rounded-full bg-[var(--ember)]/5 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--ember)]" />
            <span className="label-micro text-[var(--text-secondary)]">
              Memoria Social y Participación Territorial
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">
            Voces de Cartagena
          </h1>

          <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base md:text-lg">
            Lo que dicen quienes participan en la construcción de la Política Pública de Seguridad Humana Integral 2026–2036. Relatos vivos de las tres localidades y la zona insular.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              size="lg"
              onClick={() => openPanel("testimonio-nuevo", {})}
              className="gap-2"
            >
              <Plus className="size-4" />
              <span>Comparte tu experiencia</span>
            </Button>
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] pl-2">
              <ShieldCheck className="size-4 text-[var(--success)]" />
              <span>Verificación con salvaguardas de Habeas Data</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FILTROS POR TIPO DE ACTOR ================= */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Mosaico de Experiencias Comunitarias
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            {testimoniosFiltrados.length} testimonios compartidos
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {TIPOS.map((t) => {
            const active = filtroTipo === t.id;
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltro(t.id)}
                className="shrink-0 text-xs rounded-full h-8 px-3.5"
                aria-pressed={active}
              >
                {t.label}
              </Button>
            );
          })}
        </div>
      </section>

      {/* ================= MOSAICO MASONRY DE TESTIMONIOS ================= */}
      <section>
        {testimoniosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-12 text-center space-y-3">
            <Quote className="size-10 text-[var(--text-tertiary)] opacity-40" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              No hay testimonios en esta categoría
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm">
              Sé la primera persona en compartir tu experiencia en este rol comunitario.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => openPanel("testimonio-nuevo", {})}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              <span>Aportar mi testimonio</span>
            </Button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6"
          >
            {testimoniosFiltrados.map((testimonio) => (
              <TestimonioCard
                key={testimonio.id}
                testimonio={testimonio}
                variants={itemVariants}
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center sm:p-12">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ember)] border border-[var(--border)]">
            <HeartHandshake className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            ¿Quieres compartir tu testimonio?
          </h2>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Tanto si participaste en una mesa territorial como si vives a diario los retos de convivencia en tu barrio, tu testimonio aporta evidencia viva para la concertación de la política pública.
          </p>
          <div className="pt-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => openPanel("testimonio-nuevo", {})}
              className="gap-2"
            >
              <Plus className="size-4" />
              <span>Comparte tu experiencia →</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function TestimonioCard({
  testimonio,
  variants,
}: {
  testimonio: Testimonio;
  variants: any;
}) {
  const iniciales = testimonio.nombre
    ? testimonio.nombre
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "AN";

  return (
    <motion.article
      variants={variants}
      className={`break-inside-avoid relative flex flex-col justify-between rounded-2xl border p-6 transition-all hover:border-[var(--border-strong)] hover:shadow-md ${
        testimonio.destacado
          ? "border-[var(--border)] bg-[var(--surface-2)]"
          : "border-[var(--border)] bg-[var(--surface-1)]"
      }`}
    >
      {/* Comilla tipográfica decorativa */}
      <div className="flex items-center justify-between pb-3">
        <span className="text-3xl font-serif text-[var(--ember)] select-none opacity-80 leading-none">
          ❝
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {testimonio.destacado && (
            <Badge variant="ember" className="text-[10px] gap-1">
              <Sparkles className="size-2.5" />
              Destacado
            </Badge>
          )}
          {testimonio.verificado && (
            <StatusBadge tone="success" className="text-[10px]">
              Verificado
            </StatusBadge>
          )}
        </div>
      </div>

      {/* Texto del testimonio */}
      <blockquote className="space-y-3 mb-6">
        <p className="text-sm leading-relaxed text-[var(--text-primary)] font-normal italic">
          &ldquo;{testimonio.texto}&rdquo;
        </p>
      </blockquote>

      {/* Dimensión de Seguridad si existe */}
      {testimonio.dimensionOnu && (
        <div className="mb-4">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {testimonio.dimensionOnu}
          </Badge>
        </div>
      )}

      {/* Autor, Rol, Barrio y Fecha */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
        {/* Avatar */}
        <div className="size-10 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0 overflow-hidden">
          {testimonio.foto ? (
            <img
              src={testimonio.foto}
              alt={testimonio.nombre}
              className="size-full object-cover"
            />
          ) : (
            <span>{iniciales}</span>
          )}
        </div>

        {/* Datos del autor */}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
            {testimonio.nombre}
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)] truncate">
            {TIPO_LABELS[testimonio.tipo] || "Participante"}
          </p>
          {(testimonio.barrio || testimonio.localidad) && (
            <p className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
              <MapPin className="size-3 text-[var(--ember)] shrink-0" />
              <span>
                {[testimonio.barrio, testimonio.localidad].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}
