/**
 * Validación Automatizada de Seguridad, Móvil y Rendimiento [CIERRE-04]
 * 
 * Verificaciones:
 * 1. Cabeceras HTTP perimetrales y CSP en Frontend (Next.js) y Backend (FastAPI).
 * 2. Visualización móvil Playwright a 320px, 375px y 414px en:
 *    - / (Portada pública)
 *    - /geovisor (Geovisor distrital pantalla completa)
 *    - /plataforma/mesas (Gestión de mesas de trabajo)
 *    - /plataforma/formularios (Gestor de formularios)
 *    - /f/reporte-inseguridad (Formulario cívico ciudadano)
 *    Control de desbordes horizontales (scrollWidth <= innerWidth), ausencia de violaciones CSP.
 * 3. Benchmark de rendimiento de carga de /geovisor (TTFB, DCL, Load, Canvas render).
 * 
 * Genera evidencia en: docs/evidencia-cierre04-seguridad-movil.json
 */

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";

const TEST_FRONTEND_PORT = 3105;
const TEST_BACKEND_PORT = 8100;
const BASE_FRONTEND_URL = `http://127.0.0.1:${TEST_FRONTEND_PORT}`;
const BASE_BACKEND_URL = `http://127.0.0.1:${TEST_BACKEND_PORT}`;

const VIEWPORTS = [
  { nombre: "Móvil Compacto (320px)", width: 320, height: 568 },
  { nombre: "Móvil Estándar (375px)", width: 375, height: 667 },
  { nombre: "Móvil Plus (414px)", width: 414, height: 896 },
];

const RUTAS_A_EVALUAR = [
  { ruta: "/", nombre: "Portada Pública" },
  { ruta: "/geovisor", nombre: "Geovisor Distrital Fullscreen" },
  { ruta: "/barrio", nombre: "Modo Barrio (Bajo Consumo)" },
  { ruta: "/f/reporte-inseguridad", nombre: "Formulario Cívico de Seguridad" },
  { ruta: "/asistencia/mt-001", nombre: "Asistencia Cívica de Mesa (MT-001)" },
  { ruta: "/plataforma/mesas", nombre: "Mesas de Trabajo" },
  { ruta: "/plataforma/formularios", nombre: "Gestión de Formularios" },
];

function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: "HEAD" }, (res) => {
      resolve(res.headers);
    });
    req.on("error", reject);
    req.end();
  });
}

async function esperarServidor(url, timeoutMs = 25000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    try {
      await fetchHeaders(url);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`Timeout esperando servidor en ${url}`);
}

