import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GestorHerosPlataforma } from "./gestor-heros-plataforma";
import { useHeroConfigStore } from "@/features/politicas/state/hero-store";
import { HERO_PAGES_CONFIG } from "@/features/politicas/data/hero-pages.data";

describe("GestorHerosPlataforma Component", () => {
  beforeEach(() => {
    useHeroConfigStore.getState().resetearHeroConfig();
  });

  test("renderiza los 8 espacios públicos gestionables con sus rutas oficiales", () => {
    const html = renderToString(<GestorHerosPlataforma />);

    expect(html).toContain("Portada Principal");
    expect(html).toContain("Líneas y Gobernanza");
    expect(html).toContain("Mesas de Diálogo");
    expect(html).toContain("Noticias y Novedades");
    expect(html).toContain("Voces y Testimonios");
    expect(html).toContain("Diagnóstico y Fases");
    expect(html).toContain("Modo Barrio Popular");
    expect(html).toContain("Veeduría y Rendición");

    expect(html).toContain("/");
    expect(html).toContain("/explorar");
    expect(html).toContain("/mesas");
    expect(html).toContain("/noticias");
    expect(html).toContain("/testimonios");
    expect(html).toContain("/fases");
    expect(html).toContain("/barrio");
    expect(html).toContain("/plataforma/rendicion");
  });

  test("renderiza el live preview y los metadatos institucionales del espacio activo", () => {
    const html = renderToString(<GestorHerosPlataforma />);

    expect(html).toContain('data-testid="live-banner-preview"');
    expect(html).toContain(HERO_PAGES_CONFIG.home.ubicacionReal);
    expect(html).toContain(HERO_PAGES_CONFIG.home.titulo);
    expect(html).toContain("Previsualización en Tiempo Real");
  });

  test("renderiza los controles específicos del carrusel en la portada", () => {
    const html = renderToString(<GestorHerosPlataforma />);

    expect(html).toContain("Rotación Automática del Carrusel (Portada)");
    expect(html).toContain("Velocidad de cambio:");
    expect(html).toContain("7s (Oficial)");
  });

  test("renderiza la biblioteca completa de fotografías territoriales para asignación", () => {
    const html = renderToString(<GestorHerosPlataforma />);

    expect(html).toContain("Biblioteca de Fotografías Territoriales Oficiales");
    expect(html).toContain("Cabildo Abierto y Foro Ciudadano");
    expect(html).toContain("Diálogo Social y Rendición de Cuentas");
    expect(html).toContain("Taller Diferencial de Género y Juventud");
    expect(html).toContain("Matriz de Marco Lógico y Proyectos");
    expect(html).toContain("Mesa Redonda y Concertación Temática");
    expect(html).toContain("Solo retícula institucional");
  });

  test("renderiza la sección de asignación de URL personalizada y calibración de opacidad", () => {
    const html = renderToString(<GestorHerosPlataforma />);

    expect(html).toContain("Asignar Imagen Personalizada vía URL o Ruta Local");
    expect(html).toContain("Calibración Global de Intensidad Ambiental");
    expect(html).toContain("Certificado WCAG 2.1 AA");
    expect(html).toContain("80% (Recomendado)");
  });

  test("refleja en el store la personalización de imagen por página vía setPageImage", () => {
    // Asignar imagen comunitaria al Geovisor
    useHeroConfigStore.getState().setPageImage("geovisor", "enfoque-diferencial");
    expect(useHeroConfigStore.getState().pageImages["geovisor"]).toBe("enfoque-diferencial");

    // Asignar imagen a Modo Barrio
    useHeroConfigStore.getState().setPageImage("barrio", "marco-logico");
    expect(useHeroConfigStore.getState().pageImages["barrio"]).toBe("marco-logico");

    // Restablecer imagen de Geovisor
    useHeroConfigStore.getState().resetPageImage("geovisor");
    expect(useHeroConfigStore.getState().pageImages["geovisor"]).toBeUndefined();
    expect(useHeroConfigStore.getState().pageImages["barrio"]).toBe("marco-logico");

    // Restablecer todas
    useHeroConfigStore.getState().resetAllPageImages();
    expect(useHeroConfigStore.getState().pageImages).toEqual({});
  });

  test("respeta el modo de solo lectura cuando editar es falso", () => {
    const html = renderToString(<GestorHerosPlataforma editar={false} />);

    expect(html).toContain("disabled");
  });
});
