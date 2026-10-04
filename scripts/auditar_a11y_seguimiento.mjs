import playwright from "playwright";
import fs from "node:fs";

async function audit(page, name) {
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

  console.log(`\n========================================`);
  console.log(`Auditoría Axe: ${name}`);
  console.log(`Total Violaciones: ${results.violations.length} (Críticas/Serias: ${seriousOrCritical.length})`);
  console.log(`========================================`);

  for (const v of results.violations) {
    console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
    console.log(`  Ayuda: ${v.help} (${v.helpUrl})`);
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`  - Target: ${node.target.join(", ")}`);
      console.log(`    HTML: ${node.html.slice(0, 140)}...`);
    }
  }

  return {
    total: results.violations.length,
    seriousOrCritical: seriousOrCritical.length,
    violations: results.violations,
  };
}

async function main() {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.route("**/api/v1/identidad/perfil", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "018f4a3b-0000-7000-8000-000000000001",
        correo: "autoridad@cartagena.gov.co",
        nombres: "Autoridad",
        apellidos: "Distrital",
        codigo_rol: "autoridad_distrital",
        permisos: ["seguimiento:leer", "seguimiento:gestionar", "politicas:gestionar"],
        activo: true,
        nivel_identidad: "verificada",
        correo_verificado_en: "2026-01-01T00:00:00Z",
      }),
    });
  });

  await context.addInitScript(() => {
    sessionStorage.setItem(
      "polis-sesion-v2",
      JSON.stringify({
        state: {
          sesion: {
            modo: "institucional",
            usuarioId: "018f4a3b-0000-7000-8000-000000000001",
            rol: "autoridad_distrital",
            identidad: {
              nombre: "Autoridad Distrital",
              email: "autoridad@cartagena.gov.co",
            },
            permisos: ["seguimiento:leer", "seguimiento:gestionar", "politicas:gestionar"],
            token: "jwt-mock-autoridad",
            expiraEn: new Date(Date.now() + 86400000).toISOString(),
            desde: new Date().toISOString(),
          },
        },
        version: 0,
      })
    );
  });

  const page = await context.newPage();
  console.log("Cargando /plataforma/seguimiento...");
  await page.goto("http://127.0.0.1:3000/plataforma/seguimiento", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);

  const reportes = [];

  // 1. Pestaña 1: Matriz de Compromisos PAS
  reportes.push(await audit(page, "Pestaña 1 · Matriz de Compromisos PAS"));

  // 2. Pestaña 2: Cadena de Valor
  const tabs = page.locator('[role="tab"]');
  await tabs.nth(1).click();
  await page.waitForTimeout(600);
  reportes.push(await audit(page, "Pestaña 2 · Cadena de Valor SINERGIA (DNP)"));

  // 3. Pestaña 3: Rendición de Cuentas
  await tabs.nth(2).click();
  await page.waitForTimeout(600);
  reportes.push(await audit(page, "Pestaña 3 · Rendición de Cuentas (C-150/15)"));

  // 4. Panel 1: Devolución Detalle (en pestaña 3)
  const botonFichaC150 = page.locator('button:has-text("Ver Ficha C-150"), button:has-text("Motivar C-150")').first();
  if (await botonFichaC150.isVisible()) {
    await botonFichaC150.click();
    await page.waitForSelector('[data-slot="side-panel"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    reportes.push(await audit(page, "Panel 1 · Devolución Detalle (devolucion-detalle)"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 5. Panel 2: Indicador Detalle (en pestaña 2)
  await tabs.nth(1).click();
  await page.waitForTimeout(500);
  const botonFichaDnp = page.locator('button:has-text("Ver Ficha Técnica DNP")').first();
  if (await botonFichaDnp.isVisible()) {
    await botonFichaDnp.click();
    await page.waitForSelector('[data-slot="side-panel"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    reportes.push(await audit(page, "Panel 2 · Indicador Detalle (indicador-detalle)"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 6. Panel 3: Compromiso Editor (en pestaña 1)
  await tabs.nth(0).click();
  await page.waitForTimeout(500);
  const botonGestionar = page.locator('button:has-text("Gestionar Avance"), button:has-text("Ver Detalle")').first();
  if (await botonGestionar.isVisible()) {
    await botonGestionar.click();
    await page.waitForSelector('[data-slot="side-panel"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    reportes.push(await audit(page, "Panel 3 · Compromiso Editor (compromiso-editor)"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  const totalSeriasOCriticas = reportes.reduce((acc, r) => acc + r.seriousOrCritical, 0);
  console.log(`\n========================================`);
  console.log(`RESUMEN FINAL DE AUDITORÍA AXE:`);
  console.log(`Total Violaciones Serias o Críticas: ${totalSeriasOCriticas}`);
  console.log(`========================================\n`);

  await browser.close();
  if (totalSeriasOCriticas > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Error en ejecución de auditoría:", err);
  process.exit(1);
});
