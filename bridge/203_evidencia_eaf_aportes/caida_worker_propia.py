"""Terminación real de consumidor tras aceptación local capturada, sin SMTP."""
import asyncio
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

from test_colas import enqueue,outbox,query
import test_atomicidad as b
from app.modules.notificaciones.worker import NotificacionWorker

async def main():
    _,nid=await enqueue();capture=b.EVIDENCE/('aceptacion_local_'+uuid.uuid4().hex+'.json')
    child='''import asyncio,json,os,sys
from pathlib import Path
from uuid import UUID
import test_atomicidad as b
from app.modules.notificaciones.worker import NotificacionWorker
async def run():
    engine,sessions=b.factory()
    async with sessions() as session:
        async def transport(**kw):
            with Path(sys.argv[2]).open('x') as output:
                json.dump({'message_id':kw['identificador_mensaje'],'acceptance':'local_simulation'},output)
                output.flush();os.fsync(output.fileno())
            os._exit(73)
        await NotificacionWorker(session,b.client_settings()).procesar_uno(notificacion_id=UUID(sys.argv[1]),transporte=transport)
asyncio.run(run())
'''
    env=os.environ.copy();env['PYTHONPATH']=str(b.EVIDENCE)+os.pathsep+env['PYTHONPATH']
    result=subprocess.run([sys.executable,'-c',child,str(nid),str(capture)],env=env,capture_output=True,text=True,timeout=20)
    assert result.returncode==73 and capture.exists()
    observed=await outbox(nid);assert observed['estado_envio']=='procesando' and observed['intentos']==1 and observed['reclamo_token']
    await query("UPDATE participacion_ciudadana.notificaciones_transaccionales SET reclamo_vence_en=now()-interval '1 second' WHERE id=:id",{'id':nid},True)
    retried=[]
    async def transport(**kw):retried.append(kw['identificador_mensaje']);return 'simulado',None,None
    engine,sessions=b.factory()
    try:
        async with sessions() as session:recovery=await NotificacionWorker(session,b.client_settings()).procesar_uno(notificacion_id=nid,transporte=transport)
    finally:await engine.dispose()
    assert recovery.estado=='simulado' and recovery.intentos==2 and retried==[json.loads(capture.read_text())['message_id']]
    artifact={'notification':str(nid),'real_child_exit':73,'capture_file':capture.name,'before_recovery':observed,'after_recovery':await outbox(nid),'simulated_acceptances':2,'stable_message_id':True,'guarantee':'al menos una vez; posible duplicado tras aceptación y caída; no proveedor real'}
    (b.EVIDENCE/'caida_worker_resultado.json').write_text(json.dumps(artifact,indent=2,default=str,ensure_ascii=False)+'\n')
    print(json.dumps({'real_exit':73,'attempts':2,'state':recovery.estado,'stable_message_id':True}))

asyncio.run(main())
