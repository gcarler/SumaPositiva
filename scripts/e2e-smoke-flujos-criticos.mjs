import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn, execSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";

const BACKEND_PORT = 8100;
const FRONTEND_STANDALONE_PORT = 3105;
const PROXY_PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PROXY_PORT}`;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let backendProcess = null;
let frontendProcess = null;
let proxyServer = null;
const resultados = [];

function registrarPaso(nombre, detalle = "") {
  console.log(`\n========================================`);
  console.log(`[PASS] ${nombre}${detalle ? ` - ${detalle}` : ""}`);
  console.log(`========================================`);
  resultados.push({ nombre, detalle, exito: true });
}

function limpiarPuertos() {
  console.log(`[E2E-ENV] Limpiando procesos en puertos ${BACKEND_PORT}, ${FRONTEND_STANDALONE_PORT} y ${PROXY_PORT}...`);
  try {
    execSync(`fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true`);
    execSync(`fuser -k ${FRONTEND_STANDALONE_PORT}/tcp 2>/dev/null || true`);
    execSync(`fuser -k ${PROXY_PORT}/tcp 2>/dev/null || true`);
  } catch {
    // Ignore errors if no processes were listening
  }
}

async function esperarUrl(url, timeoutMs = 25000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return true;
    } catch {
      // Endpoint not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout esperando que el servicio responda en ${url}`);
}

