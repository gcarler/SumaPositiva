import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:6006";
const OUT = "src/features/proyectos/evidencia";
mkdirSync(OUT, { recursive: true });

const tomas = [
  { id: "proyectos-carga", story: "plataforma-proyectos--proyectos-cargando", vp: { width: 1280, height: 900 } },
  { id: "proyectos-error", story: "plataforma-proyectos--proyectos-error", vp: { width: 1280, height: 900 }, play: true },
  { id: "proyectos-vacio", story: "plataforma-proyectos--proyectos-vacio", vp: { width: 1280, height: 900 }, play: true },
  { id: "proyectos-ventana-larga-mes", story: "plataforma-proyectos--proyectos-ventana-larga-calendario", vp: { width: 1280, height: 900 }, play: true },
  { id: "proyectos-mobile-320", story: "plataforma-proyectos--proyectos-ventana-larga-calendario", vp: { width: 320, height: 800 }, play: true },
  { id: "proyectos-oscuro", story: "plataforma-proyectos--proyectos-ventana-larga-calendario", vp: { width: 1280, height: 900 }, play: true, dark: true },
  { id: "integradora-gantt", story: "plataforma-administración-interna--proyectos-gestion", vp: { width: 1280, height: 900 }, espera: 12000, gantt: true },
  { id: "integradora-kanban", story: "plataforma-administración-interna--proyectos-gestion", vp: { width: 1280, height: 900 }, espera: 12000, kanban: true },
  { id: "integradora-lista", story: "plataforma-administración-interna--proyectos-gestion", vp: { width: 1280, height: 900 }, espera: 12000, lista: true },
];

const navegador = await chromium.launch();
try {
  for (const t of tomas) {
    const contexto = await navegador.newContext({ viewport: t.vp });
    const pagina = await contexto.newPage();
    const globals = t.dark ? "&globals=theme:dark" : "";
    await pagina.goto(
      `${BASE}/iframe.html?id=${encodeURIComponent(t.story)}&viewMode=story${globals}`,
      { waitUntil: "networkidle", timeout: 60000 },
    );
    await pagina.waitForTimeout(t.espera ?? 4000);

    // El play del control "proyectos-gestion" deja la Lista filtrada por
    // "Plan de Acción"; se devuelve el filtro a "Todos los módulos" para
    // capturar el pan completo en cada pestaña.
    if (t.espera) {
      const filtro = pagina.locator('[aria-label="Filtrar por módulo"]');
      if (await filtro.count()) {
        await filtro.click();
        const todos = pagina.getByRole("option", { name: "Todos los módulos" });
        if (await todos.count()) {
          await todos.click();
          await pagina.waitForTimeout(800);
        } else {
          await pagina.keyboard.press("Escape");
        }
      }
    }
    if (t.gantt || t.kanban || t.lista) {
      const vista = await pagina.getByRole("tab", { name: t.gantt ? "Gantt" : t.kanban ? "Kanban" : "Lista" }).elementHandle();
      await vista?.click();
      await pagina.waitForTimeout(1500);
    }
    await pagina.screenshot({ path: `${OUT}/${t.id}.png`, fullPage: true });
    await contexto.close();
    console.log("captura:", t.id);
  }
} finally {
  await navegador.close();
}
