"""Autorización, privacidad, principales estables y decisiones concurrentes EAF203."""
import asyncio
import json
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

import test_atomicidad as b
from test_colas import query
from app.core.transactions import transaction
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate, PropuestaCiudadanaUpdate
from app.modules.aportes.service import AporteService
from app.modules.auditoria.schemas import DevolucionRazonCrear
from app.modules.identidad.schemas import SujetoAutenticadoContexto

pytestmark=pytest.mark.anyio
@pytest.fixture
def anyio_backend():return 'asyncio'

async def proposal(**kwargs):
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            return await AporteService(AporteRepository(session),b.client_settings()).crear_propuesta(PropuestaCiudadanaCreate(linea_id=await b.line_id(),titulo='EAF203 principal '+uuid.uuid4().hex,descripcion='Datos sintéticos para verificar el contrato',**kwargs))
    finally:await engine.dispose()


def account(client,authority=False):
    email='eaf203-'+uuid.uuid4().hex+'@example.org'; credentials={'correo':email,'contrasena':'Eaf203Ciudadano*2026'}
    r=client.post('/api/v1/identidad/registro',json={**credentials,'nombres':'EAF','apellidos':'Sintético'})
    assert r.status_code==201,r.text
    uid=r.json()['id']
    if authority:asyncio.run(query("UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo='autoridad_distrital') WHERE id=:id",{'id':uuid.UUID(uid)},True))
    headers=[]
    for _ in range(2):
        r=client.post('/api/v1/identidad/login',json=credentials);assert r.status_code==200,r.text
        headers.append({'Authorization':'Bearer '+r.json()['token_acceso']})
    return uuid.UUID(uid),headers

@pytest.mark.parametrize('state',['en_revision','incorporado','rechazado'])
def test_citizen_state_rejected_http_and_service(state):
    with TestClient(create_app(b.client_settings())) as client:
        payload={'linea_id':str(asyncio.run(b.line_id())),'titulo':'Estado EAF203 '+uuid.uuid4().hex,'descripcion':'Un estado institucional no se admite en alta','estado':state}
        r=client.post('/api/v1/aportes',headers=b.civic(client),json=payload);assert r.status_code==422
        async def direct():
            engine,sessions=b.factory()
            try:
                async with sessions() as session:
                    data=PropuestaCiudadanaCreate(**{**payload,'estado':'publicado'}).model_copy(update={'estado':state})
                    with pytest.raises(HTTPException) as exc:await AporteService(AporteRepository(session),b.client_settings()).crear_propuesta(data)
                    assert exc.value.status_code==422 and not session.in_transaction()
            finally:await engine.dispose()
        asyncio.run(direct())
        assert asyncio.run(query('SELECT id FROM participacion_ciudadana.propuestas_ciudadanas WHERE titulo=:t',{'t':payload['titulo']}))==[]
        b.record('AP02_rejected_'+state,http=422,service=422,durable_rows=0)


def assert_closed(value):
    raw=json.dumps(value,ensure_ascii=False)
    for forbidden in ['private203@example.invalid','573001112203','private-203-huella','private_203','huella_hash','sesion_id','correo_contacto','datos_adicionales']:
        # datos_adicionales remains an empty declared field, never arbitrary original content.
        if forbidden=='datos_adicionales':continue
        assert forbidden not in raw,forbidden
    if isinstance(value,dict) and 'metadata_enfoque' in value: assert value['metadata_enfoque'].get('datos_adicionales')=={}


