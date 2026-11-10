"""Ensayo exclusivo polis_test*: 0097 con datos, upgrade/downgrade y retención.

Usar desde la copia de trabajo con PYTHONPATH backend y DSN de pruebas explícito.
No contiene credenciales ni se conecta a otra base como fallback.
"""

import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from alembic import command
from alembic.config import Config

ROOT = Path.cwd()
sys.path.insert(0, str(ROOT / "backend"))
url = make_url(os.environ["POLIS_TEST_DATABASE_URL"])
assert (url.database or "").startswith("polis_test_sm_core")
assert url.host == "127.0.0.1" and url.port == 15433
url = url.set(database="polis_test_sm_core_310_upgrade").render_as_string(hide_password=False)
os.environ["POLIS_DATABASE_URL"] = url
config = Config(str(ROOT / "backend/alembic.ini"))
evento_id, mensaje_id = uuid4(), uuid4()
pruebas = []


async def sql(stmt, params=None):
    engine = create_async_engine(url, hide_parameters=True)
    try:
        async with engine.begin() as c:
            r = await c.execute(text(stmt), params or {})
            return r.scalar() if r.returns_rows else None
    finally:
        await engine.dispose()


command.upgrade(config, "0097_sm_core")

from app.core.transactions import transaction  # noqa: E402
from app.modules.sm.boveda import SMBovedaContactoDB  # noqa: E402
from app.modules.sm.contracts import SMCanal, SMContacto  # noqa: E402
from app.modules.sm.core import hash_contacto  # noqa: E402

contacto = SMContacto(canal=SMCanal.CORREO, actor="actor-opaco", identificador="ensayo@example.invalid")
huella = hash_contacto("upgrade310", contacto.actor, contacto.canal.value, contacto.identificador)
params = {"evento": evento_id, "mensaje": mensaje_id, "hash": huella}
asyncio.run(sql("""INSERT INTO participacion_ciudadana.sm_eventos
    (id,tenant,tipo_evento,actor,idempotencia,origen,canal,contacto_hash,cuerpo)
    VALUES (:evento,'upgrade310','ensayo.upgrade','actor-opaco','upgrade310-evento','laboratorio','correo',:hash,'Aviso')""",
    params))
asyncio.run(sql("""INSERT INTO participacion_ciudadana.sm_mensajes
    (id,evento_id,tenant,canal,actor,contacto_hash,estado,idempotencia)
    VALUES (:mensaje,:evento,'upgrade310','correo','actor-opaco',:hash,'pendiente','upgrade310-evento')""", params))
command.upgrade(config, "0098_sm_contactos_boveda")


async def cifrar():
    engine = create_async_engine(url, hide_parameters=True)
    try:
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        async with sessions() as s:
            async with transaction(s):
                await SMBovedaContactoDB.desde_settings().almacenar(s, tenant="upgrade310", contacto=contacto)
    finally:
        await engine.dispose()


asyncio.run(cifrar())
cipher = asyncio.run(sql("SELECT contacto_cifrado FROM participacion_ciudadana.sm_contactos_boveda"))
command.upgrade(config, "head")
command.check(config)
assert asyncio.run(sql("SELECT count(*) FROM participacion_ciudadana.sm_mensajes WHERE id=:mensaje", params)) == 1
assert asyncio.run(sql("SELECT proximo_intento_en FROM participacion_ciudadana.sm_mensajes WHERE id=:mensaje",
                       params)) is None
assert asyncio.run(sql("SELECT contacto_cifrado FROM participacion_ciudadana.sm_contactos_boveda")) == cipher
pruebas.append("upgrade_0097_0098_0099_preserva_mensaje_y_ciphertext")
asyncio.run(sql("UPDATE participacion_ciudadana.sm_mensajes SET estado='simulado' WHERE id=:mensaje", params))
asyncio.run(sql("""INSERT INTO participacion_ciudadana.sm_entregas
    (mensaje_id,tenant,idempotencia,canal,intento,estado_entrega)
    VALUES (:mensaje,'upgrade310','upgrade310-entrega','correo',1,'simulado')""", params))
command.downgrade(config, "0098_sm_contactos_boveda")
assert asyncio.run(sql("SELECT estado FROM participacion_ciudadana.sm_mensajes WHERE id=:mensaje", params)) == "cancelado"
assert asyncio.run(sql("SELECT payload->>'sm_estado_pre_downgrade' FROM participacion_ciudadana.sm_entregas")) == "simulado"
assert asyncio.run(sql("SELECT contacto_cifrado FROM participacion_ciudadana.sm_contactos_boveda")) == cipher
pruebas.append("downgrade_0099_no_convierte_simulacion_en_envio_y_preserva_procedencia")
command.downgrade(config, "0097_sm_core")
assert asyncio.run(sql("SELECT to_regclass('participacion_ciudadana.sm_contactos_boveda')")) is None
assert asyncio.run(sql("SELECT count(*) FROM participacion_ciudadana.sm_mensajes WHERE id=:mensaje", params)) == 1
pruebas.append("downgrade_0098_retira_boveda_conserva_outbox")
command.upgrade(config, "head")
command.check(config)
pruebas.append("segundo_upgrade_y_check_sin_drift")
resultado = {"base": "polis_test_sm_core_310_upgrade", "puerto": 15433, "casos": pruebas,
             "ciphertext_sha256": hashlib.sha256(cipher).hexdigest(), "bd_csh_usada": False}
salida = ROOT / "bridge/310_evidencia_codex/upgrade_con_datos.json"
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(json.dumps(resultado, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(resultado, ensure_ascii=False))
