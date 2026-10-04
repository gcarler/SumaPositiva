import { describe, expect, test } from "vitest";
import {
  listarTerritoriosDiagnostico,
  obtenerFichaTerritorial,
  calcularResumenDiagnosticoTerritorial,
} from "./territorios-api";

describe("Geodiagnóstico Territorial de Cartagena (Hito D-3)", () => {
  test("debe cargar los 15 territorios distritales canónicos", async () => {
    const territorios = await listarTerritoriosDiagnostico();
    expect(territorios.length).toBe(15);
  });

  test("debe filtrar territorios por Localidad", async () => {
    const loc2 = await listarTerritoriosDiagnostico({ localidad: "LOCALIDAD_2" });
    expect(loc2.length).toBeGreaterThanOrEqual(3);
    expect(loc2.every((t) => t.localidad === "LOCALIDAD_2")).toBe(true);

    const corregimientos = await listarTerritoriosDiagnostico({
      localidad: "CORREGIMENTAL_INSULAR",
    });
    expect(corregimientos.length).toBe(6);
    expect(corregimientos.some((t) => t.nombre.includes("Boquilla"))).toBe(true);
    expect(corregimientos.some((t) => t.nombre.includes("Tierrabomba"))).toBe(true);
    expect(corregimientos.some((t) => t.nombre.includes("Barú"))).toBe(true);
  });

  test("debe filtrar territorios por Nivel de Riesgo", async () => {
    const altoRiesgo = await listarTerritoriosDiagnostico({ riesgo: "ALTO" });
    expect(altoRiesgo.length).toBeGreaterThan(0);
    expect(altoRiesgo.every((t) => t.nivelRiesgo === "ALTO")).toBe(true);
  });

  test("debe buscar por barrio, vereda o UCG", async () => {
    const busquedaOlaya = await listarTerritoriosDiagnostico({ busqueda: "Olaya" });
    expect(busquedaOlaya.length).toBeGreaterThanOrEqual(1);
    expect(busquedaOlaya.some((t) => t.id === "terr-ucg-6")).toBe(true);

    const busquedaMandela = await listarTerritoriosDiagnostico({ busqueda: "Mandela" });
    expect(busquedaMandela.length).toBeGreaterThanOrEqual(1);

    const busquedaUcg1 = await listarTerritoriosDiagnostico({ busqueda: "UCG 1" });
    expect(busquedaUcg1.length).toBeGreaterThanOrEqual(1);
  });

  test("obtenerFichaTerritorial retorna la ficha completa con equipamientos y problemáticas", async () => {
    const ficha = await obtenerFichaTerritorial("terr-boquilla");
    expect(ficha).toBeDefined();
    expect(ficha?.nombre).toContain("La Boquilla");
    expect(ficha?.esEtnicoLey70).toBe(true);
    expect(ficha?.nombreComunidadNegra).toContain("Consejo Comunitario");
    expect(ficha?.problematicasPriorizadas.length).toBe(3);
    expect(ficha?.equipamientos.caisOEstaciones).toBeGreaterThanOrEqual(1);
    expect(ficha?.participacion.propuestasRadicadas).toBe(0);
  });

  test("calcularResumenDiagnosticoTerritorial computa métricas consolidadas", async () => {
    const territorios = await listarTerritoriosDiagnostico();
    const resumen = calcularResumenDiagnosticoTerritorial(territorios);

    expect(resumen.totalTerritorios).toBe(15);
    expect(resumen.poblacionTotalEstimada).toBeGreaterThan(1_000_000);
    expect(resumen.poblacionTotalVulnerable).toBeGreaterThan(500_000);
    expect(resumen.promedioNbi).toBeGreaterThan(20);
    expect(resumen.totalPropuestasRadicadas).toBe(0);
    expect(resumen.territoriosEtnicosLey70Count).toBeGreaterThanOrEqual(5);
  });
});
