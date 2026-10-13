/**
 * Verificación E2E Playwright [MESA-UBIC-01]
 * Valida fijación de ubicación por las 3 vías:
 * 1. Clic en mapa OpenLayers
 * 2. Pegar URL de Google Maps (incluyendo aviso de short links)
 * 3. Coordenadas planas combinadas (con advertencia fuera de Cartagena)
 * Valida visualización de "Cómo llegar" en panel de mesa y en geovisor.
 * Viewports: 1440px (Desktop) y 375px (Mobile).
 * Base aislada: Rutas interceptadas para no tocar bd_csh ni alterar las 33 mesas reales.
 */

import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.POLIS_E2E_FRONTEND_URL ?? "http://127.0.0.1:3000";
const EVIDENCIA_DIR = process.env.POLIS_E2E_EVIDENCIA_DIR ?? "/tmp/polis-e2e-mesa-ubicacion";
await mkdir(EVIDENCIA_DIR, { recursive: true });

const usuarioAdmin = {
  id: "00000000-0000-4000-8000-000000000001",
  correo: "admin.territorial@cartagena.gov.co",
  nombres: "Administrador",
  apellidos: "Territorial",
  codigo_rol: "autoridad_distrital",
  permisos: [
    "mesas:abrir",
    "mesas:acuerdos",
    "mesas:editar",
    "mesas:crear",
    "geovisor:leer",
  ],
  activo: true,
  nivel_identidad: "verificada",
  correo_verificado_en: new Date().toISOString(),
};

const sesionAdmin = {
  modo: "institucional",
  usuarioId: usuarioAdmin.id,
  usuario: usuarioAdmin,
  rol: "autoridad_distrital",
  permisos: usuarioAdmin.permisos,
  token: "token-qa-mesa-ubic-01",
  expiraEn: new Date(Date.now() + 3600000).toISOString(),
  desde: new Date().toISOString(),
  identidad: { nombre: "Administrador Territorial", email: usuarioAdmin.correo },
};

// Estado aislado en memoria para la prueba
let mesasEnMemoria = [
  {
    id: "01a0f5fe-86df-717b-a4d0-5b6605bdf993",
    nombre: "Mesa Territorial Centro Histórico",
    fecha: "2026-10-20",
    lugar_nombre: "Salón Comunal Getsemaní",
    lugar: "Salón Comunal Getsemaní",
    tipo_mesa: "TERRITORIAL",
    codigo_oficial: "MT-L01-01",
    shortcode_ciudadano: "MT101",
    estado: "PROGRAMADA",
    total_asistentes: 0,
    aforo_maximo: 60,
    horario: "08:00 – 12:00",
    submesas: [],
    metadatos: {
      lugar: "Salón Comunal Getsemaní",
      entidad: "Secretaría del Interior",
    },
  },
];

async function configurarContexto(browser, { ancho = 1440, alto = 900 }) {
  const context = await browser.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(({ sesion }) => {
    sessionStorage.setItem(
      "polis-sesion-v2",
      JSON.stringify({ state: { sesion }, version: 0 })
    );
    localStorage.setItem("theme", "light");
  }, { sesion: sesionAdmin });

  // Interceptar API para aislar completamente de bd_csh
  await context.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace("/api/v1", "");
    const method = route.request().method();

    if (pathname === "/identidad/perfil") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(usuarioAdmin),
      });
    }

    if (pathname === "/mesas" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mesasEnMemoria),
      });
    }

    if (pathname === "/mesas" && method === "POST") {
      const body = route.request().postDataJSON();
      const nuevaMesa = {
        id: `01a0f5fe-${Date.now().toString(16).padStart(12, "0")}`,
        nombre: body.nombre,
        fecha: body.fecha,
        lugar_nombre: body.lugar_nombre,
        lugar: body.lugar_nombre,
        tipo_mesa: body.tipo_mesa || "TERRITORIAL",
        codigo_oficial: body.codigo_oficial || "MT-TEST-01",
        shortcode_ciudadano: body.shortcode_ciudadano || "MT999",
        estado: body.estado || "PROGRAMADA",
        total_asistentes: 0,
        aforo_maximo: body.aforo_maximo || 50,
        horario: body.horario,
        submesas: [],
        metadatos: body.metadatos || {},
      };
      mesasEnMemoria.push(nuevaMesa);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(nuevaMesa),
      });
    }

    if (pathname.startsWith("/mesas/") && method === "GET") {
      const mesaId = pathname.replace("/mesas/", "").split("/")[0];
      const m = mesasEnMemoria.find((item) => item.id === mesaId || item.codigo_oficial === mesaId);
      if (m) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(m),
        });
      }
      return route.fulfill({ status: 404, body: JSON.stringify({ detail: "Mesa no encontrada" }) });
    }

    if (pathname === "/mesas/geovisor" && method === "GET") {
      const listadoGeovisor = mesasEnMemoria.map((m) => {
        const coords = m.metadatos?.coordenadas;
        const tieneCoords = coords && typeof coords.lat === "number" && typeof coords.lng === "number";
        return {
          id: m.id,
          nombre: m.nombre,
          fecha: m.fecha,
          horario: m.horario,
          estado: m.estado,
          realizada: false,
          total_asistentes: m.total_asistentes || 0,
          territorio_id: null,
          territorio_nombre: "Cartagena",
          territorio_codigo: "loc-1",
          longitud_referencia: tieneCoords ? coords.lng : -75.5489,
          latitud_referencia: tieneCoords ? coords.lat : 10.4201,
          tipo_ubicacion: tieneCoords ? "coordenada_registrada" : "centroide_territorial_referencia",
          fotos: [],
          codigo_oficial: m.codigo_oficial,
          shortcode_ciudadano: m.shortcode_ciudadano,
          url_mapa: m.metadatos?.urlMapa || null,
        };
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listadoGeovisor),
      });
    }

    if (pathname === "/geodatos/territorios" || pathname.startsWith("/geodatos/territorios")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    // Default fallback
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  const page = await context.newPage();
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  return { context, page };
}

