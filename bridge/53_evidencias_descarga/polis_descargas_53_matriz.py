from pathlib import Path
from collections import Counter
import json,csv,hashlib,shutil
R=Path('/root/polis');O=R/'bridge/53_evidencias_descarga'
j=json.loads((O/'revision.json').read_text());check=json.loads((R/'bridge/49_lista_chequeo_fuentes_guia_piscc_2024.json').read_text());inv=json.loads((R/'data/banco_fuentes_oficiales/inventario_pipeline_2026.json').read_text())
portales={x['url_solicitada']:x for x in j['consultas'] if x['clave'].startswith('portal_')}
rows=[]
for it in check['items']:
 row={'id':it['id'],'nombre':it['nombre'],'grupo':it['grupo'],'url':it.get('url') or '', 'metodo':'producto_por_identificar','verificacion':'sin_descarga_probada','evidencia':'','siguiente_paso':'Identificar producto y condiciones de acceso; no inferir API por el nombre de entidad.'}
 grupo=it['grupo'][0]
 if grupo in 'EFG':row.update(metodo='referencia_documental_o_directorio',verificacion='fuera_de_prioridad_estadistica',siguiente_paso='Usar como referencia; gestionar producto concreto cuando una necesidad lo requiera.')
 elif grupo=='C':row.update(metodo='instrumento_planeacion_financiacion',siguiente_paso='Identificar registros de ejecución y permisos; el fondo financiero no es un dataset.')
 elif grupo=='B':row.update(metodo='archivo_local_o_recoleccion_institucional',siguiente_paso='Identificar custodio, formato y entrega; comprobar si existe acceso público antes de solicitar.')
 elif grupo=='D':row.update(metodo='encuesta_historica_por_ciudad',siguiente_paso='Revisar pertinencia para Cartagena y edición; enlace de anexo no probado en este ciclo.')
 if p:=portales.get(it.get('url')):
  row['evidencia']=p.get('archivo','bridge/53_evidencias_descarga/revision.json')
  row['verificacion']=f"portal_http_{p['http']}" if 'http' in p else p['error']
  if p.get('http')==200:
   links=p.get('enlaces_candidatos',[])
   if any('powerbi.com' in u or 'tableau.com' in u for u in links):row['metodo']='tablero_detectado_exportacion_por_verificar'
   elif any('.xlsx' in u or '.xls' in u or '.csv' in u for u in links):row['metodo']='enlaces_archivo_detectados'
   else:row['metodo']='portal_accesible_producto_por_identificar'
  else:row['siguiente_paso']='Revisar enlace vigente o acceso alternativo; fallo puntual no demuestra inexistencia de datos.'
 if it['id']=='F-034':row.update(metodo='powerbi_publico;API_V2_con_autenticacion',verificacion='portada_cargada;API_V2_403',evidencia='bridge/53_evidencias_descarga/powerbi_revision.json;bridge/53_evidencias_descarga/servicios.json',siguiente_paso='Adaptar extractor supervisado del tablero; gestionar acceso autorizado a V2 si es necesario.')
 if it['id']=='F-023':row.update(metodo='zip_excel_municipal_directo',verificacion='archivo_municipal_descargado_zip_legible',evidencia='bridge/53_evidencias_descarga/ampliacion.json',siguiente_paso='Validar hojas, series y custodios de indicadores; no asumir variables marítimas por descargar TerriData.')
 rows.append(row)
