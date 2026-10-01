import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();const resultado={fecha:new Date().toISOString(),url:'http://127.0.0.1:3000/',api:'Intercepción completa; no se escriben respuestas en la API',casos:[],errores:[]};
try{for(const width of [320,1440]){
 const p=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});p.on('pageerror',e=>resultado.errores.push(e.message));
 await p.route('**/api/v1/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
 const res=await p.goto(resultado.url);assert.equal(res.status(),200);await p.getByRole('button',{name:'Formularios',exact:true}).click();await p.getByRole('dialog',{name:'Catálogo de Formularios'}).waitFor();
 assert.equal(await p.getByRole('button',{name:'Crear Formulario',exact:true}).count(),0);
 assert.equal(await p.getByRole('button',{name:'Responder',exact:true}).count(),2);
 await p.getByRole('button',{name:'Responder',exact:true}).first().click();await p.getByRole('dialog',{name:'Diagnóstico de Seguridad en mi Barrio'}).waitFor();
 await p.getByRole('combobox',{name:/En qué barrio/}).click();await p.getByRole('option',{name:'BOCAGRANDE',exact:true}).click();await p.getByRole('radio',{name:'Hurto',exact:true}).click();await p.getByRole('button',{name:'Siguiente'}).click();await p.getByRole('radio',{name:'4',exact:true}).click();await p.getByRole('radio',{name:'Sí',exact:true}).click();await p.getByRole('button',{name:'Enviar respuestas',exact:true}).click();await p.getByText('Respuesta de prueba recibida',{exact:true}).waitFor();
 const ancho=await p.evaluate(()=>document.documentElement.scrollWidth);assert.ok(ancho<=width+1);resultado.casos.push({ancho:width,http:res.status(),catalogo_ciudadano:true,envio_local_confirmado:true,reflujo:ancho});
 await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.getByRole('button',{name:'Formularios',exact:true}).click();await p.getByRole('dialog',{name:'Catálogo de Formularios'}).waitFor();await p.getByRole('button',{name:'Responder',exact:true}).first().click();await p.getByText('Ya respondiste este formulario en esta sesión.',{exact:true}).waitFor();
 await p.screenshot({path:'/tmp/polis-formularios-eaf/produccion-'+width+'.png'});await p.close();console.log('Producción verificada',width);
}assert.equal(resultado.errores.length,0);}catch(e){resultado.fallo=e.stack;console.error(e);process.exitCode=1;}finally{await writeFile('/tmp/polis-formularios-eaf/produccion.json',JSON.stringify(resultado,null,2));await browser.close();}
