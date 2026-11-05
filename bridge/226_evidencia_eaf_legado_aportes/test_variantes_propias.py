"""Variantes EAF propias226: tipos estrictos, límites de Field e inmutabilidad de lectura."""
import asyncio
import hashlib
import json
import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import test_atomicidad as b
from test_colas import query
from test_principales import account,proposal
from app.main import create_app
from app.modules.aportes.schemas import PropuestaCiudadanaRead

pytestmark=pytest.mark.anyio
@pytest.fixture
def anyio_backend():return 'asyncio'

TEXT=('etnia','genero','ciclo_vital','hecho_victimizante','tipo_discapacidad','organizacion_social')
FLAGS=('es_victima_conflicto','situacion_discapacidad','poblacion_campesina','persona_cuidadora')
MAIL='private226@example.org';PHONE='+57 (300) 555-1226';MARK='private_payload_226'

def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,default=str,ensure_ascii=False).encode()).hexdigest()

async def observe(pid):
    return (await query('''SELECT pg_backend_pid() AS observer_pid,to_jsonb(p) AS proposal,
    (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.creado_en,a.id),'[]'::jsonb) FROM auditoria.registros_auditoria a WHERE a.registro_id=p.id) AS audits
    FROM participacion_ciudadana.propuestas_ciudadanas p WHERE p.id=:id''',{'id':pid}))[0]

def snapshot(pid):
    row=asyncio.run(observe(pid));reader=row.pop('observer_pid');return reader,row


def assert_private_absent(value):
    encoded=json.dumps(value,ensure_ascii=False)
    for private in [MAIL,PHONE,MARK,'correo_contacto','huella_hash','sesion_id']:
        assert private not in encoded,private


def seed_enfoque(pid,legacy):
    eid=str(uuid.uuid4())
    asyncio.run(query('''UPDATE participacion_ciudadana.propuestas_ciudadanas SET metadata_enfoque=CAST(:e AS jsonb),
        metadatos=CAST(:m AS jsonb),archivos_adjuntos=CAST(:a AS jsonb),correo_contacto=:c,huella_hash=:h,sesion_id=:s WHERE id=:id''',
        {'id':pid,'e':json.dumps(legacy),'m':json.dumps({'canal':'web',MARK:{'mail':MAIL,'phone':PHONE}}),
         'a':json.dumps([None,False,17,{MARK:MAIL},{'id':eid,MARK:PHONE}]),'c':MAIL,'h':'synthetic_private_hash_226','s':uuid.uuid4()},True))
    return eid

@pytest.mark.parametrize('value',[True,False,0,1,-226,1.25,[],{},[{'private_payload_226':'private226@example.org'}],{'nested':{'private_payload_226':'+57 (300) 555-1226'}}])
def test_all_text_fields_reject_non_text_types_without_coercion(value):
    data={key:value for key in TEXT};p=asyncio.run(proposal());eid=seed_enfoque(p.id,data);before_pid,before=snapshot(p.id)
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        detail=client.get('/api/v1/aportes/'+str(p.id));listing=client.get('/api/v1/aportes',params={'busqueda':p.titulo})
    after_pid,after=snapshot(p.id);assert before_pid!=after_pid and before==after
    assert detail.status_code==listing.status_code==200
    result=detail.json();PropuestaCiudadanaRead.model_validate(result)
    assert all(result['metadata_enfoque'][k] is None for k in TEXT)
    assert listing.json()['total']==1 and listing.json()['elementos']==[result]
    assert result['id']==str(p.id) and result['estado']=='publicado' and result['archivos_adjuntos']==[{'evidencia_id':eid}]
    assert_private_absent(result);assert_private_absent(listing.json())
    b.record('R01_new_text_types',root_type=type(value).__name__,proposal=p.id,detail=200,list=200,reader_pids=[before_pid,after_pid],SQL_before_sha256=digest(before),SQL_after_sha256=digest(after),skipped_records=0)

