"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiFetch } from "@/core/http/api-client";
import {
  HERO_HOME_SLIDES,
  type HeroPageConfig,
} from "@/features/politicas/data/hero-pages.data";

export interface HeroImageOption {
  id: string;
  titulo: string;
  descripcion: string;
  archivo: string;
  thumbnail: string;
  enfoque: string;
}

export interface HeroImageItem extends HeroImageOption {
  habilitada: boolean;
}

export type NuevaImagenHero = Omit<HeroImageOption, "id"> & {
  id?: string;
  habilitada?: boolean;
};

export const HERO_IMAGE_OPTIONS: HeroImageItem[] = [
  {
    id: "asamblea-claustro",
    titulo: "Cabildo Abierto y Foro Ciudadano",
    descripcion:
      "Vista aérea de asamblea y cabildo masivo en patio colonial cartagenero con amplia deliberación ciudadana.",
    archivo: "/images/hero/hero-asamblea-claustro.webp",
    thumbnail: "/images/hero/hero-asamblea-claustro-thumb.webp",
    enfoque: "Cabildo Masivo Territorial",
    habilitada: true,
  },
  {
    id: "dialogo-comunitario",
    titulo: "Diálogo Social y Rendición de Cuentas",
    descripcion:
      "Conversatorio abierto al aire libre con micrófono ciudadano y concertación institucional directa.",
    archivo: "/images/hero/hero-dialogo-comunitario.webp",
    thumbnail: "/images/hero/hero-dialogo-comunitario-thumb.webp",
    enfoque: "Transparencia y Diálogo Directo",
    habilitada: true,
  },
  {
    id: "enfoque-diferencial",
    titulo: "Taller Diferencial de Género y Juventud",
    descripcion:
      "Espacio inclusivo con el Observatorio de Equidad y organizaciones comunitarias de mujeres y jóvenes.",
    archivo: "/images/hero/hero-enfoque-diferencial.webp",
    thumbnail: "/images/hero/hero-enfoque-diferencial-thumb.webp",
    enfoque: "Inclusión y Género",
    habilitada: true,
  },
  {
    id: "marco-logico",
    titulo: "Matriz de Marco Lógico y Proyectos",
    descripcion:
      "Mesa comunitaria con líderes y jóvenes formulando proyectos territoriales con la matriz de relatoría técnica.",
    archivo: "/images/hero/hero-marco-logico.webp",
    thumbnail: "/images/hero/hero-marco-logico-thumb.webp",
    enfoque: "Metodología Participativa & Comunitaria",
    habilitada: true,
  },
  {
    id: "mesa-deliberativa",
    titulo: "Mesa Redonda y Concertación Temática",
    descripcion:
      "Trabajo deliberativo en equipo con carpetas, relatoría y concertación de compromisos ciudadanos.",
    archivo: "/images/hero/hero-mesa-deliberativa.webp",
    thumbnail: "/images/hero/hero-mesa-deliberativa-thumb.webp",
    enfoque: "Mesas Temáticas POLIS",
    habilitada: true,
  },
  {
    id: "ninguna",
    titulo: "Solo Retícula Institucional",
    descripcion:
      "Fondo minimalista oficial con retícula de puntos de alta legibilidad sin fotografía de fondo.",
    archivo: "",
    thumbnail: "",
    enfoque: "Fondo Minimalista Oficial",
    habilitada: true,
  },
];

export const HERO_DEFAULT_IMAGE_ID = "asamblea-claustro";
export const HERO_DEFAULT_OPACIDAD = 80;
export const HERO_MIN_OPACIDAD = 10;
export const HERO_MAX_OPACIDAD = 95;
export const HERO_DEFAULT_INTERVALO_SEGUNDOS = 7;


