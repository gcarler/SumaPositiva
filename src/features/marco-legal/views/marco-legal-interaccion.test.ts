import { afterAll, beforeAll, describe, expect, test } from "vitest";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import type { AxeResults } from "axe-core";

declare global {
  interface Window {
    axe: { run: (contexto: Document) => Promise<AxeResults> };
  }
}

declare const Bun: {
  build: (opciones: { entrypoints: string[]; target: string; define: Record<string, string> }) => Promise<{
    success: boolean; logs: unknown[]; outputs: Array<{ text: () => Promise<string> }>;
  }>;
};

describe("Marco legal: interacción real, anclas y accesibilidad (303)", () => {
  let servidor: http.Server;
  let navegador: Browser;
  let pagina: Page;
  let origen: string;

  beforeAll(async () => {
    const raiz = process.cwd();
    const entrada = path.join(raiz, `node_modules/.cache/marco_303_${process.pid}.tsx`);
    const vista = path.join(raiz, "src/features/marco-legal/views/marco-legal-view.tsx");
    fs.mkdirSync(path.dirname(entrada), { recursive: true });
    fs.writeFileSync(entrada, `import React from "react";
import {createRoot} from "react-dom/client";
import {MarcoLegalView} from ${JSON.stringify(vista)};
createRoot(document.getElementById("root")).render(React.createElement(MarcoLegalView));`);
    let js: string;
    try {
      const resultado = await Bun.build({
        entrypoints: [entrada], target: "browser",
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
      });
      if (!resultado.success || !resultado.outputs.length) throw new Error(String(resultado.logs));
      js = await resultado.outputs[0].text();
    } finally {
      fs.rmSync(entrada, { force: true });
    }
    servidor = http.createServer((peticion, respuesta) => {
      if (peticion.url === "/bundle.js") {
        respuesta.writeHead(200, { "Content-Type": "application/javascript" });
        respuesta.end(js);
        return;
      }
      respuesta.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      respuesta.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Marco legal: laboratorio 303</title></head><body><div id="root"></div><script>globalThis.process={env:{NODE_ENV:"development"}};</script><script src="/bundle.js"></script></body></html>`);
    });
    await new Promise<void>(resolve => servidor.listen(0, "127.0.0.1", resolve));
    const direccion = servidor.address();
    if (!direccion || typeof direccion === "string") throw new Error("Falta puerto del laboratorio");
    origen = `http://127.0.0.1:${direccion.port}`;
    navegador = await chromium.launch({ headless: true });
    pagina = await navegador.newPage({ reducedMotion: "reduce" });
  });

  afterAll(async () => {
    if (navegador) await navegador.close();
    if (servidor) await new Promise<void>(resolve => servidor.close(() => resolve()));
  });

  test("todos los controles ARIA resuelven a un panel y los ID son únicos", async () => {
    await pagina.goto(origen);
    await pagina.getByRole("tab").first().waitFor();
    const estructura = await pagina.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("[id]"), el => el.id);
      return {
        duplicados: ids.filter((id, i) => ids.indexOf(id) !== i),
        controlesValidos: Array.from(document.querySelectorAll("[role=tab]"), el =>
          Boolean(document.getElementById(el.getAttribute("aria-controls") ?? ""))),
      };
    });
    expect(estructura.duplicados).toEqual([]);
    expect(estructura.controlesValidos).toEqual([true, true, true]);
  });

  test("las flechas, Home y End actualizan selección y foco", async () => {
    await pagina.goto(origen);
    const tabs = pagina.getByRole("tab");
    await tabs.first().focus();
    for (const [tecla, indice] of [["ArrowRight", 1], ["End", 2], ["ArrowRight", 0], ["Home", 0], ["ArrowLeft", 2]] as const) {
      await pagina.keyboard.press(tecla);
      await pagina.waitForFunction(i => document.querySelectorAll("[role=tab]")[i]?.getAttribute("aria-selected") === "true", indice);
      expect(await tabs.nth(indice).evaluate(el => el === document.activeElement)).toBe(true);
      expect(await tabs.nth(indice).getAttribute("tabindex")).toBe("0");
    }
  });

  test("filtra los dos marcos sin mezclar las secciones", async () => {
    await pagina.goto(origen);
    await pagina.getByRole("tab").nth(1).click();
    await pagina.locator("#distrital").waitFor();
    expect(await pagina.locator("#fe-publica").count()).toBe(0);
    await pagina.getByRole("tab").nth(2).click();
    await pagina.locator("#fe-publica").waitFor();
    expect(await pagina.locator("#distrital").count()).toBe(0);
  });

  test("un hash cambia al marco que contiene el destino", async () => {
    await pagina.goto(origen);
    await pagina.getByRole("tab").nth(2).click();
    await pagina.evaluate(() => { window.location.hash = "distrital"; });
    await pagina.locator("#distrital").waitFor();
    expect(await pagina.locator("#distrital").count()).toBe(1);
    await pagina.evaluate(() => { window.location.hash = "datos-privacidad"; });
    await pagina.locator("#datos-privacidad").waitFor();
    expect(await pagina.getByRole("tab").nth(2).getAttribute("aria-selected")).toBe("true");
  });

  test("la recarga directa conserva el destino histórico distrital", async () => {
    await pagina.goto(`${origen}/#distrital`);
    await pagina.locator("#distrital").waitFor();
    await pagina.reload();
    await pagina.locator("#distrital").waitFor();
    expect(new URL(pagina.url()).hash).toBe("#distrital");
    expect(await pagina.locator("#distrital").count()).toBe(1);
  });

  test("el desplazamiento respeta movimiento reducido", async () => {
    const reducida = await navegador.newPage({ reducedMotion: "reduce" });
    try {
      await reducida.addInitScript(() => {
        Element.prototype.scrollIntoView = function (opciones) {
          sessionStorage.setItem("scroll_303", typeof opciones === "object" ? String(opciones.behavior) : "sin_opciones");
        };
      });
      await reducida.goto(`${origen}/#distrital`);
      await reducida.waitForFunction(() => sessionStorage.getItem("scroll_303") !== null);
      expect(await reducida.evaluate(() => sessionStorage.getItem("scroll_303"))).toBe("auto");
    } finally {
      await reducida.close();
    }
  });

  test("el enlace histórico de plataforma selecciona su marco y apunta al contenido", async () => {
    await pagina.goto(`${origen}/#plataforma`);
    await pagina.waitForFunction(() => document.querySelectorAll("[role=tab]")[2]?.getAttribute("aria-selected") === "true");
    expect(await pagina.locator("#distrital").count()).toBe(0);
    expect(await pagina.locator("#fe-publica #plataforma").count()).toBe(1);
    await pagina.reload();
    await pagina.waitForFunction(() => document.querySelectorAll("[role=tab]")[2]?.getAttribute("aria-selected") === "true");
    expect(new URL(pagina.url()).hash).toBe("#plataforma");
  });

  test.each([0, 1, 2])("axe no detecta infracciones graves en el marco %i", async indice => {
    await pagina.goto(origen);
    await pagina.getByRole("tab").first().waitFor();
    await pagina.addScriptTag({ path: path.join(process.cwd(), "node_modules/axe-core/axe.min.js") });
    await pagina.getByRole("tab").nth(indice).click();
    const violaciones = await pagina.evaluate(async () => {
      const resultado = await window.axe.run(document);
      return resultado.violations.map(v => ({ id: v.id, impact: v.impact }));
    });
    expect(violaciones.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
  });
});
