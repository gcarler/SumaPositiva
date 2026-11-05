from pathlib import Path
import ast,concurrent.futures,hashlib,json,re,threading,time
from collections import Counter
from datetime import datetime,timezone
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
import httpx
ROOT=Path('/root/polis'); OUT=ROOT/'bridge/53_evidencias_descarga'; OUT.mkdir(exist_ok=False)
INV=json.loads((ROOT/'data/banco_fuentes_oficiales/inventario_pipeline_2026.json').read_text())
CHECK=json.loads((ROOT/'bridge/49_lista_chequeo_fuentes_guia_piscc_2024.json').read_text())
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ('a','iframe') and (u:=a.get('href') or a.get('src')):self.links.append(u)
sem=threading.Semaphore(3)
client=httpx.Client(timeout=httpx.Timeout(15,connect=5),follow_redirects=True,headers={'User-Agent':'POLIS-revision-publica-descargas/1.0'})
def get(key,url,params=None):
 start=time.monotonic(); result={'clave':key,'url_solicitada':url,'parametros':params,'consulta_utc':datetime.now(timezone.utc).isoformat()}
 try:
  with sem,client.stream('GET',url,params=params) as r:
   data=bytearray();trunc=False
   for chunk in r.iter_bytes():
    data.extend(chunk)
    if len(data)>1600000:trunc=True;break
   payload=bytes(data[:1600000]);sha=hashlib.sha256(payload).hexdigest();typ=r.headers.get('content-type','')
   result.update(http=r.status_code,url_final=str(r.url),content_type=typ,bytes=len(payload),respuesta_completa=not trunc,sha256=sha,etag=r.headers.get('etag'),last_modified=r.headers.get('last-modified'))
   suffix='.json' if 'json' in typ else '.html' if 'html' in typ else '.bin'
   path=OUT/(re.sub('[^a-zA-Z0-9_-]','_',key)+suffix);path.write_bytes(payload);result['archivo']=str(path.relative_to(ROOT))
   if 'html' in typ:
    parser=Links();parser.feed(payload.decode('utf-8','replace'))
    candidates=[]
    for u in parser.links:
     u=urljoin(str(r.url),u)
     if re.search(r'\.(xlsx?|csv|zip|geojson|json|pdf)(?:[?/#]|$)|powerbi|tableau|datos.gov.co|MapServer|FeatureServer|/documents/|/download',u,re.I):candidates.append(u)
    result['enlaces_candidatos']=list(dict.fromkeys(candidates))[:160]
   if 'json' in typ and not trunc:
    try:
     obj=json.loads(payload)
     if key.startswith('metadata_'):
      result['metadata']={k:obj.get(k) for k in ('id','name','attribution','attributionLink','license','rowsUpdatedAt','publicationStage')}
      result['columnas']=[{'nombre':c.get('fieldName'),'tipo':c.get('dataTypeName')} for c in obj.get('columns',[]) if not c.get('fieldName','').startswith(':')]
     elif isinstance(obj,list) and (not obj or all(isinstance(x,dict) for x in obj)):
      result['filas_respuesta']=len(obj)
      if key.startswith('conteo_'):result['agregados']=obj
     elif key.startswith('arcgis_'):
      result['arcgis']={k:obj.get(k) for k in ('currentVersion','name','capabilities','maxRecordCount','layers','error')}
    except (ValueError,TypeError,AttributeError):result['parse_json']='no_interpretable'
 except Exception as e:result.update(error=type(e).__name__,detalle=str(e)[:250])
 result['duracion_segundos']=round(time.monotonic()-start,2)
 return result
jobs=[]
ids=sorted({d for f in INV['fuentes'] for d in f['dataset_ids'] if re.fullmatch('[a-z0-9]{4}-[a-z0-9]{4}',d)})
for d in ids:jobs.append((f'metadata_{d}',f'https://www.datos.gov.co/api/views/{d}.json',None))
tree=ast.parse((ROOT/'data/banco_fuentes_oficiales/sincronizar.py').read_text());cfg=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FUENTES' for t in n.targets))
for key,d,owner,dim,where,cols in cfg:jobs.append((f'conteo_{key}',f'https://www.datos.gov.co/resource/{d}.json',{'$select':'count(*) as registros','$where':where}))
for key,d,where in [('icbf_rpc','v9qk-hdcc',"divipola_municipio='13001'"),('icbf_primera_infancia','5akr-u7t8',"codigo_municipio_uds='13001'"),('icbf_prevencion','g58z-k6f6',"codigo_municipio_atenci_n='13001'"),('icbf_uds','i8ww-5mcf',"codigo_dane_municipio='13001'"),('icbf_bienestarina','crxh-as6c',"codigo_dane_municipio='13001'")]:jobs.append((f'conteo_{key}',f'https://www.datos.gov.co/resource/{d}.json',{'$select':'count(*) as registros','$where':where}))
urls={it['url'] for it in CHECK['items'] if it['grupo'].startswith('A ') and it.get('url')}
urls.update(['https://www.dane.gov.co/index.php/estadisticas-por-tema/seguridad-y-defensa/encuesta-de-convivencia-y-seguridad-ciudadana-ecsc','https://www.icbf.gov.co/programas-y-estrategias/archivo-historico-observatorio-del-bienestar-de-la-ninez/datos','https://www.fiscalia.gov.co/colombia/gestion/estadisticas/','https://www.medicinalegal.gov.co/cifras-de-lesiones-de-causa-externa'])
for i,u in enumerate(sorted(urls)):jobs.append((f'portal_{i:02}',u,None))
jobs.extend([('arcgis_irv','https://vgv.unidadvictimas.gov.co/server/rest/services/IRV/IRV/MapServer',{'f':'pjson'}),('arcgis_indemnizaciones','https://vgv.unidadvictimas.gov.co/server/rest/services/UARIV/Indemnizaciones/MapServer/1',{'f':'pjson'}),('ruv_cortes','https://cifras2.unidadvictimas.gov.co/RNI.Reportes.Servicios/api/ListaFechaCorte',{'idReporte':'5'})])
print('consultas previstas',len(jobs),flush=True)
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 fs=[pool.submit(get,*job) for job in jobs]
 for future in concurrent.futures.as_completed(fs):
  r=future.result();results.append(r)
  print(r['clave'],r.get('http',r.get('error')),flush=True)
client.close()
result={'esquema':'polis.revision_descargas.v1','fecha_utc':datetime.now(timezone.utc).isoformat(),'alcance':'Metadatos públicos, conteos filtrados Cartagena y portales; sin promover datos ni ejecutar extractores originales. HTTP 200 no acredita datos útiles.','consultas':sorted(results,key=lambda r:r['clave']),'resumen':dict(Counter(str(r.get('http',r.get('error'))) for r in results))}
(OUT/'revision.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('resumen',result['resumen'],flush=True)
