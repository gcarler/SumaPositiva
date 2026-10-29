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

    expect(html).toContain("Biblioteca de imágenes hero");
    expect(html).toContain('aria-label="Biblioteca de imágenes hero"');
    expect(html).toContain("Cabildo Abierto y Foro Ciudadano");
    expect(html).toContain("Diálogo Social y Rendición de Cuentas");
    expect(html).toContain("Taller Diferencial de Género y Juventud");
    expect(html).toContain("Matriz de Marco Lógico y Proyectos");
    expect(html).toContain("Mesa Redonda y Concertación Temática");
    expect(html).toContain("Solo retícula institucional");
  });

  test("renderiza la sección de asignación de URL personalizada y calibración de opacidad", () => {
    const html = renderToString(<GestorHerosPlataforma />);

    expect(html).toContain("Nueva imagen hero");
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


describe("Gestor de catálogo editable (243)", () => {
  beforeEach(() => useHeroConfigStore.getState().resetearHeroConfig());
  test("muestra disponibilidad y acciones con nombres accesibles por imagen", () => {
    const html = renderToString(<GestorHerosPlataforma />);
    expect(html).toContain("Habilitada");
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Habilitar Cabildo Abierto y Foro Ciudadano"');
    expect(html).toContain('aria-label="Eliminar Cabildo Abierto y Foro Ciudadano"');
    expect(html).toContain("Restaurar catálogo oficial");
    expect(html).toContain("Nueva imagen hero");
  });
  test("conserva en biblioteca las deshabilitadas pero desactiva su botón Asignar", () => {
    useHeroConfigStore.getState().toggleHabilitarImagen("dialogo-comunitario");
    const html = renderToString(<GestorHerosPlataforma />);
    const boton = html.match(/<button\b[^>]*>/g)?.find((tag) => tag.includes('aria-label="Asignar Diálogo Social y Rendición de Cuentas"'));
    expect(boton).toContain('disabled=""');
    expect(html).toContain("Deshabilitada");
    expect(html).toContain('data-testid="imagen-hero-dialogo-comunitario"');
  });
  test("muestra una biblioteca vacía recuperable y las fotografías agregadas con miniatura", () => {
    for (const imagen of [...useHeroConfigStore.getState().imagenesCatalogo]) useHeroConfigStore.getState().eliminarImagen(imagen.id);
    expect(renderToString(<GestorHerosPlataforma />)).toContain("No hay imágenes en la biblioteca");
    const imagen = useHeroConfigStore.getState().agregarImagen({ titulo: "Nueva fotografía",
      descripcion: "Registro de participación.", enfoque: "Cabildo", archivo: "/images/nueva-243.webp", thumbnail: "/images/miniatura-243.png" });
    const html = renderToString(<GestorHerosPlataforma />);
    expect(html).toContain(imagen.titulo);
    expect(html).toContain(imagen.thumbnail);
  });
});
