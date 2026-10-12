"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useHeroConfigStore } from "@/features/politicas/state/hero-store";
import {
  obtenerHeroPageConfig,
  type HeroAltura,
} from "@/features/politicas/data/hero-pages.data";

export interface HeroPageBannerProps {
  pageKey: "barrio" | "geovisor" | "fases" | "rendicion" | string;
  tituloOverride?: string;
  subtituloOverride?: string;
  badgeOverride?: string;
  alturaOverride?: HeroAltura | "compact" | "ultracompact";
  children?: React.ReactNode;
  className?: string;
}

/**
 * Componente Universal HeroPageBanner
 * Diseñado para subpáginas públicas de POLIS (Modo Barrio, Geovisor, Fases, Rendición).
 * Proporciona fotografía temática contextual según catálogo, viñeta adaptativa WCAG 2.1 AA,
 * insignia territorial de procedencia real y alturas acotadas (compact y ultracompact)
 * para preservar estrictamente la regla del pliegue (above the fold).
 */
export function HeroPageBanner({
  pageKey,
  tituloOverride,
  subtituloOverride,
  badgeOverride,
  alturaOverride,
  children,
  className,
}: HeroPageBannerProps) {
  /* Resolución de configuración temática según clave de página */
  const config = obtenerHeroPageConfig(pageKey);

  /* Estado del motor de Hero */
  const clientStore = useHeroConfigStore();
  const isServer = typeof window === "undefined";
  const store = isServer ? useHeroConfigStore.getState() : clientStore;
  const { opacidad, heroImageId } = store;

  const altura = alturaOverride ?? config.altura;
  const esUltracompact = altura === "ultracompact";

  const titulo = tituloOverride ?? config.titulo;
  const subtitulo = subtituloOverride ?? config.subtitulo;
  const badgeTexto = badgeOverride ?? config.badgeTexto;

  const alturaClass = esUltracompact
    ? "min-h-[10rem] sm:min-h-[12rem]"
    : "min-h-[14rem] sm:min-h-[16rem]";

  const paddingClass = esUltracompact
    ? "p-4 sm:p-5 md:p-6"
    : "p-6 sm:p-8 lg:p-10";

  return (
    <header
      role="banner"
      aria-label={titulo}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] flex flex-col justify-center select-text shadow-xs",
        alturaClass,
        paddingClass,
        className
      )}
    >
      {/* ================= 1. CAPA FOTOGRÁFICA TEMÁTICA ================= */}
      {config.imagenFondo && heroImageId !== "ninguna" && (
        <div
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={config.imagenFondo}
            alt=""
            className="h-full w-full object-cover object-center"
            style={{ opacity: (opacidad ?? 60) / 100 }}
          />
        </div>
      )}

      {/* ================= 2. VIÑETA ADAPTATIVA MULTICAPA (WCAG 2.1 AA) ================= */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] select-none bg-gradient-to-t from-[var(--surface-0)] via-transparent to-[var(--surface-0)]/60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] select-none bg-gradient-to-r from-[var(--surface-0)]/90 via-[var(--surface-0)]/70 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] select-none bg-gradient-to-b from-[var(--surface-0)]/40 via-transparent to-[var(--surface-0)]"
        aria-hidden="true"
      />

      {/* ================= 3. RETÍCULA SUTIL INSTITUCIONAL ================= */}
      <div
        className="bg-dotgrid pointer-events-none absolute inset-0 z-[2]"
        aria-hidden="true"
      />

      {/* ================= 4. CONTENIDO Y METADATOS TERRITORIALES ================= */}
      <div className="relative z-10 flex flex-col gap-3 sm:gap-4 max-w-4xl">
        {/* Insignia Territorial y Badge Temático */}
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="hero-page-banner-badge"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]/90 px-3 py-1 text-xs font-semibold text-[var(--ember)] backdrop-blur-xs">
            <MapPin className="size-3.5 shrink-0 text-[var(--ember)]" aria-hidden="true" />
            <span>{config.ubicacionReal}</span>
          </span>
          {badgeTexto && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] backdrop-blur-xs">
              {badgeTexto}
            </span>
          )}
        </div>

        {/* Título Institucional */}
        <h1
          className={cn(
            "font-extrabold tracking-tight text-[var(--text-primary)]",
            esUltracompact
              ? "text-xl sm:text-2xl lg:text-3xl"
              : "text-2xl sm:text-3xl lg:text-4xl"
          )}
        >
          {titulo}
        </h1>

        {/* Subtítulo Explicativo */}
        {subtitulo && (
          <p
            className={cn(
              "leading-relaxed text-[var(--text-secondary)] max-w-3xl",
              esUltracompact
                ? "text-xs sm:text-sm line-clamp-2 sm:line-clamp-none"
                : "text-sm sm:text-base"
            )}
          >
            {subtitulo}
          </p>
        )}

        {/* Slot para componentes hijos (selectores, filtros, KPIs) */}
        {children && (
          <div className="mt-1 w-full" data-testid="hero-page-banner-children">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
