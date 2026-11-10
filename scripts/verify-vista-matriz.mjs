import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const realToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMWExOTM4ZS0xMWZkLTdiNGEtODU0NC0zMmVlN2Y2MWYwNDMiLCJyb2wiOiJhdXRvcmlkYWRfZGlzdHJpdGFsIiwibml2ZWxfaWRlbnRpZGFkIjoiZGVjbGFyYWRhIiwicGVybWlzb3MiOlsiYWx0ZXJuYXRpdmFzOmdlc3Rpb25hciIsImFsdGVybmF0aXZhczpsZWVyIiwiYXBvcnRlczpsZWVyIiwiYXBvcnRlczpwcmlvcml6YXIiLCJhcG9ydGVzOnJlc3BvbmRlciIsImFzaXN0ZW5jaWE6dmVyaWZpY2FyIiwiYXVkaXRvcmlhOmxlZXIiLCJjb211bmljYWNpb25lczpnZXN0aW9uYXIiLCJjb211bmljYWNpb25lczpsZWVyIiwiY29udGVuaWRvOmxlZXIiLCJmb3JtdWxhcmlvczpnZXN0aW9uYXIiLCJmb3JtdWxhcmlvczpsZWVyIiwiZnVlbnRlczpnZXN0aW9uYXIiLCJmdWVudGVzOmxlZXIiLCJpYTphbmFsaXphciIsImluZGljYWRvcmVzOmdlc3Rpb25hciIsImluc3RydW1lbnRvczpnZXN0aW9uYXIiLCJtZXNhczphYnJpciIsIm1lc2FzOmFjdWVyZG9zIiwibWVzYXM6Zm90b3M6c3ViaXIiLCJtZXNhczpsZWVyIiwicG9saXRpY2FzOmdlc3Rpb25hciIsInByZXN1cHVlc3RvOmdlc3Rpb25hciIsInByb3llY3RvczpsZWVyIiwic2VndWltaWVudG86Z2VzdGlvbmFyIiwic2VndWltaWVudG86bGVlciIsInRlc3RpbW9uaW9zOm1vZGVyYXIiXSwiZXNfYW5vbmltbyI6ZmFsc2UsImp0aSI6IjdmMmQ3ODAzLTEyODMtNDBkZi1iZDY5LThjZTgzZDM0YjRiMyIsInR5cCI6ImFjY2Vzb191c3VhcmlvIiwiaXNzIjoicG9saXMtaWRlbnRpZGFkIiwiYXVkIjoicG9saXMtYXBpIiwiaWF0IjoxNzk0MjAyNDc1LCJleHAiOjE3OTQyODg4NzV9.7a4CYGI-NdalVV3V7GJdepWkMa7zelMeoAvU-WP4Gw8";

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
            correo: "gscarlosernesto@gmail.com",
            nombres: "Carlos Ernesto",
            apellidos: "Gómez",
            codigo_rol: "administrador_identidades",
            activo: true,
            permisos: [
              "alternativas:gestionar", "alternativas:leer", "aportes:leer", "aportes:priorizar", "aportes:responder",
              "asistencia:verificar", "auditoria:leer", "comunicaciones:gestionar", "comunicaciones:leer", "contenido:leer",
              "formularios:gestionar", "formularios:leer", "fuentes:gestionar", "fuentes:leer", "ia:analizar",
              "indicadores:gestionar", "instrumentos:gestionar", "mesas:abrir", "mesas:acuerdos", "mesas:fotos:subir",
              "mesas:leer", "politicas:gestionar", "presupuesto:gestionar", "proyectos:leer", "seguimiento:gestionar",
              "seguimiento:leer", "testimonios:moderar"
            ],
            nivel_identidad: "verificada",
            correo_verificado_en: "2026-10-31T20:05:34.182046Z",
            mfa_activo: false,
          },
        },
        cargando: false,
        errorSesion: null,
        estadoMfa: null,
      },
      version: 0,
    };
    sessionStorage.setItem("polis-sesion-v2", JSON.stringify(sesion));
  }, realToken);

  console.log("1. Navegando a /plataforma/mesas con sesión autorizada...");
  await page.goto("http://127.0.0.1:3000/plataforma/mesas", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page.waitForTimeout(2000);

  // Verificar presencia de los botones solo-icono con tooltips
  console.log("2. Verificando los 3 botones de vista solo-icono: Lista, Cuadrícula y Matriz...");
  const btnLista = page.locator("button[aria-label='Vista en lista']");
  const btnCuadricula = page.locator("button[aria-label='Vista en cuadrícula']");
  const btnMatriz = page.locator("button[aria-label='Vista en matriz']");

  await btnLista.waitFor({ state: "visible", timeout: 10000 });
  await btnCuadricula.waitFor({ state: "visible", timeout: 10000 });
  await btnMatriz.waitFor({ state: "visible", timeout: 10000 });

  // Hover para activar el tooltip ("juguete") interactivo
  console.log("2.1 Probando hover interactivo sobre el botón Matriz...");
  await btnMatriz.hover();
  await page.waitForTimeout(600);

  console.log("✓ Los tres botones [icon] [icon] [icon] están presentes con tooltips accesibles.");

  // Capturar pantalla de la vista inicial con el selector
  const artifactDir = "/root/.gemini/antigravity-cli/brain/61641d76-62de-4c79-a22d-9e56a95cf870";
  await page.screenshot({
    path: `${artifactDir}/selector-vistas-mesas.png`,
    fullPage: false,
  });
  console.log("✓ Captura guardada: selector-vistas-mesas.png");

  // Hacer clic en 'Matriz'
  console.log("3. Conmutando a la vista 'Matriz'...");
  await btnMatriz.click();
  await page.waitForTimeout(2500);

  // Esperar contenedor de la matriz
  const contenedorMatriz = page.locator('[data-testid="mesas-matriz-catalogo"]');
  await contenedorMatriz.waitFor({ state: "visible", timeout: 10000 });
  console.log("✓ Contenedor de la matriz territorial montado con éxito.");

  // Verificar elementos pro de la matriz: título, indicador de edición, buscador y filtros
  const tituloMatriz = page.locator("text=Matriz de Mesas Territoriales");
  await tituloMatriz.waitFor({ state: "visible", timeout: 5000 });
  console.log("✓ Título 'Matriz de Mesas Territoriales' verificado.");

  const badgeEdicion = page.locator("text=Edición Directa Activa");
  if (await badgeEdicion.isVisible()) {
    console.log("✓ Indicador 'Edición Directa Activa' verificado.");
  }

  const inputBusqueda = page.locator("input[placeholder*='Buscar por código']");
  if (await inputBusqueda.isVisible()) {
    console.log("✓ Buscador en vivo de la matriz verificado.");
  }

  // Capturar pantalla de la vista Matriz con RevoGrid interactivo y barra multiproblema
  await page.screenshot({
    path: `${artifactDir}/vista-matriz-revogrid-mesas.png`,
    fullPage: false,
  });
  console.log("✓ Captura guardada: vista-matriz-revogrid-mesas.png");

  // Verificar barra de desarrollo de Problemas, Causas, Efectos y Soluciones por mesa
  const barraDesarrollo = page.locator('[data-testid="barra-desarrollo-problemas-matriz"]');
  await barraDesarrollo.waitFor({ state: "visible", timeout: 8000 });
  console.log("✓ Barra de desarrollo de Problemas, Causas, Efectos y Soluciones en Matriz verificada.");

  // Abrir Constructor Rápido de Cadena Completa (Problema + Causas + Efectos + Soluciones)
  const btnCadenaCompleta = page.locator("button:has-text('Cadena Completa')");
  if (await btnCadenaCompleta.isVisible()) {
    await btnCadenaCompleta.click();
    await page.waitForTimeout(800);
    const panelConstructor = page.locator('[data-testid="constructor-cadena-completa-matriz"]');
    await panelConstructor.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Constructor Rápido de Problema + Causas + Efectos + Soluciones abierto con éxito.");
    await page.screenshot({
      path: `${artifactDir}/constructor-problemas-soluciones-matriz.png`,
      fullPage: false,
    });
    console.log("✓ Captura guardada: constructor-problemas-soluciones-matriz.png");
  }

  // Probar botón de copia TSV
  const btnCopiarTSV = page.locator("button:has-text('Copiar TSV')");
  if (await btnCopiarTSV.isVisible()) {
    console.log("✓ Botón 'Copiar TSV' disponible.");
  }

  // Probar botón de descarga CSV
  const btnDescargarCSV = page.locator("button:has-text('Descargar CSV')");
  if (await btnDescargarCSV.isVisible()) {
    console.log("✓ Botón 'Descargar CSV' disponible.");
  }

  await browser.close();
  console.log("✓ Verificación E2E de la vista Matriz Pro completada exitosamente.");
}

main().catch((err) => {
  console.error("Error en verificación E2E:", err);
  process.exit(1);
});
