from pathlib import Path
import json,hashlib,concurrent.futures,zipfile,io
from datetime import datetime,timezone
import httpx
ROOT=Path('/root/polis');OUT=ROOT/'bridge/53_evidencias_descarga';OUT.mkdir(exist_ok=True)
def consultar(nombre,url,params=None,limite=8000000):
 r={'clave':nombre,'url_solicitada':url,'parametros':params,'consulta_utc':datetime.now(timezone.utc).isoformat()}
 try:
  with httpx.Client(timeout=httpx.Timeout(20,connect=5),follow_redirects=True) as c:
   with c.stream('GET',url,params=params) as response:
    data=bytearray();completa=True
    for chunk in response.iter_bytes():
     data.extend(chunk)
     if len(data)>limite:completa=False;break
    payload=bytes(data[:limite]);typ=response.headers.get('content-type','');r.update(http=response.status_code,url_final=str(response.url),content_type=typ,bytes=len(payload),respuesta_completa=completa,sha256=hashlib.sha256(payload).hexdigest())
    ext='.json' if 'json' in typ else '.xlsx' if payload.startswith(b'PK') and nombre=='dane_ecsc_anexo' else '.zip' if payload.startswith(b'PK') else '.html' if 'html' in typ else '.bin'
    path=OUT/(nombre+ext);path.write_bytes(payload);r['archivo']=str(path.relative_to(ROOT))
    if payload.startswith(b'PK') and completa:
     with zipfile.ZipFile(io.BytesIO(payload)) as z:r['contenido_zip']=z.namelist()[:35];r['zip_legible']=True
    if 'json' in typ and completa:
     obj=json.loads(payload)
     if nombre.startswith('catalogo_'):r['resultados']=[{'id':x.get('resource',{}).get('id'),'nombre':x.get('resource',{}).get('name'),'atribucion':x.get('resource',{}).get('attribution'),'url':x.get('link')} for x in obj.get('results',[])][:10]
     elif isinstance(obj,list):r['respuesta']=obj[:30]
 except Exception as e:r.update(error=type(e).__name__,detalle=str(e)[:250])
 return r
jobs=[('catalogo_fiscalia_procesos','https://api.us.socrata.com/api/catalog/v1',{'search_context':'www.datos.gov.co','q':'Conteo de Procesos V2','limit':5}),('catalogo_fiscalia_indiciados','https://api.us.socrata.com/api/catalog/v1',{'search_context':'www.datos.gov.co','q':'Conteo de Indiciados V2','limit':5}),('dane_ecsc_anexo','https://www.dane.gov.co/files/operaciones/ECSC/anex-ECSC-2024.xlsx',None),('dnp_terridata_zip','https://terridata.dnp.gov.co/assets/docs/excel/entidades/TerriData13001.xlsx.zip',None),('conteo_procuraduria','https://www.datos.gov.co/resource/s226-fj9i.json',{'$select':'count(*) as registros','$where':"departamento='BOLIVAR' AND municipio='CARTAGENA' AND fecha_de_radicaci_n IS NOT NULL"})]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(lambda j:consultar(*j),jobs))
(OUT/'ampliacion.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(json.dumps(r,ensure_ascii=False))
