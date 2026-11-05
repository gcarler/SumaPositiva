const fs=require('node:fs');
const {createRequire}=require('node:module');
const req=createRequire('/root/polis/package.json');
const {chromium}=req('playwright');
const assert=require('node:assert/strict');
const base='/tmp/polis_qa297_correcciones';
(async()=>{
 const resultado={inicio_utc:new Date().toISOString(),contexto:'Next standalone real compilado en copia aislada; API interceptada exclusivamente en navegador; no acceso a servicios productivos.'};
 const navegador=await chromium.launch({headless:true});
 try {
  const contexto=await navegador.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  const catalogo=JSON.parse(fs.readFileSync(base+'/catalogo_actual.json','utf8'));
  await contexto.route('**/api/v1/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/v1/indicadores/catalogo') {await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalogo)});return;}
   await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({detail:'Sesión anónima de laboratorio'})});
  });
  const pagina=await contexto.newPage();
  const errores=[],consola=[];
  pagina.on('pageerror',e=>errores.push(e.message));
  pagina.on('console',m=>{if(['error','warning'].includes(m.type()))consola.push(m.text());});
  const respuesta=await pagina.goto('http://127.0.0.1:43977/indicadores');
  assert.equal(respuesta.status(),200);
  const boton=pagina.getByRole('button',{name:'Ver metodología del indicador PERS_001',exact:true});
  await boton.waitFor();
  assert.equal(await pagina.locator('tbody > tr').count(),29);
  await boton.click();
  await pagina.locator('#metodologia-fila-PERS_001').waitFor();
  assert.equal(await pagina.locator('tbody > div').count(),0);
  await pagina.addScriptTag({path:req.resolve('axe-core/axe.min.js')});
  const axe=await pagina.evaluate(async()=>{const r=await window.axe.run(document);return {violaciones:r.violations.map(v=>({id:v.id,impacto:v.impact,nodos:v.nodes.map(n=>({html:n.html,resumen:n.failureSummary}))})),reglas_pasadas:r.passes.length};});
  assert.equal(errores.length,0,JSON.stringify(errores));
  assert.equal(axe.violaciones.filter(v=>['serious','critical'].includes(v.impacto)).length,0,JSON.stringify(axe.violaciones));
  assert.equal(consola.filter(x=>/hydration|validateDOMNesting|cannot be a child|cannot be a descendant/i.test(x)).length,0);
  await pagina.screenshot({path:base+'/browser/next_real.png'});
  Object.assign(resultado,{estado:'OK',status:respuesta.status(),filas:29,tbody_div:0,axe,errores,consola});
 } catch(error) {
  Object.assign(resultado,{estado:'ERROR',error:String(error)});
  process.exitCode=1;
 } finally {
  resultado.fin_utc=new Date().toISOString();
  fs.writeFileSync(base+'/browser/next_real.json',JSON.stringify(resultado,null,2));
  console.log(JSON.stringify(resultado,null,2));
  await navegador.close();
 }
})();