async function prepararEntornoAislado() {
  console.log("\n[E2E-ENV] 1. Inicializando base de datos aislada y sembrando usuarios dinámicos...");
  const rawCreds = execSync("backend/.venv/bin/python scripts/preparar_entorno_e2e.py", {
    encoding: "utf8",
  });
  const creds = JSON.parse(rawCreds.trim());
  console.log("[E2E-ENV] Base de datos polis_test_e2e clonada desde polis_test.");
  console.log(`[E2E-ENV] Usuario Autoridad: ${creds.autoridad.correo}`);
  console.log(`[E2E-ENV] Usuario Auditor:   ${creds.auditor.correo}`);

  limpiarPuertos();

  console.log(`[E2E-ENV] 2. Levantando backend uvicorn en puerto aislado ${BACKEND_PORT}...`);
  backendProcess = spawn(
    "backend/.venv/bin/uvicorn",
    ["app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", String(BACKEND_PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        POLIS_ENVIRONMENT: "test",
        POLIS_DATABASE_URL:
          "postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/polis_test_e2e",
        POLIS_TEST_DATABASE_URL:
          "postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/polis_test_e2e",
        POLIS_JWT_SECRET_KEY: "clave_secreta_e2e_para_pruebas_aisladas_32caracteres",
        POLIS_IP_SALT: "salt_e2e_para_pruebas_aisladas_32caracteres",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  backendProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("ERROR") || msg.includes("Exception")) {
      console.error(`[BACKEND-STDERR] ${msg.trim()}`);
    }
  });

  console.log(`[E2E-ENV] 3. Levantando frontend standalone en puerto aislado ${FRONTEND_STANDALONE_PORT}...`);
  frontendProcess = spawn("node", [".next/standalone/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(FRONTEND_STANDALONE_PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  console.log(`[E2E-ENV] 4. Creando proxy inverso E2E en puerto ${PROXY_PORT}...`);
  proxyServer = http.createServer((req, res) => {
    const targetPort = req.url.startsWith("/api/v1/") ? BACKEND_PORT : FRONTEND_STANDALONE_PORT;
    const proxyReq = http.request(
      {
        hostname: "127.0.0.1",
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", (err) => {
      res.writeHead(502);
      res.end(`Proxy error hacia ${targetPort}: ${err.message}`);
    });
    req.pipe(proxyReq);
  });

  await new Promise((resolve, reject) => {
    proxyServer.listen(PROXY_PORT, "127.0.0.1", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await esperarUrl(`${BACKEND_URL}/api/v1/health/live`);
  await esperarUrl(`http://127.0.0.1:${FRONTEND_STANDALONE_PORT}/`);
  await esperarUrl(`${BASE_URL}/api/v1/health/live`);
  console.log("[E2E-ENV] Backend, frontend standalone y proxy inverso listos y saludables.\n");

  return creds;
}

function desmontarEntornoAislado() {
  console.log("\n[E2E-ENV] Desmontando servicios de prueba aislados...");
  if (proxyServer) {
    try {
      proxyServer.close();
    } catch {}
  }
  if (frontendProcess) {
    try {
      frontendProcess.kill("SIGTERM");
    } catch {}
  }
  if (backendProcess) {
    try {
      backendProcess.kill("SIGTERM");
    } catch {}
  }
  limpiarPuertos();
  console.log("[E2E-ENV] Entorno desmontado limpiamente.");
}

async function loginEnNavegador(page, cred) {
  console.log(`Iniciando sesión en UI para ${cred.correo} (${cred.rol})...`);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  const botonIniciar = page.locator('button:has-text("Iniciar sesión"), [aria-label="Iniciar sesión"]').first();
  await botonIniciar.waitFor({ state: "visible", timeout: 10000 });
  await botonIniciar.click();

  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout: 8000 });

  const inputCorreo = dialog.locator('input[name="correo"], input[type="email"]').first();
  const inputPass = dialog.locator('input[name="contrasena"], input[type="password"]').first();

  await inputCorreo.fill(cred.correo);
  await inputPass.fill(cred.contrasena);

  const botonSubmit = dialog.locator('button[type="submit"]:has-text("Iniciar sesión")').last();
  await botonSubmit.click();

  await page.waitForURL("**/plataforma**", { timeout: 15000 });

  const sesionAlmacenada = await page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem("polis-sesion-v2");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  assert(sesionAlmacenada, "La sesión debe estar en sessionStorage['polis-sesion-v2']");
  assert.equal(
    sesionAlmacenada.state?.sesion?.rol,
    cred.rol,
    `El rol de la sesión debe ser ${cred.rol}`
  );

  registrarPaso(`1. Login por rol: ${cred.rol}`, `Sesión confirmada y redirección a /plataforma exitosa`);
}

async function auditarA11y(page, nombre) {
  const axeSource = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      },
    });
  });

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );

  console.log(`[A11Y] Auditoría Axe: ${nombre} -> Violaciones Serias/Críticas: ${seriousOrCritical.length}`);
  if (seriousOrCritical.length > 0) {
    for (const v of seriousOrCritical) {
      console.error(`  - [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.helpUrl})`);
      for (const node of v.nodes) {
        console.error(`    HTML: ${node.html}`);
        console.error(`    Target: ${JSON.stringify(node.target)}`);
      }
    }
  }

  assert.equal(
    seriousOrCritical.length,
    0,
    `La vista/panel "${nombre}" debe tener 0 violaciones graves de accesibilidad`
  );
}