@pytest.mark.parametrize('value',[None,0,1,0.0,1.0,'true','false','TRUE','False','1','0','sí','false '+MAIL,[],{},[True]])
def test_all_flags_do_not_infer_from_legacy_values(value):
    data={key:value for key in FLAGS};p=asyncio.run(proposal());seed_enfoque(p.id,data);reader,before=snapshot(p.id)
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        detail=client.get('/api/v1/aportes/'+str(p.id));listing=client.get('/api/v1/aportes',params={'busqueda':p.titulo})
    after_reader,after=snapshot(p.id);assert reader!=after_reader and before==after
    assert detail.status_code==listing.status_code==200
    result=detail.json();assert all(result['metadata_enfoque'][k] is False for k in FLAGS)
    assert listing.json()['elementos']==[result] and listing.json()['total']==1
    assert_private_absent(result)
    b.record('R01_new_flags',value_type=type(value).__name__,proposal=p.id,detail=200,list=200,SQL_same=True,SQL_sha256=digest(before),representation='False es default técnico previo; no hecho demográfico inferido')

@pytest.mark.parametrize('size,expected',[(249,249),(250,250),(251,None),(4096,None)])
def test_real_organization_field_limit(size,expected):
    value='é'*size;data={'organizacion_social':value,'etnia':'a'*501,'es_victima_conflicto':True,'genero':None}
    p=asyncio.run(proposal());seed_enfoque(p.id,data);_,before=snapshot(p.id)
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:response=client.get('/api/v1/aportes/'+str(p.id))
    _,after=snapshot(p.id);assert before==after and response.status_code==200
    enfoque=response.json()['metadata_enfoque'];assert enfoque['organizacion_social']==(None if expected is None else value)
    assert enfoque['etnia']=='a'*501 and enfoque['es_victima_conflicto'] is True and enfoque['genero'] is None
    b.record('R01_Field_limit',proposal=p.id,organization_characters=size,kept=expected,status=200,SQL_same=True,no_invented_limit_on_etnia=True)

@pytest.mark.parametrize('contact',[MAIL,PHONE,'573005551226','５７３００５５５１２２６'])
def test_contact_and_open_nested_json_not_projected(contact):
    p=asyncio.run(proposal());data={k:contact for k in TEXT};data.update({MARK:{'destinations':[MAIL,PHONE]},'datos_adicionales':{MARK:MAIL},'situacion_discapacidad':True})
    seed_enfoque(p.id,data);_,before=snapshot(p.id)
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        detail=client.get('/api/v1/aportes/'+str(p.id));listing=client.get('/api/v1/aportes',params={'busqueda':p.titulo})
    _,after=snapshot(p.id);assert before==after and detail.status_code==listing.status_code==200
    public=detail.json()['metadata_enfoque'];assert all(public[k] is None for k in TEXT)
    assert public['datos_adicionales']=={} and public['situacion_discapacidad'] is True and contact not in detail.text
    assert_private_absent(detail.json());assert_private_absent(listing.json())
    b.record('R01_nested_contact',proposal=p.id,contact_type='synthetic',status=200,SQL_same=True,all_closed=True)

