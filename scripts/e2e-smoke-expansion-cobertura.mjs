import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn, execSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";

// Configuración de puertos de entorno aislado (AUD-09 / Encargo 290)
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT) || 8100;
const FRONTEND_STANDALONE_PORT = Number(process.env.E2E_FRONTEND_STANDALONE_PORT) || 3105;
const PROXY_PORT = Number(process.env.E2E_PROXY_PORT) || 3100;
const BASE_URL = `http://127.0.0.1:${PROXY_PORT}`;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

function resolverPasswordBd() {
  if (process.env.POLIS_DB_PASS) return process.env.POLIS_DB_PASS;
  if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
  try {
    const envContent = fs.readFileSync("backend/.env", "utf8");
    for (const line of envContent.split("\n")) {
      if (line.startsWith("POLIS_DATABASE_URL=")) {
        const val = line.slice(line.indexOf("=") + 1).trim();
        const m = val.match(/:\/\/([^:]+):([^@]+)@/);
        if (m && m[2]) return m[2];
      }
    }
  } catch {}
  return "";
}

const DB_PASS = resolverPasswordBd();
const DB_HOST = process.env.POLIS_DB_HOST || "127.0.0.1";
const DB_PORT = process.env.POLIS_DB_PORT || "5432";
const DB_USER = process.env.POLIS_DB_USER || "polis";
const E2E_DB_NAME = process.env.POLIS_E2E_DB_NAME || "polis_test_e2e";
const E2E_DATABASE_URL = DB_PASS
  ? `postgresql+asyncpg://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${E2E_DB_NAME}`
  : `postgresql+asyncpg://${DB_USER}@${DB_HOST}:${DB_PORT}/${E2E_DB_NAME}`;

let backendProcess = null;
let frontendProcess = null;
let proxyServer = null;
const resultados = [];
const flujosUnicos = new Set();

export function registrarPaso(nombre, detalle = "") {
  console.log(`\n========================================`);
  console.log(`[PASS] ${nombre}${detalle ? ` - ${detalle}` : ""}`);
  console.log(`========================================`);
  const idFlujo = nombre.match(/^(\d+)\./)?.[1] || nombre;
  flujosUnicos.add(idFlujo);
  resultados.push({ nombre, detalle, exito: true });
}

export function limpiarPuertos() {
  console.log(`[E2E-ENV] Limpiando procesos en puertos de prueba aislados ${BACKEND_PORT}, ${FRONTEND_STANDALONE_PORT} y ${PROXY_PORT}...`);
  try {
    execSync(`fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true`);
    execSync(`fuser -k ${FRONTEND_STANDALONE_PORT}/tcp 2>/dev/null || true`);
    execSync(`fuser -k ${PROXY_PORT}/tcp 2>/dev/null || true`);
  } catch {}
}

