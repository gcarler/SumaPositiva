"use client";

import { create } from "zustand";

export const STORAGE_KEY_A11Y = "polis_a11y_v1";

export type TextSizeOption = "100" | "125" | "150" | "200";
export type ContrastOption = "normal" | "alto";
export type LineSpacingOption = "normal" | "amplio";
export type LetterSpacingOption = "normal" | "amplio";

export const TEXT_SIZE_STEPS: TextSizeOption[] = ["100", "125", "150", "200"];

export interface AccesibilidadPreferences {
  textSize: TextSizeOption;
  contrast: ContrastOption;
  grayscale: boolean;
  lineSpacing: LineSpacingOption;
  letterSpacing: LetterSpacingOption;
  underlineLinks: boolean;
  reducedMotion: boolean;
}

export interface AccesibilidadState extends AccesibilidadPreferences {
  isOpen: boolean;
  ultimoAnuncio: string;

  setTextSize: (size: TextSizeOption) => void;
  aumentarTextSize: () => void;
  disminuirTextSize: () => void;
  setContrast: (contrast: ContrastOption) => void;
  toggleContrast: () => void;
  setGrayscale: (enabled: boolean) => void;
  toggleGrayscale: () => void;
  setLineSpacing: (spacing: LineSpacingOption) => void;
  toggleLineSpacing: () => void;
  setLetterSpacing: (spacing: LetterSpacingOption) => void;
  toggleLetterSpacing: () => void;
  setUnderlineLinks: (enabled: boolean) => void;
  toggleUnderlineLinks: () => void;
  setReducedMotion: (enabled: boolean) => void;
  toggleReducedMotion: () => void;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  resetAll: () => void;
  initFromSystemAndStorage: () => void;
}

export function obtenerValoresPorDefecto(isClient = typeof window !== "undefined"): AccesibilidadPreferences {
  let contrast: ContrastOption = "normal";
  let reducedMotion = false;

  if (isClient && typeof window !== "undefined" && typeof window.matchMedia === "function") {
    try {
      if (window.matchMedia("(prefers-contrast: more)").matches) {
        contrast = "alto";
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        reducedMotion = true;
      }
    } catch {
      // Ignorar fallos de matchMedia en entornos mockeados
    }
  }

  return {
    textSize: "100",
    contrast,
    grayscale: false,
    lineSpacing: "normal",
    letterSpacing: "normal",
    underlineLinks: false,
    reducedMotion,
  };
}

export function validarPreferencias(raw: unknown): AccesibilidadPreferences {
  const porDefecto = obtenerValoresPorDefecto();
  if (!raw || typeof raw !== "object") {
    return porDefecto;
  }

  const obj = raw as Record<string, unknown>;

  const textSize =
    typeof obj.textSize === "string" && TEXT_SIZE_STEPS.includes(obj.textSize as TextSizeOption)
      ? (obj.textSize as TextSizeOption)
      : porDefecto.textSize;

  const contrast =
    obj.contrast === "normal" || obj.contrast === "alto"
      ? (obj.contrast as ContrastOption)
      : porDefecto.contrast;

  const grayscale = typeof obj.grayscale === "boolean" ? obj.grayscale : porDefecto.grayscale;

  const lineSpacing =
    obj.lineSpacing === "normal" || obj.lineSpacing === "amplio"
      ? (obj.lineSpacing as LineSpacingOption)
      : porDefecto.lineSpacing;

  const letterSpacing =
    obj.letterSpacing === "normal" || obj.letterSpacing === "amplio"
      ? (obj.letterSpacing as LetterSpacingOption)
      : porDefecto.letterSpacing;

  const underlineLinks =
    typeof obj.underlineLinks === "boolean" ? obj.underlineLinks : porDefecto.underlineLinks;

  const reducedMotion =
    typeof obj.reducedMotion === "boolean" ? obj.reducedMotion : porDefecto.reducedMotion;

  return {
    textSize,
    contrast,
    grayscale,
    lineSpacing,
    letterSpacing,
    underlineLinks,
    reducedMotion,
  };
}

export function leerStorageSeguro(): AccesibilidadPreferences {
  if (typeof window === "undefined") {
    return obtenerValoresPorDefecto(false);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_A11Y);
    if (!raw) return obtenerValoresPorDefecto(true);
    const parsed = JSON.parse(raw);
    return validarPreferencias(parsed);
  } catch {
    return obtenerValoresPorDefecto(true);
  }
}

export function guardarStorageSeguro(prefs: AccesibilidadPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_A11Y, JSON.stringify(prefs));
  } catch {
    // Si localStorage está bloqueado o lleno, no romper la experiencia
  }
}

export function aplicarAtributosDom(prefs: AccesibilidadPreferences): void {
  if (typeof document === "undefined" || !document.documentElement) return;
  const root = document.documentElement;

  root.setAttribute("data-a11y-text-size", prefs.textSize);
  root.setAttribute("data-a11y-contrast", prefs.contrast);
  root.setAttribute("data-a11y-grayscale", prefs.grayscale ? "true" : "false");
  root.setAttribute("data-a11y-line-spacing", prefs.lineSpacing);
  root.setAttribute("data-a11y-letter-spacing", prefs.letterSpacing);
  root.setAttribute("data-a11y-underline-links", prefs.underlineLinks ? "true" : "false");
  root.setAttribute("data-a11y-reduced-motion", prefs.reducedMotion ? "true" : "false");
}

