import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const results={fecha:new Date().toISOString(),entorno:'Componentes reales, API interceptada, Chromium, movimiento reducido',casos:[],errores:[]};
const browser=await chromium.launch();
const destination=process.argv[2]||'/tmp/polis-remediacion/interacciones.json';
async function verify(page,id,theme,width){
 const data=await page.evaluate(async()=>{
  const panel=document.querySelector('[data-slot="side-panel"]:not([inert])');
  const root=panel||document.querySelector('main');
  const axe=await window.axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
  const regions=[root,...root.querySelectorAll('[role="region"]')].map(e=>({nombre:e.getAttribute('aria-label')||e.tagName,ancho:e.clientWidth,contenido:e.scrollWidth}));
  const controls=[...root.querySelectorAll('input:not([type="hidden"]),textarea,button[role="combobox"]')].filter(e=>e.getClientRects().length).map(e=>({id:e.id,etiqueta:[...(e.labels||[])].map(l=>l.textContent.trim()).join('|'),aria_label:e.getAttribute('aria-label')}));
  return {regiones:regions,desbordamientos:[...root.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+.5).map(e=>({tag:e.tagName,clase:e.className,texto:e.textContent.slice(0,80),derecha:e.getBoundingClientRect().right,ancho:e.clientWidth,contenido:e.scrollWidth})),controles:controls,ancho_documento:document.documentElement.scrollWidth,ancho_ventana:innerWidth,infracciones:axe.violations.map(v=>({id:v.id,nodos:v.nodes.map(n=>n.target)}))};
 });
 results.casos.push({id,tema:theme,ancho:width,...data});
 assert.equal(data.infracciones.length,0,id+' axe');
 assert.ok(data.ancho_documento<=width+1,id+' documento');
 for(const r of data.regiones)assert.ok(r.contenido<=r.ancho+1,id+' desbordamiento '+JSON.stringify(r));
 for(const c of data.controles)assert.ok(c.etiqueta||c.aria_label,id+' control sin etiqueta '+c.id);
}
try{
 for(const theme of ['light','dark'])for(const width of [320,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>results.errores.push(e.message));
  await page.route('**/api/v1/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.startsWith('/api/v1/testimonios')){
    const body=path.endsWith('/resumen')?{total_testimonios:1,aprobados:1,destacados:1,pendientes:0,rechazados:0,por_territorio:[{territorio_id:'t1',nombre:'Localidad Histórica y del Caribe Norte',total_testimonios:1}]}:[{id:'00000000-0000-4000-8000-000000000010',codigo_unico:'TEST-LOCAL',nombre_autor:'Persona de prueba comunitaria',organizacion_comunitaria:'Organización comunitaria de prueba',titulo:'Relato ficticio para comprobar el reflujo',relato:'Datos ficticios; no se escribe a servicios reales durante la verificación.',estado:'DESTACADO',territorio_nombre:'Localidad Histórica y del Caribe Norte',dimension_nombre:'Participación',creado_en:'2026-10-01T00:00:00Z',actualizado_en:'2026-10-01T00:00:00Z',metadatos_enfoque:{}}];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   }else await route.fulfill({status:401,contentType:'application/json',body:'{"detail":"Prueba aislada"}'});
  });
  await page.goto('http://127.0.0.1:3199');await page.waitForFunction(()=>window.audit);
  await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);
  await page.addScriptTag({path:'/root/polis/node_modules/axe-core/axe.min.js'});
  await page.evaluate(()=>window.audit.open('formulario-editor',{}));await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'Añadir Pregunta'}).click();await page.getByLabel('Enunciado (1)',{exact:true}).fill('¿Qué propone para la comunidad?');
  await page.getByRole('button',{name:'Añadir Pregunta'}).click();await page.getByLabel('Enunciado (2)',{exact:true}).fill('¿Cómo participa?');
  const ids=await page.locator('[data-slot=side-panel] input').evaluateAll(inputs=>inputs.map(e=>e.id));assert.equal(new Set(ids).size,ids.length);
  await page.getByLabel('Requerida',{exact:true}).first().click();assert.equal(await page.getByLabel('Requerida',{exact:true}).first().isChecked(),true);
  await verify(page,'formulario-con-dos-preguntas',theme,width);
  await page.evaluate(()=>{window.audit.close();window.audit.open('escenario-editor',{});});await page.getByRole('dialog').waitFor();
  for(const label of ['Título del Escenario','Fecha','Entidad Convocante','Hombres','Mujeres','Otros','Víctimas (Ley 1448)','Discapacidad (Ley 1618)'])assert.equal(await page.getByLabel(label,{exact:true}).count(),1);
  await page.getByRole('combobox',{name:'Tipo de Escenario'}).focus();await page.keyboard.press('Space');await page.getByRole('option',{name:'Taller Juvenil'}).click();
  await verify(page,'escenario-con-seleccion',theme,width);
  await page.evaluate(()=>{window.audit.close();window.audit.login();window.audit.open('testimonios-galeria',{});});await page.getByRole('dialog').waitFor();await page.getByText('Persona de prueba comunitaria',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Filtrar testimonios por territorio'}).focus();await page.keyboard.press('Space');await page.getByRole('option',{name:/Localidad Histórica/}).click();
  const featured=page.getByRole('button',{name:'Solo Destacados'});await featured.click();assert.equal(await featured.getAttribute('aria-pressed'),'true');
  await page.getByText('Persona de prueba comunitaria',{exact:true}).waitFor();await verify(page,'galeria-institucional-destacados',theme,width);
  if(width===320)await page.screenshot({path:'/tmp/polis-remediacion/galeria-'+theme+'-320.png'});
  await page.evaluate(()=>{window.audit.close();window.audit.logout();window.audit.view('geovisor');});
  const buttons=page.getByRole('button',{name:/^Explorar territorio:/});await buttons.first().waitFor();
  const count=await buttons.count();assert.ok(count>0);
  for(let i=0;i<count;i++){
   const button=buttons.nth(i);await button.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await button.evaluate(e=>document.activeElement===e),true);
   await page.keyboard.press('Space');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await button.evaluate(e=>document.activeElement===e),true);
  }
  await verify(page,'mapa-enter-espacio-escape-retorno',theme,width);
  await page.evaluate(()=>window.audit.view('mesas'));await page.waitForTimeout(250);await verify(page,'mesas-320',theme,width);
  await page.close();console.log('Verificación dirigida aprobada',theme,width);
 }
 assert.equal(results.errores.length,0);
}catch(e){results.fallo=e.stack;process.exitCode=1;console.error(e);}
finally{await writeFile(destination,JSON.stringify(results,null,2));await browser.close();}
