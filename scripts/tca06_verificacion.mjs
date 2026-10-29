/**
 * TCA-06 · Verificación de recarga real en navegador (Playwright/Chromium).
 * Pila de prueba: backend FastAPI (8001) sobre la base polis_test_browser,
 * frontend Next standalone (3002) con rewrite /api/v1 → 8001.
 * La mesa demo tiene id 11111111-1111-6111-8111-111111111111.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:3002";
const MESA_ID = "11111111-1111-6111-8111-111111111111";
const DEEP_URL = `${BASE}/?mesa=${MESA_ID}`;
const NOMBRE_MESA = "Mesa de Prueba Deep-Link TCA-06";
const CAPTURAS = new URL("../bridge/", import.meta.url).pathname;

mkdirSync(CAPTURAS, { recursive: true });

function urlTieneMesa(actual) {
  const u = new URL(actual);
  return u.searchParams.get("mesa") === MESA_ID;
}

async function esperarPanelMesa(page, etiqueta) {
  const dialogo = page
    .locator('[role="dialog"]', { has: page.getByText(NOMBRE_MESA) })
    .first();
  await dialogo.waitFor({ state: "visible", timeout: 45_000 });
  console.log(`[${etiqueta}] Panel de mesa visible con el detalle correcto.`);
  return dialogo;
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "es-CO",
});
const page = await contexto.newPage();

try {
  /* 1. Entrada directa por URL con el deep-link. */
  await page.goto(DEEP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await esperarPanelMesa(page, "entrada-directa");
  const urlTrasEntrada = page.url();
  if (!urlTieneMesa(urlTrasEntrada))
    throw new Error(`La URL no conserva el parámetro de mesa: ${urlTrasEntrada}`);
  console.log(`[entrada-directa] URL conserva \?mesa\=: ${urlTrasEntrada}`);
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca06_entrada_directa.png`, fullPage: false });

  /* 2. Cerrar el panel y comprobar que la URL lo limpia. */
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !new URLSearchParams(window.location.search).get("mesa"), null, { timeout: 15_000 });
  console.log("[cierre] URL limpiada al cerrar el panel.");

  /* 3. Navegar a inicio sin parámetro y activar el deep-link de nuevo (estado limpio). */
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.goto(DEEP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await esperarPanelMesa(page, "reingreso-limpio");
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca06_reingreso.png`, fullPage: false });

  /* 4. Recarga real del navegador con el deep-link activo. */
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await esperarPanelMesa(page, "recarga");
  const urlTrasRecarga = page.url();
  if (!urlTieneMesa(urlTrasRecarga))
    throw new Error(`La URL no conserva el parámetro de mesa tras recarga: ${urlTrasRecarga}`);
  console.log(`[recarga] Detalle de mesa restaurado y URL conservada: ${urlTrasRecarga}`);
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca06_recarga.png`, fullPage: false });

  /* 5. Id inexistente: estado claro, sin panel de errores confusos. */
  const pageNueva = await contexto.newPage();
  await pageNueva.goto(`${BASE}/?mesa=22222222-2222-6222-8222-222222222222`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const sinDatos = pageNueva.getByText(/Mesa no encontrada|no está disponible/i).first();
  await sinDatos.waitFor({ state: "visible", timeout: 45_000 });
  console.log("[id-inexistente] Estado real informado: 'Mesa no encontrada'.");
  await pageNueva.screenshot({ path: `${CAPTURAS}qa_evidencia_tca06_id_inexistente.png`, fullPage: false });
  await pageNueva.close();

  console.log("TCA-06 NAVEGADOR REAL: VERIFICADO");
} finally {
  await navegador.close();
}
