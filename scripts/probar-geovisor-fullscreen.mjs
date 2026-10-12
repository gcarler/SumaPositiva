import { chromium } from "playwright";

async function main() {
  console.log("Iniciando verificación visual con Playwright a 1440x900...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("Navegando a http://localhost:3000/geovisor ...");
  await page.goto("http://localhost:3000/geovisor", { waitUntil: "networkidle" });

  // 1. Verificar ausencia de cabecera y footer de portal
  const topbar = await page.$("header.sticky.top-0.z-40");
  console.log("Topbar del portal presente:", Boolean(topbar));
  if (topbar) {
    throw new Error("Topbar del portal no debería estar presente en /geovisor");
  }

  // 2. Verificar presencia del botón Volver al inicio
  const btnVolver = await page.waitForSelector('[data-testid="geovisor-btn-volver-inicio"]');
  const btnText = await btnVolver.innerText();
  console.log("Botón Volver detectado:", btnText);

  // 3. Abrir los 4 paneles
  // Top y Left están abiertos por defecto. Abrimos Right y Bottom si están cerrados.
  const rightToggle = await page.waitForSelector('[data-testid="dock-toggle-right"]');
  const isRightPressed = (await rightToggle.getAttribute("aria-pressed")) === "true";
  if (!isRightPressed) {
    console.log("Abriendo panel derecho...");
    await rightToggle.click();
    await page.waitForTimeout(400);
  }

  const bottomToggle = await page.waitForSelector('[data-testid="dock-toggle-bottom"]');
  const isBottomPressed = (await bottomToggle.getAttribute("aria-pressed")) === "true";
  if (!isBottomPressed) {
    console.log("Abriendo panel inferior...");
    await bottomToggle.click();
    await page.waitForTimeout(400);
  }

  // 4. Medir altura del mapa central con los 4 paneles abiertos
  const centerPanel = await page.waitForSelector('[data-dock-panel="center"]');
  const box = await centerPanel.boundingBox();
  console.log(`Dimensiones del lienzo cartográfico central (4 paneles abiertos): ${box.width}x${box.height} px`);

  if (!box || box.height < 450) {
    throw new Error(`La altura del mapa (${box?.height}px) no supera el umbral de 450px`);
  }

  console.log("¡ÉXITO! La altura del mapa (" + Math.round(box.height) + "px) supera ampliamente los 450px requeridos.");

  // Guardar captura para evidencia pericial
  await page.screenshot({ path: "bridge/geovisor-fullscreen-1440x900.png" });
  console.log("Captura guardada en bridge/geovisor-fullscreen-1440x900.png");

  await browser.close();
}

main().catch((err) => {
  console.error("Error en verificación Playwright:", err);
  process.exit(1);
});
