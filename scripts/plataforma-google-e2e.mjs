import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
// Ejecutar junto a: bunx vite --config scripts/fixtures/plataforma-google/vite.config.mjs
// SDK interceptado exclusivamente en el navegador de pruebas. No valida Google en vivo.
const browser=await chromium.launch({headless:true}), resultados=[];
try {
 for (const rol of ['administrador_identidades','ciudadano']) {
  const context=await browser.newContext();
  await context.route('https://accounts.google.com/gsi/client*', route=>route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(o){window.__googleCallback=o.callback},renderButton(el){const b=document.createElement('button');b.textContent='Google QA';b.onclick=()=>window.__googleCallback({credential:'id-token-sdk-qa',client_id:'cliente-qa-local'});el.append(b)}}}}`}));
  let recibida;
  await context.route('**/api/v1/identidad/oauth/google',async route=>{
   recibida=route.request().postDataJSON();
   const usuario={id:'10000000-0000-4000-8000-000000000001',correo:'qa@example.org',nombres:'Equipo',apellidos:'QA',codigo_rol:rol,permisos:[],activo:true,nivel_identidad:'declarada',correo_verificado_en:null};
   await route.fulfill({contentType:'application/json',body:JSON.stringify({token_acceso:'token-qa-local',expira_en:'2099-01-01T00:00:00Z',rol,permisos:[],nivel_identidad:'declarada',usuario})});
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3204');
  await page.getByRole('button',{name:'Google QA'}).click();
  await page.waitForFunction(()=>!!window.__ruta);
  assert.deepEqual(recibida,{id_token:'id-token-sdk-qa'});
  assert.equal(await page.evaluate(()=>window.__ruta),rol==='ciudadano'?'/':'/plataforma');
  assert.equal(await page.evaluate(()=>window.__panelCount()),0);
  resultados.push({rol,credencial:'ID token recibido del callback oficial',destino:rol==='ciudadano'?'/':'/plataforma',panel:'cerrado',resultado:'aprobado'});
  await context.close();
 }
 console.log(JSON.stringify(resultados,null,2));
 await writeFile(process.env.POLIS_E2E_GOOGLE_RESULTADO ?? '/tmp/polis-google-frontend.json',JSON.stringify({sdk:'Google Identity Services interceptado para pruebas; componente GoogleLogin y SesionPanel reales',resultados},null,2));
}finally{await browser.close()}
