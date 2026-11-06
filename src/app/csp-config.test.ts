import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("CSP de producción: Google Identity y restricciones conservadas", () => {
  test("la referencia Nginx conserva Report-Only y la misma excepción de estilos", () => {
    const fuente = readFileSync(path.join(process.cwd(), "docs/nginx-csp-polis.conf"), "utf8");
    const activas = fuente.split("\n").filter(linea => !linea.trim().startsWith("#"));
    const politica = activas.find(linea => linea.startsWith("add_header Content-Security-Policy-Report-Only "));
    expect(politica).toContain("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style;");
    expect(politica).not.toContain("'unsafe-eval'");
    expect(politica).toContain("object-src 'none'");
    expect(activas.some(linea => linea.startsWith("add_header Content-Security-Policy "))).toBe(false);
    expect(activas).toContain('add_header X-Frame-Options "DENY" always;');
  });

  test("permite la hoja oficial de Identity sin abrir estilos a cualquier origen", async () => {
    const entrada = `import config from ${JSON.stringify(path.join(process.cwd(), "next.config.ts"))}; console.log(JSON.stringify(await config.headers()));`;
    const reglas: Array<{ headers: Array<{ key: string; value: string }> }> = JSON.parse(execFileSync("bun", ["-e", entrada], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production", POLIS_CSP_REPORT_ONLY: "false" },
    }));
    const csp = reglas[0].headers.find(h => h.key === "Content-Security-Policy")?.value;
    expect(csp).toBeDefined();
    const estilos = csp!.split(";").find(d => d.trim().startsWith("style-src "));
    expect(estilos?.trim()).toBe("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("http://127.0.0.1");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});