async function ejecutar() {
  console.log("==================================================================");
  console.log("INICIANDO VALIDACIÓN [CIERRE-04]: SEGURIDAD, MÓVIL Y RENDIMIENTO");
  console.log("==================================================================\n");

  const evidencia = {
    timestamp: new Date().toISOString(),
    tarea: "[CIERRE-04]",
    cabeceras_frontend: {},
    cabeceras_backend: {},
    pruebas_moviles: [],
    rendimiento_geovisor: {},
    resumen: { exitosas: 0, fallidas: 0, observaciones: [] },
  };

  // 1. Iniciar backend aislado en puerto 8100 y frontend standalone en 3105
  console.log(`[1/4] Arrancando backend aislado en puerto ${TEST_BACKEND_PORT} y frontend en ${TEST_FRONTEND_PORT}...`);
  const backendProc = spawn(
    "uv",
    [
      "run",
      "--project",
      "backend",
      "uvicorn",
      "app.main:app",
      "--app-dir",
      "backend",
      "--host",
      "127.0.0.1",
      "--port",
      String(TEST_BACKEND_PORT),
    ],
    {
      env: {
        ...process.env,
        PYTHONPATH: "backend",
        POLIS_JWT_SECRET_KEY: "a".repeat(32),
      },
      stdio: "ignore",
    }
  );

  const frontendProc = spawn("node", [".next/standalone/server.js"], {
    env: {
      ...process.env,
      PORT: String(TEST_FRONTEND_PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      POLIS_BACKEND_URL: `http://127.0.0.1:${TEST_BACKEND_PORT}`,
    },
    stdio: "ignore",
  });

  try {
    await Promise.all([
      esperarServidor(BASE_FRONTEND_URL),
      esperarServidor(`${BASE_BACKEND_URL}/api/v1/health/live`),
    ]);
    console.log(`✔ Frontend (:${TEST_FRONTEND_PORT}) y Backend (:${TEST_BACKEND_PORT}) activos.`);

    // 2. Validar Cabeceras de Seguridad Frontend
    console.log("\n[2/4] Auditando cabeceras perimetrales de Frontend y Backend...");
    const headersFront = await fetchHeaders(`${BASE_FRONTEND_URL}/`);
    evidencia.cabeceras_frontend = {
      "content-security-policy": headersFront["content-security-policy"] || null,
      "x-content-type-options": headersFront["x-content-type-options"] || null,
      "x-frame-options": headersFront["x-frame-options"] || null,
      "referrer-policy": headersFront["referrer-policy"] || null,
      "permissions-policy": headersFront["permissions-policy"] || null,
    };

    console.log("  Frontend CSP:", evidencia.cabeceras_frontend["content-security-policy"] ? "✔ Presente" : "❌ Ausente");
    console.log("  Frontend X-Content-Type-Options:", headersFront["x-content-type-options"] || "❌");
    console.log("  Frontend X-Frame-Options:", headersFront["x-frame-options"] || "❌");
    console.log("  Frontend Referrer-Policy:", headersFront["referrer-policy"] || "❌");
    console.log("  Frontend Permissions-Policy:", headersFront["permissions-policy"] || "❌");

    if (!headersFront["content-security-policy"]) {
      throw new Error("Fallo: Next.js no emitió Content-Security-Policy");
    }
    if (headersFront["x-frame-options"] !== "DENY") {
      throw new Error("Fallo: X-Frame-Options debe ser DENY");
    }
    evidencia.resumen.exitosas++;

    // Validar Cabeceras Backend
    const headersBack = await fetchHeaders(`${BASE_BACKEND_URL}/api/v1/health/live`);
    evidencia.cabeceras_backend = {
      "content-security-policy": headersBack["content-security-policy"] || null,
      "x-content-type-options": headersBack["x-content-type-options"] || null,
      "x-frame-options": headersBack["x-frame-options"] || null,
      "referrer-policy": headersBack["referrer-policy"] || null,
      "permissions-policy": headersBack["permissions-policy"] || null,
    };

    console.log("  Backend API CSP:", headersBack["content-security-policy"] || "❌");
    console.log("  Backend X-Content-Type-Options:", headersBack["x-content-type-options"] || "❌");
    console.log("  Backend X-Frame-Options:", headersBack["x-frame-options"] || "❌");
    console.log("  Backend Referrer-Policy:", headersBack["referrer-policy"] || "❌");
    console.log("  Backend Permissions-Policy:", headersBack["permissions-policy"] || "❌");

    if (!headersBack["content-security-policy"] || !headersBack["content-security-policy"].includes("default-src 'none'")) {
      throw new Error("Fallo: Backend API no emitió CSP restrictiva");
    }
    evidencia.resumen.exitosas++;

    // 3. Pruebas Móviles Playwright (320px, 375px, 414px)
    console.log("\n[3/4] Ejecutando pruebas Playwright móviles y detección de desbordes...");
    const browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      console.log(`\n  --- Evaluando resolución: ${vp.nombre} (${vp.width}x${vp.height}) ---`);

      for (const item of RUTAS_A_EVALUAR) {
        const url = `${BASE_FRONTEND_URL}${item.ruta}`;
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();

        const violacionesCsp = [];
        const erroresConsola = [];

        page.on("console", (msg) => {
          const texto = msg.text();
          if (texto.includes("Content Security Policy") || texto.includes("CSP")) {
            violacionesCsp.push(texto);
          } else if (msg.type() === "error") {
            erroresConsola.push(texto);
          }
        });

        page.on("pageerror", (err) => {
          erroresConsola.push(err.message);
        });

        const inicioCarga = Date.now();
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
        const tiempoCargaMs = Date.now() - inicioCarga;
        const statusCode = resp ? resp.status() : 0;

        // Comprobación de desbordamiento horizontal: scrollWidth vs viewport esperado
        const metricasOverflow = await page.evaluate((anchoEsperado) => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
          const clientWidth = docEl.clientWidth;
          const windowWidth = window.innerWidth;
          const hayDesborde = scrollWidth > anchoEsperado + 1; // 1px de tolerancia por subpixel rendering

          // Encontrar elementos que desbordan si hay desborde
          let desbordantes = [];
          if (hayDesborde) {
            const todos = document.querySelectorAll("*");
            for (const el of todos) {
              const rect = el.getBoundingClientRect();
              if (rect.right > anchoEsperado + 2) {
                desbordantes.push({
                  tag: el.tagName,
                  className: typeof el.className === "string" ? el.className.slice(0, 60) : "",
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                });
                if (desbordantes.length >= 3) break;
              }
            }
          }

          // Verificar presencia de botones y controles interactivos
          const botones = document.querySelectorAll("button, a, input, select");
          return {
            scrollWidth,
            clientWidth,
            windowWidth,
            hayDesborde,
            desbordantes,
            controlesTotales: botones.length,
          };
        }, vp.width);

        const exito = statusCode === 200 && !metricasOverflow.hayDesborde && violacionesCsp.length === 0;

        const resultadoPrueba = {
          viewport: vp.nombre,
          resolucion: `${vp.width}x${vp.height}`,
          ruta: item.ruta,
          nombre: item.nombre,
          statusCode,
          tiempoCargaMs,
          desbordeHorizontal: metricasOverflow.hayDesborde,
          scrollWidth: metricasOverflow.scrollWidth,
          windowWidth: metricasOverflow.windowWidth,
          elementosDesbordantes: metricasOverflow.desbordantes,
          violacionesCsp,
          erroresConsola: erroresConsola.slice(0, 3),
          exito,
        };

        evidencia.pruebas_moviles.push(resultadoPrueba);

        if (exito) {
          console.log(`    ✔ [PASS] ${item.nombre.padEnd(35)} | HTTP ${statusCode} | ${tiempoCargaMs}ms | Overflow: NO (scrollWidth=${metricasOverflow.scrollWidth}px <= ${vp.width}px) | CSP: 0 violaciones`);
          evidencia.resumen.exitosas++;
        } else {
          console.log(`    ❌ [FAIL] ${item.nombre.padEnd(35)} | HTTP ${statusCode} | Overflow: ${metricasOverflow.hayDesborde ? "SÍ" : "NO"} | CSP violaciones: ${violacionesCsp.length}`);
          if (metricasOverflow.desbordantes.length > 0) {
            console.log(`       Elementos desbordantes:`, metricasOverflow.desbordantes);
          }
          if (violacionesCsp.length > 0) {
            console.log(`       Violaciones CSP:`, violacionesCsp);
          }
          evidencia.resumen.fallidas++;
        }

        await context.close();
      }
    }

    // 4. Medición de Rendimiento Específica de /geovisor
    console.log("\n[4/4] Midiendo rendimiento de carga de /geovisor (3 corridas)...");
    const corridas = [];
    for (let i = 1; i <= 3; i++) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();

      const inicio = Date.now();
      await page.goto(`${BASE_FRONTEND_URL}/geovisor`, { waitUntil: "networkidle" });
      const duracionTotal = Date.now() - inicio;

      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        if (!nav) return { ttfb: 0, dcl: 0, load: 0 };
        return {
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          dcl: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          load: Math.round(nav.loadEventEnd - nav.startTime),
        };
      });

      // Verificar que el canvas OpenLayers se haya instanciado
      const mapaInstanciado = await page.evaluate(() => {
        return !!document.querySelector(".ol-viewport") || !!document.querySelector("canvas");
      });

      corridas.push({
        corrida: i,
        duracionTotalMs: duracionTotal,
        ttfbMs: timing.ttfb,
        dclMs: timing.dcl,
        loadMs: timing.load,
        mapaInstanciado,
      });

      console.log(`  Corrida ${i}: Total=${duracionTotal}ms | TTFB=${timing.ttfb}ms | DCL=${timing.dcl}ms | Load=${timing.load}ms | Mapa Canvas=${mapaInstanciado ? "✔" : "❌"}`);
      await context.close();
    }

    await browser.close();

    const avgTotal = Math.round(corridas.reduce((acc, c) => acc + c.duracionTotalMs, 0) / corridas.length);
    const avgTTFB = Math.round(corridas.reduce((acc, c) => acc + c.ttfbMs, 0) / corridas.length);
    const avgDCL = Math.round(corridas.reduce((acc, c) => acc + c.dclMs, 0) / corridas.length);
    const avgLoad = Math.round(corridas.reduce((acc, c) => acc + c.loadMs, 0) / corridas.length);

    evidencia.rendimiento_geovisor = {
      corridas,
      promedios: {
        duracionTotalMs: avgTotal,
        ttfbMs: avgTTFB,
        dclMs: avgDCL,
        loadMs: avgLoad,
      },
    };

    console.log(`\nPromedios /geovisor: Total=${avgTotal}ms | TTFB=${avgTTFB}ms | DCL=${avgDCL}ms | Load=${avgLoad}ms`);

    // Escribir archivo de evidencias
    fs.writeFileSync(
      "docs/evidencia-cierre04-seguridad-movil.json",
      JSON.stringify(evidencia, null, 2),
      "utf8"
    );
    console.log("\n✔ Evidencia guardada en docs/evidencia-cierre04-seguridad-movil.json");

    console.log("\n==================================================================");
    console.log(`RESULTADO FINAL: ${evidencia.resumen.exitosas} pruebas exitosas, ${evidencia.resumen.fallidas} fallidas.`);
    console.log("==================================================================");

    if (evidencia.resumen.fallidas > 0) {
      process.exitCode = 1;
    }
  } finally {
    frontendProc.kill("SIGTERM");
    backendProc.kill("SIGTERM");
  }
}

ejecutar().catch((err) => {
  console.error("Error fatal en la ejecución:", err);
  process.exit(1);
});
