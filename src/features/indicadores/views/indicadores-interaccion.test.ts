import { describe, test, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import type { CatalogoIndicador, CatalogoIndicadoresRespuesta } from "../services/indicadores-catalogo-api";

interface BunBuildArtifact {
  text: () => Promise<string>;
  path?: string;
  size?: number;
  kind?: "entry-point" | "chunk" | "asset" | "sourcemap" | "bytecode";
  loader?: string;
  hash?: string | null;
}

interface BunBuildOutput {
  success: boolean;
  logs: unknown[];
  outputs: BunBuildArtifact[];
}

declare const Bun: {
  write: (path: string, data: string) => Promise<number>;
  build: (options: {
    entrypoints: string[];
    target?: string;
    define?: Record<string, string>;
    outdir?: string;
    minify?: boolean;
    sourcemap?: "none" | "inline" | "external";
  }) => Promise<BunBuildOutput>;
};

describe("Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06]", () => {
  let server: http.Server;
  let serverUrl: string;
  let browser: Browser;
  let page: Page;
  let bundleJs: string = "";
  let modoServidor: "ok" | "error" = "ok";
  const peticionesRecibidas: Array<{ url: string; time: number }> = [];

  const mockIndicadores: CatalogoIndicador[] = [
    {
      codigo: "PERS_001",
      nombre: "Tasa de homicidios intencionales por 100.000 habitantes",
      dimension: "PERS",
      definicion: "Número de homicidios intencionales registrados en el año por cada 100.000 habitantes.",
      formula: "Valor original publicado: dnp_terridata_13001.homicidio_intencional_tasa; no se recalcula.",
      numerador: "Homicidios intencionales registrados en TerriData",
      denominador: "Población total municipal proyectada",
      unidad: "Tasa por 100.000 habitantes",
      tipo_territorio_fuente: "Municipal",
      periodicidad: "Anual",
      tipo_periodo: "Año calendario",
      fuente: "DNP - TerriData con base en Policía Nacional",
      url_fuente: "https://terridata.dnp.gov.co",
      custodio: "DNP - Dirección de Desarrollo Territorial",
      licencia: "publica_pendiente_verificacion",
      anio_base: "2025",
      interpretacion: "Describe la evolución de la violencia homicida en el municipio.",
      riesgo_metodologico: "La tasa procede del repositorio oficial.",
      tier: "A",
      estado: "no_publicable",
    },
    {
      codigo: "COM_001",
      nombre: "Tasa de violencia intrafamiliar por 100.000 habitantes",
      dimension: "COM",
      definicion: "Casos de violencia intrafamiliar por 100.000 habitantes.",
      formula: "Valor original publicado: dnp_terridata_13001.violencia_intrafamiliar_tasa; no se recalcula.",
      numerador: "Casos reportados",
      denominador: "Población total",
      unidad: "Tasa por 100.000 habitantes",
      tipo_territorio_fuente: "Municipal",
      periodicidad: "Anual",
      tipo_periodo: "Año calendario",
      fuente: "DNP - TerriData",
      url_fuente: "https://terridata.dnp.gov.co",
      custodio: "DNP",
      licencia: "publica_pendiente_verificacion",
      anio_base: "2025",
      interpretacion: "Describe la violencia doméstica.",
      riesgo_metodologico: "Sujeto a denuncia.",
      tier: "A",
      estado: "no_publicable",
    },
    {
      codigo: "POL_003",
      nombre: "Mecanismos comunitarios de alerta no certificados",
      dimension: "POL",
      definicion: "Indicador exploratorio de alertas tempranas no incorporado al banco oficial.",
      formula: "Alertas_Registradas / Total_Zonas",
      numerador: "Alertas comunitarias",
      denominador: "Zonas priorizadas",
      unidad: "Conteo",
      tipo_territorio_fuente: "Barrial",
      periodicidad: "Mensual",
      tipo_periodo: "Mes",
      fuente: "Comité Local",
      url_fuente: "NO_VERIFICADO",
      custodio: "Comunidad",
      licencia: "Sin licencia",
      anio_base: "2026",
      interpretacion: "Monitoreo exploratorio.",
      riesgo_metodologico: "Sin fuente verificada.",
      tier: "C",
      estado: "no_publicable",
    },
  ];

  beforeAll(async () => {
    // 1. Compilar entrada React real con Bun.build
    const entryCode = `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
      import { IndicadoresCatalogoView } from "../../src/features/indicadores/views/indicadores-catalogo-view";

      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const root = document.getElementById("root");
      if (root) {
        createRoot(root).render(
          React.createElement(QueryClientProvider, { client },
            React.createElement("main", null, React.createElement(IndicadoresCatalogoView))
          )
        );
      }
    `;

    const tempEntry = path.join(process.cwd(), "node_modules/.cache/entry_indicadores_test.tsx");
    await Bun.write(tempEntry, entryCode);

    const build = await Bun.build({
      entrypoints: [tempEntry],
      target: "browser",
      define: { "process.env.NODE_ENV": JSON.stringify("development") },
    });

    if (!build.success) {
      throw new Error(`Fallo compilando entry de prueba: ${build.logs.join("\n")}`);
    }
    if (build.outputs.length === 0) {
      throw new Error("Bun.build no generó salidas para entry_indicadores_test.tsx");
    }

    bundleJs = await build.outputs[0].text();
    fs.unlinkSync(tempEntry);

    // 2. Servidor HTTP local efímero
    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/api/v1/indicadores/catalogo") {
        peticionesRecibidas.push({ url: url.pathname + url.search, time: Date.now() });

        if (modoServidor === "error") {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ detail: "Fallo simulado 503 para QA297" }));
          return;
        }

        const dimension = url.searchParams.get("dimension");
        const tier = url.searchParams.get("tier");
        const busqueda = (url.searchParams.get("busqueda") || "").toLowerCase().trim();

        const filtrados = mockIndicadores.filter((ind) => {
          if (dimension && dimension !== "todas" && ind.dimension !== dimension) return false;
          if (tier && tier !== "todos" && ind.tier !== tier) return false;
          if (busqueda) {
            const contenido = Object.values(ind).join(" ").toLowerCase();
            if (!contenido.includes(busqueda)) return false;
          }
          return true;
        });

        const respuesta: CatalogoIndicadoresRespuesta = {
          total: filtrados.length,
          archivo_sha256: "mock_sha256_interaccion",
          indicadores: filtrados,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(respuesta));
        return;
      }

      if (url.pathname === "/bundle.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(bundleJs);
        return;
      }

      // HTML host
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Catálogo municipal de indicadores — POLIS</title>
</head>
<body>
  <div id="root"></div>
  <script>globalThis.process = { env: { NODE_ENV: "development" } };</script>
  <script src="/bundle.js"></script>
</body>
</html>`);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const addr = server.address();
    const port = typeof addr === "object" && addr !== null ? addr.port : 0;
    serverUrl = `http://127.0.0.1:${port}`;

    // 3. Lanzar Chromium headless
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });

  test("1. (H297-05) Render real en navegador: cero nodos tbody > div", async () => {
    await page.goto(serverUrl);
    await page.getByRole("button", { name: "Ver metodología del indicador PERS_001" }).waitFor();

    const divCount = await page.locator("tbody > div").count();
    expect(divCount).toBe(0);

    const rowCount = await page.locator("tbody tr").count();
    expect(rowCount).toBe(3);
  });

  test("2. (O297-02) Expansión y colapso interactivo con clic de ratón", async () => {
    const btnExpandir = page.getByRole("button", { name: "Ver metodología del indicador PERS_001", exact: true });
    expect(await btnExpandir.isVisible()).toBe(true);

    // Expande
    await btnExpandir.click();

    const detalleRow = page.locator("#metodologia-fila-PERS_001");
    await page.waitForFunction(() => document.getElementById("metodologia-fila-PERS_001") !== null);
    expect(await detalleRow.isVisible()).toBe(true);

    const btnColapsar = page.getByRole("button", { name: "Ocultar metodología del indicador PERS_001", exact: true });
    expect(await btnColapsar.isVisible()).toBe(true);
    expect(await btnColapsar.getAttribute("aria-expanded")).toBe("true");

    // Verifica que la metodología se visualice
    expect(await page.getByText("Valor original publicado: dnp_terridata_13001.homicidio_intencional_tasa; no se recalcula.").isVisible()).toBe(true);

    // Colapsa
    await btnColapsar.click();
    await page.waitForFunction(() => document.getElementById("metodologia-fila-PERS_001") === null);
    expect(await detalleRow.count()).toBe(0);
    expect(await btnExpandir.getAttribute("aria-expanded")).toBe("false");
  });

  test("3. (O297-02) Expansión y colapso interactivo con teclado (Enter y Espacio)", async () => {
    const btnMetodologia = page.getByRole("button", { name: /^(Ver|Ocultar) metodología del indicador PERS_001$/ });
    await btnMetodologia.focus();

    // Accionar con tecla Enter
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.getElementById("metodologia-fila-PERS_001") !== null);
    const detalleRow = page.locator("#metodologia-fila-PERS_001");
    expect(await detalleRow.isVisible()).toBe(true);
    expect(await btnMetodologia.getAttribute("aria-expanded")).toBe("true");

    // Accionar con tecla Espacio
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.getElementById("metodologia-fila-PERS_001") === null);
    expect(await detalleRow.count()).toBe(0);
    expect(await btnMetodologia.getAttribute("aria-expanded")).toBe("false");
  });

  test("4. (O297-02) Filtrado interactivo por Tier y Dimensión", async () => {
    // Filtrar por Tier C
    await page.getByRole("combobox", { name: "Filtrar por nivel Tier" }).click();
    await page.getByRole("option", { name: "Tier C — Sin fuente", exact: true }).click();

    await page.waitForFunction(() => {
      const tbody = document.querySelector("tbody");
      return tbody && tbody.innerText.includes("POL_003") && !tbody.innerText.includes("PERS_001");
    });

    const codigosTierC = await page.locator("tbody").innerText();
    expect(codigosTierC).toContain("POL_003");
    expect(codigosTierC).not.toContain("PERS_001");

    // Verificar que Tier C no tiene enlace interactivo
    const enlacesTierC = await page.locator("tbody a").count();
    expect(enlacesTierC).toBe(0);

    // Filtrar por Tier B (estado vacío con role="status")
    await page.getByRole("combobox", { name: "Filtrar por nivel Tier" }).click();
    await page.getByRole("option", { name: "Tier B — Pública", exact: true }).click();

    await page.getByText("Sin resultados en el catálogo para los filtros seleccionados").waitFor();
    const emptyStatus = page.locator('section[aria-labelledby="tabla-catalogo"] div[role="status"]');
    expect(await emptyStatus.isVisible()).toBe(true);

    // Restablecer filtros
    await page.getByRole("button", { name: "Restablecer filtros", exact: true }).click();
    await page.getByRole("button", { name: "Ver metodología del indicador PERS_001" }).waitFor();

    // Filtrar por Dimensión COM
    await page.getByRole("combobox", { name: "Filtrar por dimensión" }).click();
    await page.getByRole("option", { name: "COM — Convivencia y comunitaria", exact: true }).click();

    await page.waitForFunction(() => {
      const tbody = document.querySelector("tbody");
      return tbody && tbody.innerText.includes("COM_001") && !tbody.innerText.includes("PERS_001");
    });

    const codigosCOM = await page.locator("tbody").innerText();
    expect(codigosCOM).toContain("COM_001");
    expect(codigosCOM).not.toContain("PERS_001");

    // Restablecer filtros
    await page.getByRole("button", { name: "Restablecer filtros", exact: true }).click();
    await page.getByRole("button", { name: "Ver metodología del indicador PERS_001" }).waitFor();
  });

  test("5. (O297-02) Búsqueda con debounce: 0 peticiones durante tecleo y 1 petición tras 300 ms", async () => {
    const input = page.getByRole("textbox", { name: "Buscar por nombre, fórmula, fuente o custodio en el catálogo de indicadores" });
    const countAntes = peticionesRecibidas.length;

    // Escribir 9 caracteres rápidamente (delay de 15ms entre pulsaciones)
    await input.pressSequentially("homicidio", { delay: 15 });
    const peticionesInmediatas = peticionesRecibidas.length - countAntes;

    // Durante el tecleo activo (menos de 300ms entre letras), no debe dispararse la búsqueda
    expect(peticionesInmediatas).toBe(0);

    // Esperar a que se cumpla el debounce (300ms) y la tabla se actualice
    await page.waitForFunction(() => {
      const tbody = document.querySelector("tbody");
      return tbody && tbody.innerText.includes("PERS_001") && !tbody.innerText.includes("COM_001");
    }, { timeout: 4000 });

    const peticionesDespues = peticionesRecibidas.length - countAntes;
    expect(peticionesDespues).toBe(1);

    // Limpiar búsqueda con el botón accesible
    await page.getByRole("button", { name: "Limpiar término de búsqueda" }).click();
    await page.waitForFunction(() => {
      const tbody = document.querySelector("tbody");
      return tbody && tbody.innerText.includes("COM_001");
    }, { timeout: 4000 });
  });

  test("6. (H297-06) Estado de error 503: role='alert', anuncio y sin atasco en 'Consultando catálogo…'", async () => {
    modoServidor = "error";

    const input = page.getByRole("textbox", { name: "Buscar por nombre, fórmula, fuente o custodio en el catálogo de indicadores" });
    await input.fill("provocar-error-503");

    // Esperar que aparezca el contenedor de alerta (tras debounce + reintentos de React Query)
    await page.waitForSelector('[role="alert"]', { timeout: 12000 });

    // Debe contener una región de alerta
    const alertas = await page.getByRole("alert").count();
    expect(alertas).toBe(1);

    // El contador de estado NO debe decir "Consultando catálogo…"
    const textoConsultando = await page.getByText("Consultando catálogo…").count();
    expect(textoConsultando).toBe(0);

    // El contador debe mostrar el estado final coherente
    const textoError = await page.getByText("No fue posible cargar el catálogo").count();
    expect(textoError).toBeGreaterThan(0);

    // Restaurar servidor a modo ok
    modoServidor = "ok";
  }, 15000);

  test("7. (O297-02, H297-05) Auditoría axe-core: cero violaciones serious o critical en tabla y detalle abierto", async () => {
    // Carga limpia de la página con servidor en modo ok
    modoServidor = "ok";
    await page.goto(serverUrl);
    await page.getByRole("button", { name: "Ver metodología del indicador PERS_001" }).waitFor();

    // Abrir la metodología de PERS_001 para auditar el detalle exhaustivo
    const btnExpandir = page.getByRole("button", { name: /^(Ver|Ocultar) metodología del indicador PERS_001$/ });
    await btnExpandir.click();
    await page.waitForFunction(() => document.getElementById("metodologia-fila-PERS_001") !== null);

    // Inyectar axe-core
    const axeSource = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
    await page.evaluate(axeSource);

    const resultadosAxe = await page.evaluate(async () => {
      const win = window as unknown as {
        axe: {
          run: (el: Document) => Promise<{
            violations: Array<{ id: string; impact?: string; description: string; nodes: unknown[] }>;
            passes: unknown[];
          }>;
        };
      };
      const r = await win.axe.run(document);
      return {
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        })),
        passes: r.passes.length,
      };
    });

    const seriousOrCritical = resultadosAxe.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    // Debe haber CERO violaciones serious o critical
    expect(seriousOrCritical).toHaveLength(0);

    // Las violaciones previas de definition-list y dlitem deben estar completamente erradicadas (0)
    const violacionesDl = resultadosAxe.violations.filter(
      (v) => v.id === "definition-list" || v.id === "dlitem",
    );
    expect(violacionesDl).toHaveLength(0);

    expect(resultadosAxe.passes).toBeGreaterThan(20);
  }, 15000);
});
