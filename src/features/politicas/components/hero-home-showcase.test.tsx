import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { HeroHomeShowcase } from "./hero-home-showcase";
import { useHeroConfigStore } from "@/features/politicas/state/hero-store";
import { HERO_HOME_SLIDES } from "@/features/politicas/data/hero-pages.data";

describe("HeroHomeShowcase Component (HERO-PAGES-02)", () => {
  beforeEach(() => {
    useHeroConfigStore.getState().resetearHeroConfig();
  });

  test("renderiza correctamente la diapositiva inicial, contador 01 / 05 e insignia territorial", () => {
    const html = renderToString(<HeroHomeShowcase />);

    // Título distrital institucional
    expect(html).toContain("Distrito Turístico y Cultural de Cartagena de Indias");
    expect(html).toContain("Política Pública de Seguridad Humana Integral");

    // Contador inicial
    expect(html).toContain("01 / 05");

    // Insignia territorial de la primera diapositiva (Claustro de la Merced)
    expect(html).toContain("Claustro de la Merced — Centro Histórico");
    expect(html).toContain("Procedencia Territorial Real");

    // Enfoque y subtítulo del slide 1
    expect(html).toContain(HERO_HOME_SLIDES[0].enfoque);
    expect(html).toContain(HERO_HOME_SLIDES[0].subtitulo);
  });

  test("cuenta con controles accesibles de navegación con atributos ARIA requeridos", () => {
    const html = renderToString(<HeroHomeShowcase />);

    // Flechas de navegación con ARIA
    expect(html).toContain('aria-label="Diapositiva anterior"');
    expect(html).toContain('aria-label="Diapositiva siguiente"');

    // Botón de control de pausa
    expect(html).toContain('aria-label="Pausar carrusel"');

    // Rol de carrusel accesible
    expect(html).toContain('aria-roledescription="carrusel"');
    expect(html).toContain('role="tablist"');

    // Pills con etiquetas accesibles para las 5 diapositivas
    HERO_HOME_SLIDES.forEach((slide, idx) => {
      expect(html).toContain(`aria-label="Ver diapositiva ${idx + 1}: ${slide.badgeTexto}"`);
    });
  });

  test("refleja el avance de diapositiva en el contador y la insignia territorial", () => {
    // Avanzar a la siguiente imagen (diapositiva 2: El Pozón)
    useHeroConfigStore.getState().siguienteImagen();
    const html = renderToString(<HeroHomeShowcase />);

    expect(html).toContain("02 / 05");
    expect(html).toContain("Sector El Pozón — Localidad 2");
    expect(html).toContain(HERO_HOME_SLIDES[1].subtitulo);
  });

  test("refleja el retroceso cíclico y salto directo por ID", () => {
    // Salto directo a slide 3 (enfoque-diferencial / Chiquinquirá)
    useHeroConfigStore.getState().irAImagen("enfoque-diferencial");
    let html = renderToString(<HeroHomeShowcase />);

    expect(html).toContain("03 / 05");
    expect(html).toContain("Casa de Justicia Chiquinquirá");

    // Retroceder un slide (debe ir al slide 2)
    useHeroConfigStore.getState().anteriorImagen();
    html = renderToString(<HeroHomeShowcase />);

    expect(html).toContain("02 / 05");
    expect(html).toContain("Sector El Pozón");
  });

  test("itera por todas las 5 diapositivas territoriales de manera íntegra", () => {
    // Verificar cada diapositiva en secuencia
    for (let i = 0; i < HERO_HOME_SLIDES.length; i++) {
      useHeroConfigStore.getState().irAImagen(HERO_HOME_SLIDES[i].id);
      const html = renderToString(<HeroHomeShowcase />);
      const formattedNum = `0${i + 1} / 05`;
      expect(html).toContain(formattedNum);
      expect(html).toContain(HERO_HOME_SLIDES[i].enfoque);
      expect(html).toContain(HERO_HOME_SLIDES[i].ubicacionReal);
    }
  });

  test("alterna la etiqueta ARIA del botón de pausa cuando el carrusel se detiene", () => {
    // Inicialmente activo -> botón ofrece pausar
    let html = renderToString(<HeroHomeShowcase />);
    expect(html).toContain('aria-label="Pausar carrusel"');

    // Pausar
    useHeroConfigStore.getState().togglePausa();
    html = renderToString(<HeroHomeShowcase />);
    expect(html).toContain('aria-label="Reanudar carrusel"');

    // Reanudar
    useHeroConfigStore.getState().togglePausa();
    html = renderToString(<HeroHomeShowcase />);
    expect(html).toContain('aria-label="Pausar carrusel"');
  });

  test("permite suministrar métricas personalizadas", () => {
    const statsPersonalizadas = [
      { valor: "50+", label: "Iniciativas Comunitarias" },
      { valor: "100%", label: "Transparencia Cívica" },
    ];

    const html = renderToString(
      <HeroHomeShowcase stats={statsPersonalizadas} />
    );

    expect(html).toContain("50+");
    expect(html).toContain("Iniciativas Comunitarias");
    expect(html).toContain("100%");
    expect(html).toContain("Transparencia Cívica");
  });

  test("renderiza los botones de acción ciudadana hacia los módulos clave", () => {
    const html = renderToString(<HeroHomeShowcase />);

    expect(html).toContain("Dejar mi Aporte Territorial");
    expect(html).toContain("Ver Diagnóstico Participativo");
    expect(html).toContain("Geovisor de Seguridad");
    expect(html).toContain("Rendición de Cuentas 2026");
  });

  test("soporta modo minimalista oficial sin fotografía de fondo ('ninguna')", () => {
    useHeroConfigStore.getState().irAImagen("ninguna");
    const html = renderToString(<HeroHomeShowcase />);

    expect(html).toContain("Distrito Turístico y Cultural de Cartagena de Indias");
    expect(html).toContain("Política Pública de Seguridad Humana Integral");
  });
});


