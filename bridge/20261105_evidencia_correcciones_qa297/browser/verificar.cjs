const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire('/root/polis/package.json');
const { chromium } = req('playwright');
const base = '/tmp/polis_qa297_correcciones';
const staticDir = path.join(base, 'frontend_build/.next/static');
const catalogo = JSON.parse(fs.readFileSync(path.join(base, 'catalogo_actual.json'), 'utf8'));
let modo = 'ok';
const solicitudes = [];
const servidor = http.createServer((peticion, respuesta) => {
  const url = new URL(peticion.url, 'http://127.0.0.1');
  if (url.pathname === '/api/v1/indicadores/catalogo') {
    solicitudes.push({utc: new Date().toISOString(), modo, url: url.pathname + url.search});
    respuesta.setHeader('Content-Type', 'application/json');
    if (modo === 'error') {
      respuesta.statusCode = 503;
      respuesta.end(JSON.stringify({detail:'Error simulado exclusivamente en laboratorio local'}));
      return;
    }
    const d=url.searchParams.get('dimension');
    const t=url.searchParams.get('tier');
    const b=(url.searchParams.get('busqueda') || '').toLowerCase();
    const indicadores=catalogo.indicadores.filter(x => (!d || x.dimension===d) && (!t || x.tier===t) && (!b || Object.values(x).join(' ').toLowerCase().includes(b)));
    respuesta.end(JSON.stringify({...catalogo,total:indicadores.length,indicadores}));
    return;
  }
  if (url.pathname === '/entry.js') {
    respuesta.setHeader('Content-Type','application/javascript');
    respuesta.end(fs.readFileSync(path.join(base,'browser/entry.js')));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    const ruta=path.resolve(staticDir, url.pathname.slice('/_next/static/'.length));
    if (!ruta.startsWith(staticDir+path.sep) || !fs.existsSync(ruta)) {respuesta.statusCode=404;respuesta.end();return;}
    respuesta.setHeader('Content-Type',ruta.endsWith('.css')?'text/css':'application/octet-stream');
    respuesta.end(fs.readFileSync(ruta));
    return;
  }
  if (url.pathname === '/favicon.ico') {respuesta.statusCode=204;respuesta.end();return;}
  const css=fs.readdirSync(path.join(staticDir,'css')).filter(x=>x.endsWith('.css')).map(x=>`<link rel="stylesheet" href="/_next/static/css/${x}">`).join('');
  respuesta.setHeader('Content-Type','text/html; charset=utf-8');
  respuesta.end(`<!doctype html><html lang="es" class="${url.searchParams.get('theme')==='dark'?'dark':''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Verificación local de correcciones QA297</title>${css}</head><body class="bg-background text-foreground font-sans"><div id="root"></div><script>globalThis.process={env:{NODE_ENV:'development'}};</script><script src="/entry.js"></script></body></html>`);
});

(async()=>{
  const resultado={inicio_utc:new Date().toISOString(), contexto:'Componente React real y catálogo CSV actual; CSS de compilación Next aislada; API simulada localmente; sin shell completo de Next ni backend productivo.',casos:[],solicitudes};
  let navegador;
  try {
    await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
    const origen=`http://127.0.0.1:${servidor.address().port}`;
    navegador=await chromium.launch({headless:true});
    for (const ancho of [1440,320]) {
      for (const tema of ['light','dark']) {
        const pagina=await navegador.newPage({viewport:{width:ancho,height:900},reducedMotion:'reduce'});
        const errores=[];
        pagina.on('pageerror',e=>errores.push(e.message));
        await pagina.goto(`${origen}/?theme=${tema}`);
        const boton=pagina.getByRole('button',{name:'Ver metodología del indicador PERS_001',exact:true});
        await boton.waitFor();
        await pagina.evaluate(()=>document.fonts.ready);
        assert.equal(await pagina.locator('tbody > tr').count(),29);
        assert.equal(await pagina.locator('tbody > div').count(),0);
        await pagina.screenshot({path:path.join(base,`browser/catalogo_${ancho}_${tema}.png`)});
        await boton.focus();
        await pagina.keyboard.press('Enter');
        await pagina.locator('#metodologia-fila-PERS_001').waitFor();
        await pagina.screenshot({path:path.join(base,`browser/detalle_${ancho}_${tema}.png`)});
        await pagina.addScriptTag({path:req.resolve('axe-core/axe.min.js')});
        const axe=await pagina.evaluate(async()=>{
          const r=await window.axe.run(document);
          return {violaciones:r.violations.map(v=>({id:v.id,impacto:v.impact,nodos:v.nodes.map(n=>({html:n.html,resumen:n.failureSummary}))})),reglas_pasadas:r.passes.length,incompletas:r.incomplete.map(v=>v.id)};
        });
        const dimensiones=await pagina.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,background:getComputedStyle(document.body).backgroundColor}));
        assert.ok(dimensiones.scroll<=ancho,JSON.stringify(dimensiones));
        assert.equal(errores.length,0,JSON.stringify(errores));
        assert.equal(axe.violaciones.filter(v=>['serious','critical'].includes(v.impacto)).length,0,JSON.stringify(axe.violaciones));
        assert.equal(axe.violaciones.filter(v=>['definition-list','dlitem'].includes(v.id)).length,0);
        resultado.casos.push({ancho,tema,movimiento:'reduce',filas:29,tbody_div:0,dimensiones,axe,errores});
        await pagina.getByRole('button',{name:'Ocultar metodología del indicador PERS_001',exact:true}).focus();
        await pagina.keyboard.press('Space');
        assert.equal(await pagina.locator('#metodologia-fila-PERS_001').count(),0);
        await pagina.close();
      }
    }
    modo='error';
    const pagina=await navegador.newPage({viewport:{width:1440,height:900}});
    await pagina.goto(origen);
    await pagina.getByRole('alert').waitFor({timeout:20000});
    assert.equal(await pagina.getByText('Consultando catálogo…',{exact:true}).count(),0);
    resultado.error_503={alertas:await pagina.getByRole('alert').count(),consultando:0};
    resultado.estado='OK';
  } catch (error) {
    resultado.estado='ERROR';
    resultado.error=String(error);
    process.exitCode=1;
  } finally {
    resultado.fin_utc=new Date().toISOString();
    fs.writeFileSync(path.join(base,'browser/resultado.json'),JSON.stringify(resultado,null,2));
    console.log(JSON.stringify(resultado,null,2));
    if (navegador) await navegador.close();
    await new Promise(resolve=>servidor.close(resolve));
  }
})();
