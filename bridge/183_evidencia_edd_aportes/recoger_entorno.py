import asyncio
import importlib.metadata
import json
import os
import sys
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    evidence=Path(__file__).resolve().parent
    datos={'python':sys.version.split()[0],'paquetes':{nombre:importlib.metadata.version(nombre) for nombre in ['SQLAlchemy','alembic','asyncpg','psycopg','fastapi','pydantic','pytest','ruff']},'bases_permitidas':json.loads(os.environ['POLIS_EDD_DATABASES']),'SMTP':'deshabilitado','Meta':'transporte deshabilitado; solo ASGI local','guardas_subprocesos_nativos':'no cubiertos por la guarda Python'}
    engine=create_async_engine(os.environ['POLIS_TEST_DATABASE_URL'])
    try:
        async with engine.connect() as conn:
            datos['postgresql']=await conn.scalar(text('SHOW server_version'))
            datos['postgis']=await conn.scalar(text('SELECT postgis_lib_version()'))
    finally:await engine.dispose()
    (evidence/'entorno_final.json').write_text(json.dumps(datos,indent=2)+'\n')
    print(json.dumps(datos))

asyncio.run(main())
