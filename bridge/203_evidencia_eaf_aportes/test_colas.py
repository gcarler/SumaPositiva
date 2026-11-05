"""Casos EAF-AP-GOLIVE-02 propios; transporte capturado y observadores NullPool."""
import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

import test_atomicidad as b
from app.core.transactions import transaction
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate, PropuestaCiudadanaRead, PropuestaCiudadanaUpdate
from app.modules.aportes.service import AporteService
from app.modules.notificaciones.worker import NotificacionWorker
from app.modules.canales.schemas import WhatsAppWebhookPayload
from app.modules.canales.service import CanalWhatsAppService

pytestmark=pytest.mark.anyio
@pytest.fixture
def anyio_backend(): return "asyncio"

async def query(sql, params=None, mutate=False):
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            assert await session.scalar(text('SELECT current_database()'))==b.DATABASE
            result=await session.execute(text(sql), params or {})
            rows=[dict(r) for r in result.mappings()] if result.returns_rows else []
            if mutate: await session.commit()
            return rows
    finally: await engine.dispose()

async def outbox(nid):
    return (await query('''SELECT id,estado_envio,intentos,reclamo_token,reclamo_vence_en,proximo_intento_en,enviado_en,simulado_en
      FROM participacion_ciudadana.notificaciones_transaccionales WHERE id=:id''',{'id':nid}))[0]

async def enqueue():
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            p=await AporteService(AporteRepository(session),b.client_settings()).crear_propuesta(PropuestaCiudadanaCreate(
                linea_id=await b.line_id(),titulo='EAF203 outbox '+uuid.uuid4().hex,descripcion='Cola exclusiva de transporte capturado',correo_contacto='sintetico203@example.invalid'))
        nid=(await query('SELECT id FROM participacion_ciudadana.notificaciones_transaccionales WHERE codigo_radicado=:rad',{'rad':p.codigo_radicado}))[0]['id']
        return p,nid
    finally: await engine.dispose()

@pytest.mark.parametrize('case',['crear','actualizar'])
@pytest.mark.parametrize('stage',['success','post_flush','validation','cancel','commit'])
async def test_intention_atomic_without_transport(case,stage,monkeypatch):
    import app.modules.notificaciones.correo as mail
    transport=[]
    class Capture:
        def __init__(self,*a,**k): transport.append('unexpected'); raise AssertionError('SMTP before worker')
    monkeypatch.setattr(mail.smtplib,'SMTP',Capture)
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            service=AporteService(AporteRepository(session),b.client_settings(smtp_host='capture.invalid',smtp_tls=False))
            data=PropuestaCiudadanaCreate(linea_id=await b.line_id(),titulo='EAF203 atomic queue '+uuid.uuid4().hex,descripcion='Intención y propuesta comparten commit',correo_contacto='atomic203@example.invalid')
            pid=None
            if case=='actualizar': pid=(await service.crear_propuesta(data)).id
            _,before=await b.snapshot(pid)
            original=session.flush; flushed=[]; ids=[]; observations=[]
            async def inject(*a,**k):
                pending=list(session.new)
                await original(*a,**k)
                ids.extend(o.id for o in pending if type(o).__name__=='PropuestaCiudadana')
                if any(type(o).__name__=='NotificacionTransaccional' for o in pending) and not flushed:
                    flushed.append(True)
                    _,visible=await b.snapshot(pid or ids[0]); observations.append(visible)
                    assert visible==before
                    if stage=='post_flush': raise RuntimeError('EAF after notification SQL')
                    if stage=='cancel': raise asyncio.CancelledError()
                    if stage=='commit': await b.commit_failure(session)
            monkeypatch.setattr(session,'flush',inject)
            if stage=='validation':
                original_validate=PropuestaCiudadanaRead.model_validate
                monkeypatch.setattr(PropuestaCiudadanaRead,'model_validate',classmethod(lambda cls,v:original_validate({'id':None})))
            async def run():
                return await service.crear_propuesta(data) if case=='crear' else await service.actualizar_propuesta(pid,PropuestaCiudadanaUpdate(estado='en_revision'))
            if stage=='success':
                result=await run(); pid=pid or result.id
            else:
                with pytest.raises({'post_flush':RuntimeError,'validation':ValidationError,'cancel':asyncio.CancelledError,'commit':IntegrityError}[stage]): await run()
                pid=pid or ids[0]
            assert flushed and not transport
            reader,after=await b.snapshot(pid)
            if stage=='success': assert after['notifications']==(1 if case=='crear' else before['notifications']+1)
            else: assert after==before
            b.record('AP01_intention_'+case+'_'+stage,observer_pid=reader,queue_sql_flushed=True,transport_calls=len(transport),unchanged=after==before)
    finally: await engine.dispose()