@pytest.mark.parametrize('metadata',[None,False,[],['legado'],{'canal':'web','tipo_mensaje':'audio',MARK:{'destinations':[MAIL,PHONE]}}])
def test_every_legacy_decision_preserved_no_records_skipped(metadata):
    p=asyncio.run(proposal());ids=[uuid.uuid4(),uuid.uuid4()]
    asyncio.run(query("UPDATE participacion_ciudadana.propuestas_ciudadanas SET estado='rechazado' WHERE id=:id",{'id':p.id},True))
    for audit_id,causal in zip(ids,['tecnica','presupuestal']):
        asyncio.run(query("INSERT INTO auditoria.registros_auditoria(id,tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos) VALUES(:a,'participacion_ciudadana.propuestas_ciudadanas',:p,'DEVOLUCION_MOTIVADA',:c,:j,CAST(:m AS jsonb))",{'a':audit_id,'p':p.id,'c':causal,'j':'Decisión institucional sintética 226 '+audit_id.hex,'m':json.dumps(metadata)},True))
    asyncio.run(query("INSERT INTO auditoria.registros_auditoria(tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos) VALUES('participacion_ciudadana.apoyos_propuestas',:p,'MIGRACION_APOYOS_0084','tecnica','Registro privado excluido por el filtro vigente',CAST(:m AS jsonb))",{'p':p.id,'m':json.dumps({MARK:MAIL})},True))
    reader,before=snapshot(p.id)
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        response=client.get('/api/v1/aportes/'+str(p.id)+'/devolucion-razon')
        detail=client.get('/api/v1/aportes/'+str(p.id));listing=client.get('/api/v1/aportes',params={'busqueda':p.titulo})
    after_reader,after=snapshot(p.id);assert reader!=after_reader and before==after
    assert response.status_code==detail.status_code==listing.status_code==200
    decisions=response.json();assert len(decisions)==2 and {r['id'] for r in decisions}=={str(i) for i in ids}
    originals={r['id']:r for r in before['audits'] if r['id'] in {str(i) for i in ids}}
    for row in decisions:
        original=originals[row['id']]
        for key in ['id','tabla_afectada','registro_id','accion','usuario_id','causal','justificacion_motivada']:assert row[key]==original[key]
        assert datetime.fromisoformat(row['creado_en'])==datetime.fromisoformat(original['creado_en'])
        assert row['metadatos']==({'canal':'web','tipo_mensaje':'audio'} if isinstance(metadata,dict) else {})
    assert detail.json()['estado']=='rechazado' and listing.json()['elementos']==[detail.json()]
    assert_private_absent(decisions)
    b.record('R01_decisions_preserved',proposal=p.id,decision_ids=ids,status=200,decisions_returned=2,private_record_excluded=True,SQL_same=True,SQL_before_sha256=digest(before),SQL_after_sha256=digest(after))


def test_authorized_update_legacy_and_new_data_positive():
    p=asyncio.run(proposal(correo_contacto=MAIL));seed_enfoque(p.id,{'etnia':True,'es_victima_conflicto':'false','organizacion_social':'válida'})
    _,baseline=snapshot(p.id)
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        _,heads=account(client,True);path='/api/v1/aportes/'+str(p.id)
        assert client.patch(path,json={'estado':'en_revision'}).status_code==401
        assert client.patch(path,headers=b.civic(client),json={'estado':'en_revision'}).status_code==403
        response=client.patch(path,headers=heads[0],json={'estado':'en_revision'});assert response.status_code==200,response.text
        assert response.json()['metadata_enfoque']['etnia'] is None and response.json()['metadata_enfoque']['organizacion_social']=='válida'
        reason={'causal':'juridica','justificacion_motivada':'Decisión autorizada nueva226 con motivación suficiente','metadatos':{'canal':'mesa',MARK:MAIL}}
        result=client.post(path+'/devolucion-razon',headers=heads[0],json=reason);assert result.status_code==201,result.text
        assert result.json()['causal']==reason['causal'] and result.json()['justificacion_motivada']==reason['justificacion_motivada'] and result.json()['metadatos']=={'canal':'mesa'}
        history=client.get(path+'/devolucion-razon');assert history.status_code==200 and history.json()==[result.json()]
        new=client.post('/api/v1/aportes',headers=heads[0],json={'linea_id':str(p.linea_id),'titulo':'Nuevo226 '+uuid.uuid4().hex,'descripcion':'Alta nueva válida de control','metadata_enfoque':{'etnia':'indigena','es_victima_conflicto':True,'organizacion_social':'Organización declarada'}})
        assert new.status_code==201 and new.json()['metadata_enfoque']['es_victima_conflicto'] is True and new.json()['metadata_enfoque']['etnia']=='indigena'
    _,after=snapshot(p.id)
    assert after['proposal']['metadata_enfoque']==baseline['proposal']['metadata_enfoque'] and after['proposal']['metadatos']==baseline['proposal']['metadatos'] and after['proposal']['correo_contacto']==MAIL
    assert len(after['audits'])==1 and after['audits'][0]['metadatos']==reason['metadatos']
    b.record('R01_positive_authorized',proposal=p.id,no_token=401,anonymous=403,update=200,devolution=201,history=200,new_data=201,legacy_JSON_untouched=True)
