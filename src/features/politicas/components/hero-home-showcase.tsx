"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  MapPin,
  ArrowRight,
  FileCheck2,
  Compass,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { useHeroConfigStore } from "@/features/politicas/state/hero-store";
import {
  HERO_HOME_SLIDES,
  type HeroPageConfig,
} from "@/features/politicas/data/hero-pages.data";

export interface HeroHomeShowcaseProps {
  onAporteClick?: () => void;
  onGeovisorClick?: () => void;
  onRendicionClick?: () => void;
  stats?: Array<{ valor: string; label: string }>;
  className?: string;
}

const DEFAULT_STATS = [
  { valor: "37", label: "Mesas de diálogo territorial" },
  { valor: "7", label: "Dimensiones de seguridad humana" },
  { valor: "2026–2036", label: "Vigencia de la política" },
  { valor: "3 + Insular", label: "Localidades cubiertas" },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Componente Hero Home Showcase
 * Carrusel cinematográfico territorial con rotación automática de 7s,
 * efecto Ken Burns, viñeta adaptativa WCAG 2.1 AA y controles de navegación manual.
 */
export function HeroHomeShowcase({
  onAporteClick,
  onGeovisorClick,
  onRendicionClick,
  stats = DEFAULT_STATS,
  className,
}: HeroHomeShowcaseProps) {
  const reducedMotion = useReducedMotion();
  const [isInteracting, setIsInteracting] = useState(false);

  /* Estado del motor de Hero */
  const clientStore = useHeroConfigStore();
  const isServer = typeof window === "undefined";
  const store = isServer ? useHeroConfigStore.getState() : clientStore;

  const {
    heroImageId,
    opacidad,
    modoCarrusel,
    intervaloSegundos,
    pausado,
    indiceActivo,
    siguienteImagen,
    anteriorImagen,
    irAImagen,
    togglePausa,
  } = store;

  /* Resolución de la diapositiva activa */
  const slideIndex = HERO_HOME_SLIDES.findIndex((s) => s.id === heroImageId);
  const currentIdx =
    slideIndex >= 0 ? slideIndex : indiceActivo % HERO_HOME_SLIDES.length;
  const slideActivo: HeroPageConfig =
    HERO_HOME_SLIDES[currentIdx] ?? HERO_HOME_SLIDES[0];

  const totalSlides = HERO_HOME_SLIDES.length;
  const contadorTexto = `${String(currentIdx + 1).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`;

  /* Temporizador del carrusel automático (7s) con suspensión por interacción */
  useEffect(() => {
    if (!modoCarrusel || pausado || isInteracting) return;

    const intervaloMs = Math.max(2, intervaloSegundos || 7) * 1000;
    const timer = setInterval(() => {
      siguienteImagen();
    }, intervaloMs);

    return () => clearInterval(timer);
  }, [modoCarrusel, pausado, isInteracting, intervaloSegundos, siguienteImagen]);

  return (
    <section
      className={cn(
        "relative min-h-[82vh] md:min-h-[88vh] overflow-hidden flex flex-col justify-between select-text",
        className
      )}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={() => setIsInteracting(false)}
      aria-roledescription="carrusel"
      aria-label="Carrusel de frentes territoriales de Cartagena"
    >
      {/* ================= 1. CAPAS FOTOGRÁFICAS CON CROSSFADE Y KEN BURNS ================= */}
      {HERO_HOME_SLIDES.map((slide, idx) => {
        const esActivo = idx === currentIdx;
        return (
          <div
            key={slide.id}
            className={`pointer-events-none absolute inset-0 select-none overflow-hidden transition-opacity duration-700 ease-in-out ${
              esActivo && heroImageId !== "ninguna" ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden="true"
          >
            <img
              src={slide.imagenFondo}
              alt=""
              className={`h-full w-full object-cover object-center ${
                esActivo && !reducedMotion
                  ? "scale-105 transition-transform duration-[7000ms] ease-out motion-reduce:transform-none motion-reduce:transition-none"
                  : "scale-100"
              }`}
              style={{ opacity: Math.max(0.75, (opacidad ?? 80) / 100) }}
            />
          </div>
        );
      })}

      {/* ================= 2. VIÑETA ADAPTATIVA DE ALTA VISIBILIDAD (WCAG 2.1 AA) ================= */}
      {/* Scrim direccional suave que garantiza legibilidad del bloque de texto izquierdo sin opacar la fotografía */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] select-none bg-gradient-to-r from-[var(--surface-0)]/85 via-[var(--surface-0)]/40 to-transparent"
        aria-hidden="true"
      />
      {/* Fundido base inferior sutil para acoplar con la sección siguiente */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 select-none bg-gradient-to-t from-[var(--surface-0)] via-[var(--surface-0)]/30 to-transparent"
        aria-hidden="true"
      />
      {/* Fundido superior muy tenue para la barra superior */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-16 select-none bg-gradient-to-b from-[var(--surface-0)]/35 to-transparent"
        aria-hidden="true"
      />

      {/* ================= 3. RETÍCULA SUTIL INSTITUCIONAL ================= */}
      <div
        className="bg-dotgrid pointer-events-none absolute inset-0 z-[2] opacity-20"
        aria-hidden="true"
      />

      {/* ================= 4. CONTROLES DE NAVEGACIÓN SHOWCASE ================= */}
      <div className="container-fluid relative z-10 pt-6 md:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/75 p-3.5 backdrop-blur-md">
          {/* Insignia Territorial en Vivo */}
          <div
            className="flex items-center gap-2 text-xs"
            data-testid="hero-ubicacion-badge"
          >
            <div className="flex size-6 items-center justify-center rounded-full bg-[var(--ember)]/15 text-[var(--ember)]">
              <MapPin className="size-3.5" aria-hidden="true" />
            </div>
            <div>
              <span className="label-micro block text-[var(--text-tertiary)] uppercase tracking-wider">
                Procedencia Territorial Real
              </span>
              <span className="font-medium text-[var(--text-primary)]">
                {slideActivo.ubicacionReal}
              </span>
            </div>
          </div>

          {/* Navegación y Controles del Carrusel */}
          <div className="flex items-center gap-3">
            {/* Contador 01 / 05 */}
            <div
              className="font-mono text-xs font-semibold tabular-nums tracking-widest text-[var(--text-secondary)]"
              data-testid="hero-contador"
            >
              {contadorTexto}
            </div>

            {/* Separador vertical */}
            <div className="h-4 w-px bg-[var(--border)]" aria-hidden="true" />

            {/* Botón Anterior */}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={anteriorImagen}
              aria-label="Diapositiva anterior"
              className="size-8 rounded-full"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>

            {/* Botón Play / Pausa */}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={togglePausa}
              aria-label={pausado ? "Reanudar carrusel" : "Pausar carrusel"}
              className="size-8 rounded-full"
            >
              {pausado ? (
                <Play className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
              ) : (
                <Pause className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
              )}
            </Button>

            {/* Botón Siguiente */}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={siguienteImagen}
              aria-label="Diapositiva siguiente"
              className="size-8 rounded-full"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Barra de 5 Pills Temáticas para Selección Directa */}
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Líneas temáticas de la portada"
        >
          {HERO_HOME_SLIDES.map((slide, idx) => {
            const esActivo = idx === currentIdx;
            return (
              <Button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={esActivo}
                aria-label={`Ver diapositiva ${idx + 1}: ${slide.badgeTexto}`}
                variant={esActivo ? "default" : "outline"}
                size="sm"
                onClick={() => irAImagen(slide.id)}
                className={`h-7 px-3 text-xs transition-all ${
                  esActivo
                    ? "font-semibold shadow-sm"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <span className="hidden sm:inline">{slide.badgeTexto}</span>
                <span className="sm:hidden">{`0${idx + 1}`}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ================= 5. CONTENIDO DEL HERO INSTITUCIONAL ================= */}
      <div className="container-fluid relative z-10 pb-8 pt-6 md:pb-12 md:pt-10">
        <div className="grid gap-10 xl:grid-cols-12 xl:items-end xl:gap-14">
          <div className="xl:col-span-7 2xl:col-span-8">
            <motion.p
              {...(reducedMotion ? { initial: false as const } : fadeUp)}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2"
            >
              <span
                className="size-2 rounded-full bg-[var(--ember)]"
                aria-hidden="true"
              />
              <span className="label-micro text-[var(--text-secondary)]">
                Distrito Turístico y Cultural de Cartagena de Indias
              </span>
            </motion.p>

            <motion.h1
              {...(reducedMotion ? { initial: false as const } : fadeUp)}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="display-tight mt-5 text-[clamp(2.25rem,4vw,5.25rem)] font-semibold text-[var(--text-primary)]"
            >
              Política Pública de Seguridad Humana Integral{" "}
              <span className="text-fade block sm:inline">2026–2036</span>
            </motion.h1>

            <motion.div
              {...(reducedMotion ? { initial: false as const } : fadeUp)}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-3 flex items-center gap-2"
            >
              <Badge
                variant="outline"
                className="gap-1.5 border-[var(--border)] bg-[var(--surface-1)]/80 text-[var(--text-primary)]"
              >
                <Sparkles
                  className="size-3 text-[var(--ember)]"
                  aria-hidden="true"
                />
                {slideActivo.enfoque}
              </Badge>
            </motion.div>

            <motion.p
              {...(reducedMotion ? { initial: false as const } : fadeUp)}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-base lg:text-lg"
            >
              {slideActivo.subtitulo}
            </motion.p>

            {/* Botones de acción ciudadana */}
            <motion.div
              {...(reducedMotion ? { initial: false as const } : fadeUp)}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                variant="default"
                size="lg"
                type="button"
                onClick={onAporteClick}
                className="group"
              >
                Dejar mi Aporte Territorial
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </Button>
              <Button variant="outline" size="lg" type="button" asChild>
                <a href="#fases-politica">
                  <FileCheck2
                    className="size-4 text-[var(--text-secondary)]"
                    strokeWidth={1.75}
                  />
                  Ver Diagnóstico Participativo
                </a>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                type="button"
                onClick={onGeovisorClick}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Compass
                  className="size-4 text-[var(--ember)]"
                  strokeWidth={1.75}
                />
                Geovisor de Seguridad
              </Button>
              <Button
                variant="outline"
                size="lg"
                type="button"
                onClick={onRendicionClick}
                className="gap-2 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <BarChart3
                  className="size-4 text-[var(--ember)]"
                  strokeWidth={1.75}
                />
                Rendición de Cuentas 2026
              </Button>
            </motion.div>
          </div>

          {/* ================= 6. MÉTRICAS CLAVE DEL DISTRITO ================= */}
          <motion.dl
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] md:grid-cols-4 xl:col-span-5 xl:grid-cols-2 2xl:col-span-4"
          >
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col-reverse px-5 py-5 lg:px-6 lg:py-6 ${
                  [
                    "",
                    "border-l border-[var(--border)]",
                    "border-t border-[var(--border)] md:border-l md:border-t-0 xl:border-t xl:border-l-0",
                    "border-l border-t border-[var(--border)] md:border-t-0 xl:border-t",
                  ][i]
                }`}
              >
                <dt className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {s.label}
                </dt>
                <dd className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular md:text-3xl xl:text-[1.85rem] 2xl:text-3xl">
                  {s.valor}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
}
