import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useAccesibilidadStore,
  STORAGE_KEY_A11Y,
  validarPreferencias,
  obtenerValoresPorDefecto,
} from "./accesibilidad-store";

// Asegurar mock de Storage para entorno Node/Bun
const memoryStore = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
    key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    get length() {
      return memoryStore.size;
    },
  } as Storage;
}

const domAttrs = new Map<string, string>();
const mockDocElement = {
  setAttribute: (k: string, v: string) => domAttrs.set(k, String(v)),
  getAttribute: (k: string) => domAttrs.get(k) ?? null,
  removeAttribute: (k: string) => domAttrs.delete(k),
};

describe("AccesibilidadStore (A11Y-WIDGET-01)", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    if (typeof globalThis.window === "undefined") {
      (globalThis as unknown as Record<string, unknown>).window = globalThis;
    }
    if (typeof globalThis.document === "undefined") {
      globalThis.document = {
        documentElement: mockDocElement as unknown as HTMLElement,
      } as unknown as Document;
    }
    localStorage.clear();
    domAttrs.clear();
    useAccesibilidadStore.getState().resetAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (typeof originalWindow === "undefined") {
      delete (globalThis as unknown as Record<string, unknown>).window;
      delete (globalThis as unknown as Record<string, unknown>).matchMedia;
    } else {
      globalThis.window = originalWindow;
    }
    if (typeof originalDocument === "undefined") {
      delete (globalThis as unknown as Record<string, unknown>).document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  it("proporciona valores iniciales seguros por defecto", () => {
    const state = useAccesibilidadStore.getState();
    expect(state.textSize).toBe("100");
    expect(state.contrast).toBe("normal");
    expect(state.grayscale).toBe(false);
    expect(state.lineSpacing).toBe("normal");
    expect(state.letterSpacing).toBe("normal");
    expect(state.underlineLinks).toBe(false);
    expect(state.isOpen).toBe(false);
  });

  it("persiste los cambios en localStorage con clave versionada", () => {
    const store = useAccesibilidadStore.getState();
    store.setTextSize("150");
    store.setContrast("alto");
    store.setGrayscale(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_A11Y) || "{}");
    expect(stored.textSize).toBe("150");
    expect(stored.contrast).toBe("alto");
    expect(stored.grayscale).toBe(true);

    // Atributos DOM sincronizados en el elemento raíz <html>
    expect(document.documentElement.getAttribute("data-a11y-text-size")).toBe("150");
    expect(document.documentElement.getAttribute("data-a11y-contrast")).toBe("alto");
    expect(document.documentElement.getAttribute("data-a11y-grayscale")).toBe("true");
  });

  it("aumenta y disminuye el tamaño de texto dentro del rango seguro [100, 200]", () => {
    const store = useAccesibilidadStore.getState();
    store.setTextSize("100");

    store.aumentarTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("125");

    store.aumentarTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("150");

    store.aumentarTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("200");

    // Límite superior no sobrepasa 200
    store.aumentarTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("200");

    store.disminuirTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("150");

    store.disminuirTextSize();
    store.disminuirTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("100");

    // Límite inferior no desciende de 100
    store.disminuirTextSize();
    expect(useAccesibilidadStore.getState().textSize).toBe("100");
  });

  it("recupera valores por defecto ante datos corruptos o inválidos en localStorage", () => {
    // Objeto corrupto
    const corrupto = {
      textSize: "999",
      contrast: "ultra-super-duper",
      grayscale: "si",
      lineSpacing: null,
      letterSpacing: 42,
    };
    const validado = validarPreferencias(corrupto);
    expect(validado.textSize).toBe("100");
    expect(validado.contrast).toBe("normal");
    expect(validado.grayscale).toBe(false);
    expect(validado.lineSpacing).toBe("normal");
    expect(validado.letterSpacing).toBe("normal");

    // Cadenas no JSON en localStorage
    localStorage.setItem(STORAGE_KEY_A11Y, "invalid-json-content-{{[[");
    useAccesibilidadStore.getState().initFromSystemAndStorage();

    const state = useAccesibilidadStore.getState();
    expect(state.textSize).toBe("100");
    expect(state.contrast).toBe("normal");
  });

  it("resetAll restablece todas las configuraciones a sus valores canónicos", () => {
    const store = useAccesibilidadStore.getState();
    store.setTextSize("200");
    store.setContrast("alto");
    store.setGrayscale(true);
    store.setLineSpacing("amplio");
    store.setLetterSpacing("amplio");
    store.setUnderlineLinks(true);

    store.resetAll();

    const state = useAccesibilidadStore.getState();
    expect(state.textSize).toBe("100");
    expect(state.contrast).toBe("normal");
    expect(state.grayscale).toBe(false);
    expect(state.lineSpacing).toBe("normal");
    expect(state.letterSpacing).toBe("normal");
    expect(state.underlineLinks).toBe(false);

    expect(document.documentElement.getAttribute("data-a11y-text-size")).toBe("100");
    expect(document.documentElement.getAttribute("data-a11y-contrast")).toBe("normal");
  });

  it("respeta las preferencias del sistema cuando matchMedia indica prefers-contrast y prefers-reduced-motion", () => {
    (globalThis.window as unknown as Record<string, unknown>).matchMedia = (query: string) => {
      return {
        matches: query.includes("prefers-contrast: more") || query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };

    const defaults = obtenerValoresPorDefecto(true);
    expect(defaults.contrast).toBe("alto");
    expect(defaults.reducedMotion).toBe(true);
  });

  it("emite anuncios en aria-live tras cada cambio para lectores de pantalla", () => {
    const store = useAccesibilidadStore.getState();
    store.toggleContrast();
    expect(useAccesibilidadStore.getState().ultimoAnuncio).toContain("Contraste alto activado");

    store.toggleGrayscale();
    expect(useAccesibilidadStore.getState().ultimoAnuncio).toContain("escala de grises");
  });
});
