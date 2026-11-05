import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const salida = path.dirname(fileURLToPath(import.meta.url));
const navegador = await chromium.launch({ headless: true });
const prefijo = process.env.POLIS_EVIDENCIA_VISUAL_PREFIJO ?? "19";
const resultados = [];
try {
  for (const tema of ["light", "dark"]) {
    for (const ancho of [320, 1440]) {
      const pagina = await navegador.newPage({ viewport: { width: ancho, height: 1000 }, reducedMotion: "reduce" });
      const errores = [];
      pagina.on("pageerror", (error) => errores.push(error.message));
      await pagina.goto(`http://127.0.0.1:9643/iframe.html?id=plataforma-gestor-de-heros--validacion-y-teclado&viewMode=story&globals=theme:${tema}`);
      const campo = pagina.getByLabel(/URL o ruta de la imagen/);
      await campo.waitFor({ state: "visible", timeout: 30000 });
      await pagina.waitForFunction(() => document.querySelector('input[aria-invalid="true"]') !== null, { timeout: 30000 });
      await pagina.waitForFunction((oscuro) => document.documentElement.classList.contains("dark") === oscuro, tema === "dark");
      const metricas = await pagina.evaluate(() => ({
        ancho: window.innerWidth, anchoDocumento: document.documentElement.scrollWidth,
        anchoCuerpo: document.body.scrollWidth,
        tema: document.documentElement.classList.contains("dark") ? "dark" : "light",
        formulario: Boolean(document.querySelector('form[aria-label="Nueva imagen hero"]')),
        tituloConservado: [...document.querySelectorAll("input")].some((elemento) => elemento.value === "Título conservado"),
        imagenesEnBiblioteca: document.querySelectorAll('article[data-testid^="imagen-hero-"]').length,
        desbordes: [...document.querySelectorAll("body *")].filter((elemento) => {
          const caja = elemento.getBoundingClientRect();
          return caja.width > 0 && (caja.right > window.innerWidth + 1 || caja.left < -1);
        }).slice(0, 12).map((elemento) => ({ etiqueta: elemento.tagName, texto: elemento.textContent?.slice(0, 80), clase: elemento.className })),
      }));
      await pagina.evaluate(() => window.scrollTo(0, 0));
      await pagina.screenshot({ path: path.join(salida, `${prefijo}_panel_${tema}_${ancho}.png`), fullPage: true });
      resultados.push({ ...metricas, errores });
      await pagina.close();
    }
  }
} finally { await navegador.close(); }
await writeFile(path.join(salida, `${prefijo}_verificacion_visual.json`), JSON.stringify(resultados, null, 2) + "\n");
console.log(JSON.stringify(resultados, null, 2));
if (resultados.some((fila) => fila.anchoDocumento > fila.ancho || fila.errores.length || !fila.tituloConservado || !fila.formulario)) process.exitCode = 1;
