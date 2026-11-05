import asyncio
import json
import os
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    engine=create_async_engine(os.environ['POLIS_TEST_DATABASE_URL'])
    try:
        async with engine.connect() as conn:
            datos=dict((await conn.execute(text("""SELECT current_database() AS base,
            (SELECT version_num FROM alembic_version) AS revision,
            (SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas) AS propuestas,
            (SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE correo_contacto IS NOT NULL) AS contactos_privados,
            (SELECT count(*) FROM participacion_ciudadana.whatsapp_inbox) AS inbox,
            (SELECT count(*) FROM participacion_ciudadana.migracion_apoyos_0084) AS journal"""))).mappings().one())
            assert datos['base']==os.environ['POLIS_EDD_DATABASE'] and datos['revision']=='0084_aportes_colas_y_apoyos'
            assert datos['contactos_privados']>0 and datos['inbox']>0
            (Path(__file__).resolve().parent/'control_posterior13.json').write_text(json.dumps(datos,indent=2)+'\n')
            print(json.dumps(datos))
    finally:await engine.dispose()

asyncio.run(main())
