import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  useHeroConfigStore,
  HERO_IMAGE_OPTIONS,
  HERO_DEFAULT_IMAGE_ID,
  HERO_DEFAULT_OPACIDAD,
  HERO_MIN_OPACIDAD,
  HERO_MAX_OPACIDAD,
  HERO_DEFAULT_INTERVALO_SEGUNDOS,
  obtenerOpcionHero,
  obtenerOpcionesCarrusel,
  resolverImagenHero,
  esRutaImagenHero,
  normalizarConfiguracionHero,
} from "./hero-store";
import { createJSONStorage } from "zustand/middleware";
import {
  HERO_HOME_SLIDES,
  HERO_PAGES_CONFIG,
  obtenerHeroPageConfig,
  obtenerHeroSlide,
} from "../data/hero-pages.data";

describe("Hero Config Store & Catálogo (HERO-PAGES-01)", () => {
  beforeEach(() => {
    useHeroConfigStore.getState().resetearHeroConfig();
  });

  test("inicia con la imagen recomendada, opacidad al 80% y carrusel activo sin pausa", () => {
    const estado = useHeroConfigStore.getState();
    expect(estado.heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.opacidad).toBe(80);
    expect(estado.opacidad).toBe(HERO_DEFAULT_OPACIDAD);
    expect(estado.modoCarrusel).toBe(true);
    expect(estado.intervaloSegundos).toBe(HERO_DEFAULT_INTERVALO_SEGUNDOS);
    expect(estado.intervaloSegundos).toBe(7);
    expect(estado.pausado).toBe(false);
    expect(estado.indiceActivo).toBe(0);
  });

  test("contiene las 6 opciones requeridas en el catálogo general", () => {
    expect(HERO_IMAGE_OPTIONS.length).toBe(6);
    const ids = HERO_IMAGE_OPTIONS.map((o) => o.id);
    expect(ids).toContain("asamblea-claustro");
    expect(ids).toContain("dialogo-comunitario");
    expect(ids).toContain("enfoque-diferencial");
    expect(ids).toContain("marco-logico");
    expect(ids).toContain("mesa-deliberativa");
    expect(ids).toContain("ninguna");
  });

  test("filtra exactamente 5 opciones fotográficas para el carrusel", () => {
    const carrusel = obtenerOpcionesCarrusel();
    expect(carrusel.length).toBe(5);
    expect(carrusel.every((opt) => opt.id !== "ninguna")).toBe(true);
    expect(carrusel.every((opt) => opt.archivo.length > 0)).toBe(true);
  });

  test("permite cambiar la imagen activa y sincroniza indiceActivo", () => {
    useHeroConfigStore.getState().setHeroImageId("dialogo-comunitario");
    const estado = useHeroConfigStore.getState();
    expect(estado.heroImageId).toBe("dialogo-comunitario");
    expect(estado.indiceActivo).toBe(1);
  });

  test("permite calibrar la opacidad y acota estrictamente entre 10% y 95%", () => {
    // Valor intermedio válido
    useHeroConfigStore.getState().setOpacidad(45);
    expect(useHeroConfigStore.getState().opacidad).toBe(45);

    // Límite inferior (mínimo 10%)
    useHeroConfigStore.getState().setOpacidad(5);
    expect(useHeroConfigStore.getState().opacidad).toBe(HERO_MIN_OPACIDAD);
    expect(useHeroConfigStore.getState().opacidad).toBe(10);

    useHeroConfigStore.getState().setOpacidad(-20);
    expect(useHeroConfigStore.getState().opacidad).toBe(10);

    // Límite superior (máximo 95%)
    useHeroConfigStore.getState().setOpacidad(99);
    expect(useHeroConfigStore.getState().opacidad).toBe(HERO_MAX_OPACIDAD);
    expect(useHeroConfigStore.getState().opacidad).toBe(95);

    useHeroConfigStore.getState().setOpacidad(95);
    expect(useHeroConfigStore.getState().opacidad).toBe(95);
  });

  test("siguienteImagen avanza cíclicamente por las 5 fotografías territoriales", () => {
    const store = useHeroConfigStore.getState();
    expect(store.heroImageId).toBe("asamblea-claustro");
    expect(store.indiceActivo).toBe(0);

    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("dialogo-comunitario");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(1);

    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("enfoque-diferencial");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(2);

    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("marco-logico");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(3);

    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("mesa-deliberativa");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(4);

    // Vuelve al inicio del ciclo
    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("asamblea-claustro");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(0);
  });

  test("anteriorImagen retrocede cíclicamente", () => {
    // Desde el inicio (índice 0), debe ir al último elemento (índice 4)
    expect(useHeroConfigStore.getState().indiceActivo).toBe(0);

    useHeroConfigStore.getState().anteriorImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("mesa-deliberativa");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(4);

    useHeroConfigStore.getState().anteriorImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("marco-logico");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(3);
  });

  test("irAImagen salta directamente al ID indicado y actualiza indiceActivo", () => {
    useHeroConfigStore.getState().irAImagen("enfoque-diferencial");
    expect(useHeroConfigStore.getState().heroImageId).toBe("enfoque-diferencial");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(2);

    useHeroConfigStore.getState().irAImagen("marco-logico");
    expect(useHeroConfigStore.getState().heroImageId).toBe("marco-logico");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(3);

    // Opción 'ninguna'
    useHeroConfigStore.getState().irAImagen("ninguna");
    expect(useHeroConfigStore.getState().heroImageId).toBe("ninguna");
  });

  test("togglePausa alterna entre pausado y reproducción activa", () => {
    expect(useHeroConfigStore.getState().pausado).toBe(false);

    useHeroConfigStore.getState().togglePausa();
    expect(useHeroConfigStore.getState().pausado).toBe(true);

    useHeroConfigStore.getState().togglePausa();
    expect(useHeroConfigStore.getState().pausado).toBe(false);
  });

  test("setModoCarrusel y helpers configuran el motor de rotación", () => {
    useHeroConfigStore.getState().setModoCarrusel(false);
    expect(useHeroConfigStore.getState().modoCarrusel).toBe(false);

    useHeroConfigStore.getState().setIntervaloSegundos(10);
    expect(useHeroConfigStore.getState().intervaloSegundos).toBe(10);

    useHeroConfigStore.getState().setPausado(true);
    expect(useHeroConfigStore.getState().pausado).toBe(true);
  });

  test("obtenerOpcionHero devuelve la opción correcta o fallback", () => {
    const opcion = obtenerOpcionHero("enfoque-diferencial");
    expect(opcion.id).toBe("enfoque-diferencial");
    expect(opcion.archivo).toContain("hero-enfoque-diferencial.webp");

    const fallback = obtenerOpcionHero("inexistente-xyz");
    expect(fallback.id).toBe(HERO_DEFAULT_IMAGE_ID);
  });

  test("resetearHeroConfig restaura valores iniciales completos", () => {
    useHeroConfigStore.getState().setHeroImageId("ninguna");
    useHeroConfigStore.getState().setOpacidad(35);
    useHeroConfigStore.getState().setModoCarrusel(false);
    useHeroConfigStore.getState().setPausado(true);

    useHeroConfigStore.getState().resetearHeroConfig();
    const estado = useHeroConfigStore.getState();
    expect(estado.heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.opacidad).toBe(80);
    expect(estado.modoCarrusel).toBe(true);
    expect(estado.intervaloSegundos).toBe(7);
    expect(estado.pausado).toBe(false);
    expect(estado.indiceActivo).toBe(0);
    expect(estado.pageImages).toEqual({});
  });

  test("gestiona imágenes personalizadas por página con setPageImage y resetPageImage", () => {
    // Asignación a página de barrio
    useHeroConfigStore.getState().setPageImage("barrio", "dialogo-comunitario");
    expect(useHeroConfigStore.getState().pageImages.barrio).toBe("dialogo-comunitario");

    // Asignación a geovisor con ruta o URL externa
    useHeroConfigStore.getState().setPageImage("geovisor", "https://ejemplo.gov.co/mapa.webp");
    expect(useHeroConfigStore.getState().pageImages.geovisor).toBe("https://ejemplo.gov.co/mapa.webp");

    // Asignación a home sincroniza heroImageId si es una opción válida
    useHeroConfigStore.getState().setPageImage("home", "marco-logico");
    expect(useHeroConfigStore.getState().pageImages.home).toBe("marco-logico");
    expect(useHeroConfigStore.getState().heroImageId).toBe("marco-logico");

    // resetPageImage restaura la página individual
    useHeroConfigStore.getState().resetPageImage("barrio");
    expect(useHeroConfigStore.getState().pageImages.barrio).toBeUndefined();
    expect(useHeroConfigStore.getState().pageImages.geovisor).toBe("https://ejemplo.gov.co/mapa.webp");

    // resetAllPageImages limpia todas las personalizaciones
    useHeroConfigStore.getState().resetAllPageImages();
    expect(useHeroConfigStore.getState().pageImages).toEqual({});
    expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
  });

  test("resolverImagenHero traduce IDs a rutas WebP oficiales o preserva URLs externas", () => {
    // Opción conocida
    expect(resolverImagenHero("asamblea-claustro")).toBe("/images/hero/hero-asamblea-claustro.webp");
    expect(resolverImagenHero("dialogo-comunitario")).toBe("/images/hero/hero-dialogo-comunitario.webp");

    // URL externa o ruta directa
    expect(resolverImagenHero("https://cdn.cartagena.gov.co/foto.webp")).toBe("https://cdn.cartagena.gov.co/foto.webp");
    expect(resolverImagenHero("/images/custom/foto.webp")).toBe("/images/custom/foto.webp");

    // Cadena vacía
    expect(resolverImagenHero("")).toBe("");
  });

  describe("Catálogo Temático Centralizado (hero-pages.data.ts)", () => {
    test("contiene las 5 diapositivas territoriales requeridas para Home", () => {
      expect(HERO_HOME_SLIDES.length).toBe(5);

      const [cabildo, dialogo, mujeres, proyectos, transparencia] = HERO_HOME_SLIDES;

      expect(cabildo.id).toBe("asamblea-claustro");
      expect(cabildo.enfoque).toContain("Cabildo Masivo");
      expect(cabildo.altura).toBe("fullscreen");
      expect(cabildo.ubicacionReal).toContain("Claustro de la Merced");

      expect(dialogo.id).toBe("dialogo-comunitario");
      expect(dialogo.enfoque).toContain("Diálogo Barrial");
      expect(dialogo.altura).toBe("fullscreen");
      expect(dialogo.ubicacionReal).toContain("El Pozón");

      expect(mujeres.id).toBe("enfoque-diferencial");
      expect(mujeres.enfoque).toContain("Mujeres");
      expect(mujeres.altura).toBe("fullscreen");
      expect(mujeres.ubicacionReal).toContain("Chiquinquirá");

      expect(proyectos.id).toBe("marco-logico");
      expect(proyectos.enfoque).toContain("Proyectos Comunitarios");
      expect(proyectos.altura).toBe("fullscreen");
      expect(proyectos.ubicacionReal).toContain("Nelson Mandela");

      expect(transparencia.id).toBe("mesa-deliberativa");
      expect(transparencia.enfoque).toContain("Transparencia");
      expect(transparencia.altura).toBe("fullscreen");
      expect(transparencia.ubicacionReal).toContain("Palacio de la Proclamación");
    });

    test("todas las diapositivas de Home tienen imágenes y badges definidos", () => {
      HERO_HOME_SLIDES.forEach((slide) => {
        expect(slide.imagenFondo).toMatch(/^\/images\/hero\/hero-.+\.webp$/);
        expect(slide.badgeTexto.length).toBeGreaterThan(5);
        expect(slide.titulo.length).toBeGreaterThan(5);
        expect(slide.subtitulo.length).toBeGreaterThan(10);
      });
    });

    test("contiene la configuración para todas las páginas públicas requeridas", () => {
      expect(HERO_PAGES_CONFIG.home).toBeDefined();
      expect(HERO_PAGES_CONFIG.barrio).toBeDefined();
      expect(HERO_PAGES_CONFIG.geovisor).toBeDefined();
      expect(HERO_PAGES_CONFIG.fases).toBeDefined();
      expect(HERO_PAGES_CONFIG.rendicion).toBeDefined();
      expect(HERO_PAGES_CONFIG.explorar).toBeDefined();
      expect(HERO_PAGES_CONFIG.mesas).toBeDefined();
      expect(HERO_PAGES_CONFIG.noticias).toBeDefined();
      expect(HERO_PAGES_CONFIG.testimonios).toBeDefined();

      // Verificación de alturas según requerimiento técnico
      expect(HERO_PAGES_CONFIG.barrio.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.barrio.ubicacionReal).toContain("El Pozón");

      expect(HERO_PAGES_CONFIG.geovisor.altura).toBe("ultracompact");
      expect(HERO_PAGES_CONFIG.geovisor.badgeTexto).toContain("SIG");

      expect(HERO_PAGES_CONFIG.fases.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.fases.enfoque).toContain("Fases");

      expect(HERO_PAGES_CONFIG.rendicion.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.rendicion.enfoque).toContain("Fe Pública");

      expect(HERO_PAGES_CONFIG.explorar.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.mesas.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.noticias.altura).toBe("ultracompact");
      expect(HERO_PAGES_CONFIG.testimonios.altura).toBe("compact");
    });

    test("obtenerHeroPageConfig y obtenerHeroSlide resuelven correctamente o aplican fallback", () => {
      expect(obtenerHeroPageConfig("barrio").id).toBe("barrio");
      expect(obtenerHeroPageConfig("/barrio").id).toBe("barrio");
      expect(obtenerHeroPageConfig("geovisor").id).toBe("geovisor");
      expect(obtenerHeroPageConfig("no-existe").id).toBe("asamblea-claustro");

      expect(obtenerHeroSlide(0).id).toBe("asamblea-claustro");
      expect(obtenerHeroSlide(1).id).toBe("dialogo-comunitario");
      expect(obtenerHeroSlide("marco-logico").id).toBe("marco-logico");
    });
  });
});


