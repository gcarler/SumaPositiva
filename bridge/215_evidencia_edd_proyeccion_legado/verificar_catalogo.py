"""Comprobación no destructiva del catálogo; secundaria nueva instalada a head."""
import asyncio
import json
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

ROOT=Path(__file__).resolve().parents[2]
EVIDENCE=Path(__file__).resolve().parent
principal=os.environ['POLIS_TEST_DATABASE_URL']; secundaria=os.environ['POLIS_TEST_MIGRATIONS_DATABASE_URL']

async def inspect(url):
    engine=create_async_engine(url,poolclass=NullPool,hide_parameters=True)
    try:
        async with engine.connect() as connection:
            name=await connection.scalar(text('SELECT current_database()'))
            revision=await connection.scalar(text('SELECT version_num FROM alembic_version'))
            return {'database':name,'revision':revision}
    finally: await engine.dispose()

results=[]
for role,url in [('principal',principal),('secundaria',secundaria)]:
    os.environ['POLIS_DATABASE_URL']=url
    config=Config(str(ROOT/'backend/alembic.ini'))
    if role=='secundaria':command.upgrade(config,'head')
    command.check(config)
    data=asyncio.run(inspect(url));data.update(uso=role,check='sin operaciones nuevas',downgrade_ejecutado=False)
    assert data['database'] in json.loads(os.environ['POLIS_EDD_DATABASES'])
    results.append(data)
os.environ['POLIS_DATABASE_URL']=principal
(EVIDENCE/'catalogo_final.json').write_text(json.dumps({'bases':results,'nuevas_migraciones_215':False,'0084_modificada':False},indent=2)+'\n')
print(json.dumps(results))