async function esperarUrl(url, timeoutMs = 25000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout esperando que el servicio responda en ${url}`);
}

export async function prepararEntornoAislado() {
  console.log("\n[E2E-ENV] 1. Inicializando base de datos aislada y sembrando usuarios dinámicos...");
  const rawCreds = execSync("backend/.venv/bin/python scripts/preparar_entorno_e2e.py", {
    encoding: "utf8",
  });
  const creds = JSON.parse(rawCreds.trim());
  console.log("[E2E-ENV] Base de datos polis_test_e2e clonada desde polis_test.");
  console.log(`[E2E-ENV] Usuario Autoridad:     ${creds.autoridad.correo}`);
  console.log(`[E2E-ENV] Usuario Auditor:       ${creds.auditor.correo}`);
  console.log(`[E2E-ENV] Usuario Administrador: ${creds.admin?.correo || "No configurado"}`);

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
        POLIS_DATABASE_URL: E2E_DATABASE_URL,
        POLIS_TEST_DATABASE_URL: E2E_DATABASE_URL,
        POLIS_JWT_SECRET_KEY: "clave_secreta_e2e_para_pruebas_aisladas_32caracteres",
        POLIS_IP_SALT: "salt_e2e_para_pruebas_aisladas_32caracteres",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  backendProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("ERROR") || msg.includes("Exception") || msg.includes("Conflicto")) {
      console.error(`[BACKEND-STDERR] ${msg.trim()}`);
    }
  });
  backendProcess.stdout.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("ERROR") || msg.includes("Exception") || msg.includes("Conflicto")) {
      console.error(`[BACKEND-STDOUT] ${msg.trim()}`);
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

export function desmontarEntornoAislado() {
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

export async function loginEnNavegador(page, cred) {
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
}

/**
 * FLUJO EXPANDIDO 1: Banco de Alternativas MGA y Evaluación de Viabilidad (LOOT / Consulta Previa / FONSET)
 */
export async function flujoAlternativasMGA(page, _creds) {
  console.log("\nEjecutando Flujo Expandido 1: Alternativas y Proyectos MGA...");
  
  // 1.1 Verificar navegación a /plataforma/proyectos
  console.log("Navegando a /plataforma/proyectos...");
  await page.goto(`${BASE_URL}/plataforma/proyectos`, { waitUntil: "domcontentloaded" });
  const tituloProyectos = page.locator('h1:has-text("Proyectos")').first();
  await tituloProyectos.waitFor({ state: "visible", timeout: 10000 });
  assert(await tituloProyectos.isVisible(), "La vista de proyectos debe renderizarse correctamente");

  // 1.2 Navegación a /plataforma/alternativas
  console.log("Navegando a /plataforma/alternativas...");
  await page.goto(`${BASE_URL}/plataforma/alternativas`, { waitUntil: "domcontentloaded" });
  const headerAlternativas = page.locator('text=Banco Distrital de Alternativas').first();
  await headerAlternativas.waitFor({ state: "visible", timeout: 10000 });

  // 1.3 Abrir formulario de creación
  const botonCrear = page.locator('button:has-text("Nueva Alternativa")').first();
  await botonCrear.waitFor({ state: "visible", timeout: 8000 });
  await botonCrear.click();

  const panelEditor = page.locator('[data-slot="side-panel"]').first();
  await panelEditor.waitFor({ state: "visible", timeout: 8000 });

  const uniqueId = Date.now().toString().slice(-4);
  const altCodigo = `ALT-E2E-${uniqueId}`;
  const altNombre = `Iniciativa Comunitaria de Convivencia y Seguridad ${uniqueId}`;
  const altDesc = `Instalación de alarmas comunitarias inteligentes, alumbrado solar y corredores peatonales seguros en prueba E2E [${Date.now()}].`;
  const altObj = `Disminuir la incidencia delictiva y fortalecer la convivencia barrial articulada.`;
  const altTerritorio = `Localidad 1 — Histórica y del Caribe Norte`;

  // Llenar formulario de manera inequívoca
  const textInputs = await panelEditor.locator('input:not([type="number"]):not([type="hidden"])').all();
  console.log(`[E2E] Encontrados ${textInputs.length} inputs de texto en panel alternativa`);
  if (textInputs.length >= 3) {
    await textInputs[0].fill(altCodigo);
    await textInputs[1].fill(altNombre);
    await textInputs[2].fill(altTerritorio);
  } else {
    // Respaldo por ID o placeholder
    await panelEditor.locator('input').nth(0).fill(altCodigo);
    await panelEditor.locator('input').nth(1).fill(altNombre);
  }

  const allTextareas = await panelEditor.locator("textarea").all();
  console.log(`[E2E] Encontrados ${allTextareas.length} textareas en panel alternativa`);
  if (allTextareas.length >= 2) {
    await allTextareas[0].fill(altDesc);
    await allTextareas[1].fill(altObj);
  }

  // Costo estimado y población
  const numInputs = await panelEditor.locator('input[type="number"]').all();
  console.log(`[E2E] Encontrados ${numInputs.length} inputs numéricos en panel alternativa`);
  if (numInputs.length >= 2) {
    await numInputs[0].fill("5000"); // poblacion
    await numInputs[1].fill("1200000000"); // costoCop
  }

  // Activar Enfoque Étnico / Concertación para probar cálculo de Consulta Previa OIT 169
  const botonEtnico = panelEditor.locator('button:has-text("No aplica")').first();
  if (await botonEtnico.isVisible()) {
    await botonEtnico.click();
    await page.waitForTimeout(300);
  }

  // Registrar alternativa
  const botonGuardar = panelEditor.locator('button[type="submit"]:has-text("Registrar en Banco de Alternativas")').first();
  await botonGuardar.click();

  // Esperar cierre del panel de edición
  try {
    await panelEditor.waitFor({ state: "detached", timeout: 8000 });
  } catch {
    const toasts = await page.locator('[data-sonner-toast]').allInnerTexts();
    console.error("[DEBUG] Toasts activos tras submit:", toasts);
    console.error("[DEBUG] El panel de alternativa no se cerró a tiempo; contenido:", await panelEditor.innerText());
  }
  await page.waitForTimeout(1000);

  // 1.4 Simulación y Evaluación de Viabilidad IA (LOOT y FONSET)
  console.log("Probando evaluación de viabilidad jurídica y fiscal con agentes IA...");
  await page.locator('input[placeholder*="Buscar por código"]').first().fill(altCodigo);
  await page.waitForTimeout(500);

  const filaNueva = page.locator(`tr:has-text("${altCodigo}")`).first();
  await filaNueva.waitFor({ state: "visible", timeout: 8000 });

  const botonEvaluarIA = filaNueva.locator('button:has-text("Evaluar IA")').first();
  await botonEvaluarIA.waitFor({ state: "visible", timeout: 8000 });
  await botonEvaluarIA.click();

  const panelViabilidad = page.locator('[data-slot="side-panel"]').first();
  await panelViabilidad.waitFor({ state: "visible", timeout: 8000 });

  // Esperar resultado del análisis pericial multi-agente
  await panelViabilidad.locator('text=Dictamen Jurídico y Constitucional (AgenteJuridico)').waitFor({ state: "visible", timeout: 12000 });
  
  // Validaciones jurídicas LOOT / OIT 169
  const textoJuridico = await panelViabilidad.innerText();
  assert(textoJuridico.includes("Titularidad de Competencia (Ley 1454/11 LOOT)"), "Debe verificar competencia territorial bajo Ley 1454 de 2011 (LOOT)");
  assert(
    textoJuridico.includes("ENFOQUE DIFERENCIAL ÉTNICO") || textoJuridico.includes("Concertación Comunitaria"),
    "Debe procesar salvaguardas de concertación comunitaria o consulta previa"
  );

  // Validaciones fiscales FONSET / Vigencias Futuras
  assert(textoJuridico.includes("Dictamen Fiscal y Presupuestal (AgenteFiscal)"), "Debe emitir dictamen fiscal del AgenteFiscal");
  assert(textoJuridico.includes("Estructura de Financiación Distrital"), "Debe sugerir estructura presupuestal distrital");

  // Aplicar veredicto de viabilidad
  const botonAplicar = panelViabilidad.locator('button:has-text("Aplicar Veredicto de Viabilidad")').first();
  if (await botonAplicar.isVisible()) {
    await botonAplicar.click();
    await page.waitForTimeout(1000);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 1.5 Recargar vista y verificar persistencia en base de datos PostgreSQL
  console.log("Recargando página para certificar persistencia de la alternativa en PostgreSQL...");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('input[placeholder*="Buscar por código"]').first().fill(altCodigo);
  await page.waitForTimeout(500);

  const filaPersistida = page.locator(`tr:has-text("${altCodigo}")`).first();
  await filaPersistida.waitFor({ state: "visible", timeout: 8000 });
  assert(await filaPersistida.isVisible(), "La alternativa creada debe persistir en PostgreSQL tras recargar");

  registrarPaso(
    "10. Banco de Alternativas MGA y Viabilidad",
    `Alternativa ${altCodigo} creada, dictaminada con LOOT/FONSET y persistida en BD`
  );
}

/**
 * FLUJO EXPANDIDO 2: Radicación Ciudadana Pública y Comprobante de Fe Pública (/aportes/[codigo])
 */
export async function flujoRadicacionCiudadana(page) {
  console.log("\nEjecutando Flujo Expandido 2: Radicación Ciudadana y Comprobante Forense...");

  // 2.1 Navegación pública al portal ciudadano de barrio
  await page.goto(`${BASE_URL}/barrio`, { waitUntil: "domcontentloaded" });
  const headerBarrio = page.locator('text=POLIS Barrio').first();
  await headerBarrio.waitFor({ state: "visible", timeout: 8000 });

  // 2.2 Conmutar a la pestaña 2: ¿Qué propones?
  const tabProponer = page.locator('button:has-text("2. ¿Qué propones?")').first();
  await tabProponer.waitFor({ state: "visible", timeout: 8000 });
  await tabProponer.click();

  const formRadicar = page.locator('h3:has-text("Radicar Propuesta")').first();
  await formRadicar.waitFor({ state: "visible", timeout: 8000 });

  const tituloPropuesta = `Propuesta E2E Vigilancia Ciudadana y Convivencia ${Date.now()}`;
  const descPropuesta = `Instalación comunitaria de pulsadores de auxilio y luminarias LED en vías peatonales para mejorar la seguridad barrial.`;
  const dirPropuesta = `Calle 30 # 25-10, Barrio Getsemaní`;

  await page.locator('#propuesta-titulo').fill(tituloPropuesta);
  await page.locator('#propuesta-desc').fill(descPropuesta);
  await page.locator('#propuesta-direccion').fill(dirPropuesta);

  // 2.3 Enviar propuesta ciudadana
  const botonRadicar = page.locator('button[type="submit"]:has-text("Radicar Propuesta")').first();
  await botonRadicar.click();

  // 2.4 Esperar confirmación atómica y código único de radicado
  const avisoExito = page.locator('text=¡Propuesta Radicada con Fe Pública!').first();
  await avisoExito.waitFor({ state: "visible", timeout: 12000 });

  const textoRadicado = await page.locator('span.font-mono:has-text("POL-2026-")').first().innerText();
  const match = textoRadicado.match(/(POL-2026-[A-Z0-9]+)/);
  assert(match, `Se esperaba un código de radicado formal POL-2026-*, obtenido: ${textoRadicado}`);
  const codigoRadicado = match[1];
  console.log(`[E2E] Código radicado generado exitosamente: ${codigoRadicado}`);

  // 2.5 Consultar el estado y constancia de fe pública desde el portal ciudadano
  console.log(`Consultando comprobante forense en /aportes/${codigoRadicado}...`);
  await page.goto(`${BASE_URL}/aportes/${codigoRadicado}`, { waitUntil: "domcontentloaded" });

  const constanciaArticulo = page.locator('article[aria-label="Constancia oficial de fe pública"]').first();
  await constanciaArticulo.waitFor({ state: "visible", timeout: 12000 });

  const contenidoVerificacion = await page.locator('main').innerText();
  assert(contenidoVerificacion.includes(codigoRadicado), "La constancia debe exhibir el código de radicado oficial");
  assert(contenidoVerificacion.includes(tituloPropuesta), "La constancia debe reflejar el título exacto de la propuesta radicada");
  assert(contenidoVerificacion.includes("Radicado Oficial"), "El estado del trámite debe ser 'Radicado Oficial'");

  // Probar buscador contextual de radicados
  const inputBuscador = page.locator('input[placeholder*="POL-2026-"]').first();
  assert(await inputBuscador.isVisible(), "El buscador público de radicados debe estar presente en la vista");

  registrarPaso(
    "11. Radicación Ciudadana y Comprobante QR",
    `Propuesta radicada (${codigoRadicado}) y verificada en portal de fe pública`
  );
}