export const useAccesibilidadStore = create<AccesibilidadState>((set, get) => {
  const inicial = obtenerValoresPorDefecto(false);

  const sincronizar = (cambios: Partial<AccesibilidadPreferences>, anuncio?: string) => {
    const actual = get();
    const nueva: AccesibilidadPreferences = {
      textSize: cambios.textSize ?? actual.textSize,
      contrast: cambios.contrast ?? actual.contrast,
      grayscale: cambios.grayscale ?? actual.grayscale,
      lineSpacing: cambios.lineSpacing ?? actual.lineSpacing,
      letterSpacing: cambios.letterSpacing ?? actual.letterSpacing,
      underlineLinks: cambios.underlineLinks ?? actual.underlineLinks,
      reducedMotion: cambios.reducedMotion ?? actual.reducedMotion,
    };

    guardarStorageSeguro(nueva);
    aplicarAtributosDom(nueva);

    set({
      ...nueva,
      ultimoAnuncio: anuncio ?? actual.ultimoAnuncio,
    });
  };

  return {
    ...inicial,
    isOpen: false,
    ultimoAnuncio: "",

    setTextSize: (textSize) => {
      sincronizar({ textSize }, `Tamaño de texto ajustado a ${textSize} por ciento`);
    },

    aumentarTextSize: () => {
      const idx = TEXT_SIZE_STEPS.indexOf(get().textSize);
      if (idx < TEXT_SIZE_STEPS.length - 1) {
        const next = TEXT_SIZE_STEPS[idx + 1];
        sincronizar({ textSize: next }, `Tamaño de texto aumentado a ${next} por ciento`);
      }
    },

    disminuirTextSize: () => {
      const idx = TEXT_SIZE_STEPS.indexOf(get().textSize);
      if (idx > 0) {
        const prev = TEXT_SIZE_STEPS[idx - 1];
        sincronizar({ textSize: prev }, `Tamaño de texto reducido a ${prev} por ciento`);
      }
    },

    setContrast: (contrast) => {
      sincronizar(
        { contrast },
        contrast === "alto" ? "Contraste alto activado" : "Contraste normal activado"
      );
    },

    toggleContrast: () => {
      const next = get().contrast === "alto" ? "normal" : "alto";
      get().setContrast(next);
    },

    setGrayscale: (grayscale) => {
      sincronizar(
        { grayscale },
        grayscale ? "Modo escala de grises activado" : "Modo escala de grises desactivado"
      );
    },

    toggleGrayscale: () => {
      get().setGrayscale(!get().grayscale);
    },

    setLineSpacing: (lineSpacing) => {
      sincronizar(
        { lineSpacing },
        lineSpacing === "amplio" ? "Interlineado amplio activado" : "Interlineado normal activado"
      );
    },

    toggleLineSpacing: () => {
      const next = get().lineSpacing === "amplio" ? "normal" : "amplio";
      get().setLineSpacing(next);
    },

    setLetterSpacing: (letterSpacing) => {
      sincronizar(
        { letterSpacing },
        letterSpacing === "amplio" ? "Espaciado de letras amplio activado" : "Espaciado de letras normal activado"
      );
    },

    toggleLetterSpacing: () => {
      const next = get().letterSpacing === "amplio" ? "normal" : "amplio";
      get().setLetterSpacing(next);
    },

    setUnderlineLinks: (underlineLinks) => {
      sincronizar(
        { underlineLinks },
        underlineLinks ? "Subrayado de enlaces activado" : "Subrayado de enlaces normal"
      );
    },

    toggleUnderlineLinks: () => {
      get().setUnderlineLinks(!get().underlineLinks);
    },

    setReducedMotion: (reducedMotion) => {
      sincronizar(
        { reducedMotion },
        reducedMotion ? "Movimiento reducido activado" : "Movimiento estándar activado"
      );
    },

    toggleReducedMotion: () => {
      get().setReducedMotion(!get().reducedMotion);
    },

    setIsOpen: (isOpen) => {
      set({ isOpen });
    },

    toggleOpen: () => {
      set({ isOpen: !get().isOpen });
    },

    resetAll: () => {
      const base = obtenerValoresPorDefecto(true);
      // Al resetear explícitamente, se vuelve a 100%, contraste normal, etc.
      const resetPrefs: AccesibilidadPreferences = {
        textSize: "100",
        contrast: "normal",
        grayscale: false,
        lineSpacing: "normal",
        letterSpacing: "normal",
        underlineLinks: false,
        reducedMotion: base.reducedMotion,
      };
      sincronizar(resetPrefs, "Se han restablecido todas las preferencias de accesibilidad");
    },

    initFromSystemAndStorage: () => {
      const guardadas = leerStorageSeguro();
      aplicarAtributosDom(guardadas);
      set({ ...guardadas });
    },
  };
});