async def test_outbox_claim_before_transport_and_concurrent_exclusion():
    _,nid=await enqueue(); engine,sessions=b.factory(); entered=asyncio.Event(); release=asyncio.Event(); calls=[]
    async def capture(**kwargs):
        row=await outbox(nid); assert row['estado_envio']=='procesando' and row['reclamo_token'] and row['intentos']==1
        calls.append(kwargs['identificador_mensaje']); entered.set(); await release.wait(); return 'simulado',None,None
    try:
        async with sessions() as first,sessions() as second:
            task=asyncio.create_task(NotificacionWorker(first,b.client_settings()).procesar_uno(transporte=capture,notificacion_id=nid))
            await asyncio.wait_for(entered.wait(),10)
            assert await NotificacionWorker(second,b.client_settings()).procesar_uno(transporte=capture,notificacion_id=nid) is None
            release.set(); result=await asyncio.wait_for(task,10)
        row=await outbox(nid); assert len(calls)==1 and result.estado=='simulado' and row['simulado_en'] and row['enviado_en'] is None and row['reclamo_token'] is None
        b.record('AP01_claim_durable_concurrent',notification=nid,captured_calls=len(calls),state=row)
    finally: release.set(); await engine.dispose()

async def test_outbox_retry_backoff_and_stable_message_id():
    _,nid=await enqueue(); engine,sessions=b.factory(); ids=[]
    async def fail(**kwargs): ids.append(kwargs['identificador_mensaje']); raise RuntimeError('Captured failure')
    async def accept(**kwargs): ids.append(kwargs['identificador_mensaje']); return 'simulado',None,None
    try:
        async with sessions() as session:
            worker=NotificacionWorker(session,b.client_settings())
            assert (await worker.procesar_uno(transporte=fail,notificacion_id=nid)).estado=='fallido'
            row=await outbox(nid); assert row['proximo_intento_en']>datetime.now(UTC) and row['intentos']==1
            assert await worker.procesar_uno(transporte=accept,notificacion_id=nid) is None
            await query("UPDATE participacion_ciudadana.notificaciones_transaccionales SET proximo_intento_en=now()-interval '1 second' WHERE id=:id",{'id':nid},True)
            assert (await worker.procesar_uno(transporte=accept,notificacion_id=nid)).intentos==2
        assert len(ids)==2 and ids[0]==ids[1]
        b.record('AP01_retry',notification=nid,attempts=2,stable_message_id=True,state=await outbox(nid))
    finally: await engine.dispose()

async def test_outbox_fencing_expired_claim():
    _,nid=await enqueue(); engine,sessions=b.factory(); entered=asyncio.Event(); release=asyncio.Event(); ids=[]
    async def slow(**kw): ids.append(kw['identificador_mensaje']); entered.set(); await release.wait(); return 'enviado',None,datetime.now(UTC)
    async def simulated(**kw): ids.append(kw['identificador_mensaje']); return 'simulado',None,None
    try:
        async with sessions() as first,sessions() as second:
            task=asyncio.create_task(NotificacionWorker(first,b.client_settings()).procesar_uno(transporte=slow,notificacion_id=nid))
            await asyncio.wait_for(entered.wait(),10)
            await query("UPDATE participacion_ciudadana.notificaciones_transaccionales SET reclamo_vence_en=now()-interval '1 second' WHERE id=:id",{'id':nid},True)
            assert (await NotificacionWorker(second,b.client_settings()).procesar_uno(transporte=simulated,notificacion_id=nid)).estado=='simulado'
            release.set(); old=await asyncio.wait_for(task,10)
        row=await outbox(nid); assert old.estado=='reclamo_perdido' and row['estado_envio']=='simulado' and row['enviado_en'] is None and row['intentos']==2 and ids[0]==ids[1]
        b.record('AP01_fencing',notification=nid,captured_acceptances=2,old_result=old.estado,state=row,guarantee='al menos una vez; duplicados posibles')
    finally: release.set(); await engine.dispose()

