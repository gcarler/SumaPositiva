/** Recorrido del artefacto Next real, con API redirigida únicamente al laboratorio. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { comprobarPuertosLibres } from '../../scripts/e2e-seguridad.mjs';

const root = process.cwd();
const server = process.env.POLIS303_FRONTEND_SERVER || path.join(root, '.next-cierre303b/standalone/server.js');
const salida = process.env.POLIS303_EVIDENCIA || path.join(root, 'bridge/303_evidencia_cierre');
const origen = 'http://127.0.0.1:18405';
const backend = 'http://127.0.0.1:18303';
const evidencia = { inicio_utc: new Date().toISOString(), servidor: server, origen, backend, casos: [], errores: [] };
let frontend, proxy, navegador;

async function esperar(url) {
  for (let intento = 0; intento < 100; intento++) {
    try { if ((await fetch(url)).ok) return; } catch { /* arranque */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Servicio de laboratorio no disponible: ${url}`);
}

try {
  assert(fs.statSync(server).isFile());
  await comprobarPuertosLibres([18404, 18405]);
  await esperar(`${backend}/api/v1/health/ready`);
  frontend = spawn('node', [server], { env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: '18404', POLIS_BACKEND_URL: backend }, stdio: 'ignore' });
  proxy = http.createServer((req, res) => {
    const api = req.url.startsWith('/api/v1/');
    const target = api ? 18303 : 18404;
    const siguiente = http.request({ hostname: '127.0.0.1', port: target, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${target}` } }, respuesta => {
      res.writeHead(respuesta.statusCode, respuesta.headers); respuesta.pipe(res);
    });
    siguiente.on('error', () => { res.writeHead(502); res.end('Servicio de laboratorio no disponible'); });
    req.pipe(siguiente);
  });
  await new Promise(resolve => proxy.listen(18405, '127.0.0.1', resolve));
  await esperar(`${origen}/marco-legal`);
  fs.mkdirSync(salida, { recursive: true });
  navegador = await chromium.launch({ headless: true });
  for (const ancho of [320, 768, 1440]) for (const tema of ['light', 'dark']) {
    const caso = { ancho, tema, pestañas: [], anclas: [], errores_pagina: [], errores_consola: [] };
    evidencia.casos.push(caso);
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 }, reducedMotion: 'reduce' });
    await contexto.addInitScript(modo => localStorage.setItem('theme', modo), tema);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', error => caso.errores_pagina.push(error.message));
    pagina.on('console', mensaje => { if (mensaje.type() === 'error') caso.errores_consola.push(mensaje.text()); });
    try {
      const respuesta = await pagina.goto(`${origen}/marco-legal`);
      assert.equal(respuesta.status(), 200);
      caso.csp = respuesta.headers()['content-security-policy'];
      assert(caso.csp.includes('https://accounts.google.com/gsi/style'));
      await pagina.getByRole('tab').first().waitFor();
      await pagina.waitForFunction(modo => document.documentElement.classList.contains('dark') === (modo === 'dark'), tema);
      await pagina.evaluate(() => document.fonts.ready);
      if (ancho < 640) {
        const compacto = pagina.getByRole('button', { name: 'Abrir menú de accesibilidad', exact: true });
        await compacto.waitFor();
        const caja = await compacto.boundingBox();
        assert(caja && caja.width <= 40 && caja.height <= 64 && caja.y > 450, 'El control compacto debe dejar libre el texto');
        await compacto.click();
        const barra = pagina.getByRole('navigation', { name: 'Menú de accesibilidad', exact: true });
        await barra.waitFor();
        await barra.getByRole('button', { name: 'Ocultar menú de accesibilidad', exact: true }).click();
        await compacto.waitFor();
        await pagina.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Abrir menú de accesibilidad');
        assert(await compacto.evaluate(el => el === document.activeElement), 'El foco debe regresar al control compacto');
        caso.accesibilidad_movil = 'compacta_expandible_y_foco_verificados';
      }
      caso.estilo = await pagina.evaluate(() => ({ fondo: getComputedStyle(document.body).backgroundColor, fuente: getComputedStyle(document.body).fontFamily, movimiento_reducido: matchMedia('(prefers-reduced-motion: reduce)').matches }));
      await pagina.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
      for (const indice of [0, 1, 2]) {
        await pagina.getByRole('tab').nth(indice).click();
        await pagina.waitForFunction(i => document.querySelectorAll('[role=tab]')[i]?.getAttribute('aria-selected') === 'true', indice);
        const estructura = await pagina.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
          return { ids_duplicados: ids.filter((id, i) => ids.indexOf(id) !== i),
            controles: [...document.querySelectorAll('[role=tab]')].every(el => document.getElementById(el.getAttribute('aria-controls'))),
            desborde_px: Math.max(0, document.documentElement.scrollWidth - innerWidth),
            secciones: [...document.querySelectorAll('main section[aria-labelledby]')].map(el => el.id) };
        });
        const a11y = await pagina.evaluate(async () => {
          const r = await window.axe.run(document);
          return r.violations.map(v => ({ id: v.id, impacto: v.impact, nodos: v.nodes.map(n => n.target) }));
        });
        caso.pestañas.push({ indice, ...estructura, axe: a11y });
        assert.equal(estructura.desborde_px, 0, 'Desbordamiento horizontal');
        assert.deepEqual(estructura.ids_duplicados, []);
        assert(estructura.controles);
        assert.equal(a11y.filter(v => ['serious', 'critical'].includes(v.impacto)).length, 0, `Axe: ${JSON.stringify(a11y)}`);
      }
      await pagina.getByRole('tab').first().click();
      const tabs = pagina.getByRole('tab');
      await tabs.first().focus();
      for (const [tecla, indice] of [['ArrowRight', 1], ['End', 2], ['ArrowRight', 0], ['ArrowLeft', 2], ['Home', 0]]) {
        await pagina.keyboard.press(tecla);
        await pagina.waitForFunction(i => document.querySelectorAll('[role=tab]')[i]?.getAttribute('aria-selected') === 'true', indice);
        assert(await tabs.nth(indice).evaluate(el => el === document.activeElement));
      }
      for (const ancla of ['distrital', 'constitucional', 'nacional', 'internacional', 'salvaguardas', 'fe-publica', 'datos-privacidad', 'gobernanza-tecnologica', 'ordenamiento-territorial', 'plataforma']) {
        await pagina.evaluate(id => { location.hash = id; }, ancla);
        await pagina.locator(`#${ancla}`).waitFor({ state: 'attached' });
        assert.equal(await pagina.locator(`#${ancla}`).count(), 1);
        caso.anclas.push(ancla);
      }
      await pagina.reload();
      await pagina.waitForFunction(() => document.querySelectorAll('[role=tab]')[2]?.getAttribute('aria-selected') === 'true');
      assert.equal(await pagina.locator('#fe-publica #plataforma').count(), 1);
      await pagina.evaluate(() => { location.hash = 'distrital'; });
      await pagina.locator('#distrital').waitFor();
      await pagina.evaluate(() => { location.hash = 'plataforma'; });
      await pagina.locator('#fe-publica').waitFor();
      await pagina.goBack();
      await pagina.locator('#distrital').waitFor();
      assert.equal(new URL(pagina.url()).hash, '#distrital');
      await pagina.goForward();
      await pagina.locator('#fe-publica').waitFor();
      assert.equal(new URL(pagina.url()).hash, '#plataforma');
      await pagina.getByRole('tab').first().click();
      assert(!(await pagina.locator('#distrital').innerText()).includes('Decreto Nacional 0037'));
      assert((await pagina.locator('#nacional').innerText()).includes('Decreto Nacional 0037'));
      const enlaces = await pagina.locator('a[aria-label^="Consultar fuente de"]').evaluateAll(els => els.map(el => el.href));
      assert(enlaces.length >= 10);
      assert(enlaces.every(url => url.startsWith('https://')));
      caso.enlaces_fuentes = enlaces;
      await pagina.evaluate(() => scrollTo(0, 0));
      await pagina.screenshot({ path: path.join(salida, `marco_legal_${ancho}_${tema}.png`) });
      assert.deepEqual(caso.errores_pagina, []);
      caso.estado = 'aprobado';
    } catch (error) {
      caso.estado = 'fallido'; caso.error = error.message;
      evidencia.errores.push({ ancho, tema, error: error.message });
      await pagina.screenshot({ path: path.join(salida, `fallo_marco_legal_${ancho}_${tema}.png`) }).catch(() => {});
    } finally { await contexto.close(); }
  }
} catch (error) { evidencia.errores.push({ error: error.message }); }
finally {
  if (navegador) await navegador.close();
  if (proxy) { proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
  if (frontend) frontend.kill('SIGTERM');
  evidencia.fin_utc = new Date().toISOString();
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, 'marco_legal_navegador.json'), JSON.stringify(evidencia, null, 2) + '\n');
  console.log(JSON.stringify({ casos: evidencia.casos.length, aprobados: evidencia.casos.filter(c => c.estado === 'aprobado').length, errores: evidencia.errores }));
}
if (evidencia.errores.length || evidencia.casos.length !== 6) process.exitCode = 1;