def test_closed_privacy_creation_update_detail_list_and_devolution():
    with TestClient(create_app(b.client_settings())) as client:
        _,heads=account(client,True)
        data={'linea_id':str(asyncio.run(b.line_id())),'titulo':'Privacidad EAF203 '+uuid.uuid4().hex,'descripcion':'Texto público deliberado de auditoría','correo_contacto':'private203@example.invalid',
              'metadatos':{'canal':'web','correo_contacto':'private203@example.invalid','private_203':{'phone':'573001112203'}},
              'metadata_enfoque':{'etnia':'mestizo_ninguno','datos_adicionales':{'private_203':'private203@example.invalid'},'private_203':'573001112203'},
              'archivos_adjuntos':[{'id':str(uuid.uuid4()),'private_203':'private203@example.invalid'}]}
        r=client.post('/api/v1/aportes',json=data,headers=heads[0]);assert r.status_code==201,r.text
        pid=uuid.UUID(r.json()['id']);path='/api/v1/aportes/'+str(pid);assert_closed(r.json())
        r=client.patch(path,json={'estado':'en_revision','metadatos':data['metadatos']},headers=heads[0]);assert r.status_code==200,r.text;assert_closed(r.json())
        for r in [client.get(path),client.get('/api/v1/aportes',params={'busqueda':data['titulo']})]:assert r.status_code==200,r.text;assert_closed(r.json())
        reason={'causal':'tecnica','justificacion_motivada':'Justificación pública deliberada suficientemente motivada','metadatos':data['metadatos']}
        r=client.post(path+'/devolucion-razon',json=reason,headers=heads[0]);assert r.status_code==201,r.text;assert_closed(r.json())
        r=client.get(path+'/devolucion-razon');assert r.status_code==200;assert_closed(r.json())
        sql=asyncio.run(query('SELECT correo_contacto,metadatos,metadata_enfoque,archivos_adjuntos FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id',{'id':pid}))[0]
        assert sql['correo_contacto']==data['correo_contacto'] and sql['metadatos']==data['metadatos'] and sql['metadata_enfoque']['datos_adicionales']==data['metadata_enfoque']['datos_adicionales']
        b.record('AP03_closed_all_routes',proposal=pid,creation=201,update=200,detail=200,list=200,devolution=201,history=200,private_column_preserved=True,original_JSON_preserved=True)

@pytest.mark.parametrize('legacy',[None,True,17,'private203@example.invalid',['private203@example.invalid'],{'canal':'web','private_203':{'mail':'private203@example.invalid'}}])
def test_heterogeneous_legacy_json_closed(legacy):
    p=asyncio.run(proposal())
    raw=json.dumps(legacy)
    asyncio.run(query('UPDATE participacion_ciudadana.propuestas_ciudadanas SET metadatos=CAST(:v AS jsonb),metadata_enfoque=CAST(:v AS jsonb),archivos_adjuntos=CAST(:v AS jsonb),huella_hash=:h WHERE id=:id',{'v':raw,'h':'private-203-huella','id':p.id},True))
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        detail=client.get('/api/v1/aportes/'+str(p.id));listing=client.get('/api/v1/aportes',params={'busqueda':p.titulo})
    preserved=asyncio.run(query('SELECT metadatos,metadata_enfoque,archivos_adjuntos FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id',{'id':p.id}))[0]
    assert all(v==legacy for v in preserved.values())
    b.record('AP03_heterogeneous_JSON',proposal=p.id,root_type=type(legacy).__name__,detail_status=detail.status_code,list_status=listing.status_code,original_preserved=True)
    assert detail.status_code==listing.status_code==200
    assert_closed(detail.json());assert_closed(listing.json())


def test_account_support_between_logins_and_concurrent_toggles():
    with TestClient(create_app(b.client_settings())) as client:
        uid,heads=account(client);p=asyncio.run(proposal());path='/api/v1/aportes/'+str(p.id)+'/apoyar'
        assert client.post(path,headers=heads[0]).json()['apoyado'] is True
        assert str(p.id) in client.get('/api/v1/aportes/mis-apoyos',headers=heads[1]).json()['propuestas_apoyadas']
        assert client.post(path,headers=heads[1]).json()['apoyado'] is False
        with ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(lambda h:client.post(path,headers=h),heads))
        assert all(r.status_code==200 for r in responses) and sorted(r.json()['apoyado'] for r in responses)==[False,True]
        _,stored=asyncio.run(b.snapshot(p.id));assert stored['apoyos_contador']==len(stored['supports'])==0
        assert client.post(path,headers=heads[0]).json()['apoyado'] is True
        _,stored=asyncio.run(b.snapshot(p.id));assert stored['supports'][0].sujeto_id==uid and stored['supports'][0].tipo_sujeto=='usuario'
        with ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(lambda h:client.delete(path,headers=h),heads))
        assert all(r.status_code==200 for r in responses)
        _,stored=asyncio.run(b.snapshot(p.id));assert stored['apoyos_contador']==len(stored['supports'])==0
        b.record('AP04_stable_account',account=uid,proposal=p.id,logins=2,concurrent_toggles=[r.status_code for r in responses],final_counter=0)