@pytest.mark.parametrize('phase',['claim','final'])
async def test_outbox_actual_commit_failure_and_recovery(phase,monkeypatch):
    _,nid=await enqueue(); engine,sessions=b.factory(); accepted=[]
    async def accept(**kw): accepted.append(kw['identificador_mensaje']); return 'enviado',None,datetime.now(UTC)
    try:
        async with sessions() as session:
            original=session.flush; n=0
            async def inject(*a,**k):
                nonlocal n
                await original(*a,**k); n+=1
                if n==(1 if phase=='claim' else 2): await b.commit_failure(session)
            monkeypatch.setattr(session,'flush',inject)
            with pytest.raises(IntegrityError): await NotificacionWorker(session,b.client_settings()).procesar_uno(transporte=accept,notificacion_id=nid)
        row=await outbox(nid)
        assert row['estado_envio']==('pendiente' if phase=='claim' else 'procesando') and len(accepted)==(0 if phase=='claim' else 1)
        if phase=='final': await query("UPDATE participacion_ciudadana.notificaciones_transaccionales SET reclamo_vence_en=now()-interval '1 second' WHERE id=:id",{'id':nid},True)
        async with sessions() as recovery: assert (await NotificacionWorker(recovery,b.client_settings()).procesar_uno(transporte=accept,notificacion_id=nid)).estado=='enviado'
        assert len(set(accepted))==1 and len(accepted)==(1 if phase=='claim' else 2)
        b.record('AP01_commit_'+phase,notification=nid,before_recovery=row,captured_acceptances=len(accepted),stable_message_id=True,at_least_once=True)
    finally: await engine.dispose()


def payload(*bodies):
    account='eaf203-'+uuid.uuid4().hex
    return WhatsAppWebhookPayload.model_validate({'entry':[{'id':account,'changes':[{'value':{'metadata':{'phone_number_id':'receiver203'},'contacts':[{'wa_id':'573005551203','profile':{'name':'Participante EAF sintético'}}],'messages':[{'from':'573005551203','id':account+'-'+str(i),'type':'text','text':{'body':body}} for i,body in enumerate(bodies)]}}]}]})

async def inbox(data):
    return await query('SELECT id,estado,intentos,propuesta_id,resultado,error_codigo,reclamo_token,reclamo_vence_en,proximo_intento_en FROM participacion_ciudadana.whatsapp_inbox WHERE cuenta_proveedor=:account ORDER BY mensaje_externo_id',{'account':data.entry[0].id+':receiver203'})

async def receive(data):
    engine,sessions=b.factory()
    try:
        async with sessions() as session: result=await CanalWhatsAppService(session).procesar_webhook_meta(data)
        return result,await inbox(data)
    finally: await engine.dispose()

async def test_inbox_atomic_receipt_valid_short_valid_and_replay():
    data=payload('Primera propuesta válida de auditoría','x','Última propuesta válida de auditoría')
    receipt,rows=await receive(data)
    assert receipt.mensajes_nuevos==3 and len(rows)==3 and all(r['estado']=='pendiente' and r['propuesta_id'] is None for r in rows)
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            service=CanalWhatsAppService(session)
            results=[await service.procesar_inbox_uno(recepcion_id=r['id']) for r in rows]
            assert [r.estado for r in results]==['procesado','rechazado','procesado']
            again=await service.procesar_webhook_meta(data); assert again.mensajes_nuevos==0 and again.mensajes_repetidos==3
            assert all([await service.procesar_inbox_uno(recepcion_id=r['id']) is None for r in rows])
        radicados=[r.codigo_radicado for r in results if r.codigo_radicado]
        for rad in radicados:
            notifications=await query('SELECT estado_envio,enviado_en,simulado_en FROM participacion_ciudadana.notificaciones_transaccionales WHERE codigo_radicado=:r',{'r':rad})
            assert len(notifications)==1 and notifications[0]['estado_envio']=='simulado' and notifications[0]['enviado_en'] is None and notifications[0]['simulado_en']
        b.record('AP06_three_messages_durable',receipt=receipt.model_dump(mode='json'),results=[r.model_dump(mode='json') for r in results],replay_new=again.mensajes_nuevos)
    finally: await engine.dispose()