describe("Portada con catálogo editable (243)", () => {
  beforeEach(() => useHeroConfigStore.getState().resetearHeroConfig());
  test("no renderiza ni ofrece una imagen deshabilitada aunque la lista temática original la contenga", () => {
    useHeroConfigStore.getState().toggleHabilitarImagen("enfoque-diferencial");
    const html = renderToString(<HeroHomeShowcase />);
    expect(html).not.toContain("hero-enfoque-diferencial.webp");
    expect(html).not.toContain("Ver diapositiva 3: Enfoque Diferencial e Inclusivo");
    expect(html).toContain("01 / 04");
  });
  test("renderiza imágenes agregadas con sus metadatos sin inventar procedencia oficial", () => {
    const imagen = useHeroConfigStore.getState().agregarImagen({
      titulo: "Encuentro barrial", descripcion: "Encuentro y concertación vecinal.",
      enfoque: "Participación de la comunidad", archivo: "/images/nueva-243.webp", thumbnail: "",
    });
    useHeroConfigStore.getState().setHeroImageId(imagen.id);
    const html = renderToString(<HeroHomeShowcase />);
    expect(html).toContain(imagen.archivo);
    expect(html).toContain(imagen.descripcion);
    expect(html).toContain("Enfoque territorial");
    expect(html).not.toContain("Procedencia Territorial Real");
    expect(html).toContain("06 / 06");
  });
  test("retirar todo el catálogo deja una portada institucional sin imágenes ni errores de índice", () => {
    for (const imagen of [...useHeroConfigStore.getState().imagenesCatalogo]) useHeroConfigStore.getState().eliminarImagen(imagen.id);
    const html = renderToString(<HeroHomeShowcase />);
    expect(html).not.toContain("<img");
    expect(html).toContain("00 / 00");
    expect(html).toContain("Política Pública de Seguridad Humana Integral");
    expect(html).not.toContain("NaN");
  });
  test("conserva las URLs de portada previas al catálogo editable", () => {
    useHeroConfigStore.getState().setPageImage("home", "https://ejemplo.gov.co/portada.webp");
    expect(renderToString(<HeroHomeShowcase />)).toContain("https://ejemplo.gov.co/portada.webp");
  });
});
