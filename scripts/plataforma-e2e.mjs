// QA de la aplicación compilada. API interceptada: no modifica cuentas ni datos reales.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.POLIS_E2E_FRONTEND_URL ?? 'http://127.0.0.1:3103';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const dir = process.env.POLIS_E2E_EVIDENCIA_DIR ?? '/tmp/polis-plataforma-eaf/browser';
await mkdir(dir, { recursive: true });
const id = '10000000-0000-4000-8000-000000000001';
const permisos = ['formularios:gestionar', 'mesas:abrir', 'mesas:acuerdos', 'usuarios:leer', 'usuarios:gestionar', 'roles:gestionar', 'politicas:gestionar'];
const usuario = rol => ({ id, correo: 'qa@example.org', nombres: 'Equipo', apellidos: 'QA', codigo_rol: rol, permisos: rol === 'auditor_forense' ? ['usuarios:leer'] : permisos, activo: true, nivel_identidad: 'declarada', correo_verificado_en: null });
const login = rol => ({ token_acceso: 'token-qa-local', expira_en: new Date(Date.now() + 3600000).toISOString(), rol, permisos: usuario(rol).permisos, nivel_identidad: 'declarada', usuario: usuario(rol) });
const sesion = rol => ({ modo: rol === 'ciudadano' ? 'identidad' : 'institucional', usuarioId: id, usuario: usuario(rol), rol, permisos: usuario(rol).permisos, token: 'token-qa-local', expiraEn: login(rol).expira_en, desde: new Date().toISOString(), identidad: { nombre: 'Equipo QA', email: 'qa@example.org' } });
const rutas = ['', '/formularios', '/mesas', '/geovisor', '/usuarios', '/contenido', '/configuracion'];
const titulos = ['Dashboard', 'Formularios', 'Mesas comunitarias', 'Geovisor administrativo', 'Usuarios y Roles', 'Contenido de la política', 'Configuración'];
const accesos = { administrador_identidades: rutas, autoridad_distrital: ['', '/formularios', '/mesas', '/geovisor', '/contenido'], facilitador_mesa: ['', '/formularios', '/mesas'], auditor_forense: ['', '/formularios', '/mesas', '/geovisor', '/contenido', '/configuracion'] };
const browser = await chromium.launch({ headless: true });
const resultados = [], errores = [];
async function contexto(rol, { remoto = rol, estadoPerfil = 200, persistido = true, ancho = 1440, tema = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 900 }, reducedMotion: 'reduce' });
  await context.route('https://accounts.google.com/**', route => route.abort());
  await context.addInitScript(({ inicial, tema }) => {
    if (!sessionStorage.getItem('qa-inicializado')) {
      sessionStorage.setItem('qa-inicializado', '1');
      if (inicial) sessionStorage.setItem('polis-sesion-v2', JSON.stringify({ state: { sesion: inicial }, version: 0 }));
    }
    localStorage.setItem('theme', tema);
  }, { inicial: persistido && rol ? sesion(rol) : null, tema });
  await context.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let status = 200, data;
    if (path === '/identidad/perfil') { status = estadoPerfil; data = status === 200 ? usuario(remoto) : { detail: 'Sesión revocada' }; }
    else if (path === '/identidad/login') data = login(remoto);
    else if (path === '/identidad/logout') data = { mensaje: 'Sesión cerrada' };
    else if (path === '/identidad/usuarios') data = { total: 1, elementos: [usuario(remoto)] };
    else if (path === '/identidad/sesiones') data = [];
    else if (path === '/politicas/fases') data = [{ id, nombre: 'Diagnóstico QA', codigo: 'diagnostico', estado: 'en_curso', progreso_porcentaje: 25, reglas_participacion: {} }];
    else if (path === '/politicas/lineas') data = [{ id, titulo: 'Línea QA', descripcion: 'Inclusión territorial', fase_id: id, entidad_lider: 'Equipo QA' }];
    else if (path === '/aportes') data = { total: 1, elementos: [{ id, titulo: 'Alerta QA', tipo_aporte: 'alerta_comunitaria', estado: 'recibido', creado_en: new Date().toISOString() }] };
    else if (path === '/geodatos/territorios') data = [{ id, nombre: 'Territorio QA', codigo: 'QA', tipo_territorio: 'barrio', poblacion_estimada: 1200 }];
    else if (path === '/geodatos/territorios/geojson') data = { type: 'FeatureCollection', features: [{ type: 'Feature', id, properties: { id, nombre: 'Territorio QA', codigo: 'QA', tipo_territorio: 'barrio' }, geometry: { type: 'Polygon', coordinates: [[[-75.5, 10.4], [-75.49, 10.4], [-75.49, 10.41], [-75.5, 10.4]]] } }] };
    else { status = 404; data = { detail: 'No hay fixture para esta ruta' }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errores.push(error.message));
  return { context, page };
}
async function revisar(page, etiqueta) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impacto: v.impact, elementos: v.nodes.map(n => n.target) })));
  const overflow = await page.evaluate(() => ({ ancho: innerWidth, contenido: document.documentElement.scrollWidth, exceden: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map(e => e.tagName + '.' + e.className) }));
  resultados.push({ caso: etiqueta, axe, overflow });
  console.log(etiqueta);
  assert.deepEqual(axe, [], `Accesibilidad: ${etiqueta}`);
  assert(overflow.contenido <= overflow.ancho, `Reflujo: ${etiqueta}: ${JSON.stringify(overflow)}`);
}
try {
  for (const [rol, permitidas] of Object.entries(accesos)) {
    const { context, page } = await contexto(rol);
    await page.goto(`${base}/plataforma`, { waitUntil: 'networkidle' });
    const nav = page.getByRole('navigation', { name: 'Navegación de plataforma' });
    for (const ruta of rutas) {
      assert.equal(await nav.locator(`a[href="/plataforma${ruta}"]`).count(), permitidas.includes(ruta) ? 1 : 0, `${rol}: menú ${ruta}`);
      await page.goto(`${base}/plataforma${ruta}`, { waitUntil: 'networkidle' });
      if (permitidas.includes(ruta)) {
        await page.getByRole('heading', { level: 1, name: titulos[rutas.indexOf(ruta)], exact: true }).waitFor();
        if (['facilitador_mesa', 'auditor_forense'].includes(rol) && ruta === '/formularios') assert.equal(await page.getByRole('button', { name: 'Nuevo formulario', exact: true }).count(), 0);
        if (rol === 'auditor_forense' && ruta === '/mesas') assert.equal(await page.getByRole('button', { name: 'Crear mesa', exact: true }).count(), 0);
      } else await page.waitForURL(`${base}/plataforma`);
    }
    resultados.push({ caso: `Menú y guardas de las siete rutas: ${rol}`, resultado: 'aprobado' });
    await context.close();
  }
  for (const rol of [null, 'ciudadano']) {
    const { context, page } = await contexto(rol);
    await page.goto(`${base}/plataforma/formularios`, { waitUntil: 'networkidle' });
    await page.waitForURL(url => url.pathname === '/');
    if (!rol) await page.getByRole('dialog', { name: 'Iniciar sesión' }).waitFor();
    assert.equal(await page.getByRole('link', { name: /Ir a la Plataforma/ }).count(), 0);
    resultados.push({ caso: `Acceso privado rechazado: ${rol ?? 'sin sesión'}`, resultado: 'aprobado' });
    await context.close();
  }
  for (const opciones of [{ remoto: 'ciudadano' }, { estadoPerfil: 401 }]) {
    const { context, page } = await contexto('administrador_identidades', opciones);
    await page.goto(`${base}/plataforma`, { waitUntil: 'networkidle' });
    await page.waitForURL(url => url.pathname === '/');
    resultados.push({ caso: `Perfil remoto prevalece: ${JSON.stringify(opciones)}`, resultado: 'aprobado' });
    await context.close();
  }
  for (const rol of ['administrador_identidades', 'ciudadano']) {
    const { context, page } = await contexto(rol, { persistido: false });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Correo electrónico/).fill('qa@example.org');
    await dialog.getByLabel(/^Contraseña/).fill('ClaveQA2026*');
    await dialog.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
    if (rol !== 'ciudadano') {
      await page.waitForURL(`${base}/plataforma`);
      await page.getByRole('heading', { level: 1, name: titulos[0] }).waitFor();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('link', { name: 'Volver al portal', exact: true }).click();
      await page.waitForURL(`${base}/`);
      await page.getByRole('link', { name: /Ir a la Plataforma/ }).click();
      await page.waitForURL(`${base}/plataforma`);
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/');
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor();
    } else {
      await page.getByRole('button', { name: /Sesión: Equipo QA/ }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await page.getByRole('link', { name: /Ir a la Plataforma/ }).count(), 0);
    }
    resultados.push({ caso: `Login email, navegación opt-in y logout: ${rol}`, resultado: 'aprobado' });
    await context.close();
  }
  for (const ancho of [320, 1440]) for (const tema of ['light', 'dark']) {
    const { context, page } = await contexto('administrador_identidades', { ancho, tema });
    for (const ruta of rutas) {
      await page.goto(`${base}/plataforma${ruta}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { level: 1, name: titulos[rutas.indexOf(ruta)], exact: true }).waitFor();
      if (ancho === 320) await page.getByRole('button', { name: 'Mostrar navegación interna' }).click();
      await revisar(page, `${ruta || 'dashboard'} ${ancho}px ${tema}`);
      if (!ruta && ancho === 320) await page.screenshot({ path: `${dir}/dashboard-${tema}-320.png`, fullPage: true });
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Ir a la Plataforma/ }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    await revisar(page, `Portal opt-in ${ancho}px ${tema}`);
    await context.close();
  }
  assert.deepEqual(errores, []);
  console.log(`${resultados.length} casos aprobados; 0 errores JS. API interceptada, sin escrituras reales.`);
} finally {
  await writeFile(`${dir}/resultados.json`, JSON.stringify({ api: 'interceptada; sin escrituras reales', resultados, errores_js: errores }, null, 2));
  await browser.close();
}