async def test_inbox_concurrent_receipt_collision_and_receiving_account():
    data=payload('Contenido original suficientemente largo','Otro contenido propio para la cola')
    engine,sessions=b.factory()
    async def run():
        async with sessions() as session:return await CanalWhatsAppService(session).procesar_webhook_meta(data)
    try:
        receipts=await asyncio.wait_for(asyncio.gather(run(),run()),20)
        assert sorted(r.mensajes_nuevos for r in receipts)==[0,2] and len(await inbox(data))==2
        collision=data.model_copy(deep=True)
        collision.entry[0].changes[0].value.messages[0].text.body='Contenido diferente para el mismo identificador'
        new=collision.entry[0].changes[0].value.messages[0].model_copy(deep=True); new.id+='-new'
        collision.entry[0].changes[0].value.messages.insert(0,new)
        async with sessions() as session:
            with pytest.raises(HTTPException) as err: await CanalWhatsAppService(session).procesar_webhook_meta(collision)
            assert err.value.status_code==409
        assert len(await inbox(data))==2
        other=data.model_copy(deep=True); other.entry[0].changes[0].value.metadata['phone_number_id']='other_receiver203'
        async with sessions() as session: assert (await CanalWhatsAppService(session).procesar_webhook_meta(other)).mensajes_nuevos==2
        b.record('AP06_concurrent_receipt_collision',new_counts=sorted(r.mensajes_nuevos for r in receipts),collision_status=409,batch_rolled_back=True,receiving_accounts_distinct=True)
    finally: await engine.dispose()

@pytest.mark.parametrize('stage',['post_flush','validation','cancel','commit'])
async def test_inbox_receipt_failure_is_all_or_nothing(stage,monkeypatch):
    from app.modules.canales.schemas import WhatsAppRecepcionRespuesta
    data=payload('Una entrada válida de auditoría','Otra entrada válida de auditoría')
    engine,sessions=b.factory()
    try:
        async with sessions() as session:
            service=CanalWhatsAppService(session); original=session.flush; seen=[]
            async def inject(*a,**k):
                await original(*a,**k)
                if not seen:
                    seen.append(True); assert await inbox(data)==[]
                    if stage=='post_flush':raise RuntimeError('EAF after actual insert')
                    if stage=='cancel':raise asyncio.CancelledError()
                    if stage=='commit':await b.commit_failure(session)
            monkeypatch.setattr(session,'flush',inject)
            if stage=='validation':
                import app.modules.canales.service as module
                def invalid(**kw):return WhatsAppRecepcionRespuesta(**{**kw,'mensajes_nuevos':'invalid'})
                monkeypatch.setattr(module,'WhatsAppRecepcionRespuesta',invalid)
            with pytest.raises({'post_flush':RuntimeError,'validation':ValidationError,'cancel':asyncio.CancelledError,'commit':IntegrityError}[stage]):await service.procesar_webhook_meta(data)
            assert seen and not session.in_transaction()
        assert await inbox(data)==[]
        b.record('AP06_receipt_rollback_'+stage,actual_SQL=True,other_connection_rows=0)
    finally:await engine.dispose()

