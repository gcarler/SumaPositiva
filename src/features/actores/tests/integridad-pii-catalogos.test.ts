import { describe, expect, test } from "vitest";
import * as fs from "fs";
import * as path from "path";

function findDataFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findDataFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".data.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("AUD-14: Auditoría Pericial de Integridad y Salvaguarda de Datos Personales (PII) en Catálogos", () => {
  const rootDir = path.resolve(__dirname, "../../../");
  const dataFiles = findDataFiles(rootDir);

  test("Identifica y analiza todos los archivos *.data.ts del frontend", () => {
    expect(dataFiles.length).toBeGreaterThanOrEqual(15);
  });

  test("Ningún archivo *.data.ts contiene patrones de PII (telefono, email, +57, correos personales o institucionales)", () => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const violations: { file: string; line: number; text: string; reason: string }[] = [];

    for (const filePath of dataFiles) {
      const relPath = path.relative(path.resolve(__dirname, "../../../../"), filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // 1. Check for 'telefono' pattern
        if (/\btelefono\b/i.test(trimmed)) {
          violations.push({
            file: relPath,
            line: lineNum,
            text: trimmed,
            reason: "Contiene patrón 'telefono'",
          });
        }

        // 2. Check for 'email' pattern
        if (/\bemail\b/i.test(trimmed)) {
          violations.push({
            file: relPath,
            line: lineNum,
            text: trimmed,
            reason: "Contiene patrón 'email'",
          });
        }

        // 3. Check for '+57' pattern
        if (trimmed.includes("+57")) {
          violations.push({
            file: relPath,
            line: lineNum,
            text: trimmed,
            reason: "Contiene prefijo telefónico '+57'",
          });
        }

        // 4. Check for email addresses or stray '@' (excluding Next.js path aliases '@/')
        if (emailRegex.test(trimmed)) {
          violations.push({
            file: relPath,
            line: lineNum,
            text: trimmed,
            reason: "Contiene dirección de correo electrónico",
          });
        } else if (trimmed.includes("@") && !trimmed.includes("@/") && !trimmed.includes('"@/') && !trimmed.includes("'@/")) {
          violations.push({
            file: relPath,
            line: lineNum,
            text: trimmed,
            reason: "Contiene carácter '@' ajeno a alias de módulos",
          });
        }
      });
    }

    if (violations.length > 0) {
      console.error("Infracciones de PII detectadas en catálogos:", violations);
    }

    expect(violations).toHaveLength(0);
  });
});
