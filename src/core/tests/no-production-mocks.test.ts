import { describe, expect, test } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * AUD-15 (CRÍTICA): Verificación automatizada de no importación de mocks o fixtures en código de producción.
 * Garantiza que ningún módulo ejecutable de src/ importe datasets ficticios (*.mock*, __fixtures__, *-demo-store).
 */

function findProductionSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Ignorar directorios de fixtures y tests dedicados
      if (entry.name === "__fixtures__" || entry.name === "__tests__") {
        continue;
      }
      results = results.concat(findProductionSourceFiles(fullPath));
    } else if (entry.isFile()) {
      const isTypeScript = entry.name.endsWith(".ts") || entry.name.endsWith(".tsx");
      const isTestOrStory =
        entry.name.includes(".test.") ||
        entry.name.includes(".spec.") ||
        entry.name.includes(".stories.");

      if (isTypeScript && !isTestOrStory) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

describe("AUD-15: Auditoría Automatizada de Purga de Mocks en Producción", () => {
  const srcDir = path.resolve(__dirname, "../../");
  const productionFiles = findProductionSourceFiles(srcDir);

  test("Identifica y analiza los archivos fuente de producción en src/", () => {
    expect(productionFiles.length).toBeGreaterThan(50);
  });

  test("Ningún archivo de código de producción en src/ importa *.mock*, __fixtures__ ni *-demo-store", () => {
    const importRegex = /(?:import\s+(?:[\s\S]*?from\s+)?|export\s+(?:[\s\S]*?from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
    const forbiddenPatterns = [
      /\.mock(\.|$)/i,
      /__fixtures__/i,
      /-demo-store(\.|$)/i,
    ];

    const violations: { file: string; line: number; importPath: string; matchedPattern: string }[] = [];

    for (const filePath of productionFiles) {
      const relPath = path.relative(path.resolve(__dirname, "../../../"), filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        // Reiniciar regex para cada línea
        importRegex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = importRegex.exec(lineText)) !== null) {
          const importTarget = match[1];

          for (const pattern of forbiddenPatterns) {
            if (pattern.test(importTarget)) {
              violations.push({
                file: relPath,
                line: lineNum,
                importPath: importTarget,
                matchedPattern: pattern.toString(),
              });
            }
          }
        }
      });
    }

    if (violations.length > 0) {
      console.error("Infracciones AUD-15 detectadas:", violations);
    }

    expect(violations).toHaveLength(0);
  });
});
