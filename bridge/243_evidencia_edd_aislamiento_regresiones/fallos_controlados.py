"""Fallos de harness tras SQL real para comprobar finally; no oculta errores."""
import asyncio
import json
import os
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

EVIDENCE=Path(__file__).resolve().parent


def query(sql,parameters=None):
    async def run():
        engine=create_async_engine(os.environ['POLIS_TEST_DATABASE_URL'],poolclass=NullPool,hide_parameters=True)
        try:
            async with engine.connect() as c:
                pid=await c.scalar(text('SELECT pg_backend_pid()'))
                return pid,[dict(row) for row in (await c.execute(text(sql),parameters or {})).mappings()]
        finally:await engine.dispose()
    return asyncio.run(run())


def record(mode,data):
    (EVIDENCE/('fallo_'+mode+'.json')).write_text(json.dumps(data,indent=2,default=str)+'\n')


@pytest.hookimpl(wrapper=True)
def pytest_runtest_call(item):
    mode=os.environ.get('POLIS_EDD_FALLO')
    selected_audit=mode=='auditoria' and item.name.startswith('test_errores203_historial_')
    selected_med=mode=='medicion' and item.name=='test_indicadores_cadena_valor_y_avance'
    original=None
    if selected_med:
        client=item.funcargs['sync_client'];original=client.post
        def post(path,*args,**kwargs):
            response=original(path,*args,**kwargs)
            if '/indicadores/fichas/' in path and path.endswith('/mediciones') and response.status_code==201:
                mid=response.json()['id']
                pid,rows=query('SELECT id,periodo FROM indicadores.mediciones_indicador WHERE id=CAST(:id AS uuid)',{'id':mid})
                assert len(rows)==1 and rows[0]['periodo']=='Q1'
                record(mode,{'inyeccion':'despues del primer POST201 real, antes de devolver respuesta al test','pid_observador':pid,'medicion_confirmada':mid,'segunda_medicion_ejecutada':False})
                raise RuntimeError('EDD243 fallo deliberado despues de primera medicion confirmada')
            return response
        client.post=post
    try:
        result=yield
        if selected_audit:
            schema=item.funcargs['esquema_auditoria_legado']
            assert schema.startswith('test_legado_aportes_')
            pid,rows=query('SELECT id,metadatos FROM '+schema+'.registros_auditoria')
            assert len(rows)==1 and rows[0]['metadatos']==['legado']
            record(mode,{'inyeccion':'despues de todos los asserts crudos del test original','esquema':schema,'pid_observador':pid,'filas_crudas':rows})
            raise RuntimeError('EDD243 fallo deliberado despues de comprobar JSON crudo')
        return result
    finally:
        if original is not None:client.post=original
