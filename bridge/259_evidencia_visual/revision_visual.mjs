/**
 * Revisión visual 259 — Diagrama de Gantt en la app real (historia
 * `plataforma-administración-interna--comunicaciones-gestion` de Storybook
 * estático: misma aplicación, mismos tokens, mock de API de la historia).
 *
 * Revisa:
 *  1. Pestaña «Diagrama de Gantt» clickeable y activa (claro y oscuro).
 *  2. Región accesible, encabezado de fase, rótulo «Hoy: 28 oct» visibles.
 *  3. Sin desbordes involuntarios de página (Regla 6) a 320/375/768/1440.
 *  4. Scroll horizontal del contenedor a 320/375 (min-w 680px del carril).
 *  5. Panel lateral (SidePanel) abre con clic en fila y es directamente
 *     accesible a 320px.
 *  6. Errores de consola en todos los casos.
 * Evidencia: capturas en bridge/259_evidencia_visual/.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PUERTO = 4181;
const HISTORIA = "plataforma-administración-interna--comunicaciones-gestion";
const RAIZ = resolve(process.cwd());
const OUT = resolve(RAIZ, "bridge/259_evidencia_visual");
mkdirSync(OUT, { recursive: true });

const TAMANOS = [1440, 768, 375, 320];
const TEMAS = ["claro", "oscuro"];

const casos = [];
const ok = (id, detalle) => casos.push({ estado: "PASS", id, detalle });
const fallo = (id, detalle) => casos.push({ estado: "FAIL", id, detalle });

/**
 * Espera la quietud del play() de la historia: el panel lateral del PanelHost
 * (data-panel-entry) se abre y cierra varias veces mientras corre; la vista se
 * considera estable cuando lleva «estabilizacionMs» sin verse.
 */
async function esperarQuieto(pagina, estabilizacionMs = 8000, maxEsperaMs = 150000) {
  const inicio = Date.now();
  let ultimoVisto = Date.now();
  while (Date.now() - inicio < maxEsperaMs) {
    const abierto = await pagina.evaluate(
      () => !!document.querySelector("[data-panel-entry]"),
    );
    if (abierto) ultimoVisto = Date.now();
    else if (Date.now() - ultimoVisto >= estabilizacionMs) return true;
    await pagina.waitForTimeout(500);
  }
  return false;
}

