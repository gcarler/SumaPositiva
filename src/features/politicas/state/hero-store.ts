"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface HeroImageOption {
  id: string;
  titulo: string;
  descripcion: string;
  archivo: string;
  thumbnail: string;
  enfoque: string;
}

export const HERO_IMAGE_OPTIONS: HeroImageOption[] = [
  {
    id: "marco-logico",
    titulo: "Matriz de Marco Lógico y Proyectos",
    descripcion:
      "Mesa comunitaria con líderes y jóvenes formulando proyectos territoriales con la matriz MGA/DNP.",
    archivo: "/images/hero/hero-marco-logico.webp",
    thumbnail: "/images/hero/hero-marco-logico-thumb.webp",
    enfoque: "Metodología DNP & Comunitaria",
  },
  {
    id: "asamblea-claustro",
    titulo: "Cabildo Abierto y Foro Ciudadano",
    descripcion:
      "Vista aérea de asamblea y cabildo masivo en patio colonial cartagenero con amplia deliberación ciudadana.",
    archivo: "/images/hero/hero-asamblea-claustro.webp",
    thumbnail: "/images/hero/hero-asamblea-claustro-thumb.webp",
    enfoque: "Cabildo Masivo Territorial",
  },
  {
    id: "dialogo-comunitario",
    titulo: "Diálogo Social y Rendición de Cuentas",
    descripcion:
      "Conversatorio abierto al aire libre con micrófono ciudadano y concertación institucional directa.",
    archivo: "/images/hero/hero-dialogo-comunitario.webp",
    thumbnail: "/images/hero/hero-dialogo-comunitario-thumb.webp",
    enfoque: "Transparencia y Diálogo Directo",
  },
  {
    id: "mesa-deliberativa",
    titulo: "Mesa Redonda y Concertación Temática",
    descripcion:
      "Trabajo deliberativo en equipo con carpetas, relatoría y concertación de compromisos ciudadanos.",
    archivo: "/images/hero/hero-mesa-deliberativa.webp",
    thumbnail: "/images/hero/hero-mesa-deliberativa-thumb.webp",
    enfoque: "Mesas Temáticas POLIS",
  },
  {
    id: "enfoque-diferencial",
    titulo: "Taller Diferencial de Género y Juventud",
    descripcion:
      "Espacio inclusivo con el Observatorio de Equidad y organizaciones comunitarias de mujeres y jóvenes.",
    archivo: "/images/hero/hero-enfoque-diferencial.webp",
    thumbnail: "/images/hero/hero-enfoque-diferencial-thumb.webp",
    enfoque: "Inclusión y Género",
  },
  {
    id: "ninguna",
    titulo: "Solo Retícula Institucional",
    descripcion:
      "Fondo minimalista oficial con retícula de puntos de alta legibilidad sin fotografía de fondo.",
    archivo: "",
    thumbnail: "",
    enfoque: "Fondo Minimalista Oficial",
  },
];

export const HERO_DEFAULT_IMAGE_ID = "marco-logico";
export const HERO_DEFAULT_OPACIDAD = 18;

export interface HeroConfigState {
  heroImageId: string;
  opacidad: number;
  setHeroImageId: (id: string) => void;
  setOpacidad: (opacidad: number) => void;
  resetearHeroConfig: () => void;
}

export function obtenerOpcionHero(id: string): HeroImageOption {
  return (
    HERO_IMAGE_OPTIONS.find((opt) => opt.id === id) ??
    HERO_IMAGE_OPTIONS.find((opt) => opt.id === HERO_DEFAULT_IMAGE_ID) ??
    HERO_IMAGE_OPTIONS[0]
  );
}

export const useHeroConfigStore = create<HeroConfigState>()(
  persist(
    (set) => ({
      heroImageId: HERO_DEFAULT_IMAGE_ID,
      opacidad: HERO_DEFAULT_OPACIDAD,
      setHeroImageId: (heroImageId: string) => set({ heroImageId }),
      setOpacidad: (opacidad: number) =>
        set({ opacidad: Math.max(5, Math.min(40, Math.round(opacidad))) }),
      resetearHeroConfig: () =>
        set({
          heroImageId: HERO_DEFAULT_IMAGE_ID,
          opacidad: HERO_DEFAULT_OPACIDAD,
        }),
    }),
    {
      name: "polis_hero_config",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
