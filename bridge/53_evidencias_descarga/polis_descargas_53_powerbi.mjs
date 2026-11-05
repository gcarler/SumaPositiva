import { chromium } from '/root/polis/node_modules/playwright/index.mjs';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='/root/polis';
const code=readFileSync(root+'/data/banco_fuentes_oficiales/extraer_fiscalia_powerbi_cartagena.mjs','utf8');
const url=code.match(/const URL = '([^']+)'/)[1];
const result={consulta_utc:new Date().toISOString(),url,alcance:'Solo abrir y leer portada pública; sin extracción municipal ni actualización del banco'};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
 await page.getByText('Procesos penales en Colombia',{exact:true}).waitFor({timeout:25000});
 const body=await page.locator('body').innerText();
 writeFileSync(root+'/bridge/53_evidencias_descarga/fiscalia_powerbi_portada.txt',body);
 result.estado='portada_publica_cargada';result.titulo='Procesos penales en Colombia';result.corte_visible=body.match(/hasta el (\d{2}\/\d{2}\/\d{4})/i)?.[1]??null;result.sha256_texto=createHash('sha256').update(body).digest('hex');
 await page.screenshot({path:root+'/bridge/53_evidencias_descarga/fiscalia_powerbi_portada.png'});
}catch(e){result.estado='no_verificado';result.error=String(e).slice(0,500);}finally{await browser?.close();}
writeFileSync(root+'/bridge/53_evidencias_descarga/powerbi_revision.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
