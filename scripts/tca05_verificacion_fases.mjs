/**
 * TCA-05 · Verificación del clic de fases en navegador real (Playwright/Chromium).
 * Pila de prueba: backend FastAPI (8001) sobre polis_test_browser (3 fases del
 * ciclo DNP; Fase 1 con 7 líneas, Fases 2 y 3 sin líneas) y frontend Next
 * standalone (3002) con rewrite /api/v1 → 8001.
 */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3002";
const CAPTURAS = new URL("../bridge/", import.meta.url).pathname;

function nombreChip(orden) {
  return new RegExp(`^Fase 0${orden}:\\s*(?!Fase\\s*\\d)`);
}

async function vistaExplorar(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: "Líneas Estratégicas" }).first().click();
  await page.getByText("Líneas Estratégicas y Gobernanza Distrital").first().waitFor({ timeout: 30_000 });
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "es-CO",
});
const page = await contexto.newPage();
let fallo = null;

/* Esperado dinámico: el fixture de prueba puede variar entre corridas
   (seeds del arranque), por lo que el total de líneas de la Fase 1 se lee
   de la API y el filtro se verifica contra ese valor. */
const RESP_LINEAS = await fetch("http://127.0.0.1:8001/api/v1/politicas/lineas");
const LINEAS = await RESP_LINEAS.json();
const FASE_1_ID = (await (await fetch("http://127.0.0.1:8001/api/v1/politicas/fases")).json())[0].id;
const lineasFase1 = LINEAS.filter((l) => l.fase_id === FASE_1_ID).length;

try {
  await vistaExplorar(page);

  /* 1. Rótulos sin duplicidad: la numeración duplicada «Fase 01 · Fase 1:»… no debe existir. */
  const chips = page.locator('[aria-label="Filtrar por fase de política"] button');
  await chips.first().waitFor({ timeout: 30_000 });
  const textosChips = await chips.allTextContents();
  console.log("Chips de fase visibles:", JSON.stringify(textosChips));
  const duplicados = textosChips.filter((t) => /Fase 0\d:\s*Fase\s*\d/.test(t));
  if (duplicados.length > 0) throw new Error(`Duplicidad residual de rótulos: ${JSON.stringify(duplicados)}`);
  console.log("[rotulos] Numeración sin duplicidad verificada.");
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca05_chips_limpios.png` });

  /* 2. Clic en «Fase 01» → filtra exactamente las líneas de la Fase 1 (conteo dinámico). */
  await page.getByRole("button", { name: nombreChip(1) }).click();
  let tarjetasFase01;
  try {
    await page.waitForFunction(
      (esperadas) => document.querySelectorAll("button.ui-interactive-card").length === esperadas,
      lineasFase1,
      { timeout: 30_000 },
    );
    tarjetasFase01 = lineasFase1;
  } catch {
    tarjetasFase01 = await page.locator("button.ui-interactive-card").count();
    console.warn("[fase-01] advertencia: conteo observado:", tarjetasFase01, "esperado:", lineasFase1);
  }
  if (tarjetasFase01 !== lineasFase1) {
    throw new Error(`El filtro de Fase 01 no muestra las ${lineasFase1} líneas (${tarjetasFase01}).`);
  }
  console.log(`[fase-01] Filtro aplicado: ${lineasFase1} líneas estratégicas visibles con estado seleccionado.`);
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca05_fase01_filtro.png` });

  /* 3. Clic en «Fase 02» (sin líneas) → estado vacío explícito, no silencio. */
  await page.getByRole("button", { name: nombreChip(2) }).click();
  await page.getByText("Sin resultados para esta búsqueda").waitFor({ timeout: 30_000 });
  console.log("[fase-02] Estado vacío explícito mostrado para una fase sin líneas.");
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca05_fase02_vacio.png` });

  /* 4. Apertura de contenido: clic en la primera línea de la Fase 1 → panel L3 con aportes. */
  await page.getByRole("button", { name: nombreChip(1) }).click();
  const tarjetas = page.locator("button.ui-interactive-card");
  await tarjetas.first().waitFor({ timeout: 30_000 });
  await tarjetas.first().click();
  const panel = page.locator('[role="dialog"]').first();
  await panel.getByText(/Aportes ciudadanos/).waitFor({ timeout: 45_000 });
  console.log("[apertura] Panel de línea estratégica abierto desde la tarjeta de la Fase 1.");
  await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca05_panel_linea.png` });

  console.log("TCA-05 NAVEGADOR REAL: VERIFICADO");
} catch (err) {
  fallo = err;
  console.error("FALLO TCA-05:", err.message);
  try {
    await page.screenshot({ path: `${CAPTURAS}qa_evidencia_tca05_fallo.png` });
  } catch {}
} finally {
  await navegador.close();
}
process.exit(fallo ? 1 : 0);