describe("Catálogo hero editable y persistido (243)", () => {
  const memoria = new Map<string, string>();
  let almacenamientoAnterior = useHeroConfigStore.persist.getOptions().storage;
  const nueva = {
    titulo: "Encuentro comunitario", descripcion: "Diálogo territorial de la comunidad.",
    enfoque: "Participación barrial", archivo: "/images/hero/nueva.webp", thumbnail: "",
  };
  beforeEach(() => {
    almacenamientoAnterior = useHeroConfigStore.persist.getOptions().storage;
    memoria.clear();
    useHeroConfigStore.persist.setOptions({ storage: createJSONStorage(() => ({
      getItem: (clave) => memoria.get(clave) ?? null,
      setItem: (clave, valor) => { memoria.set(clave, valor); },
      removeItem: (clave) => { memoria.delete(clave); },
    })) });
    useHeroConfigStore.getState().resetearHeroConfig();
  });
  afterEach(() => {
    useHeroConfigStore.getState().resetearHeroConfig();
    useHeroConfigStore.persist.setOptions({ storage: almacenamientoAnterior });
  });

  test("agrega metadatos, miniatura opcional y un identificador único", () => {
    const primera = useHeroConfigStore.getState().agregarImagen(nueva);
    const segunda = useHeroConfigStore.getState().agregarImagen({ ...nueva, thumbnail: "/images/hero/miniatura.png", habilitada: false });
    expect(primera.id).not.toBe(segunda.id);
    expect(primera.habilitada).toBe(true);
    expect(primera.thumbnail).toBe(nueva.archivo);
    expect(segunda.habilitada).toBe(false);
    expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(8);
    expect(obtenerOpcionesCarrusel().some((imagen) => imagen.id === primera.id)).toBe(true);
    expect(obtenerOpcionesCarrusel().some((imagen) => imagen.id === segunda.id)).toBe(false);
  });

  test("deshabilita y rehabilita sin borrar metadatos y rechaza su selección mientras está deshabilitada", () => {
    const id = "dialogo-comunitario";
    useHeroConfigStore.getState().setPageImage("barrio", id);
    useHeroConfigStore.getState().setPageImage("home", id);
    useHeroConfigStore.getState().toggleHabilitarImagen(id);
    let estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo.find((imagen) => imagen.id === id)?.habilitada).toBe(false);
    expect(estado.heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.pageImages.barrio).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.pageImages.home).toBe(HERO_DEFAULT_IMAGE_ID);
    estado.setHeroImageId(id);
    estado.setPageImage("mesas", id);
    estado.setPageImage("noticias", HERO_IMAGE_OPTIONS[1].archivo);
    expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(useHeroConfigStore.getState().pageImages.mesas).toBeUndefined();
    expect(useHeroConfigStore.getState().pageImages.noticias).toBeUndefined();
    expect(obtenerOpcionesCarrusel().map((imagen) => imagen.id)).not.toContain(id);
    useHeroConfigStore.getState().toggleHabilitarImagen(id);
    estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo.find((imagen) => imagen.id === id)?.titulo).toBe(HERO_IMAGE_OPTIONS[1].titulo);
    expect(obtenerOpcionesCarrusel().map((imagen) => imagen.id)).toContain(id);
  });

  test("elimina una personalizada y reasigna todas sus referencias por id o ruta", () => {
    const imagen = useHeroConfigStore.getState().agregarImagen(nueva);
    useHeroConfigStore.getState().setPageImage("home", imagen.id);
    useHeroConfigStore.getState().setPageImage("barrio", imagen.id);
    useHeroConfigStore.getState().setPageImage("mesas", imagen.archivo);
    useHeroConfigStore.getState().eliminarImagen(imagen.id);
    const estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo.some((fila) => fila.id === imagen.id)).toBe(false);
    expect(estado.heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.pageImages).toEqual({ home: HERO_DEFAULT_IMAGE_ID, barrio: HERO_DEFAULT_IMAGE_ID, mesas: HERO_DEFAULT_IMAGE_ID });
    expect(estado.indiceActivo).toBe(0);
  });

  test("permite retirar las seis opciones oficiales y navegar sin dividir entre cero ni resucitarlas", () => {
    for (const imagen of HERO_IMAGE_OPTIONS) useHeroConfigStore.getState().eliminarImagen(imagen.id);
    const estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo).toEqual([]);
    expect(estado.heroImageId).toBe("ninguna");
    estado.siguienteImagen(); estado.anteriorImagen();
    expect(Number.isFinite(useHeroConfigStore.getState().indiceActivo)).toBe(true);
    expect(obtenerOpcionesCarrusel()).toEqual([]);
    expect(resolverImagenHero(HERO_IMAGE_OPTIONS[0].archivo)).toBe("");
  });

  test("rota solamente entre habilitadas y recalcula el índice al retirar una anterior", () => {
    useHeroConfigStore.getState().irAImagen("marco-logico");
    useHeroConfigStore.getState().eliminarImagen("dialogo-comunitario");
    expect(useHeroConfigStore.getState().indiceActivo).toBe(2);
    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("mesa-deliberativa");
    useHeroConfigStore.getState().toggleHabilitarImagen("asamblea-claustro");
    useHeroConfigStore.getState().siguienteImagen();
    expect(useHeroConfigStore.getState().heroImageId).toBe("enfoque-diferencial");
  });

  test("restaura seis opciones, conserva la calibración y sanea asignaciones personalizadas", () => {
    const imagen = useHeroConfigStore.getState().agregarImagen(nueva);
    useHeroConfigStore.getState().setPageImage("home", imagen.id);
    useHeroConfigStore.getState().toggleHabilitarImagen(HERO_DEFAULT_IMAGE_ID);
    useHeroConfigStore.getState().setOpacidad(45);
    useHeroConfigStore.getState().restaurarCatalogoOficial();
    expect(useHeroConfigStore.getState().imagenesCatalogo).toEqual(HERO_IMAGE_OPTIONS);
    expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(useHeroConfigStore.getState().opacidad).toBe(45);
    expect(HERO_IMAGE_OPTIONS.every((fila) => fila.habilitada)).toBe(true);
  });

  test("persiste altas, bajas, habilitación y asignaciones y rehidrata sin perder acciones", async () => {
    const imagen = useHeroConfigStore.getState().agregarImagen(nueva);
    useHeroConfigStore.getState().setPageImage("barrio", imagen.id);
    useHeroConfigStore.getState().toggleHabilitarImagen("dialogo-comunitario");
    useHeroConfigStore.getState().eliminarImagen("mesa-deliberativa");
    const guardado = memoria.get("polis_hero_config");
    expect(guardado).toBeTruthy();
    useHeroConfigStore.getState().resetearHeroConfig();
    memoria.set("polis_hero_config", guardado ?? "");
    await useHeroConfigStore.persist.rehydrate();
    const estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo.some((fila) => fila.id === imagen.id)).toBe(true);
    expect(estado.imagenesCatalogo.find((fila) => fila.id === "dialogo-comunitario")?.habilitada).toBe(false);
    expect(estado.imagenesCatalogo.some((fila) => fila.id === "mesa-deliberativa")).toBe(false);
    expect(estado.pageImages.barrio).toBe(imagen.id);
    expect(typeof estado.eliminarImagen).toBe("function");
  });

  test("migra el almacenamiento anterior sin catálogo y conserva opciones visuales y URL heredada", async () => {
    memoria.set("polis_hero_config", JSON.stringify({ version: 0, state: {
      heroImageId: "marco-logico", opacidad: 45, modoCarrusel: false,
      pageImages: { barrio: "https://ejemplo.gov.co/barrio.webp" },
    } }));
    await useHeroConfigStore.persist.rehydrate();
    const estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo).toEqual(HERO_IMAGE_OPTIONS);
    expect(estado.heroImageId).toBe("marco-logico");
    expect(estado.opacidad).toBe(45);
    expect(estado.modoCarrusel).toBe(false);
    expect(estado.pageImages.barrio).toBe("https://ejemplo.gov.co/barrio.webp");
  });

  test("un catálogo vacío persistido permanece vacío al rehidratar", async () => {
    memoria.set("polis_hero_config", JSON.stringify({ version: 1, state: { imagenesCatalogo: [] } }));
    await useHeroConfigStore.persist.rehydrate();
    expect(useHeroConfigStore.getState().imagenesCatalogo).toEqual([]);
    expect(useHeroConfigStore.getState().heroImageId).toBe("ninguna");
  });

  test("normaliza el almacenamiento sin aceptar acciones, URLs peligrosas ni selecciones deshabilitadas", () => {
    const catalogo = HERO_IMAGE_OPTIONS.map((fila) => ({ ...fila, habilitada: false }));
    const saneado = normalizarConfiguracionHero({ imagenesCatalogo: catalogo,
      heroImageId: HERO_DEFAULT_IMAGE_ID, pageImages: { barrio: "javascript:alert(1)" }, opacidad: NaN,
      eliminarImagen: "no es una acción" });
    expect(saneado.heroImageId).toBe("ninguna");
    expect(saneado.pageImages.barrio).toBe("ninguna");
    expect(saneado.opacidad).toBe(HERO_DEFAULT_OPACIDAD);
    expect("eliminarImagen" in saneado).toBe(false);
  });

  for (const ruta of ["javascript:alert(1)", "data:image/png;base64,AA", "//otro.test/foto.png", "/images/../archivo.svg", "/images/%2e%2e/archivo.svg", "/images/documento.pdf", "http://ejemplo.test/foto.webp"]) {
    test(`rechaza una ruta inválida sin modificar catálogo: ${ruta}`, () => {
      expect(esRutaImagenHero(ruta)).toBe(false);
      expect(() => useHeroConfigStore.getState().agregarImagen({ ...nueva, archivo: ruta })).toThrow();
      expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
    });
  }
  test("rechaza id repetido y miniatura inválida sin altas parciales", () => {
    useHeroConfigStore.getState().agregarImagen({ ...nueva, id: "nueva-unica" });
    expect(() => useHeroConfigStore.getState().agregarImagen({ ...nueva, id: "nueva-unica" })).toThrow();
    expect(() => useHeroConfigStore.getState().agregarImagen({ ...nueva, thumbnail: "javascript:alert(1)" })).toThrow();
    expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(7);
  });
});

