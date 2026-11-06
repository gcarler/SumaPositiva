import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), "utf8");

describe("Referencias normativas y alcance del diagrama de trazabilidad", () => {
  test("usa referencias verificadas sin atribuir adopción distrital al decreto nacional", () => {
    const fuente = leer("./diagrama-trazabilidad.tsx") + leer("./page.tsx");
    expect(fuente).not.toMatch(/Decreto Distrital 0*37|Ley 141[47]\/2010|Ley 2175\/2021|Ley 2294\/2022/);
    expect(fuente).toContain("Ley 2166/2021 (acción comunal)");
    expect(fuente).toContain("Ley 80/1993 (Estatuto General de Contratación");
    expect(fuente).toContain("Ley 2294/2023");
    expect(fuente).toContain("Acto de adopción de la autoridad competente, por verificar");
    expect(fuente).toContain("ejemplos ilustrativos");
    expect(fuente).toContain("propone cinco fases de trabajo");
  });

  test("el vector de seguimiento identifica su perfil como POLIS", () => {
    for (const ruta of [
      "../../features/seguimiento/components/sistema-multiagente-pdd-panel.tsx",
      "../../features/seguimiento/data/sistema-multiagente-pdd.data.ts",
    ]) {
      const fuente = leer(ruta);
      expect(fuente).not.toContain("PNUD 1994 / Decreto 037 de 2026");
      expect(fuente).toContain("perfil de 7 dimensiones de Seguridad Humana de POLIS");
    }
  });
});
