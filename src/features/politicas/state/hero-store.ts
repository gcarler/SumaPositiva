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
    id: "enfoque-diferencial",
    titulo: "Taller Diferencial de Género y Juventud",
    descripcion:
      "Espacio inclusivo con el Observatorio de Equidad y organizaciones comunitarias de mujeres y jóvenes.",
    archivo: "/images/hero/hero-enfoque-diferencial.webp",
    thumbnail: "/images/hero/hero-enfoque-diferencial-thumb.webp",
    enfoque: "Inclusión y Género",
  },
  {
    id: "marco-logico",
    titulo: "Matriz de Marco Lógico y Proyectos",
    descripcion:
      "Mesa comunitaria con líderes y jóvenes formulando proyectos territoriales con la matriz de relatoría técnica.",
    archivo: "/images/hero/hero-marco-logico.webp",
    thumbnail: "/images/hero/hero-marco-logico-thumb.webp",
    enfoque: "Metodología Participativa & Comunitaria",
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
    id: "ninguna",
    titulo: "Solo Retícula Institucional",
    descripcion:
      "Fondo minimalista oficial con retícula de puntos de alta legibilidad sin fotografía de fondo.",
    archivo: "",
    thumbnail: "",
    enfoque: "Fondo Minimalista Oficial",
  },
];

export const HERO_DEFAULT_IMAGE_ID = "asamblea-claustro";
export const HERO_DEFAULT_OPACIDAD = 60;
export const HERO_MIN_OPACIDAD = 10;
export const HERO_MAX_OPACIDAD = 85;
export const HERO_DEFAULT_INTERVALO_SEGUNDOS = 7;

export interface HeroConfigState {
  heroImageId: string;
  opacidad: number;
  modoCarrusel: boolean;
  intervaloSegundos: number;
  pausado: boolean;
  indiceActivo: number;
  pageImages: Record<string, string>;
  setHeroImageId: (id: string) => void;
  setOpacidad: (opacidad: number) => void;
  setModoCarrusel: (activo: boolean) => void;
  setIntervaloSegundos: (segundos: number) => void;
  setPausado: (pausado: boolean) => void;
  siguienteImagen: () => void;
  anteriorImagen: () => void;
  irAImagen: (id: string) => void;
  togglePausa: () => void;
  setPageImage: (pageKey: string, imageSrcOrId: string) => void;
  resetPageImage: (pageKey: string) => void;
  resetAllPageImages: () => void;
  resetearHeroConfig: () => void;
}

const storageFallback = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export function obtenerOpcionesCarrusel(): HeroImageOption[] {
  return HERO_IMAGE_OPTIONS.filter((opt) => opt.id !== "ninguna");
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
    (set, get) => ({
      heroImageId: HERO_DEFAULT_IMAGE_ID,
      opacidad: HERO_DEFAULT_OPACIDAD,
      modoCarrusel: true,
      intervaloSegundos: HERO_DEFAULT_INTERVALO_SEGUNDOS,
      pausado: false,
      indiceActivo: 0,
      pageImages: {},

      setHeroImageId: (heroImageId: string) => {
        const validas = obtenerOpcionesCarrusel();
        const idx = validas.findIndex((opt) => opt.id === heroImageId);
        set({
          heroImageId,
          ...(idx >= 0 ? { indiceActivo: idx } : {}),
        });
      },

      setOpacidad: (opacidad: number) =>
        set({
          opacidad: Math.max(
            HERO_MIN_OPACIDAD,
            Math.min(HERO_MAX_OPACIDAD, Math.round(opacidad))
          ),
        }),

      setModoCarrusel: (modoCarrusel: boolean) => set({ modoCarrusel }),

      setIntervaloSegundos: (intervaloSegundos: number) =>
        set({ intervaloSegundos: Math.max(1, Math.round(intervaloSegundos)) }),

      setPausado: (pausado: boolean) => set({ pausado }),

      siguienteImagen: () => {
        const validas = obtenerOpcionesCarrusel();
        if (validas.length === 0) return;
        const state = get();
        const actualIdx = validas.findIndex((opt) => opt.id === state.heroImageId);
        const nextIdx =
          actualIdx >= 0
            ? (actualIdx + 1) % validas.length
            : (state.indiceActivo + 1) % validas.length;
        const nextOpt = validas[nextIdx];
        set({
          heroImageId: nextOpt.id,
          indiceActivo: nextIdx,
        });
      },

      anteriorImagen: () => {
        const validas = obtenerOpcionesCarrusel();
        if (validas.length === 0) return;
        const state = get();
        const actualIdx = validas.findIndex((opt) => opt.id === state.heroImageId);
        const prevIdx =
          actualIdx >= 0
            ? (actualIdx - 1 + validas.length) % validas.length
            : (state.indiceActivo - 1 + validas.length) % validas.length;
        const prevOpt = validas[prevIdx];
        set({
          heroImageId: prevOpt.id,
          indiceActivo: prevIdx,
        });
      },

      irAImagen: (id: string) => {
        const validas = obtenerOpcionesCarrusel();
        const idx = validas.findIndex((opt) => opt.id === id);
        if (idx >= 0) {
          set({
            heroImageId: id,
            indiceActivo: idx,
          });
        } else {
          const generalOpt = HERO_IMAGE_OPTIONS.find((opt) => opt.id === id);
          if (generalOpt) {
            set({ heroImageId: id });
          }
        }
      },

      togglePausa: () => set((state) => ({ pausado: !state.pausado })),

      setPageImage: (pageKey: string, imageSrcOrId: string) => {
        const key = pageKey.replace(/^\//, "").toLowerCase().split("/")[0] || "home";
        set((state) => {
          const nuevas = { ...state.pageImages, [key]: imageSrcOrId };
          if (key === "home") {
            const validOpt = HERO_IMAGE_OPTIONS.find((opt) => opt.id === imageSrcOrId);
            return {
              pageImages: nuevas,
              heroImageId: validOpt ? validOpt.id : imageSrcOrId,
            };
          }
          return { pageImages: nuevas };
        });
      },

      resetPageImage: (pageKey: string) => {
        const key = pageKey.replace(/^\//, "").toLowerCase().split("/")[0] || "home";
        set((state) => {
          const copia = { ...state.pageImages };
          delete copia[key];
          if (key === "home") {
            return {
              pageImages: copia,
              heroImageId: HERO_DEFAULT_IMAGE_ID,
            };
          }
          return { pageImages: copia };
        });
      },

      resetAllPageImages: () =>
        set({
          pageImages: {},
          heroImageId: HERO_DEFAULT_IMAGE_ID,
        }),

      resetearHeroConfig: () =>
        set({
          heroImageId: HERO_DEFAULT_IMAGE_ID,
          opacidad: HERO_DEFAULT_OPACIDAD,
          modoCarrusel: true,
          intervaloSegundos: HERO_DEFAULT_INTERVALO_SEGUNDOS,
          pausado: false,
          indiceActivo: 0,
          pageImages: {},
        }),
    }),
    {
      name: "polis_hero_config",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage;
        }
        if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
          return globalThis.localStorage as Storage;
        }
        return storageFallback;
      }),
    }
  )
);

/**
 * Resuelve una clave de imagen o URL externa.
 * Si coincide con una opción del catálogo oficial, devuelve su ruta de archivo WebP.
 * En caso contrario, devuelve la URL o ruta provista.
 */
export function resolverImagenHero(idOrSrc: string): string {
  if (!idOrSrc) return "";
  const opt = HERO_IMAGE_OPTIONS.find((o) => o.id === idOrSrc);
  if (opt) return opt.archivo;
  return idOrSrc;
}