@pytest.mark.parametrize('invalid',['revoked','inactive','mismatch','expired'])
async def test_invalid_registered_principal_rejected(invalid):
    uid=uuid.uuid4();sid=uuid.uuid4();p=await proposal()
    await query("INSERT INTO autenticacion.usuarios(id,rol_id,correo,hash_contrasena,nombres,apellidos,activo) SELECT :id,id,:email,'synthetic','EAF','203',:active FROM autenticacion.roles WHERE codigo='ciudadano'",{'id':uid,'email':uid.hex+'@example.invalid','active':invalid!='inactive'},True)
    await query("INSERT INTO autenticacion.sesiones_usuario(id,usuario_id,creada_en,expira_en,revocada_en) VALUES(:sid,:uid,now(),now()+(:days * interval '1 day'),CASE WHEN :revoked THEN now() ELSE NULL END)",{'sid':sid,'uid':uid,'days':-1 if invalid=='expired' else 1,'revoked':invalid=='revoked'},True)
    actor=SujetoAutenticadoContexto(sujeto_id=uuid.uuid4() if invalid=='mismatch' else uid,sesion_id=sid,rol='ciudadano',nivel_identidad='declarada',permisos=[],es_anonimo=False)
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            with pytest.raises(HTTPException) as exc:await AporteService(AporteRepository(session),b.client_settings()).alternar_apoyo(p.id,actor)
            assert exc.value.status_code==401
        _,stored=await b.snapshot(p.id);assert stored['apoyos_contador']==0 and stored['supports']==[]
        b.record('AP04_reject_'+invalid,http_equivalent=401,proposal=p.id,unchanged=True)
    finally:await engine.dispose()

async def test_anonymous_sessions_separate_and_check_constraint():
    p=await proposal();engine,sessions=b.factory();actors=[b.subject(),b.subject()]
    try:
        for actor in actors:
            async with sessions() as session:await AporteService(AporteRepository(session),b.client_settings()).apoyar_propuesta(p.id,actor)
        _,before=await b.snapshot(p.id);assert before['apoyos_contador']==2 and {r.sujeto_id for r in before['supports']}=={a.sujeto_id for a in actors}
        async with sessions() as session:
            with pytest.raises(IntegrityError):
                async with transaction(session):
                    await session.execute(text("INSERT INTO participacion_ciudadana.apoyos_propuestas(propuesta_id,sujeto_id,tipo_sujeto) VALUES(:p,:s,'invalid')"),{'p':p.id,'s':uuid.uuid4()})
        _,after=await b.snapshot(p.id);assert after==before
        b.record('AP04_AP07_anonymous_and_check',proposal=p.id,separate_session_supports=2,invalid_SQL_rejected=True,whole_transaction_unchanged=True)
    finally:await engine.dispose()

async def test_concurrent_devolution_one_durable_and_refresh(monkeypatch):
    p=await proposal();engine,sessions=b.factory();entered=asyncio.Event();release=asyncio.Event();pids=[]
    reason=DevolucionRazonCrear(causal='tecnica',justificacion_motivada='Decisión motivada sintética para la concurrencia real')
    try:
        async with sessions() as first,sessions() as second:
            stale=await AporteRepository(second).obtener_por_id(p.id);assert stale.estado=='publicado';await second.commit()
            repo=AporteRepository(first);original=repo.obtener_por_id
            async def locked(*a,**k):
                row=await original(*a,**k);entered.set();await release.wait();return row
            monkeypatch.setattr(repo,'obtener_por_id',locked)
            async def decide(session,repository):
                pids.append(await session.scalar(text('SELECT pg_backend_pid()')))
                try:return await AporteService(repository,b.client_settings()).registrar_devolucion_motivada(p.id,reason,b.subject())
                except HTTPException as e:return e.status_code
            task1=asyncio.create_task(decide(first,repo));await asyncio.wait_for(entered.wait(),10)
            task2=asyncio.create_task(decide(second,AporteRepository(second)))
            await asyncio.sleep(.1);release.set();results=await asyncio.wait_for(asyncio.gather(task1,task2),10)
        _,stored=await b.snapshot(p.id);assert len(set(pids))==2 and stored['audits']==1 and stored['estado']=='rechazado' and sum(r==400 for r in results)==1
        b.record('AP05_concurrency_refresh',proposal=p.id,writer_pids=pids,accepted=1,rejected=1,audits=1,stale_session_refreshed=True)
    finally:release.set();await engine.dispose()
