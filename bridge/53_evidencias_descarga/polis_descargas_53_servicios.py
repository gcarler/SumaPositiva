from pathlib import Path
from datetime import datetime,timezone
import concurrent.futures,hashlib,json
import httpx
ROOT=Path('/root/polis');OUT=ROOT/'bridge/53_evidencias_descarga'
ind=json.loads((OUT/'arcgis_indemnizaciones.bin').read_text());print('campos indemnizaciones',[f['name'] for f in ind.get('fields',[])],flush=True)
irv=json.loads((OUT/'arcgis_irv.bin').read_text());layers=[x for x in irv['layers'] if x['name']=='IRV2025'];layer=layers[0]['id'] if layers else None
jobs=[('fiscalia_metadata_victimas','https://www.datos.gov.co/api/views/4mnf-va5w.json',None),('fiscalia_api_victimas','https://www.datos.gov.co/resource/4mnf-va5w.json',{'$select':'count(*) as registros'}),('fiscalia_metadata_actuaciones','https://www.datos.gov.co/api/views/9pc4-8nib.json',None),('fiscalia_api_actuaciones','https://www.datos.gov.co/resource/9pc4-8nib.json',{'$select':'count(*) as registros'}),('metadata_72sg_cybi_reintento','https://www.datos.gov.co/api/views/72sg-cybi.json',None),('irv_cartagena_2025',f'https://vgv.unidadvictimas.gov.co/server/rest/services/IRV/IRV/MapServer/{layer}/query',{'f':'json','where':"MPIO_CCDGO='13001'",'outFields':'MPIO_CCDGO,MPIO_CNMBR,IRV_NESTIMADO,IRV_CCLUSTER,IRV_CYEAR','returnGeometry':'false'})]
def get(job):
 name,url,params=job;r={'clave':name,'url_solicitada':url,'parametros':params,'consulta_utc':datetime.now(timezone.utc).isoformat()}
 try:
  with httpx.Client(timeout=20,follow_redirects=True) as c:response=c.get(url,params=params)
  payload=response.content;r.update(http=response.status_code,url_final=str(response.url),content_type=response.headers.get('content-type'),bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest())
  p=OUT/(name+'.json');p.write_bytes(payload);r['archivo']=str(p.relative_to(ROOT))
  try:
   data=response.json()
   if name.startswith('fiscalia'):r['respuesta_resumen']=data if len(payload)<1000 else {k:data.get(k) for k in ['id','name','attribution']}
   if name=='irv_cartagena_2025':r['features']=data.get('features');r['error_servicio']=data.get('error')
  except ValueError:pass
 except Exception as e:r.update(error=type(e).__name__,detalle=str(e)[:200])
 return r
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(get,jobs))
(OUT/'servicios.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(json.dumps(r,ensure_ascii=False)[:1400],flush=True)