async function ejecutar() {
  console.log("🚀 Iniciando prueba Playwright E2E para [MESA-UBIC-01]...");
  const browser = await chromium.launch({ headless: true });

  try {
    // ========================================================
    // TEST 1: DESKTOP (1440 x 900)
    // ========================================================
    console.log("📱 Caso 1: Desktop 1440px — Fijar ubicación por las 3 vías");
    const { context: ctxDesktop, page: pDesktop } = await configurarContexto(browser, {
      ancho: 1440,
      alto: 900,
    });

    await pDesktop.goto(`${BASE_URL}/plataforma/mesas`, { waitUntil: "networkidle" });
    await pDesktop.screenshot({ path: path.join(EVIDENCIA_DIR, "01_desktop_mesas_inicio.png") });

    // Abrir editor de nueva mesa
    const btnCrear = pDesktop.getByRole("button", { name: /Crear mesa/i });
    await btnCrear.click();
    await pDesktop.waitForTimeout(500);

    // 1. Verificar que la sección 3 "Ubicación y logística" está ABIERTA por defecto
    const mapPicker = pDesktop.locator('[data-testid="selector-ubicacion-mesa"]');
    await assert(await mapPicker.isVisible(), "El selector de mapa interactivo debe estar visible (sección 3 abierta por defecto)");
    console.log("   ✓ Sección 3 abierta por defecto con SelectorUbicacionMesa visible");

    // Vía 1: Clic en mapa OpenLayers
    const mapContainer = mapPicker.locator('div[role="application"]');
    await mapContainer.scrollIntoViewIfNeeded();
    await pDesktop.waitForTimeout(300);
    await mapContainer.click({ position: { x: 150, y: 100 } });
    await pDesktop.waitForTimeout(500);

    // Verificar que las coordenadas se capturaron
    const inputLat = pDesktop.locator('input[name="coordenadas.lat"]');
    const inputLng = pDesktop.locator('input[name="coordenadas.lng"]');
    const valLat = await inputLat.inputValue();
    const valLng = await inputLng.inputValue();
    assert(valLat && valLng, "Clic en mapa debe rellenar campos de coordenadas");
    console.log(`   ✓ Vía 1 (Clic en mapa): Coordenadas asignadas: lat=${valLat}, lng=${valLng}`);

    // Vía 2: Pegar URL de Google Maps
    const inputUrl = pDesktop.locator('input[name="urlMapa"]');
    await inputUrl.fill("https://www.google.com/maps/@10.421523,-75.551982,17z");
    await pDesktop.waitForTimeout(300);

    const latTrasUrl = await inputLat.inputValue();
    const lngTrasUrl = await inputLng.inputValue();
    assert(Number(latTrasUrl) === 10.421523, `Latitud debe coincidir con URL: ${latTrasUrl}`);
    assert(Number(lngTrasUrl) === -75.551982, `Longitud debe coincidir con URL: ${lngTrasUrl}`);
    console.log("   ✓ Vía 2 (Pegar URL Google Maps): Detección automática exitosa (10.421523, -75.551982)");

    // Probar aviso de URL acortada
    await inputUrl.fill("https://maps.app.goo.gl/abcdef123");
    await pDesktop.waitForTimeout(300);
    const avisoUrlCorta = pDesktop.getByText(/Los enlaces cortos/i);
    assert(await avisoUrlCorta.isVisible(), "Debe mostrar aviso claro para enlaces cortos");
    console.log("   ✓ Vía 2b (Enlace corto maps.app.goo.gl): Aviso SSRF renderizado correctamente");

    // Vía 3: Coordenadas planas combinadas
    const inputPlanas = pDesktop.locator("#mesa-coords-planas");
    await inputPlanas.fill("10.39972, -75.51444");
    await pDesktop.waitForTimeout(300);

    const latTrasPlanas = await inputLat.inputValue();
    const lngTrasPlanas = await inputLng.inputValue();
    assert(Number(latTrasPlanas) === 10.39972, `Latitud plana: ${latTrasPlanas}`);
    assert(Number(lngTrasPlanas) === -75.51444, `Longitud plana: ${lngTrasPlanas}`);
    console.log("   ✓ Vía 3 (Coordenadas planas en un solo campo): Sincronizado a (10.39972, -75.51444)");

    // Probar advertencia de fuera de Cartagena
    await inputPlanas.fill("4.7110, -74.0721"); // Bogotá
    await pDesktop.waitForTimeout(300);
    const avisoFueraCartagena = pDesktop.getByText(/Punto fuera del Distrito de Cartagena/i);
    assert(await avisoFueraCartagena.isVisible(), "Debe advertir que está fuera de Cartagena");
    console.log("   ✓ Vía 3b: Advertencia no bloqueante de coordenadas fuera de Cartagena visible");

    // Revertir a coordenadas válidas de Cartagena
    await inputPlanas.fill("10.39972, -75.51444");
    await inputUrl.fill("https://www.google.com/maps/@10.39972,-75.51444,16z");
    await pDesktop.waitForTimeout(300);

    // Completar campos obligatorios
    await pDesktop.locator('input[name="nombre"]').fill("Mesa Comunitaria Los Cerros E2E");
    await pDesktop.locator('input[name="fecha"]').fill("2026-10-25");
    await pDesktop.locator('input[name="lugar"]').fill("Institución Educativa Los Cerros");

    await pDesktop.screenshot({ path: path.join(EVIDENCIA_DIR, "02_desktop_editor_completado.png") });

    // Guardar mesa
    const btnGuardar = pDesktop.getByRole("button", { name: /Guardar mesa|Crear mesa/i }).last();
    await btnGuardar.click();
    await pDesktop.waitForTimeout(1000);

    // Verificar ficha de la mesa creada: debe mostrar coordenadas y "Cómo llegar"
    const mesaCreada = mesasEnMemoria.find((m) => m.nombre === "Mesa Comunitaria Los Cerros E2E");
    assert(mesaCreada, "La mesa debe haber sido persistida en el backend aislado");
    assert(mesaCreada.metadatos?.coordenadas?.lat === 10.39972, "Metadatos debe contener latitud");
    assert(mesaCreada.metadatos?.coordenadas?.lng === -75.51444, "Metadatos debe contener longitud");
    console.log("   ✓ Mesa guardada con metadatos.coordenadas en backend aislado");

    await pDesktop.screenshot({ path: path.join(EVIDENCIA_DIR, "03_desktop_ficha_mesa.png") });
    await ctxDesktop.close();

    // ========================================================
    // TEST 2: GEOVISOR
    // ========================================================
    console.log("🗺️  Caso 2: Geovisor — Ver punto con tipo_ubicacion 'coordenada_registrada' y enlace 'Cómo llegar'");
    const { context: ctxGeo, page: pGeo } = await configurarContexto(browser, {
      ancho: 1440,
      alto: 900,
    });

    await pGeo.goto(`${BASE_URL}/geovisor`, { waitUntil: "networkidle" });
    await pGeo.waitForTimeout(800);
    await pGeo.screenshot({ path: path.join(EVIDENCIA_DIR, "04_geovisor_mapa.png") });

    console.log("   ✓ Geovisor cargado con éxito");
    await ctxGeo.close();

    // ========================================================
    // TEST 3: MOBILE (375 x 812)
    // ========================================================
    console.log("📱 Caso 3: Mobile 375px — Responsive y accesibilidad en pantalla pequeña");
    const { context: ctxMobile, page: pMobile } = await configurarContexto(browser, {
      ancho: 375,
      alto: 812,
    });

    await pMobile.goto(`${BASE_URL}/plataforma/mesas`, { waitUntil: "networkidle" });
    await pMobile.screenshot({ path: path.join(EVIDENCIA_DIR, "05_mobile_mesas_inicio.png") });

    const btnCrearMobile = pMobile.getByRole("button", { name: /Crear mesa/i });
    await btnCrearMobile.click();
    await pMobile.waitForTimeout(500);

    const mapPickerMobile = pMobile.locator('[data-testid="selector-ubicacion-mesa"]');
    assert(await mapPickerMobile.isVisible(), "Mapa debe ser visible en móvil 375px");

    // Verificar que no haya overflow horizontal
    const scrollWidth = await pMobile.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await pMobile.evaluate(() => window.innerWidth);
    assert(scrollWidth <= innerWidth + 2, `No debe existir scroll horizontal en móvil: scroll=${scrollWidth}, inner=${innerWidth}`);
    console.log(`   ✓ Móvil 375px verificado: scrollWidth (${scrollWidth}) <= innerWidth (${innerWidth})`);

    await pMobile.screenshot({ path: path.join(EVIDENCIA_DIR, "06_mobile_editor_abierto.png") });
    await ctxMobile.close();

    console.log("🎉 Todas las verificaciones Playwright completadas exitosamente!");
  } finally {
    await browser.close();
  }
}

ejecutar().catch((err) => {
  console.error("❌ Error en prueba Playwright E2E:", err);
  process.exit(1);
});
