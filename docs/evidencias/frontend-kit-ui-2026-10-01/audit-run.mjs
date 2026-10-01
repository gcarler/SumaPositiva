import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const results={fecha:new Date().toISOString(),entorno:'Vite con componentes reales de src; API totalmente interceptada; sin escrituras externas',casos:[],interacciones:[],errores_js:[]};
const cases=[['politica',{politicaId:'pol-001'}],['fase',{politicaId:'pol-001',faseId:'fase-001-1'}],['linea',{politicaId:'pol-001',faseId:'fase-001-1',lineaId:'lin-001-1-1'}],['aporte',{politicaId:'pol-001',faseId:'fase-001-1',lineaId:'lin-001-1-1'}],['sesion',{}],['usuarios',{}],['mesa',{mesaId:'mesa-001'}],['papelografo',{mesaId:'mesa-001',submesaId:'sm-001-1',arbol:'problemas'}],['mesa-editor',{}],['territorio',{territorioId:'t1'}],['formularios',{}],['formulario-editor',{}],['formulario-editor-editar',{formularioId:'f1'}],['formulario-analitica',{formularioId:'f1'}],['participacion-multicanal',{}],['escenario-editor',{}],['testimonios-galeria',{}],['testimonio-editor',{}],['testimonios-moderacion',{}]];
if(process.argv.includes('--interacciones')){const old=JSON.parse(await readFile('/tmp/polis-auditoria-frontend/resultados.json','utf8'));results.casos=old.casos;results.errores_js=old.errores_js;}
const requests=[];
async function setup(width,theme){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>results.errores_js.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const req=route.request();requests.push({url:new URL(req.url()).pathname,method:req.method()});const path=new URL(req.url()).pathname;let body;let status=401;
  if(path.startsWith('/api/v1/identidad')){
   status=200;const admin=await page.evaluate(()=>window.audit.admin);
   if(path.endsWith('/usuarios'))body={total:1,elementos:[admin]};else if(path.endsWith('/roles'))body=[{id:admin.rol_id,codigo:admin.codigo_rol,nombre:'Autoridad de auditoría',permisos:admin.permisos,sistema:true}];else if(path.endsWith('/permisos'))body=Object.fromEntries(admin.permisos.map(p=>[p,p]));else if(path.endsWith('/sesiones')||path.endsWith('/eventos'))body=[];else body=admin;
  }else if(path.startsWith('/api/v1/testimonios')){status=200;body=path.endsWith('/resumen')?{total_testimonios:1,aprobados:1,destacados:0,pendientes:1,rechazados:0,por_territorio:[]}: [{id:'00000000-0000-4000-8000-000000000010',codigo_unico:'TEST-LOCAL',nombre_autor:'Prueba Local',titulo:'Relato de auditoría',relato:'Contenido exclusivamente ficticio para auditoría de accesibilidad.',estado:'PENDIENTE',motivo_moderacion:'Motivo de prueba',metadatos_enfoque:{},creado_en:'2026-10-01T00:00:00Z',actualizado_en:'2026-10-01T00:00:00Z'}];}else body={detail:'Respuesta 401 controlada por auditoría'};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:3199');await page.waitForFunction(()=>!!window.audit);
 await page.evaluate(t=>{document.documentElement.classList.toggle('dark',t==='dark');},theme);
 await page.addScriptTag({path:'/root/polis/node_modules/axe-core/axe.min.js'});
 return page;
}
async function capture(page,id,theme,width,scope='body'){
 if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:'/root/polis/node_modules/axe-core/axe.min.js'});
 const audit=await page.evaluate(async scope=>{
  const root=document.querySelector(scope);const axe=await window.axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
  const regions=[...document.querySelectorAll('[data-slot=side-panel], [data-slot=side-panel] [role=region], main')].filter(e=>e.getClientRects().length && !e.closest('[inert]')).map(e=>({elemento:e.getAttribute('aria-label')||e.tagName,ancho:e.clientWidth,contenido:e.scrollWidth,overflow:getComputedStyle(e).overflowX}));
  const labels=[...root.querySelectorAll('input:not([type=hidden]),textarea,button[role=combobox]')].filter(e=>e.getClientRects().length).map(e=>({tipo:e.type||e.getAttribute('role'),id:e.id,label:[...(e.labels||[])].map(l=>l.textContent.trim()).join('|'),aria_label:e.getAttribute('aria-label'),placeholder:e.getAttribute('placeholder')}));
  return {infracciones:axe.violations.map(v=>({id:v.id,impacto:v.impact,criterios:v.tags.filter(t=>t.startsWith('wcag')),descripcion:v.description,nodos:v.nodes.map(n=>({target:n.target,html:n.html,resumen:n.failureSummary}))})),incompletos:axe.incomplete.map(v=>({id:v.id,nodos:v.nodes.length})),regiones:regions,ancho_documento:document.documentElement.scrollWidth,ancho_ventana:innerWidth,labels};
 },scope);
 results.casos.push({id,tema:theme,ancho:width,...audit});
}
try{
 for(const theme of process.argv.includes('--interacciones')?[]:['light','dark']) for(const width of [320,1440]){
  const page=await setup(width,theme);
  for(const view of process.argv.includes('--testimonios')?[]:['inicio','explorar','mesas','geovisor']){
   await page.evaluate(v=>window.audit.view(v),view);await page.waitForTimeout(350);await capture(page,'vista-'+view,theme,width);
  }
  await page.evaluate(()=>window.audit.view('inicio'));
  for(const [id,props] of process.argv.includes('--testimonios')?cases.filter(([id])=>id.startsWith('testimo')):cases){
   await page.evaluate(({id,props})=>{window.audit.close();if(id==='usuarios')window.audit.login();else window.audit.logout();window.audit.open(id==='formulario-editor-editar'?'formulario-editor':id,props);},{id,props});
   await page.getByRole('dialog').waitFor({state:'visible'});await page.waitForTimeout(300);await capture(page,id,theme,width,'[data-slot=side-panel]');
   if(id==='formulario-editor-editar')results.interacciones.push({id:'preguntas-edicion-'+theme+'-'+width,valor:await page.getByText('No hay preguntas configuradas').count(),esperado:'f1 tiene dos preguntas en el fallback; deben cargarse'});
   if(width===320&&theme==='light'&&['formulario-editor','escenario-editor','formularios','participacion-multicanal','papelografo'].includes(id))await page.screenshot({path:'/tmp/polis-auditoria-frontend/'+id+'-320.png',fullPage:false});
   await page.evaluate(()=>window.audit.close());await page.waitForTimeout(50);
  }
  await page.close();console.log('Condición completada',theme,width);
 }
 if(process.argv.includes('--testimonios')){await writeFile('/tmp/polis-auditoria-frontend/resultados-testimonios-cierre.json',JSON.stringify(results,null,2));process.exitCode=0;await browser.close();process.exit(0);}
 const page=await setup(1440,'light');await page.evaluate(()=>window.audit.login());await page.waitForTimeout(300);
 const aside=page.locator('aside');const a=await aside.boundingBox();
 await page.getByRole('button',{name:'Alternar navegación lateral'}).click();results.interacciones.push({id:'sidebar-trigger',ancho_antes:a.width,ancho_despues:(await aside.boundingBox()).width});
 await page.getByRole('button',{name:'Contraer menú institucional'}).click();await page.waitForTimeout(200);
 await page.getByRole('button',{name:'Formularios y Consultas',exact:true}).click();await page.waitForTimeout(100);
 results.interacciones.push({id:'sidebar-iconos-formularios',paneles:await page.evaluate(()=>window.audit.entries().length),submodulos_visibles:await page.getByRole('button',{name:'Formularios Activos',exact:true}).count()});
 await page.getByRole('button',{name:'Expandir menú institucional'}).click();
 const acc=page.getByRole('button',{name:'Formularios y Consultas',exact:true});results.interacciones.push({id:'sidebar-acordeon',aria_expanded:await acc.getAttribute('aria-expanded'),aria_controls:await acc.getAttribute('aria-controls')});
 const bound=await aside.boundingBox();await page.mouse.move(bound.x+bound.width-2,bound.y+300);await page.mouse.down();await page.mouse.move(450,bound.y+300);await page.mouse.up();await page.waitForTimeout(180);
 results.interacciones.push({id:'sidebar-resize',ancho:(await aside.boundingBox()).width,separadores_teclado:await aside.getByRole('separator').count()});
 await page.getByRole('button',{name:'Ocultar menú institucional'}).click();await page.getByRole('button',{name:'Abrir menú institucional'}).click();results.interacciones.push({id:'sidebar-oculto-restaurar',aside_visible:await aside.isVisible()});
 await page.evaluate(()=>{window.audit.logout();window.audit.open('formulario-editor',{});});await page.getByRole('dialog').waitFor();const before=requests.filter(r=>r.method==='POST').length;
 await page.getByRole('button',{name:'Guardar Formulario',exact:true}).click();results.interacciones.push({id:'guardar-formulario',solicitudes_POST:requests.filter(r=>r.method==='POST').length-before});
 await page.evaluate(()=>{window.audit.close();window.audit.open('escenario-editor',{});});await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Guardar Escenario',exact:true}).click();results.interacciones.push({id:'guardar-escenario',solicitudes_POST:requests.filter(r=>r.method==='POST').length-before});
 await page.evaluate(()=>window.audit.close());const opener=page.getByRole('button',{name:'Abrir panel de sesión',exact:true});await opener.click();await page.getByRole('dialog').waitFor();
 results.interacciones.push({id:'host-foco-inicial',foco:await page.evaluate(()=>document.activeElement?.getAttribute('role')),fondo_inert:await page.locator('#polis-application').evaluate(e=>e.inert)});
 await page.keyboard.press('Shift+Tab');const last=await page.evaluate(()=>document.activeElement?.textContent);await page.keyboard.press('Tab');const first=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));await page.keyboard.press('Escape');await page.waitForTimeout(60);
 results.interacciones.push({id:'host-tab-escape-retorno',ultimo:last,primero:first,retorno:await opener.evaluate(e=>document.activeElement===e),fondo_inert:await page.locator('#polis-application').evaluate(e=>e.inert)});
 await page.setViewportSize({width:320,height:800});await page.evaluate(()=>window.audit.login());await page.waitForTimeout(300);await page.getByRole('button',{name:'Abrir cuenta y administración'}).click();await page.getByRole('dialog').waitFor();results.interacciones.push({id:'sidebar-movil',acceso_formularios:await page.getByRole('button',{name:'Formularios Activos',exact:true}).count(),panel:await page.getByRole('dialog').getAttribute('aria-label')});
 await page.close();
}catch(e){results.error_ejecucion=e.stack;console.error(e.stack);}finally{await writeFile('/tmp/polis-auditoria-frontend/resultados.json',JSON.stringify(results,null,2));await browser.close();console.log('Casos',results.casos.length,'infracciones',results.casos.reduce((a,c)=>a+c.infracciones.length,0));}
