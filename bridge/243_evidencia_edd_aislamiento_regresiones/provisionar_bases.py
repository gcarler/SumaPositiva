"""Provisión administrativa solo de dos bases nuevas de243, sin imprimir DSN."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent

def sql(database, query):
    result = subprocess.run(['runuser', '-u', 'postgres', '--', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-d', database, '-c', query], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('Falló provisión local; no se imprimen credenciales: ' + result.stderr)
    return result.stdout.strip()

def identifier(value):
    return '"' + value.replace('"', '""') + '"'

raw = next(line.split('=',1)[1].strip().strip('"').strip("'") for line in (ROOT/'backend/.env').read_text().splitlines() if line.startswith('POLIS_DATABASE_URL='))
source = make_url(raw)
assert source.host in {'127.0.0.1', 'localhost', '::1'} and source.port == 5432
owner = source.username
assert owner
records = []
for filename in ['base.json', 'base_migraciones.json']:
    path = EVIDENCE / filename
    info = json.loads(path.read_text()); name = info['database']
    assert name.startswith('polis_test_edd_aislamiento_20261027_') and len(name) < 64
    # Consulta solo catálogo administrativo para evitar reutilización accidental.
    exists = sql('postgres', "SELECT count(*) FROM pg_database WHERE datname='" + name.replace("'", "''") + "'")
    assert exists == '0', 'La base debe ser nueva: ' + name
    sql('postgres', 'CREATE DATABASE ' + identifier(name) + ' OWNER ' + identifier(owner) + ' TEMPLATE template0')
    for extension in ['pgcrypto', 'postgis', 'ltree', 'unaccent', 'pg_trgm']:
        sql(name, 'CREATE EXTENSION IF NOT EXISTS ' + identifier(extension))
    info.update(estado='provisionada',fecha_provision=datetime.now(timezone.utc).isoformat(),owner=owner,extensions=['pgcrypto','postgis','ltree','unaccent','pg_trgm'])
    path.write_text(json.dumps(info,indent=2)+'\n'); records.append(info)
(EVIDENCE/'provision_bases.json').write_text(json.dumps({'bases':records,'sin_datos_copiados':True,'sin_roles_alterados':True},indent=2)+'\n')
print('Provisionadas dos bases nuevas propias desde template0')
