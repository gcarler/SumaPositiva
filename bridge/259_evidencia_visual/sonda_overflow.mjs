/** Sonda: lista los elementos cuyo borde derecho sobresale del viewport a 320/375/768. */
import { chromium } from "playwright";

const PUERTO = 4181;
const HISTORIA = "plataforma-administración-interna--comunicaciones-gestion";

const navegador = await chromium.launch({ headless: true });
try {
  for (const ancho of [320, 375, 768]) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
    const pagina = await contexto.newPage();
    await pagina.goto(
      `http://127.0.0.1:${PUERTO}/iframe.html?id=${encodeURIComponent(HISTORIA)}&viewMode=story`,
      { waitUntil: "domcontentloaded" },
    );
    await pagina.getByRole("heading", { name: "Plan de Trabajo y Comunicaciones" }).waitFor({ timeout: 15000 });
    await pagina.getByRole("tab", { name: /Diagrama de Gantt/ }).click();
    await pagina.getByRole("region", { name: "Diagrama de Gantt del cronograma" }).waitFor();

    const sobresalen = await pagina.evaluate(() => {
      const cw = document.documentElement.clientWidth;
      const fuera = [];
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > cw + 1) {
          fuera.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className ?? "").toString().slice(0, 120),
            right: Math.round(r.right),
            width: Math.round(r.width),
            texto: (el.textContent ?? "").trim().slice(0, 60),
          });
        }
      }
      // Solo los más externos (sin ancestro también sobresaliente listado antes)
      return { cw, fuera: fuera.slice(0, 40) };
    });

    console.log(`\n===== ancho=${ancho} clientWidth=${sobresalen.cw} =====`);
    for (const f of sobresalen.fuera) {
      console.log(`  right=${f.right} w=${f.width} <${f.tag} class="${f.cls}"> "${f.texto}"`);
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
}
