from pathlib import Path
from datetime import datetime,timezone
import concurrent.futures,hashlib,json
import httpx
ROOT=Path('/root/polis');OUT=ROOT/'bridge/53_evidencias_descarga'
jobs=[('medicina_homicidios_filas_por_anio','https://www.datos.gov.co/resource/vtub-3de2.json',{'$select':'a_o_del_hecho,count(*) as filas','$where':"codigo_dane_municipio='13001'",'$group':'a_o_del_hecho','$order':'a_o_del_hecho','$limit':100}),('icbf_rpc_filas_por_anio','https://www.datos.gov.co/resource/v9qk-hdcc.json',{'$select':'anno_vigencia,count(*) as filas','$where':"divipola_municipio='13001'",'$group':'anno_vigencia','$order':'anno_vigencia','$limit':100}),('indemnizaciones_cartagena','https://vgv.unidadvictimas.gov.co/server/rest/services/UARIV/Indemnizaciones/MapServer/1/query',{'f':'json','where':"MPIO_CCDGO='13001'",'outFields':'MPIO_CCDGO,MPIO_CNMBR,VIGENCIA,GIROS,PERSONAS,VALOR','returnGeometry':'false','resultRecordCount':100})]
def get(job):
 name,url,params=job;r={'clave':name,'url_solicitada':url,'parametros':params,'consulta_utc':datetime.now(timezone.utc).isoformat()}
 try:
  with httpx.Client(timeout=20,follow_redirects=True) as c:response=c.get(url,params=params)
  payload=response.content;r.update(http=response.status_code,url_final=str(response.url),content_type=response.headers.get('content-type'),bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest())
  p=OUT/(name+'.json');p.write_bytes(payload);r['archivo']=str(p.relative_to(ROOT))
  try:
   obj=response.json();r['respuesta']=obj if len(payload)<15000 else 'conservada_en_archivo'
  except ValueError:pass
 except Exception as e:r.update(error=type(e).__name__,detalle=str(e)[:200])
 return r
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(get,jobs))
(OUT/'consultas_agregadas.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(json.dumps(r,ensure_ascii=False)[:1800])
