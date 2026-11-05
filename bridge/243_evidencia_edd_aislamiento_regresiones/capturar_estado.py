"""Observación SQL real en243; no normaliza ni elimina fixtures."""
import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

EVIDENCE=Path(__file__).resolve().parent
name=sys.argv[1];assert name.replace('_','').isalnum()

def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

async def main():
    engine=create_async_engine(os.environ['POLIS_TEST_DATABASE_URL'],poolclass=NullPool,hide_parameters=True)
    try:
        async with engine.connect() as connection:
            queries={
                'auditoria_principal':"SELECT to_jsonb(a) FROM auditoria.registros_auditoria a ORDER BY id",
                'fichas':"SELECT to_jsonb(f) FROM indicadores.fichas_tecnicas_indicadores f WHERE codigo IN ('IND-INS-01','IND-RES-01') ORDER BY codigo",
                'mediciones':"SELECT to_jsonb(m) FROM indicadores.mediciones_indicador m JOIN indicadores.fichas_tecnicas_indicadores f ON f.id=m.indicador_id WHERE f.codigo IN ('IND-INS-01','IND-RES-01') ORDER BY m.id",
                'esquemas_privados':"SELECT nspname FROM pg_namespace WHERE nspname LIKE 'test_legado_aportes_%' ORDER BY nspname",
                'triggers_principal':"SELECT jsonb_build_object('nombre',tgname,'activo',tgenabled,'definicion',pg_get_triggerdef(oid)) FROM pg_trigger WHERE tgrelid='auditoria.registros_auditoria'::regclass AND NOT tgisinternal ORDER BY tgname",
            }
            result={key:list((await connection.execute(text(query))).scalars()) for key,query in queries.items()}
            result['database']=await connection.scalar(text('SELECT current_database()'));result['pid']=await connection.scalar(text('SELECT pg_backend_pid()'))
            result['sha256']={key:digest(result[key]) for key in queries}
        (EVIDENCE/(name+'.json')).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
        print(json.dumps({'snapshot':name,'database':result['database'],'auditorias':len(result['auditoria_principal']),'periodos':{f['codigo']:f['metadatos'].get('periodo_ultimo_reporte') for f in result['fichas']},'esquemas_privados':result['esquemas_privados']}))
    finally:await engine.dispose()

asyncio.run(main())
