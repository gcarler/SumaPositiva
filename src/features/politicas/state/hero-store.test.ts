import { describe, test, expect, beforeEach } from "vitest";
import {
  useHeroConfigStore,
  HERO_IMAGE_OPTIONS,
  HERO_DEFAULT_IMAGE_ID,
  HERO_DEFAULT_OPACIDAD,
  obtenerOpcionHero,
} from "./hero-store";

describe("Hero Config Store (FEAT-HERO-01)", () => {
  beforeEach(() => {
    useHeroConfigStore.getState().resetearHeroConfig();
  });

  test("inicia con la imagen recomendada y opacidad por defecto", () => {
    const estado = useHeroConfigStore.getState();
    expect(estado.heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(estado.opacidad).toBe(HERO_DEFAULT_OPACIDAD);
  });

  test("contiene las 6 opciones requeridas en el catálogo", () => {
    expect(HERO_IMAGE_OPTIONS.length).toBe(6);
    const ids = HERO_IMAGE_OPTIONS.map((o) => o.id);
    expect(ids).toContain("marco-logico");
    expect(ids).toContain("asamblea-claustro");
    expect(ids).toContain("dialogo-comunitario");
    expect(ids).toContain("mesa-deliberativa");
    expect(ids).toContain("enfoque-diferencial");
    expect(ids).toContain("ninguna");
  });

  test("permite cambiar la imagen activa", () => {
    useHeroConfigStore.getState().setHeroImageId("asamblea-claustro");
    expect(useHeroConfigStore.getState().heroImageId).toBe("asamblea-claustro");
  });

  test("permite calibrar la opacidad y acota entre 5% y 40%", () => {
    useHeroConfigStore.getState().setOpacidad(25);
    expect(useHeroConfigStore.getState().opacidad).toBe(25);

    // Límite inferior
    useHeroConfigStore.getState().setOpacidad(2);
    expect(useHeroConfigStore.getState().opacidad).toBe(5);

    // Límite superior
    useHeroConfigStore.getState().setOpacidad(99);
    expect(useHeroConfigStore.getState().opacidad).toBe(40);
  });

  test("obtenerOpcionHero devuelve la opción correcta o fallback", () => {
    const opcion = obtenerOpcionHero("enfoque-diferencial");
    expect(opcion.id).toBe("enfoque-diferencial");
    expect(opcion.archivo).toContain("hero-enfoque-diferencial.webp");

    const fallback = obtenerOpcionHero("inexistente-xyz");
    expect(fallback.id).toBe(HERO_DEFAULT_IMAGE_ID);
  });

  test("resetearHeroConfig restaura valores iniciales", () => {
    useHeroConfigStore.getState().setHeroImageId("ninguna");
    useHeroConfigStore.getState().setOpacidad(35);
    expect(useHeroConfigStore.getState().heroImageId).toBe("ninguna");

    useHeroConfigStore.getState().resetearHeroConfig();
    expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    expect(useHeroConfigStore.getState().opacidad).toBe(HERO_DEFAULT_OPACIDAD);
  });
});