interface HeroDatos {
  imagenesCatalogo: HeroImageItem[];
  slides: HeroPageConfig[];
  heroImageId: string;
  opacidad: number;
  modoCarrusel: boolean;
  intervaloSegundos: number;
  pausado: boolean;
  indiceActivo: number;
  pageImages: Record<string, string>;
  cargandoServidor: boolean;
  guardandoServidor: boolean;
  sincronizadoServidor: boolean;
  cambiosPendientes: boolean;
}

export interface HeroConfigState extends HeroDatos {
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
  toggleHabilitarImagen: (id: string) => void;
  agregarImagen: (imagen: NuevaImagenHero) => HeroImageItem;
  eliminarImagen: (id: string) => void;
  restaurarCatalogoOficial: () => void;
  agregarSlide: (slide: HeroPageConfig) => void;
  eliminarSlide: (slideId: string) => void;
  actualizarSlide: (slideId: string, datos: Partial<HeroPageConfig>) => void;
  reordenarSlides: (slides: HeroPageConfig[]) => void;
  sincronizarConServidor: () => Promise<void>;
  guardarEnServidor: () => Promise<boolean>;
  restablecerHerosOficiales: () => Promise<boolean>;
}

const catalogoOficial = () => HERO_IMAGE_OPTIONS.map((imagen) => ({ ...imagen }));
const SIN_FOTOGRAFIA = HERO_IMAGE_OPTIONS[HERO_IMAGE_OPTIONS.length - 1];
const storageFallback = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