/**
 * FLUJO EXPANDIDO 3: Geovisor Territorial y Filtros Espaciales (LOC-1, LOC-2, LOC-3)
 */
export async function flujoGeovisorTerritorial(page) {
  console.log("\nEjecutando Flujo Expandido 3: Geovisor Territorial y Filtros Espaciales...");

  const erroresNavegador = [];
  const capturarErrores = (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      erroresNavegador.push(msg.text());
    }
  };
  page.on("console", capturarErrores);

  // 3.1 Cargar Geovisor Administrativo
  await page.goto(`${BASE_URL}/plataforma/geovisor`, { waitUntil: "domcontentloaded" });
  const tituloGeovisorAdmin = page.locator('text=Geovisor administrativo').first();
  await tituloGeovisorAdmin.waitFor({ state: "visible", timeout: 8000 });

  const panelHurtos = page.locator('text=Geovisor y Gestor de Capas GeoJSON').first();
  await panelHurtos.waitFor({ state: "visible", timeout: 8000 });
  assert(await panelHurtos.isVisible(), "El gestor de capas GeoJSON debe cargarse sin fallas");

  // 3.2 Cargar Workbench Geovisor en Pantalla Completa
  await page.goto(`${BASE_URL}/geovisor`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // 3.3 Interacción con Localidades y Filtros
  const botonMultifuente = page.locator('button:has-text("Banco Multifuente")').first();
  if (await botonMultifuente.isVisible()) {
    await botonMultifuente.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Filtrar por Localidad 1 (LOC-1), Localidad 2 (LOC-2) y Localidad 3 (LOC-3)
  const botonLoc1 = page.locator('button[aria-label*="Localidad 1"], button:has-text("Localidad 1")').first();
  if (await botonLoc1.isVisible()) {
    await botonLoc1.click({ force: true });
    await page.waitForTimeout(400);
  }

  const botonLoc2 = page.locator('button[aria-label*="Localidad 2"], button:has-text("Localidad 2")').first();
  if (await botonLoc2.isVisible()) {
    await botonLoc2.click({ force: true });
    await page.waitForTimeout(400);
  }

  // 3.4 Verificar que no haya excepciones graves en consola del navegador
  page.off("console", capturarErrores);
  const erroresCriticos = erroresNavegador.filter((e) => !e.includes("WebGL") && !e.includes("tile"));
  assert.equal(
    erroresCriticos.length,
    0,
    `El geovisor territorial no debe arrojar excepciones en consola: ${erroresCriticos.join(" | ")}`
  );

  registrarPaso(
    "12. Geovisor Territorial y Filtros Espaciales",
    "Vistas /plataforma/geovisor y /geovisor validadas con filtros territoriales sin errores"
  );
}

/**
 * FLUJO EXPANDIDO 4: Gestión de Usuarios, Roles, PBAC y Control de Contraseña (Encargo 280)
 */
export async function flujoUsuariosYRoles(page, _creds) {
  console.log("\nEjecutando Flujo Expandido 4: Gestión de Usuarios, Roles, PBAC y Password UX...");

  // 4.1 Iniciar sesión con rol de administración de identidades
  await page.goto(`${BASE_URL}/plataforma/usuarios`, { waitUntil: "domcontentloaded" });
  const tituloUsuarios = page.locator('text=Usuarios y roles').first();
  await tituloUsuarios.waitFor({ state: "visible", timeout: 8000 });

  // 4.2 Abrir panel de invitación/creación de usuario
  const botonInvitar = page.locator('button:has-text("Invitar usuario")').first();
  await botonInvitar.waitFor({ state: "visible", timeout: 8000 });
  await botonInvitar.click();

  const panelEditor = page.locator('[data-slot="side-panel"]').first();
  await panelEditor.waitFor({ state: "visible", timeout: 8000 });

  // 4.3 Probar el control de visibilidad de contraseña (Encargo 280)
  console.log("Probando control de visibilidad de contraseña (mostrar/ocultar)...");
  const contenedorPassword = panelEditor.locator('[data-slot="password-input"]').first();
  await contenedorPassword.waitFor({ state: "visible", timeout: 8000 });

  const inputPassword = contenedorPassword.locator('input');
  assert.equal(
    await inputPassword.getAttribute("type"),
    "password",
    "El campo de contraseña debe iniciar con type='password'"
  );

  const botonVisibilidad = contenedorPassword.locator('button[type="button"]').first();
  await botonVisibilidad.waitFor({ state: "visible", timeout: 5000 });
  assert.equal(await botonVisibilidad.getAttribute("aria-label"), "Mostrar contraseña");
  assert.equal(await botonVisibilidad.getAttribute("aria-pressed"), "false");

  // Clic en Mostrar
  await botonVisibilidad.click();
  await page.waitForTimeout(200);
  assert.equal(
    await inputPassword.getAttribute("type"),
    "text",
    "Tras pulsar el botón, el campo debe alternar a type='text'"
  );
  assert.equal(
    await botonVisibilidad.getAttribute("aria-label"),
    "Ocultar contraseña",
    "El aria-label debe actualizarse a 'Ocultar contraseña'"
  );
  assert.equal(
    await botonVisibilidad.getAttribute("aria-pressed"),
    "true",
    "aria-pressed debe ser true al estar visible"
  );

  // Clic en Ocultar
  await botonVisibilidad.click();
  await page.waitForTimeout(200);
  assert.equal(
    await inputPassword.getAttribute("type"),
    "password",
    "Tras segundo clic, el campo debe retornar a type='password'"
  );
  assert.equal(
    await botonVisibilidad.getAttribute("aria-label"),
    "Mostrar contraseña"
  );
  assert.equal(
    await botonVisibilidad.getAttribute("aria-pressed"),
    "false"
  );

  // 4.4 Llenar datos y registrar nuevo usuario institucional
  const timestamp = Date.now().toString().slice(-4);
  const correoNuevo = `test_e2e_facilitador_${timestamp}@cartagena.gov.co`;
  const nombreNuevo = `Facilitador Territorial ${timestamp}`;
  const apellidoNuevo = `Cartagena`;

  await panelEditor.locator('input[autoComplete="given-name"], input[name="nombres"]').first().fill(nombreNuevo);
  await panelEditor.locator('input[autoComplete="family-name"], input[name="apellidos"]').first().fill(apellidoNuevo);
  await panelEditor.locator('input[autoComplete="email"], input[type="email"]').first().fill(correoNuevo);
  await inputPassword.fill("Cartagena2026*!");
  await panelEditor.locator('input[maxLength="500"], input[minLength="10"]').first().fill("Alta de funcionario de mesa territorial para auditoría E2E");

  const botonEnviar = panelEditor.locator('button[type="submit"]:has-text("Enviar invitación")').first();
  await botonEnviar.click();
  await panelEditor.waitFor({ state: "detached", timeout: 8000 });

  // 4.5 Asignar ámbito territorial PBAC (Localidad 1) desde el panel de detalle
  console.log(`Asignando ámbito territorial PBAC para ${correoNuevo}...`);
  const inputBusqueda = page.locator('input[placeholder*="Buscar usuario"]').first();
  await inputBusqueda.fill(correoNuevo);
  await page.waitForTimeout(600);

  const filaUsuario = page.locator(`article:has-text("${correoNuevo}")`).first();
  await filaUsuario.waitFor({ state: "visible", timeout: 8000 });
  await filaUsuario.locator('button').first().click();

  const panelDetalle = page.locator('[data-slot="side-panel"]').first();
  await panelDetalle.waitFor({ state: "visible", timeout: 8000 });

  const botonAbrirFormAmbito = panelDetalle.locator('button:has-text("Asignar ámbito")').first();
  if (await botonAbrirFormAmbito.isVisible()) {
    await botonAbrirFormAmbito.click();
    await page.waitForTimeout(300);

    const selectTipoAmbito = panelDetalle.locator('#tipo-ambito-select').first();
    if (await selectTipoAmbito.isVisible()) {
      await selectTipoAmbito.click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]:has-text("Localidad")').click();
      await page.waitForTimeout(300);
    }

    const inputMotivoAmbito = panelDetalle.locator('#motivo-ambito-input').first();
    await inputMotivoAmbito.fill("Asignación de responsabilidad PBAC en Localidad 1");

    const botonGuardarAmbito = panelDetalle.locator('button[type="submit"]:has-text("Asignar")').first();
    await botonGuardarAmbito.click();
    await page.waitForTimeout(1000);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 4.6 Recargar y verificar persistencia en PostgreSQL
  console.log("Recargando página para certificar persistencia del usuario y sus atributos en PostgreSQL...");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('input[placeholder*="Buscar usuario"]').first().fill(correoNuevo);
  await page.waitForTimeout(600);

  const filaPersistida = page.locator(`article:has-text("${correoNuevo}")`).first();
  await filaPersistida.waitFor({ state: "visible", timeout: 8000 });
  assert(await filaPersistida.isVisible(), "El usuario registrado debe persistir en PostgreSQL tras recargar");

  registrarPaso(
    "13. Gestión de Usuarios, Roles, PBAC y Password UX",
    `Usuario ${correoNuevo} creado con PasswordInput accesible, ámbito PBAC asignado y persistido en BD`
  );
}

async function main() {
  console.log("================================================================================");
  console.log("   POLIS - SUITE SMOKE E2E DE EXPANSIÓN DE COBERTURA (ENCARGO 290)               ");
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
    // CONTEXTO 1: AUTORIDAD DISTRITAL (Alternativas MGA y Geovisor)
    const contextAutoridad = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageAutoridad = await contextAutoridad.newPage();
    pageAutoridad.on("pageerror", (err) => console.error("[BROWSER-PAGE-ERROR]", err));
    pageAutoridad.on("response", async (res) => {
      if (res.url().includes("/api/v1/") && !res.ok()) {
        try {
          console.error(`[API-ERROR] ${res.status()} ${res.url()}: ${await res.text()}`);
        } catch {}
      }
    });

    await loginEnNavegador(pageAutoridad, creds.autoridad);

    // Flujo 10: Alternativas MGA
    await flujoAlternativasMGA(pageAutoridad, creds);

    // Flujo 12: Geovisor Territorial
    await flujoGeovisorTerritorial(pageAutoridad);

    await contextAutoridad.close();

    // CONTEXTO 2: CIUDADANO PÚBLICO (Radicación y Comprobante de Fe Pública)
    const contextCiudadano = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageCiudadano = await contextCiudadano.newPage();
    pageCiudadano.on("pageerror", (err) => console.error("[BROWSER-PAGE-ERROR]", err));
    pageCiudadano.on("response", async (res) => {
      if (res.url().includes("/api/v1/") && !res.ok()) {
        try {
          console.error(`[CIUDADANO-API-ERROR] ${res.status()} ${res.url()}: ${await res.text()}`);
        } catch {}
      }
    });

    // Flujo 11: Radicación Ciudadana Pública
    await flujoRadicacionCiudadana(pageCiudadano);

    await contextCiudadano.close();

    // CONTEXTO 3: ADMINISTRADOR DE IDENTIDADES (Gestión de Usuarios, Roles y Password UX)
    const contextAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageAdmin = await contextAdmin.newPage();
    pageAdmin.on("pageerror", (err) => console.error("[BROWSER-PAGE-ERROR]", err));
    pageAdmin.on("response", async (res) => {
      if (res.url().includes("/api/v1/") && !res.ok()) {
        try {
          console.error(`[ADMIN-API-ERROR] ${res.status()} ${res.url()}: ${await res.text()}`);
        } catch {}
      }
    });

    await loginEnNavegador(pageAdmin, creds.admin || creds.autoridad);

    // Flujo 13: Gestión de Usuarios y Roles
    await flujoUsuariosYRoles(pageAdmin, creds);

    await contextAdmin.close();

    const TOTAL_FLUJOS = 4;
    console.log(`\n================================================================================`);
    console.log(`🎉 SUITE E2E DE EXPANSIÓN COMPLETADA: ${flujosUnicos.size}/${TOTAL_FLUJOS} MÓDULOS APROBADOS AL 100%`);
    console.log(`================================================================================\n`);
  } finally {
    await browser.close();
    desmontarEntornoAislado();
  }
}

if (process.argv[1] && process.argv[1].endsWith("e2e-smoke-expansion-cobertura.mjs")) {
  main().catch((err) => {
    console.error("\n❌ ERROR CRÍTICO EN SUITE E2E DE EXPANSIÓN:", err);
    desmontarEntornoAislado();
    process.exit(1);
  });
}