for f in inv['fuentes']:
 k=f['fuente_clave'];ids=f['dataset_ids'];soc=[d for d in ids if len(d)==9 and d[4]=='-']
 row={'id':'local:'+k,'nombre':k,'grupo':'Banco local inventariado','url':'','metodo':'archivo_local;actualizacion_por_identificar','verificacion':'inventario_local_sin_nueva_extraccion','evidencia':'bridge/48_inventario_fuentes_multipolitica.json','siguiente_paso':'Conservar corte; verificar fuente y producto antes de refrescar.'}
 if soc:
  d=soc[0];p=O/f'metadata_{d}.json'
  if not p.exists():p=O/'metadata_72sg_cybi_reintento.json'
  meta=json.loads(p.read_text());owner=meta.get('owner',{}).get('displayName')
  row.update(url=f'https://www.datos.gov.co/resource/{d}.json',metodo='API_Socrata_SODA2_JSON_CSV',verificacion='metadatos_y_conteo_filtrado_200',evidencia=str(p.relative_to(R)),siguiente_paso='Descargar agregados filtrados; controlar esquema, paginación, revisión y licencia.')
  row['atribucion']=meta.get('attribution');row['propietario']=owner
  if d in ['e3xi-4zq5','ezhf-hscf']:row['siguiente_paso']='Cotejar atribución a alcaldía con propietario y entidad INMLCF; luego validar extracción.'
 elif k.startswith('fiscalia_'):row.update(metodo='Playwright_tablero_publico_supervisado',verificacion='portada_publica_cargada_corte_2026-09-30',evidencia='bridge/53_evidencias_descarga/powerbi_revision.json',siguiente_paso='Probar filtros y series sin sobrescribir banco; API V2 probada exige login.')
 elif k=='dane_ecsc_2024':row.update(metodo='Excel_directo',verificacion='descarga_completa_firma_ZIP_verificada',evidencia='bridge/53_evidencias_descarga/ampliacion.json',siguiente_paso='Validar hojas y periodos de referencia; no equiparar edición 2024 con año del hecho.')
 elif k=='dnp_terridata_13001':row.update(metodo='ZIP_Excel_municipal',verificacion='descarga_completa_ZIP_verificado',evidencia='bridge/53_evidencias_descarga/ampliacion.json',siguiente_paso='Validar series y evitar duplicación con custodios originales.')
 elif k.startswith('dane_'):row.update(metodo='anexo_oficial_Excel_o_PDF',siguiente_paso='Resolver edición vigente desde portal; URL concreta de este producto pendiente de nueva descarga.')
 elif k.startswith('drive_'):row.update(metodo='archivo_recibido_Drive',siguiente_paso='Gestionar nueva entrega/versionado y procedencia; no prometer refresco institucional automático.')
 elif k=='unidad_victimas_ruv_cartagena':row.update(metodo='servicio_RNI_JSON_por_corte',verificacion='lista_cortes_200;consulta_completa_pendiente',evidencia='bridge/53_evidencias_descarga/ruv_cortes.json',siguiente_paso='Seleccionar corte validado y consultar municipio; mantener ocurrencia/declaración/eventos separados.')
 elif k=='unidad_victimas_irv_cartagena':row.update(metodo='ArcGIS_REST_query',verificacion='consulta_municipal_2025_200_1_feature',evidencia='bridge/53_evidencias_descarga/irv_cartagena_2025.json',siguiente_paso='Descubrir capas por año y registrar vigencias; no reutilizar polígono como ubicación de casos.')
 elif k=='unidad_victimas_indemnizaciones_cartagena':row.update(metodo='ArcGIS_REST_query',verificacion='consulta_municipal_200_14_features',evidencia='bridge/53_evidencias_descarga/indemnizaciones_cartagena.json',siguiente_paso='Validar corte, sumas y unidades; personas atendidas, giros y valor son métricas distintas.')
 rows.append(row)
with (R/'bridge/54_matriz_metodos_descarga_fuentes.json').open('x') as f:json.dump({'fecha':'2026-10-23','entradas':len(rows),'nota':'211 candidatos/documentos/series; no fuentes independientes ni 211 descargas verificadas.','items':rows},f,ensure_ascii=False,indent=2);f.write('\n')
fields=list(dict.fromkeys(k for r in rows for k in r))
with (R/'bridge/54_matriz_metodos_descarga_fuentes.csv').open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
for name in ['polis_revisar_descargas_53.py','polis_descargas_53_ampliacion.py','polis_descargas_53_servicios.py','polis_descargas_53_consultas_agregadas.py','polis_descargas_53_powerbi.mjs','polis_descargas_53_matriz.py']:
 shutil.copyfile(Path('/tmp')/name,O/name)
manifest={'fecha':'2026-10-23','archivos':[{'ruta':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(O.iterdir()) if p.is_file()]}
with (O/'manifest.json').open('x') as f:json.dump(manifest,f,ensure_ascii=False,indent=2);f.write('\n')
print('Matriz',len(rows),'Archivos evidencia',len(manifest['archivos']));print(Counter(r['metodo'] for r in rows))
