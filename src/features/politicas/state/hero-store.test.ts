import { describe, test, expect, beforeEach } from "vitest";
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
} from "./hero-store";
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

  test("inicia con la imagen recomendada, opacidad al 60% y carrusel activo sin pausa", () => {
    const estado = useHeroConfigStore.getState();
    expect(estado.heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.opacidad).toBe(60);
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

  test("permite calibrar la opacidad y acota estrictamente entre 10% y 85%", () => {
    // Valor intermedio válido
    useHeroConfigStore.getState().setOpacidad(45);
    expect(useHeroConfigStore.getState().opacidad).toBe(45);

    // Límite inferior (mínimo 10%)
    useHeroConfigStore.getState().setOpacidad(5);
    expect(useHeroConfigStore.getState().opacidad).toBe(HERO_MIN_OPACIDAD);
    expect(useHeroConfigStore.getState().opacidad).toBe(10);

    useHeroConfigStore.getState().setOpacidad(-20);
    expect(useHeroConfigStore.getState().opacidad).toBe(10);

    // Límite superior (máximo 85%)
    useHeroConfigStore.getState().setOpacidad(99);
    expect(useHeroConfigStore.getState().opacidad).toBe(HERO_MAX_OPACIDAD);
    expect(useHeroConfigStore.getState().opacidad).toBe(85);

    useHeroConfigStore.getState().setOpacidad(85);
    expect(useHeroConfigStore.getState().opacidad).toBe(85);
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
    expect(estado.opacidad).toBe(60);
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

      // Verificación de alturas según requerimiento técnico
      expect(HERO_PAGES_CONFIG.barrio.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.barrio.ubicacionReal).toContain("El Pozón");

      expect(HERO_PAGES_CONFIG.geovisor.altura).toBe("ultracompact");
      expect(HERO_PAGES_CONFIG.geovisor.badgeTexto).toContain("SIG");

      expect(HERO_PAGES_CONFIG.fases.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.fases.enfoque).toContain("Fases");

      expect(HERO_PAGES_CONFIG.rendicion.altura).toBe("compact");
      expect(HERO_PAGES_CONFIG.rendicion.enfoque).toContain("Fe Pública");
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
