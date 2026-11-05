"""Evidencia SQL/HTTP propia de215; seis casos de entrada203 con fixtures nuevas."""
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient
from app.core.config import Settings
from app.main import create_app
from app.modules.aportes.schemas import MetadataEnfoqueDiferencial
from tests import test_aportes_legado_publico as b

EVIDENCE = Path(__file__).resolve().parent
URL = os.environ['POLIS_TEST_DATABASE_URL']
assert os.environ['POLIS_EDD_DATABASE'].startswith('polis_test_edd_legado_20261026_')

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

records=[]
with TestClient(create_app(Settings(_env_file=None,database_url=URL,environment='test',smtp_host='')),raise_server_exceptions=False) as client:
    for legacy in [{'etnia':True},{'es_victima_conflicto':'texto_heredado'},{'es_victima_conflicto':None}]:
        pid,title,_=b.crear_aporte(client)
        writer=b.sembrar_enfoque(URL,pid,legacy,{'canal':'web','contacto_abierto':b.CONTACTO},[{'contacto_abierto':b.TELEFONO}])
        observer,before=b.snapshot(URL,pid)
        detail=client.get('/api/v1/aportes/'+pid)
        listing=client.get('/api/v1/aportes',params={'busqueda':title})
        after_pid,after=b.snapshot(URL,pid)
        assert writer!=observer!=after_pid and before==after
        assert detail.status_code==listing.status_code==200
        assert listing.json()['elementos']==[detail.json()]
        assert detail.json()['metadata_enfoque']==MetadataEnfoqueDiferencial().model_dump()
        b.sin_privados(detail);b.sin_privados(listing)
        records.append({'escenario':'enfoque_'+next(iter(legacy))+'_'+type(next(iter(legacy.values()))).__name__,
                        'propuesta_id':pid,'status_detalle':detail.status_code,'status_lista':listing.status_code,
                        'pid_escritor_fixture':writer,'pid_lector_antes':observer,'pid_lector_despues':after_pid,
                        'sha_sql_antes':digest(before),'sha_sql_despues':digest(after),'sql_original_identico':before==after,
                        'json_original_identico':after['aporte']['metadata_enfoque']==legacy,'sin_contactos_publicos':True})
    for legacy in [None,False,['legado']]:
        pid,_,_=b.crear_aporte(client)
        aid=b.sembrar_devolucion(URL,pid,legacy)
        observer,before=b.snapshot(URL,pid)
        history=client.get('/api/v1/aportes/'+pid+'/devolucion-razon')
        after_pid,after=b.snapshot(URL,pid)
        assert observer!=after_pid and before==after and history.status_code==200
        rows=history.json();assert len(rows)==1 and rows[0]['id']==aid and rows[0]['metadatos']=={}
        original=before['auditoria'][0]
        for field in ('id','tabla_afectada','registro_id','accion','usuario_id','causal','justificacion_motivada'):
            assert rows[0][field]==original[field]
        assert datetime.fromisoformat(rows[0]['creado_en'])==datetime.fromisoformat(original['creado_en'])
        b.sin_privados(history)
        records.append({'escenario':'auditoria_'+type(legacy).__name__,'propuesta_id':pid,'auditoria_id':aid,
                        'status_historial':history.status_code,'pid_lector_antes':observer,'pid_lector_despues':after_pid,
                        'sha_sql_antes':digest(before),'sha_sql_despues':digest(after),'sql_original_identico':before==after,
                        'json_original_identico':after['auditoria'][0]['metadatos']==legacy,
                        'columnas_institucionales_originales':True,'sin_contactos_publicos':True})
result={'fecha':datetime.now(timezone.utc).isoformat(),'autoria':'EDD215; reproduccion propia de los seis escenarios descritos por EAF203; sin ejecutar/modificar su harness',
        'database':os.environ['POLIS_EDD_DATABASE'],'casos':records,'total':len(records),'todos_conformes':True,
        'observaciones':'Conexion fisica nueva NullPool antes/despues; snapshots SQL completos por fixture sin saneamiento en lectura. No datos reales.'}
(EVIDENCE/'lecturas_sql_http.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'casos':len(records),'http_200':True,'SQL_identico':True,'datos_reales':False}))