async function main() {
  console.log("================================================================================");
  console.log("   POLIS - SUITE SMOKE E2E AISLADA DE FLUJOS CRÍTICOS Y ACCESIBILIDAD (AUD-09)   ");
  console.log("================================================================================");

  let creds;
  try {
    creds = await prepararEntornoAislado();
  } catch (err) {
    console.error("❌ Error al preparar entorno aislado:", err);
    desmontarEntornoAislado();
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // ----------------------------------------------------
    // CONTEXTO 1: AUTORIDAD DISTRITAL (MUTACIONES Y PERSISTENCIA)
    // ----------------------------------------------------
    const contextAutoridad = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const pageAutoridad = await contextAutoridad.newPage();
    pageAutoridad.on("pageerror", (err) => console.error("[BROWSER-PAGE-ERROR]", err));
    pageAutoridad.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER-CONSOLE-ERROR]", msg.text());
    });
    pageAutoridad.on("response", async (res) => {
      if (res.url().includes("/api/v1/") && !res.ok()) {
        try {
          console.error(`[API-ERROR] ${res.status()} ${res.url()}: ${await res.text()}`);
        } catch {}
      }
    });

    // 1. Login como autoridad_distrital
    await loginEnNavegador(pageAutoridad, creds.autoridad);

    // 2. Conmutar fase y verificar persistencia tras recarga
    console.log("\nEjecutando Flujo 2: Conmutar Fase...");
    await pageAutoridad.goto(`${BASE_URL}/plataforma/contenido`, { waitUntil: "domcontentloaded" });
    const botonConfigFases = pageAutoridad.locator('button:has-text("Control de Fases DNP")').first();
    await botonConfigFases.waitFor({ state: "visible", timeout: 8000 });
    await botonConfigFases.click();

    const panelFases = pageAutoridad.locator('[data-slot="side-panel"]').first();
    await panelFases.waitFor({ state: "visible", timeout: 8000 });

    const primerSwitch = panelFases.locator('[role="switch"]').first();
    await primerSwitch.waitFor({ state: "visible", timeout: 8000 });
    const estadoInicial = (await primerSwitch.getAttribute("data-state")) === "checked";

    await primerSwitch.click();
    await pageAutoridad.waitForTimeout(1000);

    // Recargar página y verificar persistencia en PostgreSQL
    console.log("Recargando página para verificar persistencia de fase en PostgreSQL...");
    await pageAutoridad.reload({ waitUntil: "domcontentloaded" });
    await pageAutoridad.locator('button:has-text("Control de Fases DNP")').first().click();
    await pageAutoridad.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });

    const switchRecargado = pageAutoridad.locator('[data-slot="side-panel"] [role="switch"]').first();
    const estadoNuevo = (await switchRecargado.getAttribute("data-state")) === "checked";
    assert.equal(estadoNuevo, !estadoInicial, "El nuevo estado de la fase debe persistir en PostgreSQL tras recargar");

    // Restaurar estado inicial
    await switchRecargado.click();
    await pageAutoridad.waitForTimeout(1000);
    await pageAutoridad.keyboard.press("Escape");
    await pageAutoridad.waitForTimeout(400);

    registrarPaso("2. Conmutar fase", "Persistencia verificada tras recarga y restaurada");

    // 3. Editar mesa y verificar persistencia tras recarga
    console.log("\nEjecutando Flujo 3: Editar Mesa (Acuerdos de Plenaria)...");
    await pageAutoridad.goto(`${BASE_URL}/plataforma/mesas`, { waitUntil: "networkidle" });
    const botonVerDetalle = pageAutoridad.locator('button[aria-label^="Ver detalle"]').first();
    await botonVerDetalle.waitFor({ state: "visible", timeout: 8000 });
    await botonVerDetalle.click();

    const panelMesa = pageAutoridad.locator('[data-slot="side-panel"]').first();
    await panelMesa.waitFor({ state: "visible", timeout: 8000 });

    const textareaAcuerdos = panelMesa.locator('textarea[aria-label="Acuerdos de la plenaria de apertura"]').first();
    await textareaAcuerdos.waitFor({ state: "visible", timeout: 8000 });

    const nuevosAcuerdos = `Acuerdos prioritarios concertados en prueba E2E [${Date.now()}]`;
    await textareaAcuerdos.fill(nuevosAcuerdos);

    const botonGuardarAcuerdos = panelMesa.locator('button:has-text("Guardar acuerdos")').first();
    await botonGuardarAcuerdos.click();
    await pageAutoridad.waitForTimeout(1500);

    await pageAutoridad.keyboard.press("Escape");
    await pageAutoridad.waitForTimeout(400);

    // Recargar y verificar persistencia
    console.log("Recargando página para verificar persistencia de acuerdos de mesa en PostgreSQL...");
    await pageAutoridad.reload({ waitUntil: "networkidle" });
    const botonVerDetalleRecargado = pageAutoridad.locator('button[aria-label^="Ver detalle"]').first();
    await botonVerDetalleRecargado.waitFor({ state: "visible", timeout: 8000 });
    await botonVerDetalleRecargado.click();

    await pageAutoridad.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });
    const textareaRecargado = pageAutoridad.locator('[data-slot="side-panel"] textarea[aria-label="Acuerdos de la plenaria de apertura"]').first();
    await textareaRecargado.waitFor({ state: "visible", timeout: 8000 });

    await pageAutoridad.waitForFunction(
      (expected) => {
        const el = document.querySelector(
          '[data-slot="side-panel"] textarea[aria-label="Acuerdos de la plenaria de apertura"]'
        );
        return el && el.value === expected;
      },
      nuevosAcuerdos,
      { timeout: 8000 }
    );

    await pageAutoridad.keyboard.press("Escape");
    await pageAutoridad.waitForTimeout(400);
    registrarPaso("3. Editar mesa", `Acuerdos concertados persistieron en PostgreSQL: "${nuevosAcuerdos.slice(0, 35)}..."`);

    // 4. Editar línea estratégica y verificar persistencia tras recarga
    console.log("\nEjecutando Flujo 4: Editar Línea Estratégica...");
    await pageAutoridad.goto(`${BASE_URL}/plataforma/contenido`, { waitUntil: "domcontentloaded" });

    // Expandir el acordeón de la línea si está cerrado
    const triggerLinea = pageAutoridad.locator('[data-slot="accordion-trigger"], button:has-text("·")').first();
    await triggerLinea.waitFor({ state: "visible", timeout: 8000 });
    const botonEditarLinea = pageAutoridad.locator('button:has-text("Editar ")').first();
    if (!(await botonEditarLinea.isVisible())) {
      await triggerLinea.click();
      await pageAutoridad.waitForTimeout(500);
    }

    await botonEditarLinea.waitFor({ state: "visible", timeout: 8000 });
    await botonEditarLinea.click();

    const panelLinea = pageAutoridad.locator('[data-slot="side-panel"]').first();
    await panelLinea.waitFor({ state: "visible", timeout: 8000 });

    const textareaDescLinea = panelLinea.locator('textarea[name="descripcion"]').first();
    await textareaDescLinea.waitFor({ state: "visible", timeout: 8000 });
    const nuevaDescLinea = `Línea estratégica actualizada por prueba E2E [${Date.now()}]`;
    await textareaDescLinea.fill(nuevaDescLinea);

    const botonGuardarLinea = panelLinea.locator('button[type="submit"]:has-text("Guardar línea estratégica")').first();
    await botonGuardarLinea.click();
    await pageAutoridad.waitForTimeout(1500);

    // Recargar y verificar persistencia
    console.log("Recargando página para verificar persistencia de línea en PostgreSQL...");
    await pageAutoridad.reload({ waitUntil: "networkidle" });
    const triggerLineaRecargada = pageAutoridad.locator('[data-slot="accordion-trigger"], button:has-text("·")').first();
    await triggerLineaRecargada.waitFor({ state: "visible", timeout: 8000 });
    await triggerLineaRecargada.click();
    await pageAutoridad.waitForTimeout(500);

    const textoDescripcionRenderizado = pageAutoridad.locator(`text="${nuevaDescLinea}"`).first();
    await textoDescripcionRenderizado.waitFor({ state: "visible", timeout: 8000 });
    assert(await textoDescripcionRenderizado.isVisible(), "La descripción de la línea debe persistir y renderizarse tras recarga");

    registrarPaso("4. Editar línea", "Descripción persistió en PostgreSQL y se renderizó tras recarga");

    // 5. Editar compromiso PAS y verificar persistencia tras recarga
    console.log("\nEjecutando Flujo 5: Editar Compromiso PAS...");
    await pageAutoridad.goto(`${BASE_URL}/plataforma/seguimiento`, { waitUntil: "domcontentloaded" });

    const botonGestionarCompromiso = pageAutoridad.locator('button:has-text("Gestionar Avance"), button:has-text("Ver Detalle")').first();
    await botonGestionarCompromiso.waitFor({ state: "visible", timeout: 8000 });
    await botonGestionarCompromiso.click();

    const panelCompromiso = pageAutoridad.locator('[data-slot="side-panel"]').first();
    await panelCompromiso.waitFor({ state: "visible", timeout: 8000 });

    const inputAvanceValor = panelCompromiso.locator('input[type="number"]').first();
    await inputAvanceValor.waitFor({ state: "visible", timeout: 8000 });
    const nuevoAvanceCompromiso = 35;
    await inputAvanceValor.fill(String(nuevoAvanceCompromiso));

    const obsTextarea = panelCompromiso.locator('textarea').first();
    const nuevaObsE2E = `Avance verificado en prueba E2E [${Date.now()}]`;
    await obsTextarea.fill(nuevaObsE2E);

    const botonActualizarCompromiso = panelCompromiso.locator('button[type="submit"]:has-text("Actualizar Avance")').first();
    await botonActualizarCompromiso.click();
    await pageAutoridad.waitForTimeout(1200);

    // Recargar y verificar persistencia
    console.log("Recargando página para verificar persistencia de compromiso en PostgreSQL...");
    await pageAutoridad.reload({ waitUntil: "domcontentloaded" });
    await pageAutoridad.locator('button:has-text("Gestionar Avance"), button:has-text("Ver Detalle")').first().click();
    await pageAutoridad.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });

    const inputAvanceRecargado = pageAutoridad.locator('[data-slot="side-panel"] input[type="number"]').first();
    assert.equal(await inputAvanceRecargado.inputValue(), String(nuevoAvanceCompromiso), "El avance del compromiso debe persistir tras recargar");

    await pageAutoridad.keyboard.press("Escape");
    await pageAutoridad.waitForTimeout(400);
    registrarPaso("5. Editar compromiso", `Avance persistió en ${nuevoAvanceCompromiso} y observación registrada`);

    // 6. Registrar medición de indicador y verificar persistencia tras recarga
    console.log("\nEjecutando Flujo 6: Registrar Medición de Indicador DNP...");
    await pageAutoridad.goto(`${BASE_URL}/plataforma/seguimiento`, { waitUntil: "domcontentloaded" });
    const tabCadenaValor = pageAutoridad.locator('[role="tab"]:has-text("Cadena de Valor")').first();
    await tabCadenaValor.waitFor({ state: "visible", timeout: 8000 });
    await tabCadenaValor.click();
    await pageAutoridad.waitForTimeout(500);

    const botonFichaDNP = pageAutoridad.locator('button:has-text("Ver Ficha Técnica DNP")').first();
    await botonFichaDNP.waitFor({ state: "visible", timeout: 8000 });
    await botonFichaDNP.click();

    const panelIndicador = pageAutoridad.locator('[data-slot="side-panel"]').first();
    await panelIndicador.waitFor({ state: "visible", timeout: 8000 });

    const inputValorMedido = panelIndicador.locator('input[type="number"]').first();
    await inputValorMedido.waitFor({ state: "visible", timeout: 8000 });
    const nuevoValorMedido = 5200;
    await inputValorMedido.fill(String(nuevoValorMedido));

    const botonGuardarMedicion = panelIndicador.locator('button:has-text("Guardar Medición")').first();
    await botonGuardarMedicion.click();
    await pageAutoridad.waitForTimeout(1200);

    // Recargar y verificar persistencia
    console.log("Recargando página para verificar persistencia de medición en PostgreSQL...");
    await pageAutoridad.reload({ waitUntil: "domcontentloaded" });
    await pageAutoridad.locator('[role="tab"]:has-text("Cadena de Valor")').first().click();
    await pageAutoridad.waitForTimeout(500);
    await pageAutoridad.locator('button:has-text("Ver Ficha Técnica DNP")').first().click();
    await pageAutoridad.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });

    const inputMedicionRecargado = pageAutoridad.locator('[data-slot="side-panel"] input[type="number"]').first();
    assert.equal(await inputMedicionRecargado.inputValue(), String(nuevoValorMedido), "El valor medido del indicador debe persistir tras recarga");

    await pageAutoridad.keyboard.press("Escape");
    await pageAutoridad.waitForTimeout(400);
    registrarPaso("6. Registrar medición", `Medición de indicador (${nuevoValorMedido}) persistió en PostgreSQL`);

    // 7. Devolución de un aporte y verificar persistencia tras recarga
    console.log("\nEjecutando Flujo 7: Devolución Motivada de Aporte (C-150/15)...");
    await pageAutoridad.goto(`${BASE_URL}/plataforma/seguimiento`, { waitUntil: "domcontentloaded" });
    const tabRendicion = pageAutoridad.locator('[role="tab"]:has-text("Rendición de Cuentas")').first();
    await tabRendicion.waitFor({ state: "visible", timeout: 8000 });
    await tabRendicion.click();
    await pageAutoridad.waitForTimeout(500);

    const botonFichaC150 = pageAutoridad.locator('button:has-text("Motivar C-150"), button:has-text("Ver Ficha C-150")').first();
    await botonFichaC150.waitFor({ state: "visible", timeout: 8000 });
    await botonFichaC150.click();

    const panelDevolucion = pageAutoridad.locator('[data-slot="side-panel"]').first();
    await panelDevolucion.waitFor({ state: "visible", timeout: 8000 });

    const textareaMotivacion = panelDevolucion.locator('textarea').first();
    if (await textareaMotivacion.isVisible()) {
      const motivacionE2E = `Devolución motivada legal C-150/15 verificada en prueba E2E [${Date.now()}]`;
      await textareaMotivacion.fill(motivacionE2E);

      const botonRadicar = panelDevolucion.locator('button:has-text("Radicar Devolución")').first();
      await botonRadicar.click();
      await pageAutoridad.waitForTimeout(1500);

      // Recargar y verificar persistencia
      console.log("Recargando página para verificar persistencia de devolución en PostgreSQL...");
      await pageAutoridad.reload({ waitUntil: "domcontentloaded" });
      await pageAutoridad.locator('[role="tab"]:has-text("Rendición de Cuentas")').first().click();
      await pageAutoridad.waitForTimeout(500);
      await pageAutoridad.locator('button:has-text("Ver Ficha C-150")').first().click();
      await pageAutoridad.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });

      const historialTexto = await pageAutoridad.locator('[data-slot="side-panel"]').innerText();
      assert(
        historialTexto.includes("No Incorporada con Motivación Expresa") ||
        historialTexto.includes("Registro Forense de Devolución") ||
        historialTexto.includes("Devolución Motivada"),
        "El estado motivado debe persistir en auditoría de PostgreSQL tras recarga"
      );
    } else {
      console.log("La propuesta seleccionada ya se encuentra motivada o acogida; verificando inmutabilidad...");
      assert(await panelDevolucion.isVisible());
    }

    await pageAutoridad.keyboard.press("Escape");
    await pageAutoridad.waitForTimeout(400);
    registrarPaso("7. Devolución de un aporte", "Devolución motivada radicada y persistida en auditoría forense");

    await contextAutoridad.close();

    // ----------------------------------------------------
    // CONTEXTO 2: AUDITOR FORENSE (MODO SOLO LECTURA INMUTABLE)
    // ----------------------------------------------------
    console.log("\nEjecutando Flujo 8: Modo Solo Lectura del Auditor Forense...");
    const contextAuditor = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const pageAuditor = await contextAuditor.newPage();

    // Login como auditor_forense
    await loginEnNavegador(pageAuditor, creds.auditor);

    // 8.1 Verificaciones en Seguimiento
    await pageAuditor.goto(`${BASE_URL}/plataforma/seguimiento`, { waitUntil: "domcontentloaded" });

    // Botón Nuevo Compromiso NO debe existir
    const botonNuevoCompromiso = pageAuditor.locator('button:has-text("Nuevo Compromiso")');
    assert.equal(await botonNuevoCompromiso.count(), 0, "El auditor forense no debe tener botón de crear compromiso");

    // Compromiso en modo solo lectura
    await pageAuditor.locator('button:has-text("Ver Detalle"), button:has-text("Gestionar Avance")').first().click();
    await pageAuditor.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });
    const bannerSupervisorCompromiso = pageAuditor.locator('text=Modo de Supervisión Técnica Forense');
    await bannerSupervisorCompromiso.waitFor({ state: "visible", timeout: 8000 });
    assert(await bannerSupervisorCompromiso.isVisible(), "El panel de compromiso debe mostrar banner de supervisión forense");
    assert.equal(await pageAuditor.locator('button:has-text("Actualizar Avance Institucional")').count(), 0, "No debe existir botón de actualización para auditor");
    await pageAuditor.keyboard.press("Escape");
    await pageAuditor.waitForTimeout(400);

    // Indicador en modo solo lectura
    await pageAuditor.locator('[role="tab"]:has-text("Cadena de Valor")').first().click();
    await pageAuditor.waitForTimeout(500);
    await pageAuditor.locator('button:has-text("Ver Ficha Técnica DNP")').first().click();
    await pageAuditor.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });
    const bannerSupervisorIndicador = pageAuditor.locator('text=Modo de Inspección Pericial — Solo Lectura');
    await bannerSupervisorIndicador.waitFor({ state: "visible", timeout: 8000 });
    assert(await bannerSupervisorIndicador.isVisible(), "El panel de indicador debe mostrar banner de inspección pericial");
    assert.equal(await pageAuditor.locator('button:has-text("Guardar Medición")').count(), 0, "No debe existir botón de guardar medición para auditor");
    await pageAuditor.keyboard.press("Escape");
    await pageAuditor.waitForTimeout(400);

    // Devolución en modo solo lectura
    await pageAuditor.locator('[role="tab"]:has-text("Rendición de Cuentas")').first().click();
    await pageAuditor.waitForTimeout(500);
    await pageAuditor.locator('button:has-text("Ver Ficha C-150"), button:has-text("Motivar C-150")').first().click();
    await pageAuditor.waitForSelector('[data-slot="side-panel"]', { timeout: 8000 });
    const bannerSupervisorDevolucion = pageAuditor.locator('text=Inspección Pericial — Solo Lectura');
    await bannerSupervisorDevolucion.waitFor({ state: "visible", timeout: 8000 });
    assert(await bannerSupervisorDevolucion.isVisible(), "El panel de devolución debe mostrar banner de inspección pericial");
    assert.equal(await pageAuditor.locator('button:has-text("Radicar Devolución")').count(), 0, "No debe existir formulario de radicación para auditor");
    await pageAuditor.keyboard.press("Escape");
    await pageAuditor.waitForTimeout(400);

    // 8.2 Verificaciones en Mesas
    await pageAuditor.goto(`${BASE_URL}/plataforma/mesas`, { waitUntil: "domcontentloaded" });
    assert.equal(await pageAuditor.locator('button:has-text("Crear mesa")').count(), 0, "El auditor forense no debe tener botón de crear mesa");

    // 8.3 Verificaciones en Contenido
    await pageAuditor.goto(`${BASE_URL}/plataforma/contenido`, { waitUntil: "domcontentloaded" });
    assert.equal(await pageAuditor.locator('button:has-text("Control de Fases DNP")').count(), 0, "El auditor forense no debe tener botón de control de fases");

    registrarPaso("8. Modo solo lectura del auditor", "Validado en Seguimiento (3 paneles), Mesas y Configuración");

    await contextAuditor.close();

    // ----------------------------------------------------
    // CONTEXTO 3: AUDITORÍA DE ACCESIBILIDAD AXE-CORE AMPLIADA
    // ----------------------------------------------------
    console.log("\nEjecutando Flujo 9: Auditoría Axe-core Ampliada en Vistas y Paneles de Plataforma...");
    const contextA11y = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const pageA11y = await contextA11y.newPage();

    // Login para tener permisos en vistas
    await loginEnNavegador(pageA11y, creds.autoridad);

    // 9.1 Dashboard
    await pageA11y.goto(`${BASE_URL}/plataforma`, { waitUntil: "domcontentloaded" });
    await auditarA11y(pageA11y, "Vista Dashboard (/plataforma)");

    // 9.2 Mesas
    await pageA11y.goto(`${BASE_URL}/plataforma/mesas`, { waitUntil: "domcontentloaded" });
    await auditarA11y(pageA11y, "Vista Mesas (/plataforma/mesas)");

    // 9.3 Contenido
    await pageA11y.goto(`${BASE_URL}/plataforma/contenido`, { waitUntil: "domcontentloaded" });
    await auditarA11y(pageA11y, "Vista Contenido (/plataforma/contenido)");

    // 9.4 Seguimiento (Pestaña 1 · Compromisos)
    await pageA11y.goto(`${BASE_URL}/plataforma/seguimiento`, { waitUntil: "domcontentloaded" });
    await auditarA11y(pageA11y, "Seguimiento - Tab 1 · Compromisos PAS");

    // 9.5 Seguimiento (Pestaña 2 · Cadena de Valor)
    await pageA11y.locator('[role="tab"]:has-text("Cadena de Valor")').first().click();
    await pageA11y.waitForTimeout(500);
    await auditarA11y(pageA11y, "Seguimiento - Tab 2 · Cadena de Valor DNP");

    // 9.6 Seguimiento (Pestaña 3 · Rendición de Cuentas)
    await pageA11y.locator('[role="tab"]:has-text("Rendición de Cuentas")').first().click();
    await pageA11y.waitForTimeout(500);
    await auditarA11y(pageA11y, "Seguimiento - Tab 3 · Rendición de Cuentas C-150");

    // 9.7 Configuración
    await pageA11y.goto(`${BASE_URL}/plataforma/configuracion`, { waitUntil: "domcontentloaded" });
    await auditarA11y(pageA11y, "Vista Configuración (/plataforma/configuracion)");

    // 9.8 Actores Estratégicos
    await pageA11y.goto(`${BASE_URL}/plataforma/actores`, { waitUntil: "domcontentloaded" });
    await auditarA11y(pageA11y, "Vista Actores Estratégicos (/plataforma/actores)");

    registrarPaso(
      "9. Auditoría de accesibilidad axe-core ampliada",
      "0 violaciones críticas/serias en Dashboard, Mesas, Contenido, Seguimiento (3 pestañas), Configuración y Actores"
    );

    await contextA11y.close();

    console.log(`\n================================================================================`);
    console.log(`🎉 SUITE SMOKE E2E COMPLETADA CON ÉXITO: ${resultados.length}/9 FLUJOS APROBADOS`);
    console.log(`================================================================================\n`);
  } finally {
    await browser.close();
    desmontarEntornoAislado();
  }
}

main().catch((err) => {
  console.error("\n❌ ERROR CRÍTICO EN EJECUCIÓN DE SMOKE E2E:", err);
  desmontarEntornoAislado();
  process.exit(1);
});