const navegador = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${PUERTO}/iframe.html?id=${encodeURIComponent(HISTORIA)}&viewMode=story`;

try {
  for (const tema of TEMAS) {
    for (const ancho of TAMANOS) {
      const contexto = await navegador.newContext({
        viewport: { width: ancho, height: 900 },
      });
      const pagina = await contexto.newPage();
      const erroresConsola = [];
      pagina.on("pageerror", (e) => erroresConsola.push(String(e)));
      pagina.on("console", (m) => {
        if (m.type() === "error") erroresConsola.push(m.text());
      });

      await pagina.goto(base, { waitUntil: "domcontentloaded" });

      await pagina.getByRole("heading", { name: "Plan de Trabajo y Comunicaciones" }).waitFor({ timeout: 15000 });

      // El play() de la historia corre en la vista estática y compite con este guion:
      // esperamos a que termine (panel establemente cerrado) antes de medir.
      if (!(await esperarQuieto(pagina))) {
        // El play siguió reabriendo el panel más allá del tope: cerramos y lo registramos.
        await pagina.keyboard.press("Escape");
        fallo(`quietud ${tema}/${ancho}`, "el play() de la historia no terminó dentro del tope de espera");
      }

      // Tema: el kit se rige por la clase .dark del raíz (no por prefers-color-scheme).
      // Se inyecta DESPUÉS del montaje: Storybook reescribe <html class> al cargar y
      // una inyección temprana pierde la carrera y el tema no aplica.
      if (tema === "oscuro") {
        await pagina.evaluate(() => document.documentElement.classList.add("dark"));
        await pagina.waitForTimeout(500);
      }

      // 1. Clic en la pestaña Gantt
      const tabGantt = pagina.getByRole("tab", { name: /Diagrama de Gantt/ });
      await tabGantt.click();
      const activa = await tabGantt.getAttribute("data-state");
      if (activa === "active") ok(`pestaña activa ${tema}/${ancho}`, "data-state=active tras el clic");
      else fallo(`pestaña activa ${tema}/${ancho}`, `data-state=${activa}`);

      // 2. Contenido clave del diagrama
      const region = pagina.getByRole("region", { name: "Diagrama de Gantt del cronograma" });
      await region.waitFor({ timeout: 10000 });
      await Promise.all([
        pagina.getByText("Fase de Diagnóstico").first().waitFor({ timeout: 5000 }),
        pagina.getByText("28 Octubre – 31 Diciembre 2026").waitFor({ timeout: 5000 }),
      ]);
      const cuentaHoy = await pagina.getByText("Hoy: 28 oct").count();
      if (cuentaHoy >= 1) ok(`rótulo Hoy ${tema}/${ancho}`, "«Hoy: 28 oct» visible");
      else fallo(`rótulo Hoy ${tema}/${ancho}`, "rótulo no encontrado");

      // 3. Desborde involuntario de la página (el scroll permitido es el del contenedor del carril)
      const desborde = await pagina.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      if (desborde.sw <= desborde.cw + 1) ok(`sin overflow página ${tema}/${ancho}`, `scrollWidth=${desborde.sw} clientWidth=${desborde.cw}`);
      else {
        fallo(`sin overflow página ${tema}/${ancho}`, `scrollWidth=${desborde.sw} > clientWidth=${desborde.cw}`);
        await pagina.screenshot({ path: `${OUT}/fallo-overflow-${tema}-${ancho}.png`, fullPage: true });
      }

      // 4. Contenedor del carril desplazable a ≤420px, no desplazable a desktop
      const scroll = await pagina.evaluate(() => {
        const cont = document.querySelector('section[aria-label="Diagrama de Gantt del cronograma"] .overflow-x-auto');
        if (!cont) return null;
        return { sw: cont.scrollWidth, cw: cont.clientWidth };
      });
      if (!scroll) fallo(`carril presente ${tema}/${ancho}`, "contenedor .overflow-x-auto no encontrado");
      else if ((ancho <= 420 && scroll.sw > scroll.cw) || (ancho > 420 && scroll.sw <= scroll.cw + 1)) {
        ok(`carril ${tema}/${ancho}`, `scrollWidth=${scroll.sw} clientWidth=${scroll.cw}`);
      } else {
        fallo(`carril ${tema}/${ancho}`, `scrollWidth=${scroll.sw} clientWidth=${scroll.cw}`);
      }

      // 5. Captura del diagrama
      await pagina.screenshot({ path: `${OUT}/gantt-${tema}-${ancho}.png`, fullPage: true });

      // 6. Panel lateral por clic en fila (solo 1440 y 320, ambos temas: extremos)
      if (ancho === 1440 || ancho === 320) {
        await pagina.getByRole("button", { name: /^Editar tarea TC-04/ }).click();
        const dialogo = pagina.getByRole("dialog", { name: "Editar tarea TC-04" });
        const visible = await dialogo.isVisible().catch(() => false);
        if (visible) {
          ok(`panel TC-04 ${tema}/${ancho}`, "SidePanel del editor abierto tras clic en fila");
          await pagina.screenshot({ path: `${OUT}/panel-${tema}-${ancho}.png` });
          await pagina.keyboard.press("Escape");
        } else {
          fallo(`panel TC-04 ${tema}/${ancho}`, "el dialog del SidePanel no apareció");
        }
      }

      if (erroresConsola.length > 0) {
        fallo(`consola ${tema}/${ancho}`, `${erroresConsola.length} error(es): ${erroresConsola[0]}`);
      } else {
        ok(`consola ${tema}/${ancho}`, "sin errores de consola");
      }

      await contexto.close();
    }
  }
} finally {
  await navegador.close();
}

const fallos = casos.filter((c) => c.estado === "FAIL");
writeFileSync(
  `${OUT}/resultado.json`,
  JSON.stringify({ fecha: new Date().toISOString(), casos }, null, 2),
);
console.log("\n=========== REVISIÓN VISUAL 259 ===========");
for (const c of casos) console.log(`  [${c.estado}] ${c.id} — ${c.detalle}`);
console.log("===========================================");
console.log(`Total: ${casos.length} · PASS: ${casos.length - fallos.length} · FAIL: ${fallos.length}`);
process.exitCode = fallos.length > 0 ? 1 : 0;