function esDataUrlImagenValida(valor: string): boolean {
  // Compatibilidad con cargas locales anteriores; las nuevas se suben a la API.
  if (valor.length > 12 * 1024 * 1024) return false;
  const coincidencia = /^data:image\/(png|jpe?g|gif|webp|avif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(valor);
  if (!coincidencia) return false;
  let bytes: string;
  try { bytes = atob(coincidencia[2]); } catch { return false; }
  const firma = (octetos: number[]) => octetos.every((octeto, indice) => bytes.charCodeAt(indice) === octeto);
  switch (coincidencia[1]) {
    case "png": return firma([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg": case "jpeg": return firma([0xff, 0xd8, 0xff]);
    case "gif": return bytes.startsWith("GIF87a") || bytes.startsWith("GIF89a");
    case "webp": return bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
    case "avif": return bytes.slice(4, 8) === "ftyp" && bytes.slice(8, 12) === "avif";
    default: return false;
  }
}

/** Validación compartida por formulario, acciones y entradas persistidas/remotas. */
export function esRutaImagenHero(valor: string): boolean {
  if (!valor || /[\\\u0000-\u0020]/.test(valor)) return false;
  if (valor.startsWith("data:image/")) return esDataUrlImagenValida(valor);
  if (valor.startsWith("/images/")) {
    try {
      const ruta = decodeURIComponent(valor.split(/[?#]/)[0]);
      return !ruta.split("/").some((parte) => parte === "." || parte === "..") &&
        !/[\\\u0000-\u0020]/.test(ruta) &&
        /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(ruta);
    } catch { return false; }
  }
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

function respaldo(catalogo: HeroImageItem[]): HeroImageItem {
  return catalogo.find((imagen) => imagen.id === HERO_DEFAULT_IMAGE_ID && imagen.habilitada) ??
    catalogo.find((imagen) => imagen.habilitada && imagen.archivo) ?? SIN_FOTOGRAFIA;
}

function esSeleccionable(valor: string, catalogo: HeroImageItem[]): boolean {
  if (valor === "ninguna") return !catalogo.some((imagen) => imagen.habilitada && imagen.archivo) ||
    catalogo.some((imagen) => imagen.id === "ninguna" && imagen.habilitada);
  const imagen = catalogo.find((opcion) => opcion.id === valor || (opcion.archivo && opcion.archivo === valor));
  if (imagen) return imagen.habilitada;
  if (HERO_IMAGE_OPTIONS.some((opcion) => opcion.id === valor || (opcion.archivo && opcion.archivo === valor))) return false;
  return esRutaImagenHero(valor);
}

function clavePagina(clave: string): string {
  return clave.replace(/^\//, "").toLowerCase().split("/")[0] || "home";
}

function indiceImagen(id: string, catalogo: HeroImageItem[]): number {
  return Math.max(0, catalogo.filter((imagen) => imagen.habilitada && imagen.archivo).findIndex((imagen) => imagen.id === id || imagen.archivo === id));
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerSlides(valor: unknown): HeroPageConfig[] {
  if (!Array.isArray(valor)) return HERO_HOME_SLIDES.map((slide) => ({ ...slide }));
  const slides: HeroPageConfig[] = [];
  for (const fila of valor) {
    if (!esObjeto(fila) || typeof fila.id !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(fila.id) || typeof fila.titulo !== "string" ||
      typeof fila.subtitulo !== "string" || typeof fila.imagenFondo !== "string" ||
      !esRutaImagenHero(fila.imagenFondo) || slides.some((slide) => slide.id === fila.id)) continue;
    slides.push({ id: fila.id, titulo: fila.titulo, subtitulo: fila.subtitulo,
      imagenFondo: fila.imagenFondo, enfoque: typeof fila.enfoque === "string" ? fila.enfoque : "",
      ubicacionReal: typeof fila.ubicacionReal === "string" ? fila.ubicacionReal : "",
      badgeTexto: typeof fila.badgeTexto === "string" ? fila.badgeTexto : fila.titulo,
      altura: fila.altura === "compact" || fila.altura === "ultracompact" ? fila.altura : "fullscreen",
      activa: fila.activa !== false });
  }
  return slides;
}

/** El catálogo decide disponibilidad y orden; slides sólo aporta la narrativa. */
function diapositivasCatalogo(catalogo: HeroImageItem[], narrativa: HeroPageConfig[]): HeroPageConfig[] {
  return catalogo.filter((imagen) => imagen.archivo).map((imagen) => {
    const anterior = narrativa.find((slide) => slide.id === imagen.id && slide.imagenFondo === imagen.archivo);
    const oficial = HERO_HOME_SLIDES.find((slide) => slide.id === imagen.id && slide.imagenFondo === imagen.archivo);
    return { ...(anterior ?? oficial ?? {
      id: imagen.id, titulo: imagen.titulo, subtitulo: imagen.descripcion, enfoque: imagen.enfoque,
      imagenFondo: imagen.archivo, ubicacionReal: imagen.enfoque, altura: "fullscreen", badgeTexto: imagen.titulo,
    }), activa: imagen.habilitada };
  });
}

export function obtenerDiapositivasHero(catalogo: HeroImageItem[], narrativa: HeroPageConfig[]): Array<HeroPageConfig & { oficial: boolean }> {
  return diapositivasCatalogo(catalogo, narrativa).filter((slide) => slide.activa).map((slide) => ({
    ...slide,
    oficial: HERO_HOME_SLIDES.some((oficial) => oficial.id === slide.id && oficial.imagenFondo === slide.imagenFondo),
  }));
}

function reconciliarCatalogo(estado: HeroDatos, catalogo: HeroImageItem[]): Partial<HeroDatos> {
  const retiradas = estado.imagenesCatalogo.filter((imagen) => !catalogo.some((actual) => actual.id === imagen.id && actual.habilitada));
  const resolver = (valor: string) => retiradas.some((imagen) => imagen.id === valor || (imagen.archivo && imagen.archivo === valor)) ||
    !esSeleccionable(valor, catalogo) ? respaldo(catalogo).id : valor;
  const heroImageId = resolver(estado.heroImageId);
  return { imagenesCatalogo: catalogo, slides: diapositivasCatalogo(catalogo, estado.slides), heroImageId,
    indiceActivo: indiceImagen(heroImageId, catalogo), cambiosPendientes: true,
    pageImages: Object.fromEntries(Object.entries(estado.pageImages).map(([clave, valor]) => [clave, resolver(valor)])) };
}

function validarImagen(imagen: NuevaImagenHero, id: string): HeroImageItem {
  const titulo = imagen.titulo.trim();
  const descripcion = imagen.descripcion.trim();
  const enfoque = imagen.enfoque.trim();
  const archivo = imagen.archivo.trim();
  const thumbnail = imagen.thumbnail.trim() || archivo;
  if (!titulo || titulo.length > 160) throw new Error("Escribe un título de hasta 160 caracteres.");
  if (!descripcion || descripcion.length > 1200) throw new Error("Escribe una descripción de hasta 1200 caracteres.");
  if (!enfoque || enfoque.length > 200) throw new Error("Escribe un enfoque de hasta 200 caracteres.");
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("El identificador de la imagen no es válido.");
  if (!esRutaImagenHero(archivo)) throw new Error("La imagen debe tener una URL HTTPS o una ruta de imagen /images/ válida.");
  if (!esRutaImagenHero(thumbnail)) throw new Error("La miniatura debe tener una URL HTTPS o una ruta de imagen /images/ válida.");
  return { id, titulo, descripcion, enfoque, archivo, thumbnail, habilitada: imagen.habilitada ?? true };
}

function leerCatalogo(valor: unknown): HeroImageItem[] {
  if (!Array.isArray(valor)) return catalogoOficial();
  const catalogo: HeroImageItem[] = [];
  for (const fila of valor) {
    if (!esObjeto(fila) || typeof fila.id !== "string" || typeof fila.titulo !== "string" ||
      typeof fila.descripcion !== "string" || typeof fila.enfoque !== "string" || typeof fila.archivo !== "string" ||
      typeof fila.thumbnail !== "string" || (fila.habilitada !== undefined && typeof fila.habilitada !== "boolean") ||
      catalogo.some((imagen) => imagen.id === fila.id)) continue;
    try {
      if (fila.id === "ninguna" && fila.archivo === "" && fila.thumbnail === "") {
        catalogo.push({ ...SIN_FOTOGRAFIA, habilitada: fila.habilitada !== false });
      } else {
        catalogo.push(validarImagen({ titulo: fila.titulo, descripcion: fila.descripcion, enfoque: fila.enfoque,
          archivo: fila.archivo, thumbnail: fila.thumbnail, habilitada: fila.habilitada !== false }, fila.id));
      }
    } catch { /* Una entrada inválida no se convierte en una URL renderizable. */ }
  }
  return catalogo;
}

export function normalizarConfiguracionHero(valor: unknown): HeroDatos {
  const previo = esObjeto(valor) ? valor : {};
  const imagenesCatalogo = leerCatalogo(previo.imagenesCatalogo);
  const heroImageId = typeof previo.heroImageId === "string" && esSeleccionable(previo.heroImageId, imagenesCatalogo)
    ? previo.heroImageId : respaldo(imagenesCatalogo).id;
  const pageImages = esObjeto(previo.pageImages) ? Object.fromEntries(Object.entries(previo.pageImages)
    .filter((entrada): entrada is [string, string] => typeof entrada[1] === "string")
    .map(([clave, imagen]) => [clavePagina(clave), esSeleccionable(imagen, imagenesCatalogo) ? imagen : respaldo(imagenesCatalogo).id])) : {};
  if ("home" in pageImages) pageImages.home = heroImageId;
  return { imagenesCatalogo, slides: diapositivasCatalogo(imagenesCatalogo, leerSlides(previo.slides)), heroImageId, pageImages,
    cargandoServidor: false, guardandoServidor: false, sincronizadoServidor: false, cambiosPendientes: previo.cambiosPendientes === true,
    opacidad: typeof previo.opacidad === "number" && Number.isFinite(previo.opacidad)
      ? Math.max(HERO_MIN_OPACIDAD, Math.min(HERO_MAX_OPACIDAD, Math.round(previo.opacidad))) : HERO_DEFAULT_OPACIDAD,
    modoCarrusel: typeof previo.modoCarrusel === "boolean" ? previo.modoCarrusel : true,
    intervaloSegundos: typeof previo.intervaloSegundos === "number" && Number.isFinite(previo.intervaloSegundos)
      ? Math.max(1, Math.min(60, Math.round(previo.intervaloSegundos))) : HERO_DEFAULT_INTERVALO_SEGUNDOS,
    pausado: typeof previo.pausado === "boolean" ? previo.pausado : false,
    indiceActivo: indiceImagen(heroImageId, imagenesCatalogo) };
}

function configuracionServidor(estado: HeroDatos) {
  return { slides: diapositivasCatalogo(estado.imagenesCatalogo, estado.slides),
    catalogoImagenes: estado.imagenesCatalogo, heroImageId: estado.heroImageId, opacidad: estado.opacidad,
    modoCarrusel: estado.modoCarrusel, intervaloSegundos: estado.intervaloSegundos, pageImages: estado.pageImages };
}

export function obtenerOpcionesCarrusel(catalogo = useHeroConfigStore.getState().imagenesCatalogo): HeroImageItem[] {
  return catalogo.filter((imagen) => imagen.habilitada && imagen.archivo);
}

export function obtenerOpcionHero(id: string, catalogo = useHeroConfigStore.getState().imagenesCatalogo): HeroImageItem {
  return catalogo.find((imagen) => imagen.id === id && imagen.habilitada) ?? respaldo(catalogo);
}

// Serializa los PUT: una respuesta lenta nunca deja una versión anterior como última escritura.
let guardadoEnCurso: Promise<boolean> | null = null;

export const useHeroConfigStore = create<HeroConfigState>()(
  persist(
    (set, get) => ({
      ...normalizarConfiguracionHero(null),
      setHeroImageId: (heroImageId) => {
        const estado = get();
        if (!esSeleccionable(heroImageId, estado.imagenesCatalogo)) return;
        set({ heroImageId, indiceActivo: indiceImagen(heroImageId, estado.imagenesCatalogo),
          ...(estado.pageImages.home ? { pageImages: { ...estado.pageImages, home: heroImageId } } : {}) });
      },
      setOpacidad: (opacidad) => {
        if (Number.isFinite(opacidad)) set({ opacidad: Math.max(HERO_MIN_OPACIDAD, Math.min(HERO_MAX_OPACIDAD, Math.round(opacidad))), cambiosPendientes: true });
      },
      setModoCarrusel: (modoCarrusel) => set({ modoCarrusel, cambiosPendientes: true }),
      setIntervaloSegundos: (intervaloSegundos) => {
        if (Number.isFinite(intervaloSegundos)) set({ intervaloSegundos: Math.max(1, Math.min(60, Math.round(intervaloSegundos))), cambiosPendientes: true });
      },
      setPausado: (pausado) => set({ pausado }),
      siguienteImagen: () => {
        const estado = get();
        const opciones = obtenerOpcionesCarrusel(estado.imagenesCatalogo);
        if (!opciones.length) return;
        const indice = opciones.findIndex((imagen) => imagen.id === estado.heroImageId || imagen.archivo === estado.heroImageId);
        get().setHeroImageId(opciones[(indice + 1) % opciones.length].id);
      },
      anteriorImagen: () => {
        const estado = get();
        const opciones = obtenerOpcionesCarrusel(estado.imagenesCatalogo);
        if (!opciones.length) return;
        const indice = opciones.findIndex((imagen) => imagen.id === estado.heroImageId || imagen.archivo === estado.heroImageId);
        get().setHeroImageId(opciones[(indice < 0 ? opciones.length - 1 : (indice - 1 + opciones.length) % opciones.length)].id);
      },
      irAImagen: (id) => get().setHeroImageId(id),
      togglePausa: () => set((estado) => ({ pausado: !estado.pausado })),
      setPageImage: (pageKey, imageSrcOrId) => {
        const estado = get();
        if (!esSeleccionable(imageSrcOrId, estado.imagenesCatalogo)) return;
        const key = clavePagina(pageKey);
        set({ pageImages: { ...estado.pageImages, [key]: imageSrcOrId }, cambiosPendientes: true,
          ...(key === "home" ? { heroImageId: imageSrcOrId, indiceActivo: indiceImagen(imageSrcOrId, estado.imagenesCatalogo) } : {}) });
      },
      resetPageImage: (pageKey) => {
        const key = clavePagina(pageKey);
        const pageImages = { ...get().pageImages };
        delete pageImages[key];
        set({ pageImages, cambiosPendientes: true, ...(key === "home" ? { heroImageId: respaldo(get().imagenesCatalogo).id, indiceActivo: 0 } : {}) });
      },
      resetAllPageImages: () => set({ pageImages: {}, heroImageId: respaldo(get().imagenesCatalogo).id, indiceActivo: 0, cambiosPendientes: true }),
      resetearHeroConfig: () => set(normalizarConfiguracionHero(null)),
      toggleHabilitarImagen: (id) => {
        if (get().imagenesCatalogo.some((imagen) => imagen.id === id)) set((estado) => reconciliarCatalogo(estado,
          estado.imagenesCatalogo.map((imagen) => imagen.id === id ? { ...imagen, habilitada: !imagen.habilitada } : imagen)));
      },
      agregarImagen: (nueva) => {
        const id = nueva.id?.trim() || `hero-${crypto.randomUUID()}`;
        if (get().imagenesCatalogo.some((imagen) => imagen.id === id) || HERO_IMAGE_OPTIONS.some((imagen) => imagen.id === id))
          throw new Error("Ya existe una imagen con ese identificador o está reservado para el catálogo oficial.");
        const imagen = validarImagen(nueva, id);
        set((estado) => reconciliarCatalogo(estado, [...estado.imagenesCatalogo, imagen]));
        return imagen;
      },
      eliminarImagen: (id) => {
        if (get().imagenesCatalogo.some((imagen) => imagen.id === id))
          set((estado) => reconciliarCatalogo(estado, estado.imagenesCatalogo.filter((imagen) => imagen.id !== id)));
      },
      restaurarCatalogoOficial: () => set((estado) => ({ ...reconciliarCatalogo(estado, catalogoOficial()),
        slides: diapositivasCatalogo(catalogoOficial(), HERO_HOME_SLIDES) })),
      agregarSlide: (slide) => {
        const [validada] = leerSlides([slide]);
        if (!validada) throw new Error("La diapositiva no contiene una imagen válida.");
        const imagen = validarImagen({ titulo: validada.titulo, descripcion: validada.subtitulo,
          enfoque: validada.enfoque, archivo: validada.imagenFondo, thumbnail: validada.imagenFondo, habilitada: validada.activa }, validada.id);
        set((estado) => {
          const catalogo = [...estado.imagenesCatalogo.filter((fila) => fila.id !== imagen.id), imagen];
          return { ...reconciliarCatalogo(estado, catalogo), slides: diapositivasCatalogo(catalogo, [...estado.slides.filter((fila) => fila.id !== validada.id), validada]) };
        });
      },
      eliminarSlide: (id) => {
        if (get().imagenesCatalogo.some((imagen) => imagen.id === id && imagen.habilitada)) get().toggleHabilitarImagen(id);
      },
      actualizarSlide: (id, datos) => {
        const anterior = get().slides.find((slide) => slide.id === id);
        if (anterior) get().agregarSlide({ ...anterior, ...datos, id });
      },
      reordenarSlides: (slides) => set((estado) => {
        const orden = new Map(leerSlides(slides).map((slide, indice) => [slide.id, indice]));
        const catalogo = [...estado.imagenesCatalogo].sort((a, b) => (orden.get(a.id) ?? orden.size) - (orden.get(b.id) ?? orden.size));
        return reconciliarCatalogo(estado, catalogo);
      }),
      sincronizarConServidor: async () => {
        const inicial = get();
        if (inicial.cargandoServidor || inicial.sincronizadoServidor || inicial.cambiosPendientes) return;
        const firma = JSON.stringify(configuracionServidor(inicial));
        set({ cargandoServidor: true });
        try {
          const datos = await apiFetch<unknown>("/politicas/heros", { retry: { retries: 0 } });
          if (!esObjeto(datos) || !Array.isArray(datos.slides) || !Array.isArray(datos.catalogoImagenes)) return;
          // No pisar ediciones locales realizadas mientras llegaba la respuesta.
          if (get().cambiosPendientes || firma !== JSON.stringify(configuracionServidor(get()))) return;
          const remoto = normalizarConfiguracionHero({ ...datos, imagenesCatalogo: datos.catalogoImagenes });
          set({ ...remoto, sincronizadoServidor: true, guardandoServidor: get().guardandoServidor });
        } catch { /* La biblioteca local sigue disponible si la API no responde. */ }
        finally { set({ cargandoServidor: false }); }
      },
      guardarEnServidor: () => {
        set({ guardandoServidor: true });
        const operacion: Promise<boolean> = (guardadoEnCurso ?? Promise.resolve(true)).then(async () => {
          const payload = configuracionServidor(get());
          try {
            await apiFetch<unknown>("/politicas/heros", { method: "PUT", body: payload, retry: { retries: 0 } });
            if (JSON.stringify(payload) === JSON.stringify(configuracionServidor(get()))) set({ cambiosPendientes: false, sincronizadoServidor: true });
            return true;
          } catch { return false; }
          finally {
            if (guardadoEnCurso === operacion) { guardadoEnCurso = null; set({ guardandoServidor: false }); }
          }
        });
        guardadoEnCurso = operacion;
        return operacion;
      },
      restablecerHerosOficiales: () => {
        get().restaurarCatalogoOficial();
        return get().guardarEnServidor();
      },
    }),
    {
      name: "polis_hero_config", version: 1,
      storage: createJSONStorage(() => {
        try {
          if (typeof window !== "undefined") return window.localStorage;
          if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
        } catch { /* Disponible también cuando el navegador bloquea almacenamiento. */ }
        return storageFallback;
      }),
      partialize: (estado) => ({ imagenesCatalogo: estado.imagenesCatalogo, slides: estado.slides, heroImageId: estado.heroImageId,
        opacidad: estado.opacidad, modoCarrusel: estado.modoCarrusel, intervaloSegundos: estado.intervaloSegundos,
        pageImages: estado.pageImages, pausado: estado.pausado, indiceActivo: estado.indiceActivo, cambiosPendientes: estado.cambiosPendientes }),
      migrate: (persistido) => normalizarConfiguracionHero(persistido),
      merge: (persistido, actual) => ({ ...actual, ...normalizarConfiguracionHero(persistido) }),
    }
  )
);

/** Una imagen retirada o deshabilitada no se renderiza. */
export function resolverImagenHero(idOrSrc: string, catalogo = useHeroConfigStore.getState().imagenesCatalogo): string {
  if (!idOrSrc || idOrSrc === "ninguna") return "";
  const imagen = catalogo.find((opcion) => opcion.id === idOrSrc || (opcion.archivo && opcion.archivo === idOrSrc));
  if (imagen) return imagen.habilitada ? imagen.archivo : respaldo(catalogo).archivo;
  if (HERO_IMAGE_OPTIONS.some((opcion) => opcion.id === idOrSrc || (opcion.archivo && opcion.archivo === idOrSrc))) return respaldo(catalogo).archivo;
  return esRutaImagenHero(idOrSrc) ? idOrSrc : respaldo(catalogo).archivo;
}
