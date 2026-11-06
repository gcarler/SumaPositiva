import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

describe("CSP de producción: Google Identity y restricciones conservadas", () => {
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
