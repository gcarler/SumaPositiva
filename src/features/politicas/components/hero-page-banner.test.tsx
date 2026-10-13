import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { HeroPageBanner } from "./hero-page-banner";
import { useHeroConfigStore } from "@/features/politicas/state/hero-store";
import { HERO_PAGES_CONFIG } from "@/features/politicas/data/hero-pages.data";

describe("HeroPageBanner Component (HERO-PAGES-03)", () => {
  beforeEach(() => {
    useHeroConfigStore.getState().resetearHeroConfig();
  });

  test("renderiza como sección nombrada sin duplicar el landmark banner (F3, axe landmark-no-duplicate-banner)", () => {
    const html = renderToString(<HeroPageBanner pageKey="barrio" />);

    expect(html).not.toContain('role="banner"');
    expect(html).toContain("<section");
    expect(html).toContain(`aria-label="${HERO_PAGES_CONFIG.barrio.titulo}"`);
  });

  test("renderiza correctamente los datos canónicos de cada página pública", () => {
    const claves: Array<
      | "barrio"
      | "geovisor"
      | "fases"
      | "rendicion"
      | "explorar"
      | "mesas"
      | "noticias"
      | "testimonios"
    > = [
      "barrio",
      "geovisor",
      "fases",
      "rendicion",
      "explorar",
      "mesas",
      "noticias",
      "testimonios",
    ];

    claves.forEach((clave) => {
      const cfg = HERO_PAGES_CONFIG[clave];
      const html = renderToString(<HeroPageBanner pageKey={clave} />);

      // Título canónico
      expect(html).toContain(cfg.titulo);

      // Subtítulo canónico
      expect(html).toContain(cfg.subtitulo);

      // Insignia territorial de procedencia real
      expect(html).toContain(cfg.ubicacionReal);

      // Badge temático
      expect(html).toContain(cfg.badgeTexto);

      // Imagen de fondo WebP asociada
      expect(html).toContain(cfg.imagenFondo);
    });
  });

  test("aplica alturas diferenciadas: compact para barrio/fases/rendicion y ultracompact para geovisor", () => {
    // Geovisor por defecto es ultracompact (h-40 a h-48)
    const htmlGeovisor = renderToString(<HeroPageBanner pageKey="geovisor" />);
    expect(htmlGeovisor).toContain("min-h-[10rem] sm:min-h-[12rem]");

    // Barrio por defecto es compact (h-56 a h-64)
    const htmlBarrio = renderToString(<HeroPageBanner pageKey="barrio" />);
    expect(htmlBarrio).toContain("min-h-[14rem] sm:min-h-[16rem]");

    // Fases por defecto es compact
    const htmlFases = renderToString(<HeroPageBanner pageKey="fases" />);
    expect(htmlFases).toContain("min-h-[14rem] sm:min-h-[16rem]");
  });

  test("permite sobrescribir la altura con alturaOverride", () => {
    // Forzar geovisor a compact
    const htmlGeovisorCompact = renderToString(
      <HeroPageBanner pageKey="geovisor" alturaOverride="compact" />
    );
    expect(htmlGeovisorCompact).toContain("min-h-[14rem] sm:min-h-[16rem]");

    // Forzar barrio a ultracompact
    const htmlBarrioUltracompact = renderToString(
      <HeroPageBanner pageKey="barrio" alturaOverride="ultracompact" />
    );
    expect(htmlBarrioUltracompact).toContain("min-h-[10rem] sm:min-h-[12rem]");
  });

  test("permite sobrescribir título, subtítulo y badge con props específicas", () => {
    const html = renderToString(
      <HeroPageBanner
        pageKey="geovisor"
        tituloOverride="Geovisor Estadístico Especializado"
        subtituloOverride="Análisis geoespacial en tiempo real para Cartagena."
        badgeOverride="Módulo de Inteligencia Distrital"
      />
    );

    expect(html).toContain("Geovisor Estadístico Especializado");
    expect(html).toContain("Análisis geoespacial en tiempo real para Cartagena.");
    expect(html).toContain("Módulo de Inteligencia Distrital");

    // Conserva la procedencia territorial real inalterada
    expect(html).toContain(HERO_PAGES_CONFIG.geovisor.ubicacionReal);
  });

  test("renderiza componentes y elementos hijos inyectados vía children", () => {
    const html = renderToString(
      <HeroPageBanner pageKey="fases">
        <div data-testid="kpis-concurrencia">
          <span>7 Dimensiones ONU</span>
          <span>27 Dependencias Distritales</span>
        </div>
      </HeroPageBanner>
    );

    expect(html).toContain('data-testid="hero-page-banner-children"');
    expect(html).toContain('data-testid="kpis-concurrencia"');
    expect(html).toContain("7 Dimensiones ONU");
    expect(html).toContain("27 Dependencias Distritales");
  });

  test("respeta la opacidad del store y el modo sin fotografía ('ninguna')", () => {
    // Calibrar opacidad al 75%
    useHeroConfigStore.getState().setOpacidad(75);
    let html = renderToString(<HeroPageBanner pageKey="barrio" />);
    expect(html).toContain("opacity:0.75");

    // Modo minimalista oficial
    useHeroConfigStore.getState().irAImagen("ninguna");
    html = renderToString(<HeroPageBanner pageKey="barrio" />);
    expect(html).not.toContain('src="/images/hero/hero-dialogo-comunitario.webp"');
    expect(html).toContain(HERO_PAGES_CONFIG.barrio.titulo);
  });

  test("renderiza la imagen personalizada asignada desde la plataforma", () => {
    // Asignar desde plataforma imagen de marco lógico a Modo Barrio
    useHeroConfigStore.getState().setPageImage("barrio", "marco-logico");
    let html = renderToString(<HeroPageBanner pageKey="barrio" />);
    expect(html).toContain('src="/images/hero/hero-marco-logico.webp"');

    // Asignar URL externa personalizada a Geovisor
    useHeroConfigStore.getState().setPageImage("geovisor", "https://cdn.cartagena.gov.co/mapa-satelital.webp");
    html = renderToString(<HeroPageBanner pageKey="geovisor" />);
    expect(html).toContain('src="https://cdn.cartagena.gov.co/mapa-satelital.webp"');

    // Restablecer imagen de Barrio
    useHeroConfigStore.getState().resetPageImage("barrio");
    html = renderToString(<HeroPageBanner pageKey="barrio" />);
    expect(html).toContain('src="/images/hero/hero-dialogo-comunitario.webp"');
  });
});