describe("Sincronización del catálogo con el servidor (243)", () => {
  const fetchOriginal = globalThis.fetch;
  const storageOriginal = useHeroConfigStore.persist.getOptions().storage;
  const peticiones: Array<{ ruta: string; metodo: string; cuerpo: unknown }> = [];
  const remoto = () => ({ slides: HERO_HOME_SLIDES, catalogoImagenes: HERO_IMAGE_OPTIONS,
    heroImageId: "asamblea-claustro", opacidad: 80, modoCarrusel: true, intervaloSegundos: 7, pageImages: {} });
  beforeEach(() => {
    const memoria = new Map<string, string>();
    useHeroConfigStore.persist.setOptions({ storage: createJSONStorage(() => ({
      getItem: (clave) => memoria.get(clave) ?? null,
      setItem: (clave, valor) => { memoria.set(clave, valor); }, removeItem: (clave) => { memoria.delete(clave); },
    })) });
    useHeroConfigStore.getState().resetearHeroConfig();
    peticiones.length = 0;
    globalThis.fetch = async (entrada, opciones) => {
      const ruta = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      peticiones.push({ ruta, metodo: opciones?.method ?? "GET", cuerpo: typeof opciones?.body === "string" ? JSON.parse(opciones.body) : null });
      return Response.json(remoto());
    };
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    useHeroConfigStore.getState().resetearHeroConfig();
    useHeroConfigStore.persist.setOptions({ storage: storageOriginal });
  });

  test("GET conserva deshabilitadas, selección y reemplaza las asignaciones; no vuelve a consultar una carga ya aplicada", async () => {
    const datos = { ...remoto(), heroImageId: "marco-logico", pageImages: { barrio: "mesa-deliberativa" },
      catalogoImagenes: HERO_IMAGE_OPTIONS.map((imagen) => ({ ...imagen, habilitada: imagen.id !== "dialogo-comunitario" })) };
    globalThis.fetch = async () => Response.json(datos);
    await useHeroConfigStore.getState().sincronizarConServidor();
    const estado = useHeroConfigStore.getState();
    expect(estado.heroImageId).toBe("marco-logico");
    expect(estado.imagenesCatalogo.find((imagen) => imagen.id === "dialogo-comunitario")?.habilitada).toBe(false);
    expect(estado.slides.find((slide) => slide.id === "dialogo-comunitario")?.activa).toBe(false);
    expect(estado.pageImages).toEqual({ barrio: "mesa-deliberativa" });
    expect(estado.sincronizadoServidor).toBe(true);
    globalThis.fetch = async () => { throw new Error("No debe haber una segunda consulta"); };
    await estado.sincronizarConServidor();
    expect(useHeroConfigStore.getState().heroImageId).toBe("marco-logico");
  });

  test("GET vacío explícito conserva la biblioteca vacía y no resucita las cinco fotos oficiales", async () => {
    globalThis.fetch = async () => Response.json({ ...remoto(), slides: [], catalogoImagenes: [], pageImages: {} });
    await useHeroConfigStore.getState().sincronizarConServidor();
    const estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo).toEqual([]);
    expect(estado.slides).toEqual([]);
    expect(estado.pageImages).toEqual({});
    expect(estado.heroImageId).toBe("ninguna");
    expect(estado.indiceActivo).toBe(0);
  });

  test("GET fallido o mal formado no altera el catálogo ni deja la carga bloqueada", async () => {
    for (const respuesta of [new Response("{}", { status: 503 }), Response.json({ slides: "inválido", catalogoImagenes: {} })]) {
      globalThis.fetch = async () => respuesta;
      await useHeroConfigStore.getState().sincronizarConServidor();
      expect(useHeroConfigStore.getState().imagenesCatalogo).toEqual(HERO_IMAGE_OPTIONS);
      expect(useHeroConfigStore.getState().cargandoServidor).toBe(false);
      expect(useHeroConfigStore.getState().sincronizadoServidor).toBe(false);
    }
  });

  test("valida entradas remotas antes de convertirlas en imágenes o narrativa renderizables", async () => {
    globalThis.fetch = async () => Response.json({ ...remoto(),
      catalogoImagenes: [{ ...HERO_IMAGE_OPTIONS[0], archivo: "javascript:alert(1)" }, HERO_IMAGE_OPTIONS[3]],
      slides: [{ ...HERO_HOME_SLIDES[3], imagenFondo: "javascript:alert(1)" }, null],
      heroImageId: "javascript:alert(1)", opacidad: 1000, intervaloSegundos: -2,
      pageImages: { barrio: "javascript:alert(1)", mesas: { html: "inválido" } } });
    await useHeroConfigStore.getState().sincronizarConServidor();
    const estado = useHeroConfigStore.getState();
    expect(estado.imagenesCatalogo.map((imagen) => imagen.id)).toEqual(["marco-logico"]);
    expect(estado.heroImageId).toBe("marco-logico");
    expect(estado.pageImages).toEqual({ barrio: "marco-logico" });
    expect(estado.slides[0].imagenFondo).toBe(HERO_IMAGE_OPTIONS[3].archivo);
    expect(estado.opacidad).toBe(95);
    expect(estado.intervaloSegundos).toBe(1);
  });

  test("una respuesta GET tardía no pisa una edición local ni lanza cargas duplicadas", async () => {
    let completar: (respuesta: Response) => void = () => { throw new Error("La carga no se inició"); };
    globalThis.fetch = () => new Promise<Response>((resolve) => { completar = resolve; });
    const primera = useHeroConfigStore.getState().sincronizarConServidor();
    await useHeroConfigStore.getState().sincronizarConServidor();
    useHeroConfigStore.getState().eliminarImagen("dialogo-comunitario");
    completar(Response.json(remoto()));
    await primera;
    expect(useHeroConfigStore.getState().imagenesCatalogo.some((imagen) => imagen.id === "dialogo-comunitario")).toBe(false);
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(true);
    expect(useHeroConfigStore.getState().cargandoServidor).toBe(false);
  });

  test("el borrador local pendiente se conserva también al rehidratar antes de consultar el servidor", async () => {
    useHeroConfigStore.getState().eliminarImagen("asamblea-claustro");
    await useHeroConfigStore.persist.rehydrate();
    await useHeroConfigStore.getState().sincronizarConServidor();
    expect(peticiones).toHaveLength(0);
    expect(useHeroConfigStore.getState().imagenesCatalogo.some((imagen) => imagen.id === "asamblea-claustro")).toBe(false);
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(true);
  });

  test("PUT incluye habilitada, selección activa, miniaturas y catálogo completo sin las imágenes retiradas", async () => {
    const estado = useHeroConfigStore.getState();
    estado.toggleHabilitarImagen("dialogo-comunitario");
    estado.eliminarImagen("enfoque-diferencial");
    const nueva = estado.agregarImagen({ titulo: "Nueva imagen", descripcion: "Descripción territorial", enfoque: "Comunidad",
      archivo: "/images/hero/nueva243.webp", thumbnail: "/images/hero/nueva243-thumb.png" });
    estado.setPageImage("home", nueva.id);
    expect(await estado.guardarEnServidor()).toBe(true);
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0]).toMatchObject({ metodo: "PUT", cuerpo: {
      heroImageId: nueva.id, pageImages: { home: nueva.id },
      catalogoImagenes: expect.arrayContaining([{ ...HERO_IMAGE_OPTIONS[1], habilitada: false }, nueva]),
      slides: expect.arrayContaining([expect.objectContaining({ id: "dialogo-comunitario", activa: false })]),
    } });
    expect(JSON.stringify(peticiones[0].cuerpo)).not.toContain("enfoque-diferencial");
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(false);
    expect(useHeroConfigStore.getState().guardandoServidor).toBe(false);
  });

  test("PUT permite retirar todas las imágenes sin recuperar un carrusel fijo", async () => {
    for (const imagen of HERO_IMAGE_OPTIONS) useHeroConfigStore.getState().eliminarImagen(imagen.id);
    expect(await useHeroConfigStore.getState().guardarEnServidor()).toBe(true);
    expect(peticiones[0].cuerpo).toMatchObject({ slides: [], catalogoImagenes: [], heroImageId: "ninguna", pageImages: {} });
  });

  test("error de guardado devuelve false, conserva el borrador y restaurar no acredita un éxito remoto inexistente", async () => {
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    useHeroConfigStore.getState().eliminarImagen("asamblea-claustro");
    expect(await useHeroConfigStore.getState().guardarEnServidor()).toBe(false);
    expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(5);
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(true);
    expect(useHeroConfigStore.getState().guardandoServidor).toBe(false);
    expect(await useHeroConfigStore.getState().restablecerHerosOficiales()).toBe(false);
    expect(useHeroConfigStore.getState().imagenesCatalogo).toEqual(HERO_IMAGE_OPTIONS);
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(true);
  });

  test("serializa guardados solapados y guarda la edición más reciente al final", async () => {
    let completar: (respuesta: Response) => void = () => { throw new Error("El primer PUT no llegó"); };
    const cuerpos: unknown[] = [];
    globalThis.fetch = async (_entrada, opciones) => {
      cuerpos.push(typeof opciones?.body === "string" ? JSON.parse(opciones.body) : null);
      if (cuerpos.length === 1) return new Promise<Response>((resolve) => { completar = resolve; });
      return Response.json({});
    };
    useHeroConfigStore.getState().setOpacidad(45);
    const primero = useHeroConfigStore.getState().guardarEnServidor();
    await Promise.resolve();
    useHeroConfigStore.getState().eliminarImagen("asamblea-claustro");
    const segundo = useHeroConfigStore.getState().guardarEnServidor();
    expect(cuerpos).toHaveLength(1);
    completar(Response.json({}));
    expect(await primero).toBe(true);
    expect(await segundo).toBe(true);
    expect(cuerpos).toHaveLength(2);
    expect(JSON.stringify(cuerpos[0])).toContain("asamblea-claustro");
    expect(JSON.stringify(cuerpos[1])).not.toContain("asamblea-claustro");
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(false);
    expect(useHeroConfigStore.getState().guardandoServidor).toBe(false);
  });

  test("un PUT en curso no borra el indicador de otra edición que aún no se guardó", async () => {
    let completar: (respuesta: Response) => void = () => { throw new Error("No se inició el PUT"); };
    globalThis.fetch = () => new Promise<Response>((resolve) => { completar = resolve; });
    useHeroConfigStore.getState().setOpacidad(45);
    const guardado = useHeroConfigStore.getState().guardarEnServidor();
    await Promise.resolve();
    useHeroConfigStore.getState().eliminarImagen("asamblea-claustro");
    completar(Response.json({}));
    expect(await guardado).toBe(true);
    expect(useHeroConfigStore.getState().cambiosPendientes).toBe(true);
  });
});
