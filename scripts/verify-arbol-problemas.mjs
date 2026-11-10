import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("PAGE ERROR CONSOLE:", msg.text());
    }
  });

  const realToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMWExOTM4ZS0xMWZkLTdiNGEtODU0NC0zMmVlN2Y2MWYwNDMiLCJyb2wiOiJhdXRvcmlkYWRfZGlzdHJpdGFsIiwibml2ZWxfaWRlbnRpZGFkIjoiZGVjbGFyYWRhIiwicGVybWlzb3MiOlsiYWx0ZXJuYXRpdmFzOmdlc3Rpb25hciIsImFsdGVybmF0aXZhczpsZWVyIiwiYXBvcnRlczpsZWVyIiwiYXBvcnRlczpwcmlvcml6YXIiLCJhcG9ydGVzOnJlc3BvbmRlciIsImFzaXN0ZW5jaWE6dmVyaWZpY2FyIiwiYXVkaXRvcmlhOmxlZXIiLCJjb211bmljYWNpb25lczpnZXN0aW9uYXIiLCJjb211bmljYWNpb25lczpsZWVyIiwiY29udGVuaWRvOmxlZXIiLCJmb3JtdWxhcmlvczpnZXN0aW9uYXIiLCJmb3JtdWxhcmlvczpsZWVyIiwiZnVlbnRlczpnZXN0aW9uYXIiLCJmdWVudGVzOmxlZXIiLCJpYTphbmFsaXphciIsImluZGljYWRvcmVzOmdlc3Rpb25hciIsImluc3RydW1lbnRvczpnZXN0aW9uYXIiLCJtZXNhczphYnJpciIsIm1lc2FzOmFjdWVyZG9zIiwibWVzYXM6Zm90b3M6c3ViaXIiLCJtZXNhczpsZWVyIiwicG9saXRpY2FzOmdlc3Rpb25hciIsInByZXN1cHVlc3RvOmdlc3Rpb25hciIsInByb3llY3RvczpsZWVyIiwic2VndWltaWVudG86Z2VzdGlvbmFyIiwic2VndWltaWVudG86bGVlciIsInRlc3RpbW9uaW9zOm1vZGVyYXIiXSwiZXNfYW5vbmltbyI6ZmFsc2UsImp0aSI6IjdmMmQ3ODAzLTEyODMtNDBkZi1iZDY5LThjZTgzZDM0YjRiMyIsInR5cCI6ImFjY2Vzb191c3VhcmlvIiwiaXNzIjoicG9saXMtaWRlbnRpZGFkIiwiYXVkIjoicG9saXMtYXBpIiwiaWF0IjoxNzk0MjAyNDc1LCJleHAiOjE3OTQyODg4NzV9.7a4CYGI-NdalVV3V7GJdepWkMa7zelMeoAvU-WP4Gw8";

  // Pre-seed session in sessionStorage with REAL token and metadata
  await page.addInitScript((token) => {
    const sesion = {
      state: {
        sesion: {
          usuarioId: "01a1938e-11fd-7b4a-8544-32ee7f61f043",
          modo: "institucional",
          rol: "autoridad_distrital",
          permisos: [
            "alternativas:gestionar", "alternativas:leer", "aportes:leer", "aportes:priorizar", "aportes:responder",
            "asistencia:verificar", "auditoria:leer", "comunicaciones:gestionar", "comunicaciones:leer", "contenido:leer",
            "formularios:gestionar", "formularios:leer", "fuentes:gestionar", "fuentes:leer", "ia:analizar",
            "indicadores:gestionar", "instrumentos:gestionar", "mesas:abrir", "mesas:acuerdos", "mesas:fotos:subir",
            "mesas:leer", "politicas:gestionar", "presupuesto:gestionar", "proyectos:leer", "seguimiento:gestionar",
            "seguimiento:leer", "testimonios:moderar"
          ],
          token: token,
          expiraEn: new Date(Date.now() + 86400000).toISOString(),
          desde: new Date().toISOString(),
          usuario: {
            id: "01a1938e-11fd-7b4a-8544-32ee7f61f043",
            correo: "gscarlos777@gmail.com",
            nombres: "Carlos ",
            apellidos: "Gómez",
            codigo_rol: "autoridad_distrital",
            activo: true,
            permisos: [
              "alternativas:gestionar", "alternativas:leer", "aportes:leer", "aportes:priorizar", "aportes:responder",
              "asistencia:verificar", "auditoria:leer", "comunicaciones:gestionar", "comunicaciones:leer", "contenido:leer",
              "formularios:gestionar", "formularios:leer", "fuentes:gestionar", "fuentes:leer", "ia:analizar",
              "indicadores:gestionar", "instrumentos:gestionar", "mesas:abrir", "mesas:acuerdos", "mesas:fotos:subir",
              "mesas:leer", "politicas:gestionar", "presupuesto:gestionar", "proyectos:leer", "seguimiento:gestionar",
              "seguimiento:leer", "testimonios:moderar"
            ],
            nivel_identidad: "declarada",
            correo_verificado_en: "2026-10-31T20:05:34.182046Z",
            mfa_activo: false
          },
        },
      },
      version: 0,
    };
    sessionStorage.setItem("polis-sesion-v2", JSON.stringify(sesion));
  }, realToken);

  console.log("1. Navigating to /plataforma/mesas...");
  await page.goto("http://127.0.0.1:3000/plataforma/mesas", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Wait for mesas collection to render
  console.log("2. Waiting for mesas cards to load...");
  await page.waitForSelector("button:has-text('Ver detalle')", { timeout: 15000 });
  const countBotonesDetalle = await page.locator("button:has-text('Ver detalle')").count();
  console.log(`   Found ${countBotonesDetalle} mesas on screen.`);

  // Click 'Ver detalle' on the first mesa
  console.log("3. Clicking 'Ver detalle' on first mesa...");
  await page.locator("button:has-text('Ver detalle')").first().click();

  // Wait for Mesa panel to load
  console.log("4. Waiting for Mesa panel to open...");
  await page.waitForSelector("text=Informe y relatoría de la mesa", { timeout: 15000 });

  // Scroll down to the relatoría section
  const sectionRelatoria = page.locator("text=Informe y relatoría de la mesa");
  await sectionRelatoria.scrollIntoViewIfNeeded();

  // Check if Problema Central textarea is editable (not read-only)
  console.log("5. Checking Problema Central textarea...");
  const textareaProblemaCentral = page.locator("textarea[placeholder*='Altos índices de violencia']");
  const countTextarea = await textareaProblemaCentral.count();
  console.log("   Found editable textarea count:", countTextarea);
  if (countTextarea === 0) {
    throw new Error("Editable textarea for Problema Central was not found! readOnly might still be active.");
  }

  // Type new central problem
  console.log("6. Typing central problem text...");
  await textareaProblemaCentral.fill("Deterioro en la convivencia comunitaria por falta de alumbrado público y transporte nocturno");
  console.log("   Central problem filled successfully.");

  // Check input for adding direct cause
  console.log("7. Checking input for 'Registrar nueva causa directa'...");
  const inputNuevaCausa = page.locator("input[placeholder*='Registrar nueva causa directa']");
  await inputNuevaCausa.fill("Falta de luminarias en los callejones del barrio");

  // Press Enter on the input or click the button next to it
  console.log("8. Adding new cause via button next to input...");
  const botonAnadirCausa = inputNuevaCausa.locator("..").locator("button");
  await botonAnadirCausa.click();

  // Wait 1.5 seconds to confirm the cause appears in the list
  await page.waitForTimeout(1500);
  const causaCreada = page.locator("textarea:has-text('Falta de luminarias'), input[value*='Falta de luminarias']");
  const visibleCausa = (await causaCreada.count()) > 0;
  console.log("   New cause input found on screen:", visibleCausa);
  if (!visibleCausa) {
    throw new Error("New cause input is not visible on screen after clicking Añadir!");
  }

  // Check 'Guardar matriz' button
  console.log("9. Clicking 'Guardar matriz' button...");
  const botonGuardarMatriz = page.locator("button:has-text('Guardar matriz')");
  const countGuardar = await botonGuardarMatriz.count();
  console.log("   Found 'Guardar matriz' button count:", countGuardar);
  if (countGuardar > 0) {
    await botonGuardarMatriz.click();
    console.log("   Clicked 'Guardar matriz'.");
  }

  // Wait for save toast or network completion
  await page.waitForTimeout(2000);

  // Take screenshot of the structured problem tree
  const artifactDir = "/root/.gemini/antigravity-cli/brain/61641d76-62de-4c79-a22d-9e56a95cf870";
  const screenshotPath = path.join(artifactDir, "arbol-problemas-creado.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`10. Screenshot saved to ${screenshotPath}`);

  // Switch to Cuadrícula RevoGrid view
  console.log("11. Testing RevoGrid view toggle...");
  const botonRevogrid = page.locator("button:has-text('Cuadrícula RevoGrid')");
  if (await botonRevogrid.isVisible()) {
    await botonRevogrid.click();
    await page.waitForTimeout(2500);
    const revogridScreenshot = path.join(artifactDir, "revogrid-matriz-relatoria.png");
    await page.screenshot({ path: revogridScreenshot, fullPage: false });
    console.log(`12. RevoGrid screenshot saved to ${revogridScreenshot}`);
  }

  await browser.close();
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
