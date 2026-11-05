"""Escenarios adicionales propios: frontera HTTP, fencing inbox y JSON legado irregular."""
import asyncio
import json
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

import test_atomicidad as b
from test_colas import SECRET,inbox,payload,query,receive,signed
from test_principales import account,proposal,assert_closed
from app.main import create_app
from app.modules.canales.repository import WhatsAppInboxRepository
from app.modules.canales.service import CanalWhatsAppService

pytestmark=pytest.mark.anyio
@pytest.fixture
def anyio_backend():return 'asyncio'


def test_http_devolutions_concurrent_one_201_one_400():
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
        _,heads=account(client,True);p=asyncio.run(proposal());path='/api/v1/aportes/'+str(p.id)+'/devolucion-razon'
        body={'causal':'tecnica','justificacion_motivada':'Decisión institucional sintética suficientemente motivada'}
        with ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(lambda h:client.post(path,headers=h,json=body),heads))
        statuses=sorted(r.status_code for r in responses);assert statuses==[201,400],[r.text for r in responses]
        _,row=asyncio.run(b.snapshot(p.id));assert row['audits']==1 and row['estado']=='rechazado'
        b.record('AP05_HTTP_concurrent',proposal=p.id,http_statuses=statuses,durable_audits=1)


def test_http_receipt_real_commit_409_then_recovery(monkeypatch):
    data=payload('Lote HTTP para fallo real al confirmar','Segunda entrada atómica del mismo lote');body=data.model_dump_json(by_alias=True).encode()
    original=AsyncSession.commit;injected=[]
    async def commit(session):
        if not injected and any(type(obj).__name__=='WhatsAppInbox' for obj in session.identity_map.values()):
            injected.append(True);assert await inbox(data)==[];await b.commit_failure(session)
        return await original(session)
    monkeypatch.setattr(AsyncSession,'commit',commit)
    with TestClient(create_app(b.client_settings(whatsapp_habilitado=True,whatsapp_app_secret=SECRET,whatsapp_verify_token='verify203')),raise_server_exceptions=False) as client:
        path='/api/v1/canales/whatsapp/webhook';first=client.post(path,content=body,headers=signed(body))
        assert injected and first.status_code==409,first.text
        assert asyncio.run(inbox(data))==[]
        second=client.post(path,content=body,headers=signed(body));assert second.status_code==200 and second.json()['mensajes_nuevos']==2
        b.record('AP06_HTTP_commit_rollback_recovery',conflict=409,rolled_back_rows=0,retry=200,durable_rows=len(asyncio.run(inbox(data))))

async def test_inbox_fencing_old_token_cannot_radicate(monkeypatch):
    data=payload('Mensaje exclusivo con reclamación vencida');_,rows=await receive(data);iid=rows[0]['id']
    engine,sessions=b.factory();entered=asyncio.Event();release=asyncio.Event();original=WhatsAppInboxRepository.obtener_reclamado;delayed=[]
    async def intercept(repo,*a,**k):
        if repo.session is first and not delayed:
            delayed.append(True);entered.set();await release.wait()
        return await original(repo,*a,**k)
    monkeypatch.setattr(WhatsAppInboxRepository,'obtener_reclamado',intercept)
    try:
        async with sessions() as first,sessions() as second:
            task=asyncio.create_task(CanalWhatsAppService(first).procesar_inbox_uno(recepcion_id=iid));await asyncio.wait_for(entered.wait(),10)
            await query("UPDATE participacion_ciudadana.whatsapp_inbox SET reclamo_vence_en=now()-interval '1 second' WHERE id=:id",{'id':iid},True)
            newest=await CanalWhatsAppService(second).procesar_inbox_uno(recepcion_id=iid);assert newest.estado=='procesado'
            release.set();old=await asyncio.wait_for(task,10)
        row=(await inbox(data))[0];assert old.estado=='reclamo_perdido' and row['estado']=='procesado' and row['intentos']==2
        b.record('AP06_inbox_fencing',receipt=iid,old_state=old.estado,new_state=newest.estado,attempts=2,one_proposal=row['propuesta_id'])
    finally:release.set();await engine.dispose()


def test_simulation_config_limits():
    body={'telefono_remitente':'573005551203','nombre_remitente':'EAF203','texto_mensaje':'Texto de prueba suficientemente amplio'}
    with TestClient(create_app(b.client_settings())) as client:
        assert client.post('/api/v1/canales/whatsapp/simular',json={**body,'private_unexpected':'x'}).status_code==422
        client.app.state.settings.environment='production'
        assert client.post('/api/v1/canales/whatsapp/simular',json=body).status_code==403
        b.record('AP06_simulation_limits',extra_fields=422,production=403)

@pytest.mark.parametrize('legacy',[{'etnia':True},{'es_victima_conflicto':'texto_heredado'},{'es_victima_conflicto':None}])
def test_legacy_enfoque_irregular_records_behavior(legacy):
    p=asyncio.run(proposal());asyncio.run(query('UPDATE participacion_ciudadana.propuestas_ciudadanas SET metadata_enfoque=CAST(:m AS jsonb) WHERE id=:id',{'m':json.dumps(legacy),'id':p.id},True))
    try:
        with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:
            detail=client.get('/api/v1/aportes/'+str(p.id));listing=client.get('/api/v1/aportes',params={'busqueda':p.titulo})
        b.record('AP03_legacy_irregular_enfoque',proposal=p.id,fixture=legacy,detail_status=detail.status_code,list_status=listing.status_code,contact_disclosed='private203@example.invalid' in detail.text)
        assert detail.status_code==listing.status_code==200
        assert_closed(detail.json());assert_closed(listing.json())
    finally:
        # Aislar solo esta fixture sintética del listado de casos posteriores; conservar JSON original.
        asyncio.run(query('UPDATE participacion_ciudadana.propuestas_ciudadanas SET activo=false WHERE id=:id',{'id':p.id},True))

@pytest.mark.parametrize('legacy',[None,False,['legado']])
def test_legacy_devolution_json_irregular_records_behavior(legacy):
    p=asyncio.run(proposal());audit_id=uuid.uuid4()
    asyncio.run(query("INSERT INTO auditoria.registros_auditoria(id,tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos) VALUES(:a,'participacion_ciudadana.propuestas_ciudadanas',:p,'DEVOLUCION_MOTIVADA','tecnica','Justificación legada sintética suficientemente detallada',CAST(:m AS jsonb))",{'a':audit_id,'p':p.id,'m':json.dumps(legacy)},True))
    with TestClient(create_app(b.client_settings()),raise_server_exceptions=False) as client:response=client.get('/api/v1/aportes/'+str(p.id)+'/devolucion-razon')
    original=asyncio.run(query('SELECT metadatos FROM auditoria.registros_auditoria WHERE id=:id',{'id':audit_id}))[0]['metadatos'];assert original==legacy
    b.record('AP03_legacy_irregular_audit',proposal=p.id,audit=audit_id,root_type=type(legacy).__name__,status=response.status_code,original_preserved=True)
    assert response.status_code==200
    assert_closed(response.json())