@pytest.mark.parametrize('stage',['post_radicacion','commit','cancel'])
async def test_inbox_worker_recovery_no_partial_radicado(stage,monkeypatch):
    data=payload('Propuesta íntegra durante recuperación del worker')
    _,rows=await receive(data); iid=rows[0]['id']; engine,sessions=b.factory(); pids=[]
    try:
        async with sessions() as session:
            service=CanalWhatsAppService(session); original=service._radicar_mensaje
            async def inject(*a,**k):
                result=await original(*a,**k); pids.append(result.propuesta_id)
                if stage=='post_radicacion':raise RuntimeError('EAF after radicado and notice SQL')
                if stage=='cancel':raise asyncio.CancelledError()
                await b.commit_failure(session); return result
            monkeypatch.setattr(service,'_radicar_mensaje',inject)
            if stage=='cancel':
                with pytest.raises(asyncio.CancelledError):await service.procesar_inbox_uno(recepcion_id=iid)
            else: assert (await service.procesar_inbox_uno(recepcion_id=iid)).estado=='error'
        row=(await inbox(data))[0]; assert row['propuesta_id'] is None and row['estado']==('procesando' if stage=='cancel' else 'error')
        assert pids and all([(await b.snapshot(pid))[1] is None for pid in pids])
        await query("UPDATE participacion_ciudadana.whatsapp_inbox SET reclamo_vence_en=now()-interval '1 second', proximo_intento_en=now()-interval '1 second' WHERE id=:id",{'id':iid},True)
        async with sessions() as session: result=await CanalWhatsAppService(session).procesar_inbox_uno(recepcion_id=iid)
        assert result.estado=='procesado' and result.intentos==2
        b.record('AP06_worker_recovery_'+stage,receipt=iid,rolled_back_proposals=pids,before_recovery=row,result=result.model_dump(mode='json'))
    finally:await engine.dispose()

async def test_inbox_workers_skip_locked_and_fence(monkeypatch):
    data=payload('Una sola propuesta con consumidores concurrentes')
    _,rows=await receive(data); iid=rows[0]['id']; engine,sessions=b.factory(); entered=asyncio.Event();release=asyncio.Event()
    try:
        async with sessions() as first,sessions() as second:
            service=CanalWhatsAppService(first); original=service._radicar_mensaje
            async def slow(*a,**k):entered.set();await release.wait();return await original(*a,**k)
            monkeypatch.setattr(service,'_radicar_mensaje',slow)
            task=asyncio.create_task(service.procesar_inbox_uno(recepcion_id=iid));await asyncio.wait_for(entered.wait(),10)
            assert await CanalWhatsAppService(second).procesar_inbox_uno(recepcion_id=iid) is None
            release.set(); result=await asyncio.wait_for(task,10)
        assert result.estado=='procesado' and (await inbox(data))[0]['intentos']==1
        b.record('AP06_workers_exclusive',receipt=iid,attempts=1,one_result=True)
    finally:release.set();await engine.dispose()

SECRET='eaf203_hmac_sintetico'
def signed(body):return {'X-Hub-Signature-256':'sha256='+hmac.new(SECRET.encode(),body,hashlib.sha256).hexdigest(),'Content-Type':'application/json'}

def test_http_hmac_config_and_durable_ack():
    data=payload('Entrada HTTP firmada exclusivamente local')
    body=data.model_dump_json(by_alias=True).encode()
    with TestClient(create_app(b.client_settings(whatsapp_habilitado=False)),raise_server_exceptions=False) as client:
        assert client.post('/api/v1/canales/whatsapp/webhook',content=body,headers=signed(body)).status_code==503
    settings=b.client_settings(whatsapp_habilitado=True,whatsapp_verify_token='verify203',whatsapp_app_secret=SECRET)
    with TestClient(create_app(settings),raise_server_exceptions=False) as client:
        route='/api/v1/canales/whatsapp/webhook'
        assert client.get(route,params={'hub.mode':'subscribe','hub.verify_token':'verify203','hub.challenge':'203'}).status_code==200
        assert client.get(route,params={'hub.mode':'subscribe','hub.verify_token':'wrong','hub.challenge':'203'}).status_code==403
        assert client.post(route,content=body,headers={'Content-Type':'application/json'}).status_code==401
        assert client.post(route,content=body+b' ',headers=signed(body)).status_code==401
        response=client.post(route,content=body,headers=signed(body))
        assert response.status_code==200,response.text
        assert len(asyncio.run(inbox(data)))==1
        assert client.post(route,content=body,headers=signed(body)).json()['mensajes_repetidos']==1
        b.record('AP06_HTTP_signature_durable_ack',status=response.status_code,receipt=response.json(),missing_signature=401,changed_raw_body=401,disabled=503)
