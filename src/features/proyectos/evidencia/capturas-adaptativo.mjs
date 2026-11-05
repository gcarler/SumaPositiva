import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:6006";
const OUT = "src/features/proyectos/evidencia";
mkdirSync(OUT, { recursive: true });

const STORY = "plataforma-administración-interna--proyectos-gestion";

const vistas = new Map([
  [320, "adaptativo-320"],
  [768, "adaptativo-768"],
  [1280, "adaptativo-1280"],
]);

const navegador = await chromium.launch();
try {
  for (const [ancho, id] of vistas) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/iframe.html?id=${encodeURIComponent(STORY)}&viewMode=story`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await pagina.waitForTimeout(14000); // el play recorre Gantt→Kanban→Calendario→Lista
    const metricas = await pagina.evaluate(() => {
      const d = document.documentElement;
      return {
        scrollWidth: d.scrollWidth,
        clientWidth: d.clientWidth,
        desbordaBody: document.body.scrollWidth > document.documentElement.clientWidth,
      };
    });
    // El play deja la Lista con filtro aplicado: devolvemos el filtro a Todos.
    const filtro = pagina.locator('[aria-label="Filtrar por módulo"]');
    if (await filtro.count()) {
      await filtro.click();
      const todos = pagina.getByRole("option", { name: "Todos los módulos" });
      if (await todos.count()) await todos.click();
      await pagina.waitForTimeout(900);
    }
    await pagina.screenshot({ path: `${OUT}/${id}.png`, fullPage: true });
    console.log(`captura:${id} ancho=${ancho} overflow=${metricas.desbordaBody} scroll=${metricas.scrollWidth} client=${metricas.clientWidth}`);
    await contexto.close();
  }
} finally {
  await navegador.close();
}
